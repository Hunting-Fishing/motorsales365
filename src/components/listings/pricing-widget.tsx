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

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

function pickHeadline(
  asking: number | null,
  monthly: number | null,
  dp: number | null,
): Kind | null {
  if (asking) return "asking";
  if (monthly) return "monthly";
  if (dp) return "down_payment";
  return null;
}

/**
 * On-card pricing widget. Renders a pill ONLY for price fields the seller
 * actually set to a positive amount (Asking, Monthly, Down payment) plus a
 * Negotiable pill. Null, undefined, empty, zero, and non-finite values are
 * treated as unset and never produce a pill.
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

  const hasAny = !!(asking || monthly || dp || listing.negotiable);
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
      {asking !== null &&
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
      {monthly !== null &&
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
      {dp !== null &&
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
