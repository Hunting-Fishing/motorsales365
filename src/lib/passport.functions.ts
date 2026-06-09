/**
 * SYNC GROUP: vehicle-passport
 * Source of truth: .lovable/sync-groups.md#vehicle-passport
 * VERSION: 5
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPublicPassport = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: vehicle, error } = await supabaseAdmin
      .from("vehicles")
      .select(
        "id, make, model, year, color, plate_number, nickname, cover_url, is_public, passport_slug, created_at, ownership_count, disclosures, modifications, passport_premium, passport_premium_until",
      )
      .eq("passport_slug", data.slug)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!vehicle) return { vehicle: null, records: [], photos: [], verification: null };
    const [{ data: records }, { data: photos }, { data: verif }] = await Promise.all([
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
      supabaseAdmin.rpc("get_public_passport_verification", { _slug: data.slug }),
    ]);
    const verification = Array.isArray(verif) && verif.length ? verif[0] : null;
    return { vehicle, records: records ?? [], photos: photos ?? [], verification };
  });

const verificationInput = z.object({
  vehicle_id: z.string().uuid(),
  or_number: z.string().trim().min(3, "OR number required").max(40),
  cr_number: z.string().trim().min(3, "CR number required").max(40),
  chassis_number: z.string().trim().min(6, "Chassis number too short").max(40),
  engine_number: z.string().trim().min(3, "Engine number required").max(40),
  plate_number: z.string().trim().min(3).max(15),
  inspection_date: z.string().optional().nullable(),
  inspection_provider: z.string().trim().max(120).optional().nullable(),
  inspection_notes: z.string().trim().max(1000).optional().nullable(),
  accident_disclosure: z.boolean(),
  flood_disclosure: z.boolean(),
  document_urls: z.array(z.string().min(1)).max(10).default([]),
});

export const submitPassportVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => verificationInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // confirm ownership
    const { data: v, error: vErr } = await supabase
      .from("vehicles")
      .select("id, owner_user_id")
      .eq("id", data.vehicle_id)
      .maybeSingle();
    if (vErr) throw new Error(vErr.message);
    if (!v || v.owner_user_id !== userId) throw new Error("Vehicle not found");

    const payload = {
      vehicle_id: data.vehicle_id,
      submitted_by: userId,
      or_number: data.or_number,
      cr_number: data.cr_number,
      chassis_number: data.chassis_number,
      engine_number: data.engine_number,
      plate_number: data.plate_number,
      inspection_date: data.inspection_date || null,
      inspection_provider: data.inspection_provider || null,
      inspection_notes: data.inspection_notes || null,
      accident_disclosure: data.accident_disclosure,
      flood_disclosure: data.flood_disclosure,
      document_urls: data.document_urls,
      status: "pending" as const,
      reviewer_id: null,
      review_notes: null,
      decided_at: null,
    };
    const { data: row, error } = await supabase
      .from("vehicle_passport_verifications")
      .upsert(payload, { onConflict: "vehicle_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { verification: row };
  });

export const getMyPassportVerification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ vehicle_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("vehicle_passport_verifications")
      .select("*")
      .eq("vehicle_id", data.vehicle_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { verification: row };
  });
