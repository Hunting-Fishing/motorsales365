CREATE TABLE public.ops_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error',
  source TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ops_alerts_created_at ON public.ops_alerts (created_at DESC);
CREATE INDEX idx_ops_alerts_unack ON public.ops_alerts (acknowledged, created_at DESC);
CREATE INDEX idx_ops_alerts_event ON public.ops_alerts (event);

GRANT SELECT, UPDATE ON public.ops_alerts TO authenticated;
GRANT ALL ON public.ops_alerts TO service_role;

ALTER TABLE public.ops_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view alerts"
  ON public.ops_alerts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can acknowledge alerts"
  ON public.ops_alerts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));