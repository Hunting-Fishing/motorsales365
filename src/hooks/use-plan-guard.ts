import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBusinessPlanUsage, type PlanLimits, type PlanUsage } from "@/lib/business-plan-usage.functions";

export type LimitKey = keyof PlanUsage;

export function usePlanGuard(businessId: string) {
  const loadUsage = useServerFn(getBusinessPlanUsage);
  const q = useQuery({
    queryKey: ["business-plan-usage", businessId],
    queryFn: () => loadUsage({ data: { businessId } }),
    enabled: !!businessId,
    staleTime: 30_000,
  });

  const status = (key: LimitKey) => {
    const data = q.data;
    if (!data) return { loading: true, atLimit: false, remaining: null as number | null, cap: null as number | null, tier: "", autoUpgrade: false };
    const cap = data.limits[key as keyof PlanLimits];
    const used = data.usage[key];
    if (cap == null) {
      return { loading: false, atLimit: false, remaining: null, cap: null, tier: data.tier, autoUpgrade: data.autoUpgrade };
    }
    const numCap = Number(cap);
    const remaining = Math.max(0, numCap - used);
    return {
      loading: false,
      atLimit: used >= numCap,
      remaining,
      cap: numCap,
      tier: data.tier,
      autoUpgrade: data.autoUpgrade,
    };
  };

  return { query: q, status };
}
