import { useMemo } from "react";

interface PricePoint {
  captured_at: string;
  price_php?: number | null;
  sale_price_php?: number | null;
}

interface Props {
  history: PricePoint[];
  width?: number;
  height?: number;
}

/**
 * Compact SVG sparkline showing the effective (sale or list) price trend.
 * Uses semantic tokens so it adapts to theme.
 */
export function PriceSparkline({ history, width = 320, height = 64 }: Props) {
  const points = useMemo(() => {
    const pts = (history ?? [])
      .map((h) => {
        const v =
          h.sale_price_php != null
            ? Number(h.sale_price_php)
            : h.price_php != null
              ? Number(h.price_php)
              : null;
        return v != null && !Number.isNaN(v) ? { t: new Date(h.captured_at).getTime(), v } : null;
      })
      .filter((p): p is { t: number; v: number } => !!p);
    return pts;
  }, [history]);

  if (points.length < 2) return null;

  const min = Math.min(...points.map((p) => p.v));
  const max = Math.max(...points.map((p) => p.v));
  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const tRange = Math.max(1, tMax - tMin);
  const vRange = Math.max(1, max - min);

  const path = points
    .map((p, i) => {
      const x = ((p.t - tMin) / tRange) * (width - 4) + 2;
      const y = height - 4 - ((p.v - min) / vRange) * (height - 8);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const last = points[points.length - 1];
  const first = points[0];
  const trend = last.v < first.v ? "down" : last.v > first.v ? "up" : "flat";
  const stroke =
    trend === "down"
      ? "hsl(142 71% 45%)"
      : trend === "up"
        ? "hsl(0 84% 60%)"
        : "hsl(var(--muted-foreground))";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-full"
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
