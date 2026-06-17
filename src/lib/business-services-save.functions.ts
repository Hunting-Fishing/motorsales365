import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const REGION_SCOPES = [
  "on_site",
  "barangay",
  "city",
  "province",
  "region",
  "nationwide",
] as const;

const DraftServiceSchema = z.object({
  catalog_id: z.string().uuid().nullable(),
  pending_suggestion_id: z.string().uuid().nullable(),
  title: z.string().trim().min(1).max(120),
  description: z.string().max(500).nullable(),
  unit: z.string().max(20).nullable(),
  price_php: z.number().nullable(),
  max_price_php: z.number().nullable().optional(),
  notes: z.string().max(500).nullable(),
  region_scope: z.enum(REGION_SCOPES).nullable().optional(),
  service_radius_km: z.number().int().min(0).max(2000).nullable().optional(),
  eta_minutes: z.number().int().min(0).max(10080).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).optional().default([]),
  available_24_7: z.boolean().optional().default(false),
});

/** Replace the active service rows on a business with the provided list (owner-only via RLS). */
export const saveBusinessServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; services: z.infer<typeof DraftServiceSchema>[] }) =>
    z
      .object({
        businessId: z.string().uuid(),
        services: z.array(DraftServiceSchema).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error: delErr } = await context.supabase
      .from("business_services")
      .delete()
      .eq("business_id", data.businessId);
    if (delErr) throw new Error(delErr.message);

    if (data.services.length === 0) return { ok: true, count: 0 };

    const rows = data.services.map((s, idx) => {
      // Keep tags + 24/7 consistent: presence of "24/7" tag implies the flag and vice versa.
      const cleanedTags = Array.from(
        new Set(
          (s.tags ?? [])
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
            .map((t) => t.toLowerCase()),
        ),
      );
      const has247 = cleanedTags.includes("24/7");
      const available_24_7 = s.available_24_7 || has247;
      const finalTags = available_24_7
        ? Array.from(new Set([...cleanedTags, "24/7"]))
        : cleanedTags;

      return {
        business_id: data.businessId,
        title: s.title,
        description: s.description,
        unit: s.unit,
        price_php: s.price_php,
        max_price_php: s.max_price_php ?? null,
        catalog_id: s.catalog_id,
        pending_suggestion_id: s.pending_suggestion_id,
        price_label: s.notes,
        region_scope: s.region_scope ?? null,
        service_radius_km: s.service_radius_km ?? null,
        eta_minutes: s.eta_minutes ?? null,
        tags: finalTags,
        available_24_7,
        sort_order: idx,
        active: true,
      };
    });

    const { error: insErr } = await context.supabase.from("business_services").insert(rows);
    if (insErr) throw new Error(insErr.message);
    return { ok: true, count: rows.length };
  });
