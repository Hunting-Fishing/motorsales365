import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * PUBLIC: Returns a map of { year: count } for active listings within a
 * category. Powers the count badge beside year options in the browse filter
 * sidebar (e.g. "2004 (684)").
 */
export const getYearCountsForCategory = createServerFn({ method: "POST" })
  .inputValidator((input: { category: string; region?: string | null }) =>
    z
      .object({
        category: z.string().min(1).max(40),
        region: z.string().min(1).max(120).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<Record<string, number>> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("listings")
      .select("attributes")
      .eq("category_slug", data.category)
      .in("status", ["active", "pending_sale"])
      .not("attributes->>year", "is", null)
      .limit(10000);
    if (data.region && data.region !== "all") q = q.eq("region", data.region);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = {};
    for (const r of (rows ?? []) as any[]) {
      const y = r?.attributes?.year;
      if (!y) continue;
      const k = String(y);
      if (!/^\d{4}$/.test(k)) continue;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  });
