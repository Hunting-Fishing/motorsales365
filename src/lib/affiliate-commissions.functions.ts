import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export type CommissionRule = {
  id: string;
  supplier_slug: string;
  rate_bps: number;
  flat_fee_cents: number;
  per_listing_fee_cents: number;
  boost_multiplier_bps: number;
  currency: string;
  notes: string | null;
  is_active: boolean;
};

export type PartnerCommissionRow = {
  supplier_slug: string;
  clicks: number;
  conversions: number;
  pending: number;
  confirmed: number;
  reversed: number;
  paid: number;
  gross_revenue_cents: number;
  computed_commission_cents: number;
  reported_commission_cents: number;
  currency: string;
  rule: CommissionRule | null;
};

export type CommissionsSummary = {
  range_days: number;
  totals: {
    clicks: number;
    conversions: number;
    gross_revenue_cents: number;
    computed_commission_cents: number;
    reported_commission_cents: number;
  };
  by_partner: PartnerCommissionRow[];
};

export const listCommissionRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CommissionRule[]> => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("affiliate_commission_rules" as any)
      .select("*")
      .order("supplier_slug", { ascending: true });
    if (error) throw error;
    return (data as any) ?? [];
  });

export const upsertCommissionRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<CommissionRule> & { supplier_slug: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const payload: any = {
      supplier_slug: data.supplier_slug,
      rate_bps: Math.max(0, Math.min(10000, Number(data.rate_bps ?? 0))),
      flat_fee_cents: Math.max(0, Number(data.flat_fee_cents ?? 0)),
      per_listing_fee_cents: Math.max(0, Number(data.per_listing_fee_cents ?? 0)),
      boost_multiplier_bps: Math.max(0, Number(data.boost_multiplier_bps ?? 10000)),
      currency: data.currency ?? "PHP",
      notes: data.notes ?? null,
      is_active: data.is_active ?? true,
    };
    const { error } = await context.supabase
      .from("affiliate_commission_rules" as any)
      .upsert(payload, { onConflict: "supplier_slug" });
    if (error) throw error;
    return { ok: true };
  });

export const getCommissionsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rangeDays?: number }) => ({
    rangeDays: Math.max(1, Math.min(365, Number(d?.rangeDays ?? 30))),
  }))
  .handler(async ({ data, context }): Promise<CommissionsSummary> => {
    await ensureAdmin(context);
    const since = new Date(Date.now() - data.rangeDays * 86400000).toISOString();

    const [convRes, clickRes, ruleRes] = await Promise.all([
      context.supabase
        .from("affiliate_conversions" as any)
        .select("supplier_slug,status,order_amount_cents,computed_commission_cents,reported_commission_cents,currency")
        .gte("occurred_at", since)
        .limit(10000),
      context.supabase
        .from("affiliate_clicks" as any)
        .select("supplier_slug")
        .gte("created_at", since)
        .limit(20000),
      context.supabase.from("affiliate_commission_rules" as any).select("*"),
    ]);
    if (convRes.error) throw convRes.error;
    if (clickRes.error) throw clickRes.error;
    if (ruleRes.error) throw ruleRes.error;

    const rules = new Map<string, CommissionRule>(
      ((ruleRes.data as any[]) ?? []).map((r: any) => [r.supplier_slug, r]),
    );

    const agg = new Map<string, PartnerCommissionRow>();
    const ensure = (slug: string): PartnerCommissionRow => {
      let row = agg.get(slug);
      if (!row) {
        row = {
          supplier_slug: slug,
          clicks: 0,
          conversions: 0,
          pending: 0,
          confirmed: 0,
          reversed: 0,
          paid: 0,
          gross_revenue_cents: 0,
          computed_commission_cents: 0,
          reported_commission_cents: 0,
          currency: rules.get(slug)?.currency ?? "PHP",
          rule: rules.get(slug) ?? null,
        };
        agg.set(slug, row);
      }
      return row;
    };

    for (const c of (clickRes.data as any[]) ?? []) {
      ensure(c.supplier_slug).clicks += 1;
    }
    for (const c of (convRes.data as any[]) ?? []) {
      const row = ensure(c.supplier_slug);
      row.conversions += 1;
      const status = String(c.status ?? "pending") as keyof PartnerCommissionRow;
      if (status === "pending" || status === "confirmed" || status === "reversed" || status === "paid") {
        (row as any)[status] += 1;
      }
      if (c.status !== "reversed") {
        row.gross_revenue_cents += Number(c.order_amount_cents ?? 0);
        row.computed_commission_cents += Number(c.computed_commission_cents ?? 0);
        row.reported_commission_cents += Number(c.reported_commission_cents ?? 0);
      }
    }

    const by_partner = [...agg.values()].sort(
      (a, b) => b.computed_commission_cents - a.computed_commission_cents,
    );
    const totals = by_partner.reduce(
      (t, r) => {
        t.clicks += r.clicks;
        t.conversions += r.conversions;
        t.gross_revenue_cents += r.gross_revenue_cents;
        t.computed_commission_cents += r.computed_commission_cents;
        t.reported_commission_cents += r.reported_commission_cents;
        return t;
      },
      { clicks: 0, conversions: 0, gross_revenue_cents: 0, computed_commission_cents: 0, reported_commission_cents: 0 },
    );

    return { range_days: data.rangeDays, totals, by_partner };
  });

