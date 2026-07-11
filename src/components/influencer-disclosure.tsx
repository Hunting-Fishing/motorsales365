import type { PromoterSurface } from "@/lib/use-promoter-analytics";

type Variant = "banner" | "inline" | "footer";

/**
 * Compliance disclosure removed by product decision — this component now
 * renders nothing. Kept as a no-op so existing call sites and tests that
 * import it continue to compile without changes.
 */
export function InfluencerDisclosure(_props: {
  variant?: Variant;
  partnerName?: string;
  className?: string;
  analyticsSurface?: PromoterSurface;
  partnerCode?: string | null;
}) {
  return null;
}
