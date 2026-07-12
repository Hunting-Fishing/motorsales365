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
  const fieldLabel =
    trend.field === "monthly" ? " mo" : trend.field === "down_payment" ? " DP" : "";
  const label = isDown ? `${pct.toFixed(0)}% Price Drop` : `${pct.toFixed(0)}% Price Up`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-semibold shadow-sm",
        size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]",
        isDown ? "bg-emerald-600 text-white" : "bg-rose-600 text-white",
        className,
      )}
      title={label + fieldLabel}
    >
      <Icon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      {label}
      {fieldLabel && <span className="opacity-80">·{fieldLabel}</span>}
    </span>
  );
}
