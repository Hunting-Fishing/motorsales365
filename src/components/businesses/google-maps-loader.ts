/// <reference types="google.maps" />
// Singleton loader for the Google Maps JavaScript API.
// Must use loading=async + callback (per project rules); never set mapId.

let loaderPromise: Promise<typeof google> | null = null;

declare global {
  interface Window {
    __gmapsInit?: () => void;
    google: typeof google;
  }
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loaderPromise) return loaderPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;
  if (!key) return Promise.reject(new Error("Google Maps browser key is not configured"));

  loaderPromise = new Promise((resolve, reject) => {
    window.__gmapsInit = () => resolve(window.google);
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      loading: "async",
      libraries: "places,marker",
      callback: "__gmapsInit",
    });
    if (channel) params.set("channel", channel);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });
  return loaderPromise;
}

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
