/**
 * SYNC GROUP: vehicle-passport
 * Source of truth: .lovable/sync-groups.md#vehicle-passport
 * VERSION: 4
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPublicPassport = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: vehicle, error } = await supabaseAdmin
      .from("vehicles")
      .select(
        "id, make, model, year, color, plate_number, nickname, cover_url, is_public, passport_slug, created_at, ownership_count, disclosures, modifications",
      )
      .eq("passport_slug", data.slug)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!vehicle) return { vehicle: null, records: [], photos: [] };
    const [{ data: records }, { data: photos }] = await Promise.all([
      supabaseAdmin
        .from("vehicle_service_records")
        .select(
          "id, performed_at, mileage_km, service_type, title, shop_name, cost_php, notes, receipt_url",
        )
        .eq("vehicle_id", vehicle.id)
        .order("performed_at", { ascending: false }),
      supabaseAdmin
        .from("vehicle_photos")
        .select("id, url, caption, sort_order")
        .eq("vehicle_id", vehicle.id)
        .order("sort_order", { ascending: true }),
    ]);
    return { vehicle, records: records ?? [], photos: photos ?? [] };
  });
