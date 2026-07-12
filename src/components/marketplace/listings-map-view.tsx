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

function highlightIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:34px;height:44px;transform:translate(-1px,-2px);filter:drop-shadow(0 4px 6px rgba(0,0,0,.35));"><svg viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="#ef4444"/><circle cx="12" cy="12" r="4.5" fill="white"/></svg></div>`,
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -36],
  });
}

function ViewportSync({
  onChange,
}: {
  onChange: (bounds: L.LatLngBounds, center: L.LatLng) => void;
}) {
  const map = useMap();
  useEffect(() => {
    const emit = () => onChange(map.getBounds(), map.getCenter());
    emit();
    map.on("moveend", emit);
    map.on("zoomend", emit);
    return () => {
      map.off("moveend", emit);
      map.off("zoomend", emit);
    };
  }, [map, onChange]);
  return null;
}

function FlyTo({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom ?? Math.max(map.getZoom(), 13), {
      duration: 0.6,
    });
  }, [target, map]);
  return null;
}

export function ListingsMapView({ listings }: { listings: ListingCardData[] }) {
  const [cityCoords, setCityCoords] = useState<Record<string, { lat: number; lng: number }>>(
    () => loadCityCache(),
  );
  const { pins, unmapped } = useMemo(
    () => buildPins(listings, cityCoords),
    [listings, cityCoords],
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [center, setCenter] = useState<L.LatLng | null>(null);
  const cardRefs = useRef(new Map<string, HTMLLIElement>());

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

  // Flatten pins into per-listing rows with a resolved lat/lng, for the side list.
  type ListRow = { listing: ListingCardData; lat: number; lng: number; region?: string };
  const rows: ListRow[] = useMemo(() => {
    const out: ListRow[] = [];
    for (const pin of pins) {
      if (pin.kind === "exact") {
        out.push({ listing: pin.listing, lat: pin.lat, lng: pin.lng });
      } else {
        for (const l of pin.listings) {
          out.push({ listing: l, lat: pin.lat, lng: pin.lng, region: pin.region });
        }
      }
    }
    return out;
  }, [pins]);

  const visibleRows = useMemo(() => {
    if (!bounds) return rows;
    return rows.filter((r) => bounds.contains([r.lat, r.lng]));
  }, [rows, bounds]);

  const sortedRows = useMemo(() => {
    if (!center) return visibleRows;
    const cLat = center.lat;
    const cLng = center.lng;
    const dist = (a: ListRow) => {
      const dx = a.lat - cLat;
      const dy = a.lng - cLng;
      return dx * dx + dy * dy;
    };
    return [...visibleRows].sort((a, b) => dist(a) - dist(b));
  }, [visibleRows, center]);

  const onCardClick = (row: ListRow) => {
    setSelectedId(row.listing.id);
    setFlyTarget({ lat: row.lat, lng: row.lng, zoom: 14 });
  };

  const onViewportChange = useCallback((b: L.LatLngBounds, c: L.LatLng) => {
    setBounds((prev) => (prev && prev.equals(b) ? prev : b));
    setCenter((prev) => (prev && prev.lat === c.lat && prev.lng === c.lng ? prev : c));
  }, []);

  // Scroll hovered card into view when a pin is hovered.
  useEffect(() => {
    if (!hoveredId) return;
    const el = cardRefs.current.get(hoveredId);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [hoveredId]);

  return (
    <div className="grid gap-3 lg:grid-cols-[380px_1fr]">
      {/* Side panel */}
      <aside className="order-2 flex flex-col rounded-xl border border-border bg-card lg:order-1 lg:h-[min(75vh,720px)]">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-xs font-semibold">
            {sortedRows.length} result{sortedRows.length === 1 ? "" : "s"} in view
          </p>
          {unmapped > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {unmapped} without location
            </p>
          )}
        </div>
        {sortedRows.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">
            Pan or zoom out to see listings.
          </p>
        ) : (
          <ul className="max-h-[55vh] flex-1 space-y-1.5 overflow-y-auto p-2 lg:max-h-none">
            {sortedRows.map((r) => {
              const l = r.listing;
              const active = selectedId === l.id || hoveredId === l.id;
              return (
                <li
                  key={l.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(l.id, el);
                    else cardRefs.current.delete(l.id);
                  }}
                  onMouseEnter={() => setHoveredId(l.id)}
                  onMouseLeave={() => setHoveredId((h) => (h === l.id ? null : h))}
                  onClick={() => onCardClick(r)}
                  className={`cursor-pointer rounded-md border bg-background p-2 transition-all ${
                    active
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <div className="flex gap-2">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
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
                      <p className="line-clamp-2 text-xs font-medium leading-tight">
                        {l.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {l.city ?? l.region ?? r.region ?? "—"}
                      </p>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-primary">
                          {l.price_hidden ? "Inquire" : formatPHP(Number(l.price_php ?? 0))}
                        </p>
                        <Link
                          to="/listing/$id"
                          params={{ id: l.id }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-medium text-primary hover:underline"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Map */}
      <div className="order-1 relative h-[55vh] min-h-[420px] w-full overflow-hidden rounded-xl border border-border bg-muted lg:order-2 lg:h-[min(75vh,720px)]">
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
            <ViewportSync
              onChange={(b, c) => {
                setBounds(b);
                setCenter(c);
              }}
            />
            <FlyTo target={flyTarget} />
            {pins.map((pin, i) => {
              if (pin.kind === "region") {
                return (
                  <Marker
                    key={`r-${pin.region}-${i}`}
                    position={[pin.lat, pin.lng]}
                    icon={regionBadgeIcon(pin.listings.length)}
                    eventHandlers={{
                      click: (e) => {
                        const map = e.target._map as L.Map;
                        map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom() + 2, 9));
                      },
                    }}
                  />
                );
              }
              const active =
                hoveredId === pin.listing.id || selectedId === pin.listing.id;
              return (
                <Marker
                  key={`x-${pin.listing.id}`}
                  position={[pin.lat, pin.lng]}
                  icon={active ? highlightIcon() : DefaultIcon}
                  eventHandlers={{
                    click: () => setSelectedId(pin.listing.id),
                    mouseover: () => setHoveredId(pin.listing.id),
                    mouseout: () =>
                      setHoveredId((h) => (h === pin.listing.id ? null : h)),
                  }}
                />
              );
            })}
          </MapContainer>
        ) : null}
        {pins.length === 0 && mounted && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow">
            No listings have a mappable location yet.
          </div>
        )}
        {unmapped > 0 && pins.length > 0 && (
          <div className="pointer-events-none absolute right-3 top-3 z-[400] rounded-full bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow">
            {unmapped} without location
          </div>
        )}
      </div>
    </div>
  );
}

