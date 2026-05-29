import { cn } from "@/lib/utils";

export type Annotation = {
  /** Numbered badge label (e.g. "1", "2") */
  n: number | string;
  /** Position in % of image width (0–100) */
  x: number;
  /** Position in % of image height (0–100) */
  y: number;
  /** Optional short callout text rendered next to the badge */
  label?: string;
  /** Optional explicit side for label placement */
  side?: "right" | "left" | "top" | "bottom";
};

export function AnnotatedScreenshot({
  src,
  alt,
  annotations = [],
  caption,
  className,
}: {
  src: string;
  alt: string;
  annotations?: Annotation[];
  caption?: string;
  className?: string;
}) {
  return (
    <figure className={cn("my-6", className)}>
      <div className="relative overflow-hidden rounded-xl border border-border bg-muted shadow-md">
        <img src={src} alt={alt} loading="lazy" className="block w-full h-auto" />
        {annotations.map((a, i) => {
          const side = a.side ?? "right";
          return (
            <div
              key={i}
              className="pointer-events-none absolute z-10 flex items-center gap-1.5"
              style={{
                left: `${a.x}%`,
                top: `${a.y}%`,
                transform:
                  side === "left"
                    ? "translate(-100%, -50%)"
                    : side === "top"
                      ? "translate(-50%, -100%)"
                      : side === "bottom"
                        ? "translate(-50%, 0)"
                        : "translate(0, -50%)",
              }}
            >
              {side === "left" && a.label && (
                <span className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-md">
                  {a.label}
                </span>
              )}
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary text-[12px] font-bold text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.25)] ring-2 ring-primary/30">
                {a.n}
              </span>
              {side !== "left" && a.label && (
                <span className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-md">
                  {a.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
