import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OverviewWindow = { today: number; d7: number; d30: number };
export type OverviewRevenue = { today: number; d7: number; d30: number };
export type TopReferrer = {
  code: string;
  name: string;
  scans: number;
  signups: number;
};

export type AdminOverviewData = {
  users: {
    total: number;
    signups: OverviewWindow;
    verifiedSellers: number;
    activeAccounts: number;
    foundingMembers: number;
  };
  scans: {
    total: OverviewWindow;
    partnerSignups7d: number;
    topStaff: TopReferrer[];
    topPartners: TopReferrer[];
  };
  productivity: {
    listingsCreated: OverviewWindow;
    activeListings: number;
    pendingPayment: number;
    boostsSold: OverviewWindow;
    messagesSent: OverviewWindow;
    revenue: OverviewRevenue;
    revenueTotal: number;
  };
  health: {
    pendingVerifications: number;
    pendingPayments: number;
    failedPayments24h: number;
    openReports: number;
    unacknowledgedAlerts: number;
    pendingClaimReviews: number;
  };
};

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverviewData> => {
    const { data, error } = await context.supabase.rpc("admin_overview");
    if (error) throw new Error(error.message);
    return data as unknown as AdminOverviewData;
  });
