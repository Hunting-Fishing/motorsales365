import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ListingCard, type ListingCardData } from "@/components/listing-card";

export const Route = createFileRoute("/dashboard/likes")({
  component: LikedPage,
});

function LikedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("listing_likes")
      .select(
        "listing_id, listings:listing_id(id,title,price_php,region,city,seller_type,boost_until,status,category_slug,user_id,view_count,listing_media(url,type),profiles:user_id(verification_status))",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
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
              cover_url: photos[0]?.url ?? null,
              photo_count: photos.length,
              has_video: videos.length > 0,
              seller_verified: r.profiles?.verification_status === "verified",
              status: r.status,
              view_count: r.view_count ?? 0,
            } as ListingCardData;
          })
          .filter(Boolean) as ListingCardData[];
        setItems(mapped);
        setLoading(false);
      });
  }, [user]);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Liked listings</h1>
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          You haven't liked any listings yet. Tap the heart on any ad to keep it here.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
