-- Fix: Vehicle Passport Premium payments were silently failing to record because
-- "passport_premium" was not a valid payment_kind enum value (webhook.ts
-- activatePassportPremiumFromSession inserts kind: "passport_premium").
ALTER TYPE public.payment_kind ADD VALUE IF NOT EXISTS 'passport_premium';