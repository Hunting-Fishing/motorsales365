// Server-only helpers for talking to the Google Maps Platform connector gateway.
// Must NOT be imported from client code. The router blocks *.server.ts from the client bundle.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

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

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const res = await fetch(
    `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=ph`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error(`Geocode error [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as {
    results?: { formatted_address: string; geometry: { location: { lat: number; lng: number } } }[];
    status?: string;
  };
  const first = json.results?.[0];
  if (!first) return null;
  return {
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
    label: first.formatted_address,
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
  motorcycle_shop: ["motorcycle_dealer"],
  carwash: ["car_wash"],
  towing: ["car_repair"],
  insurance: ["insurance_agency"],
};

export async function searchNearbyPlaces(opts: {
  lat: number;
  lng: number;
  radiusM: number;
  typeSlug: string;
}): Promise<NearbyPlace[]> {
  const includedTypes = PLACE_TYPE_MAP[opts.typeSlug];
  if (!includedTypes) throw new Error(`Unsupported business type for Places import: ${opts.typeSlug}`);

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
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "business";
}
