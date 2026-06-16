import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DraftServiceSchema = z.object({
  catalog_id: z.string().uuid().nullable(),
  pending_suggestion_id: z.string().uuid().nullable(),
  title: z.string().trim().min(1).max(120),
  description: z.string().max(500).nullable(),
  unit: z.string().max(20).nullable(),
  price_php: z.number().nullable(),
  notes: z.string().max(500).nullable(),
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
    // Delete existing then insert; RLS enforces is_business_editor.
    const { error: delErr } = await context.supabase
      .from("business_services")
      .delete()
      .eq("business_id", data.businessId);
    if (delErr) throw new Error(delErr.message);

    if (data.services.length === 0) return { ok: true, count: 0 };

    const rows = data.services.map((s, idx) => ({
      business_id: data.businessId,
      title: s.title,
      description: s.description,
      unit: s.unit,
      price_php: s.price_php,
      catalog_id: s.catalog_id,
      pending_suggestion_id: s.pending_suggestion_id,
      price_label: s.notes,
      sort_order: idx,
      active: true,
    }));

    const { error: insErr } = await context.supabase.from("business_services").insert(rows);
    if (insErr) throw new Error(insErr.message);
    return { ok: true, count: rows.length };
  });
