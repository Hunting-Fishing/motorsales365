import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ManualPaymentMethod = {
  method: string;
  enabled: boolean;
  label: string;
  instructions_md: string | null;
  account_name: string | null;
  account_number: string | null;
  qr_image_url: string | null;
  sort_order: number;
  is_manual: boolean;
};

export const listPaymentMethods = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("payment_method_config")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ManualPaymentMethod[];
});

export const adminListAllMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("payment_method_config")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ManualPaymentMethod[];
  });

export const adminUpdateMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { method: string; patch: Partial<ManualPaymentMethod> }) => data)
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payment_method_config")
      .update(data.patch)
      .eq("method", data.method);
    if (error) throw error;
    return { ok: true };
  });

export const submitManualPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      kind: "listing" | "upgrade" | "boost" | "subscription" | "course";
      ref_id?: string | null;
      method: string;
      amount_php: number;
      reference?: string;
      proof_path?: string;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // verify method exists + is manual
    const { data: cfg } = await supabaseAdmin
      .from("payment_method_config")
      .select("method,enabled,is_manual")
      .eq("method", data.method)
      .maybeSingle();
    if (!cfg || !cfg.enabled || !cfg.is_manual) {
      throw new Error("Payment method not available");
    }

    // generate invoice number
    const { data: invNum } = await supabaseAdmin.rpc("generate_invoice_number");

    let proofUrl: string | null = null;
    if (data.proof_path) {
      proofUrl = data.proof_path;
    }

    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        kind: data.kind,
        listing_id: data.kind === "listing" || data.kind === "upgrade" || data.kind === "boost" ? data.ref_id ?? null : null,
        amount_php: data.amount_php,
        gross_amount_php: data.amount_php,
        status: "pending",
        method: data.method,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        proof_url: proofUrl,
        proof_uploaded_at: proofUrl ? new Date().toISOString() : null,
        invoice_number: invNum as string,
      })
      .select("id,invoice_number")
      .single();
    if (error) throw error;

    return { id: payment.id, invoice_number: payment.invoice_number };
  });

export const adminListPendingPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select("id,user_id,kind,listing_id,amount_php,method,reference,notes,proof_url,proof_uploaded_at,invoice_number,created_at,status")
      .eq("status", "pending")
      .not("method", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    // attach user emails
    const userIds = Array.from(new Set((data ?? []).map((p) => p.user_id).filter(Boolean)));
    const { data: profs } = userIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id,full_name,business_name")
          .in("id", userIds)
      : { data: [] as any[] };
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));

    return (data ?? []).map((p) => ({
      ...p,
      profile: profMap.get(p.user_id) ?? null,
    }));
  });

export const adminApprovePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; notes?: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: data.notes ?? null,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminRejectPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; notes: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payments")
      .update({
        status: "failed",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: data.notes,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminListAllPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string; method?: string; limit?: number } = {}) => data)
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("payments")
      .select("id,user_id,kind,amount_php,method,reference,status,invoice_number,created_at,paid_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.status) q = q.eq("status", data.status as any);
    if (data.method) q = q.eq("method", data.method);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });
