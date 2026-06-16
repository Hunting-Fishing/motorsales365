import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listServiceSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: "pending" | "approved" | "rejected" | "merged" }) =>
    z.object({ status: z.enum(["pending", "approved", "rejected", "merged"]).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("service_catalog_suggestions")
      .select("*, business:submitter_business_id ( id, name, slug )")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const approveServiceSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    title?: string;
    description?: string | null;
    unit?: string | null;
    mergeIntoCatalogId?: string | null;
    adminNote?: string | null;
  }) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(2).max(100).optional(),
        description: z.string().trim().max(500).nullish(),
        unit: z.string().trim().max(20).nullish(),
        mergeIntoCatalogId: z.string().uuid().nullish(),
        adminNote: z.string().trim().max(500).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sug, error: sErr } = await supabaseAdmin
      .from("service_catalog_suggestions")
      .select("*")
      .eq("id", data.id)
      .single();
    if (sErr || !sug) throw new Error(sErr?.message ?? "Suggestion not found");
    if (sug.status !== "pending") throw new Error("Already decided");

    let catalogId = data.mergeIntoCatalogId ?? null;
    if (!catalogId) {
      const title = (data.title ?? sug.proposed_title).trim();
      const key = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 60);
      const { data: ins, error: insErr } = await supabaseAdmin
        .from("service_catalog")
        .insert({
          business_type_slug: sug.business_type_slug,
          key: `${key}_${sug.id.slice(0, 6)}`,
          title,
          description: data.description ?? sug.proposed_description,
          default_unit: data.unit ?? sug.proposed_unit,
          sort_order: 1000,
          active: true,
        })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);
      catalogId = ins!.id;
    }

    const action = data.mergeIntoCatalogId ? "merged" : "approved";

    await supabaseAdmin
      .from("service_catalog_suggestions")
      .update({
        status: action,
        merged_into_catalog_id: catalogId,
        admin_note: data.adminNote ?? null,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    // Link any business_services rows that were staged against this pending suggestion
    await supabaseAdmin
      .from("business_services")
      .update({ catalog_id: catalogId, pending_suggestion_id: null })
      .eq("pending_suggestion_id", data.id);

    await supabaseAdmin.from("service_suggestion_audit_log").insert({
      suggestion_id: data.id,
      actor_id: context.userId,
      action,
      catalog_id: catalogId,
      note: data.adminNote ?? null,
    });

    return { catalogId };
  });

export const rejectServiceSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; note?: string }) =>
    z.object({ id: z.string().uuid(), note: z.string().trim().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("service_catalog_suggestions")
      .update({
        status: "rejected",
        admin_note: data.note ?? null,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
