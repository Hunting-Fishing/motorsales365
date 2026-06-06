// Admin-only server functions for seeding the directory from Google Places.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

// Google place type -> our business_types.slug
const TYPE_MAP: Record<string, string> = {
  car_dealer: "dealership",
  used_car_dealer: "used_dealership",
  car_repair: "repair_shop",
  car_wash: "carwash",
  gas_station: "fuel_station",
  auto_parts_store: "parts_accessories",
  motorcycle_dealer: "motorcycle_shop",
  motorcycle_repair: "motorcycle_shop",
  tire_shop: "tire_shop",
  body_shop: "body_paint",
  auto_body_shop: "body_paint",
  car_body_shop: "body_paint",
  insurance_agency: "insurance",
  towing_service: "towing",
  car_rental: "rental",
  driving_school: "driving_school",
  finance: "financing",
  moving_company: "transport",
};

export const AVAILABLE_PLACE_TYPES = Object.keys(TYPE_MAP);

function mapType(types: string[] | undefined): string | null {
  for (const t of types ?? []) {
    if (TYPE_MAP[t]) return TYPE_MAP[t];
  }
  return null;
}

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("can_moderate", { _user_id: ctx.userId });
  if (error || !data) throw new Error("Forbidden: staff only");
}

function gatewayHeaders() {
  const lov = process.env.LOVABLE_API_KEY;
  const gm = process.env.GOOGLE_MAPS_API_KEY;
  if (!lov || !gm) throw new Error("Google Maps connector is not configured");
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": gm,
    "Content-Type": "application/json",
  };
}

const SearchInput = z.object({
  query: z.string().min(2).max(200),
  region: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  placeType: z.string().refine((t) => t in TYPE_MAP, "Unsupported place type"),
  pageToken: z.string().max(2000).optional(),
});

export type SeedCandidate = {
  placeId: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  ratingCount: number | null;
  types: string[];
  ourType: string | null;
  photoName: string | null;
  alreadyImported: boolean;
};

export const searchGooglePlaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SearchInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);

    // Bake the place type into the text query as a keyword instead of using
    // Google's strict `includedType` filter — many of our internal type slugs
    // (motorcycle_repair, auto_body_shop, tire_shop, etc.) aren't valid
    // "primary types" for the New Places API and silently return zero results.
    const typeKeyword = data.placeType.replace(/_/g, " ");
    const textQuery = [data.query, typeKeyword, data.city, data.region, "Philippines"]
      .filter(Boolean)
      .join(", ");

    const body: Record<string, unknown> = {
      textQuery,
      maxResultCount: 20,
      regionCode: "PH",
      languageCode: "en",
    };
    if (data.pageToken) body.pageToken = data.pageToken;

    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.location",
      "places.types",
      "places.nationalPhoneNumber",
      "places.internationalPhoneNumber",
      "places.websiteUri",
      "places.rating",
      "places.userRatingCount",
      "places.photos",
      "nextPageToken",
    ].join(",");

    const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
      method: "POST",
      headers: { ...gatewayHeaders(), "X-Goog-FieldMask": fieldMask },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Places search failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      places?: Array<any>;
      nextPageToken?: string;
    };
    const placeIds = (json.places ?? []).map((p) => p.id).filter(Boolean);
    let existing = new Set<string>();
    if (placeIds.length) {
      const { data: rows } = await context.supabase
        .from("businesses")
        .select("source_external_id")
        .eq("source", "google_places")
        .in("source_external_id", placeIds);
      existing = new Set((rows ?? []).map((r: any) => r.source_external_id));
    }
    const candidates: SeedCandidate[] = (json.places ?? []).map((p: any) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "Unnamed",
      address: p.formattedAddress ?? "",
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
      website: p.websiteUri ?? null,
      rating: p.rating ?? null,
      ratingCount: p.userRatingCount ?? null,
      types: p.types ?? [],
      ourType: mapType(p.types),
      photoName: p.photos?.[0]?.name ?? null,
      alreadyImported: existing.has(p.id),
    }));

    return { candidates, nextPageToken: json.nextPageToken ?? null };
  });

const ImportInput = z.object({
  candidates: z
    .array(
      z.object({
        placeId: z.string().min(1),
        name: z.string().min(1).max(200),
        address: z.string().max(500),
        lat: z.number().nullable(),
        lng: z.number().nullable(),
        phone: z.string().nullable(),
        website: z.string().nullable(),
        rating: z.number().nullable(),
        ratingCount: z.number().nullable(),
        ourType: z.string().min(1).max(64),
        photoName: z.string().nullable(),
        types: z.array(z.string()),
        region: z.string().optional(),
        city: z.string().optional(),
      }),
    )
    .min(1)
    .max(50),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const importSeedCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ImportInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const photoBase = "https://places.googleapis.com/v1";
    const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

    const rows = data.candidates.map((c) => {
      const base = slugify(c.name) || "business";
      const suffix = c.placeId.slice(-6).toLowerCase();
      const slug = `${base}-${suffix}`;
      const photoUrl = c.photoName
        ? `${photoBase}/${c.photoName}/media?maxWidthPx=1200&key=${encodeURIComponent(apiKey)}`
        : null;
      return {
        slug,
        name: c.name,
        type_slug: c.ourType,
        street_address: c.address,
        lat: c.lat,
        lng: c.lng,
        phone: c.phone,
        website: c.website,
        rating_avg: c.rating ?? 0,
        rating_count: c.ratingCount ?? 0,
        region: c.region ?? null,
        city: c.city ?? null,
        status: "active" as const,
        claim_state: "unclaimed",
        source: "google_places",
        source_external_id: c.placeId,
        attribution: "Listing data © Google",
        import_metadata: { google_types: c.types, photo_name: c.photoName },
        photos: photoUrl ? [{ url: photoUrl, source: "google" }] : [],
        cover_url: photoUrl,
        owner_id: null,
      };
    });

    const { data: inserted, error } = await (supabaseAdmin as any)
      .from("businesses")
      .upsert(rows, {
        onConflict: "source,source_external_id",
        ignoreDuplicates: true,
      })
      .select("id,slug,name");
    if (error) throw new Error(error.message);

    return { imported: inserted?.length ?? 0, rows: inserted ?? [] };
  });
