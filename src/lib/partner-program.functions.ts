import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const ApplySchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  region: z.string().trim().max(80).optional().nullable(),
  channel_type: z.enum(["individual", "influencer", "shop", "community", "other"]),
  platforms: z.array(z.string().max(40)).max(10).default([]),
  audience_band: z.string().trim().max(40).optional().nullable(),
  pitch: z.string().trim().max(500).optional().nullable(),
  agreed_terms: z.literal(true),
  agreed_not_employee: z.literal(true),
});

export const submitPartnerProgramApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ApplySchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { error } = await sb.from("partner_program_applications" as any).insert({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      city: data.city || null,
      region: data.region || null,
      channel_type: data.channel_type,
      platforms: data.platforms,
      audience_band: data.audience_band || null,
      pitch: data.pitch || null,
      agreed_terms: true,
      agreed_terms_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export const adminListPartnerProgramApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("partner_program_applications" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data as any[]) ?? [];
  });

export const adminUpdatePartnerProgramApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      status?: "pending" | "approved" | "rejected";
      admin_notes?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const patch: any = {};
    if (data.status) {
      patch.status = data.status;
      patch.reviewer_id = context.userId;
      patch.reviewed_at = new Date().toISOString();
    }
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { error } = await context.supabase
      .from("partner_program_applications" as any)
      .update(patch)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const getMyPartnerProgramProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: partner } = await context.supabase
      .from("partner_program_partners" as any)
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!partner) return { partner: null, events: [], totals: null };
    const { data: events } = await context.supabase
      .from("partner_program_commission_events" as any)
      .select("*")
      .eq("partner_id", (partner as any).id)
      .order("event_at", { ascending: false })
      .limit(200);
    const list = (events as any[]) ?? [];
    const totals = {
      pending: list.filter((e) => e.status === "pending").reduce((a, e) => a + Number(e.commission_php), 0),
      approved: list.filter((e) => e.status === "approved").reduce((a, e) => a + Number(e.commission_php), 0),
      paid: list.filter((e) => e.status === "paid").reduce((a, e) => a + Number(e.commission_php), 0),
      clawed_back: list.filter((e) => e.status === "clawed_back").reduce((a, e) => a + Number(e.commission_php), 0),
    };
    const { data: payouts } = await context.supabase
      .from("partner_program_payouts" as any)
      .select("*")
      .eq("partner_id", (partner as any).id)
      .order("created_at", { ascending: false })
      .limit(50);
    return { partner, events: list, totals, payouts: (payouts as any[]) ?? [] };
  });

// ============================================================================
// Commission Ledger + Payout Workflow (admin)
// ============================================================================

export const adminListCommissionEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { status?: "pending" | "approved" | "clawed_back" | "paid"; partnerId?: string } | undefined) =>
      d ?? {},
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    let q = context.supabase
      .from("partner_program_commission_events" as any)
      .select("*, partner:partner_program_partners(id, display_name, referral_code, user_id)")
      .order("event_at", { ascending: false })
      .limit(500);
    if (data.status) q = q.eq("status", data.status);
    if (data.partnerId) q = q.eq("partner_id", data.partnerId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows as any[]) ?? [];
  });

export const adminCreateCommissionEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    partner_id: string;
    event_type: "seller_sub" | "boost" | "verified_business" | "advertiser_purchase" | "shop_purchase" | "other";
    amount_php: number;
    commission_php: number;
    source_ref?: string | null;
    notes?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("partner_program_commission_events" as any)
      .insert({
        partner_id: data.partner_id,
        event_type: data.event_type,
        amount_php: data.amount_php,
        commission_php: data.commission_php,
        source_ref: data.source_ref ?? null,
        notes: data.notes ?? null,
        status: "pending",
      });
    if (error) throw error;
    return { ok: true };
  });

export const adminApproveCommissionEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("partner_program_commission_events" as any)
      .update({
        status: "approved",
        approved_by: context.userId,
        approved_at: new Date().toISOString(),
        cleared_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw error;
    return { ok: true };
  });

