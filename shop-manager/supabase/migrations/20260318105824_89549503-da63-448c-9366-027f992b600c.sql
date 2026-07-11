-- PT Automation Engine: notifications table + automation rules
CREATE TABLE public.pt_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  message_template TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pt_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.pt_trainers(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pt_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_automation_rules_shop_policy') THEN
    CREATE POLICY "pt_automation_rules_shop_policy" ON public.pt_automation_rules FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_notifications_shop_policy') THEN
    CREATE POLICY "pt_notifications_shop_policy" ON public.pt_notifications FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;