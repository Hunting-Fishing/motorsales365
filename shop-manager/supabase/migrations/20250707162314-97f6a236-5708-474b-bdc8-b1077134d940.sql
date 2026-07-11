-- Phase 7: Public Portal, Raffle Management & Donor Tools

-- Raffles table
CREATE TABLE public.raffles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    vehicle_id UUID,
    ticket_price NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    max_tickets INTEGER,
    tickets_sold INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    draw_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    winner_ticket_number TEXT,
    winner_contact_info JSONB,
    images JSONB DEFAULT '[]',
    terms_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT NOT NULL
);

-- Raffle tickets table
CREATE TABLE public.raffle_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raffle_id UUID REFERENCES public.raffles(id) ON DELETE CASCADE,
    ticket_number TEXT NOT NULL,
    purchaser_name TEXT NOT NULL,
    purchaser_email TEXT NOT NULL,
    purchaser_phone TEXT,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    payment_method TEXT,
    payment_reference TEXT,
    amount_paid NUMERIC(10,2) NOT NULL,
    is_winner BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(raffle_id, ticket_number)
);

-- Public applications table (for assistance requests)
CREATE TABLE public.public_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    application_type TEXT NOT NULL CHECK (application_type IN ('youth_toolkit', 'apprentice_program', 'vehicle_donation', 'assistance_request', 'volunteer_application')),
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    applicant_phone TEXT,
    applicant_address JSONB,
    application_data JSONB NOT NULL DEFAULT '{}',
    supporting_documents JSONB DEFAULT '[]',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'denied', 'completed')),
    priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
    assigned_to TEXT,
    review_notes TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Donors table
CREATE TABLE public.donors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    donor_type TEXT NOT NULL CHECK (donor_type IN ('individual', 'corporate', 'foundation', 'government')),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address JSONB,
    preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'mail')),
    total_donated NUMERIC(12,2) DEFAULT 0,
    first_donation_date DATE,
    last_donation_date DATE,
    donation_frequency TEXT CHECK (donation_frequency IN ('one_time', 'monthly', 'quarterly', 'annually')),
    communication_preferences JSONB DEFAULT '{}',
    tax_receipt_required BOOLEAN DEFAULT true,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT NOT NULL
);

-- Donations table
CREATE TABLE public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    donor_id UUID REFERENCES public.donors(id),
    donation_type TEXT NOT NULL CHECK (donation_type IN ('monetary', 'vehicle', 'parts', 'tools', 'services', 'other')),
    amount NUMERIC(12,2),
    description TEXT NOT NULL,
    donation_date DATE NOT NULL,
    received_date DATE,
    vehicle_id UUID,
    receipt_number TEXT UNIQUE,
    receipt_issued BOOLEAN DEFAULT false,
    receipt_issued_date DATE,
    tax_receipt_value NUMERIC(12,2),
    program_id UUID,
    acknowledgment_sent BOOLEAN DEFAULT false,
    acknowledgment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT NOT NULL
);

-- Sponsors table
CREATE TABLE public.sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    logo_url TEXT,
    sponsorship_level TEXT CHECK (sponsorship_level IN ('bronze', 'silver', 'gold', 'platinum', 'custom')),
    sponsorship_value NUMERIC(12,2),
    start_date DATE,
    end_date DATE,
    benefits_provided JSONB DEFAULT '[]',
    visibility_preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by TEXT NOT NULL
);

-- Public portal settings table
CREATE TABLE public.portal_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL UNIQUE,
    organization_name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    hero_image_url TEXT,
    logo_url TEXT,
    contact_info JSONB DEFAULT '{}',
    social_media JSONB DEFAULT '{}',
    application_forms_enabled BOOLEAN DEFAULT true,
    raffle_section_enabled BOOLEAN DEFAULT true,
    gallery_enabled BOOLEAN DEFAULT true,
    success_stories_enabled BOOLEAN DEFAULT true,
    custom_sections JSONB DEFAULT '[]',
    seo_settings JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_raffles_shop_id ON public.raffles(shop_id);
