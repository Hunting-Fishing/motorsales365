-- Add missing business kinds used by the directory ladder
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'financing';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'trucking';
