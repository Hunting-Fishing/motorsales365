-- Phase 8: Grant Management & Impact Measurement Database Tables

-- Grants table
CREATE TABLE public.grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    grant_name TEXT NOT NULL,
    funding_organization TEXT NOT NULL,
    grant_type TEXT NOT NULL CHECK (grant_type IN ('federal', 'state', 'local', 'foundation', 'corporate', 'other')),
    program_area TEXT,
    amount_requested NUMERIC(12,2),
    amount_awarded NUMERIC(12,2),
    application_deadline DATE,
    project_start_date DATE,
    project_end_date DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'denied', 'active', 'completed', 'cancelled')),
    application_submitted_date DATE,
    decision_date DATE,
    reporting_frequency TEXT CHECK (reporting_frequency IN ('monthly', 'quarterly', 'semi_annually', 'annually', 'as_needed')),
    match_required BOOLEAN DEFAULT false,
    match_amount NUMERIC(12,2),
    restrictions JSONB DEFAULT '[]',
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    application_documents JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT NOT NULL
);

-- Grant reports table
CREATE TABLE public.grant_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grant_id UUID REFERENCES public.grants(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('progress', 'financial', 'final', 'compliance', 'interim')),
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    submitted_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'revision_requested')),
    report_content JSONB DEFAULT '{}',
    financial_data JSONB DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    reviewer_notes TEXT,
    submitted_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Impact metrics table
CREATE TABLE public.impact_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    metric_name TEXT NOT NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('quantitative', 'qualitative')),
    category TEXT NOT NULL CHECK (category IN ('people_helped', 'vehicles_restored', 'environmental', 'economic', 'social', 'educational')),
    measurement_unit TEXT,
    target_value NUMERIC,
    current_value NUMERIC DEFAULT 0,
    reporting_frequency TEXT CHECK (reporting_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')),
    data_source TEXT,
    collection_method TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT NOT NULL
);

-- Impact records table (for tracking actual measurements)
CREATE TABLE public.impact_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id UUID REFERENCES public.impact_metrics(id) ON DELETE CASCADE,
    recorded_value NUMERIC NOT NULL,
    recorded_date DATE NOT NULL,
    description TEXT,
    supporting_data JSONB DEFAULT '{}',
    program_id UUID,
    grant_id UUID REFERENCES public.grants(id),
    work_order_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT NOT NULL
);

-- Success stories table
CREATE TABLE public.success_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    story_title TEXT NOT NULL,
    participant_name TEXT,
    program_type TEXT NOT NULL,
    story_content TEXT NOT NULL,
    outcome_description TEXT,
    metrics_achieved JSONB DEFAULT '{}',
    photos JSONB DEFAULT '[]',
    publication_status TEXT DEFAULT 'draft' CHECK (publication_status IN ('draft', 'approved', 'published', 'archived')),
    consent_obtained BOOLEAN DEFAULT false,
    date_occurred DATE,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT NOT NULL
);

-- Create indexes
CREATE INDEX idx_grants_shop_id ON public.grants(shop_id);
CREATE INDEX idx_grants_status ON public.grants(status);
CREATE INDEX idx_grants_deadline ON public.grants(application_deadline);
CREATE INDEX idx_grant_reports_grant_id ON public.grant_reports(grant_id);
CREATE INDEX idx_grant_reports_due_date ON public.grant_reports(due_date);
CREATE INDEX idx_impact_metrics_shop_id ON public.impact_metrics(shop_id);
CREATE INDEX idx_impact_metrics_category ON public.impact_metrics(category);
CREATE INDEX idx_impact_records_metric_id ON public.impact_records(metric_id);
CREATE INDEX idx_impact_records_date ON public.impact_records(recorded_date);
CREATE INDEX idx_success_stories_shop_id ON public.success_stories(shop_id);
CREATE INDEX idx_success_stories_program ON public.success_stories(program_type);

-- Create triggers for updated_at
CREATE TRIGGER update_grants_updated_at
    BEFORE UPDATE ON public.grants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grant_reports_updated_at
    BEFORE UPDATE ON public.grant_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_impact_metrics_updated_at
    BEFORE UPDATE ON public.impact_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_success_stories_updated_at
    BEFORE UPDATE ON public.success_stories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;

-- RLS Policies (staff only for all grant and impact data)
CREATE POLICY "Staff can manage grants" ON public.grants
    FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage grant reports" ON public.grant_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM grants g 
            WHERE g.id = grant_reports.grant_id 
            AND g.shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Staff can manage impact metrics" ON public.impact_metrics
    FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage impact records" ON public.impact_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM impact_metrics im 
            WHERE im.id = impact_records.metric_id 
            AND im.shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Staff can manage success stories" ON public.success_stories
    FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Public can view published success stories
CREATE POLICY "Public can view published success stories" ON public.success_stories
    FOR SELECT USING (publication_status = 'published');

-- Helper functions
CREATE OR REPLACE FUNCTION public.calculate_grant_utilization(p_grant_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    awarded_amount NUMERIC;
    spent_amount NUMERIC;
    utilization_rate NUMERIC;
BEGIN
    SELECT amount_awarded INTO awarded_amount FROM public.grants WHERE id = p_grant_id;
    
    -- This would connect to actual financial data when implemented
    spent_amount := 0; -- Placeholder
    
    IF awarded_amount > 0 THEN
        utilization_rate := (spent_amount / awarded_amount) * 100;
    ELSE
        utilization_rate := 0;
    END IF;
    
    RETURN utilization_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_overdue_grant_reports()
RETURNS TABLE(
    report_id UUID,
    grant_name TEXT,
    report_type TEXT,
    due_date DATE,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gr.id,
        g.grant_name,
        gr.report_type,
        gr.due_date,
        (CURRENT_DATE - gr.due_date)::INTEGER
    FROM public.grant_reports gr
    JOIN public.grants g ON g.id = gr.grant_id
    WHERE gr.status IN ('pending', 'in_progress')
    AND gr.due_date < CURRENT_DATE
    ORDER BY gr.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;