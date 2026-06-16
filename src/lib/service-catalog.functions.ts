import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase as publicClient } from "@/integrations/supabase/client";

export type CatalogEntry = {
  id: string;
  business_type_slug: string;
  key: string;
  title: string;
  description: string | null;
  default_unit: string | null;
  sort_order: number;
};

/** Public: list approved catalog entries for a business type. */
export const listCatalogForType = createServerFn({ method: "GET" })
  .inputValidator((d: { businessTypeSlug: string }) =>
    z.object({ businessTypeSlug: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("service_catalog")
      .select("id, business_type_slug, key, title, description, default_unit, sort_order")
      .eq("business_type_slug", data.businessTypeSlug)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as CatalogEntry[];
  });

/** Authenticated: submit a new service suggestion. Returns the new suggestion id. */
export const submitServiceSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    businessTypeSlug: string;
    proposedTitle: string;
    proposedUnit?: string | null;
    proposedDescription?: string | null;
    samplePricePhp?: number | null;
    submitterBusinessId?: string | null;
  }) =>
    z
      .object({
        businessTypeSlug: z.string().min(1),
        proposedTitle: z.string().trim().min(2).max(100),
        proposedUnit: z.string().trim().max(20).nullish(),
        proposedDescription: z.string().trim().max(500).nullish(),
        samplePricePhp: z.number().positive().max(1_000_000).nullish(),
        submitterBusinessId: z.string().uuid().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("service_catalog_suggestions")
      .insert({
        business_type_slug: data.businessTypeSlug,
        proposed_title: data.proposedTitle,
        proposed_unit: data.proposedUnit ?? null,
        proposed_description: data.proposedDescription ?? null,
        sample_price_php: data.samplePricePhp ?? null,
        submitter_id: context.userId,
        submitter_business_id: data.submitterBusinessId ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row!.id };
  });

/** Public: pricing stats across all published businesses for a given catalog entry. */
export const getServicePriceStats = createServerFn({ method: "GET" })
  .inputValidator((d: { catalogId: string; excludeBusinessId?: string | null }) =>
    z
      .object({
        catalogId: z.string().uuid(),
        excludeBusinessId: z.string().uuid().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("business_services")
      .select(
        "business_id, price_php, sale_price_php, unit, businesses!inner(id, name, slug, status)",
      )
      .eq("catalog_id", data.catalogId)
      .eq("active", true)
      .eq("businesses.status", "published");
    if (data.excludeBusinessId) q = q.neq("business_id", data.excludeBusinessId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const priced = (rows ?? [])
      .map((r: any) => {
        const p = r.sale_price_php ?? r.price_php;
        if (p == null) return null;
        return {
          businessId: r.business_id as string,
          name: r.businesses?.name as string,
          slug: r.businesses?.slug as string,
          price: Number(p),
          unit: (r.unit as string | null) ?? null,
        };
      })
      .filter((x): x is { businessId: string; name: string; slug: string; price: number; unit: string | null } => !!x);

    if (priced.length === 0) {
      return { count: 0, avg: null, min: null, max: null, samples: [] as typeof priced };
    }
    const prices = priced.map((p) => p.price);
    const sum = prices.reduce((a, b) => a + b, 0);
    return {
      count: priced.length,
      avg: Math.round((sum / priced.length) * 100) / 100,
      min: Math.min(...prices),
      max: Math.max(...prices),
      // Privacy: only return per-business samples when there are 3+ comparable listings.
      samples: priced.length >= 3 ? priced.slice(0, 10) : [],
    };
  });

// Re-export the public client to satisfy unused-import linters if needed downstream.
export const _publicClient = publicClient;
