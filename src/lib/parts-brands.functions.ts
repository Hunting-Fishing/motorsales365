import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * List featured partner brands for the brand rail on /parts and category pages.
 * Reads DISTINCT non-null `brand` from ingested partner_products for the given
 * country, ordered by number of listings (most present first).
 */
export const listFeaturedPartnerBrands = createServerFn({ method: "POST" })
  .inputValidator((d: { country?: string; limit?: number } | undefined) =>
    z
      .object({
        country: z.string().trim().length(2).optional(),
        limit: z.number().int().min(1).max(24).default(12),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const country = (data.country ?? "PH").toUpperCase();
    // Simple, portable aggregation via a bounded row scan. Feed sizes are small
    // (<50k rows / country today), so this is fine without a materialized view.
    const { data: rows, error } = await supabaseAdmin
      .from("partner_products" as any)
      .select("brand")
      .eq("country", country)
      .not("brand", "is", null)
      .limit(5000);
    if (error) return [];
    const counts = new Map<string, number>();
    for (const r of (rows as { brand: string | null }[]) ?? []) {
      const b = (r.brand ?? "").trim();
      if (!b || b.length > 40) continue;
      const key = b.toUpperCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, data.limit)
      .map(([name, count]) => ({ name, count }));
  });
