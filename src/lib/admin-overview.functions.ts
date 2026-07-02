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

export type TrendPoint = {
  day: string;
  signups: number;
  scans: number;
  listings: number;
  boosts: number;
  messages: number;
  payments: number;
  revenue: number;
};

export type AdminOverviewTrends = {
  days: number;
  series: TrendPoint[];
};

export const getAdminOverviewTrends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { days?: number } | undefined) => {
    const raw = Number(data?.days ?? 30);
    const days = Number.isFinite(raw) ? Math.min(90, Math.max(7, Math.trunc(raw))) : 30;
    return { days };
  })
  .handler(async ({ context, data }): Promise<AdminOverviewTrends> => {
    // Cast: generated types haven't picked up the new RPC yet.
    const rpc = context.supabase.rpc as unknown as (
      fn: string,
      args?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { data: res, error } = await rpc("admin_overview_trends", { days: data.days });
    if (error) throw new Error(error.message);
    return res as AdminOverviewTrends;
  });


