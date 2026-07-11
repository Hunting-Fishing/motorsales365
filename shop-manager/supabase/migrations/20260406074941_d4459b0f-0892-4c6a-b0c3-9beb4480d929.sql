INSERT INTO public.business_modules (slug, name, description, icon)
VALUES ('welding', 'Welding & Fabrication', 'Complete welding and fabrication business management with quotes, invoices, inventory, and CRM', 'Flame')
ON CONFLICT (slug) DO NOTHING;