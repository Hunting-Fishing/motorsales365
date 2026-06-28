import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/** Public: log a filter selection from /parts (fire-and-forget). */
export const logPartsFilterEvent = createServerFn({ method: "POST" })
  .inputValidator((d: { make?: string; model?: string; year?: string | number; country?: string; session_id?: string }) =>
    z
      .object({
        make: z.string().trim().max(40).optional(),
        model: z.string().trim().max(40).optional(),
        year: z.union([z.string(), z.number()]).optional(),
        country: z.string().trim().length(2).optional(),
        session_id: z.string().trim().max(64).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    // Skip empty events entirely.
    if (!data.make && !data.model && data.year == null) return { ok: true, skipped: true };
    const yr = data.year != null && /^\d{4}$/.test(String(data.year)) ? Number(data.year) : null;
    const sb = publicClient();
    try {
      await sb.from("parts_filter_events" as any).insert({
        make: data.make || null,
        model: data.model || null,
        year: yr,
        country: (data.country || "PH").toUpperCase(),
        session_id: data.session_id || null,
      });
    } catch {
      /* ignore */
    }
    return { ok: true };
  });

export type FilterCtrRow = { key: string; events: number; clicks: number; ctr: number };
export type MerchantCtrRow = {
  supplier_slug: string;
  clicks: number;
  filtered_clicks: number;
  unfiltered_clicks: number;
  ctr: number;
  share: number;
};
export type PartsFilterAnalytics = {
  range_days: number;
  total_events: number;
  total_clicks_with_filters: number;
  overall_ctr: number;
  top_makes: FilterCtrRow[];
  top_make_models: FilterCtrRow[];
  top_years: FilterCtrRow[];
  top_merchants: MerchantCtrRow[];
  top_products: Array<{ supplier_slug: string; sku: string; title: string | null; clicks: number }>;
};

export const getPartsFilterAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rangeDays?: number }) => ({
    rangeDays: Math.max(1, Math.min(90, Number(d?.rangeDays ?? 30))),
  }))
  .handler(async ({ data, context }): Promise<PartsFilterAnalytics> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const since = new Date(Date.now() - data.rangeDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: filters } = await context.supabase
      .from("parts_filter_events" as any)
      .select("make,model,year,created_at")
      .gte("created_at", since)
      .limit(5000);

    const fRows = ((filters as any[]) ?? []) as Array<{ make: string | null; model: string | null; year: number | null }>;
    const byMake = new Map<string, number>();
    const byMm = new Map<string, number>();
    const byYr = new Map<string, number>();
    for (const r of fRows) {
      if (r.make) byMake.set(r.make, (byMake.get(r.make) ?? 0) + 1);
      const mm = [r.make, r.model].filter(Boolean).join(" ").trim();
      if (mm) byMm.set(mm, (byMm.get(mm) ?? 0) + 1);
      if (r.year) byYr.set(String(r.year), (byYr.get(String(r.year)) ?? 0) + 1);
    }
    const { data: clicks } = await context.supabase
      .from("affiliate_clicks" as any)
      .select("supplier_slug,partner_sku,product_title,vehicle_make,vehicle_model,vehicle_year")
      .gte("created_at", since)
      .limit(5000);

    const clickRows = ((clicks as any[]) ?? []) as Array<{
      supplier_slug: string;
      partner_sku: string | null;
      product_title: string | null;
      vehicle_make: string | null;
      vehicle_model: string | null;
      vehicle_year: number | null;
    }>;

    const clkByMake = new Map<string, number>();
    const clkByMm = new Map<string, number>();
    const clkByYr = new Map<string, number>();
    const clkBySupplier = new Map<string, number>();
    const filteredClkBySupplier = new Map<string, number>();
    let totalFilteredClicks = 0;
    for (const c of clickRows) {
      const hasFilter = !!(c.vehicle_make || c.vehicle_model || c.vehicle_year);
      if (hasFilter) totalFilteredClicks += 1;
      if (c.supplier_slug) {
        clkBySupplier.set(c.supplier_slug, (clkBySupplier.get(c.supplier_slug) ?? 0) + 1);
        if (hasFilter) filteredClkBySupplier.set(c.supplier_slug, (filteredClkBySupplier.get(c.supplier_slug) ?? 0) + 1);
      }
      if (c.vehicle_make) clkByMake.set(c.vehicle_make, (clkByMake.get(c.vehicle_make) ?? 0) + 1);
      const mm = [c.vehicle_make, c.vehicle_model].filter(Boolean).join(" ").trim();
      if (mm) clkByMm.set(mm, (clkByMm.get(mm) ?? 0) + 1);
      if (c.vehicle_year) clkByYr.set(String(c.vehicle_year), (clkByYr.get(String(c.vehicle_year)) ?? 0) + 1);
    }

    const totalClicks = clickRows.length;
    const topMerchants: MerchantCtrRow[] = [...clkBySupplier.entries()]
      .map(([supplier_slug, clicks]) => {
        const filtered = filteredClkBySupplier.get(supplier_slug) ?? 0;
        return {
          supplier_slug,
          clicks,
          filtered_clicks: filtered,
          unfiltered_clicks: clicks - filtered,
          ctr: fRows.length > 0 ? filtered / fRows.length : 0,
          share: totalClicks > 0 ? clicks / totalClicks : 0,
        };
      })
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 25);

    const mergeCtr = (events: Map<string, number>, clicks: Map<string, number>): FilterCtrRow[] => {
      const keys = new Set<string>([...events.keys(), ...clicks.keys()]);
      return [...keys]
        .map((key) => {
          const ev = events.get(key) ?? 0;
          const cl = clicks.get(key) ?? 0;
          return { key, events: ev, clicks: cl, ctr: ev > 0 ? cl / ev : 0 };
        })
        .sort((a, b) => b.clicks - a.clicks || b.events - a.events);
    };

    const byProd = new Map<string, { supplier_slug: string; sku: string; title: string | null; clicks: number }>();
    for (const c of clickRows) {
      if (!c.partner_sku) continue;
      const key = `${c.supplier_slug}::${c.partner_sku}`;
      const prev = byProd.get(key);
      if (prev) prev.clicks += 1;
      else byProd.set(key, { supplier_slug: c.supplier_slug, sku: c.partner_sku, title: c.product_title, clicks: 1 });
    }

    return {
      range_days: data.rangeDays,
      total_events: fRows.length,
      total_clicks_with_filters: totalFilteredClicks,
      overall_ctr: fRows.length > 0 ? totalFilteredClicks / fRows.length : 0,
      top_makes: mergeCtr(byMake, clkByMake).slice(0, 20),
      top_make_models: mergeCtr(byMm, clkByMm).slice(0, 25),
      top_years: mergeCtr(byYr, clkByYr).slice(0, 20),
      top_merchants: topMerchants,
      top_products: [...byProd.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 25),
    };
  });
