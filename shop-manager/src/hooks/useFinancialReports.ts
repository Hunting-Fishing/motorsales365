import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';

export interface AccountBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  debit_total: number;
  credit_total: number;
  balance: number;
}

export interface TrialBalanceData {
  accounts: AccountBalance[];
  totalDebits: number;
  totalCredits: number;
  asOfDate: string;
}

export interface IncomeStatementData {
  revenue: AccountBalance[];
  expenses: AccountBalance[];
  costOfGoodsSold: AccountBalance[];
  totalRevenue: number;
  totalExpenses: number;
  totalCOGS: number;
  grossProfit: number;
  netIncome: number;
  periodStart: string;
  periodEnd: string;
}

export interface BalanceSheetData {
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  equity: AccountBalance[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  asOfDate: string;
}

export interface GeneralLedgerEntry {
  id: string;
  entry_date: string;
  entry_number: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
}

export interface GeneralLedgerData {
  account: {
    id: string;
    account_code: string;
    account_name: string;
    account_type: string;
  };
  entries: GeneralLedgerEntry[];
  openingBalance: number;
  closingBalance: number;
}

export function useFinancialReports() {
  const { shopId } = useShopId();

  // Get Trial Balance
  const useTrialBalance = (asOfDate: string) => {
    return useQuery({
      queryKey: ['trial-balance', shopId, asOfDate],
      queryFn: async (): Promise<TrialBalanceData> => {
        if (!shopId) throw new Error('Shop ID required');

        // Get all accounts
        const { data: accounts, error: accError } = await supabase
          .from('chart_of_accounts')
          .select('*')
          .eq('shop_id', shopId)
          .eq('is_active', true)
          .order('account_code');
        if (accError) throw accError;

        // Get all posted journal entry lines up to the date
        const { data: entries, error: entryError } = await supabase
          .from('journal_entries')
          .select(`
            id,
            entry_date,
            journal_entry_lines (
              account_id,
              debit_amount,
              credit_amount
            )
          `)
          .eq('shop_id', shopId)
          .eq('is_posted', true)
          .lte('entry_date', asOfDate);
        if (entryError) throw entryError;

        // Calculate balances per account
        const balanceMap = new Map<string, { debits: number; credits: number }>();
        accounts?.forEach(acc => balanceMap.set(acc.id, { debits: 0, credits: 0 }));

        entries?.forEach(entry => {
          (entry.journal_entry_lines as any[])?.forEach(line => {
            const existing = balanceMap.get(line.account_id);
            if (existing) {
              existing.debits += Number(line.debit_amount) || 0;
              existing.credits += Number(line.credit_amount) || 0;
            }
          });
        });

        const accountBalances: AccountBalance[] = (accounts || []).map(acc => {
          const totals = balanceMap.get(acc.id) || { debits: 0, credits: 0 };
          const balance = acc.normal_balance === 'debit'
            ? totals.debits - totals.credits
            : totals.credits - totals.debits;
          return {
            account_id: acc.id,
            account_code: acc.account_code,
            account_name: acc.account_name,
            account_type: acc.account_type,
            normal_balance: acc.normal_balance || 'debit',
            debit_total: totals.debits,
            credit_total: totals.credits,
            balance,
          };
        });

        const totalDebits = accountBalances.reduce((sum, a) => sum + a.debit_total, 0);
        const totalCredits = accountBalances.reduce((sum, a) => sum + a.credit_total, 0);

        return {
          accounts: accountBalances,
          totalDebits,
          totalCredits,
          asOfDate,
        };
      },
      enabled: !!shopId && !!asOfDate,
    });
  };

  // Get Income Statement
  const useIncomeStatement = (periodStart: string, periodEnd: string) => {
    return useQuery({
      queryKey: ['income-statement', shopId, periodStart, periodEnd],
      queryFn: async (): Promise<IncomeStatementData> => {
        if (!shopId) throw new Error('Shop ID required');

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
          .gte('entry_date', periodStart)
          .lte('entry_date', periodEnd);
        if (entryError) throw entryError;

        const balanceMap = new Map<string, { debits: number; credits: number }>();
        accounts?.forEach(acc => balanceMap.set(acc.id, { debits: 0, credits: 0 }));

        entries?.forEach(entry => {
          (entry.journal_entry_lines as any[])?.forEach(line => {
            const existing = balanceMap.get(line.account_id);
            if (existing) {
              existing.debits += Number(line.debit_amount) || 0;
              existing.credits += Number(line.credit_amount) || 0;
            }
          });
        });

        const mapAccount = (acc: any): AccountBalance => {
          const totals = balanceMap.get(acc.id) || { debits: 0, credits: 0 };
          const balance = acc.account_type === 'revenue'
            ? totals.credits - totals.debits
            : totals.debits - totals.credits;
          return {
            account_id: acc.id,
            account_code: acc.account_code,
            account_name: acc.account_name,
            account_type: acc.account_type,
            normal_balance: acc.normal_balance || 'credit',
            debit_total: totals.debits,
            credit_total: totals.credits,
            balance,
          };
        };

        const revenue = (accounts || []).filter(a => a.account_type === 'revenue').map(mapAccount);
        const expenses = (accounts || []).filter(a => a.account_type === 'expense').map(mapAccount);
        const costOfGoodsSold = (accounts || []).filter(a => a.account_type === 'cost_of_goods_sold').map(mapAccount);

        const totalRevenue = revenue.reduce((sum, a) => sum + a.balance, 0);
        const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0);
        const totalCOGS = costOfGoodsSold.reduce((sum, a) => sum + a.balance, 0);
        const grossProfit = totalRevenue - totalCOGS;
        const netIncome = grossProfit - totalExpenses;

        return {
          revenue,
          expenses,
          costOfGoodsSold,
          totalRevenue,
          totalExpenses,
          totalCOGS,
          grossProfit,
          netIncome,
          periodStart,
          periodEnd,
        };
      },
      enabled: !!shopId && !!periodStart && !!periodEnd,
    });
  };

