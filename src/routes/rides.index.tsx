import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RideCard, type RideCardData } from "@/components/rides/ride-card";

export const Route = createFileRoute("/rides/")({
  head: () => ({
    meta: [
      { title: "Rides — Filipino car & bike builds | 365 MotorSales" },
      { name: "description", content: "Browse Filipino-owned cars, trucks, motorcycles and project builds. Specs, mods, service history — every ride has a story." },
      { property: "og:title", content: "Rides — Filipino car & bike builds" },
      { property: "og:description", content: "Browse Filipino-owned vehicles with full mod and service history." },
      { property: "og:url", content: "https://365motorsales.com/rides" },
    ],
    links: [{ rel: "canonical", href: "https://365motorsales.com/rides" }],
  }),
  component: RidesHubPage,
});

type Row = RideCardData & { user_id: string; profiles?: { full_name: string | null; business_name: string | null } | null };

function RidesHubPage() {
  const [rides, setRides] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"newest" | "popular">("newest");
  const [type, setType] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = (supabase as any)
        .from("rides")
        .select("id,slug,name,year,make,model,cover_photo_url,like_count,is_for_sale,city,user_id,vehicle_type, profiles!rides_user_id_fkey(full_name,business_name)")
        .eq("status", "published");
      if (type !== "all") query = query.eq("vehicle_type", type);
      query = sort === "popular"
        ? query.order("like_count", { ascending: false })
        : query.order("published_at", { ascending: false });
      const { data } = await query.limit(120);
      // foreign-key join naming may vary; do a fallback fetch
      let rows: Row[] = (data ?? []).map((r: any) => ({
        ...r,
        owner_name: r.profiles?.business_name || r.profiles?.full_name || null,
      }));
      if (!rows.length || rows[0].owner_name === undefined) {
        const ids = Array.from(new Set(rows.map((r) => r.user_id)));
        if (ids.length) {
          const { data: profs } = await supabase.from("profiles").select("id,full_name,business_name").in("id", ids);
          const map = new Map((profs ?? []).map((p: any) => [p.id, p.business_name || p.full_name]));
          rows = rows.map((r) => ({ ...r, owner_name: map.get(r.user_id) ?? null }));
        }
      }
      setRides(rows);
      setLoading(false);
    })();
  }, [sort, type]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rides;
    return rides.filter((r) =>
      [r.name, r.make, r.model, String(r.year ?? ""), r.owner_name ?? "", r.city ?? ""]
        .join(" ").toLowerCase().includes(term),
    );
  }, [q, rides]);

  return (
    <SiteLayout>
      <div className="bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Sparkles className="h-4 w-4" /> Community
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Rides</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Cars, trucks, bikes and project builds owned by the 365 MotorSales community. Every ride has photos, specs, mods and full service history.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by make, model, owner, city…"
                className="pl-9"
              />
            </div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All vehicles</option>
              <option value="car">Cars</option>
              <option value="suv">SUVs</option>
              <option value="truck">Trucks</option>
              <option value="van">Vans</option>
              <option value="motorcycle">Motorcycles</option>
              <option value="scooter">Scooters</option>
              <option value="atv">ATV</option>
              <option value="utv">UTV</option>
              <option value="boat">Boats</option>
              <option value="other">Other</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="popular">Most liked</option>
            </select>
            <Button asChild>
              <Link to="/dashboard/rides">Add your ride</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <h2 className="font-display text-xl font-semibold">No rides yet</h2>
            <p className="mt-2 text-muted-foreground">Be the first to share your build with the community.</p>
            <Button asChild className="mt-4"><Link to="/dashboard/rides">Add your ride</Link></Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((r) => <RideCard key={r.id} ride={r} />)}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
