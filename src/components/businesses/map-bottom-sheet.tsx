import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { ChevronUp } from "lucide-react";

type Snap = "peek" | "half" | "full";

const PEEK_PX = 96;

function snapsForViewport(): Record<Snap, number> {
  if (typeof window === "undefined") return { peek: 96, half: 360, full: 600 };
  const h = window.innerHeight;
  return {
    peek: PEEK_PX,
    half: Math.round(h * 0.5),
    full: Math.round(h * 0.85),
  };
}

/**
 * Mobile-only draggable bottom sheet.
 * Three snap points: peek (header only), half (~50dvh), full (~85dvh).
 * Renders nothing on lg+ — parent should hide it via `lg:hidden`.
 */
export type MapBottomSheetHandle = {
  scrollToTop: () => void;
  scrollToSlug: (slug: string) => void;
  expand: () => void;
};

export const MapBottomSheet = forwardRef<MapBottomSheetHandle, { header: ReactNode; children: ReactNode }>(function MapBottomSheet({ header, children }, ref) {
  const [snap, setSnap] = useState<Snap>("peek");
  const [height, setHeight] = useState(PEEK_PX);
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Sync height when snap changes (and on resize)
  useEffect(() => {
    const sync = () => setHeight(snapsForViewport()[snap]);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [snap]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = height;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const delta = dragStartY.current - e.clientY; // drag up → positive
    const vh = window.innerHeight;
    const next = Math.max(PEEK_PX, Math.min(vh * 0.9, dragStartHeight.current + delta));
    setHeight(next);
  };

  const settle = () => {
    if (!dragging) return;
    setDragging(false);
    const snaps = snapsForViewport();
    const choices: Snap[] = ["peek", "half", "full"];
    let best: Snap = "peek";
    let bestDiff = Infinity;
    for (const s of choices) {
      const d = Math.abs(snaps[s] - height);
      if (d < bestDiff) {
        bestDiff = d;
        best = s;
      }
    }
    setSnap(best);
    setHeight(snaps[best]);
  };

  const cycleSnap = () => {
    setSnap((s) => (s === "peek" ? "half" : s === "half" ? "full" : "peek"));
  };

  const expandToHalf = () => {
    const snaps = snapsForViewport();
    setSnap((s) => (s === "peek" ? "half" : s));
    setHeight((h) => (h < snaps.half ? snaps.half : h));
  };

  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    },
    expand: expandToHalf,
    scrollToSlug: (slug: string) => {
      expandToHalf();
      // Wait for the snap transition before scrolling.
      window.setTimeout(() => {
        const root = scrollRef.current;
        if (!root) return;
        const el = root.querySelector<HTMLElement>(`[data-slug="${CSS.escape(slug)}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 240);
    },
  }));

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl lg:hidden"
      style={{
        height,
        transition: dragging ? "none" : "height 220ms cubic-bezier(0.32, 0.72, 0, 1)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Drag handle area — full-width tap target */}
      <button
        type="button"
        aria-label={`Result list — ${snap}. Tap to cycle, drag to resize.`}
        onClick={cycleSnap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        className="flex h-7 shrink-0 items-center justify-center touch-none select-none"
      >
        <span className="h-1.5 w-12 rounded-full bg-muted-foreground/40" />
      </button>

      {/* Sticky header (results count etc) */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 pb-2 pt-1 text-sm">
        <div className="min-w-0 flex-1">{header}</div>
        <ChevronUp
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
            snap === "full" ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-2"
      >
        {children}
      </div>
    </div>
  );
});
