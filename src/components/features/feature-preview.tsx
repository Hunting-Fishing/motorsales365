import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

/**
 * Live in-page preview of a route via a scaled, non-interactive iframe.
 * Loads only when it first scrolls into view; shows a spinner then fades in.
 */
export function FeaturePreview({ route, label }: { route: string; label: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!wrapRef.current || shouldLoad) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(wrapRef.current);
    return () => io.disconnect();
  }, [shouldLoad]);

  return (
    <div
      ref={wrapRef}
      className="group/preview relative aspect-[16/10] w-full overflow-hidden rounded-xl border bg-gradient-to-br from-secondary/50 via-background to-secondary/30 shadow-sm ring-1 ring-black/5"
    >
      {/* Skeleton / loader */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary/60 to-secondary/20">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs">Loading live preview…</span>
          </div>
        </div>
      )}

      {shouldLoad && (
        <div
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{
            width: "1440px",
            height: "900px",
            transform: "scale(0.42)",
          }}
        >
          <iframe
            src={route}
            title={`${label} preview`}
            loading="lazy"
            aria-hidden="true"
            tabIndex={-1}
            onLoad={() => setLoaded(true)}
            className={`h-[900px] w-[1440px] border-0 bg-background transition-opacity duration-500 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>
      )}

      {/* Interactive shield + hover overlay */}
      <a
        href={route}
        target="_blank"
        rel="noopener"
        className="absolute inset-0 flex items-end justify-end p-3 opacity-0 transition-opacity duration-200 group-hover/preview:opacity-100"
        aria-label={`Open ${label} in a new tab`}
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-xs font-medium shadow ring-1 ring-border backdrop-blur">
          <ExternalLink className="h-3 w-3" /> Open page
        </span>
      </a>

      {/* Corner label */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur">
        Live preview · {route}
      </div>

      {/* Bottom gradient for readability */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/60 to-transparent" />
    </div>
  );
}
