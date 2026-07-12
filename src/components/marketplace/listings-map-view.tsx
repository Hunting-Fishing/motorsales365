import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import regionCentroids from "@/data/ph-region-centroids.json";
import type { ListingCardData } from "@/components/listing-card";
import { formatPHP } from "@/lib/format";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const CENTROIDS = regionCentroids as Record<
  string,
  { lat: number; lng: number; zoom: number }
>;
const PH_CENTER = { lat: 12.8797, lng: 121.774 };

type Pin =
  | { kind: "exact"; lat: number; lng: number; listing: ListingCardData }
  | { kind: "region"; lat: number; lng: number; region: string; listings: ListingCardData[] };

function buildPins(
  listings: ListingCardData[],
  cityCoords: Record<string, { lat: number; lng: number }>,
): { pins: Pin[]; unmapped: number } {
  const pins: Pin[] = [];
  const byRegion = new Map<string, ListingCardData[]>();
  let unmapped = 0;
  for (const l of listings) {
    if (l.lat != null && l.lng != null && Number.isFinite(l.lat) && Number.isFinite(l.lng)) {
      pins.push({ kind: "exact", lat: Number(l.lat), lng: Number(l.lng), listing: l });
      continue;
    }
    // Try city-level geocode cache (much more accurate than region centroid)
    const cityKey = l.city && l.region ? `${l.city}|${l.region}` : null;
    if (cityKey && cityCoords[cityKey]) {
      const c = cityCoords[cityKey];
      pins.push({ kind: "exact", lat: c.lat, lng: c.lng, listing: l });
      continue;
    }
    if (l.region && CENTROIDS[l.region]) {
      const arr = byRegion.get(l.region) ?? [];
      arr.push(l);
      byRegion.set(l.region, arr);
    } else {
      unmapped++;
    }
  }
  for (const [region, ls] of byRegion) {
    pins.push({
      kind: "region",
      lat: CENTROIDS[region].lat,
      lng: CENTROIDS[region].lng,
      region,
      listings: ls,
    });
  }
  return { pins, unmapped };
}

const CITY_CACHE_KEY = "ph-city-geocode-v1";
function loadCityCache(): Record<string, { lat: number; lng: number }> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CITY_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveCityCache(c: Record<string, { lat: number; lng: number }>) {
  try {
    localStorage.setItem(CITY_CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore quota */
  }
}
async function geocodeCity(city: string, region: string): Promise<{ lat: number; lng: number } | null> {
  // Strip "Region X — " prefix for a friendlier query
  const regionName = region.split("—").pop()?.trim() || region;
  const q = `${city}, ${regionName}, Philippines`;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(q)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!arr?.length) return null;
    const lat = Number(arr[0].lat);
    const lng = Number(arr[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

function regionBadgeIcon(count: number): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="background:#14B8A6;color:white;font-weight:700;border-radius:9999px;min-width:28px;height:28px;padding:0 8px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid white;font-size:12px;">${count}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

type Selection =
  | { kind: "exact"; listing: ListingCardData }
  | { kind: "region"; region: string; listings: ListingCardData[] };

function FitToPins({ pins }: { pins: Pin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [pins, map]);
  return null;
}

export function ListingsMapView({ listings }: { listings: ListingCardData[] }) {
  const [selected, setSelected] = useState<Selection | null>(null);
  const [cityCoords, setCityCoords] = useState<Record<string, { lat: number; lng: number }>>(
    () => loadCityCache(),
  );
  const { pins, unmapped } = useMemo(
    () => buildPins(listings, cityCoords),
    [listings, cityCoords],
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Resolve city-level coordinates for listings missing lat/lng but with city+region.
  const pendingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const missing: Array<{ key: string; city: string; region: string }> = [];
    for (const l of listings) {
      if (l.lat != null && l.lng != null) continue;
      if (!l.city || !l.region) continue;
      const key = `${l.city}|${l.region}`;
      if (cityCoords[key] || pendingRef.current.has(key)) continue;
      pendingRef.current.add(key);
      missing.push({ key, city: l.city, region: l.region });
    }
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const next = { ...cityCoords };
      let changed = false;
      // Serialize with a small delay to respect Nominatim usage policy (~1 req/sec).
      for (const m of missing) {
        if (cancelled) return;
        const c = await geocodeCity(m.city, m.region);
        if (c) {
          next[m.key] = c;
          changed = true;
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
      if (!cancelled && changed) {
        saveCityCache(next);
        setCityCoords(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listings, cityCoords]);


  const selectionList: ListingCardData[] =
    selected?.kind === "exact"
      ? [selected.listing]
      : selected?.kind === "region"
        ? selected.listings
        : [];
  const selectionTitle =
    selected?.kind === "exact"
      ? selected.listing.city ?? selected.listing.region ?? "Listing"
      : selected?.kind === "region"
        ? selected.region
        : "Tap a pin";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden rounded-xl border border-border bg-muted">
        {mounted ? (
          <MapContainer
            center={[PH_CENTER.lat, PH_CENTER.lng]}
            zoom={6}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <FitToPins pins={pins} />
            {pins.map((pin, i) => (
              <Marker
                key={pin.kind === "exact" ? `x-${pin.listing.id}` : `r-${pin.region}-${i}`}
                position={[pin.lat, pin.lng]}
                icon={pin.kind === "region" ? regionBadgeIcon(pin.listings.length) : DefaultIcon}
                eventHandlers={{
                  click: () => {
                    if (pin.kind === "exact") {
                      setSelected({ kind: "exact", listing: pin.listing });
                    } else {
                      setSelected({
                        kind: "region",
                        region: pin.region,
                        listings: pin.listings,
                      });
                    }
                  },
                }}
              />
            ))}
          </MapContainer>
        ) : null}
        {pins.length === 0 && mounted && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow">
            No listings have a mappable location yet.
          </div>
        )}
        {unmapped > 0 && pins.length > 0 && (
          <div className="pointer-events-none absolute right-3 top-3 z-[400] rounded-full bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow">
            {unmapped} listing{unmapped === 1 ? "" : "s"} without a location
          </div>
        )}
      </div>

      <aside className="rounded-xl border border-border bg-card p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-primary" />
          {selectionTitle}
        </h3>
        {selected ? (
          <ul className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {selectionList.map((l) => (
              <li key={l.id}>
                <Link
                  to="/listing/$id"
                  params={{ id: l.id }}
                  className="flex gap-2 rounded-md border border-border bg-background p-2 transition-colors hover:bg-secondary"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-muted">
                    {l.cover_url ? (
                      <img
                        src={l.cover_url}
                        alt={l.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{l.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.city ?? l.region ?? "—"}
                    </p>
                    <p className="text-xs font-bold text-primary">
                      {l.price_hidden ? "Inquire" : formatPHP(Number(l.price_php ?? 0))}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            Tap any pin on the map to see the listing.
            {pins.length > 0 ? ` ${pins.length} pin${pins.length === 1 ? "" : "s"} shown.` : ""}
          </p>
        )}
      </aside>
    </div>
  );
}
