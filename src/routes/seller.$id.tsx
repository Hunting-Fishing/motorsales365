import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/route-boundaries";
import { useEffect, useState } from "react";
import { MapPin, Building2, User as UserIcon, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/verified-badge";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { RideCard, type RideCardData } from "@/components/rides/ride-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { SellerReputationBadges } from "@/components/seller-reputation-badges";
import { SellerReviews } from "@/components/seller-reviews";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/seller/$id")({
  loader: async ({ params }) => {
    try {
      const { data } = await supabase
        .from("public_profiles")
        .select("full_name,avatar_url,seller_type,business_name,business_city,business_region")
        .eq("id", params.id)
        .maybeSingle();
      return { seo: data ?? null };
    } catch {
      return { seo: null };
    }
  },
  head: ({ params, loaderData }) => {
    const p: any = loaderData?.seo;
    const url = `https://www.365motorsales.com/seller/${params.id}`;
    if (!p) {
      return {
        meta: [
          { title: "Seller — 365 MotorSales Philippines" },
          { property: "og:url", content: url },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const name = p.business_name || p.full_name || "Seller";
    const loc = [p.business_city, p.business_region].filter(Boolean).join(", ");
    const title = `${name}${loc ? ` — ${loc}` : ""} | 365 MotorSales`;
    const desc =
      `Listings from ${name}${loc ? ` in ${loc}` : ""} on 365 MotorSales Philippines.`.slice(
        0,
        155,
      );
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        ...(p.avatar_url
          ? [
              { property: "og:image", content: p.avatar_url },
              { name: "twitter:image", content: p.avatar_url },
            ]
          : []),
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: SellerProfilePage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary message="Seller not found." />,
});

function SellerProfilePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [rides, setRides] = useState<RideCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: p }, { data: ls }, { data: rs }] = await Promise.all([
        supabase.from("public_profiles").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("listings")
          .select(
            "id,title,price_php,region,city,seller_type,boost_until,status,category_slug,view_count,listing_media(url,type)",
          )
          .eq("user_id", id)
          .in("status", ["active", "pending_sale"])
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("rides")
          .select(
            "id,slug,name,year,make,model,cover_photo_url,like_count,is_for_sale,city,vehicle_type",
          )
          .eq("user_id", id)
          .eq("status", "published")
          .order("published_at", { ascending: false }),
      ]);
      setProfile(p);
      const verified = p?.verification_status === "verified";
      const ownerName = p?.business_name || p?.full_name || null;
      setListings(
        (ls ?? []).map((l: any) => {
          const photos = (l.listing_media ?? []).filter((m: any) => m.type === "photo");
          const videos = (l.listing_media ?? []).filter((m: any) => m.type === "video");
          return {
            id: l.id,
            title: l.title,
            price_php: Number(l.price_php),
            region: l.region,
            city: l.city,
            seller_type: l.seller_type,
            boost_until: l.boost_until,
            category_slug: l.category_slug,
            view_count: l.view_count ?? 0,
            cover_url: photos[0]?.url ?? null,
            photo_count: photos.length,
            has_video: videos.length > 0,
            seller_verified: verified,
            status: l.status,
          };
        }),
      );
      setRides(((rs ?? []) as any[]).map((r) => ({ ...r, owner_name: ownerName })));
      setLoading(false);
    };
    load();
  }, [id, reloadKey]);

  if (loading)
    return (
      <SiteLayout>
        <div className="p-12 text-center text-muted-foreground">Loading…</div>
      </SiteLayout>
    );

  if (!profile)
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Seller not found</h1>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">
            Go home
          </Link>
        </div>
      </SiteLayout>
    );

  const isBusiness = profile.seller_type === "business";
  const displayName = isBusiness ? (profile.business_name ?? profile.full_name) : profile.full_name;
  const logoUrl = isBusiness ? profile.business_logo_url : profile.avatar_url;
  const location = [profile.business_city, profile.business_region].filter(Boolean).join(", ");

  return (
    <SiteLayout>
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-secondary text-3xl font-bold">
              {logoUrl ? (
                <img src={logoUrl} alt={displayName ? `${displayName} ${isBusiness ? "logo" : "avatar"}` : "Profile photo"} className="h-full w-full object-cover" />
              ) : isBusiness ? (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              ) : (
                <UserIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-bold">{displayName ?? "Seller"}</h1>
                <Badge variant={isBusiness ? "default" : "secondary"}>
                  {isBusiness ? "Business seller" : "Private seller"}
                </Badge>
                {profile.verification_status === "verified" && (
                  <VerifiedBadge size="md" showLabel />
                )}
              </div>
              {isBusiness && profile.business_address && (
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {profile.business_address}
                  {location && ` · ${location}`}
                </div>
              )}
              {profile.verification_status === "verified" && profile.verified_at && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Verified business since {formatDate(profile.verified_at)}
                </div>
              )}
              <div className="mt-2 text-sm text-muted-foreground">
                {listings.length} active {listings.length === 1 ? "listing" : "listings"}
                {rides.length > 0 && (
                  <>
                    {" "}
                    · {rides.length} {rides.length === 1 ? "ride" : "rides"}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="listings">
          <TabsList>
            <TabsTrigger value="listings">Listings ({listings.length})</TabsTrigger>
            <TabsTrigger value="rides">Rides ({rides.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="listings" className="mt-6">
            {listings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                No active listings.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {listings.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="rides" className="mt-6">
            {rides.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                No published rides yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rides.map((r) => (
                  <RideCard key={r.id} ride={r} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}
