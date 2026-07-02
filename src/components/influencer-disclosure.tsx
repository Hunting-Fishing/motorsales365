import { ShieldCheck } from "lucide-react";
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

  // banner — mobile-first: icon + text stack cleanly, no truncation
  return (
    <div
      role="note"
      aria-label="Affiliate disclosure"
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-50 to-amber-100/40 px-4 py-3 shadow-sm dark:from-amber-950/30 dark:to-amber-950/10 dark:border-amber-500/20",
        className,
      )}
    >
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
        <ShieldCheck className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
          Compliance disclosure
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-amber-950/90 dark:text-amber-100/90">
          {message}
        </p>
      </div>
    </div>
  );
}
