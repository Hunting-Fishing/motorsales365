import { useState, useMemo } from 'react';

export type BudgetPeriodFilter = 'all' | 'monthly' | 'quarterly' | 'yearly';
export type BudgetStatusFilter = 'all' | 'draft' | 'active' | 'completed' | 'exceeded';

export interface BudgetFilters {
  search: string;
  period: BudgetPeriodFilter;
  status: BudgetStatusFilter;
  category: string;
  dateRange: { start: Date | null; end: Date | null };
}

export interface MaintenanceBudget {
  id: string;
  budget_name: string;
  description?: string;
  budget_period: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  parts_budget: number;
  labor_budget: number;
  external_services_budget: number;
  total_spent: number;
  parts_spent: number;
  labor_spent: number;
  external_services_spent: number;
  safety_budget?: number;
  tools_budget?: number;
  fuel_budget?: number;
  ppe_budget?: number;
  insurance_budget?: number;
  safety_spent?: number;
  tools_spent?: number;
  fuel_spent?: number;
  ppe_spent?: number;
  insurance_spent?: number;
  forecasted_total: number;
  status: string;
  category_id?: string;
  equipment_id?: string;
  vehicle_id?: string;
  created_at: string;
  updated_at: string;
}

export function useBudgetFilters(budgets: MaintenanceBudget[]) {
  const [filters, setFilters] = useState<BudgetFilters>({
    search: '',
    period: 'all',
    status: 'all',
    category: 'all',
    dateRange: { start: null, end: null },
  });

  const filteredBudgets = useMemo(() => {
    return budgets.filter((budget) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          budget.budget_name.toLowerCase().includes(searchLower) ||
          (budget.description?.toLowerCase().includes(searchLower) ?? false);
        if (!matchesSearch) return false;
      }

      // Period filter
      if (filters.period !== 'all' && budget.budget_period !== filters.period) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && budget.status !== filters.status) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.start && new Date(budget.start_date) < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && new Date(budget.end_date) > filters.dateRange.end) {
        return false;
      }

      return true;
    });
  }, [budgets, filters]);

  const updateFilter = <K extends keyof BudgetFilters>(key: K, value: BudgetFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      period: 'all',
      status: 'all',
      category: 'all',
      dateRange: { start: null, end: null },
    });
  };

  // Calculate aggregated stats from filtered budgets
  const stats = useMemo(() => {
    const totals = filteredBudgets.reduce(
      (acc, budget) => ({
        totalBudget: acc.totalBudget + Number(budget.total_budget || 0),
        totalSpent: acc.totalSpent + Number(budget.total_spent || 0),
        partsBudget: acc.partsBudget + Number(budget.parts_budget || 0),
        partsSpent: acc.partsSpent + Number(budget.parts_spent || 0),
        laborBudget: acc.laborBudget + Number(budget.labor_budget || 0),
        laborSpent: acc.laborSpent + Number(budget.labor_spent || 0),
        safetyBudget: acc.safetyBudget + Number(budget.safety_budget || 0),
        safetySpent: acc.safetySpent + Number(budget.safety_spent || 0),
        toolsBudget: acc.toolsBudget + Number(budget.tools_budget || 0),
        toolsSpent: acc.toolsSpent + Number(budget.tools_spent || 0),
        fuelBudget: acc.fuelBudget + Number(budget.fuel_budget || 0),
        fuelSpent: acc.fuelSpent + Number(budget.fuel_spent || 0),
        ppeBudget: acc.ppeBudget + Number(budget.ppe_budget || 0),
        ppeSpent: acc.ppeSpent + Number(budget.ppe_spent || 0),
        insuranceBudget: acc.insuranceBudget + Number(budget.insurance_budget || 0),
        insuranceSpent: acc.insuranceSpent + Number(budget.insurance_spent || 0),
      }),
      {
        totalBudget: 0,
        totalSpent: 0,
        partsBudget: 0,
        partsSpent: 0,
        laborBudget: 0,
        laborSpent: 0,
        safetyBudget: 0,
        safetySpent: 0,
        toolsBudget: 0,
        toolsSpent: 0,
        fuelBudget: 0,
        fuelSpent: 0,
        ppeBudget: 0,
        ppeSpent: 0,
        insuranceBudget: 0,
        insuranceSpent: 0,
      }
    );

    return {
      ...totals,
      remaining: totals.totalBudget - totals.totalSpent,
      utilizationPercent: totals.totalBudget > 0 
        ? Math.round((totals.totalSpent / totals.totalBudget) * 100) 
        : 0,
    };
  }, [filteredBudgets]);

  return {
    filters,
    filteredBudgets,
    stats,
    updateFilter,
    resetFilters,
  };
}
