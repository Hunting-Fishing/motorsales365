import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  geocodeAddress,
  searchNearbyPlaces,
  normalizeName,
  slugify,
  type NearbyPlace,
} from "./places.server";

const GeocodeInput = z.object({ q: z.string().min(2).max(200) });

export const geocodePlace = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GeocodeInput.parse(input))
  .handler(async ({ data }) => {
    const result = await geocodeAddress(data.q);
    if (!result) return { ok: false as const, error: "Location not found" };
    return { ok: true as const, ...result };
  });

const NearbyInput = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius_m: z.number().min(100).max(50000),
  type_slug: z.string().min(1).max(60),
});

export type NearbyImportRow = NearbyPlace & {
  status: "new" | "already_imported" | "duplicate_name";
  existing_business_id?: string;
};

export const findNearbyForImport = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("places.findNearbyForImport")])
  .inputValidator((input: unknown) => NearbyInput.parse(input))
  .handler(async ({ data }): Promise<{ rows: NearbyImportRow[] }> => {

    const places = await searchNearbyPlaces({
      lat: data.lat,
      lng: data.lng,
      radiusM: data.radius_m,
      typeSlug: data.type_slug,
    });
    if (places.length === 0) return { rows: [] };

    const placeIds = places.map((p) => p.place_id);
    const { data: existing } = await supabaseAdmin
      .from("businesses")
      .select("id,name,lat,lng,source,source_external_id")
      .or(`source_external_id.in.(${placeIds.map((id) => `"${id}"`).join(",")})`);

    const byPlaceId = new Map<string, { id: string }>();
    (existing ?? []).forEach((b: any) => {
      if (b.source === "google_places" && b.source_external_id) {
        byPlaceId.set(b.source_external_id, { id: b.id });
      }
    });

    // Also fetch businesses near this area to detect name duplicates
    const { data: nearby } = await supabaseAdmin
      .from("businesses")
      .select("id,name,lat,lng")
      .gte("lat", data.lat - 0.01)
      .lte("lat", data.lat + 0.01)
      .gte("lng", data.lng - 0.01)
      .lte("lng", data.lng + 0.01);

    const rows: NearbyImportRow[] = places.map((p) => {
      const matched = byPlaceId.get(p.place_id);
      if (matched) return { ...p, status: "already_imported", existing_business_id: matched.id };
      const norm = normalizeName(p.name);
      const dupe = (nearby ?? []).find((b: any) => {
        if (b.lat == null || b.lng == null) return false;
        const distKm = Math.sqrt((Number(b.lat) - p.lat) ** 2 + (Number(b.lng) - p.lng) ** 2) * 111;
        return distKm < 0.1 && normalizeName(b.name) === norm;
      });
      if (dupe) return { ...p, status: "duplicate_name", existing_business_id: (dupe as any).id };
      return { ...p, status: "new" };
    });
    return { rows };
  });

const ImportInput = z.object({
  type_slug: z.string().min(1).max(60),
  places: z
    .array(
      z.object({
        place_id: z.string().min(1).max(200),
        name: z.string().min(1).max(200),
        lat: z.number(),
        lng: z.number(),
        address: z.string().nullable(),
        phone: z.string().nullable(),
        website: z.string().nullable(),
      }),
    )
    .min(1)
    .max(20),
});

export const importPlaces = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("places.importPlaces")])
  .inputValidator((input: unknown) => ImportInput.parse(input))
  .handler(async ({ data }) => {


    const inserted: { id: string; slug: string; name: string }[] = [];
    const skipped: { name: string; reason: string }[] = [];

    for (const p of data.places) {
      const baseSlug = slugify(p.name);
      const slug = `${baseSlug}-${p.place_id.slice(-6).toLowerCase()}`;
      const row = {
        slug,
        name: p.name,
        type_slug: data.type_slug,
        status: "pending" as const,
        owner_id: null,
        lat: p.lat,
        lng: p.lng,
        street_address: p.address,
        phone: p.phone,
        website: p.website,
        source: "google_places",
        source_external_id: p.place_id,
      };
      const { data: created, error } = await supabaseAdmin
        .from("businesses")
        .insert(row)
        .select("id,slug,name")
        .single();
      if (error) {
        skipped.push({ name: p.name, reason: error.message });
      } else if (created) {
        inserted.push(created as any);
      }
    }
    return { inserted, skipped };
  });
