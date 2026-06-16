
CREATE TABLE public.business_plan_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  from_plan_id uuid REFERENCES public.business_plans(id) ON DELETE SET NULL,
  to_plan_id uuid REFERENCES public.business_plans(id) ON DELETE SET NULL,
  from_tier text,
  to_tier text,
  reason text NOT NULL CHECK (reason IN ('auto_upgrade','manual','downgrade','cancel','reactivate')),
  triggered_by text NOT NULL CHECK (triggered_by IN ('user','system')),
  actor_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bpcl_business ON public.business_plan_change_log(business_id, created_at DESC);

GRANT SELECT ON public.business_plan_change_log TO authenticated;
GRANT ALL ON public.business_plan_change_log TO service_role;

ALTER TABLE public.business_plan_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view plan change log"
ON public.business_plan_change_log
FOR SELECT
TO authenticated
USING (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(),'admin'::app_role));
