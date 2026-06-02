import { Link } from "@tanstack/react-router";
import { Heart, Camera, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type RideCardData = {
  id: string;
  slug: string;
  name: string;
  year: number | null;
  make: string | null;
  model: string | null;
  cover_photo_url: string | null;
  like_count: number;
  is_for_sale: boolean;
  owner_name?: string | null;
  city?: string | null;
};

export function RideCard({ ride }: { ride: RideCardData }) {
  const subtitle = [ride.year, ride.make, ride.model].filter(Boolean).join(" ");
  return (
    <Link
      to="/rides/$slug"
      params={{ slug: ride.slug }}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] bg-secondary">
        {ride.cover_photo_url ? (
          <img
            src={ride.cover_photo_url}
            alt={ride.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Camera className="h-8 w-8" />
          </div>
        )}
        {ride.is_for_sale && (
          <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground">
            <Tag className="mr-1 h-3 w-3" /> For sale
          </Badge>
        )}
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          <Heart className="h-3 w-3" /> {ride.like_count}
        </div>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 font-display text-base font-semibold">{ride.name}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {(ride.owner_name || ride.city) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {ride.owner_name}
            {ride.owner_name && ride.city ? " · " : ""}
            {ride.city}
          </p>
        )}
      </div>
    </Link>
  );
}
