import { useState, useEffect, useCallback } from 'react';
import { nonprofitAnalyticsService, AnalyticsDashboard, NonprofitAnalytics, GrantAnalytics, DonorAnalytics, FinancialHealth } from '@/services/nonprofitAnalytics';

export interface UseNonprofitAnalyticsResult {
  dashboard: AnalyticsDashboard | null;
  analytics: NonprofitAnalytics[];
  grants: GrantAnalytics[];
  donors: DonorAnalytics[];
  financialHealth: FinancialHealth[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  recordMetric: (
    metricType: string,
    metricName: string,
    metricValue: number,
    periodStart: Date,
    periodEnd: Date,
    metadata?: Record<string, any>
  ) => Promise<void>;
}

export const useNonprofitAnalytics = (
  period: 'week' | 'month' | 'quarter' | 'year' = 'month',
  metricType?: string
): UseNonprofitAnalyticsResult => {
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [analytics, setAnalytics] = useState<NonprofitAnalytics[]>([]);
  const [grants, setGrants] = useState<GrantAnalytics[]>([]);
  const [donors, setDonors] = useState<DonorAnalytics[]>([]);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        dashboardData,
        analyticsData,
        grantData,
        donorData,
        financialData
      ] = await Promise.all([
        nonprofitAnalyticsService.getDashboardOverview(),
        nonprofitAnalyticsService.getAnalytics(metricType, period),
        nonprofitAnalyticsService.getGrantAnalytics(),
        nonprofitAnalyticsService.getDonorAnalytics(),
        nonprofitAnalyticsService.getFinancialHealth()
      ]);

      setDashboard(dashboardData);
      setAnalytics(analyticsData);
      setGrants(grantData);
      setDonors(donorData);
      setFinancialHealth(financialData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [period, metricType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const recordMetric = useCallback(async (
    metricType: string,
    metricName: string,
    metricValue: number,
    periodStart: Date,
    periodEnd: Date,
    metadata: Record<string, any> = {}
  ) => {
    try {
      await nonprofitAnalyticsService.recordMetric(
        metricType,
        metricName,
        metricValue,
        periodStart,
        periodEnd,
        metadata
      );
      await refetch(); // Refresh data after recording
    } catch (err) {
      console.error('Error recording metric:', err);
      throw err;
    }
  }, [refetch]);

  return {
    dashboard,
    analytics,
    grants,
    donors,
    financialHealth,
    loading,
    error,
    refetch,
    recordMetric
  };
};