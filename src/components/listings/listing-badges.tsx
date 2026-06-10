import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  AlertTriangle,
  FileCheck2,
  FileX2,
  ArrowLeftRight,
} from "lucide-react";
import { getSellerTier, type TierInput } from "@/lib/listing-tier";

export type RegistrationStatus = "registered" | "unregistered" | "for_transfer" | "unknown";

export interface ListingBadgeData extends TierInput {
  price_php?: number | string | null;
  monthly_php?: number | string | null;
  down_payment_php?: number | string | null;
  negotiable?: boolean | null;
  registration_status?: RegistrationStatus | null;
  /**
   * Which value is the headline price already shown next to the card.
   * The matching pill is suppressed so we don't repeat the headline.
   */
  headlineKind?: "asking" | "monthly" | "down_payment" | null;
}

const toNum = (v: unknown): number =>
  typeof v === "string" ? parseFloat(v) || 0 : typeof v === "number" ? v : 0;

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
  const reg: RegistrationStatus = listing.registration_status ?? "unknown";
  const iconSz = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {showTier && (
        <Badge variant="outline" className={cn("gap-1", tier.badgeClass)}>
          <BadgeCheck className={iconSz} />
          {tier.label}
        </Badge>
      )}

      {/* Pricing & negotiable pills moved to PricingWidget */}

      {reg === "registered" && (
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        >
          <FileCheck2 className={iconSz} /> Registered
        </Badge>
      )}
      {reg === "unregistered" && (
        <Badge
          variant="outline"
          className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        >
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

/** Pick which of the three prices to show as the headline number. */
export function pickHeadlinePrice(l: {
  price_php?: number | string | null;
  monthly_php?: number | string | null;
  down_payment_php?: number | string | null;
  price_hidden?: boolean | null;
}): { kind: "asking" | "monthly" | "down_payment" | "hidden"; amount: number } {
  if (l.price_hidden) return { kind: "hidden", amount: 0 };
  const asking = toNum(l.price_php);
  if (asking > 0) return { kind: "asking", amount: asking };
  const monthly = toNum(l.monthly_php);
  if (monthly > 0) return { kind: "monthly", amount: monthly };
  const dp = toNum(l.down_payment_php);
  if (dp > 0) return { kind: "down_payment", amount: dp };
  return { kind: "asking", amount: 0 };
}

