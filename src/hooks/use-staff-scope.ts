import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getMyStaffScope, type StaffScope } from "@/lib/staff-scope.functions";

/**
 * Returns the current staff member's scope (roles + visibility flags).
 * For non-staff users returns null. Sales / advertising staff get a
 * restricted scope (`canSeeAll = false`); admin / moderator see all.
 */
export function useStaffScope(): {
  scope: StaffScope | null;
  isLoading: boolean;
} {
  const { user, isStaff } = useAuth();
  const fetchScope = useServerFn(getMyStaffScope);
  const q = useQuery({
    queryKey: ["staff-scope", user?.id],
    queryFn: () => fetchScope(),
    enabled: !!user && !!isStaff,
    staleTime: 60_000,
  });
  return { scope: (q.data as StaffScope | undefined) ?? null, isLoading: q.isLoading };
}
