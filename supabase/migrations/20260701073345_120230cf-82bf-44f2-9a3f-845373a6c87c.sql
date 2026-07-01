
-- Payout batches
CREATE TABLE public.partner_program_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_program_partners(id) ON DELETE CASCADE,
  amount_php numeric(12,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'manual',
  reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_program_payouts TO authenticated;
GRANT ALL ON public.partner_program_payouts TO service_role;
ALTER TABLE public.partner_program_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_or_admin_read_payouts" ON public.partner_program_payouts
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    partner_id IN (SELECT id FROM public.partner_program_partners WHERE user_id = auth.uid())
  );
CREATE POLICY "admin_write_payouts" ON public.partner_program_payouts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pp_payouts_updated BEFORE UPDATE ON public.partner_program_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link commission events to payouts + audit fields
ALTER TABLE public.partner_program_commission_events
  ADD COLUMN payout_id uuid REFERENCES public.partner_program_payouts(id) ON DELETE SET NULL,
  ADD COLUMN approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN paid_at timestamptz,
  ADD COLUMN clawed_back_reason text,
  ADD COLUMN clawed_back_at timestamptz,
  ADD COLUMN clawed_back_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX pp_events_payout_idx ON public.partner_program_commission_events(payout_id);
CREATE INDEX pp_payouts_partner_idx ON public.partner_program_payouts(partner_id, created_at DESC);

-- Recompute payout total from linked approved events
CREATE OR REPLACE FUNCTION public.pp_recompute_payout_total(_payout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.partner_program_payouts
     SET amount_php = COALESCE((
       SELECT SUM(commission_php)
         FROM public.partner_program_commission_events
        WHERE payout_id = _payout_id
     ), 0)
   WHERE id = _payout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.pp_recompute_payout_total(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pp_recompute_payout_total(uuid) TO authenticated, service_role;
