
-- Extend subject enum to support supplier assignments
ALTER TYPE public.sales_rep_subject ADD VALUE IF NOT EXISTS 'supplier';
