import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { toast } from 'sonner';

export interface RecurringJournalTemplate {
  id: string;
  shop_id: string;
  template_name: string;
  description: string | null;
  frequency: string;
  template_lines: any;
  is_active: boolean;
  auto_post: boolean | null;
  next_run_date: string | null;
  last_run_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRecurringTemplateInput {
  template_name: string;
  description?: string;
  frequency: string;
  template_lines?: any[];
  is_active?: boolean;
  auto_post?: boolean;
  next_run_date?: string;
}

export function useRecurringJournalTemplates() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['recurring-journal-templates', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('recurring_journal_templates')
        .select('*')
        .eq('shop_id', shopId)
        .order('template_name');
      if (error) throw error;
      return data as RecurringJournalTemplate[];
    },
    enabled: !!shopId,
  });

  const createTemplate = useMutation({
    mutationFn: async (input: CreateRecurringTemplateInput) => {
      if (!shopId) throw new Error('Shop ID required');
      const { data, error } = await supabase
        .from('recurring_journal_templates')
        .insert({
          shop_id: shopId,
          template_name: input.template_name,
          description: input.description,
          frequency: input.frequency,
          template_lines: input.template_lines ? JSON.stringify(input.template_lines) : null,
          is_active: input.is_active ?? true,
          auto_post: input.auto_post ?? false,
          next_run_date: input.next_run_date,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-journal-templates'] });
      toast.success('Recurring template created');
    },
    onError: (error) => toast.error(`Failed to create template: ${error.message}`),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringJournalTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('recurring_journal_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-journal-templates'] });
      toast.success('Template updated');
    },
    onError: (error) => toast.error(`Failed to update template: ${error.message}`),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_journal_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-journal-templates'] });
      toast.success('Template deleted');
    },
    onError: (error) => toast.error(`Failed to delete template: ${error.message}`),
  });

  const runTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');
      if (!shopId) throw new Error('Shop ID required');

      const { data: maxEntry } = await supabase
        .from('journal_entries')
        .select('entry_number')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const nextNum = maxEntry ? parseInt(maxEntry.entry_number.replace('JE-', '')) + 1 : 1001;
      const entryNumber = `JE-${nextNum}`;

      const lines = template.template_lines ? (typeof template.template_lines === 'string' ? JSON.parse(template.template_lines) : template.template_lines) : [];
      const totalDebits = lines.reduce((s: number, l: any) => s + (l.debit_amount || 0), 0);
      const totalCredits = lines.reduce((s: number, l: any) => s + (l.credit_amount || 0), 0);

      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          shop_id: shopId,
          entry_number: entryNumber,
          entry_date: new Date().toISOString().split('T')[0],
          entry_type: 'recurring',
          description: `Recurring: ${template.template_name}`,
          total_debits: totalDebits,
          total_credits: totalCredits,
          is_posted: template.auto_post || false,
          posted_at: template.auto_post ? new Date().toISOString() : null,
        })
        .select()
        .single();
      if (entryError) throw entryError;

      if (lines.length > 0) {
        const entryLines = lines.map((l: any, i: number) => ({
          journal_entry_id: entry.id,
          account_id: l.account_id,
          debit_amount: l.debit_amount || 0,
          credit_amount: l.credit_amount || 0,
          description: l.description,
          line_order: i + 1,
        }));
        const { error: linesError } = await supabase.from('journal_entry_lines').insert(entryLines);
        if (linesError) throw linesError;
      }

      await supabase.from('recurring_journal_templates').update({ last_run_date: new Date().toISOString() }).eq('id', templateId);
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-journal-templates'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Journal entry created from template');
    },
    onError: (error) => toast.error(`Failed to run template: ${error.message}`),
  });

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    runTemplate,
  };
}
