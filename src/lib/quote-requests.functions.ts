import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const quoteSchema = z.object({
  kind: z.enum(["insurance", "financing"]),
  listingId: z.string().uuid().optional(),
  vehicleMake: z.string().max(80).optional(),
  vehicleModel: z.string().max(80).optional(),
  vehicleYear: z.number().int().min(1900).max(2100).optional(),
  budgetPhp: z.number().min(0).max(99999999).optional(),
  region: z.string().max(120).optional(),
  contactName: z.string().min(1).max(200),
  contactEmail: z.string().email().max(255).optional(),
  contactPhone: z.string().max(60).optional(),
  notes: z.string().max(1000).optional(),
});

// AUTHENTICATED: submit insurance/financing quote request — creates a paid lead_offer
export const submitQuoteRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => quoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const category = data.kind === "insurance" ? "insurance" : "financing";
    const previewParts = [
      data.kind === "insurance" ? "Insurance quote requested" : "Financing requested",
      data.vehicleMake && data.vehicleModel
        ? `${data.vehicleYear ?? ""} ${data.vehicleMake} ${data.vehicleModel}`.trim()
        : null,
      data.region ? `in ${data.region}` : null,
      data.budgetPhp ? `budget ₱${Number(data.budgetPhp).toLocaleString()}` : null,
    ].filter(Boolean);
    const preview = previewParts.join(" · ").slice(0, 480);

    const pricePhp = data.kind === "financing" ? 299 : 199;

    const { data: row, error } = await supabaseAdmin
      .from("lead_offers")
      .insert({
        category_slug: category,
        region: data.region ?? null,
        vehicle_make: data.vehicleMake ?? null,
        vehicle_model: data.vehicleModel ?? null,
        vehicle_year: data.vehicleYear ?? null,
        budget_max_php: data.budgetPhp ?? null,
        urgency: "standard",
        preview,
        contact_name: data.contactName,
        contact_email: data.contactEmail ?? null,
        contact_phone: data.contactPhone ?? null,
        contact_notes: data.notes ?? null,
        source_kind: data.kind,
        source_id: data.listingId ?? null,
        price_php: pricePhp,
        status: "open",
        max_unlocks: 3,
        created_by: userId,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, offerId: (row as any).id };
  });
