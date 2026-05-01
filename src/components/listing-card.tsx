import { Link } from "@tanstack/react-router";
import { MapPin, Camera, Video, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPHP } from "@/lib/format";

export interface ListingCardData {
  id: string;
  title: string;
  price_php: number;
  region: string | null;
  city: string | null;
  seller_type: "private" | "business";
  boost_until: string | null;
  cover_url?: string | null;
  photo_count?: number;
  has_video?: boolean;
  category_slug: string;
}

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const boosted = listing.boost_until && new Date(listing.boost_until) > new Date();
  return (
    <Link
      to="/listing/$id"
      params={{ id: listing.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {listing.cover_url ? (
          <img
            src={listing.cover_url}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Camera className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          {boosted && (
            <Badge className="bg-accent text-accent-foreground"><Star className="mr-1 h-3 w-3" />Featured</Badge>
          )}
          <Badge variant={listing.seller_type === "business" ? "default" : "secondary"}>
            {listing.seller_type === "business" ? "Business" : "Private"}
          </Badge>
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
          <span className="flex items-center gap-1"><Camera className="h-3 w-3" />{listing.photo_count ?? 0}</span>
          {listing.has_video && <span className="flex items-center gap-1"><Video className="h-3 w-3" />1</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-semibold leading-snug">{listing.title}</h3>
        <div className="mt-2 text-xl font-bold text-primary">{formatPHP(listing.price_php)}</div>
        <div className="mt-auto flex items-center gap-1 pt-3 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{[listing.city, listing.region].filter(Boolean).join(", ") || "Philippines"}</span>
        </div>
      </div>
    </Link>
  );
}
