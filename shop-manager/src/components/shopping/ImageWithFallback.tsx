import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Package, AlertTriangle } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  showPlaceholder?: boolean;
  className?: string;
  onError?: () => void;
  onLoad?: () => void;
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallbackSrc,
  showPlaceholder = true,
  className,
  onError,
  onLoad,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback(() => {
    console.warn(`Image failed to load: ${currentSrc}`);
    
    if (retryCount < 2) {
      // Retry with cache busting
      const timestamp = Date.now();
      const separator = currentSrc.includes('?') ? '&' : '?';
      const retrySrc = `${currentSrc}${separator}retry=${timestamp}`;
      setCurrentSrc(retrySrc);
      setRetryCount(prev => prev + 1);
      return;
    }

    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setRetryCount(0);
      return;
    }

    setHasError(true);
    setIsLoading(false);
    onError?.();
  }, [currentSrc, fallbackSrc, onError, retryCount]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  // Reset state when src changes
  React.useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setIsLoading(true);
    setRetryCount(0);
  }, [src]);

  if (hasError && showPlaceholder) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted border border-border rounded",
          className
        )}
        {...props}
      >
        <div className="flex flex-col items-center justify-center p-4 text-muted-foreground">
          <Package className="h-8 w-8 mb-2" />
          <span className="text-xs text-center">Image not available</span>
        </div>
      </div>
    );
  }

  if (hasError && !showPlaceholder) {
    return null;
  }

  return (
    <>
      {isLoading && (
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-muted animate-pulse",
            className
          )}
        >
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
    </>
  );
};

export default ImageWithFallback;