import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { toast } from 'sonner';

export interface FinancialPeriod {
  id: string;
  shop_id: string;
  period_name: string;
  period_type: string;
  start_date: string;
  end_date: string;
  fiscal_year: number;
  fiscal_month: number | null;
  fiscal_quarter: number | null;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
  retained_earnings_entry_id: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePeriodInput {
  period_name: string;
  period_type: 'month' | 'quarter' | 'year';
  start_date: string;
  end_date: string;
  fiscal_year: number;
  notes?: string;
}

export function useFinancialPeriods() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['financial-periods', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('financial_periods')
        .select('*')
        .eq('shop_id', shopId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as FinancialPeriod[];
    },
    enabled: !!shopId,
  });

  const createPeriod = useMutation({
    mutationFn: async (input: CreatePeriodInput) => {
      if (!shopId) throw new Error('Shop ID required');
      const { data, error } = await supabase
        .from('financial_periods')
        .insert({
          shop_id: shopId,
          period_name: input.period_name,
          period_type: input.period_type,
          start_date: input.start_date,
          end_date: input.end_date,
          fiscal_year: input.fiscal_year,
          notes: input.notes,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-periods'] });
      toast.success('Financial period created');
    },
    onError: (error) => toast.error(`Failed to create period: ${error.message}`),
  });

  const closePeriod = useMutation({
    mutationFn: async (periodId: string) => {
      if (!shopId) throw new Error('Shop ID required');

      const period = periods.find(p => p.id === periodId);
      if (!period) throw new Error('Period not found');
      if (period.is_closed) throw new Error('Period already closed');

      // Get income statement data for the period to calculate net income
      const { data: accounts, error: accError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .in('account_type', ['revenue', 'expense', 'cost_of_goods_sold']);
      if (accError) throw accError;

      const { data: entries, error: entryError } = await supabase
        .from('journal_entries')
        .select(`
          id,
          journal_entry_lines (
            account_id,
            debit_amount,
            credit_amount
          )
        `)
        .eq('shop_id', shopId)
        .eq('is_posted', true)
        .gte('entry_date', period.start_date)
        .lte('entry_date', period.end_date);
      if (entryError) throw entryError;

      // Calculate net income
      const balanceMap = new Map<string, number>();
      accounts?.forEach(acc => balanceMap.set(acc.id, 0));

      entries?.forEach(entry => {
        (entry.journal_entry_lines as any[])?.forEach(line => {
          const acc = accounts?.find(a => a.id === line.account_id);
          if (acc) {
            const delta = acc.account_type === 'revenue'
              ? (line.credit_amount || 0) - (line.debit_amount || 0)
              : (line.debit_amount || 0) - (line.credit_amount || 0);
            balanceMap.set(line.account_id, (balanceMap.get(line.account_id) || 0) + delta);
          }
        });
      });

      let totalRevenue = 0;
      let totalExpenses = 0;
      accounts?.forEach(acc => {
        const balance = balanceMap.get(acc.id) || 0;
        if (acc.account_type === 'revenue') totalRevenue += balance;
        else totalExpenses += balance;
      });

      const netIncome = totalRevenue - totalExpenses;

      // Find retained earnings account
      const { data: retainedEarnings } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('shop_id', shopId)
        .eq('account_type', 'equity')
        .ilike('account_name', '%retained earnings%')
        .limit(1)
        .single();

      let retainedEarningsEntryId = null;

      // Create closing journal entry if there's net income and retained earnings account
      if (netIncome !== 0 && retainedEarnings) {
        const { data: maxEntry } = await supabase
          .from('journal_entries')
          .select('entry_number')
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const nextNum = maxEntry ? parseInt(maxEntry.entry_number.replace('JE-', '')) + 1 : 1001;

        const { data: closingEntry, error: closingError } = await supabase
          .from('journal_entries')
          .insert({
            shop_id: shopId,
            entry_number: `JE-${nextNum}`,
            entry_date: period.end_date,
            entry_type: 'closing',
            description: `Period closing: ${period.period_name}`,
            total_debits: Math.abs(netIncome),
            total_credits: Math.abs(netIncome),
            is_posted: true,
            posted_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (closingError) throw closingError;

        retainedEarningsEntryId = closingEntry.id;

        // Note: In a real system, you'd create closing entries for each revenue/expense account
        // For simplicity, we just record the net effect to retained earnings
      }

      // Mark period as closed
      const { data, error } = await supabase
        .from('financial_periods')
        .update({
          is_closed: true,
          closed_at: new Date().toISOString(),
          retained_earnings_entry_id: retainedEarningsEntryId,
        })
        .eq('id', periodId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-periods'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Period closed successfully');
    },
    onError: (error) => toast.error(`Failed to close period: ${error.message}`),
  });

  const deletePeriod = useMutation({
    mutationFn: async (id: string) => {
      const period = periods.find(p => p.id === id);
      if (period?.is_closed) throw new Error('Cannot delete a closed period');
      const { error } = await supabase
        .from('financial_periods')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-periods'] });
      toast.success('Period deleted');
    },
    onError: (error) => toast.error(`Failed to delete period: ${error.message}`),
  });

  return {
    periods,
    isLoading,
    createPeriod,
    closePeriod,
    deletePeriod,
  };
}
