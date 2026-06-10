import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Handshake, CalendarClock, Wallet, BadgeCheck, AlertTriangle, FileCheck2, FileX2, ArrowLeftRight } from "lucide-react";
import { formatPHP } from "@/lib/format";
import { getSellerTier, type TierInput } from "@/lib/listing-tier";

export type PriceKind = "asking" | "monthly" | "down_payment" | "starting_bid";
export type RegistrationStatus = "registered" | "unregistered" | "for_transfer" | "unknown";

export interface ListingBadgeData extends TierInput {
  price_kind?: PriceKind | null;
  price_php?: number | string | null;
  negotiable?: boolean | null;
  registration_status?: RegistrationStatus | null;
}

/**
 * Compact pill row used on listing cards and the detail page. Pills are
 * derived from the seller + pricing flags so they stay consistent everywhere.
 */
export function ListingBadges({
  listing,
  className,
  size = "sm",
  showTier = true,
}: {
  listing: ListingBadgeData;
  className?: string;
  size?: "sm" | "md";
  showTier?: boolean;
}) {
  const tier = getSellerTier(listing);
  const kind: PriceKind = listing.price_kind ?? "asking";
  const reg: RegistrationStatus = listing.registration_status ?? "unknown";
  const amount = typeof listing.price_php === "string" ? parseFloat(listing.price_php) : listing.price_php ?? 0;
  const iconSz = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {showTier && (
        <Badge variant="outline" className={cn("gap-1", tier.badgeClass)}>
          <BadgeCheck className={iconSz} />
          {tier.label}
        </Badge>
      )}

      {kind === "monthly" && amount > 0 && (
        <Badge variant="outline" className="gap-1 border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-300">
          <CalendarClock className={iconSz} /> {formatPHP(amount)}/mo
        </Badge>
      )}
      {kind === "down_payment" && amount > 0 && (
        <Badge variant="outline" className="gap-1 border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-300">
          <Wallet className={iconSz} /> DP {formatPHP(amount)}
        </Badge>
      )}
      {kind === "starting_bid" && (
        <Badge variant="outline" className="gap-1 border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300">
          Starting bid
        </Badge>
      )}

      {listing.negotiable && (
        <Badge variant="outline" className="gap-1 border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-300">
          <Handshake className={iconSz} /> Negotiable
        </Badge>
      )}

      {reg === "registered" && (
        <Badge variant="outline" className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
          <FileCheck2 className={iconSz} /> Registered
        </Badge>
      )}
      {reg === "unregistered" && (
        <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
          <FileX2 className={iconSz} /> Unregistered
        </Badge>
      )}
      {reg === "for_transfer" && (
        <Badge variant="outline" className="gap-1">
          <ArrowLeftRight className={iconSz} /> For transfer
        </Badge>
      )}

      {tier.tier === "penalty" && (
        <Badge variant="outline" className={cn("gap-1", tier.badgeClass)}>
          <AlertTriangle className={iconSz} /> Verify before paying
        </Badge>
      )}
    </div>
  );
}
