import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getMyStaffScope, type StaffScope } from "@/lib/staff-scope.functions";

/**
 * Returns the current staff member's scope (roles + visibility flags).
 * For non-staff users returns null. Sales / advertising staff get a
 * restricted scope (`canSeeAll = false`); admin / moderator see all.
 *
 * When a real admin is simulating roles in the Sandbox, the scope is
 * recomputed from the simulated role set so the admin previews the app
 * exactly as that persona would experience it.
 */
export function useStaffScope(): {
  scope: StaffScope | null;
  isLoading: boolean;
} {
  const { user, isStaff, realIsAdmin, simulatedRoles, effectiveRoles } = useAuth();
  const fetchScope = useServerFn(getMyStaffScope);
  const q = useQuery({
    queryKey: ["staff-scope", user?.id],
    queryFn: () => fetchScope(),
    enabled: !!user && !!isStaff,
    staleTime: 60_000,
  });
  const real = (q.data as StaffScope | undefined) ?? null;

  // Overlay simulation: when a real admin picks a persona in the sandbox,
  // compute a virtual scope from the simulated role set.
  if (real && realIsAdmin && simulatedRoles && simulatedRoles.length > 0) {
    const set = new Set(effectiveRoles);
    const isAdmin = set.has("admin");
    const isModerator = set.has("moderator");
    const overlay: StaffScope = {
      ...real,
      isAdmin,
      isModerator,
      isSupport: set.has("support"),
      isSales:
        set.has("sales") ||
        set.has("sales_junior") ||
        set.has("sales_senior") ||
        set.has("sales_manager"),
      isAdvertising: set.has("advertising"),
      canSeeAll: isAdmin || isModerator,
      is365Staff: true,
    };
    return { scope: overlay, isLoading: q.isLoading };
  }

  return { scope: real, isLoading: q.isLoading };
}
