/**
 * SYNC GROUP: inspection-services
 * Source of truth: .lovable/sync-groups.md#inspection-services
 * Siblings: src/routes/services.inspection.tsx
 * On change: bump VERSION + update sync-groups.md
 * VERSION: 1
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listInspectionServices = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("inspection_services")
    .select("id, slug, name, description, category, price_php_min, price_php_max, pricing_unit, currency, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

const CreateOrderInput = z.object({
  service_slug: z.string().min(1),
  listing_id: z.string().uuid().optional().nullable(),
  contact_name: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().email().max(200),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  vehicle_summary: z.string().trim().max(500).optional().nullable(),
  region: z.string().trim().max(80).optional().nullable(),
  preferred_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const createInspectionOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateOrderInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: svc, error: svcErr } = await supabase
      .from("inspection_services")
      .select("id, active")
      .eq("slug", data.service_slug)
      .maybeSingle();
    if (svcErr) throw new Error(svcErr.message);
    if (!svc || !svc.active) throw new Error("Inspection service is not available.");

    const { data: row, error } = await supabase
      .from("inspection_orders")
      .insert({
        buyer_id: userId,
        service_id: svc.id,
        listing_id: data.listing_id ?? null,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone ?? null,
        vehicle_summary: data.vehicle_summary ?? null,
        region: data.region ?? null,
        preferred_date: data.preferred_date ?? null,
        notes: data.notes ?? null,
      })
      .select("id, status, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyInspectionOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("inspection_orders")
      .select(
        "id, status, created_at, preferred_date, region, vehicle_summary, listing_id, service:inspection_services(slug, name, category, price_php_min, price_php_max, pricing_unit)",
      )
      .eq("buyer_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
