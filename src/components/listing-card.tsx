import { Link } from "@tanstack/react-router";
import {
  MapPin,
  Camera,
  Video,
  Star,
  Droplets,
  Wrench,
  Send,
  SprayCan,
  Recycle,
  Eye,
  Heart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/verified-badge";
import { DealerSubscriptionBadge } from "@/components/dealer-subscription-badge";
import { ListingPrice } from "@/components/listing-price";
import placeholderCar from "@/assets/placeholder-car.webp";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { ServiceStrip } from "@/components/service-strip";

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
  seller_verified?: boolean;
  seller_dealer_plan?: string | null;
  seller_dealer_period_end?: string | null;
  seller_dealer_cancel_at_period_end?: boolean | null;
  status?: string;
  attributes?: Record<string, any> | null;
  view_count?: number;
  like_count?: number;
}

const CATEGORY_META: Record<string, { label: string; Icon: typeof Droplets }> = {
  carwash: { label: "Car Wash", Icon: Droplets },
  parts: { label: "Parts", Icon: Wrench },
  drone: { label: "Drones", Icon: Send },
  repair: { label: "Repair Shop", Icon: Wrench },
  bodyshop: { label: "Body Shop", Icon: SprayCan },
  salvage: { label: "Salvage", Icon: Recycle },
};

/** Vehicle categories that show service chips */
const VEHICLE_CATEGORIES = new Set(["car", "motorcycle", "boat", "airplane", "equipment"]);

function summarizeAttributes(slug: string, attrs?: Record<string, any> | null): string | null {
  if (!attrs) return null;
  const list = (v: any): string | null => {
    if (!Array.isArray(v) || v.length === 0) return null;
    const head = v.slice(0, 2).join(", ");
    return v.length > 2 ? `${head} +${v.length - 2}` : head;
  };
  // Prefer unified tag list when present (service-type listings).
  if (Array.isArray(attrs.tags) && attrs.tags.length > 0) {
    return list(attrs.tags);
  }
  if (slug === "carwash") {
    const parts = [list(attrs.services), attrs.pricing_tier].filter(Boolean);
    return parts.join(" • ") || null;
  }
  if (slug === "parts") {
    const parts = [attrs.part_type, attrs.part_brand, attrs.oem_aftermarket].filter(Boolean);
    return parts.join(" • ") || null;
  }
  if (slug === "drone") {
    const parts = [list(attrs.droneServices), attrs.business_type].filter(Boolean);
    return parts.join(" • ") || null;
  }
  // Vehicle listings (car/motorcycle/truck/etc.): show a short spec line
  // ending with the engine variant when the seller picked one.
  if (attrs.engine || attrs.transmission || attrs.fuel) {
    const parts = [attrs.transmission, attrs.fuel, attrs.engine].filter(Boolean);
    return parts.join(" • ") || null;
  }
  return null;
}

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const boosted = listing.boost_until && new Date(listing.boost_until) > new Date();
  const catMeta = CATEGORY_META[listing.category_slug];
  const summary = summarizeAttributes(listing.category_slug, listing.attributes);
  const showServices = VEHICLE_CATEGORIES.has(listing.category_slug);
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]">
      <Link to="/listing/$id" params={{ id: listing.id }} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          <ImageWithSkeleton
            src={listing.cover_url || placeholderCar}
            alt={listing.cover_url ? listing.title : "Vehicle photo coming soon"}
            className="transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {boosted && (
              <Badge className="bg-accent text-accent-foreground">
                <Star className="mr-1 h-3 w-3" />
                Featured
              </Badge>
            )}
            {catMeta && (
              <Badge className="bg-primary text-primary-foreground">
                <catMeta.Icon className="mr-1 h-3 w-3" />
                {catMeta.label}
              </Badge>
            )}
            <Badge variant={listing.seller_type === "business" ? "default" : "secondary"}>
              {listing.seller_type === "business" ? "Business" : "Private"}
            </Badge>
            {listing.seller_verified && <VerifiedBadge size="sm" showLabel />}
            {listing.seller_type === "business" && listing.seller_dealer_plan && (
              <DealerSubscriptionBadge
                planName={listing.seller_dealer_plan}
                currentPeriodEnd={listing.seller_dealer_period_end ?? null}
                cancelAtPeriodEnd={Boolean(listing.seller_dealer_cancel_at_period_end)}
                size="sm"
                showRenewal
              />
            )}
            {listing.status === "pending_sale" && (
              <Badge className="bg-warning text-warning-foreground">Pending Sale</Badge>
            )}
          </div>
          <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
            <span className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              {listing.photo_count ?? 0}
            </span>
            {listing.has_video && (
              <span className="flex items-center gap-1">
                <Video className="h-3 w-3" />1
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 font-semibold leading-snug">{listing.title}</h3>
          {summary && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{summary}</p>}
          <ListingPrice pricePhp={listing.price_php} size="md" className="mt-2" />
          <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate">
                {[listing.city, listing.region].filter(Boolean).join(", ") || "Philippines"}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-0.5">
                <Eye className="h-3 w-3" />
                {(listing.view_count ?? 0).toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-0.5">
                <Heart className="h-3 w-3" />
                {(listing.like_count ?? 0).toLocaleString()}
              </span>
            </span>
          </div>
        </div>
      </Link>
      {showServices && (
        <div className="border-t border-border px-4 pb-4 pt-2">
          <ServiceStrip listingId={listing.id} vehicleSummary={listing.title} compact />
        </div>
      )}
    </div>
  );
}
