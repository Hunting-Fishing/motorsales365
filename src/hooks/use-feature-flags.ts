/**
 * Subscribe to feature flag state with a short SWR cache (60s).
 * Reads via the public server fn — works for anonymous and signed-in users.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFeatureFlags, type FeatureFlag } from "@/lib/feature-flags.functions";

const STALE_MS = 60_000;

export function useFeatureFlags() {
  const fetchFn = useServerFn(listFeatureFlags);
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: () => fetchFn(),
    staleTime: STALE_MS,
    select: (res) => res.flags as FeatureFlag[],
  });
}

export function useFeatureFlag(key: string) {
  const { data, isLoading } = useFeatureFlags();
  const flag = data?.find((f) => f.key === key);
  return {
    enabled: flag?.enabled ?? false,
    payload: flag?.payload ?? null,
    isLoading,
  };
}
