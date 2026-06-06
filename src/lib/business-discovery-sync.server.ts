// Server-only helpers for the scheduled Google Places discovery sync.
// Called by the cron hook and by the "run now" server function.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

// Mirrors TYPE_MAP in business-seed.functions.ts. Kept here so the sync can
// run without importing client-safe modules from this server file.
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

function mapType(types: string[] | undefined): string | null {
  for (const t of types ?? []) if (TYPE_MAP[t]) return TYPE_MAP[t];
  return null;
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

type SearchRow = {
  id: string;
  query: string;
  city: string | null;
  region: string | null;
  place_type: string;
};

type PlaceResult = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  photos?: Array<{ name?: string }>;
};

const FIELD_MASK = [
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
].join(",");

async function runOnePlacesSearch(s: SearchRow): Promise<PlaceResult[]> {
  // Bake the place type into the query as a keyword (Google's strict
  // `includedType` rejects many of our internal slugs and returns zero hits).
  const typeKeyword = (s.place_type ?? "").replace(/_/g, " ");
  const textQuery = [s.query, typeKeyword, s.city, s.region, "Philippines"]
    .filter(Boolean)
    .join(", ");
  const body = {
    textQuery,
    maxResultCount: 20,
    regionCode: "PH",
    languageCode: "en",
  };
  const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
    method: "POST",
    headers: { ...gatewayHeaders(), "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places search ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { places?: PlaceResult[] };
  return json.places ?? [];
}

function computeDiff(
  place: PlaceResult,
  existing: { phone: string | null; website: string | null; rating_avg: number | null; rating_count: number | null; street_address: string | null },
): Record<string, { from: unknown; to: unknown }> | null {
  const phone = place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null;
  const website = place.websiteUri ?? null;
  const rating = place.rating ?? null;
  const ratingCount = place.userRatingCount ?? null;
  const address = place.formattedAddress ?? null;
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  if ((existing.phone ?? null) !== phone && phone) diff.phone = { from: existing.phone, to: phone };
  if ((existing.website ?? null) !== website && website) diff.website = { from: existing.website, to: website };
  if (rating != null && Number(existing.rating_avg ?? 0) !== Number(rating)) diff.rating_avg = { from: existing.rating_avg, to: rating };
  if (ratingCount != null && Number(existing.rating_count ?? 0) !== Number(ratingCount)) diff.rating_count = { from: existing.rating_count, to: ratingCount };
  if (address && existing.street_address !== address) diff.street_address = { from: existing.street_address, to: address };
  return Object.keys(diff).length ? diff : null;
}

export type SyncSummary = {
  searches: number;
  found: number;
  inserted: number;
  refreshed: number;
  updates_detected: number;
  errors: { search_id: string; message: string }[];
};

export async function runDiscoverySync(opts: { searchIds?: string[] } = {}): Promise<SyncSummary> {
  const q = (supabaseAdmin as any)
    .from("business_discovery_searches")
    .select("id, query, city, region, place_type")
    .eq("active", true);
  const { data: searches, error } = opts.searchIds && opts.searchIds.length
    ? await q.in("id", opts.searchIds)
    : await q;
  if (error) throw new Error(`load searches: ${error.message}`);

  const summary: SyncSummary = {
    searches: searches?.length ?? 0,
    found: 0,
    inserted: 0,
    refreshed: 0,
    updates_detected: 0,
    errors: [],
  };
  const now = new Date().toISOString();

  for (const s of (searches ?? []) as SearchRow[]) {
    try {
      const places = await runOnePlacesSearch(s);
      summary.found += places.length;
      if (places.length === 0) {
        await (supabaseAdmin as any)
          .from("business_discovery_searches")
          .update({ last_run_at: now, last_status: "ok", last_error: null, last_found_count: 0, last_new_count: 0 })
          .eq("id", s.id);
        continue;
      }
      const placeIds = places.map((p) => p.id);

      // Already-imported businesses for this batch (for update detection)
      const { data: existing } = await supabaseAdmin
        .from("businesses")
        .select("id, source_external_id, phone, website, rating_avg, rating_count, street_address")
        .eq("source", "google_places")
        .in("source_external_id", placeIds);
      const existingMap = new Map((existing ?? []).map((e: any) => [e.source_external_id, e]));

      // Already-queued rows so we update last_seen_at rather than insert dupes
      const { data: queued } = await (supabaseAdmin as any)
        .from("business_discovery_queue")
        .select("id, external_id, status")
        .eq("source", "google_places")
        .in("external_id", placeIds);
      const queuedMap = new Map((queued ?? []).map((q: any) => [q.external_id, q]));

      let inserted = 0;
      for (const p of places) {
        const existingBiz = existingMap.get(p.id);
        const existingQueue = queuedMap.get(p.id);
        const diff = existingBiz ? computeDiff(p, existingBiz) : null;

        const baseRow = {
          source: "google_places",
          external_id: p.id,
          name: p.displayName?.text ?? "Unnamed",
          address: p.formattedAddress ?? null,
          lat: p.location?.latitude ?? null,
          lng: p.location?.longitude ?? null,
          phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
          website: p.websiteUri ?? null,
          rating: p.rating ?? null,
          rating_count: p.userRatingCount ?? null,
          types: p.types ?? [],
          our_type: mapType(p.types),
          photo_name: p.photos?.[0]?.name ?? null,
          region: s.region,
          city: s.city,
          search_id: s.id,
          existing_business_id: existingBiz?.id ?? null,
          diff,
          last_seen_at: now,
        };

        if (existingQueue) {
          // Refresh existing pending row (or keep dismissed/imported as-is on status).
          if ((existingQueue as any).status === "pending") {
            await (supabaseAdmin as any)
              .from("business_discovery_queue")
              .update(baseRow)
              .eq("id", (existingQueue as any).id);
            summary.refreshed++;
            if (diff) summary.updates_detected++;
          }
        } else if (existingBiz && !diff) {
          // Already imported, nothing changed — skip queuing.
          continue;
        } else {
          const { error: insErr } = await (supabaseAdmin as any)
            .from("business_discovery_queue")
            .insert({ ...baseRow, status: "pending" });
          if (!insErr) {
            inserted++;
            summary.inserted++;
            if (diff) summary.updates_detected++;
          }
        }
      }

      await (supabaseAdmin as any)
        .from("business_discovery_searches")
        .update({
          last_run_at: now,
          last_status: "ok",
          last_error: null,
          last_found_count: places.length,
          last_new_count: inserted,
        })
        .eq("id", s.id);
    } catch (e: any) {
      const msg = e?.message ?? "unknown error";
      summary.errors.push({ search_id: s.id, message: msg });
      await (supabaseAdmin as any)
        .from("business_discovery_searches")
        .update({ last_run_at: now, last_status: "error", last_error: msg.slice(0, 500) })
        .eq("id", s.id);
    }
  }

  return summary;
}
