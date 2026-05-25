import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Star, Store as StoreIcon, Plus } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleBusinessMap, type GMapBusiness } from "@/components/businesses/google-business-map";
import { MapFilterBar, type CenterPoint } from "@/components/businesses/map-filter-bar";
import { haversineKm } from "@/components/businesses/google-maps-loader";
import { LocationDrilldown, type LocationValue } from "@/components/businesses/location-drilldown";

export const Route = createFileRoute("/businesses/")({
  head: () => ({
    meta: [
      { title: "Businesses Directory — 365 MotorSales Philippines" },
      { name: "description", content: "Find local dealerships, repair shops, parts stores, towing companies and insurance providers across the Philippines on a barangay-level map." },
    ],
  }),
  component: BusinessesIndex,
});

type BusinessType = { slug: string; label: string; sort_order: number };
type Tag = { slug: string; label: string; type_slug: string | null };
type BusinessRow = {
  id: string; slug: string; name: string; type_slug: string; description: string | null;
  logo_url: string | null; region: string | null; province: string | null; city: string | null;
  barangay: string | null; lat: number | null; lng: number | null;
  rating_avg: number; rating_count: number; featured: boolean;
  price_label: string | null;
  subscription_tier: "free" | "listed" | "featured" | "premium" | null;
};


function BusinessesIndex() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<BusinessType[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [items, setItems] = useState<BusinessRow[]>([]);
  const [tagLinks, setTagLinks] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [typeSlug, setTypeSlug] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loc, setLoc] = useState<LocationValue>({ region: null, province: null, city: null, barangay: null });
  const [center, setCenter] = useState<CenterPoint>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [t1, t2] = await Promise.all([
        (supabase as any).from("business_types").select("slug,label,sort_order").order("sort_order"),
        (supabase as any).from("business_tags").select("slug,label,type_slug,sort_order").order("sort_order"),
      ]);
      setTypes(t1.data ?? []);
      setTags(t2.data ?? []);
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    (async () => {
      let query = (supabase as any)
        .from("businesses")
        .select("id,slug,name,type_slug,description,logo_url,region,province,city,barangay,lat,lng,rating_avg,rating_count,featured,price_label,subscription_tier")
        .eq("status", "active")
        .order("subscription_tier", { ascending: false })
        .order("featured", { ascending: false })
        .order("rating_avg", { ascending: false })
        .limit(200);

      if (typeSlug) query = query.eq("type_slug", typeSlug);
      if (loc.region) query = query.eq("region", loc.region);
      if (loc.province) query = query.eq("province", loc.province);
      if (loc.city) query = query.eq("city", loc.city);
      if (loc.barangay) query = query.ilike("barangay", `%${loc.barangay}%`);
      if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);

      const { data } = await query;
      const rows: BusinessRow[] = data ?? [];

      // load tag links for filtering and rendering
      const ids = rows.map((r) => r.id);
      let links: Record<string, string[]> = {};
      if (ids.length > 0) {
        const { data: ld } = await (supabase as any)
          .from("business_tag_links")
          .select("business_id,tag_slug")
          .in("business_id", ids);
        for (const row of ld ?? []) {
          (links[row.business_id] ||= []).push(row.tag_slug);
        }
      }
      setTagLinks(links);

      const filtered = selectedTags.length === 0
        ? rows
        : rows.filter((r) => {
            const ts = links[r.id] ?? [];
            return selectedTags.every((t) => ts.includes(t));
          });

      setItems(filtered);
      setLoading(false);
    })();
  }, [q, typeSlug, selectedTags, loc.region, loc.province, loc.city, loc.barangay]);

  const typeLabel = useMemo(() => {
    const m = new Map(types.map((t) => [t.slug, t.label]));
    return (s: string) => m.get(s) ?? s;
  }, [types]);

  const visibleTags = useMemo(() => {
    if (!typeSlug) return tags.filter((t) => t.type_slug === null);
    return tags.filter((t) => t.type_slug === null || t.type_slug === typeSlug);
  }, [tags, typeSlug]);

  const filteredByRadius = useMemo(() => {
    if (!center || !radiusKm) return items;
    return items.filter((b) => {
      if (b.lat == null || b.lng == null) return false;
      return haversineKm({ lat: center.lat, lng: center.lng }, { lat: Number(b.lat), lng: Number(b.lng) }) <= radiusKm;
    });
  }, [items, center, radiusKm]);

  const mapBusinesses: GMapBusiness[] = filteredByRadius.map((b) => ({
    id: b.id, slug: b.slug, name: b.name,
    type_slug: b.type_slug, type_label: typeLabel(b.type_slug),
    lat: b.lat ? Number(b.lat) : null, lng: b.lng ? Number(b.lng) : null,
    rating_avg: Number(b.rating_avg), rating_count: b.rating_count,
    city: b.city, featured: b.featured, price_label: b.price_label,
  }));

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Businesses</h1>
            <p className="text-sm text-muted-foreground">Find dealers, mechanics, parts, towing & insurance near you.</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/businesses/submit"><Plus className="mr-1 h-4 w-4" />List your business</Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6 space-y-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search businesses by name…"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setTypeSlug(null); setSelectedTags([]); }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${typeSlug === null ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
            >All types</button>
            {types.map((t) => (
              <button
                key={t.slug}
                onClick={() => { setTypeSlug(t.slug); setSelectedTags([]); }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${typeSlug === t.slug ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
              >{t.label}</button>
            ))}
          </div>

          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((t) => {
                const on = selectedTags.includes(t.slug);
                return (
                  <button
                    key={t.slug}
                    onClick={() =>
                      setSelectedTags((prev) => on ? prev.filter((x) => x !== t.slug) : [...prev, t.slug])
                    }
                    className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-foreground bg-foreground text-background" : "border-border hover:bg-secondary"}`}
                  >{t.label}</button>
                );
              })}
            </div>
          )}

          <LocationDrilldown value={loc} onChange={setLoc} />
        </Card>

        {/* Results + Map */}
        <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {loading ? "Loading…" : `${items.length} business${items.length === 1 ? "" : "es"} found`}
            </div>
            {loading ? (
              <>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</>
            ) : items.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                <StoreIcon className="mx-auto mb-2 h-6 w-6 opacity-50" />
                No businesses match your filters. Try clearing some or{" "}
                <Link to="/businesses/submit" className="text-primary underline">add one</Link>.
              </Card>
            ) : (
              items.map((b) => (
                <Link key={b.id} to="/businesses/$slug" params={{ slug: b.slug }}>
                  <Card className="flex items-start gap-3 p-3 transition hover:border-primary hover:shadow-sm">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {b.logo_url ? <img src={b.logo_url} alt={b.name} className="h-full w-full object-cover" /> : <StoreIcon className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate font-semibold">{b.name}</h3>
                            {b.featured && <Badge variant="default" className="shrink-0">Featured</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">{typeLabel(b.type_slug)}</div>
                        </div>
                        {b.rating_count > 0 && (
                          <div className="flex shrink-0 items-center gap-1 text-xs font-medium">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {Number(b.rating_avg).toFixed(1)} <span className="text-muted-foreground">({b.rating_count})</span>
                          </div>
                        )}
                      </div>
                      {(b.city || b.region) && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {[b.barangay, b.city, b.province].filter(Boolean).join(", ") || b.region}
                        </div>
                      )}
                      {(tagLinks[b.id] ?? []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(tagLinks[b.id] ?? []).slice(0, 4).map((s) => (
                            <Badge key={s} variant="secondary" className="text-[10px]">
                              {tags.find((tg) => tg.slug === s)?.label ?? s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
          <div className="space-y-3 md:sticky md:top-20 md:self-start">
            <Card className="p-3">
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
            <GoogleBusinessMap
              height={520}
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
