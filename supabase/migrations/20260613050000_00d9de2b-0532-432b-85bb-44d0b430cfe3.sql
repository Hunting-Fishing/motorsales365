-- Fix: Business directory and dispatch (towing provider) subscription renewal
-- invoices were never recorded in `payments` because recordPaymentFromInvoice()
-- in webhook.ts only checked the `subscriptions` table for the Stripe
-- subscription id, and "business_subscription" / "dispatch_subscription" were
-- not valid payment_kind enum values. Part of the unified revenue reporting fix.
ALTER TYPE public.payment_kind ADD VALUE IF NOT EXISTS 'business_subscription';
ALTER TYPE public.payment_kind ADD VALUE IF NOT EXISTS 'dispatch_subscription';
