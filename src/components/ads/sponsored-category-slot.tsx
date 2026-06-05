import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { Crown } from "lucide-react";
import { getCategorySponsor, trackAdEvent } from "@/lib/ads.functions";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { Badge } from "@/components/ui/badge";

interface SponsoredCategorySlotProps {
  categorySlug: string;
  className?: string;
}

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  const k = "ads_visitor_id";
  let v = localStorage.getItem(k);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(k, v);
  }
  return v;
}

/**
 * Premium, single-sponsor banner pinned above a browse category.
 * One advertiser per category at a time — bigger and more prominent than
 * the regular AdCarousel placement. Renders nothing if no sponsor exists.
 */
export function SponsoredCategorySlot({ categorySlug, className }: SponsoredCategorySlotProps) {
  const { data } = useQuery({
    queryKey: ["category-sponsor", categorySlug],
    queryFn: () => getCategorySponsor({ data: { categorySlug } }),
    staleTime: 5 * 60 * 1000,
  });
  const ad = data?.ad;
  const visitorId = useMemo(() => getVisitorId(), []);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!ad || trackedRef.current) return;
    trackedRef.current = true;
    trackAdEvent({
      data: { adId: ad.id, eventType: "impression", visitorId: visitorId || undefined },
    }).catch(() => {});
  }, [ad, visitorId]);

  if (!ad) return null;

  const handleClick = () => {
    trackAdEvent({
      data: { adId: ad.id, eventType: "click", visitorId: visitorId || undefined },
    }).catch(() => {});
  };

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Crown className="h-3.5 w-3.5 text-primary" />
        <span>Exclusive Category Sponsor</span>
      </div>
      <a
        href={ad.target_url}
        target="_blank"
        rel="sponsored noopener"
        onClick={handleClick}
        className="group relative block overflow-hidden rounded-2xl border-2 border-primary/30 bg-card shadow-lg ring-1 ring-primary/10 transition-all hover:shadow-xl hover:ring-primary/20"
      >
        <div className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary" />
        <ImageWithSkeleton
          src={ad.image_url}
          alt={ad.title}
          className="aspect-[21/7] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <Badge className="absolute right-3 top-3 bg-primary text-primary-foreground shadow-md">
          Sponsor
        </Badge>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5">
          <p className="text-lg font-bold text-white drop-shadow-md">{ad.title}</p>
          {ad.caption && (
            <p className="mt-1 text-sm text-white/90 drop-shadow-sm">{ad.caption}</p>
          )}
        </div>
      </a>
    </div>
  );
}
