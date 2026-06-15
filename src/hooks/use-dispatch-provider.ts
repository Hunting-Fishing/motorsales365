import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyDispatchStatus } from "@/lib/dispatch.functions";
import { useAuth } from "@/hooks/use-auth";

export type DispatchProviderStatus = {
  loading: boolean;
  hasProfile: boolean;
  hasActiveSub: boolean;
  planSlug: string | null;
};

/**
 * Returns whether the signed-in user has a tow-company provider profile
 * (`provider_tow_rates` row) and an active Dispatch subscription. Used to
 * gate the towing/dispatch sections of the user dashboard so non-providers
 * never see empty provider tools.
 */
export function useDispatchProvider(): DispatchProviderStatus {
  const { user, loading: authLoading } = useAuth();
  const statusFn = useServerFn(getMyDispatchStatus);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [planSlug, setPlanSlug] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setHasProfile(false);
      setHasActiveSub(false);
      setPlanSlug(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = await statusFn();
        if (cancelled) return;
        setHasProfile(Boolean((s as any).hasProfile));
        setPlanSlug((s as any).subscription?.plan_slug ?? null);
        setHasActiveSub(Boolean((s as any).subscription));
      } catch {
        if (!cancelled) {
          setHasProfile(false);
          setHasActiveSub(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading, statusFn]);

  return { loading, hasProfile, hasActiveSub, planSlug };
}
