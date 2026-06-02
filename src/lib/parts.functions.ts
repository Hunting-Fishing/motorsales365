import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const uuid = z.string().uuid();

export const getPartsForVehicle = createServerFn({ method: "POST" })
  .inputValidator((d: { make?: string; model?: string; year?: number; limit?: number }) => ({
    make: d.make?.trim().toLowerCase() || undefined,
    model: d.model?.trim().toLowerCase() || undefined,
    year: typeof d.year === "number" ? d.year : undefined,
    limit: Math.min(Math.max(d.limit ?? 6, 1), 12),
  }))
  .handler(async ({ data }) => {
    // Public, anonymous-friendly read via admin client (RLS-safe: only active rows returned).
    let q = supabaseAdmin
      .from("affiliate_parts")
      .select(
        "id, title, description, category, image_url, target_url, price_php, network_slug, make, model",
      )
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .limit(data.limit);

    if (data.make) {
      // Match by make (case-insensitive) OR universal (make IS NULL).
      q = q.or(`make.is.null,make.ilike.${data.make}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Light post-filter for year window; can't easily express in OR-string above.
    const filtered = (rows ?? []).filter((r: any) => {
      if (data.year == null) return true;
      const rec: any = r;
      if (rec.year_min && data.year < rec.year_min) return false;
      if (rec.year_max && data.year > rec.year_max) return false;
      return true;
    });
    return filtered;
  });

export const trackPartClick = createServerFn({ method: "POST" })
  .inputValidator((d: { partId: string; listingId?: string; vehicleId?: string }) => ({
    partId: uuid.parse(d.partId),
    listingId: d.listingId ? uuid.parse(d.listingId) : undefined,
    vehicleId: d.vehicleId ? uuid.parse(d.vehicleId) : undefined,
  }))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("vehicle_part_clicks").insert({
      part_id: data.partId,
      listing_id: data.listingId ?? null,
      vehicle_id: data.vehicleId ?? null,
    });
    return { ok: true };
  });