export const listRecentConversions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number; supplierSlug?: string }) => ({
    limit: Math.max(1, Math.min(500, Number(d?.limit ?? 100))),
    supplierSlug: d?.supplierSlug ?? null,
  }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    let q = context.supabase
      .from("affiliate_conversions" as any)
      .select("id,supplier_slug,network,external_id,status,order_amount_cents,computed_commission_cents,reported_commission_cents,currency,listing_id,vehicle_make,vehicle_model,vehicle_year,was_boosted,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(data.limit);
    if (data.supplierSlug) q = q.eq("supplier_slug", data.supplierSlug);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows as any[];
  });

export const updateConversionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "pending" | "confirmed" | "reversed" | "paid" }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("affiliate_conversions" as any)
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const recomputeAllCommissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data: rules } = await context.supabase
      .from("affiliate_commission_rules" as any)
      .select("*");
    const ruleMap = new Map<string, any>(((rules as any[]) ?? []).map((r) => [r.supplier_slug, r]));
    const { data: rows, error } = await context.supabase
      .from("affiliate_conversions" as any)
      .select("id,supplier_slug,order_amount_cents,listing_id,was_boosted,reported_commission_cents")
      .limit(5000);
    if (error) throw error;
    let updated = 0;
    for (const c of (rows as any[]) ?? []) {
      const rule = ruleMap.get(c.supplier_slug);
      if (!rule) continue;
      const computed = computeCommission({
        order_amount_cents: Number(c.order_amount_cents ?? 0),
        listing_id: c.listing_id,
        was_boosted: !!c.was_boosted,
        rule,
      });
      const { error: uErr } = await context.supabase
        .from("affiliate_conversions" as any)
        .update({ computed_commission_cents: computed })
        .eq("id", c.id);
      if (!uErr) updated += 1;
    }
    return { updated };
  });

export function computeCommission(args: {
  order_amount_cents: number;
  listing_id: string | null;
  was_boosted: boolean;
  rule: { rate_bps: number; flat_fee_cents: number; per_listing_fee_cents: number; boost_multiplier_bps: number };
}): number {
  const base = Math.round((args.order_amount_cents * args.rule.rate_bps) / 10000);
  const listingBonus = args.listing_id ? args.rule.per_listing_fee_cents : 0;
  const subtotal = base + args.rule.flat_fee_cents + listingBonus;
  const mult = args.was_boosted ? args.rule.boost_multiplier_bps : 10000;
  return Math.round((subtotal * mult) / 10000);
}
