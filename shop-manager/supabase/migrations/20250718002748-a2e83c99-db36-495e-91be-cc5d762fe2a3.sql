-- Add tax exemption fields to customers table
ALTER TABLE public.customers 
ADD COLUMN labor_tax_exempt boolean DEFAULT false,
ADD COLUMN parts_tax_exempt boolean DEFAULT false,
ADD COLUMN tax_exempt_certificate_number text,
ADD COLUMN tax_exempt_notes text;