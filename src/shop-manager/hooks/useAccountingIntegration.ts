import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { toast } from 'sonner';

export interface AccountingIntegration {
  id: string;
  shop_id: string;
  integration_type: string;
  connection_status: string;
  credentials: any;
  settings: any;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  auto_sync_enabled: boolean;
  sync_frequency: string;
  created_at: string;
  updated_at: string;
}

export interface ChartOfAccount {
  id: string;
  shop_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype: string | null;
  parent_account_id: string | null;
  description: string | null;
  is_active: boolean;
  is_system_account: boolean;
  normal_balance: string | null;
  external_account_id: string | null;
  external_account_name: string | null;
  tax_line: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  shop_id: string;
  entry_number: string;
  entry_date: string;
  entry_type: string;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  source_document: string | null;
  is_posted: boolean;
  posted_at: string | null;
  posted_by: string | null;
  is_reversed: boolean;
  reversed_by_entry_id: string | null;
  external_sync_status: string;
  external_sync_id: string | null;
  external_sync_error: string | null;
  total_debits: number;
  total_credits: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description: string | null;
  department_id: string | null;
  project_id: string | null;
  customer_id: string | null;
  vendor_id: string | null;
  line_order: number;
  created_at: string;
}

export function useAccountingIntegration() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  // Fetch integrations
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery({
    queryKey: ['accounting-integrations', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('accounting_integrations')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AccountingIntegration[];
    },
    enabled: !!shopId,
  });

  // Fetch chart of accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['chart-of-accounts', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('shop_id', shopId)
        .order('account_code');
      if (error) throw error;
      return data as ChartOfAccount[];
    },
    enabled: !!shopId,
  });

  // Fetch journal entries
  const { data: journalEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['journal-entries', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('shop_id', shopId)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return data as JournalEntry[];
    },
    enabled: !!shopId,
  });

  // Create integration
  const createIntegration = useMutation({
    mutationFn: async (integration: Partial<AccountingIntegration>) => {
      if (!shopId) throw new Error('Shop ID is required');
      const { data, error } = await supabase
        .from('accounting_integrations')
        .insert({
          integration_type: integration.integration_type || 'quickbooks_online',
          auto_sync_enabled: integration.auto_sync_enabled ?? false,
          sync_frequency: integration.sync_frequency || 'daily',
          shop_id: shopId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-integrations'] });
      toast.success('Integration created successfully');
    },
    onError: (error) => toast.error(`Failed to create integration: ${error.message}`),
  });

  // Create account
  const createAccount = useMutation({
    mutationFn: async (account: Partial<ChartOfAccount>) => {
      if (!shopId) throw new Error('Shop ID is required');
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .insert({
          account_code: account.account_code || '',
          account_name: account.account_name || '',
          account_type: account.account_type as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost_of_goods_sold' || 'asset',
          account_subtype: account.account_subtype,
          description: account.description,
          normal_balance: account.normal_balance as 'debit' | 'credit' || 'debit',
          shop_id: shopId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account created successfully');
    },
    onError: (error) => toast.error(`Failed to create account: ${error.message}`),
  });

  // Update account
  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChartOfAccount> & { id: string }) => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account updated successfully');
    },
    onError: (error) => toast.error(`Failed to update account: ${error.message}`),
  });

  // Create journal entry
  const createJournalEntry = useMutation({
    mutationFn: async ({ entry, lines }: { entry: Partial<JournalEntry>; lines: { account_id: string; debit_amount: number; credit_amount: number; description: string }[] }) => {
      if (!shopId) throw new Error('Shop ID is required');
      
      // Generate entry number
      const { data: maxEntry } = await supabase
        .from('journal_entries')
        .select('entry_number')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const nextNum = maxEntry ? parseInt(maxEntry.entry_number.replace('JE-', '')) + 1 : 1001;
      const entryNumber = `JE-${nextNum}`;

      const { data: newEntry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          entry_date: entry.entry_date || new Date().toISOString().split('T')[0],
          entry_type: entry.entry_type as 'standard' | 'adjusting' | 'closing' | 'reversing' | 'recurring' || 'standard',
          description: entry.description,
          total_debits: entry.total_debits || 0,
          total_credits: entry.total_credits || 0,
          shop_id: shopId,
          entry_number: entryNumber,
        })
        .select()
        .single();
      if (entryError) throw entryError;

      // Insert lines
      const validLines = lines.filter(l => l.account_id).map(line => ({
        journal_entry_id: newEntry.id,
        account_id: line.account_id,
        debit_amount: line.debit_amount || 0,
        credit_amount: line.credit_amount || 0,
        description: line.description || null,
      }));

      if (validLines.length > 0) {
        const { error: linesError } = await supabase
          .from('journal_entry_lines')
          .insert(validLines);
        if (linesError) throw linesError;
      }

      return newEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Journal entry created successfully');
    },
    onError: (error) => toast.error(`Failed to create journal entry: ${error.message}`),
  });

  // Post journal entry
  const postJournalEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await supabase
        .from('journal_entries')
        .update({ is_posted: true, posted_at: new Date().toISOString() })
        .eq('id', entryId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Journal entry posted successfully');
    },
    onError: (error) => toast.error(`Failed to post journal entry: ${error.message}`),
  });

  return {
    integrations,
    accounts,
    journalEntries,
    isLoading: integrationsLoading || accountsLoading || entriesLoading,
    createIntegration,
    createAccount,
    updateAccount,
    createJournalEntry,
    postJournalEntry,
  };
}
