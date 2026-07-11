
-- Phase 3: Accounting Integration Tables

-- Accounting software integrations
CREATE TABLE public.accounting_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('quickbooks_online', 'quickbooks_desktop', 'sage', 'xero', 'wave', 'freshbooks')),
  connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'pending')),
  credentials JSONB,
  settings JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_frequency TEXT DEFAULT 'daily' CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'weekly', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chart of accounts for mapping
CREATE TABLE public.chart_of_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'cost_of_goods_sold')),
  account_subtype TEXT,
  parent_account_id UUID REFERENCES public.chart_of_accounts(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system_account BOOLEAN DEFAULT false,
  normal_balance TEXT CHECK (normal_balance IN ('debit', 'credit')),
  external_account_id TEXT,
  external_account_name TEXT,
  tax_line TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, account_code)
);

-- Account mappings between internal and external systems
CREATE TABLE public.account_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES public.accounting_integrations(id) ON DELETE CASCADE,
  internal_account_id UUID REFERENCES public.chart_of_accounts(id),
  internal_category TEXT,
  external_account_id TEXT NOT NULL,
  external_account_name TEXT,
  mapping_type TEXT NOT NULL CHECK (mapping_type IN ('revenue', 'expense', 'asset', 'liability', 'tax', 'discount', 'payment')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Journal entries
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('standard', 'adjusting', 'closing', 'reversing', 'recurring')),
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  source_document TEXT,
  is_posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  is_reversed BOOLEAN DEFAULT false,
  reversed_by_entry_id UUID REFERENCES public.journal_entries(id),
  external_sync_status TEXT DEFAULT 'pending' CHECK (external_sync_status IN ('pending', 'synced', 'error', 'skipped')),
  external_sync_id TEXT,
  external_sync_error TEXT,
  total_debits DECIMAL(12,2) DEFAULT 0,
  total_credits DECIMAL(12,2) DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, entry_number)
);

-- Journal entry line items
CREATE TABLE public.journal_entry_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  debit_amount DECIMAL(12,2) DEFAULT 0,
  credit_amount DECIMAL(12,2) DEFAULT 0,
  description TEXT,
  department_id UUID,
  project_id UUID,
  customer_id UUID,
  vendor_id UUID,
  line_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recurring journal entry templates
CREATE TABLE public.recurring_journal_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  next_run_date DATE,
  last_run_date DATE,
  is_active BOOLEAN DEFAULT true,
  auto_post BOOLEAN DEFAULT false,
  template_lines JSONB NOT NULL DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounting sync logs
CREATE TABLE public.accounting_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES public.accounting_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual', 'webhook')),
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('push', 'pull', 'bidirectional')),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'partial')),
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Financial periods for closing
CREATE TABLE public.financial_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  period_name TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('month', 'quarter', 'year')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_quarter INTEGER,
  fiscal_month INTEGER,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  retained_earnings_entry_id UUID REFERENCES public.journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, start_date, end_date)
);

-- Enable RLS
ALTER TABLE public.accounting_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_journal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view accounting integrations in their shop" ON public.accounting_integrations FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can manage accounting integrations in their shop" ON public.accounting_integrations FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can view chart of accounts in their shop" ON public.chart_of_accounts FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can manage chart of accounts in their shop" ON public.chart_of_accounts FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can view account mappings in their shop" ON public.account_mappings FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can manage account mappings in their shop" ON public.account_mappings FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can view journal entries in their shop" ON public.journal_entries FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can manage journal entries in their shop" ON public.journal_entries FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can view journal entry lines" ON public.journal_entry_lines FOR SELECT USING (EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND je.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Users can manage journal entry lines" ON public.journal_entry_lines FOR ALL USING (EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND je.shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Users can view recurring templates in their shop" ON public.recurring_journal_templates FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can manage recurring templates in their shop" ON public.recurring_journal_templates FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can view sync logs in their shop" ON public.accounting_sync_logs FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can manage sync logs in their shop" ON public.accounting_sync_logs FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can view financial periods in their shop" ON public.financial_periods FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can manage financial periods in their shop" ON public.financial_periods FOR ALL USING (shop_id = public.get_current_user_shop_id());

-- Indexes
CREATE INDEX idx_accounting_integrations_shop ON public.accounting_integrations(shop_id);
CREATE INDEX idx_chart_of_accounts_shop ON public.chart_of_accounts(shop_id);
CREATE INDEX idx_chart_of_accounts_parent ON public.chart_of_accounts(parent_account_id);
CREATE INDEX idx_account_mappings_shop ON public.account_mappings(shop_id);
CREATE INDEX idx_account_mappings_integration ON public.account_mappings(integration_id);
CREATE INDEX idx_journal_entries_shop ON public.journal_entries(shop_id);
CREATE INDEX idx_journal_entries_date ON public.journal_entries(entry_date);
CREATE INDEX idx_journal_entry_lines_entry ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account ON public.journal_entry_lines(account_id);
CREATE INDEX idx_recurring_templates_shop ON public.recurring_journal_templates(shop_id);
CREATE INDEX idx_sync_logs_shop ON public.accounting_sync_logs(shop_id);
CREATE INDEX idx_sync_logs_integration ON public.accounting_sync_logs(integration_id);
CREATE INDEX idx_financial_periods_shop ON public.financial_periods(shop_id);

-- Triggers
CREATE TRIGGER update_accounting_integrations_updated_at BEFORE UPDATE ON public.accounting_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON public.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_account_mappings_updated_at BEFORE UPDATE ON public.account_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recurring_templates_updated_at BEFORE UPDATE ON public.recurring_journal_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_financial_periods_updated_at BEFORE UPDATE ON public.financial_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
