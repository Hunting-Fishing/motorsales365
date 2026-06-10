import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search,
  Car,
  Bike,
  Ship,
  Plane,
  Truck,
  Caravan,
  ShieldCheck,
  Tag,
  Zap,
  Construction,
  Droplets,
  Wrench,
  Send,
  SprayCan,
  Recycle,
  Wrench as WrenchIcon,
  ShoppingBag,
  Megaphone,
  LifeBuoy,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveDealerStatus } from "@/lib/seller-status.functions";
import { SiteLayout } from "@/components/site-layout";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { LiveActivityFeed } from "@/components/live-activity-feed";
import { AdCarousel } from "@/components/ads/ad-carousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  component: Index,
});

const VEHICLE_CATEGORIES = [
  { slug: "car", name: "Cars", Icon: Car },
  { slug: "motorcycle", name: "Motorcycles", Icon: Bike },
  { slug: "boat", name: "Boats", Icon: Ship },
  { slug: "airplane", name: "Airplanes", Icon: Plane },
  { slug: "equipment", name: "Equipment", Icon: Construction },
  { slug: "drone", name: "Drones", Icon: Send },
  { slug: "other", name: "Other", Icon: Caravan },
] as const;

const SERVICE_CATEGORIES = [
  { slug: "towing", name: "Towing & Transport", Icon: Truck },
  { slug: "repair", name: "Repair Shop", Icon: WrenchIcon },
  { slug: "bodyshop", name: "Body Shop", Icon: SprayCan },
  { slug: "carwash", name: "Car Wash", Icon: Droplets },
  { slug: "parts", name: "Parts & Accessories", Icon: Wrench },
  { slug: "salvage", name: "Auto Salvage", Icon: Recycle },
] as const;

