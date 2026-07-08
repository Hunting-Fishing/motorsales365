import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { computeQuietZoneModules, type QrLevel } from "@/lib/qr-quiet-zone";

/**
 * Responsive QR renderer.
 *
 * The core problem this component solves: a `<canvas>` contributes its
 * intrinsic pixel size (its `width` / `height` attributes) as *min-content*
 * to flex and grid layouts. `<QRCodeCanvas size={512} />` therefore tries to
 * make every ancestor at least 512px wide, and a CSS `width: 100%` only
 * clips it visually *after* the layout pass has already blown out the parent.
 *
 * `<ResponsiveQr>` fixes this at the source:
 *
 *  1. It measures its own container width with a `ResizeObserver` and picks
 *     a rendered pixel size clamped to `[minPx, maxPx]`, rounded so QR
 *     modules stay crisp.
 *  2. The wrapper carries `min-width: 0` inline (not just via Tailwind) so
 *     it survives strict grid/flex parents.
 *  3. `contain: 'size layout'` + a fixed square placeholder prevent the
 *     canvas from contributing intrinsic size before the observer fires.
 *
 * Result: the canvas can never push its parent wider than the available
 * space, on any screen size, in any layout.
 */

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const MODULES_BY_LEVEL: Record<QrLevel, number> = {
  // Version 10 (57 modules) is a safe upper bound for typical referral links.
  L: 57,
  M: 57,
  Q: 57,
  H: 57,
};

function roundToModules(px: number, moduleCount: number): number {
  const per = Math.max(1, Math.floor(px / moduleCount));
  return per * moduleCount;
}

export type ResponsiveQrProps = {
  value: string;
  level?: QrLevel;
  /** Hard cap on rendered on-screen size, in CSS pixels. */
  maxPx?: number;
  /** Never render smaller than this, in CSS pixels. */
  minPx?: number;
  /** "auto" uses `computeQuietZoneModules`; a number sets modules explicitly. */
  quietZone?: "auto" | number;
  imageSettings?: React.ComponentProps<typeof QRCodeCanvas>["imageSettings"];
  className?: string;
  /** Inline style merged onto the wrapper. `min-width: 0` is always forced. */
  style?: React.CSSProperties;
  "aria-label"?: string;
  /** Attached to the underlying canvas for tests. */
  "data-qr"?: string;
  /** Background color (light modules). Defaults to white. */
  bgColor?: string;
  /** Foreground color (dark modules). Defaults to black. */
  fgColor?: string;
};

export function ResponsiveQr({
  value,
  level = "H",
  maxPx = 512,
  minPx = 128,
  quietZone = "auto",
  imageSettings,
  className,
  style,
  bgColor = "#ffffff",
  fgColor = "#000000",
  "aria-label": ariaLabel,
  "data-qr": dataQr,
}: ResponsiveQrProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerPx, setContainerPx] = useState<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const update = () => {
      // Use the wrapper's own width. Because the wrapper is
      // `max-width: 100%; min-width: 0; width: 100%`, this is always the
      // space actually available in the parent — never the intrinsic canvas
      // size.
      const w = el.getBoundingClientRect().width;
      if (w > 0) setContainerPx(w);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Also react to viewport rotations / zooms that may not fire RO on some
    // WebKit builds.
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const renderedPx = useMemo(() => {
    const target = Math.min(maxPx, Math.max(minPx, Math.floor(containerPx ?? minPx)));
    // Snap to a whole number of modules so the QR renders without shimmering
    // sub-pixel columns. We don't know the exact version until render, so
    // snap to a conservative upper bound (Version 10, 57 modules) which is
    // never smaller than the actual module count for typical referral links.
    return roundToModules(target, MODULES_BY_LEVEL[level]);
  }, [containerPx, minPx, maxPx, level]);

  const marginModules =
    quietZone === "auto" ? computeQuietZoneModules(renderedPx, level) : Math.max(0, quietZone);

  const wrapperStyle: React.CSSProperties = {
    // Forced inline so a Tailwind purge or a hostile parent stylesheet can
    // never strip these — the whole point of the component is that it cannot
    // push its parent wider.
    minWidth: 0,
    maxWidth: "100%",
    width: "100%",
    display: "block",
    // Contain the intrinsic size of the canvas until the observer picks a
    // real width. Without this, the first paint can briefly widen a grid
    // track before shrinking back.
    contain: "layout size",
    containIntrinsicSize: `${minPx}px ${minPx}px`,
    aspectRatio: "1 / 1",
    ...style,
  };

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={wrapperStyle}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
    >
      {containerPx == null ? (
        // First-frame placeholder. Fixed square, no canvas yet, so it cannot
        // influence parent layout. Matches the wrapper's aspect-ratio.
        <div
          aria-hidden="true"
          style={{
            width: "100%",
            height: "100%",
            background: bgColor,
          }}
        />
      ) : (
        <QRCodeCanvas
          value={value}
          size={renderedPx}
          level={level}
          marginSize={marginModules}
          bgColor={bgColor}
          fgColor={fgColor}
          imageSettings={imageSettings}
          data-qr={dataQr}
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "100%",
            display: "block",
          }}
        />
      )}
    </div>
  );
}
