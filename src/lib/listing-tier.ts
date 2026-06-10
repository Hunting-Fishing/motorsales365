/**
 * Derive a "rarity" tier for a listing, used to drive the colored border /
 * glow on listing cards. Pure function — safe in any environment.
 *
 * Tiers (lowest to highest visibility):
 *   unverified  – new account, no ID verification
 *   private     – verified private seller
 *   power       – power seller (reputation / sold history) [reserved]
 *   business    – business profile linked
 *   dealer      – verified dealership / org with active subscription
 *   featured    – currently boosted OR top plan
 *   penalty     – seller has too many policy strikes
 */
export type SellerTier =
  | "unverified"
  | "private"
  | "power"
  | "business"
  | "dealer"
  | "featured"
  | "penalty";

export interface TierInput {
  seller_type?: "private" | "business" | "staff" | null;
  seller_verified?: boolean | null;
  seller_phone_verified?: boolean | null;
  seller_dealer_plan?: string | null;
  boost_until?: string | null;
  reputation_score?: number | null; // optional, when available
}

export interface TierStyle {
  tier: SellerTier;
  label: string;
  /** Outer ring color class (border substitute on a wrapper). */
  ringClass: string;
  /** Optional inner ring color (second band) for premium tiers. */
  innerRingClass?: string;
  /** Soft glow / shadow for premium tiers. */
  glowClass?: string;
  /** Foreground accent for the tier badge. */
  textClass: string;
  /** Background utility for the tier badge. */
  badgeClass: string;
}

const STYLES: Record<SellerTier, TierStyle> = {
  unverified: {
    tier: "unverified",
    label: "Unverified",
    ringClass: "ring-1 ring-tier-unverified/40",
    textClass: "text-tier-unverified",
    badgeClass: "bg-tier-unverified/10 text-tier-unverified border-tier-unverified/30",
  },
  private: {
    tier: "private",
    label: "Verified seller",
    ringClass: "ring-1 ring-tier-private",
    textClass: "text-foreground",
    badgeClass: "bg-tier-private/40 text-foreground border-border",
  },
  power: {
    tier: "power",
    label: "Power seller",
    ringClass: "ring-2 ring-tier-power",
    glowClass: "shadow-[0_0_18px_-4px_var(--color-tier-power)]",
    textClass: "text-tier-power",
    badgeClass: "bg-tier-power/15 text-tier-power border-tier-power/40",
  },
  business: {
    tier: "business",
    label: "Business",
    ringClass: "ring-2 ring-tier-business",
    glowClass: "shadow-[0_0_18px_-4px_var(--color-tier-business)]",
    textClass: "text-tier-business",
    badgeClass: "bg-tier-business/15 text-tier-business border-tier-business/40",
  },
  dealer: {
    tier: "dealer",
    label: "Dealership",
    ringClass: "ring-2 ring-tier-dealer",
    innerRingClass: "ring-1 ring-offset-1 ring-offset-card",
    glowClass: "shadow-[0_0_22px_-4px_var(--color-tier-dealer)]",
    textClass: "text-tier-dealer",
    badgeClass: "bg-tier-dealer/15 text-tier-dealer border-tier-dealer/50",
  },
  featured: {
    tier: "featured",
    label: "Featured",
    ringClass: "ring-2 ring-tier-featured",
    innerRingClass: "ring-1 ring-offset-1 ring-offset-card ring-tier-dealer",
    glowClass: "shadow-[0_0_26px_-4px_var(--color-tier-featured)]",
    textClass: "text-tier-featured",
    badgeClass: "bg-tier-featured/15 text-tier-featured border-tier-featured/50",
  },
  penalty: {
    tier: "penalty",
    label: "Caution",
    ringClass: "ring-2 ring-dashed ring-tier-penalty",
    textClass: "text-tier-penalty",
    badgeClass: "bg-tier-penalty/10 text-tier-penalty border-tier-penalty/40",
  },
};

export function getSellerTier(input: TierInput): TierStyle {
  const boosted = !!input.boost_until && new Date(input.boost_until) > new Date();
  if (boosted) return STYLES.featured;

  if (typeof input.reputation_score === "number" && input.reputation_score < 30) {
    return STYLES.penalty;
  }

  if (input.seller_dealer_plan) return STYLES.dealer;
  if (input.seller_type === "business") return STYLES.business;

  if (input.seller_verified) {
    if (typeof input.reputation_score === "number" && input.reputation_score >= 80) {
      return STYLES.power;
    }
    return STYLES.private;
  }

  return STYLES.unverified;
}
