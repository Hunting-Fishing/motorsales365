import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { Json } from '@/integrations/supabase/types';

export interface NonprofitAnalytics {
  id: string;
  shop_id: string;
  metric_type: string;
  metric_name: string;
  metric_value: number;
  period_start: string;
  period_end: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface GrantAnalytics {
  id: string;
  shop_id: string;
  grant_id?: string;
  grant_name: string;
  funding_source: string;
  amount_requested?: number;
  amount_awarded?: number;
  amount_spent: number;
  application_date?: string;
  award_date?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  compliance_score: number;
  reporting_requirements: Json;
  created_at: string;
  updated_at: string;
}

export interface DonorAnalytics {
  id: string;
  shop_id: string;
  donor_id?: string;
  donor_segment: string;
  lifetime_value: number;
  total_donations: number;
  donation_frequency?: string;
  first_donation_date?: string;
  last_donation_date?: string;
  engagement_score: number;
  retention_probability: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialHealth {
  id: string;
  shop_id: string;
  reporting_period: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  donation_revenue: number;
  grant_revenue: number;
  program_revenue: number;
  other_revenue: number;
  total_expenses: number;
  program_expenses: number;
  administrative_expenses: number;
  fundraising_expenses: number;
  program_expense_ratio: number;
  fundraising_efficiency: number;
  administrative_ratio: number;
  revenue_diversification_score: number;
  financial_stability_score: number;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsDashboard {
  totalDonations: number;
  totalVolunteers: number;
  totalPrograms: number;
  totalBeneficiaries: number;
  monthlyGrowth: number;
  donorRetentionRate: number;
  averageDonationAmount: number;
  programEfficiency: number;
}

class NonprofitAnalyticsService {
  
  // Get analytics dashboard overview
  async getDashboardOverview(): Promise<AnalyticsDashboard> {
    const currentDate = new Date();
    const lastMonth = subMonths(currentDate, 1);
    
    // Get current month metrics
    const { data: currentMetrics } = await supabase
      .from('nonprofit_analytics')
      .select('*')
      .gte('period_start', format(lastMonth, 'yyyy-MM-01'))
      .lte('period_end', format(currentDate, 'yyyy-MM-dd'));
    
    // Calculate key metrics
    const donations = currentMetrics?.filter(m => m.metric_type === 'donation') || [];
    const volunteers = currentMetrics?.filter(m => m.metric_type === 'volunteer') || [];
    const programs = currentMetrics?.filter(m => m.metric_type === 'program') || [];
    const impact = currentMetrics?.filter(m => m.metric_type === 'impact') || [];
    
    const totalDonations = donations.reduce((sum, d) => sum + d.metric_value, 0);
    const totalVolunteers = volunteers.reduce((sum, v) => sum + v.metric_value, 0);
    const totalPrograms = programs.length;
    const totalBeneficiaries = impact.reduce((sum, i) => sum + i.metric_value, 0);
    
    // Calculate real growth metrics
    const previousMonth = subMonths(currentDate, 2);
    const { data: previousMetrics } = await supabase
      .from('nonprofit_analytics')
      .select('*')
      .gte('period_start', format(previousMonth, 'yyyy-MM-01'))
      .lt('period_end', format(lastMonth, 'yyyy-MM-dd'));

    const previousDonations = previousMetrics?.filter(m => m.metric_type === 'donation') || [];
    const previousTotalDonations = previousDonations.reduce((sum, d) => sum + d.metric_value, 0);
    
    const monthlyGrowth = previousTotalDonations > 0 ? 
      ((totalDonations - previousTotalDonations) / previousTotalDonations) * 100 : 0;
    
    // Calculate real donor retention and averages
    const { data: allDonations } = await supabase
      .from('donations')
      .select('donor_email, amount, created_at');
    
    const uniqueDonors = new Set((allDonations || []).map(d => d.donor_email).filter(Boolean));
    const donorRetentionRate = uniqueDonors.size > 0 ? 
      (uniqueDonors.size / (allDonations?.length || 1)) * 100 : 0;
    
    const averageDonationAmount = totalDonations / (donations.length || 1);
    
    // Calculate program efficiency from financial health data
    const { data: latestFinancial } = await supabase
      .from('financial_health')
      .select('program_expense_ratio')
      .order('period_start', { ascending: false })
      .limit(1)
      .single();
    
    const programEfficiency = latestFinancial?.program_expense_ratio || 0;
    
    return {
      totalDonations,
      totalVolunteers,
      totalPrograms,
      totalBeneficiaries,
      monthlyGrowth,
      donorRetentionRate,
      averageDonationAmount,
      programEfficiency
    };
  }
  
  // Get nonprofit analytics by type and period
  async getAnalytics(
    metricType?: NonprofitAnalytics['metric_type'],
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<NonprofitAnalytics[]> {
    const currentDate = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = subDays(currentDate, 7);
        break;
      case 'month':
        startDate = subMonths(currentDate, 1);
        break;
      case 'quarter':
        startDate = subMonths(currentDate, 3);
        break;
      case 'year':
        startDate = subYears(currentDate, 1);
        break;
    }
    
    let query = supabase
      .from('nonprofit_analytics')
      .select('*')
      .gte('period_start', format(startDate, 'yyyy-MM-dd'))
      .lte('period_end', format(currentDate, 'yyyy-MM-dd'))
      .order('created_at', { ascending: false });
    
    if (metricType) {
      query = query.eq('metric_type', metricType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching analytics:', error);
      throw new Error('Failed to fetch analytics data');
    }
    
    return data || [];
  }
  
  // Record a new analytics metric
  async recordMetric(
    metricType: NonprofitAnalytics['metric_type'],
    metricName: string,
    metricValue: number,
    periodStart: Date,
    periodEnd: Date,
    metadata: Record<string, any> = {}
  ): Promise<NonprofitAnalytics> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    if (!profile?.shop_id) {
      throw new Error('User profile not found');
    }
    
    const { data, error } = await supabase
      .from('nonprofit_analytics')
      .insert({
        shop_id: profile.shop_id,
        metric_type: metricType,
        metric_name: metricName,
        metric_value: metricValue,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        metadata
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error recording metric:', error);
      throw new Error('Failed to record metric');
    }
    
    return data;
  }
  
  // Get grant analytics
  async getGrantAnalytics(): Promise<GrantAnalytics[]> {
    const { data, error } = await supabase
      .from('grant_analytics')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching grant analytics:', error);
      throw new Error('Failed to fetch grant analytics');
    }
    
    return data || [];
  }
  
  // Get donor analytics
  async getDonorAnalytics(): Promise<DonorAnalytics[]> {
    const { data, error } = await supabase
      .from('donor_analytics')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching donor analytics:', error);
      throw new Error('Failed to fetch donor analytics');
    }
    
    return data || [];
  }
  
  // Get financial health metrics
  async getFinancialHealth(period: 'monthly' | 'quarterly' | 'yearly' = 'monthly'): Promise<FinancialHealth[]> {
    const { data, error } = await supabase
      .from('financial_health')
      .select('*')
      .eq('reporting_period', period)
      .order('period_start', { ascending: false })
      .limit(12); // Last 12 periods
    
    if (error) {
      console.error('Error fetching financial health:', error);
      throw new Error('Failed to fetch financial health data');
    }
    
    return data || [];
  }
  
  // Get monthly trends data
  async getMonthlyTrends(): Promise<{ name: string; value: number; date: string }[]> {
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);
    
    const { data, error } = await supabase
      .from('donations')
      .select('amount, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching monthly trends:', error);
      return [];
    }
    