export const adminClawbackCommissionEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reason: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    // Read event to detect if it was already attached to a payout
    const { data: existing } = await context.supabase
      .from("partner_program_commission_events" as any)
      .select("payout_id, status")
      .eq("id", data.id)
      .maybeSingle();
    const payoutId = (existing as any)?.payout_id ?? null;
    const { error } = await context.supabase
      .from("partner_program_commission_events" as any)
      .update({
        status: "clawed_back",
        clawed_back_reason: data.reason,
        clawed_back_at: new Date().toISOString(),
        clawed_back_by: context.userId,
        payout_id: null,
      })
      .eq("id", data.id);
    if (error) throw error;
    if (payoutId) {
      await context.supabase.rpc("pp_recompute_payout_total", { _payout_id: payoutId });
    }
    return { ok: true };
  });

export const adminListPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string; partnerId?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    let q = context.supabase
      .from("partner_program_payouts" as any)
      .select("*, partner:partner_program_partners(id, display_name, referral_code)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    if (data.partnerId) q = q.eq("partner_id", data.partnerId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows as any[]) ?? [];
  });

export const adminGetPayout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: payout } = await context.supabase
      .from("partner_program_payouts" as any)
      .select("*, partner:partner_program_partners(id, display_name, referral_code, user_id)")
      .eq("id", data.id)
      .maybeSingle();
    const { data: events } = await context.supabase
      .from("partner_program_commission_events" as any)
      .select("*")
      .eq("payout_id", data.id)
      .order("event_at", { ascending: false });
    return { payout: payout ?? null, events: (events as any[]) ?? [] };
  });

/** Create a payout batch from all currently APPROVED (un-batched) events for a partner. */
export const adminCreatePayoutForApproved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { partner_id: string; method?: string; reference?: string | null; notes?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: events, error: eErr } = await context.supabase
      .from("partner_program_commission_events" as any)
      .select("id, commission_php")
      .eq("partner_id", data.partner_id)
      .eq("status", "approved")
      .is("payout_id", null);
    if (eErr) throw eErr;
    const rows = (events as any[]) ?? [];
    if (rows.length === 0) throw new Error("No approved, un-batched events for this partner.");
    const total = rows.reduce((a, r) => a + Number(r.commission_php), 0);
    const { data: payout, error: pErr } = await context.supabase
      .from("partner_program_payouts" as any)
      .insert({
        partner_id: data.partner_id,
        amount_php: total,
        method: data.method ?? "manual",
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        status: "pending",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (pErr) throw pErr;
    const payoutId = (payout as any).id;
    const { error: uErr } = await context.supabase
      .from("partner_program_commission_events" as any)
      .update({ payout_id: payoutId })
      .in("id", rows.map((r) => r.id));
    if (uErr) throw uErr;
    return { ok: true, id: payoutId, count: rows.length, total };
  });

export const adminUpdatePayoutStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    status: "pending" | "processing" | "paid" | "failed" | "cancelled";
    reference?: string | null;
    notes?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const patch: any = { status: data.status };
    if (data.reference !== undefined) patch.reference = data.reference;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.status === "paid") {
      patch.paid_by = context.userId;
      patch.paid_at = new Date().toISOString();
    }
    const { error } = await context.supabase
      .from("partner_program_payouts" as any)
      .update(patch)
      .eq("id", data.id);
    if (error) throw error;

    // Cascade event status
    if (data.status === "paid") {
      await context.supabase
        .from("partner_program_commission_events" as any)
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("payout_id", data.id);
    } else if (data.status === "cancelled" || data.status === "failed") {
      // Detach events back to approved for a future payout
      await context.supabase
        .from("partner_program_commission_events" as any)
        .update({ status: "approved", payout_id: null })
        .eq("payout_id", data.id);
    }
    return { ok: true };
  });

/** List approved+unbatched totals per partner — used to seed payout creation UI. */
export const adminListPayoutCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("partner_program_commission_events" as any)
      .select("partner_id, commission_php, partner:partner_program_partners(display_name, referral_code)")
      .eq("status", "approved")
      .is("payout_id", null);
    if (error) throw error;
    const rows = (data as any[]) ?? [];
    const map = new Map<string, { partner_id: string; display_name: string; referral_code: string; count: number; total: number }>();
    for (const r of rows) {
      const cur = map.get(r.partner_id) ?? {
        partner_id: r.partner_id,
        display_name: r.partner?.display_name ?? "—",
        referral_code: r.partner?.referral_code ?? "",
        count: 0,
        total: 0,
      };
      cur.count += 1;
      cur.total += Number(r.commission_php);
      map.set(r.partner_id, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  });
