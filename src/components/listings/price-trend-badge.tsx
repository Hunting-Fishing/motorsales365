import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PriceTrend {
  direction: "up" | "down";
  delta_pct: number | string;
  field?: "asking" | "monthly" | "down_payment" | string;
  changed_at?: string;
}

/**
 * Colored arrow + percent pill showing the most recent price change.
 * Green ↓ for price drops, red ↑ for price hikes.
 */
export function PriceTrendBadge({
  trend,
  size = "sm",
  className,
}: {
  trend: PriceTrend | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!trend) return null;
  const pct = Math.abs(Number(trend.delta_pct) || 0);
  if (!pct) return null;
  const isDown = trend.direction === "down";
  const Icon = isDown ? ArrowDown : ArrowUp;
  const label = isDown ? `${pct.toFixed(0)}% price drop` : `${pct.toFixed(0)}% price up`;
  const fieldLabel =
    trend.field === "monthly" ? "monthly" : trend.field === "down_payment" ? "DP" : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]",
        isDown
          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300",
        className,
      )}
      title={fieldLabel ? `${label} (${fieldLabel})` : label}
    >
      <Icon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      {pct.toFixed(0)}%
      {fieldLabel && <span className="opacity-70">· {fieldLabel}</span>}
    </span>
  );
}
