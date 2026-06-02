import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { getActiveAds, trackAdEvent } from "@/lib/ads.functions";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type Placement =
  | "home_carousel"
  | "browse_top"
  | "rides_top"
  | "listing_sidebar"
  | "export_top"
  | "shop_top"
  | "shop_sidebar";

interface AdCarouselProps {
  placement: Placement;
  limit?: number;
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

export function AdCarousel({ placement, limit = 6, className }: AdCarouselProps) {
  const { data } = useQuery({
    queryKey: ["ads", placement, limit],
    queryFn: () => getActiveAds({ data: { placement, limit } }),
    staleTime: 5 * 60 * 1000,
  });
  const ads = data?.ads ?? [];
  const trackedRef = useRef<Set<string>>(new Set());
  const visitorId = useMemo(() => getVisitorId(), []);

  useEffect(() => {
    if (!ads.length) return;
    ads.forEach((ad: any) => {
      if (trackedRef.current.has(ad.id)) return;
      trackedRef.current.add(ad.id);
      trackAdEvent({
        data: { adId: ad.id, eventType: "impression", visitorId: visitorId || undefined },
      }).catch(() => {});
    });
  }, [ads, visitorId]);

  if (!ads.length) return null;

  const handleClick = (adId: string) => {
    trackAdEvent({ data: { adId, eventType: "click", visitorId: visitorId || undefined } }).catch(
      () => {},
    );
  };

  if (ads.length === 1) {
    const ad = ads[0];
    return (
      <a
        href={ad.target_url}
        target="_blank"
        rel="sponsored noopener"
        onClick={() => handleClick(ad.id)}
        className={`group relative block overflow-hidden rounded-xl border bg-card ${className ?? ""}`}
      >
        <ImageWithSkeleton
          src={ad.image_url}
          alt={ad.title}
          className="aspect-[21/9] w-full object-cover transition-transform group-hover:scale-[1.02]"
        />
        <Badge variant="secondary" className="absolute right-3 top-3 backdrop-blur">
          Sponsored
        </Badge>
        {(ad.caption || ad.title) && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="font-semibold text-white">{ad.title}</p>
            {ad.caption && <p className="text-sm text-white/80">{ad.caption}</p>}
          </div>
        )}
      </a>
    );
  }

  return (
    <Carousel className={className} opts={{ loop: true, align: "start" }}>
      <CarouselContent>
        {ads.map((ad: any) => (
          <CarouselItem key={ad.id} className="md:basis-1/2 lg:basis-1/2">
            <a
              href={ad.target_url}
              target="_blank"
              rel="sponsored noopener"
              onClick={() => handleClick(ad.id)}
              className="group relative block overflow-hidden rounded-xl border bg-card"
            >
              <ImageWithSkeleton
                src={ad.image_url}
                alt={ad.title}
                className="aspect-[21/9] w-full object-cover transition-transform group-hover:scale-[1.02]"
              />
              <Badge variant="secondary" className="absolute right-3 top-3 backdrop-blur">
                Sponsored
              </Badge>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <p className="font-semibold text-white">{ad.title}</p>
                {ad.caption && <p className="text-sm text-white/80">{ad.caption}</p>}
              </div>
            </a>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2" />
      <CarouselNext className="right-2" />
    </Carousel>
  );
}
