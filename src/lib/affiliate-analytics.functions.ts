import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export type AffiliateAnalytics = {
  range_days: number;
  total_clicks: number;
  by_supplier: Array<{ supplier_slug: string; clicks: number }>;
  by_day: Array<{ day: string; clicks: number }>;
  top_listings: Array<{ listing_id: string; clicks: number }>;
  top_make_model: Array<{ key: string; clicks: number }>;
  recent: Array<{
    created_at: string;
    supplier_slug: string;
    query: string | null;
    listing_id: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
    vehicle_year: number | null;
  }>;
};

export const getAffiliateAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rangeDays?: number }) => ({
    rangeDays: Math.max(1, Math.min(90, Number(d?.rangeDays ?? 30))),
  }))
  .handler(async ({ data, context }): Promise<AffiliateAnalytics> => {
    await ensureAdmin(context);
    const since = new Date(Date.now() - data.rangeDays * 24 * 60 * 60 * 1000).toISOString();
    const { data: rowsRaw, error } = await context.supabase
      .from("affiliate_clicks" as any)
      .select("created_at,supplier_slug,query,listing_id,vehicle_make,vehicle_model,vehicle_year")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw error;
    const rows = ((rowsRaw as any[]) ?? []) as AffiliateAnalytics["recent"];

    const bySup = new Map<string, number>();
    const byDay = new Map<string, number>();
    const byListing = new Map<string, number>();
    const byMm = new Map<string, number>();
    for (const r of rows) {
      bySup.set(r.supplier_slug, (bySup.get(r.supplier_slug) ?? 0) + 1);
      const day = r.created_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
      if (r.listing_id) byListing.set(r.listing_id, (byListing.get(r.listing_id) ?? 0) + 1);
      const mm = [r.vehicle_make, r.vehicle_model].filter(Boolean).join(" ").trim();
      if (mm) byMm.set(mm, (byMm.get(mm) ?? 0) + 1);
    }
    const toSorted = (m: Map<string, number>, k: string) =>
      [...m.entries()]
        .map(([key, clicks]) => ({ [k]: key, clicks }))
        .sort((a: any, b: any) => b.clicks - a.clicks);

    return {
      range_days: data.rangeDays,
      total_clicks: rows.length,
      by_supplier: toSorted(bySup, "supplier_slug") as any,
      by_day: [...byDay.entries()]
        .map(([day, clicks]) => ({ day, clicks }))
        .sort((a, b) => (a.day < b.day ? -1 : 1)),
      top_listings: (toSorted(byListing, "listing_id") as any).slice(0, 25),
      top_make_model: (toSorted(byMm, "key") as any).slice(0, 25),
      recent: rows.slice(0, 100),
    };
  });
