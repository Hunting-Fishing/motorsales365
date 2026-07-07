import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw } from "lucide-react";

/**
 * Zoomable wrapper for the fullscreen QR. Supports:
 * - Pinch-to-zoom (two-pointer gesture)
 * - Double-tap to toggle between 1x and 2.5x, centered on the tap
 * - Drag-to-pan when zoomed in
 * - Explicit +/- and Reset controls for keyboard/mouse users
 *
 * The child is rendered inside a translate+scale transform. Consumers pass
 * the QR canvas/img at natural fullscreen size.
 */
type Point = { x: number; y: number };

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_ZOOM = 2.5;

export function ZoomableQr({
  children,
  className = "",
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });

  const pointersRef = useRef<Map<number, Point>>(new Map());
  const pinchStartRef = useRef<{
    distance: number;
    midpoint: Point;
    scale: number;
    translate: Point;
  } | null>(null);
  const panStartRef = useRef<{ pointer: Point; translate: Point } | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);

  const clampTranslate = useCallback(
    (t: Point, s: number): Point => {
      const el = containerRef.current;
      if (!el) return t;
      const rect = el.getBoundingClientRect();
      const maxX = ((s - 1) * rect.width) / 2;
      const maxY = ((s - 1) * rect.height) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, t.x)),
        y: Math.max(-maxY, Math.min(maxY, t.y)),
      };
    },
    [],
  );

  const applyZoomAt = useCallback(
    (nextScale: number, focal: Point) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
      setScale((prevScale) => {
        setTranslate((prevT) => {
          // Preserve the on-screen position of the focal point across the
          // scale change: newT = focal - center - (focal - center - prevT) * (s/prev)
          const fx = focal.x - cx;
          const fy = focal.y - cy;
          const ratio = s / prevScale;
          const next: Point = {
            x: fx - (fx - prevT.x) * ratio,
            y: fy - (fy - prevT.y) * ratio,
          };
          return s === MIN_SCALE ? { x: 0, y: 0 } : clampTranslate(next, s);
        });
        return s;
      });
    },
    [clampTranslate],
  );

  const reset = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Pointer handlers
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      pinchStartRef.current = {
        distance: Math.hypot(dx, dy) || 1,
        midpoint: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
        scale,
        translate,
      };
      panStartRef.current = null;
    } else if (pointersRef.current.size === 1) {
      // Double-tap detection
      const now = Date.now();
      const last = lastTapRef.current;
      if (
        last &&
        now - last.t < DOUBLE_TAP_MS &&
        Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30
      ) {
        e.preventDefault();
        if (scale > 1.1) {
          reset();
        } else {
          applyZoomAt(DOUBLE_TAP_ZOOM, { x: e.clientX, y: e.clientY });
        }
        lastTapRef.current = null;
      } else {
        lastTapRef.current = { t: now, x: e.clientX, y: e.clientY };
      }
      if (scale > 1) {
        panStartRef.current = {
          pointer: { x: e.clientX, y: e.clientY },
          translate,
        };
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      e.preventDefault();
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy) || 1;
      const nextScale = pinchStartRef.current.scale * (dist / pinchStartRef.current.distance);
      applyZoomAt(nextScale, pinchStartRef.current.midpoint);
      return;
    }

    if (panStartRef.current && pointersRef.current.size === 1) {
      const start = panStartRef.current;
      const nextT: Point = {
        x: start.translate.x + (e.clientX - start.pointer.x),
        y: start.translate.y + (e.clientY - start.pointer.y),
      };
      setTranslate(clampTranslate(nextT, scale));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 0) panStartRef.current = null;
  };

  // Wheel zoom (desktop convenience) — hold Ctrl for trackpad, plain wheel too.
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) < 1) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    applyZoomAt(scale * factor, { x: e.clientX, y: e.clientY });
  };

  // Prevent the browser's native gesture pinch (iOS Safari) inside the frame.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const stop = (ev: Event) => ev.preventDefault();
    el.addEventListener("gesturestart", stop as EventListener);
    el.addEventListener("gesturechange", stop as EventListener);
    el.addEventListener("gestureend", stop as EventListener);
    return () => {
      el.removeEventListener("gesturestart", stop as EventListener);
      el.removeEventListener("gesturechange", stop as EventListener);
      el.removeEventListener("gestureend", stop as EventListener);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        role="group"
        aria-label={ariaLabel ?? "Zoomable QR code"}
        className="relative touch-none overflow-hidden select-none"
        style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          className="origin-center transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            willChange: "transform",
          }}
        >
          {children}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-background/90 px-1.5 py-1 shadow-sm ring-1 ring-border backdrop-blur">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Zoom out"
            onClick={() => {
              const el = containerRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              applyZoomAt(scale - 0.5, {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              });
            }}
            disabled={scale <= MIN_SCALE + 0.001}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center text-[11px] font-medium tabular-nums text-muted-foreground">
            {scale.toFixed(1)}x
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Zoom in"
            onClick={() => {
              const el = containerRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              applyZoomAt(scale + 0.5, {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              });
            }}
            disabled={scale >= MAX_SCALE - 0.001}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Reset zoom"
            onClick={reset}
            disabled={scale === 1 && translate.x === 0 && translate.y === 0}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