const CATEGORIES = [...VEHICLE_CATEGORIES, ...SERVICE_CATEGORIES];

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
        .select(
          "id,title,price_php,region,city,seller_type,boost_until,status,category_slug,view_count,attributes,user_id,listing_media(url,type),profiles:user_id(verification_status,phone_verified_at),vehicles:vehicle_id(is_public,passport_slug,vehicle_passport_verifications(status))",
        )
        .in("status", ["active", "pending_sale"])
        .gt("boost_until", new Date().toISOString())
        .order("boost_until", { ascending: false })
        .limit(8);

      const { data: recentRows } = await supabase
        .from("listings")
        .select(
          "id,title,price_php,region,city,seller_type,boost_until,status,category_slug,view_count,attributes,user_id,listing_media(url,type),profiles:user_id(verification_status,phone_verified_at),vehicles:vehicle_id(is_public,passport_slug,vehicle_passport_verifications(status))",
        )
        .in("status", ["active", "pending_sale"])
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(12);

      const map = (rows: any[] | null, dealers: Record<string, { planName: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; status: string }>): ListingCardData[] =>
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
            view_count: r.view_count ?? 0,
            cover_url: photos[0]?.url ?? null,
            photo_count: photos.length,
            has_video: videos.length > 0,
            seller_verified: r.profiles?.verification_status === "verified",
            seller_phone_verified: !!r.profiles?.phone_verified_at,
            passport_published: !!(r.vehicles?.is_public && r.vehicles?.passport_slug),
            passport_documents_checked: !!r.vehicles?.vehicle_passport_verifications?.some(
              (v: any) => v.status === "approved",
            ),
            seller_dealer_plan: dealers[r.user_id]?.planName ?? null,
            seller_dealer_period_end: dealers[r.user_id]?.currentPeriodEnd ?? null,
            seller_dealer_cancel_at_period_end: dealers[r.user_id]?.cancelAtPeriodEnd ?? false,
            status: r.status,
            attributes: r.attributes,
          };
        });
      const userIds = Array.from(
        new Set([...(boostedRows ?? []), ...(recentRows ?? [])].map((r: any) => r.user_id).filter(Boolean)),
      );
      let dealers: Record<string, { planName: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; status: string }> = {};
      if (userIds.length > 0) {
        try {
          const res = await getActiveDealerStatus({ data: { userIds } });
          dealers = res.dealers;
        } catch {
          /* ignore */
        }
      }
      setFeatured(map(boostedRows, dealers));
      setRecent(map(recentRows, dealers));
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
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="container relative mx-auto px-4 py-16 md:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/90 px-3 py-1 text-xs font-semibold text-accent-foreground">
              🇵🇭 The Philippines' vehicle marketplace
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-6xl">
              Buy, sell, and service anything that <span className="text-accent">moves</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-white/85">
              Free to post. Free to browse. Find trusted dealers, mechanics, towing, financing and
              insurance — all in one place.
            </p>
          </div>

          {/* 3 primary CTAs */}
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Link
              to="/browse/$category"
              params={{ category: "car" }}
              className="group flex flex-col gap-2 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <ShoppingBag className="h-5 w-5" />
                </span>
                <span className="font-display text-xl font-bold">Buy a vehicle</span>
              </div>
              <p className="text-sm text-white/80">
                Cars, motorcycles, boats, trucks and heavy equipment from verified sellers.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-accent">
                Start browsing{" "}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              to="/sell"
              className="group flex flex-col gap-2 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Megaphone className="h-5 w-5" />
                </span>
                <span className="font-display text-xl font-bold">Sell your vehicle</span>
              </div>
              <p className="text-sm text-white/80">
                Post free in under 2 minutes. Up to 12 photos and 1 video. No listing fee.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-accent">
                Post a free ad{" "}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              to="/businesses"
              className="group flex flex-col gap-2 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <LifeBuoy className="h-5 w-5" />
                </span>
                <span className="font-display text-xl font-bold">Find services</span>
              </div>
              <p className="text-sm text-white/80">
                Repair shops, towing, parts, financing, insurance and inspections near you.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-accent">
                Explore services{" "}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>

          {/* Search */}
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
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
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
            <Button type="submit" size="lg" className="h-12 sm:w-32">
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Category strip — vehicles + services */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shop by category
          </div>
          <div className="flex flex-wrap gap-2">
            {VEHICLE_CATEGORIES.map(({ slug, name, Icon }) => (
              <Link
                key={slug}
                to="/browse/$category"
                params={{ category: slug }}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium transition hover:border-primary hover:text-primary"
              >
                <Icon className="h-4 w-4" />
                {name}
              </Link>
            ))}
            <Link
              to="/wanted"
              className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium transition hover:border-primary hover:text-primary"
            >
              <Megaphone className="h-4 w-4" />
              Wanted
            </Link>
          </div>
          <div className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Services & shops
          </div>
          <div className="flex flex-wrap gap-2">
            {SERVICE_CATEGORIES.map(({ slug, name, Icon }) => (
              <Link
                key={slug}
                to="/browse/$category"
                params={{ category: slug }}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium transition hover:border-primary hover:text-primary"
              >
                <Icon className="h-4 w-4" />
                {name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-border bg-secondary/30">
        <div className="container mx-auto grid gap-6 px-4 py-8 md:grid-cols-3">
          {[
            {
              Icon: ShieldCheck,
              t: "Verified sellers",
              d: "Private and business listings with verification badges and fraud reporting.",
            },
            {
              Icon: Tag,
              t: "100% free to post",
              d: "Up to 12 photos, 1 video, 60-day listings. No card required. Boost when you want more reach.",
            },
            {
              Icon: Zap,
              t: "Nationwide reach",
              d: "From Metro Manila to Mindanao — buyers, lenders, insurers and service partners in every region.",
            },
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

      {/* Sponsored carousel */}
      <section className="container mx-auto px-4 pt-8">
        <AdCarousel placement="home_carousel" />
      </section>

      {/* Live activity feed */}
      <LiveActivityFeed />

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
            {featured.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
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
          <Button asChild variant="outline">
            <Link to="/browse/$category" params={{ category: "car" }}>
              Browse all
            </Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            No listings yet — be the first to{" "}
            <Link to="/sell" className="font-semibold text-primary underline">
              post one
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-10 shadow-[var(--shadow-card)]">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h3 className="font-display text-3xl font-bold">Start free. Upgrade as you grow.</h3>
              <p className="mt-2 text-muted-foreground">
                Private sellers get up to 5 active ads with 12 photos and 1 video each — no card
                required. Change or upgrade your plan anytime as your business grows.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/sell">Post a free ad</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/pricing">See seller plans</Link>
                </Button>
              </div>
            </div>
            <ul className="grid gap-3 text-sm">
              {[
                "Private Seller — Free. 5 active ads, 12 photos, 1 video, 60-day listing.",
                "Verified Seller — ₱149/mo. Verified badge, more listings, priority placement.",
                "Dealer Starter — ₱499/mo. 25 listings, lead inbox, sales-rep tracking.",
                "Dealer Pro — ₱1,499/mo. Unlimited listings, bulk upload, premium support.",
                "Boost any listing from ₱99 — pin to top of search or homepage spotlight.",
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
