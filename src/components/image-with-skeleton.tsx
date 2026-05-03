import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { usePerfSettings } from "@/hooks/use-perf-settings";
import { withImageTransform } from "@/lib/perf-settings";
import { recordImageEvent } from "@/lib/image-metrics";

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  wrapperClassName?: string;
  skeletonClassName?: string;
  eager?: boolean;
  rootMargin?: string;
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
  const startedAtRef = useRef<number | null>(null);
  const loadedRef = useRef(false);
  const visibleReportedRef = useRef(false);

  // Mark "request started" when we decide to load.
  useEffect(() => {
    if (shouldLoad && startedAtRef.current === null) {
      startedAtRef.current = performance.now();
    }
  }, [shouldLoad]);

  // Preload observer (off-viewport, by rootMargin)
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
      { rootMargin: effectiveRootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, shouldLoad, effectiveRootMargin]);

  // Visibility observer (rootMargin: 0px) — used to record preload hit rate.
  useEffect(() => {
    if (eager || visibleReportedRef.current) return;
    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !visibleReportedRef.current) {
            visibleReportedRef.current = true;
            recordImageEvent({
              type: "visible",
              loadedBeforeVisible: loadedRef.current,
              full,
              rootMargin: effectiveRootMargin,
              quality: perf.quality,
              width: targetWidth,
            });
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, effectiveRootMargin, full, perf.quality, targetWidth]);

  return (
    <div ref={wrapperRef} className={cn("relative h-full w-full", wrapperClassName)}>
      {!loaded && (
        <Skeleton className={cn("absolute inset-0 h-full w-full rounded-none", skeletonClassName)} />
      )}
      {shouldLoad && (
        <img
          {...rest}
          src={transformedSrc}
          alt={alt}
          decoding="async"
          loading={eager ? "eager" : "lazy"}
          onLoad={(e) => {
            setLoaded(true);
            loadedRef.current = true;
            const start = startedAtRef.current;
            recordImageEvent({
              type: "load",
              durationMs: start != null ? Math.round(performance.now() - start) : undefined,
              full,
              rootMargin: effectiveRootMargin,
              quality: perf.quality,
              width: targetWidth,
            });
            onLoad?.(e);
          }}
          onError={(e) => {
            setLoaded(true);
            recordImageEvent({
              type: "error",
              full,
              rootMargin: effectiveRootMargin,
              quality: perf.quality,
              width: targetWidth,
            });
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
