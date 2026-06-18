
CREATE TABLE public.advertisement_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('advertisement','ad_inquiry','promotion')),
  source_id uuid,
  action text NOT NULL CHECK (action IN ('created','updated','deleted')),
  snapshot jsonb NOT NULL,
  previous jsonb,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text
);

CREATE INDEX advertisement_history_source_idx ON public.advertisement_history (source, changed_at DESC);
CREATE INDEX advertisement_history_source_id_idx ON public.advertisement_history (source_id);
CREATE INDEX advertisement_history_changed_at_idx ON public.advertisement_history (changed_at DESC);

GRANT SELECT ON public.advertisement_history TO authenticated;
GRANT ALL ON public.advertisement_history TO service_role;

ALTER TABLE public.advertisement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read advertisement history"
  ON public.advertisement_history
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
-- No INSERT/UPDATE/DELETE policies: writes happen via SECURITY DEFINER trigger; table is effectively append-only from app code.

CREATE OR REPLACE FUNCTION public.log_advertisement_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source text;
  v_action text;
  v_id uuid;
  v_actor uuid;
BEGIN
  IF TG_TABLE_NAME = 'advertisements' THEN v_source := 'advertisement';
  ELSIF TG_TABLE_NAME = 'ad_inquiries' THEN v_source := 'ad_inquiry';
  ELSIF TG_TABLE_NAME = 'promotions' THEN v_source := 'promotion';
  ELSE v_source := TG_TABLE_NAME;
  END IF;

  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_id := (to_jsonb(NEW) ->> 'id')::uuid;
    INSERT INTO public.advertisement_history (source, source_id, action, snapshot, previous, changed_by)
    VALUES (v_source, v_id, v_action, to_jsonb(NEW), NULL, v_actor);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_id := (to_jsonb(NEW) ->> 'id')::uuid;
    INSERT INTO public.advertisement_history (source, source_id, action, snapshot, previous, changed_by)
    VALUES (v_source, v_id, v_action, to_jsonb(NEW), to_jsonb(OLD), v_actor);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_id := (to_jsonb(OLD) ->> 'id')::uuid;
    INSERT INTO public.advertisement_history (source, source_id, action, snapshot, previous, changed_by)
    VALUES (v_source, v_id, v_action, to_jsonb(OLD), NULL, v_actor);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER advertisements_history_trg
AFTER INSERT OR UPDATE OR DELETE ON public.advertisements
FOR EACH ROW EXECUTE FUNCTION public.log_advertisement_history();

CREATE TRIGGER ad_inquiries_history_trg
AFTER INSERT OR UPDATE OR DELETE ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.log_advertisement_history();

CREATE TRIGGER promotions_history_trg
AFTER INSERT OR UPDATE OR DELETE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.log_advertisement_history();
