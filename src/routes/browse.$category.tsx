import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, BookmarkPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PH_REGIONS } from "@/lib/format";

const searchSchema = z.object({
  q: z.string().optional(),
  region: z.string().optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  sort: z.enum(["recent", "price_asc", "price_desc"]).optional(),
});

const CATEGORY_LABEL: Record<string, string> = {
  car: "Cars", motorcycle: "Motorcycles", boat: "Boats",
  airplane: "Airplanes", equipment: "Heavy Equipment", other: "Other Transport",
};

export const Route = createFileRoute("/browse/$category")({
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [
      { title: `${CATEGORY_LABEL[params.category] ?? "Listings"} for sale — AutoTrader Philippines` },
      { name: "description", content: `Browse ${CATEGORY_LABEL[params.category] ?? "vehicles"} for sale across the Philippines.` },
    ],
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const { category } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user } = useAuth();

  const [keyword, setKeyword] = useState(search.q ?? "");
  const [region, setRegion] = useState(search.region ?? "all");
  const [minPrice, setMinPrice] = useState(search.min?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(search.max?.toString() ?? "");
  const [sort, setSort] = useState(search.sort ?? "recent");
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      let q = supabase
        .from("listings")
        .select("id,title,price_php,region,city,seller_type,boost_until,status,category_slug,user_id,listing_media(url,type),profiles:user_id(verification_status)")
        .in("status", ["active","pending_sale"])
        .eq("category_slug", category);

      if (search.q) q = q.ilike("title", `%${search.q}%`);
      if (search.region && search.region !== "all") q = q.eq("region", search.region);
      if (search.min) q = q.gte("price_php", search.min);
      if (search.max) q = q.lte("price_php", search.max);

      if (search.sort === "price_asc") q = q.order("price_php", { ascending: true });
      else if (search.sort === "price_desc") q = q.order("price_php", { ascending: false });
      else q = q.order("boost_until", { ascending: false, nullsFirst: false }).order("published_at", { ascending: false, nullsFirst: false });

      const { data } = await q.limit(60);
      const mapped = (data ?? []).map((r: any) => {
        const photos = (r.listing_media ?? []).filter((m: any) => m.type === "photo");
        const videos = (r.listing_media ?? []).filter((m: any) => m.type === "video");
        return {
          id: r.id, title: r.title, price_php: Number(r.price_php),
          region: r.region, city: r.city, seller_type: r.seller_type,
          boost_until: r.boost_until, category_slug: r.category_slug,
          cover_url: photos[0]?.url ?? null,
          photo_count: photos.length, has_video: videos.length > 0,
          seller_verified: r.profiles?.verification_status === "verified", status: r.status,
        } as ListingCardData;
      });
      setItems(mapped);
      setLoading(false);
    };
    fetchListings();
  }, [category, search.q, search.region, search.min, search.max, search.sort]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      to: "/browse/$category",
      params: { category },
      search: {
        q: keyword || undefined,
        region: region !== "all" ? region : undefined,
        min: minPrice ? Number(minPrice) : undefined,
        max: maxPrice ? Number(maxPrice) : undefined,
        sort,
      },
    });
  };

  const saveCurrentSearch = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    const name = window.prompt("Name this saved search", `${CATEGORY_LABEL[category] ?? category}${keyword ? ` — ${keyword}` : ""}`);
    if (!name) return;
    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      name,
      category_slug: category,
      query: {
        q: keyword || null,
        region: region !== "all" ? region : null,
        min: minPrice ? Number(minPrice) : null,
        max: maxPrice ? Number(maxPrice) : null,
        sort,
      },
    });
    if (error) toast.error(error.message);
    else toast.success("Search saved. Find it in your dashboard.");
  };

  return (
    <SiteLayout>
      <div className="border-b border-border bg-secondary/40">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link> <span>/</span>
            <span>Browse</span> <span>/</span>
            <span className="text-foreground">{CATEGORY_LABEL[category] ?? category}</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{CATEGORY_LABEL[category] ?? "Listings"} for sale</h1>
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <aside className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-20 lg:self-start">
          <h2 className="font-display text-lg font-semibold">Filters</h2>
          <form onSubmit={applyFilters} className="space-y-4">
            <div>
              <Label htmlFor="kw">Keyword</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="kw" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Make, model…" className="pl-8" />
              </div>
            </div>
            <div>
              <Label>Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {PH_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Min ₱</Label>
                <Input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              </div>
              <div>
                <Label>Max ₱</Label>
                <Input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Sort</Label>
              <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="price_asc">Price (low to high)</SelectItem>
                  <SelectItem value="price_desc">Price (high to low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Apply filters</Button>
            <Button type="button" variant="outline" className="w-full" onClick={saveCurrentSearch}>
              <BookmarkPlus className="mr-2 h-4 w-4" />Save search
            </Button>
          </form>
        </aside>

        {/* Results */}
        <div>
          <div className="mb-4 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${items.length} result${items.length === 1 ? "" : "s"}`}
          </div>
          {!loading && items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              No listings match your filters yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
