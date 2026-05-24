// Kept for backward compatibility: shared helpers used across the map UI.
// The map now uses Leaflet + OpenStreetMap (no API key required).

// Haversine distance in km between two lat/lng points.
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const TYPE_COLORS: Record<string, string> = {
  dealership: "#2563eb",
  motorcycle_shop: "#7c3aed",
  fuel_station: "#16a34a",
  repair_shop: "#ea580c",
  body_paint: "#db2777",
  parts_accessories: "#0891b2",
  tire_shop: "#475569",
  carwash: "#0ea5e9",
  towing: "#dc2626",
  salvage: "#a16207",
  insurance: "#7c2d12",
};

export function colorForType(slug: string): string {
  return TYPE_COLORS[slug] ?? "#64748b";
}
