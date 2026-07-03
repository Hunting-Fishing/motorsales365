import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getClubDiscountStatus } from "@/lib/club-discount.functions";
import { useAuth } from "@/hooks/use-auth";

/**
 * Client hook: current signed-in user's club-member discount status.
 * Returns `eligible=false` for signed-out users.
 */
export function useClubDiscountStatus() {
  const { user } = useAuth();
  const fetchStatus = useServerFn(getClubDiscountStatus);
  return useQuery({
    queryKey: ["club-discount-status", user?.id ?? "anon"],
    queryFn: () => fetchStatus(),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
