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

export type ReviewState =
  | "awaiting_review"
  | "in_review"
  | "approved"
  | "rejected"
  | "not_applicable";

async function assertAdmin(context: any) {
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (!roles?.some((r: any) => r.role === "admin")) throw new Error("Forbidden");
}

export const listPaymentMethods = createServerFn({ method: "GET" }).handler(async () => {
  // Use the publishable-key client (anon role) — the public SELECT policy on
  // payment_method_config allows reading enabled rows. Avoids the JWT-format
  // issue that can hit service-role Data API reads on Lovable Cloud.
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase
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
    await assertAdmin(context);
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
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payment_method_config")
      .update(data.patch)
      .eq("method", data.method);
    if (error) throw error;
    return { ok: true };
  });

export type SubmitManualPaymentInput = {
  kind: "listing" | "upgrade" | "boost" | "subscription" | "course";
  ref_id?: string | null;
  method: string;
  amount_php: number;
  reference?: string;
  proof_path?: string;
  notes?: string;
};

/**
 * Pure orchestration for a manual payment submission. Exported so a smoke
 * test can drive it with mocked Supabase clients and assert the rows
 * /admin/payments reads from (payments, payment_review_events,
 * admin_audit_log) are all created with the right shape.
 */
export async function submitManualPaymentCore(
  deps: { supabase: any; supabaseAdmin: any; userId: string },
  data: SubmitManualPaymentInput,
) {
  const { supabase, supabaseAdmin, userId } = deps;

  const { data: cfg } = await supabaseAdmin
    .from("payment_method_config")
    .select("method,enabled,is_manual")
    .eq("method", data.method)
    .maybeSingle();
  if (!cfg || !cfg.enabled || !cfg.is_manual) {
    throw new Error("Payment method not available");
  }

  const { data: invNum } = await supabaseAdmin.rpc("generate_invoice_number");

  const proofUrl = data.proof_path ?? null;
  const proofUploadedAt = proofUrl ? new Date().toISOString() : null;

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      user_id: userId,
      kind: data.kind,
      listing_id:
        data.kind === "listing" || data.kind === "upgrade" || data.kind === "boost"
          ? data.ref_id ?? null
          : null,
      amount_php: data.amount_php,
      gross_amount_php: data.amount_php,
      status: "pending",
      method: data.method,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
      proof_url: proofUrl,
      proof_uploaded_at: proofUrl ? proofUploadedAt : null,
      invoice_number: invNum as string,
    } as any)
    .select("id,invoice_number")
    .single();
  if (error) throw error;

  await supabaseAdmin
    .from("payments")
    .update({ review_state: "awaiting_review" } as any)
    .eq("id", payment.id);

  const submissionNote = proofUrl
    ? `Buyer submitted ${data.method} payment with proof${data.reference ? ` (ref ${data.reference})` : ""}.`
    : `Buyer submitted ${data.method} payment${data.reference ? ` (ref ${data.reference})` : ""} — no proof attached.`;
  await Promise.all([
    supabaseAdmin.from("payment_review_events").insert({
      payment_id: payment.id,
      actor_id: userId,
      from_state: null,
      to_state: "awaiting_review",
      note: submissionNote,
    } as any),
    supabaseAdmin.from("admin_audit_log").insert({
      actor_id: userId,
      target_user_id: userId,
      action: "payment_submitted",
      field: "payment",
      entity_type: "payment",
      entity_id: payment.id,
      new_value: "awaiting_review",
      note: submissionNote,
      metadata: {
        invoice_number: payment.invoice_number,
        method: data.method,
        kind: data.kind,
        amount_php: data.amount_php,
        reference: data.reference ?? null,
        listing_id:
          data.kind === "listing" || data.kind === "upgrade" || data.kind === "boost"
            ? data.ref_id ?? null
            : null,
        proof_attached: !!proofUrl,
        proof_url: proofUrl,
        proof_uploaded_at: proofUploadedAt,
      },
    } as any),
  ]);

  return {
    id: payment.id,
    invoice_number: payment.invoice_number,
    review_state: "awaiting_review" as const,
    proof_attached: !!proofUrl,
  };
}

export const submitManualPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: SubmitManualPaymentInput) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return submitManualPaymentCore(
      { supabase: context.supabase, supabaseAdmin, userId: context.userId },
      data,
    );
  });

// ===== Staged review workflow =====

