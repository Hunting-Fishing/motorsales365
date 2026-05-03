import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  wrapperClassName?: string;
  skeletonClassName?: string;
}

export function ImageWithSkeleton({
  src,
  alt,
  className,
  wrapperClassName,
  skeletonClassName,
  onLoad,
  onError,
  ...rest
}: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cn("relative h-full w-full", wrapperClassName)}>
      {!loaded && (
        <Skeleton className={cn("absolute inset-0 h-full w-full rounded-none", skeletonClassName)} />
      )}
      <img
        {...rest}
        src={src}
        alt={alt}
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
    </div>
  );
}
