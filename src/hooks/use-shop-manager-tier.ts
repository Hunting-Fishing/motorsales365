import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getShopManagerEntitlements,
  type ShopManagerEntitlements,
  type ShopManagerFeatures,
  type ShopManagerLimits,
  type ShopManagerTier,
} from "@/lib/shop-manager-entitlements.functions";

const TIER_ORDER: Record<ShopManagerTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  enterprise: 3,
};

export function tierMeets(current: ShopManagerTier, required: ShopManagerTier): boolean {
  return TIER_ORDER[current] >= TIER_ORDER[required];
}

export function useShopManagerTier(businessId: string | null | undefined) {
  const load = useServerFn(getShopManagerEntitlements);
  const query = useQuery({
    queryKey: ["shop-manager-entitlements", businessId],
    queryFn: () => load({ data: { businessId: businessId! } }),
    enabled: !!businessId,
    staleTime: 60_000,
  });

  const data: ShopManagerEntitlements | undefined = query.data;
  const tier: ShopManagerTier = data?.tier ?? "free";

  return {
    query,
    loading: query.isLoading,
    tier,
    features: data?.features,
    limits: data?.limits,
    aiCeiling: data?.aiCeiling ?? 0,
    aiUsed: data?.aiUsed ?? 0,
    tierMeets: (required: ShopManagerTier) => tierMeets(tier, required),
    hasFeature: (key: keyof ShopManagerFeatures) => !!data?.features?.[key],
    atLimit: (key: keyof ShopManagerLimits, current: number) => {
      const cap = data?.limits?.[key];
      if (cap == null || typeof cap !== "number") return false;
      return current >= cap;
    },
    remaining: (key: keyof ShopManagerLimits, current: number) => {
      const cap = data?.limits?.[key];
      if (cap == null || typeof cap !== "number") return null;
      return Math.max(0, cap - current);
    },
    entitlements: data,
  };
}