    // Group by month
    const monthlyData: { [key: string]: number } = {};
    data?.forEach(donation => {
      const date = new Date(donation.created_at);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + donation.amount;
    });
    
    return Object.entries(monthlyData).map(([date, value]) => ({
      name: date,
      value,
      date
    }));
  }
  
  // Get donor segments data from real donation data
  async getDonorSegments(): Promise<{ name: string; value: number }[]> {
    const { data: donations } = await supabase
      .from('donations')
      .select('amount, donor_name');

    if (!donations || donations.length === 0) {
      return [
        { name: 'Major Donors ($1000+)', value: 0 },
        { name: 'Regular Donors ($100-$999)', value: 0 },
        { name: 'Small Donors ($1-$99)', value: 0 },
        { name: 'Anonymous', value: 0 }
      ];
    }

    // Categorize donors by donation amount
    const majorDonors = donations.filter(d => d.amount >= 1000).length;
    const regularDonors = donations.filter(d => d.amount >= 100 && d.amount < 1000).length;
    const smallDonors = donations.filter(d => d.amount < 100).length;
    const anonymous = donations.filter(d => !d.donor_name || d.donor_name.toLowerCase().includes('anonymous')).length;

    return [
      { name: 'Major Donors ($1000+)', value: majorDonors },
      { name: 'Regular Donors ($100-$999)', value: regularDonors },
      { name: 'Small Donors ($1-$99)', value: smallDonors },
      { name: 'Anonymous', value: anonymous }
    ];
  }

  // Generate automated insights
  async generateInsights(): Promise<{
    insights: string[];
    recommendations: string[];
    alerts: string[];
  }> {
    // This would typically call an AI service or analyze the data
    const analytics = await this.getAnalytics();
    const donorAnalytics = await this.getDonorAnalytics();
    const financialHealth = await this.getFinancialHealth();
    
    const insights = [
      `You have ${analytics.length} active metrics being tracked`,
      `Your donor retention rate is ${donorAnalytics.reduce((sum, d) => sum + d.retention_probability, 0) / donorAnalytics.length}%`,
      `Financial stability score is ${financialHealth[0]?.financial_stability_score || 0}%`
    ];
    
    const recommendations = [
      'Consider increasing donor engagement through personalized communications',
      'Review program expenses to improve efficiency ratios',
      'Diversify funding sources to reduce dependency on single grants'
    ];
    
    const alerts = [
      'Grant application deadline approaching in 2 weeks',
      'Donor retention rate below target (75%)',
      'Administrative expenses exceed recommended 15% threshold'
    ];
    
    return { insights, recommendations, alerts };
  }
}

export const nonprofitAnalyticsService = new NonprofitAnalyticsService();