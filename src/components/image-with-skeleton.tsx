import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { usePerfSettings } from "@/hooks/use-perf-settings";
import { withImageTransform } from "@/lib/perf-settings";

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  wrapperClassName?: string;
  skeletonClassName?: string;
  /** If true, image loads immediately. Otherwise it preloads when within rootMargin of the viewport. */
  eager?: boolean;
  /** How far outside the viewport to start preloading. Overrides admin setting. */
  rootMargin?: string;
  /** Use full-size resolution rather than thumbnail. Defaults to false. */
  full?: boolean;
}

export function ImageWithSkeleton({
  src,
  alt,
  className,
  wrapperClassName,
  skeletonClassName,
  eager = false,
  rootMargin,
  full = false,
  onLoad,
  onError,
  ...rest
}: ImageWithSkeletonProps) {
  const perf = usePerfSettings();
  const effectiveRootMargin = rootMargin ?? perf.rootMargin;
  const targetWidth = full ? perf.fullWidth : perf.thumbWidth;
  const transformedSrc = withImageTransform(src, targetWidth, perf.quality);
  const [loaded, setLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(eager);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (eager || shouldLoad) return;
    const el = wrapperRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, shouldLoad, rootMargin]);

  return (
    <div ref={wrapperRef} className={cn("relative h-full w-full", wrapperClassName)}>
      {!loaded && (
        <Skeleton className={cn("absolute inset-0 h-full w-full rounded-none", skeletonClassName)} />
      )}
      {shouldLoad && (
        <img
          {...rest}
          src={src}
          alt={alt}
          decoding="async"
          loading={eager ? "eager" : "lazy"}
          onLoad={(e) => {
            setLoaded(true);
            onLoad?.(e);
          }}
          onError={(e) => {
            setLoaded(true);
            onError?.(e);
          }}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            className,
          )}
        />
      )}
    </div>
  );
}
