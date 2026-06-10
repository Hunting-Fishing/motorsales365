import { Banknote, CalendarClock, Wallet, Handshake } from "lucide-react";
import { formatPHP } from "@/lib/format";
import { cn } from "@/lib/utils";

type Kind = "asking" | "monthly" | "down_payment";

export interface PricingWidgetInput {
  price_php?: number | string | null;
  monthly_php?: number | string | null;
  down_payment_php?: number | string | null;
  negotiable?: boolean | null;
  price_hidden?: boolean | null;
}

const toNum = (v: unknown): number =>
  typeof v === "string" ? parseFloat(v) || 0 : typeof v === "number" ? v : 0;

function pickHeadline(asking: number, monthly: number, dp: number): Kind | null {
  if (asking > 0) return "asking";
  if (monthly > 0) return "monthly";
  if (dp > 0) return "down_payment";
  return null;
}

/**
 * On-card pricing widget. Renders a pill for EVERY price field the seller
 * filled in (Asking, Monthly, Down payment) plus a Negotiable pill. The pill
 * matching the headline price gets a stronger, filled treatment so the
 * primary number stays obvious while buyers can see all financing options
 * at a glance.
 */
export function PricingWidget({
  listing,
  className,
  size = "sm",
}: {
  listing: PricingWidgetInput;
  className?: string;
  size?: "sm" | "md";
}) {
  const asking = toNum(listing.price_php);
  const monthly = toNum(listing.monthly_php);
  const dp = toNum(listing.down_payment_php);
  const headline = listing.price_hidden ? null : pickHeadline(asking, monthly, dp);

  const hasAny = asking > 0 || monthly > 0 || dp > 0 || !!listing.negotiable;
  if (!hasAny && !listing.price_hidden) return null;

  const iconSz = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  const padding = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";

  const pill = (opts: {
    kind: Kind | "negotiable" | "hidden";
    Icon: typeof Banknote;
    label: string;
    isHeadline?: boolean;
    palette: { solid: string; soft: string };
  }) => (
    <span
      key={opts.kind}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        padding,
        opts.isHeadline ? opts.palette.solid : opts.palette.soft,
      )}
    >
      <opts.Icon className={iconSz} />
      {opts.label}
    </span>
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {asking > 0 &&
        pill({
          kind: "asking",
          Icon: Banknote,
          label: `Cash ${formatPHP(asking)}`,
          isHeadline: headline === "asking",
          palette: {
            solid:
              "border-emerald-500/60 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
            soft: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          },
        })}
      {monthly > 0 &&
        pill({
          kind: "monthly",
          Icon: CalendarClock,
          label: `${formatPHP(monthly)}/mo`,
          isHeadline: headline === "monthly",
          palette: {
            solid: "border-purple-500/60 bg-purple-500 text-white shadow-sm shadow-purple-500/30",
            soft: "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300",
          },
        })}
      {dp > 0 &&
        pill({
          kind: "down_payment",
          Icon: Wallet,
          label: `DP ${formatPHP(dp)}`,
          isHeadline: headline === "down_payment",
          palette: {
            solid: "border-orange-500/60 bg-orange-500 text-white shadow-sm shadow-orange-500/30",
            soft: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
          },
        })}
      {listing.negotiable &&
        pill({
          kind: "negotiable",
          Icon: Handshake,
          label: "Negotiable",
          palette: {
            solid: "border-blue-500/60 bg-blue-500 text-white",
            soft: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
          },
        })}
    </div>
  );
}
