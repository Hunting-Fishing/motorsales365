import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type PermissionCategory = "Navigation" | "Listings" | "Businesses" | "Payments" | "Users" | "Other";

export type PermissionDef = {
  key: string;
  label: string;
  category: PermissionCategory;
};

/**
 * The full catalog of toggle-able permissions surfaced in the admin
 * permission editor. Nav keys are mirrored from ADMIN_NAV; action keys
 * are wired through <AdminActionButton> or has_permission() calls.
 */
export const PERMISSION_CATALOG: PermissionDef[] = [
  // Navigation (nav.<slug> mirrors admin-nav.ts)
  { key: "nav.overview", label: "Overview", category: "Navigation" },
  { key: "nav.sales", label: "Sales Hub", category: "Navigation" },
  { key: "nav.accounts", label: "Accounts", category: "Navigation" },
  { key: "nav.analytics", label: "Analytics", category: "Navigation" },
  { key: "nav.advertisements", label: "Advertisements", category: "Navigation" },
  { key: "nav.shop", label: "Affiliate Shop", category: "Navigation" },
  { key: "nav.referrals", label: "Referrals", category: "Navigation" },
  { key: "nav.qr-ads", label: "QR Advertisements", category: "Navigation" },
  { key: "nav.businesses", label: "Directory", category: "Navigation" },
  { key: "nav.discover-businesses", label: "Discover", category: "Navigation" },
  { key: "nav.claims", label: "Claims", category: "Navigation" },
  { key: "nav.verifications", label: "Verifications", category: "Navigation" },
  { key: "nav.listings", label: "Listings", category: "Navigation" },
  { key: "nav.reports", label: "Activity & Reports", category: "Navigation" },
  { key: "nav.location-corrections", label: "Location fixes", category: "Navigation" },
  { key: "nav.dispatch", label: "365 Dispatch", category: "Navigation" },
  { key: "nav.education", label: "Education", category: "Navigation" },

  // Action keys
  { key: "action.listing.approve", label: "Approve listings", category: "Listings" },
  { key: "action.listing.reject", label: "Reject listings", category: "Listings" },
  { key: "action.listing.delete", label: "Delete listings", category: "Listings" },
  { key: "action.business.approve", label: "Approve businesses", category: "Businesses" },
  { key: "action.business.reject", label: "Reject businesses", category: "Businesses" },
  { key: "action.verification.decide", label: "Decide verifications", category: "Businesses" },
  { key: "action.payment.refund", label: "Refund payments", category: "Payments" },
  { key: "action.user.ban", label: "Ban / unban users", category: "Users" },
  { key: "action.user.magic-link", label: "Issue magic link", category: "Users" },
  { key: "action.user.role-grant", label: "Grant / revoke roles", category: "Users" },
];

export const NON_ADMIN_ROLES = ["sales", "moderator", "support", "advertising"] as const;
export type EditableRole = (typeof NON_ADMIN_ROLES)[number];

/**
 * Returns the set of permission keys enabled for the current user.
 * Admins implicitly get every key.
 */
export function usePermissions() {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: ["my-permissions", user?.id, isAdmin],
    enabled: !!user,
    queryFn: async (): Promise<Set<string>> => {
      if (isAdmin) {
        return new Set(PERMISSION_CATALOG.map((p) => p.key));
      }
      // Pull user's roles, then permissions enabled for those roles.
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      const myRoles = (roles ?? []).map((r: any) => r.role as string);
      if (myRoles.length === 0) return new Set();
      const { data: perms } = await supabase
        .from("role_permissions")
        .select("permission_key,enabled,role")
        .in("role", myRoles as any);
      const enabled = new Set<string>();
      for (const row of perms ?? []) {
        if ((row as any).enabled) enabled.add((row as any).permission_key);
      }
      return enabled;
    },
  });
}

export function hasPerm(set: Set<string> | undefined, key: string): boolean {
  return !!set && set.has(key);
}
