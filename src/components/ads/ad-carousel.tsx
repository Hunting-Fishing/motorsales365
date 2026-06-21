import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { getActiveAds, trackAdEvent } from "@/lib/ads.functions";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
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
  /** Auto-rotate interval in ms. Defaults to 6000. */
  rotateMs?: number;
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

export function AdCarousel({ placement, limit = 6, className, rotateMs = 6000 }: AdCarouselProps) {
  const { data } = useQuery({
    queryKey: ["ads", placement, limit],
    queryFn: () => getActiveAds({ data: { placement, limit } }),
    staleTime: 5 * 60 * 1000,
  });
  const ads = useMemo(() => data?.ads ?? [], [data]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const trackedRef = useRef<Set<string>>(new Set());
  const visitorId = useMemo(() => getVisitorId(), []);
  const apiRef = useRef<CarouselApi | null>(null);

  const trackImpression = (adId: string) => {
    if (trackedRef.current.has(adId)) return;
    trackedRef.current.add(adId);
    trackAdEvent({
      data: { adId, eventType: "impression", visitorId: visitorId || undefined },
    }).catch(() => {});
  };

  // Track first/visible ad on mount
  useEffect(() => {
    if (!ads.length) return;
    trackImpression(ads[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ads]);

  // Track impressions as the carousel rotates
  const handleApi = (api: CarouselApi) => {
    apiRef.current = api;
    if (!api) return;
    const onSelect = () => {
      const idx = api.selectedScrollSnap();
      setSelectedIndex(idx);
      const ad = ads[idx];
      if (ad) trackImpression(ad.id);
    };
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    setSelectedIndex(api.selectedScrollSnap());
  };

  const autoplay = useRef(
    Autoplay({
      delay: rotateMs,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
    }),
  );

  if (!ads.length) return null;

  const handleClick = (adId: string) => {
    trackAdEvent({ data: { adId, eventType: "click", visitorId: visitorId || undefined } }).catch(
      () => {},
    );
  };

  // Single ad: no need to rotate, render full-bleed.
  if (ads.length === 1) {
    const ad = ads[0];
    return (
      <a
        href={ad.target_url}
        target="_blank"
        rel="sponsored noopener"
        onClick={() => handleClick(ad.id)}
        aria-label={`Sponsored: ${ad.title}${ad.caption ? ` — ${ad.caption}` : ""} (opens in a new tab)`}
        className={`group relative block overflow-hidden rounded-xl border bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className ?? ""}`}
      >
        <ImageWithSkeleton
          src={ad.image_url}
          alt={ad.title}
          draggable={false}
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

  const currentAd: any = ads[selectedIndex];

  return (
    <Carousel
      className={className}
      opts={{ loop: true, align: "start", watchDrag: true }}
      plugins={[autoplay.current]}
      setApi={handleApi}
      aria-label="Sponsored advertisements carousel"
      aria-roledescription="carousel"
    >
      {/* Screen-reader announcement of the active slide */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {currentAd
          ? `Slide ${selectedIndex + 1} of ${ads.length}: ${currentAd.title}`
          : ""}
      </div>
      <CarouselContent>
        {ads.map((ad: any, i: number) => (
          <CarouselItem
            key={ad.id}
            className="basis-full"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${ads.length}: ${ad.title}`}
            aria-hidden={i !== selectedIndex}
          >
            <a
              href={ad.target_url}
              target="_blank"
              rel="sponsored noopener"
              onClick={() => handleClick(ad.id)}
              tabIndex={i === selectedIndex ? 0 : -1}
              aria-label={`Sponsored: ${ad.title}${ad.caption ? ` — ${ad.caption}` : ""} (opens in a new tab)`}
              className="group relative block overflow-hidden rounded-xl border bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ImageWithSkeleton
                src={ad.image_url}
                alt={ad.title}
                draggable={false}
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
      <CarouselPrevious
        aria-label="Previous advertisement"
        className="left-2 z-10 bg-background/80 hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <CarouselNext
        aria-label="Next advertisement"
        className="right-2 z-10 bg-background/80 hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      {/* Pagination dots */}
      <div
        role="tablist"
        aria-label="Select advertisement slide"
        className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-2"
      >
        {ads.map((ad: any, i: number) => {
          const isActive = i === selectedIndex;
          return (
            <button
              key={ad.id}
              type="button"
              role="tab"
              onClick={() => apiRef.current?.scrollTo(i)}
              aria-label={`Go to slide ${i + 1} of ${ads.length}`}
              aria-selected={isActive}
              aria-current={isActive}
              tabIndex={isActive ? 0 : -1}
              className={`h-2 rounded-full shadow transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 ${
                isActive ? "w-6 bg-white" : "w-2 bg-white/60 hover:bg-white/80"
              }`}
            />
          );
        })}
      </div>
    </Carousel>
  );
}
