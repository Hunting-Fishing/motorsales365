import { useCurrency } from "@/lib/currency";
import { formatPHP } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Renders a listing price. All listings are denominated in PHP (₱) — that's
 * the "listed" currency. If the signed-in user has chosen a different display
 * currency in their profile, we also show the converted value with the
 * conversion rate so they understand what they're seeing.
 */
export function ListingPrice({
  pricePhp,
  className,
  size = "lg",
  headlineKind = "asking",
  negotiable = false,
  priceHidden = false,
}: {
  pricePhp: number | string | null | undefined;
  className?: string;
  /** lg = listing detail page, md = card, sm = inline */
  size?: "sm" | "md" | "lg";
  /** Which of the three prices this headline represents (drives suffix/prefix). */
  headlineKind?: "asking" | "monthly" | "down_payment";
  negotiable?: boolean;
  priceHidden?: boolean;
}) {
  const { code, current, format } = useCurrency();
  const amount = typeof pricePhp === "string" ? parseFloat(pricePhp) : (pricePhp ?? 0);
  const showConversion = code !== "PHP" && current.rate_to_php > 0 && amount > 0 && !priceHidden;

  const primarySize =
    size === "lg" ? "text-3xl md:text-4xl" : size === "md" ? "text-xl" : "text-base";
  const secondarySize = size === "lg" ? "text-sm" : "text-xs";

  const suffix = headlineKind === "monthly" ? "/mo" : "";
  const prefix = headlineKind === "down_payment" ? "DP " : "";

  return (
    <div className={cn("flex flex-col", className)}>
      <div className={cn("font-bold text-primary", primarySize)}>
        {priceHidden ? (
          <span>Message for price</span>
        ) : amount <= 0 ? (
          <span className="text-muted-foreground">No price set</span>
        ) : (
          <>
            {prefix}
            {formatPHP(amount)}
            {suffix && (
              <span className="ml-0.5 align-middle text-[0.55em] font-semibold uppercase tracking-wide text-muted-foreground">
                {suffix.trim()}
              </span>
            )}
            <span className="ml-1 align-middle text-[0.6em] font-medium uppercase tracking-wide text-muted-foreground">
              PHP
            </span>
            {negotiable && (
              <span className="ml-1 align-middle text-[0.55em] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                · Neg.
              </span>
            )}
          </>
        )}
      </div>
      {showConversion && (
        <div className={cn("mt-0.5 text-muted-foreground", secondarySize)}>
          ≈ <span className="font-semibold text-foreground">{format(amount)}</span>{" "}
          <span className="opacity-70">
            (1 {current.code} ≈ ₱
            {current.rate_to_php.toLocaleString("en-US", { maximumFractionDigits: 2 })})
          </span>
        </div>
      )}
    </div>
  );
}