CREATE INDEX idx_raffles_status ON public.raffles(status);
CREATE INDEX idx_raffles_dates ON public.raffles(start_date, end_date);
CREATE INDEX idx_raffle_tickets_raffle_id ON public.raffle_tickets(raffle_id);
CREATE INDEX idx_raffle_tickets_purchaser_email ON public.raffle_tickets(purchaser_email);
CREATE INDEX idx_public_applications_shop_id ON public.public_applications(shop_id);
CREATE INDEX idx_public_applications_type ON public.public_applications(application_type);
CREATE INDEX idx_public_applications_status ON public.public_applications(status);
CREATE INDEX idx_donors_shop_id ON public.donors(shop_id);
CREATE INDEX idx_donors_type ON public.donors(donor_type);
CREATE INDEX idx_donations_shop_id ON public.donations(shop_id);
CREATE INDEX idx_donations_donor ON public.donations(donor_id);
CREATE INDEX idx_donations_date ON public.donations(donation_date);
CREATE INDEX idx_sponsors_shop_id ON public.sponsors(shop_id);
CREATE INDEX idx_sponsors_active ON public.sponsors(is_active);

-- Create triggers for updated_at
CREATE TRIGGER update_raffles_updated_at
    BEFORE UPDATE ON public.raffles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_public_applications_updated_at
    BEFORE UPDATE ON public.public_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_donors_updated_at
    BEFORE UPDATE ON public.donors
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_donations_updated_at
    BEFORE UPDATE ON public.donations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sponsors_updated_at
    BEFORE UPDATE ON public.sponsors
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portal_settings_updated_at
    BEFORE UPDATE ON public.portal_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for raffles (public read, staff manage)
CREATE POLICY "Public can view active raffles" ON public.raffles
    FOR SELECT USING (status = 'active');

CREATE POLICY "Staff can manage raffles" ON public.raffles
    FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for raffle tickets (purchasers can view own, staff can manage)
CREATE POLICY "Purchasers can view own tickets" ON public.raffle_tickets
    FOR SELECT USING (purchaser_email = auth.email());

CREATE POLICY "Staff can manage all tickets" ON public.raffle_tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM raffles r 
            WHERE r.id = raffle_tickets.raffle_id 
            AND r.shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
        )
    );

-- RLS Policies for public applications (applicants can view own, staff can manage)
CREATE POLICY "Applicants can view own applications" ON public.public_applications
    FOR SELECT USING (applicant_email = auth.email());

CREATE POLICY "Public can submit applications" ON public.public_applications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can manage applications" ON public.public_applications
    FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for donors/donations/sponsors (staff only)
CREATE POLICY "Staff can manage donors" ON public.donors
    FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage donations" ON public.donations
    FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can manage sponsors" ON public.sponsors
    FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for portal settings
CREATE POLICY "Public can view portal settings" ON public.portal_settings
    FOR SELECT USING (is_public = true);

CREATE POLICY "Staff can manage portal settings" ON public.portal_settings
    FOR ALL USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Helper functions
CREATE OR REPLACE FUNCTION public.generate_raffle_ticket_number(p_raffle_id UUID)
RETURNS TEXT AS $$
DECLARE
    ticket_count INTEGER;
    ticket_number TEXT;
BEGIN
    SELECT COUNT(*) INTO ticket_count FROM public.raffle_tickets WHERE raffle_id = p_raffle_id;
    ticket_number := LPAD((ticket_count + 1)::TEXT, 6, '0');
    RETURN ticket_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.calculate_raffle_revenue(p_raffle_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_revenue NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount_paid), 0) INTO total_revenue
    FROM public.raffle_tickets
    WHERE raffle_id = p_raffle_id;
    
    RETURN total_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;