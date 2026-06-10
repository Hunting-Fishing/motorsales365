import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("favorites")
      .select(
        "listing_id, listings:listing_id(id,title,price_php,price_kind,negotiable,price_hidden,registration_status,region,city,seller_type,boost_until,status,category_slug,user_id,view_count,attributes,listing_media(url,type),profiles:user_id(verification_status,phone_verified_at),vehicles:vehicle_id(is_public,passport_slug,vehicle_passport_verifications(status)))",
      )
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        const mapped = (data ?? [])
          .map((row: any) => {
            const r = row.listings;
            if (!r) return null;
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
              attributes: r.attributes,
              status: r.status,
            } as ListingCardData;
          })
          .filter(Boolean) as ListingCardData[];
        setItems(mapped);
        setLoading(false);
      });
  }, [user]);

  const removeFavorite = async (listingId: string) => {
    if (!user) return;
    setRemoving(listingId);
    const prev = items;
    setItems((curr) => curr.filter((i) => i.id !== listingId));
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    setRemoving(null);
    if (error) {
      setItems(prev);
      toast.error(error.message);
      return;
    }
    toast.success("Removed from saved");
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Saved listings</h1>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          No saved listings yet. Tap the bookmark on any ad to save it here.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((l) => (
            <div key={l.id} className="relative group">
              <ListingCard listing={l} />
              <Button
                size="sm"
                variant="secondary"
                className="absolute right-2 top-2 z-10 h-8 gap-1 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeFavorite(l.id);
                }}
                disabled={removing === l.id}
              >
                <Bookmark className="h-3.5 w-3.5 fill-current" />
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
