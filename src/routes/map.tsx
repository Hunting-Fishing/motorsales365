import { createFileRoute, useNavigate } from "@tanstack/react-router";
import ogMap from "@/assets/og/map.jpg";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Star, Store as StoreIcon, MapPin, Locate, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleBusinessMap, type GMapBusiness } from "@/components/businesses/google-business-map";
import { MapFilterBar, type CenterPoint } from "@/components/businesses/map-filter-bar";
import { MapBottomSheet } from "@/components/businesses/map-bottom-sheet";
import { haversineKm } from "@/components/businesses/google-maps-loader";

const searchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  r: z.coerce.number().min(1).max(500).optional(),
  type: z.string().max(64).optional(),
  q: z.string().max(200).optional(),
});

export const Route = createFileRoute("/map")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Business Map — 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "Full-screen map of dealerships, gas stations, repair shops, parts and more across the Philippines. Search by radius from any location.",
      },
      { property: "og:title", content: "Business Map — 365 MotorSales Philippines" },
      {
        property: "og:description",
        content: "Find motor businesses near you on the full-screen Philippines map.",
      },
      { property: "og:url", content: "https://www.365motorsales.com/map" },
      { property: "og:image", content: `https://www.365motorsales.com${ogMap}` },
      { property: "twitter:image", content: `https://www.365motorsales.com${ogMap}` },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/map" }],
  }),
  component: MapPage,
});

type BusinessType = { slug: string; label: string; sort_order: number };
type Row = {
  id: string;
  slug: string;
  name: string;
  type_slug: string;
  city: string | null;
  barangay: string | null;
  province: string | null;
  lat: number | null;
  lng: number | null;
  rating_avg: number;
  rating_count: number;
  featured: boolean;
  price_label: string | null;
  claim_state: "unclaimed" | "claim_pending" | "owned" | null;
};

const LS_KEY = "map:last-search";
type StoredSearch = { lat: number; lng: number; label?: string; radiusKm?: number | null };

function readStoredSearch(): StoredSearch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v?.lat === "number" && typeof v?.lng === "number") return v;
    return null;
  } catch {
    return null;
  }
}

function MapPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [types, setTypes] = useState<BusinessType[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // URL wins as source of truth; fall back to localStorage when URL is bare.
  const stored = search.lat == null || search.lng == null ? readStoredSearch() : null;

  const [typeSlug, setTypeSlug] = useState<string | null>(search.type ?? null);
  const [center, setCenter] = useState<CenterPoint>(
    search.lat != null && search.lng != null
      ? { lat: search.lat, lng: search.lng, label: search.q }
      : stored
        ? { lat: stored.lat, lng: stored.lng, label: stored.label }
        : null,
  );
  const [radiusKm, setRadiusKm] = useState<number | null>(search.r ?? stored?.radiusKm ?? null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const [locating, setLocating] = useState(false);

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation isn't supported on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "My location",
        });
        if (!radiusKm) setRadiusKm(10);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied."
            : "Couldn't get your location.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
    );
  };

  useEffect(() => {

    navigate({
      to: "/map",
      search: {
        ...(center
          ? { lat: Number(center.lat.toFixed(5)), lng: Number(center.lng.toFixed(5)) }
          : {}),
        ...(center && radiusKm ? { r: radiusKm } : {}),
        ...(typeSlug ? { type: typeSlug } : {}),
        ...(center?.label ? { q: center.label } : {}),
      },
      replace: true,
    });

    if (typeof window !== "undefined") {
      try {
        if (center) {
          const payload: StoredSearch = {
            lat: center.lat,
            lng: center.lng,
            label: center.label,
            radiusKm: radiusKm ?? null,
          };
          window.localStorage.setItem(LS_KEY, JSON.stringify(payload));
        } else {
          window.localStorage.removeItem(LS_KEY);
        }
      } catch {
        // ignore quota / private-mode errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, radiusKm, typeSlug]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("business_types")
        .select("slug,label,sort_order")
        .order("sort_order");
      setTypes(data ?? []);
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    (async () => {
      let query = (supabase as any)
        .from("businesses")
        .select(
          "id,slug,name,type_slug,city,barangay,province,lat,lng,rating_avg,rating_count,featured,price_label,claim_state",
        )
        .eq("status", "active")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .limit(500);
      if (typeSlug) query = query.eq("type_slug", typeSlug);
      const { data } = await query;
      setItems(data ?? []);
      setLoading(false);
    })();
  }, [typeSlug]);

  const typeLabel = useMemo(() => {
    const m = new Map(types.map((t) => [t.slug, t.label]));
    return (s: string) => m.get(s) ?? s;
  }, [types]);

  const inRadius = useMemo(() => {
    if (!center || !radiusKm) return items;
    return items.filter(
      (b) =>
        b.lat != null &&
        b.lng != null &&
        haversineKm(
          { lat: center.lat, lng: center.lng },
          { lat: Number(b.lat), lng: Number(b.lng) },
        ) <= radiusKm,
    );
  }, [items, center, radiusKm]);

  const sorted = useMemo(() => {
    if (!center) return inRadius;
    return [...inRadius].sort((a, b) => {
      const da = haversineKm(
        { lat: center.lat, lng: center.lng },
        { lat: Number(a.lat), lng: Number(a.lng) },
      );
      const db = haversineKm(
        { lat: center.lat, lng: center.lng },
        { lat: Number(b.lat), lng: Number(b.lng) },
      );
      return da - db;
    });
  }, [inRadius, center]);

  const mapBusinesses: GMapBusiness[] = sorted.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    type_slug: b.type_slug,
    type_label: typeLabel(b.type_slug),
    lat: b.lat ? Number(b.lat) : null,
    lng: b.lng ? Number(b.lng) : null,
    rating_avg: Number(b.rating_avg),
    rating_count: b.rating_count,
    city: b.city,
    featured: b.featured,
    price_label: b.price_label,
    highlighted: hoverId === b.id,
  }));

  const countLabel = loading
    ? "Loading…"
    : `${sorted.length} result${sorted.length === 1 ? "" : "s"}${center && radiusKm ? ` within ${radiusKm} km` : ""}`;

  const resultsList = (
    <>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card className="p-4 text-center text-sm text-muted-foreground">
          <StoreIcon className="mx-auto mb-2 h-5 w-5 opacity-60" />
          No businesses in this area.
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((b) => {
            const dist =
              center && b.lat != null && b.lng != null
                ? haversineKm(
                    { lat: center.lat, lng: center.lng },
                    { lat: Number(b.lat), lng: Number(b.lng) },
                  )
                : null;
            return (
              <Card
                key={b.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate({ to: "/businesses/$slug", params: { slug: b.slug } })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate({ to: "/businesses/$slug", params: { slug: b.slug } });
                  }
                }}
                onMouseEnter={() => setHoverId(b.id)}
                onMouseLeave={() => setHoverId((id) => (id === b.id ? null : id))}
                className={`min-h-16 cursor-pointer p-4 transition hover:border-primary active:scale-[0.99] ${hoverId === b.id ? "border-primary ring-1 ring-primary/40" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold sm:text-sm">{b.name}</h3>
                      {b.featured && (
                        <Badge variant="default" className="shrink-0 text-[10px]">
                          Featured
                        </Badge>
                      )}
                      {b.claim_state === "unclaimed" && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-dashed text-[10px] text-muted-foreground"
                          title="Added from public sources — not yet claimed by the owner"
                        >
                          Unclaimed
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{typeLabel(b.type_slug)}</div>
                    {(b.city || b.barangay) && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {[b.barangay, b.city].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                    {b.rating_count > 0 && (
                      <div className="flex items-center gap-1 font-medium">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                        {Number(b.rating_avg).toFixed(1)}
                      </div>
                    )}
                    {dist != null && (
                      <div className="text-muted-foreground">{dist.toFixed(1)} km</div>
                    )}
                    {b.price_label && (
                      <Badge variant="secondary" className="text-[10px]">
                        {b.price_label}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <SiteLayout>
      <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
        <div className="mb-3 lg:block">
          <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Business Map
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Search a radius around any location. Tap a pin for details.
          </p>
        </div>
        <Card className="mb-3 p-3">
          <MapFilterBar
            types={types}
            selectedType={typeSlug}
            onSelectType={setTypeSlug}
            center={center}
            onChangeCenter={setCenter}
            radiusKm={radiusKm}
            onChangeRadius={setRadiusKm}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={useMyLocation}
              disabled={locating}
            >
              {locating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Locate className="mr-1.5 h-3.5 w-3.5" />
              )}
              Use my location
            </Button>
          </div>
        </Card>


        {/* Mobile: full-bleed map + bottom sheet. Desktop: side-by-side grid. */}
        <div className="lg:grid lg:grid-cols-[360px_1fr] lg:gap-4">
          {/* Map */}
          <div className="order-1 h-[calc(100dvh-280px)] min-h-[360px] overflow-hidden rounded-lg lg:order-2 lg:h-[640px]">
            <GoogleBusinessMap
              height="100%"
              businesses={mapBusinesses}
              center={center ? { lat: center.lat, lng: center.lng } : null}
              radiusKm={radiusKm}
              onPinClick={(slug: string) => navigate({ to: "/businesses/$slug", params: { slug } })}
            />
          </div>

          {/* Desktop list (sidebar) */}
          <div className="hidden lg:order-1 lg:block lg:max-h-[calc(100dvh-260px)] lg:overflow-y-auto lg:pr-1">
            <div className="mb-2 text-xs text-muted-foreground">{countLabel}</div>
            {resultsList}
          </div>
        </div>
      </div>

      {/* Spacer so peek sheet doesn't cover footer content on mobile */}
      <div className="h-24 lg:hidden" aria-hidden />

      {/* Mobile draggable bottom sheet */}
      <MapBottomSheet
        header={
          <div className="flex items-center gap-2">
            <span className="font-semibold">Results</span>
            <span className="text-muted-foreground">· {countLabel}</span>
          </div>
        }
      >
        {resultsList}
      </MapBottomSheet>
    </SiteLayout>
  );
}
