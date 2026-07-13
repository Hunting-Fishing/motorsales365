import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';

export interface FinancialOverview {
  totalBudget: number;
  ytdExpenses: number;
  budgetUtilization: number;
  grantFunds: number;
  taxFilingsDue: number;
  totalAssetValue: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  description: string | null;
  budgetLimit: number;
  actualSpent: number;
  utilization: number;
  status: 'on_track' | 'monitoring' | 'over_budget';
}

export interface TaxFiling {
  id: string;
  filing_name: string;
  filing_type: string;
  due_date: string;
  status: string;
  filing_year: number;
}

export function useFinancialDashboard() {
  const { shopId } = useShopId();
  const currentYear = new Date().getFullYear();

  // Get financial overview
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['financial-overview', shopId, currentYear],
    queryFn: async (): Promise<FinancialOverview> => {
      if (!shopId) throw new Error('Shop ID required');

      // Get budget totals
      const { data: budgetData } = await supabase
        .from('budget_entries')
        .select('planned_amount, actual_amount')
        .eq('shop_id', shopId)
        .eq('fiscal_year', currentYear);

      const totalBudget = budgetData?.reduce((sum, b) => sum + (Number(b.planned_amount) || 0), 0) || 0;
      const ytdExpenses = budgetData?.reduce((sum, b) => sum + (Number(b.actual_amount) || 0), 0) || 0;

      // Get grant funds
      const { data: grants } = await supabase
        .from('grants')
        .select('amount_awarded')
        .eq('shop_id', shopId)
        .eq('status', 'active');

      const grantFunds = grants?.reduce((sum, g) => sum + (Number(g.amount_awarded) || 0), 0) || 0;

      // Get tax filings due
      const { count: taxFilingsDue } = await supabase
        .from('annual_filings')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .in('status', ['pending', 'draft', 'overdue']);

      // Get asset value
      const { data: assets } = await supabase
        .from('asset_tracking')
        .select('current_value')
        .eq('shop_id', shopId);

      const totalAssetValue = assets?.reduce((sum, a) => sum + (Number(a.current_value) || 0), 0) || 0;

      return {
        totalBudget,
        ytdExpenses,
        budgetUtilization: totalBudget > 0 ? (ytdExpenses / totalBudget) * 100 : 0,
        grantFunds,
        taxFilingsDue: taxFilingsDue || 0,
        totalAssetValue,
      };
    },
    enabled: !!shopId,
  });

  // Get budget categories with actual spending
  const { data: budgetCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['budget-categories-dashboard', shopId, currentYear],
    queryFn: async (): Promise<BudgetCategory[]> => {
      if (!shopId) return [];

      const { data: categories } = await supabase
        .from('budget_categories')
        .select('id, name, description, budget_limit')
        .eq('shop_id', shopId)
        .eq('is_active', true);

      if (!categories) return [];

      const { data: entries } = await supabase
        .from('budget_entries')
        .select('category_id, actual_amount')
        .eq('shop_id', shopId)
        .eq('fiscal_year', currentYear);

      return categories.map(cat => {
        const categoryEntries = entries?.filter(e => e.category_id === cat.id) || [];
        const actualSpent = categoryEntries.reduce((sum, e) => sum + (Number(e.actual_amount) || 0), 0);
        const budgetLimit = Number(cat.budget_limit) || 0;
        const utilization = budgetLimit > 0 ? (actualSpent / budgetLimit) * 100 : 0;

        return {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          budgetLimit,
          actualSpent,
          utilization,
          status: utilization > 100 ? 'over_budget' : utilization > 80 ? 'monitoring' : 'on_track',
        };
      });
    },
    enabled: !!shopId,
  });

  // Get tax filings
  const { data: taxFilings = [], isLoading: filingsLoading } = useQuery({
    queryKey: ['tax-filings-dashboard', shopId],
    queryFn: async (): Promise<TaxFiling[]> => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('annual_filings')
        .select('id, filing_name, filing_type, due_date, status, filing_year')
        .eq('shop_id', shopId)
        .order('due_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  return {
    overview: overview || {
      totalBudget: 0,
      ytdExpenses: 0,
      budgetUtilization: 0,
      grantFunds: 0,
      taxFilingsDue: 0,
      totalAssetValue: 0,
    },
    budgetCategories,
    taxFilings,
    isLoading: overviewLoading || categoriesLoading || filingsLoading,
  };
}
