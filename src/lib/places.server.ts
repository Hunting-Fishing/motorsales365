// Server-only helpers for geocoding (free OSM Nominatim) and Google Places
// nearby search (admin-only import flow). Must NOT be imported from client code.
// The router blocks *.server.ts from the client bundle.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

// Nominatim usage policy: descriptive User-Agent, <=1 req/sec, attribution in UI.
// https://operations.osmfoundation.org/policies/nominatim/
const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const NOMINATIM_UA = "365MotorSales/1.0 (https://365motorsales.com; support@365motorsales.com)";

function authHeaders(): Record<string, string> {
  const lovable = process.env.LOVABLE_API_KEY;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovable) throw new Error("LOVABLE_API_KEY is not configured");
  if (!apiKey) throw new Error("Google Maps connector is not linked (GOOGLE_MAPS_API_KEY missing)");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": apiKey,
  };
}

export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
};

// Free geocoding via OSM Nominatim. Biased to the Philippines (countrycodes=ph).
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const url =
    `${NOMINATIM_URL}/search?format=json&limit=1&countrycodes=ph&addressdetails=0` +
    `&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Geocode error [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  const first = json[0];
  if (!first) return null;
  return {
    lat: Number(first.lat),
    lng: Number(first.lon),
    label: first.display_name,
  };
}

export type NearbyPlace = {
  place_id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  address: string | null;
  rating: number | null;
  rating_count: number | null;
  website: string | null;
  phone: string | null;
};

// Map our business type slugs → Google Places (New) "includedTypes".
// https://developers.google.com/maps/documentation/places/web-service/place-types
const PLACE_TYPE_MAP: Record<string, string[]> = {
  fuel_station: ["gas_station"],
  dealership: ["car_dealer"],
  repair_shop: ["car_repair"],
  body_paint: ["car_repair"],
  parts_accessories: ["auto_parts_store"],
  tire_shop: ["auto_parts_store"],
  battery_shop: ["auto_parts_store"],
  accessories: ["auto_parts_store"],
  audio_tint: ["auto_parts_store"],
  motorcycle_shop: ["motorcycle_dealer"],
  carwash: ["car_wash"],
  towing: ["car_repair"],
  rental: ["car_rental"],
  insurance: ["insurance_agency"],
  driving_school: ["driving_school"],
  inspection: ["car_repair"],
  lto_services: ["local_government_office"],
  financing: ["finance"],
  transport: ["moving_company"],
  salvage: ["auto_parts_store"],
};

export async function searchNearbyPlaces(opts: {
  lat: number;
  lng: number;
  radiusM: number;
  typeSlug: string;
}): Promise<NearbyPlace[]> {
  const includedTypes = PLACE_TYPE_MAP[opts.typeSlug];
  if (!includedTypes)
    throw new Error(`Unsupported business type for Places import: ${opts.typeSlug}`);

  const body = {
    includedTypes,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: opts.lat, longitude: opts.lng },
        radius: Math.min(opts.radiusM, 50000),
      },
    },
  };
  const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.websiteUri,places.nationalPhoneNumber",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Places nearby error [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
      rating?: number;
      userRatingCount?: number;
      types?: string[];
      websiteUri?: string;
      nationalPhoneNumber?: string;
    }>;
  };
  return (json.places ?? [])
    .filter((p) => p.location && p.id && p.displayName?.text)
    .map((p) => ({
      place_id: p.id,
      name: p.displayName!.text,
      type: p.types?.[0] ?? "unknown",
      lat: p.location!.latitude,
      lng: p.location!.longitude,
      address: p.formattedAddress ?? null,
      rating: p.rating ?? null,
      rating_count: p.userRatingCount ?? null,
      website: p.websiteUri ?? null,
      phone: p.nationalPhoneNumber ?? null,
    }));
}

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "business"
  );
}
