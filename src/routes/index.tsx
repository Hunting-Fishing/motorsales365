import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Car, Bike, Ship, Plane, Truck, Caravan, ShieldCheck, Tag, Zap, Construction } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  component: Index,
});

const CATEGORIES = [
  { slug: "car", name: "Cars", Icon: Car },
  { slug: "motorcycle", name: "Motorcycles", Icon: Bike },
  { slug: "boat", name: "Boats", Icon: Ship },
  { slug: "airplane", name: "Airplanes", Icon: Plane },
  { slug: "equipment", name: "Equipment", Icon: Construction },
  { slug: "towing", name: "Towing & Trucking", Icon: Truck },
  { slug: "other", name: "Other", Icon: Caravan },
] as const;

function Index() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>("car");
  const [keyword, setKeyword] = useState("");
  const [featured, setFeatured] = useState<ListingCardData[]>([]);
  const [recent, setRecent] = useState<ListingCardData[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: boostedRows } = await supabase
        .from("listings")
        .select("id,title,price_php,region,city,seller_type,boost_until,status,category_slug,user_id,listing_media(url,type),profiles:user_id(verification_status)")
        .in("status", ["active","pending_sale"])
        .gt("boost_until", new Date().toISOString())
        .order("boost_until", { ascending: false })
        .limit(8);

      const { data: recentRows } = await supabase
        .from("listings")
        .select("id,title,price_php,region,city,seller_type,boost_until,status,category_slug,user_id,listing_media(url,type),profiles:user_id(verification_status)")
        .in("status", ["active","pending_sale"])
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(12);

      const map = (rows: any[] | null): ListingCardData[] =>
        (rows ?? []).map((r) => {
          const photos = (r.listing_media ?? []).filter((m: any) => m.type === "photo");
          const videos = (r.listing_media ?? []).filter((m: any) => m.type === "video");
          return {
            id: r.id,
            title: r.title,
            price_php: Number(r.price_php),
            region: r.region,
            city: r.city,
            seller_type: r.seller_type,
            boost_until: r.boost_until,
            category_slug: r.category_slug,
            cover_url: photos[0]?.url ?? null,
            photo_count: photos.length,
            has_video: videos.length > 0,
            seller_verified: r.profiles?.verification_status === "verified", status: r.status,
          };
        });
      setFeatured(map(boostedRows));
      setRecent(map(recentRows));
    };
    load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      to: "/browse/$category",
      params: { category },
      search: keyword ? { q: keyword } : {},
    });
  };

  return (
    <SiteLayout>
      {/* Hero */}
      <section
        className="relative overflow-hidden text-white"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/90 px-3 py-1 text-xs font-semibold text-accent-foreground">
              🇵🇭 The Philippines' vehicle marketplace
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-6xl">
              Buy and sell anything that <span className="text-accent">moves</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-white/85">
              Cars, motorcycles, boats, airplanes, and heavy equipment — listed by trusted private sellers and businesses across the Philippines. Need it delivered? <Link to="/tow" className="underline underline-offset-2 hover:text-accent">Request a tow</Link>.
            </p>

            <form
              onSubmit={handleSearch}
              className="mt-8 flex flex-col gap-2 rounded-2xl bg-white p-2 text-foreground shadow-2xl sm:flex-row"
            >
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12 sm:w-44 border-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search make, model, or keyword…"
                  className="h-12 border-none pl-9 focus-visible:ring-0"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 sm:w-32">Search</Button>
            </form>

            <div className="mt-8 flex flex-wrap gap-3">
              {CATEGORIES.map(({ slug, name, Icon }) => (
                <Link
                  key={slug}
                  to="/browse/$category"
                  params={{ category: slug }}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-white/20"
                >
                  <Icon className="h-4 w-4" />{name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-border bg-secondary/30">
        <div className="container mx-auto grid gap-6 px-4 py-8 md:grid-cols-3">
          {[
            { Icon: ShieldCheck, t: "Trusted listings", d: "Private and business sellers, with badges and reports." },
            { Icon: Tag, t: "Fair pricing", d: "Standard ₱20 listings. Boost or upgrade only when you want to." },
            { Icon: Zap, t: "Reach the whole country", d: "From Metro Manila to Mindanao — buyers find your ad." },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{t}</div>
                <div className="text-sm text-muted-foreground">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold md:text-3xl">Featured listings</h2>
              <p className="text-muted-foreground">Boosted by sellers across the Philippines.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </section>
      )}

      {/* Recent */}
      <section className="container mx-auto px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Latest listings</h2>
            <p className="text-muted-foreground">Fresh on the marketplace.</p>
          </div>
          <Button asChild variant="outline"><Link to="/browse/$category" params={{ category: "car" }}>Browse all</Link></Button>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            No listings yet — be the first to <Link to="/sell" className="font-semibold text-primary underline">post one</Link>.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-10 shadow-[var(--shadow-card)]">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h3 className="font-display text-3xl font-bold">Selling? It only takes a minute.</h3>
              <p className="mt-2 text-muted-foreground">Up to 5 photos and 1 video for ₱20 per listing. Upgrade for more, or boost to top of search.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg"><Link to="/sell">Post a listing</Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/pricing">See pricing</Link></Button>
              </div>
            </div>
            <ul className="grid gap-3 text-sm">
              {[
                "Standard listing — ₱20, up to 5 photos and 1 video",
                "Upgraded listing — up to 20 photos and 3 videos",
                "Boost — pin to the top of search and renew the ad",
                "Subscriptions for businesses with multiple vehicles",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
