ALTER TABLE public.business_plans
  ADD COLUMN IF NOT EXISTS type_slug text;

UPDATE public.business_plans SET type_slug = 'carwash'           WHERE business_kind = 'carwash';
UPDATE public.business_plans SET type_slug = 'repair_shop'       WHERE business_kind = 'repair_shop';
UPDATE public.business_plans SET type_slug = 'body_paint'        WHERE business_kind = 'body_shop';
UPDATE public.business_plans SET type_slug = 'towing'            WHERE business_kind = 'towing';
UPDATE public.business_plans SET type_slug = 'salvage'           WHERE business_kind = 'salvage';
UPDATE public.business_plans SET type_slug = 'parts_accessories' WHERE business_kind = 'parts_shop';
UPDATE public.business_plans SET type_slug = 'insurance'         WHERE business_kind = 'insurance';

CREATE INDEX IF NOT EXISTS idx_business_plans_type_slug ON public.business_plans (type_slug, tier, interval);
