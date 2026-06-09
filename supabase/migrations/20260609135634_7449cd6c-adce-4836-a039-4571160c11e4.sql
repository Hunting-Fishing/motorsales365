ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS invoice_number text UNIQUE;

CREATE INDEX IF NOT EXISTS payments_status_method_idx ON public.payments(status, method);

CREATE TABLE IF NOT EXISTS public.payment_method_config (
  method text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  label text NOT NULL,
  instructions_md text,
  account_name text,
  account_number text,
  qr_image_url text,
  sort_order int NOT NULL DEFAULT 100,
  is_manual boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_method_config TO anon, authenticated;
GRANT ALL ON public.payment_method_config TO service_role;

ALTER TABLE public.payment_method_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled methods"
  ON public.payment_method_config FOR SELECT
  USING (enabled = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage payment methods"
  ON public.payment_method_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER pmc_set_updated_at
  BEFORE UPDATE ON public.payment_method_config
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.payment_method_config (method, enabled, label, instructions_md, sort_order, is_manual) VALUES
  ('stripe', true, 'Card / Wallet (Stripe)', 'Pay securely with credit/debit card or supported wallets.', 10, false),
  ('gcash_manual', true, 'GCash (Manual)', 'Send payment to our GCash account, then upload your receipt below. We''ll confirm within 1 business day.', 20, true),
  ('maya_manual', false, 'Maya (Manual)', 'Send payment to our Maya account, then upload your receipt below.', 30, true),
  ('qrph', false, 'QR Ph', 'Scan the QR Ph code with any participating PH bank or wallet, then upload your receipt below.', 40, true),
  ('bank_transfer', false, 'Bank Transfer', 'Transfer to the bank account shown below. Use your invoice number as the reference.', 50, true),
  ('paypal_manual', false, 'PayPal (Manual)', 'Send payment to our PayPal account, then upload your transaction ID and screenshot below.', 60, true)
ON CONFLICT (method) DO NOTHING;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text := 'INV-' || to_char(now(), 'YYYYMM') || '-';
  n int;
BEGIN
  SELECT COUNT(*) + 1 INTO n
    FROM public.payments
    WHERE invoice_number LIKE prefix || '%';
  RETURN prefix || lpad(n::text, 5, '0');
END $$;