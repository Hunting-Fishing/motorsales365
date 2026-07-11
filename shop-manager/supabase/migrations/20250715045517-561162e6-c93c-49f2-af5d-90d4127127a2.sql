-- Phase 1: Create missing database tables for non-profit management (excluding impact_metrics which already exists)

-- Programs table
CREATE TABLE public.programs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    program_type TEXT NOT NULL CHECK (program_type IN ('education', 'health', 'environment', 'community', 'youth', 'seniors', 'other')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'planned')),
    start_date DATE,
    end_date DATE,
    budget_allocated NUMERIC DEFAULT 0,
    budget_spent NUMERIC DEFAULT 0,
    target_participants INTEGER DEFAULT 0,
    current_participants INTEGER DEFAULT 0,
    location TEXT,
    coordinator_id UUID,
    shop_id UUID NOT NULL,
    grant_funded BOOLEAN DEFAULT false,
    funding_sources JSONB DEFAULT '[]'::jsonb,
    success_metrics JSONB DEFAULT '[]'::jsonb,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Volunteers table
CREATE TABLE public.volunteers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    availability JSONB DEFAULT '{}'::jsonb,
    background_check_status TEXT DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'approved', 'rejected', 'expired')),
    background_check_date DATE,
    training_completed JSONB DEFAULT '[]'::jsonb,
    volunteer_hours NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    notes TEXT,
    shop_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Program participants table
CREATE TABLE public.program_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL,
    participant_name TEXT NOT NULL,
    participant_email TEXT,
    participant_phone TEXT,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completion_date DATE,
    status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'active', 'completed', 'dropped', 'suspended')),
    progress_notes TEXT,
    outcome_data JSONB DEFAULT '{}'::jsonb,
    demographics JSONB DEFAULT '{}'::jsonb,
    shop_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Volunteer assignments table
CREATE TABLE public.volunteer_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    volunteer_id UUID NOT NULL,
    program_id UUID,
    role TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    hours_committed INTEGER DEFAULT 0,
    hours_completed NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    notes TEXT,
    shop_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Impact measurement data table
CREATE TABLE public.impact_measurement_data (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_id UUID NOT NULL,
    measured_value NUMERIC NOT NULL,
    measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    verified_by UUID,
    verification_date TIMESTAMP WITH TIME ZONE,
    shop_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.programs 
ADD CONSTRAINT programs_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
ADD CONSTRAINT programs_coordinator_id_fkey FOREIGN KEY (coordinator_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD CONSTRAINT programs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update impact_metrics to link to programs
ALTER TABLE public.impact_metrics 
ADD COLUMN IF NOT EXISTS program_id UUID,
ADD CONSTRAINT impact_metrics_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;

ALTER TABLE public.volunteers 
ADD CONSTRAINT volunteers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
ADD CONSTRAINT volunteers_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL,
ADD CONSTRAINT volunteers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.program_participants 
ADD CONSTRAINT program_participants_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
ADD CONSTRAINT program_participants_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE,
ADD CONSTRAINT program_participants_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.volunteer_assignments 
ADD CONSTRAINT volunteer_assignments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
ADD CONSTRAINT volunteer_assignments_volunteer_id_fkey FOREIGN KEY (volunteer_id) REFERENCES public.volunteers(id) ON DELETE CASCADE,
ADD CONSTRAINT volunteer_assignments_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE,
ADD CONSTRAINT volunteer_assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.impact_measurement_data 
ADD CONSTRAINT impact_measurement_data_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
ADD CONSTRAINT impact_measurement_data_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.impact_metrics(id) ON DELETE CASCADE,
ADD CONSTRAINT impact_measurement_data_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD CONSTRAINT impact_measurement_data_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_measurement_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shop-based access
CREATE POLICY "Users can view programs from their shop" ON public.programs
    FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert programs into their shop" ON public.programs
    FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update programs in their shop" ON public.programs
    FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete programs from their shop" ON public.programs
    FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view volunteers from their shop" ON public.volunteers
    FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert volunteers into their shop" ON public.volunteers
    FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update volunteers in their shop" ON public.volunteers
    FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete volunteers from their shop" ON public.volunteers
    FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view program participants from their shop" ON public.program_participants
    FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert program participants into their shop" ON public.program_participants
    FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update program participants in their shop" ON public.program_participants
    FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete program participants from their shop" ON public.program_participants
    FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view volunteer assignments from their shop" ON public.volunteer_assignments
    FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert volunteer assignments into their shop" ON public.volunteer_assignments
    FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update volunteer assignments in their shop" ON public.volunteer_assignments
    FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete volunteer assignments from their shop" ON public.volunteer_assignments
    FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view impact measurement data from their shop" ON public.impact_measurement_data
    FOR SELECT USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert impact measurement data into their shop" ON public.impact_measurement_data
    FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update impact measurement data in their shop" ON public.impact_measurement_data
    FOR UPDATE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete impact measurement data from their shop" ON public.impact_measurement_data
    FOR DELETE USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_programs_shop_id ON public.programs(shop_id);
CREATE INDEX idx_programs_status ON public.programs(status);
CREATE INDEX idx_programs_coordinator_id ON public.programs(coordinator_id);
CREATE INDEX idx_impact_metrics_program_id ON public.impact_metrics(program_id);
CREATE INDEX idx_volunteers_shop_id ON public.volunteers(shop_id);
CREATE INDEX idx_volunteers_status ON public.volunteers(status);
CREATE INDEX idx_program_participants_program_id ON public.program_participants(program_id);
CREATE INDEX idx_volunteer_assignments_volunteer_id ON public.volunteer_assignments(volunteer_id);
CREATE INDEX idx_volunteer_assignments_program_id ON public.volunteer_assignments(program_id);
CREATE INDEX idx_impact_measurement_data_metric_id ON public.impact_measurement_data(metric_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_nonprofit_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_programs_updated_at
    BEFORE UPDATE ON public.programs
    FOR EACH ROW EXECUTE FUNCTION public.update_nonprofit_tables_updated_at();

CREATE TRIGGER update_volunteers_updated_at
    BEFORE UPDATE ON public.volunteers
    FOR EACH ROW EXECUTE FUNCTION public.update_nonprofit_tables_updated_at();

CREATE TRIGGER update_program_participants_updated_at
    BEFORE UPDATE ON public.program_participants
    FOR EACH ROW EXECUTE FUNCTION public.update_nonprofit_tables_updated_at();

CREATE TRIGGER update_volunteer_assignments_updated_at
    BEFORE UPDATE ON public.volunteer_assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_nonprofit_tables_updated_at();

CREATE TRIGGER update_impact_measurement_data_updated_at
    BEFORE UPDATE ON public.impact_measurement_data
    FOR EACH ROW EXECUTE FUNCTION public.update_nonprofit_tables_updated_at();