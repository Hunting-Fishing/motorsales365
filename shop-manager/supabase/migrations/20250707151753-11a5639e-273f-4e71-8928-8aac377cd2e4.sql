-- Add new business types for non-profit and hybrid models
INSERT INTO public.business_types (value, label) VALUES
-- Hybrid Models
('social_enterprise', 'Social Enterprise'),
('benefit_corporation', 'Benefit Corporation'), 
('cooperative', 'Cooperative'),
('community_interest_company', 'Community Interest Company'),
('public_benefit_corporation', 'Public Benefit Corporation'),
('low_profit_llc', 'Low-Profit Limited Liability Company (L3C)'),

-- Non-Profit Subtypes
('charitable_organization', 'Charitable Organization'),
('religious_organization', 'Religious Organization'),
('educational_institution', 'Educational Institution'),
('community_organization', 'Community Organization'),
('professional_association', 'Professional Association'),
('trade_association', 'Trade Association'),
('foundation', 'Foundation'),
('social_club', 'Social Club'),
('volunteer_organization', 'Volunteer Organization'),
('advocacy_group', 'Advocacy Group')

ON CONFLICT (value) DO NOTHING;