import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdminPendingCounts = {
  reports_open: number;
  verifications_pending: number;
  claims_pending: number;
  payments_pending: number;
  ad_inquiries_open: number;
  service_inquiries_open: number;
  business_inquiries_open: number;
  location_corrections_pending: number;
  type_suggestions_pending: number;
  ad_campaigns_pending: number;
  ops_alerts_unack: number;
  support_tickets_open: number;
  discover_queue_pending: number;
  lead_offers_open: number;
};

const EMPTY: AdminPendingCounts = {
  reports_open: 0,
  verifications_pending: 0,
  claims_pending: 0,
  payments_pending: 0,
  ad_inquiries_open: 0,
  service_inquiries_open: 0,
  business_inquiries_open: 0,
  location_corrections_pending: 0,
  type_suggestions_pending: 0,
  ad_campaigns_pending: 0,
  ops_alerts_unack: 0,
  support_tickets_open: 0,
  discover_queue_pending: 0,
  lead_offers_open: 0,
};

export function useAdminPendingCounts(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-pending-counts"],
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    queryFn: async (): Promise<AdminPendingCounts> => {
      const { data, error } = await supabase.rpc("admin_pending_counts");
      if (error) {
        // Non-staff or transient — fail soft so the admin UI keeps working.
        return EMPTY;
      }
      const d = (data ?? {}) as Partial<AdminPendingCounts>;
      return { ...EMPTY, ...d };
    },
  });
}

/** Map an admin route path to the count key(s) that drive its badge. */
export function pendingCountForRoute(
  path: string,
  counts: AdminPendingCounts | undefined,
): number {
  if (!counts) return 0;
  switch (path) {
    case "/admin/reports":
      return counts.reports_open;
    case "/admin/verifications":
      return counts.verifications_pending;
    case "/admin/claims":
      return counts.claims_pending;
    case "/admin/payments":
      return counts.payments_pending;
    case "/admin/advertisements":
      return counts.ad_inquiries_open + counts.ad_campaigns_pending;
    case "/admin/advertisements/inquiries":
      return counts.ad_inquiries_open;
    case "/admin/inquiries":
      return counts.service_inquiries_open + counts.business_inquiries_open;
    case "/admin/location-corrections":
      return counts.location_corrections_pending;
    case "/admin/type-suggestions":
      return counts.type_suggestions_pending;
    case "/admin/advertisements/campaigns":
      return counts.ad_campaigns_pending;
    case "/admin/alerts":
      return counts.ops_alerts_unack;
    case "/admin/discover-businesses":
      return counts.discover_queue_pending;
    case "/admin/lead-offers":
      return counts.lead_offers_open;
    default:
      return 0;
  }
}

export const ADMIN_NOTIFICATION_ITEMS: { key: keyof AdminPendingCounts; label: string; to: string }[] = [
  { key: "reports_open", label: "Open reports", to: "/admin/reports" },
  { key: "verifications_pending", label: "Pending verifications", to: "/admin/verifications" },
  { key: "claims_pending", label: "Business claims", to: "/admin/claims" },
  { key: "payments_pending", label: "Payments to review", to: "/admin/payments" },
  { key: "ad_inquiries_open", label: "Ad inquiries", to: "/admin/advertisements/inquiries" },
  { key: "service_inquiries_open", label: "Service inquiries", to: "/admin/inquiries" },
  { key: "business_inquiries_open", label: "Business inquiries", to: "/admin/inquiries" },
  { key: "location_corrections_pending", label: "Location fixes", to: "/admin/location-corrections" },
  { key: "type_suggestions_pending", label: "Type suggestions", to: "/admin/type-suggestions" },
  { key: "ad_campaigns_pending", label: "Ad campaigns to review", to: "/admin/advertisements/campaigns" },
  { key: "ops_alerts_unack", label: "Ops alerts", to: "/admin/alerts" },
  { key: "support_tickets_open", label: "Support tickets", to: "/admin/inquiries" },
  { key: "discover_queue_pending", label: "Discover queue", to: "/admin/discover-businesses" },
  { key: "lead_offers_open", label: "Open lead offers", to: "/admin/lead-offers" },
];
