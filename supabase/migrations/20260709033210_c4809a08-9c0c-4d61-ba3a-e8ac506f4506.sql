
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS network_exposure_status text NOT NULL DEFAULT 'none'
    CHECK (network_exposure_status IN ('none','pending','approved','revoked')),
  ADD COLUMN IF NOT EXISTS network_exposure_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS network_exposure_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS network_exposure_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS network_exposure_review_note text;

CREATE INDEX IF NOT EXISTS businesses_network_exposure_status_idx
  ON public.businesses (network_exposure_status)
  WHERE network_exposure_status <> 'none';

DROP VIEW IF EXISTS public.network_stock;
CREATE VIEW public.network_stock
WITH (security_invoker = on) AS
SELECT
  i.id, i.business_id, i.sku, i.name, i.category, i.unit,
  i.qty_on_hand, i.price, i.catalog_part_id, i.updated_at,
  b.name AS business_name, b.slug AS business_slug,
  b.city, b.province, b.region, b.lat, b.lng
FROM public.business_inventory_items i
JOIN public.businesses b ON b.id = i.business_id
WHERE i.active
  AND i.network_visible
  AND b.expose_inventory_to_network
  AND b.network_exposure_status = 'approved'
  AND b.status = 'active';

GRANT SELECT ON public.network_stock TO anon, authenticated;

DROP POLICY IF EXISTS "inv: public network read" ON public.business_inventory_items;
CREATE POLICY "inv: public network read"
  ON public.business_inventory_items FOR SELECT
  TO anon, authenticated
  USING (
    active
    AND network_visible
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.expose_inventory_to_network
        AND b.network_exposure_status = 'approved'
        AND b.status = 'active'
    )
  );

DROP POLICY IF EXISTS "npi: anyone insert" ON public.network_part_inquiries;
CREATE POLICY "npi: anyone insert"
  ON public.network_part_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.expose_inventory_to_network
        AND b.network_exposure_status = 'approved'
        AND b.status = 'active'
    )
  );

CREATE TABLE IF NOT EXISTS public.business_network_exposure_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN (
    'requested','approved','rejected','revoked',
    'owner_enabled','owner_disabled','reapplied'
  )),
  previous_status text,
  new_status text,
  previous_expose boolean,
  new_expose boolean,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.business_network_exposure_audit TO authenticated;
GRANT ALL ON public.business_network_exposure_audit TO service_role;

ALTER TABLE public.business_network_exposure_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bnea: members read"
  ON public.business_network_exposure_audit FOR SELECT
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "bnea: admin read"
  ON public.business_network_exposure_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS bnea_business_created_idx
  ON public.business_network_exposure_audit (business_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.request_network_exposure(
  _business_id uuid,
  _expose boolean,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_status text;
  prev_expose boolean;
  next_status text;
  action_name text;
BEGIN
  IF NOT public.has_business_role(auth.uid(), _business_id, 'manager'::business_staff_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT network_exposure_status, expose_inventory_to_network
    INTO prev_status, prev_expose
  FROM public.businesses
  WHERE id = _business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  IF _expose THEN
    IF prev_status = 'approved' THEN
      next_status := 'approved';
      action_name := 'owner_enabled';
    ELSE
      next_status := 'pending';
      action_name := CASE WHEN prev_status IN ('rejected','revoked') THEN 'reapplied' ELSE 'requested' END;
    END IF;
  ELSE
    next_status := CASE WHEN prev_status = 'approved' THEN 'approved' ELSE 'none' END;
    action_name := 'owner_disabled';
  END IF;

  UPDATE public.businesses
     SET expose_inventory_to_network = _expose,
         network_exposure_status = next_status,
         network_exposure_requested_at = CASE
           WHEN _expose AND next_status = 'pending' THEN now()
           ELSE network_exposure_requested_at
         END
   WHERE id = _business_id;

  INSERT INTO public.business_network_exposure_audit
    (business_id, actor_id, action, previous_status, new_status, previous_expose, new_expose, note)
  VALUES
    (_business_id, auth.uid(), action_name, prev_status, next_status, prev_expose, _expose, _note);

  RETURN jsonb_build_object('status', next_status, 'expose', _expose);
END;
$$;

REVOKE ALL ON FUNCTION public.request_network_exposure(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_network_exposure(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_network_exposure(
  _business_id uuid,
  _decision text,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_status text;
  prev_expose boolean;
  next_status text;
  action_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _decision NOT IN ('approve','reject','revoke') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;

  SELECT network_exposure_status, expose_inventory_to_network
    INTO prev_status, prev_expose
  FROM public.businesses
  WHERE id = _business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  IF _decision = 'approve' THEN
    next_status := 'approved';
    action_name := 'approved';
  ELSIF _decision = 'reject' THEN
    next_status := CASE WHEN prev_status = 'pending' THEN 'none' ELSE prev_status END;
    action_name := 'rejected';
  ELSE
    next_status := 'revoked';
    action_name := 'revoked';
  END IF;

  UPDATE public.businesses
     SET network_exposure_status = next_status,
         network_exposure_reviewed_at = now(),
         network_exposure_reviewed_by = auth.uid(),
         network_exposure_review_note = _note,
         expose_inventory_to_network = CASE
           WHEN _decision = 'approve' THEN expose_inventory_to_network
           ELSE false
         END
   WHERE id = _business_id;

  INSERT INTO public.business_network_exposure_audit
    (business_id, actor_id, action, previous_status, new_status, previous_expose, new_expose, note)
  VALUES
    (_business_id, auth.uid(), action_name, prev_status, next_status, prev_expose,
     CASE WHEN _decision = 'approve' THEN prev_expose ELSE false END, _note);

  RETURN jsonb_build_object('status', next_status);
END;
$$;

REVOKE ALL ON FUNCTION public.review_network_exposure(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_network_exposure(uuid, text, text) TO authenticated;
