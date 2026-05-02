import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Building2, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/verified-badge";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/seller/$id")({
  component: SellerProfilePage,
});

function SellerProfilePage() {
  const { id } = Route.useParams();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: p }, { data: ls }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("listings")
          .select(
            "id,title,price_php,region,city,seller_type,boost_until,status,category_slug,listing_media(url,type)",
          )
          .eq("user_id", id)
          .in("status", ["active","pending_sale"])
          .order("created_at", { ascending: false }),
      ]);
      setProfile(p);
      const verified = p?.verification_status === "verified";
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
            cover_url: photos[0]?.url ?? null,
            photo_count: photos.length,
            has_video: videos.length > 0,
            seller_verified: verified,
          };
        }),
      );
      setLoading(false);
    };
    load();
  }, [id]);

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
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">Go home</Link>
        </div>
      </SiteLayout>
    );

  const isBusiness = profile.seller_type === "business";
  const displayName = isBusiness ? profile.business_name ?? profile.full_name : profile.full_name;
  const logoUrl = isBusiness ? profile.business_logo_url : profile.avatar_url;
  const location = [profile.business_city, profile.business_region].filter(Boolean).join(", ");

  return (
    <SiteLayout>
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-secondary text-3xl font-bold">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
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
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h2 className="mb-4 font-display text-xl font-semibold">Listings from this seller</h2>
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
      </div>
    </SiteLayout>
  );
}
