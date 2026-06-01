-- Phase 1 P0: business lifecycle notification triggers + enum extension

-- 1) Extend business_kind enum with all signup options that were missing
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'tire_shop';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'battery_shop';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'fuel_station';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'accessories';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'audio_tint';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'inspection';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'driving_school';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'lto_services';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'transport';
