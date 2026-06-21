import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import regionCentroids from "@/data/ph-region-centroids.json";
import type { ListingCardData } from "@/components/listing-card";
import { formatPHP } from "@/lib/format";

declare global {
  interface Window {
    google?: any;
    __marketplaceMapInit?: () => void;
  }
}

const CENTROIDS = regionCentroids as Record<
  string,
  { lat: number; lng: number; zoom: number }
>;
const PH_CENTER = { lat: 12.8797, lng: 121.774 };

let loadPromise: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) return reject(new Error("Missing Maps key"));
    window.__marketplaceMapInit = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__marketplaceMapInit${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Maps failed to load"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

interface RegionGroup {
  region: string;
  lat: number;
  lng: number;
  listings: ListingCardData[];
}

/** Groups listings by region with a tiny lat/lng jitter so overlapping pins stay clickable. */
function groupByRegion(listings: ListingCardData[]): RegionGroup[] {
  const byRegion = new Map<string, ListingCardData[]>();
  for (const l of listings) {
    if (!l.region) continue;
    if (!CENTROIDS[l.region]) continue;
    const arr = byRegion.get(l.region) ?? [];
    arr.push(l);
    byRegion.set(l.region, arr);
  }
  return Array.from(byRegion.entries()).map(([region, ls]) => ({
    region,
    lat: CENTROIDS[region].lat,
    lng: CENTROIDS[region].lng,
    listings: ls,
  }));
}

export function ListingsMapView({ listings }: { listings: ListingCardData[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<RegionGroup | null>(null);

  const groups = useMemo(() => groupByRegion(listings), [listings]);
  const unmapped = listings.length - groups.reduce((n, g) => n + g.listings.length, 0);

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (cancelled || !ref.current || !window.google?.maps) return;
        const map = new window.google.maps.Map(ref.current, {
          center: PH_CENTER,
          zoom: 6,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;
        setReady(true);
      })
      .catch((e) => setErr(e?.message ?? "Map failed"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Render markers when groups change
  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    for (const g of groups) {
      const marker = new window.google.maps.Marker({
        position: { lat: g.lat, lng: g.lng },
        map: mapRef.current,
        label: {
          text: String(g.listings.length),
          color: "#ffffff",
          fontSize: "11px",
          fontWeight: "700",
        },
      });
      marker.addListener("click", () => {
        setSelected(g);
        mapRef.current.panTo({ lat: g.lat, lng: g.lng });
      });
      markersRef.current.push(marker);
    }
  }, [ready, groups]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="relative">
        <div
          ref={ref}
          className="h-[60vh] min-h-[420px] w-full overflow-hidden rounded-xl border border-border bg-muted"
        />
        {err && (
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-muted/80 p-6 text-center text-sm text-destructive">
            {err}
          </div>
        )}
        {!err && groups.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow">
            No listings have a mappable region yet.
          </div>
        )}
        {unmapped > 0 && groups.length > 0 && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow">
            {unmapped} listing{unmapped === 1 ? "" : "s"} without a region
          </div>
        )}
      </div>

      <aside className="rounded-xl border border-border bg-card p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-primary" />
          {selected ? selected.region : "Tap a pin"}
        </h3>
        {selected ? (
          <ul className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {selected.listings.map((l) => (
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
            Tap any pin on the map to see listings in that region.
            {groups.length > 0 ? ` ${groups.length} region${groups.length === 1 ? "" : "s"} with listings.` : ""}
          </p>
        )}
      </aside>
    </div>
  );
}
