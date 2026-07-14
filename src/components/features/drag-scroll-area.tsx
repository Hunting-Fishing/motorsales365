import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Wraps a horizontally-overflowing block and adds:
 *  - click-and-drag scrolling (desktop pointer)
 *  - touch-swipe scrolling (native, via touch-action pan-x)
 *  - a floating always-visible scrollbar indicator at the bottom of the viewport
 *    that mirrors the inner scroll position and stays reachable even when
 *    the table is taller than the screen.
 */
export function DragScrollArea({
  children,
  className = "",
  ariaLabel = "Scrollable content",
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const floatInnerRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const syncing = useRef<"none" | "main" | "float">("none");
  const [isDragging, setIsDragging] = useState(false);
  const [showFloat, setShowFloat] = useState(false);
  const [overflow, setOverflow] = useState(false);

  // Sync widths + overflow visibility.
  useEffect(() => {
    const el = scrollerRef.current;
    const inner = floatInnerRef.current;
    if (!el || !inner) return;
    const update = () => {
      const scrollW = el.scrollWidth;
      const clientW = el.clientWidth;
      inner.style.width = `${scrollW}px`;
      setOverflow(scrollW > clientW + 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild as Element);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Show/hide the floating bar based on whether the table is on screen.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setShowFloat(entry.isIntersecting && entry.intersectionRatio > 0.05),
      { threshold: [0, 0.05, 0.3, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Two-way scroll sync between the real scroller and the floating proxy.
  const onMainScroll = () => {
    if (syncing.current === "float") { syncing.current = "none"; return; }
    const el = scrollerRef.current;
    const f = floatRef.current;
    if (!el || !f) return;
    syncing.current = "main";
    f.scrollLeft = el.scrollLeft;
  };
  const onFloatScroll = () => {
    if (syncing.current === "main") { syncing.current = "none"; return; }
    const el = scrollerRef.current;
    const f = floatRef.current;
    if (!el || !f) return;
    syncing.current = "float";
    el.scrollLeft = f.scrollLeft;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only left-mouse; let touch use native pan-x for smoother scrolling.
    if (e.pointerType !== "mouse") return;
    if (e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = drag.current;
    if (!s.active) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 4) s.moved = true;
    el.scrollLeft = s.startScroll - dx;
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = drag.current;
    if (!s.active) return;
    s.active = false;
    setIsDragging(false);
    scrollerRef.current?.releasePointerCapture?.(e.pointerId);
    // Suppress a click that follows a real drag.
    if (s.moved) {
      const stop = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        window.removeEventListener("click", stop, true);
      };
      window.addEventListener("click", stop, true);
      setTimeout(() => window.removeEventListener("click", stop, true), 50);
    }
  };

  return (
    <>
      <div
        ref={scrollerRef}
        role="region"
        aria-label={ariaLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onScroll={onMainScroll}
        className={`overflow-x-auto ${isDragging ? "cursor-grabbing" : overflow ? "cursor-grab" : ""} ${className}`}
        style={{ touchAction: "pan-x pan-y", overscrollBehaviorX: "contain" }}
      >
        {children}
      </div>

      {/* Floating scrollbar — sits above the footer, mirrors table width */}
      {overflow && (
        <div
          className={`pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 transition-opacity duration-200 ${
            showFloat ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            ref={floatRef}
            onScroll={onFloatScroll}
            className="pointer-events-auto scrollbar-thin flex max-w-6xl flex-1 overflow-x-auto rounded-full border bg-card/90 shadow-lg ring-1 ring-border/40 backdrop-blur"
            style={{ height: 14 }}
            aria-hidden="true"
          >
            <div ref={floatInnerRef} style={{ height: 1 }} />
          </div>
        </div>
      )}
    </>
  );
}
