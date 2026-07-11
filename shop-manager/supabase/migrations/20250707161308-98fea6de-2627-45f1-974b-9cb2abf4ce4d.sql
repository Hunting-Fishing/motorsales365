-- Phase 6: Financial Management & Reporting Tables

-- Budget categories table
CREATE TABLE public.budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES public.budget_categories(id),
    budget_limit NUMERIC(12,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT NOT NULL
);

-- Budget entries table
CREATE TABLE public.budget_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    category_id UUID REFERENCES public.budget_categories(id) ON DELETE CASCADE,
    grant_id UUID REFERENCES public.grants(id),
    program_id UUID REFERENCES public.programs(id),
    fiscal_year INTEGER NOT NULL,
    budget_type TEXT NOT NULL CHECK (budget_type IN ('income', 'expense')),
    planned_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    actual_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
    month INTEGER CHECK (month BETWEEN 1 AND 12),
    notes TEXT,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT NOT NULL
);

-- Financial transactions table
CREATE TABLE public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    transaction_number TEXT UNIQUE NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer')),
    category_id UUID REFERENCES public.budget_categories(id),
    grant_id UUID REFERENCES public.grants(id),
    program_id UUID REFERENCES public.programs(id),
    amount NUMERIC(12,2) NOT NULL,
    description TEXT NOT NULL,
    vendor_name TEXT,
    receipt_url TEXT,
    payment_method TEXT,
    reference_number TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'annually')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    approved_by TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT NOT NULL
);

-- Financial reports table
CREATE TABLE public.financial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    report_name TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('budget_vs_actual', 'cash_flow', 'program_expenses', 'grant_utilization', 'annual_report')),
    fiscal_year INTEGER,
    start_date DATE,
    end_date DATE,
    report_data JSONB NOT NULL DEFAULT '{}',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    generated_by TEXT NOT NULL,
    notes TEXT,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    file_url TEXT
);

-- Tax documents table
CREATE TABLE public.tax_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('990', '990ez', '990pf', '1099', 'w2', 'state_filing')),
    tax_year INTEGER NOT NULL,
    filing_status TEXT DEFAULT 'draft' CHECK (filing_status IN ('draft', 'filed', 'amended')),
    due_date DATE NOT NULL,
    filed_date DATE,
    extension_date DATE,
    preparer_name TEXT,
    preparer_contact TEXT,
    filing_fees NUMERIC(10,2),
    document_url TEXT,
    confirmation_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT NOT NULL
);

-- Asset tracking table
CREATE TABLE public.asset_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    asset_name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('equipment', 'vehicle', 'building', 'technology', 'furniture', 'other')),
    asset_tag TEXT UNIQUE,
    purchase_date DATE,
    purchase_price NUMERIC(12,2),
    depreciation_method TEXT CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'none')),
    useful_life_years INTEGER,
    current_value NUMERIC(12,2),
    location TEXT,
    condition_status TEXT DEFAULT 'good' CHECK (condition_status IN ('excellent', 'good', 'fair', 'poor', 'disposed')),
    grant_funded BOOLEAN DEFAULT false,
    grant_id UUID REFERENCES public.grants(id),
    disposal_date DATE,
    disposal_method TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_budget_categories_shop_id ON public.budget_categories(shop_id);
CREATE INDEX idx_budget_categories_parent ON public.budget_categories(parent_category_id);
CREATE INDEX idx_budget_entries_shop_id ON public.budget_entries(shop_id);
CREATE INDEX idx_budget_entries_category ON public.budget_entries(category_id);
CREATE INDEX idx_budget_entries_fiscal_year ON public.budget_entries(fiscal_year);
CREATE INDEX idx_financial_transactions_shop_id ON public.financial_transactions(shop_id);
CREATE INDEX idx_financial_transactions_date ON public.financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(transaction_type);
CREATE INDEX idx_financial_reports_shop_id ON public.financial_reports(shop_id);
CREATE INDEX idx_tax_documents_shop_id ON public.tax_documents(shop_id);
CREATE INDEX idx_tax_documents_year ON public.tax_documents(tax_year);
CREATE INDEX idx_asset_tracking_shop_id ON public.asset_tracking(shop_id);

-- Create triggers for updating timestamps
CREATE TRIGGER update_budget_categories_updated_at
    BEFORE UPDATE ON public.budget_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_entries_updated_at
    BEFORE UPDATE ON public.budget_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_transactions_updated_at
    BEFORE UPDATE ON public.financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_documents_updated_at
    BEFORE UPDATE ON public.tax_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_tracking_updated_at
    BEFORE UPDATE ON public.asset_tracking
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view budget categories from their shop" ON public.budget_categories
    FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert budget categories into their shop" ON public.budget_categories
    FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update budget categories in their shop" ON public.budget_categories
    FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete budget categories from their shop" ON public.budget_categories
    FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view budget entries from their shop" ON public.budget_entries
    FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert budget entries into their shop" ON public.budget_entries
    FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update budget entries in their shop" ON public.budget_entries
    FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete budget entries from their shop" ON public.budget_entries
    FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view financial transactions from their shop" ON public.financial_transactions
    FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert financial transactions into their shop" ON public.financial_transactions
    FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update financial transactions in their shop" ON public.financial_transactions
    FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete financial transactions from their shop" ON public.financial_transactions
    FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view financial reports from their shop" ON public.financial_reports
    FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert financial reports into their shop" ON public.financial_reports
    FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update financial reports in their shop" ON public.financial_reports
    FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete financial reports from their shop" ON public.financial_reports
    FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view tax documents from their shop" ON public.tax_documents
    FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert tax documents into their shop" ON public.tax_documents
    FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update tax documents in their shop" ON public.tax_documents
    FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete tax documents from their shop" ON public.tax_documents
    FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view asset tracking from their shop" ON public.asset_tracking
    FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert asset tracking into their shop" ON public.asset_tracking
    FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update asset tracking in their shop" ON public.asset_tracking
    FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete asset tracking from their shop" ON public.asset_tracking
    FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Create helper functions for financial calculations
CREATE OR REPLACE FUNCTION public.calculate_budget_variance(
    p_shop_id UUID,
    p_category_id UUID,
    p_fiscal_year INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    planned_total NUMERIC;
    actual_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(planned_amount), 0) INTO planned_total
    FROM public.budget_entries
    WHERE shop_id = p_shop_id 
    AND category_id = p_category_id 
    AND fiscal_year = p_fiscal_year;
    
    SELECT COALESCE(SUM(actual_amount), 0) INTO actual_total
    FROM public.budget_entries
    WHERE shop_id = p_shop_id 
    AND category_id = p_category_id 
    AND fiscal_year = p_fiscal_year;
    
    RETURN actual_total - planned_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;