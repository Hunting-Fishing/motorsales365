import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  wrapperClassName?: string;
  skeletonClassName?: string;
  /** If true, image loads immediately. Otherwise it preloads when within rootMargin of the viewport. */
  eager?: boolean;
  /** How far outside the viewport to start preloading. Defaults to 400px. */
  rootMargin?: string;
}

export function ImageWithSkeleton({
  src,
  alt,
  className,
  wrapperClassName,
  skeletonClassName,
  eager = false,
  rootMargin = "400px",
  onLoad,
  onError,
  ...rest
}: ImageWithSkeletonProps) {
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
