import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles, Check } from "lucide-react";
import type { Competitor } from "@/data/competitors-shop-software";

function fmtUsd(n: number) {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

function priceLabel(p: Competitor["pricing"]): { big: string; sub: string } {
  if (p.unit === "free") return { big: "Free", sub: p.tierName };
  if (p.startingUsd == null) return { big: "Ask", sub: p.tierName };
  const start = fmtUsd(p.startingUsd);
  if (p.topUsd != null && p.topUsd > p.startingUsd) {
    return { big: `${start}–${fmtUsd(p.topUsd)}`, sub: `/${p.unit} · ${p.tierName}` };
  }
  return { big: start, sub: `/${p.unit} · ${p.tierName}` };
}

function vsBadge(p: Competitor["pricing"], is365: boolean): { text: string; className: string } | null {
  if (is365) return null;
  if (p.unit === "free" || (p.startingUsd ?? 0) === 0)
    return { text: "365 matches free core", className: "bg-primary/10 text-primary" };
  if (p.startingUsd == null)
    return { text: "365 core is free", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
  return {
    text: `365 saves $${Math.round(p.startingUsd - 5)}+/mo`,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };
}

export function CompetitorPricingRail({
  competitors,
  title = "Price ranges",
  subtitle,
}: {
  competitors: Competitor[];
  title?: string;
  subtitle?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ active: boolean; startX: number; startScroll: number; moved: boolean }>({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });
  const [isDragging, setIsDragging] = useState(false);
  const scrollBy = (dx: number) => scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore right-click / middle-click
    if (e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    dragState.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragState.current;
    if (!s.active) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 4) s.moved = true;
    el.scrollLeft = s.startScroll - dx;
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragState.current;
    if (!s.active) return;
    s.active = false;
    setIsDragging(false);
    scrollerRef.current?.releasePointerCapture?.(e.pointerId);
  };
  // Prevent the card <a> from navigating when the user was dragging.
  const onCardClickCapture = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.moved = false;
    }
  };

  return (
    <div className="relative">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">Click &amp; drag to scroll →</p>
        </div>
        <div className="hidden gap-1 md:flex">
          <button
            type="button"
            onClick={() => scrollBy(-360)}
            className="grid h-8 w-8 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm transition hover:bg-secondary hover:text-foreground"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(360)}
            className="grid h-8 w-8 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm transition hover:bg-secondary hover:text-foreground"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        {/* fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />

        <div
          ref={scrollerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
          className={`scrollbar-thin flex snap-x gap-3 overflow-x-auto pb-3 pt-1 select-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ scrollPaddingLeft: 4, touchAction: "pan-y" }}
        >

          {competitors.map((c) => {
            const is365 = c.id === "365";
            const { big, sub } = priceLabel(c.pricing);
            const vs = vsBadge(c.pricing, is365);
            const isExternal = c.pricing.link.startsWith("http");
            return (
              <a
                key={c.id}
                href={c.pricing.link}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener" : undefined}
                onClickCapture={onCardClickCapture}
                draggable={false}
                className={`group relative flex w-[240px] shrink-0 snap-start flex-col rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  is365
                    ? "border-primary/40 bg-gradient-to-br from-primary/10 to-emerald-500/5 ring-1 ring-primary/30"
                    : "bg-card hover:border-primary/30"
                }`}
              >
                {is365 && (
                  <span className="absolute -top-2 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow">
                    <Sparkles className="mr-0.5 inline h-2.5 w-2.5" /> You are here
                  </span>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className={`truncate font-semibold ${is365 ? "text-primary" : ""}`}>{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.blurb}</div>
                  </div>
                  {isExternal && (
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  )}
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline gap-1">
                    <span className={`font-display text-2xl font-bold tracking-tight ${is365 ? "text-primary" : ""}`}>
                      {big}
                    </span>
                    <span className="text-xs text-muted-foreground">{sub}</span>
                  </div>
                  {c.pricing.highest && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground">Top tier: {c.pricing.highest}</div>
                  )}
                </div>

                <ul className="mt-3 space-y-1.5">
                  {c.pricing.includes.slice(0, 3).map((it) => (
                    <li key={it} className="flex items-start gap-1.5 text-xs">
                      <Check className={`mt-0.5 h-3 w-3 shrink-0 ${is365 ? "text-primary" : "text-emerald-500"}`} />
                      <span className="text-muted-foreground">{it}</span>
                    </li>
                  ))}
                </ul>

                {vs && (
                  <div className={`mt-auto inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 pt-3 text-[11px] font-medium ${vs.className}`}>
                    <Sparkles className="h-2.5 w-2.5" /> {vs.text}
                  </div>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
