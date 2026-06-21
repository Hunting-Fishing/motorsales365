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

type Pin =
  | { kind: "exact"; lat: number; lng: number; listing: ListingCardData }
  | { kind: "region"; lat: number; lng: number; region: string; listings: ListingCardData[] };

/** Build pins: exact lat/lng per listing when available; otherwise group leftovers by region centroid. */
function buildPins(listings: ListingCardData[]): { pins: Pin[]; unmapped: number } {
  const pins: Pin[] = [];
  const byRegion = new Map<string, ListingCardData[]>();
  let unmapped = 0;

  for (const l of listings) {
    if (l.lat != null && l.lng != null && Number.isFinite(l.lat) && Number.isFinite(l.lng)) {
      pins.push({ kind: "exact", lat: Number(l.lat), lng: Number(l.lng), listing: l });
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

type Selection =
  | { kind: "exact"; listing: ListingCardData }
  | { kind: "region"; region: string; listings: ListingCardData[] };

export function ListingsMapView({ listings }: { listings: ListingCardData[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);

  const { pins, unmapped } = useMemo(() => buildPins(listings), [listings]);

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

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    let hasAny = false;

    for (const pin of pins) {
      const marker = new window.google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map: mapRef.current,
        title: pin.kind === "exact" ? pin.listing.title : pin.region,
        label:
          pin.kind === "region"
            ? {
                text: String(pin.listings.length),
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: "700",
              }
            : undefined,
      });
      marker.addListener("click", () => {
        if (pin.kind === "exact") {
          setSelected({ kind: "exact", listing: pin.listing });
        } else {
          setSelected({ kind: "region", region: pin.region, listings: pin.listings });
        }
        mapRef.current.panTo({ lat: pin.lat, lng: pin.lng });
      });
      markersRef.current.push(marker);
      bounds.extend({ lat: pin.lat, lng: pin.lng });
      hasAny = true;
    }

    if (hasAny && pins.length > 1) {
      mapRef.current.fitBounds(bounds, 48);
    } else if (hasAny && pins.length === 1) {
      mapRef.current.setCenter({ lat: pins[0].lat, lng: pins[0].lng });
      mapRef.current.setZoom(14);
    }
  }, [ready, pins]);

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
        {!err && pins.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow">
            No listings have a mappable location yet.
          </div>
        )}
        {unmapped > 0 && pins.length > 0 && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow">
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
