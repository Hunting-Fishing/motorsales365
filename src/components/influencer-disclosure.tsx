import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "banner" | "inline" | "footer";

/**
 * FTC / PH DTI-style disclosure for partner/affiliate/referral pages.
 * Use `banner` at top of partner landing pages, `inline` inside cards/content,
 * and `footer` at the bottom of referral landings.
 */
export function InfluencerDisclosure({
  variant = "banner",
  partnerName,
  className,
}: {
  variant?: Variant;
  partnerName?: string;
  className?: string;
}) {
  const who = partnerName ? `${partnerName} is` : "This link is shared by";
  const message =
    variant === "footer"
      ? `Disclosure: ${partnerName ?? "The person sharing this link"} is an independent partner of 365 Motor Sales and may earn a commission from qualifying signups or purchases made through their referral. This does not affect the price you pay.`
      : `Disclosure: ${who} an independent partner of 365 Motor Sales${partnerName ? "" : " (not an employee)"} and may earn a commission from qualifying actions made through this link. Your price and experience are not affected.`;

  if (variant === "inline") {
    return (
      <p className={cn("text-xs italic text-muted-foreground", className)}>
        {message}
      </p>
    );
  }

  if (variant === "footer") {
    return (
      <div
        className={cn(
          "mt-6 border-t border-border/60 pt-3 text-center text-[11px] leading-snug text-muted-foreground",
          className,
        )}
      >
        {message}
      </div>
    );
  }

  return (
    <div
      role="note"
      aria-label="Affiliate disclosure"
      className={cn(
        "flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50/60 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/20 dark:text-amber-100",
        className,
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