  // Get Balance Sheet
  const useBalanceSheet = (asOfDate: string) => {
    return useQuery({
      queryKey: ['balance-sheet', shopId, asOfDate],
      queryFn: async (): Promise<BalanceSheetData> => {
        if (!shopId) throw new Error('Shop ID required');

        const { data: accounts, error: accError } = await supabase
          .from('chart_of_accounts')
          .select('*')
          .eq('shop_id', shopId)
          .eq('is_active', true)
          .in('account_type', ['asset', 'liability', 'equity']);
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
          .lte('entry_date', asOfDate);
        if (entryError) throw entryError;

        const balanceMap = new Map<string, { debits: number; credits: number }>();
        accounts?.forEach(acc => balanceMap.set(acc.id, { debits: 0, credits: 0 }));

        entries?.forEach(entry => {
          (entry.journal_entry_lines as any[])?.forEach(line => {
            const existing = balanceMap.get(line.account_id);
            if (existing) {
              existing.debits += Number(line.debit_amount) || 0;
              existing.credits += Number(line.credit_amount) || 0;
            }
          });
        });

        const mapAccount = (acc: any): AccountBalance => {
          const totals = balanceMap.get(acc.id) || { debits: 0, credits: 0 };
          const balance = acc.account_type === 'asset'
            ? totals.debits - totals.credits
            : totals.credits - totals.debits;
          return {
            account_id: acc.id,
            account_code: acc.account_code,
            account_name: acc.account_name,
            account_type: acc.account_type,
            normal_balance: acc.normal_balance || 'debit',
            debit_total: totals.debits,
            credit_total: totals.credits,
            balance,
          };
        };

        const assets = (accounts || []).filter(a => a.account_type === 'asset').map(mapAccount);
        const liabilities = (accounts || []).filter(a => a.account_type === 'liability').map(mapAccount);
        const equity = (accounts || []).filter(a => a.account_type === 'equity').map(mapAccount);

        return {
          assets,
          liabilities,
          equity,
          totalAssets: assets.reduce((sum, a) => sum + a.balance, 0),
          totalLiabilities: liabilities.reduce((sum, a) => sum + a.balance, 0),
          totalEquity: equity.reduce((sum, a) => sum + a.balance, 0),
          asOfDate,
        };
      },
      enabled: !!shopId && !!asOfDate,
    });
  };

  // Get General Ledger for a specific account
  const useGeneralLedger = (accountId: string, startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['general-ledger', shopId, accountId, startDate, endDate],
      queryFn: async (): Promise<GeneralLedgerData> => {
        if (!shopId || !accountId) throw new Error('Shop ID and Account ID required');

        // Get account info
        const { data: account, error: accError } = await supabase
          .from('chart_of_accounts')
          .select('*')
          .eq('id', accountId)
          .single();
        if (accError) throw accError;

        // Get opening balance (entries before start date)
        const { data: priorEntries, error: priorError } = await supabase
          .from('journal_entries')
          .select(`
            journal_entry_lines!inner (
              account_id,
              debit_amount,
              credit_amount
            )
          `)
          .eq('shop_id', shopId)
          .eq('is_posted', true)
          .eq('journal_entry_lines.account_id', accountId)
          .lt('entry_date', startDate);
        if (priorError) throw priorError;

        let openingBalance = 0;
        priorEntries?.forEach(entry => {
          (entry.journal_entry_lines as any[])?.forEach(line => {
            if (line.account_id === accountId) {
              const delta = account.normal_balance === 'debit'
                ? (line.debit_amount || 0) - (line.credit_amount || 0)
                : (line.credit_amount || 0) - (line.debit_amount || 0);
              openingBalance += delta;
            }
          });
        });

        // Get entries in period
        const { data: periodEntries, error: periodError } = await supabase
          .from('journal_entries')
          .select(`
            id,
            entry_number,
            entry_date,
            description,
            journal_entry_lines!inner (
              account_id,
              debit_amount,
              credit_amount,
              description
            )
          `)
          .eq('shop_id', shopId)
          .eq('is_posted', true)
          .eq('journal_entry_lines.account_id', accountId)
          .gte('entry_date', startDate)
          .lte('entry_date', endDate)
          .order('entry_date', { ascending: true });
        if (periodError) throw periodError;

        let runningBalance = openingBalance;
        const entries: GeneralLedgerEntry[] = (periodEntries || []).flatMap(entry => {
          return (entry.journal_entry_lines as any[])
            .filter(line => line.account_id === accountId)
            .map(line => {
              const delta = account.normal_balance === 'debit'
                ? (line.debit_amount || 0) - (line.credit_amount || 0)
                : (line.credit_amount || 0) - (line.debit_amount || 0);
              runningBalance += delta;
              return {
                id: entry.id,
                entry_date: entry.entry_date,
                entry_number: entry.entry_number,
                description: line.description || entry.description || '',
                debit_amount: line.debit_amount || 0,
                credit_amount: line.credit_amount || 0,
                running_balance: runningBalance,
              };
            });
        });

        return {
          account: {
            id: account.id,
            account_code: account.account_code,
            account_name: account.account_name,
            account_type: account.account_type,
          },
          entries,
          openingBalance,
          closingBalance: runningBalance,
        };
      },
      enabled: !!shopId && !!accountId && !!startDate && !!endDate,
    });
  };

  return {
    useTrialBalance,
    useIncomeStatement,
    useBalanceSheet,
    useGeneralLedger,
  };
}
