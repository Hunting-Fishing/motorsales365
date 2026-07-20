import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useShopManagerTier, tierMeets } from "@/hooks/use-shop-manager-tier";
import type {
  ShopManagerFeatures,
  ShopManagerTier,
} from "@/lib/shop-manager-entitlements.functions";

const TIER_LABEL: Record<ShopManagerTier, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export type LockedFeatureProps = {
  businessId: string | null | undefined;
  /** Minimum tier required to use this feature. */
  requiredTier: ShopManagerTier;
  /** Optional feature flag key — takes precedence when set. */
  feature?: keyof ShopManagerFeatures;
  /** Short human label of what is being locked, e.g. "AI translate". */
  label?: string;
  /** Where the upgrade CTA sends the user. */
  upgradeHref?: string;
  /** Render style: greys out children and blocks interaction. */
  children: ReactNode;
  /** When true, always renders children with no overlay (bypass). */
  bypass?: boolean;
  className?: string;
};

/**
 * Wraps a UI feature that requires a paid tier.
 * If the user's plan doesn't qualify, children are visible but greyed and non-interactive,
 * with a tier badge + upgrade CTA overlay.
 */
export function LockedFeature({
  businessId,
  requiredTier,
  feature,
  label,
  upgradeHref = "/shop-manager/pricing",
  children,
  bypass,
  className,
}: LockedFeatureProps) {
  const { loading, tier, hasFeature } = useShopManagerTier(businessId);

  if (bypass || !businessId) {
    return <>{children}</>;
  }
  if (loading) {
    return <div className={className}>{children}</div>;
  }

  const meetsTier = tierMeets(tier, requiredTier);
  const meetsFeature = feature ? hasFeature(feature) : true;
  const unlocked = meetsTier && meetsFeature;

  if (unlocked) {
    return <div className={className}>{children}</div>;
  }

  const tierLabel = TIER_LABEL[requiredTier];

  return (
    <TooltipProvider>
      <div className={`relative ${className ?? ""}`}>
        <div
          aria-hidden
          className="pointer-events-none opacity-50 grayscale-[0.4] select-none"
        >
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/40 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 rounded-lg border bg-background/95 px-4 py-3 shadow-lg">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                {tierLabel}
              </Badge>
              {label && <span className="text-sm font-medium">{label}</span>}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild size="sm" className="gap-1">
                  <Link to={upgradeHref as any}>
                    <Sparkles className="h-3.5 w-3.5" />
                    Upgrade to {tierLabel}
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  This feature is included in the {tierLabel} plan and above.
                  Your current plan: <strong>{TIER_LABEL[tier]}</strong>.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
