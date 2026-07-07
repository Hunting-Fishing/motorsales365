import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
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

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_ZOOM = 2.5;

export function ZoomableQr({
  children,
  className = "",
  ariaLabel,
  resetSignal,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  /**
   * When this value changes, zoom + pan snap back to the default (1x, centered)
   * so scanning always starts at the best default. Consumers pass the dialog
   * `open` boolean, a route param, or any changing key.
   */
  resetSignal?: unknown;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });

  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [resetSignal]);


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
      // When zoomed in, restrict pan to keep image edges within the frame.
      // When at or below 1x, still allow the user to nudge the QR anywhere
      // within the container so they can reposition it for a cleaner scan.
      const zoomedMaxX = ((s - 1) * rect.width) / 2;
      const zoomedMaxY = ((s - 1) * rect.height) / 2;
      const maxX = Math.max(zoomedMaxX, rect.width / 2);
      const maxY = Math.max(zoomedMaxY, rect.height / 2);
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
          return clampTranslate(next, s);
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
      panStartRef.current = {
        pointer: { x: e.clientX, y: e.clientY },
        translate,
      };
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

  const zoomPct = Math.round(scale * 100);
  const canZoomOut = scale > MIN_SCALE + 0.001;
  const canZoomIn = scale < MAX_SCALE - 0.001;
  const canReset = !(scale === 1 && translate.x === 0 && translate.y === 0);

  const zoomFromCenter = useCallback(
    (delta: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      applyZoomAt(scale + delta, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    },
    [applyZoomAt, scale],
  );

  const panBy = useCallback(
    (dx: number, dy: number) => {
      setTranslate((prev) => clampTranslate({ x: prev.x + dx, y: prev.y + dy }, scale));
    },
    [clampTranslate, scale],
  );

  // Keyboard: +/= zoom in, -/_ zoom out, 0 reset, arrows to pan.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = e.key;
    if (key === "+" || key === "=") {
      e.preventDefault();
      zoomFromCenter(0.5);
    } else if (key === "-" || key === "_") {
      e.preventDefault();
      zoomFromCenter(-0.5);
    } else if (key === "0") {
      e.preventDefault();
      reset();
    } else if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown") {
      e.preventDefault();
      const step = 40;
      if (key === "ArrowLeft") panBy(step, 0);
      else if (key === "ArrowRight") panBy(-step, 0);
      else if (key === "ArrowUp") panBy(0, step);
      else panBy(0, -step);
    } else if (key === "Enter" || key === " ") {
      // Space / Enter toggles zoom (mimics double-tap for keyboard users)
      e.preventDefault();
      if (scale > 1.1) reset();
      else zoomFromCenter(DOUBLE_TAP_ZOOM - scale);
    }
  };

  const instructionsId = useId();

  return (
    <div className={`relative ${className}`}>
      <p id={instructionsId} className="sr-only">
        Zoomable QR code. Use plus and minus keys or the buttons below to zoom, zero to reset, and
        arrow keys to pan when zoomed. On touch devices, pinch to zoom and double-tap to toggle.
      </p>
      <div
        ref={containerRef}
        role="application"
        tabIndex={0}
        aria-label={ariaLabel ?? "Zoomable QR code"}
        aria-describedby={instructionsId}
        aria-roledescription="Zoomable image"
        className="relative touch-none overflow-hidden select-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
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

      {/* Polite live region so screen readers announce zoom changes */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Zoom {zoomPct} percent
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center"
        role="toolbar"
        aria-label="QR zoom controls"
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-background/95 px-1.5 py-1 shadow-sm ring-1 ring-border backdrop-blur">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
            aria-label={`Zoom out. Current zoom ${zoomPct}%`}
            onClick={() => zoomFromCenter(-0.5)}
            disabled={!canZoomOut}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span
            className="w-12 text-center text-xs font-medium tabular-nums text-foreground"
            aria-hidden="true"
          >
            {zoomPct}%
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
            aria-label={`Zoom in. Current zoom ${zoomPct}%`}
            onClick={() => zoomFromCenter(0.5)}
            disabled={!canZoomIn}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
            aria-label="Reset zoom and center the QR"
            onClick={reset}
            disabled={!canReset}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
