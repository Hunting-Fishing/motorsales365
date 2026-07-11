import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BudgetCategory {
  id: string;
  name: string;
  description: string | null;
  budget_limit: number | null;
  parent_category_id: string | null;
  is_active: boolean;
  shop_id: string;
  created_at: string;
}

export interface BudgetEntry {
  id: string;
  shop_id: string;
  category_id: string | null;
  fiscal_year: number;
  quarter: number | null;
  month: number | null;
  planned_amount: number;
  actual_amount: number;
  budget_type: string;
  notes: string | null;
  is_locked: boolean;
  created_at: string;
  category?: BudgetCategory;
}

export interface BudgetSummary {
  totalPlanned: number;
  totalActual: number;
  variance: number;
  variancePercent: number;
  categorySummaries: CategoryBudgetSummary[];
}

export interface CategoryBudgetSummary {
  categoryId: string;
  categoryName: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
  utilizationPercent: number;
}

export function useBudgetData(fiscalYear?: number, period?: 'month' | 'quarter' | 'year') {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = fiscalYear || new Date().getFullYear();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch budget categories
      const { data: categoriesData, error: catError } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (catError) throw catError;

      // Fetch budget entries for the fiscal year
      const { data: entriesData, error: entError } = await supabase
        .from('budget_entries')
        .select('*')
        .eq('fiscal_year', currentYear)
        .order('month', { ascending: true });

      if (entError) throw entError;

      const cats = (categoriesData || []) as BudgetCategory[];
      const ents = (entriesData || []) as BudgetEntry[];

      // Attach category info to entries
      const entriesWithCategory = ents.map(entry => ({
        ...entry,
        category: cats.find(c => c.id === entry.category_id)
      }));

      setCategories(cats);
      setEntries(entriesWithCategory);

      // Calculate summary
      const totalPlanned = ents.reduce((sum, e) => sum + (e.planned_amount || 0), 0);
      const totalActual = ents.reduce((sum, e) => sum + (e.actual_amount || 0), 0);
      const variance = totalPlanned - totalActual;
      const variancePercent = totalPlanned > 0 ? (variance / totalPlanned) * 100 : 0;

      // Group by category
      const categoryMap = new Map<string, { planned: number; actual: number; name: string }>();
      ents.forEach(entry => {
        const catId = entry.category_id || 'uncategorized';
        const catName = cats.find(c => c.id === catId)?.name || 'Uncategorized';
        const existing = categoryMap.get(catId) || { planned: 0, actual: 0, name: catName };
        categoryMap.set(catId, {
          name: catName,
          planned: existing.planned + (entry.planned_amount || 0),
          actual: existing.actual + (entry.actual_amount || 0)
        });
      });

      const categorySummaries: CategoryBudgetSummary[] = Array.from(categoryMap.entries()).map(([id, data]) => ({
        categoryId: id,
        categoryName: data.name,
        planned: data.planned,
        actual: data.actual,
        variance: data.planned - data.actual,
        variancePercent: data.planned > 0 ? ((data.planned - data.actual) / data.planned) * 100 : 0,
        utilizationPercent: data.planned > 0 ? (data.actual / data.planned) * 100 : 0
      }));

      setSummary({
        totalPlanned,
        totalActual,
        variance,
        variancePercent,
        categorySummaries
      });

    } catch (err) {
      console.error('Error fetching budget data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch budget data');
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createCategory = async (data: Partial<BudgetCategory>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single();

    if (!profile?.shop_id) throw new Error('No shop found');

    const { error } = await supabase
      .from('budget_categories')
      .insert({
        name: data.name || '',
        description: data.description,
        budget_limit: data.budget_limit,
        shop_id: profile.shop_id,
        created_by: user.id
      });

    if (error) throw error;
    await fetchData();
  };

  const updateCategory = async (id: string, data: Partial<BudgetCategory>) => {
    const { error } = await supabase
      .from('budget_categories')
      .update({
        name: data.name,
        description: data.description,
        budget_limit: data.budget_limit
      })
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('budget_categories')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  const createEntry = async (data: Partial<BudgetEntry>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single();

    if (!profile?.shop_id) throw new Error('No shop found');

    const { error } = await supabase
      .from('budget_entries')
      .insert({
        category_id: data.category_id,
        fiscal_year: data.fiscal_year || new Date().getFullYear(),
        budget_type: data.budget_type || 'monthly',
        month: data.month,
        quarter: data.quarter,
        planned_amount: data.planned_amount || 0,
        actual_amount: data.actual_amount || 0,
        notes: data.notes,
        shop_id: profile.shop_id,
        created_by: user.id
      });

    if (error) throw error;
    await fetchData();
  };

  const updateEntry = async (id: string, data: Partial<BudgetEntry>) => {
    const { error } = await supabase
      .from('budget_entries')
      .update(data)
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  return {
    categories,
    entries,
    summary,
    loading,
    error,
    refetch: fetchData,
    createCategory,
    updateCategory,
    deleteCategory,
    createEntry,
    updateEntry
  };
}