export const adminClaimPaymentReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; note?: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("payments")
      .select("review_state")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!row) throw new Error("Payment not found");
    if ((row as any).review_state !== "awaiting_review") {
      throw new Error(`Cannot claim review from state '${(row as any).review_state}'`);
    }
    const patch: any = {
      review_state: "in_review",
      review_started_at: new Date().toISOString(),
      review_started_by: context.userId,
    };
    if (data.note) patch.review_notes = data.note;
    const { error } = await supabaseAdmin.from("payments").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminReleasePaymentReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; note?: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("payments")
      .select("review_state")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || (row as any).review_state !== "in_review") {
      throw new Error("Only an in-review payment can be released");
    }
    const patch: any = {
      review_state: "awaiting_review",
      review_started_at: null,
      review_started_by: null,
    };
    if (data.note) patch.review_notes = data.note;
    const { error } = await supabaseAdmin.from("payments").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminApprovePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; notes?: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("payments")
      .select("review_state,status")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Payment not found");
    const rs = (row as any).review_state;
    if (rs !== "in_review" && rs !== "awaiting_review") {
      throw new Error(`Cannot approve from review state '${rs}'`);
    }
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("payments")
      .update({
        status: "paid",
        paid_at: now,
        approved_at: now,
        reviewed_by: context.userId,
        reviewed_at: now,
        review_state: "approved",
        review_notes: data.notes ?? null,
      } as any)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminRejectPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; reason: string }) => {
    if (!data.reason || data.reason.trim().length < 5) {
      throw new Error("Rejection reason must be at least 5 characters");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("payments")
      .select("review_state")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Payment not found");
    const rs = (row as any).review_state;
    if (rs !== "in_review" && rs !== "awaiting_review") {
      throw new Error(`Cannot reject from review state '${rs}'`);
    }
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("payments")
      .update({
        status: "failed",
        rejected_at: now,
        rejection_reason: data.reason.trim(),
        reviewed_by: context.userId,
        reviewed_at: now,
        review_state: "rejected",
        review_notes: data.reason.trim(),
      } as any)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminListPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      review_state?: ReviewState | "all";
      status?: string;
      method?: string;
      q?: string;
      limit?: number;
    } = {}) => data,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("payments")
      .select(
        "id,user_id,kind,listing_id,amount_php,method,reference,notes,proof_url,proof_uploaded_at,invoice_number,created_at,status,review_state,review_started_at,review_started_by,approved_at,rejected_at,rejection_reason,reviewed_by,reviewed_at,review_notes,paid_at",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.review_state && data.review_state !== "all") {
      q = q.eq("review_state", data.review_state);
    }
    if (data.status) q = q.eq("status", data.status as any);
    if (data.method) q = q.eq("method", data.method);
    if (data.q && data.q.trim()) {
      const term = data.q.trim();
      q = q.or(`invoice_number.ilike.%${term}%,reference.ilike.%${term}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw error;

    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean)));
    const reviewerIds = Array.from(
      new Set(
        (rows ?? [])
          .flatMap((r: any) => [r.review_started_by, r.reviewed_by])
          .filter(Boolean),
      ),
    );
    const allIds = Array.from(new Set([...userIds, ...reviewerIds]));
    const { data: profs } = allIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id,full_name,business_name")
          .in("id", allIds)
      : { data: [] as any[] };
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

    return (rows ?? []).map((r: any) => ({
      ...r,
      profile: profMap.get(r.user_id) ?? null,
      reviewer_profile: r.reviewed_by ? profMap.get(r.reviewed_by) ?? null : null,
      claimer_profile: r.review_started_by ? profMap.get(r.review_started_by) ?? null : null,
    }));
  });

export const adminGetPaymentDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!payment) throw new Error("Payment not found");

    const [{ data: events }, { data: profile }, { data: lineItems }] = await Promise.all([
      supabaseAdmin
        .from("payment_review_events")
        .select("id,actor_id,from_state,to_state,note,created_at")
        .eq("payment_id", data.id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("profiles")
        .select("id,full_name,business_name")
        .eq("id", (payment as any).user_id)
        .maybeSingle(),
      supabaseAdmin
        .from("payment_line_items")
        .select("*")
        .eq("payment_id", data.id),
    ]);

    const actorIds = Array.from(
      new Set((events ?? []).map((e: any) => e.actor_id).filter(Boolean)),
    );
    const { data: actors } = actorIds.length
      ? await supabaseAdmin.from("profiles").select("id,full_name,business_name").in("id", actorIds)
      : { data: [] as any[] };
    const actorMap = new Map((actors ?? []).map((a: any) => [a.id, a]));

    let signedProofUrl: string | null = null;
    if ((payment as any).proof_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("payment-proofs")
        .createSignedUrl((payment as any).proof_url, 600);
      signedProofUrl = signed?.signedUrl ?? null;
    }

    return {
      payment,
      profile,
      line_items: lineItems ?? [],
      events: (events ?? []).map((e: any) => ({
        ...e,
        actor: e.actor_id ? actorMap.get(e.actor_id) ?? null : null,
      })),
      signed_proof_url: signedProofUrl,
    };
  });
