import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  category_slug: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/),
  region: z.string().max(120).optional().nullable(),
  province: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  vehicle_make: z.string().max(80).optional().nullable(),
  vehicle_model: z.string().max(80).optional().nullable(),
  vehicle_year: z.number().int().min(1900).max(2100).optional().nullable(),
  budget_min_php: z.number().min(0).max(99999999).optional().nullable(),
  budget_max_php: z.number().min(0).max(99999999).optional().nullable(),
  urgency: z.enum(["low", "standard", "urgent"]).default("standard"),
  preview: z.string().min(1).max(500),
  contact_name: z.string().max(200).optional().nullable(),
  contact_email: z.string().email().max(255).optional().nullable(),
  contact_phone: z.string().max(60).optional().nullable(),
  contact_notes: z.string().max(2000).optional().nullable(),
  price_php: z.number().min(0).max(99999999),
  max_unlocks: z.number().int().min(1).max(50).default(1),
  status: z.enum(["open", "sold", "expired", "withdrawn"]).default("open"),
  expires_at: z.string().optional().nullable(),
});

export const adminListLeadOffers = createServerFn({ method: "GET" })
  .middleware([requireAdminRoleAudited("leadMarketplace.list")])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("lead_offers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { offers: data ?? [] };
  });

export const adminUpsertLeadOffer = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("leadMarketplace.upsert")])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const payload: any = { ...data };
    if (payload.id) {
      const id = payload.id;
      delete payload.id;
      const { error } = await supabaseAdmin.from("lead_offers").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    payload.created_by = userId;
    const { data: row, error } = await supabaseAdmin
      .from("lead_offers")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const adminDeleteLeadOffer = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("leadMarketplace.delete")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("lead_offers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
