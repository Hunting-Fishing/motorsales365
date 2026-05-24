import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Star, Store as StoreIcon, MapPin } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleBusinessMap, type GMapBusiness } from "@/components/businesses/google-business-map";
import { MapFilterBar, type CenterPoint } from "@/components/businesses/map-filter-bar";
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
      { name: "description", content: "Full-screen map of dealerships, gas stations, repair shops, parts and more across the Philippines. Search by radius from any location." },
      { property: "og:title", content: "Business Map — 365 MotorSales Philippines" },
      { property: "og:description", content: "Find motor businesses near you on the full-screen Philippines map." },
    ],
  }),
  component: MapPage,
});

type BusinessType = { slug: string; label: string; sort_order: number };
type Row = {
  id: string; slug: string; name: string; type_slug: string;
  city: string | null; barangay: string | null; province: string | null;
  lat: number | null; lng: number | null;
  rating_avg: number; rating_count: number; featured: boolean;
  price_label: string | null;
};

function MapPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [types, setTypes] = useState<BusinessType[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeSlug, setTypeSlug] = useState<string | null>(search.type ?? null);
  const [center, setCenter] = useState<CenterPoint>(
    search.lat != null && search.lng != null
      ? { lat: search.lat, lng: search.lng, label: search.q }
      : null,
  );
  const [radiusKm, setRadiusKm] = useState<number | null>(search.r ?? null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Sync URL with state (replaceState-style so back button isn't spammed)
  useEffect(() => {
    navigate({
      to: "/map",
      search: {
        ...(center ? { lat: Number(center.lat.toFixed(5)), lng: Number(center.lng.toFixed(5)) } : {}),
        ...(center && radiusKm ? { r: radiusKm } : {}),
        ...(typeSlug ? { type: typeSlug } : {}),
        ...(center?.label ? { q: center.label } : {}),
      },
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, radiusKm, typeSlug]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("business_types").select("slug,label,sort_order").order("sort_order");
      setTypes(data ?? []);
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    (async () => {
      let query = (supabase as any)
        .from("businesses")
        .select("id,slug,name,type_slug,city,barangay,province,lat,lng,rating_avg,rating_count,featured,price_label")
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
    return items.filter((b) =>
      b.lat != null && b.lng != null &&
      haversineKm({ lat: center.lat, lng: center.lng }, { lat: Number(b.lat), lng: Number(b.lng) }) <= radiusKm,
    );
  }, [items, center, radiusKm]);

  const sorted = useMemo(() => {
    if (!center) return inRadius;
    return [...inRadius].sort((a, b) => {
      const da = haversineKm({ lat: center.lat, lng: center.lng }, { lat: Number(a.lat), lng: Number(a.lng) });
      const db = haversineKm({ lat: center.lat, lng: center.lng }, { lat: Number(b.lat), lng: Number(b.lng) });
      return da - db;
    });
  }, [inRadius, center]);

  const mapBusinesses: GMapBusiness[] = sorted.map((b) => ({
    id: b.id, slug: b.slug, name: b.name,
    type_slug: b.type_slug, type_label: typeLabel(b.type_slug),
    lat: b.lat ? Number(b.lat) : null, lng: b.lng ? Number(b.lng) : null,
    rating_avg: Number(b.rating_avg), rating_count: b.rating_count,
    city: b.city, featured: b.featured, price_label: b.price_label,
    highlighted: hoverId === b.id,
  }));

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-4">
        <div className="mb-3">
          <h1 className="font-display text-2xl font-bold tracking-tight">Business Map</h1>
          <p className="text-sm text-muted-foreground">Search a radius around any location. Click a pin for details.</p>
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
        </Card>
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-2 lg:max-h-[calc(100dvh-260px)] lg:overflow-y-auto lg:pr-1">
            <div className="text-xs text-muted-foreground">
              {loading ? "Loading…" : `${sorted.length} result${sorted.length === 1 ? "" : "s"}${center && radiusKm ? ` within ${radiusKm} km` : ""}`}
            </div>
            {loading ? (
              <>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</>
            ) : sorted.length === 0 ? (
              <Card className="p-4 text-center text-sm text-muted-foreground">
                <StoreIcon className="mx-auto mb-2 h-5 w-5 opacity-60" />
                No businesses in this area.
              </Card>
            ) : (
              sorted.map((b) => {
                const dist = center && b.lat != null && b.lng != null
                  ? haversineKm({ lat: center.lat, lng: center.lng }, { lat: Number(b.lat), lng: Number(b.lng) })
                  : null;
                return (
                  <Card
                    key={b.id}
                    onClick={() => navigate({ to: "/businesses/$slug", params: { slug: b.slug } })}
                    onMouseEnter={() => setHoverId(b.id)}
                    onMouseLeave={() => setHoverId((id) => (id === b.id ? null : id))}
                    className={`cursor-pointer p-3 transition hover:border-primary ${hoverId === b.id ? "border-primary ring-1 ring-primary/40" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">{b.name}</h3>
                          {b.featured && <Badge variant="default" className="shrink-0 text-[10px]">Featured</Badge>}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{typeLabel(b.type_slug)}</div>
                        {(b.city || b.barangay) && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {[b.barangay, b.city].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 text-[11px]">
                        {b.rating_count > 0 && (
                          <div className="flex items-center gap-1 font-medium">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {Number(b.rating_avg).toFixed(1)}
                          </div>
                        )}
                        {dist != null && <div className="text-muted-foreground">{dist.toFixed(1)} km</div>}
                        {b.price_label && <Badge variant="secondary" className="text-[10px]">{b.price_label}</Badge>}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
          <div className="h-[480px] lg:h-[640px]">
            <GoogleBusinessMap
              height="100%"
              businesses={mapBusinesses}
              center={center ? { lat: center.lat, lng: center.lng } : null}
              radiusKm={radiusKm}
              onPinClick={(slug: string) => navigate({ to: "/businesses/$slug", params: { slug } })}
            />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
