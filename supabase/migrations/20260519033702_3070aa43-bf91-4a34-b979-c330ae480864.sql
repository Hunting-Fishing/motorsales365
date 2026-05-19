CREATE TABLE IF NOT EXISTS public.payment_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('plan','boost','addon','other')),
  label text NOT NULL,
  description text,
  amount_php numeric NOT NULL DEFAULT 0,
  prorated_credit_php numeric,
  previous_amount_php numeric,
  period_start timestamptz,
  period_end timestamptz,
  credit_calculated_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_line_items_payment_id
  ON public.payment_line_items(payment_id);

ALTER TABLE public.payment_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own line items"
ON public.payment_line_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.id = payment_line_items.payment_id
      AND (p.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Users insert own line items"
ON public.payment_line_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.id = payment_line_items.payment_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Admins manage line items"
ON public.payment_line_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sales view line items"
ON public.payment_line_items FOR SELECT
USING (has_role(auth.uid(), 'sales'::app_role));