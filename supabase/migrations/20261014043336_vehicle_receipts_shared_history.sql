-- Vehicle receipts: private evidence, human review, and explicit shop/ride links.
-- All SECURITY DEFINER implementations live in a non-exposed schema. Public RPCs
-- are invoker wrappers. No receipt attachment is part of a public report.
BEGIN;
CREATE SCHEMA IF NOT EXISTS vehicle_receipts_private;
REVOKE ALL ON SCHEMA vehicle_receipts_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA vehicle_receipts_private TO authenticated, service_role;

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_type text NOT NULL DEFAULT 'car' CHECK (vehicle_type IN ('car','motorcycle','scooter','truck','suv','van','atv','utv','boat','equipment','other'));
ALTER TABLE public.user_garage_vehicles ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;

ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS rides_vehicle_id_idx ON public.rides(vehicle_id);

CREATE TABLE public.vehicle_shop_links (
  shop_vehicle_id uuid PRIMARY KEY REFERENCES shop_manager.vehicles(id) ON DELETE RESTRICT,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  shop_id uuid NOT NULL REFERENCES shop_manager.shops(id), shop_name text, active boolean NOT NULL DEFAULT true,
  approved_by uuid NOT NULL REFERENCES auth.users(id), approved_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE INDEX vehicle_shop_links_vehicle_idx ON public.vehicle_shop_links(vehicle_id);
CREATE TABLE vehicle_receipts_private.link_requests (
  code text PRIMARY KEY, shop_vehicle_id uuid NOT NULL REFERENCES shop_manager.vehicles(id),
  requested_by uuid NOT NULL REFERENCES auth.users(id), expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
);
CREATE TABLE public.vehicle_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  shop_vehicle_id uuid REFERENCES shop_manager.vehicles(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  file_path text UNIQUE, file_name text, media_type text,
  vendor text CHECK (length(vendor) <= 200), purchased_on date, currency text NOT NULL DEFAULT 'PHP' CHECK (currency ~ '^[A-Z]{3}$'),
  total numeric CHECK (total IS NULL OR total BETWEEN 0 AND 99999999),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed')),
  share_with_shop boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (vehicle_id IS NOT NULL OR shop_vehicle_id IS NOT NULL)
);
CREATE INDEX vehicle_receipts_vehicle_idx ON public.vehicle_receipts(vehicle_id,created_at DESC);
CREATE INDEX vehicle_receipts_shop_vehicle_idx ON public.vehicle_receipts(shop_vehicle_id,created_at DESC);
CREATE TABLE public.vehicle_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), receipt_id uuid NOT NULL REFERENCES public.vehicle_receipts(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 250),
  category text CHECK (category IN ('suspension','brakes','electrical','fuel','engine','drivetrain','cooling','exhaust','wheels_tires','body','interior','fluids','accessories','labor','misc')),
  brand text CHECK (length(brand) <= 120), part_number text CHECK (length(part_number) <= 120),
  quantity numeric CHECK (quantity IS NULL OR quantity > 0 AND quantity <= 99999),
  total numeric CHECK (total IS NULL OR total BETWEEN 0 AND 99999999),
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1), reviewed boolean NOT NULL DEFAULT false,
  installed_on date, installed_by uuid REFERENCES auth.users(id), installation_origin text CHECK (installation_origin IN ('customer_entered','business_attested')), odometer_km integer CHECK (odometer_km IS NULL OR odometer_km BETWEEN 0 AND 2000000),
  public_summary_allowed boolean NOT NULL DEFAULT false, sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX vehicle_receipt_items_receipt_idx ON public.vehicle_receipt_items(receipt_id);
CREATE TABLE vehicle_receipts_private.scan_budgets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id), day date NOT NULL, scans integer NOT NULL DEFAULT 0
);

CREATE FUNCTION vehicle_receipts_private.owns_vehicle(_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.vehicles WHERE id=_id AND owner_user_id=auth.uid())
$$;
CREATE FUNCTION vehicle_receipts_private.shop_access(_id uuid, _write boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,shop_manager,pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM shop_manager.vehicles v JOIN shop_manager.customers c ON c.id=v.customer_id JOIN shop_manager.profiles p ON p.shop_id=c.shop_id
    WHERE v.id=_id AND (p.id=auth.uid() OR p.user_id=auth.uid())
      AND 'vehicles'=ANY(shop_manager.employee_allowed_modules())
      AND ( shop_manager.is_shop_operations_manager(auth.uid(),c.shop_id)
        OR EXISTS (SELECT 1 FROM shop_manager.user_roles ur JOIN shop_manager.roles r ON r.id=ur.role_id
          WHERE ur.user_id IN (p.id,auth.uid()) AND r.name::text IN ('parts_manager','service_advisor','office_admin')))
  )
$$;
CREATE FUNCTION vehicle_receipts_private.receipt_access(_id uuid, _write boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,vehicle_receipts_private,pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.vehicle_receipts r WHERE r.id=_id AND (
      vehicle_receipts_private.owns_vehicle(r.vehicle_id)
      OR (r.shop_vehicle_id IS NOT NULL AND vehicle_receipts_private.shop_access(r.shop_vehicle_id,_write))
      OR (NOT _write AND r.share_with_shop AND EXISTS (
        SELECT 1 FROM public.vehicle_shop_links l WHERE l.vehicle_id=r.vehicle_id AND l.active
          AND vehicle_receipts_private.shop_access(l.shop_vehicle_id,false)))
    )
  )
$$;
ALTER TABLE public.vehicle_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_shop_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_receipts_private.link_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_receipts_private.scan_budgets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vehicle_receipts,public.vehicle_receipt_items,public.vehicle_shop_links FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.vehicle_receipts,public.vehicle_receipt_items,public.vehicle_shop_links TO authenticated;
GRANT ALL ON public.vehicle_receipts,public.vehicle_receipt_items,public.vehicle_shop_links TO service_role;
CREATE POLICY receipt_read ON public.vehicle_receipts FOR SELECT TO authenticated USING (vehicle_receipts_private.receipt_access(id));
CREATE POLICY receipt_item_read ON public.vehicle_receipt_items FOR SELECT TO authenticated USING (vehicle_receipts_private.receipt_access(receipt_id));
CREATE POLICY vehicle_shop_link_read ON public.vehicle_shop_links FOR SELECT TO authenticated USING (
  vehicle_receipts_private.owns_vehicle(vehicle_id) OR vehicle_receipts_private.shop_access(shop_vehicle_id)
);

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('vehicle-receipts','vehicle-receipts',false,10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
CREATE POLICY vehicle_receipt_file_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='vehicle-receipts' AND EXISTS (SELECT 1 FROM public.vehicle_receipts r WHERE r.file_path=name AND vehicle_receipts_private.receipt_access(r.id))
);
CREATE POLICY vehicle_receipt_file_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id='vehicle-receipts' AND EXISTS (SELECT 1 FROM public.vehicle_receipts r WHERE r.file_path=name
    AND r.created_by=auth.uid() AND r.status='draft' AND vehicle_receipts_private.receipt_access(r.id,true))
);
CREATE POLICY vehicle_receipt_file_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id='vehicle-receipts' AND EXISTS (SELECT 1 FROM public.vehicle_receipts r WHERE r.file_path=name
    AND r.status='draft' AND vehicle_receipts_private.receipt_access(r.id,true))
);

CREATE FUNCTION vehicle_receipts_private.start_receipt(_vehicle_id uuid,_shop_vehicle_id uuid,_file_name text,_media_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,vehicle_receipts_private,pg_temp AS $$
DECLARE r public.vehicle_receipts; v_id uuid:=gen_random_uuid(); v_ext text; v_path text;
BEGIN
  IF auth.uid() IS NULL OR (_vehicle_id IS NULL)=(_shop_vehicle_id IS NULL) THEN RAISE EXCEPTION 'Choose one vehicle'; END IF;
  IF _vehicle_id IS NOT NULL AND NOT vehicle_receipts_private.owns_vehicle(_vehicle_id)
    OR _shop_vehicle_id IS NOT NULL AND NOT vehicle_receipts_private.shop_access(_shop_vehicle_id,true) THEN RAISE EXCEPTION 'Vehicle access required'; END IF;
  IF _shop_vehicle_id IS NOT NULL THEN SELECT vehicle_id INTO _vehicle_id FROM public.vehicle_shop_links WHERE shop_vehicle_id=_shop_vehicle_id AND active; END IF;
  IF _file_name IS NOT NULL THEN
    v_ext:=CASE _media_type WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' WHEN 'image/webp' THEN 'webp' WHEN 'application/pdf' THEN 'pdf' END;
    IF v_ext IS NULL OR length(_file_name)>200 THEN RAISE EXCEPTION 'Invalid receipt file'; END IF;
    v_path:=auth.uid()::text||'/'||v_id::text||'/original.'||v_ext;
  END IF;
  INSERT INTO public.vehicle_receipts(id,vehicle_id,shop_vehicle_id,created_by,file_path,file_name,media_type)
  VALUES(v_id,_vehicle_id,_shop_vehicle_id,auth.uid(),v_path,_file_name,_media_type) RETURNING * INTO r;
  RETURN jsonb_build_object('id',r.id,'file_path',r.file_path);
END $$;

-- Synchronize confirmed evidence into the existing customer/vehicle history ledger.
-- Uses item IDs for deduplication. Drafts never become history; sharing is opt-in.
CREATE FUNCTION vehicle_receipts_private.sync_history(_receipt_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,vehicle_receipts_private,pg_temp AS $$
DECLARE r public.vehicle_receipts; i public.vehicle_receipt_items; v_account uuid; v_business uuid; v_owner uuid;
BEGIN
  SELECT * INTO r FROM public.vehicle_receipts WHERE id=_receipt_id;
  IF r.status<>'confirmed' OR r.vehicle_id IS NULL THEN RETURN; END IF;
  SELECT owner_user_id INTO v_owner FROM public.vehicles WHERE id=r.vehicle_id;
  INSERT INTO public.customer_accounts(user_id) VALUES(v_owner) ON CONFLICT(user_id) DO NOTHING;
  SELECT id INTO v_account FROM public.customer_accounts WHERE user_id=v_owner;
  IF r.shop_vehicle_id IS NOT NULL THEN
    SELECT s.business_id INTO v_business FROM shop_manager.shops s JOIN shop_manager.customers c ON c.shop_id=s.id JOIN shop_manager.vehicles v ON v.customer_id=c.id WHERE v.id=r.shop_vehicle_id LIMIT 1;
  END IF;
  FOR i IN SELECT * FROM public.vehicle_receipt_items WHERE receipt_id=r.id AND reviewed LOOP
    INSERT INTO public.vehicle_history_events(vehicle_id,customer_account_id,business_id,event_type,occurred_at,title,summary,
      source_table,source_id,verification_status,public_summary_allowed,actor_id,metadata)
    VALUES(r.vehicle_id,v_account,v_business,'part_paid',r.purchased_on::timestamptz,i.description,'Purchased: '||i.category,
      'vehicle_receipt_items',i.id,CASE WHEN r.shop_vehicle_id IS NULL THEN 'customer_entered' ELSE 'business_attested' END,
      i.public_summary_allowed,r.created_by,jsonb_build_object('category',i.category,'quantity',i.quantity,'currency',r.currency))
    ON CONFLICT(source_table,source_id,event_type) WHERE source_id IS NOT NULL DO UPDATE SET public_summary_allowed=EXCLUDED.public_summary_allowed;
    IF i.installed_on IS NOT NULL THEN
      INSERT INTO public.vehicle_history_events(vehicle_id,customer_account_id,business_id,event_type,occurred_at,odometer_km,title,summary,
        source_table,source_id,verification_status,public_summary_allowed,actor_id,metadata)
      VALUES(r.vehicle_id,v_account,v_business,'part_installed',i.installed_on::timestamptz,i.odometer_km,i.description,'Installed: '||i.category,
        'vehicle_receipt_items',i.id,i.installation_origin,
        i.public_summary_allowed,i.installed_by,jsonb_build_object('category',i.category,'quantity',i.quantity))
      ON CONFLICT(source_table,source_id,event_type) WHERE source_id IS NOT NULL DO UPDATE SET public_summary_allowed=EXCLUDED.public_summary_allowed;
    END IF;
  END LOOP;
END $$;

CREATE FUNCTION vehicle_receipts_private.save_receipt(_id uuid,_vendor text,_purchased_on date,_currency text,_total numeric,_items jsonb,_confirm boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,vehicle_receipts_private,pg_temp AS $$
DECLARE r public.vehicle_receipts; i jsonb; n integer:=0;
BEGIN
  IF NOT vehicle_receipts_private.receipt_access(_id,true) THEN RAISE EXCEPTION 'Receipt write access required'; END IF;
  SELECT * INTO r FROM public.vehicle_receipts WHERE id=_id FOR UPDATE;
  IF r.status<>'draft' THEN RAISE EXCEPTION 'Confirmed receipts are immutable'; END IF;
  IF jsonb_typeof(_items)<>'array' OR jsonb_array_length(_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Receipt needs 1 to 100 items'; END IF;
  IF _confirm AND (_purchased_on IS NULL OR _purchased_on>(now() AT TIME ZONE 'Asia/Manila')::date) THEN RAISE EXCEPTION 'Valid purchase date required'; END IF;
  IF r.file_path IS NOT NULL AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='vehicle-receipts' AND name=r.file_path) THEN RAISE EXCEPTION 'Upload the receipt first'; END IF;
  DELETE FROM public.vehicle_receipt_items WHERE receipt_id=_id;
  FOR i IN SELECT value FROM jsonb_array_elements(_items) LOOP
    IF _confirm AND (NOT COALESCE((i->>'reviewed')::boolean,false) OR NULLIF(i->>'category','') IS NULL OR (i->>'quantity') IS NULL) THEN RAISE EXCEPTION 'Review every item before confirming'; END IF;
    INSERT INTO public.vehicle_receipt_items(receipt_id,description,category,brand,part_number,quantity,total,confidence,reviewed,sort_order)
    VALUES(_id,i->>'description',i->>'category',i->>'brand',i->>'part_number',(i->>'quantity')::numeric,(i->>'total')::numeric,
      COALESCE((i->>'confidence')::numeric,0),COALESCE((i->>'reviewed')::boolean,false),n);
    n:=n+1;
  END LOOP;
  UPDATE public.vehicle_receipts SET vendor=_vendor,purchased_on=_purchased_on,currency=_currency,total=_total,
    status=CASE WHEN _confirm THEN 'confirmed' ELSE 'draft' END,updated_at=now() WHERE id=_id;
  PERFORM vehicle_receipts_private.sync_history(_id);
END $$;
CREATE FUNCTION vehicle_receipts_private.install_item(_item_id uuid,_installed_on date,_odometer_km integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,vehicle_receipts_private,pg_temp AS $$
DECLARE i public.vehicle_receipt_items; r public.vehicle_receipts;
BEGIN
  SELECT * INTO i FROM public.vehicle_receipt_items WHERE id=_item_id FOR UPDATE;
  IF NOT FOUND OR NOT vehicle_receipts_private.receipt_access(i.receipt_id,true) THEN RAISE EXCEPTION 'Item write access required'; END IF;
  SELECT * INTO r FROM public.vehicle_receipts WHERE id=i.receipt_id;
  IF r.status<>'confirmed' OR NOT i.reviewed THEN RAISE EXCEPTION 'Confirm receipt first'; END IF;
  IF _installed_on IS NULL OR _installed_on<r.purchased_on OR _installed_on>(now() AT TIME ZONE 'Asia/Manila')::date THEN RAISE EXCEPTION 'Installation date must be between purchase date and today'; END IF;
  IF i.installed_on IS NOT NULL THEN RAISE EXCEPTION 'Installation is already recorded'; END IF;
  UPDATE public.vehicle_receipt_items SET installed_on=_installed_on,odometer_km=_odometer_km,installed_by=auth.uid(),
    installation_origin=CASE WHEN vehicle_receipts_private.owns_vehicle(r.vehicle_id) THEN 'customer_entered' ELSE 'business_attested' END WHERE id=_item_id;
  PERFORM vehicle_receipts_private.sync_history(i.receipt_id);
END $$;
CREATE FUNCTION vehicle_receipts_private.set_sharing(_id uuid,_share_with_shop boolean,_public_summary boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,vehicle_receipts_private,pg_temp AS $$
DECLARE r public.vehicle_receipts;
BEGIN
  SELECT * INTO r FROM public.vehicle_receipts WHERE id=_id FOR UPDATE;
  IF NOT FOUND OR NOT vehicle_receipts_private.owns_vehicle(r.vehicle_id) THEN RAISE EXCEPTION 'Vehicle owner access required'; END IF;
  UPDATE public.vehicle_receipts SET share_with_shop=_share_with_shop WHERE id=_id;
  UPDATE public.vehicle_receipt_items SET public_summary_allowed=_public_summary WHERE receipt_id=_id;
  PERFORM vehicle_receipts_private.sync_history(_id);
END $$;
CREATE FUNCTION vehicle_receipts_private.discard_draft(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,vehicle_receipts_private,pg_temp AS $$
BEGIN
  IF NOT vehicle_receipts_private.receipt_access(_id,true) THEN RAISE EXCEPTION 'Receipt write access required'; END IF;
  DELETE FROM public.vehicle_receipts WHERE id=_id AND status='draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'Only draft receipts can be discarded'; END IF;
END $$;
CREATE FUNCTION vehicle_receipts_private.claim_scan(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,vehicle_receipts_private,pg_temp AS $$
DECLARE count_used integer;
BEGIN
  IF NOT vehicle_receipts_private.receipt_access(_id,true) OR NOT EXISTS(SELECT 1 FROM public.vehicle_receipts WHERE id=_id AND status='draft') THEN RAISE EXCEPTION 'Draft receipt write access required'; END IF;
  INSERT INTO vehicle_receipts_private.scan_budgets(user_id,day,scans) VALUES(auth.uid(),CURRENT_DATE,1)
  ON CONFLICT(user_id) DO UPDATE SET day=CURRENT_DATE,scans=CASE WHEN scan_budgets.day=CURRENT_DATE THEN scan_budgets.scans+1 ELSE 1 END
  RETURNING scans INTO count_used;
  IF count_used>30 THEN RAISE EXCEPTION 'Daily receipt scan limit reached; manual entry remains available'; END IF;
END $$;

CREATE FUNCTION vehicle_receipts_private.link_ride(_ride_id uuid,_vehicle_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,vehicle_receipts_private,pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.rides WHERE id=_ride_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Ride owner required'; END IF;
  IF _vehicle_id IS NOT NULL AND NOT vehicle_receipts_private.owns_vehicle(_vehicle_id) THEN RAISE EXCEPTION 'Vehicle owner required'; END IF;
  UPDATE public.rides SET vehicle_id=_vehicle_id WHERE id=_ride_id;
END $$;
-- Also enforce ownership for direct rides updates through the existing editor.
CREATE FUNCTION vehicle_receipts_private.guard_ride_link() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  IF NEW.vehicle_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.vehicles WHERE id=NEW.vehicle_id AND owner_user_id=NEW.user_id) THEN RAISE EXCEPTION 'Ride and vehicle must have the same owner'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ride_vehicle_link_guard BEFORE INSERT OR UPDATE OF vehicle_id,user_id ON public.rides FOR EACH ROW EXECUTE FUNCTION vehicle_receipts_private.guard_ride_link();
CREATE FUNCTION vehicle_receipts_private.request_link(_shop_vehicle_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,vehicle_receipts_private,pg_temp AS $$
DECLARE code text:=replace(gen_random_uuid()::text,'-','');
BEGIN
  IF NOT vehicle_receipts_private.shop_access(_shop_vehicle_id,true) THEN RAISE EXCEPTION 'Shop vehicle write access required'; END IF;
  DELETE FROM vehicle_receipts_private.link_requests WHERE shop_vehicle_id=_shop_vehicle_id;
  INSERT INTO vehicle_receipts_private.link_requests(code,shop_vehicle_id,requested_by) VALUES(code,_shop_vehicle_id,auth.uid());
  RETURN code;
END $$;
CREATE FUNCTION vehicle_receipts_private.approve_link(_vehicle_id uuid,_code text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,shop_manager,vehicle_receipts_private,pg_temp AS $$
DECLARE v_shop_vehicle uuid; v_shop_id uuid; v_shop_name text; v_shop_vin text; v_vin text; r record;
BEGIN
  IF NOT vehicle_receipts_private.owns_vehicle(_vehicle_id) THEN RAISE EXCEPTION 'Vehicle owner required'; END IF;
  SELECT shop_vehicle_id INTO v_shop_vehicle FROM vehicle_receipts_private.link_requests WHERE code=_code AND expires_at>now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shop connection code is invalid or expired'; END IF;
  SELECT c.shop_id,v.vin,s.name INTO v_shop_id,v_shop_vin,v_shop_name FROM shop_manager.vehicles v JOIN shop_manager.customers c ON c.id=v.customer_id LEFT JOIN shop_manager.shops s ON s.id=c.shop_id WHERE v.id=v_shop_vehicle;
  SELECT vin INTO v_vin FROM public.vehicles WHERE id=_vehicle_id;
  IF NULLIF(trim(v_vin),'') IS NOT NULL AND NULLIF(trim(v_shop_vin),'') IS NOT NULL AND upper(trim(v_vin))<>upper(trim(v_shop_vin)) THEN RAISE EXCEPTION 'VIN/chassis does not match this shop vehicle'; END IF;
  IF EXISTS(SELECT 1 FROM public.vehicle_shop_links WHERE shop_vehicle_id=v_shop_vehicle AND vehicle_id<>_vehicle_id) THEN RAISE EXCEPTION 'Shop vehicle is already linked to another vehicle'; END IF;
  INSERT INTO public.vehicle_shop_links(shop_vehicle_id,vehicle_id,shop_id,shop_name,approved_by)
    VALUES(v_shop_vehicle,_vehicle_id,v_shop_id,v_shop_name,auth.uid())
  ON CONFLICT(shop_vehicle_id) DO UPDATE SET active=true,revoked_at=NULL,approved_at=now(),approved_by=auth.uid();
  UPDATE public.vehicle_receipts SET vehicle_id=_vehicle_id WHERE shop_vehicle_id=v_shop_vehicle AND vehicle_id IS NULL;
  UPDATE public.installed_components SET public_vehicle_id=_vehicle_id WHERE shop_manager_vehicle_id=v_shop_vehicle AND public_vehicle_id IS NULL;
  FOR r IN SELECT id FROM public.vehicle_receipts WHERE shop_vehicle_id=v_shop_vehicle LOOP PERFORM vehicle_receipts_private.sync_history(r.id); END LOOP;
  DELETE FROM vehicle_receipts_private.link_requests WHERE code=_code;
END $$;
CREATE FUNCTION vehicle_receipts_private.revoke_link(_vehicle_id uuid,_shop_vehicle_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,vehicle_receipts_private,pg_temp AS $$
BEGIN
  IF NOT vehicle_receipts_private.owns_vehicle(_vehicle_id) THEN RAISE EXCEPTION 'Vehicle owner required'; END IF;
  UPDATE public.vehicle_shop_links SET active=false,revoked_at=now() WHERE vehicle_id=_vehicle_id AND shop_vehicle_id=_shop_vehicle_id;
END $$;

-- Raw service rows must not reveal legacy receipt URLs to public Data API clients.
DROP POLICY IF EXISTS "Public records readable" ON public.vehicle_service_records;

-- Existing service-record uploads now use a separate private bucket.
ALTER TABLE public.vehicle_service_records ADD COLUMN IF NOT EXISTS receipt_path text;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('vehicle-service-receipts','vehicle-service-receipts',false,10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT(id) DO UPDATE SET public=false;
CREATE POLICY private_service_receipt_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='vehicle-service-receipts' AND (storage.foldername(name))[1]=auth.uid()::text
);
CREATE POLICY private_service_receipt_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id='vehicle-service-receipts' AND (storage.foldername(name))[1]=auth.uid()::text
  AND EXISTS(SELECT 1 FROM public.vehicles v WHERE v.id::text=(storage.foldername(name))[2] AND v.owner_user_id=auth.uid())
);
CREATE POLICY private_service_receipt_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id='vehicle-service-receipts' AND (storage.foldername(name))[1]=auth.uid()::text
);
-- Direct service-record writes cannot attach another owner's private object.
CREATE FUNCTION vehicle_receipts_private.guard_service_receipt() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE owner_id uuid;
BEGIN
 SELECT owner_user_id INTO owner_id FROM public.vehicles WHERE id=NEW.vehicle_id;
 IF NEW.receipt_path IS NOT NULL AND (split_part(NEW.receipt_path,'/',1)<>owner_id::text OR split_part(NEW.receipt_path,'/',2)<>NEW.vehicle_id::text) THEN RAISE EXCEPTION 'Receipt must belong to this vehicle owner'; END IF;
 IF NEW.receipt_url IS NOT NULL AND (TG_OP='INSERT' OR NEW.receipt_url IS DISTINCT FROM OLD.receipt_url) THEN RAISE EXCEPTION 'Use a private receipt attachment'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER private_service_receipt_guard BEFORE INSERT OR UPDATE ON public.vehicle_service_records FOR EACH ROW EXECUTE FUNCTION vehicle_receipts_private.guard_service_receipt();

CREATE FUNCTION vehicle_receipts_private.guard_garage_link() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NEW.vehicle_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.vehicles WHERE id=NEW.vehicle_id AND owner_user_id=NEW.user_id) THEN RAISE EXCEPTION 'Garage and vehicle must have the same owner'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vehicle_receipts_private.guard_garage_link() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER garage_vehicle_link_guard BEFORE INSERT OR UPDATE OF vehicle_id,user_id ON public.user_garage_vehicles FOR EACH ROW EXECUTE FUNCTION vehicle_receipts_private.guard_garage_link();

-- Public wrappers are generated below; each private implementation authorizes auth.uid().

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA vehicle_receipts_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.owns_vehicle(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.shop_access(uuid,boolean) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.receipt_access(uuid,boolean) TO authenticated,service_role;
CREATE FUNCTION public.start_vehicle_receipt(_vehicle_id uuid,_shop_vehicle_id uuid,_file_name text,_media_type text) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT vehicle_receipts_private.start_receipt(_vehicle_id,_shop_vehicle_id,_file_name,_media_type)
$$;
REVOKE ALL ON FUNCTION public.start_vehicle_receipt(uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_vehicle_receipt(uuid,uuid,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.start_receipt(uuid,uuid,text,text) TO authenticated,service_role;
CREATE FUNCTION public.save_vehicle_receipt(_id uuid,_vendor text,_purchased_on date,_currency text,_total numeric,_items jsonb,_confirm boolean) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT vehicle_receipts_private.save_receipt(_id,_vendor,_purchased_on,_currency,_total,_items,_confirm)
$$;
REVOKE ALL ON FUNCTION public.save_vehicle_receipt(uuid,text,date,text,numeric,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_vehicle_receipt(uuid,text,date,text,numeric,jsonb,boolean) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.save_receipt(uuid,text,date,text,numeric,jsonb,boolean) TO authenticated,service_role;
CREATE FUNCTION public.install_vehicle_receipt_item(_item_id uuid,_installed_on date,_odometer_km integer) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT vehicle_receipts_private.install_item(_item_id,_installed_on,_odometer_km)
$$;
REVOKE ALL ON FUNCTION public.install_vehicle_receipt_item(uuid,date,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.install_vehicle_receipt_item(uuid,date,integer) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.install_item(uuid,date,integer) TO authenticated,service_role;
CREATE FUNCTION public.set_vehicle_receipt_sharing(_id uuid,_share_with_shop boolean,_public_summary boolean) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT vehicle_receipts_private.set_sharing(_id,_share_with_shop,_public_summary)
$$;
REVOKE ALL ON FUNCTION public.set_vehicle_receipt_sharing(uuid,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_vehicle_receipt_sharing(uuid,boolean,boolean) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.set_sharing(uuid,boolean,boolean) TO authenticated,service_role;
CREATE FUNCTION public.discard_vehicle_receipt_draft(_id uuid) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT vehicle_receipts_private.discard_draft(_id)
$$;
REVOKE ALL ON FUNCTION public.discard_vehicle_receipt_draft(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.discard_vehicle_receipt_draft(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.discard_draft(uuid) TO authenticated,service_role;
CREATE FUNCTION public.claim_vehicle_receipt_scan(_id uuid) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT vehicle_receipts_private.claim_scan(_id)
$$;
REVOKE ALL ON FUNCTION public.claim_vehicle_receipt_scan(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_vehicle_receipt_scan(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.claim_scan(uuid) TO authenticated,service_role;
CREATE FUNCTION public.link_ride_vehicle(_ride_id uuid,_vehicle_id uuid) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT vehicle_receipts_private.link_ride(_ride_id,_vehicle_id)
$$;
REVOKE ALL ON FUNCTION public.link_ride_vehicle(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.link_ride_vehicle(uuid,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.link_ride(uuid,uuid) TO authenticated,service_role;
CREATE FUNCTION public.request_shop_vehicle_link(_shop_vehicle_id uuid) RETURNS text
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT vehicle_receipts_private.request_link(_shop_vehicle_id)
$$;
REVOKE ALL ON FUNCTION public.request_shop_vehicle_link(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_shop_vehicle_link(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.request_link(uuid) TO authenticated,service_role;
CREATE FUNCTION public.approve_shop_vehicle_link(_vehicle_id uuid,_code text) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT vehicle_receipts_private.approve_link(_vehicle_id,_code)
$$;
REVOKE ALL ON FUNCTION public.approve_shop_vehicle_link(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_shop_vehicle_link(uuid,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.approve_link(uuid,text) TO authenticated,service_role;
CREATE FUNCTION public.revoke_shop_vehicle_link(_vehicle_id uuid,_shop_vehicle_id uuid) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$
  SELECT vehicle_receipts_private.revoke_link(_vehicle_id,_shop_vehicle_id)
$$;
REVOKE ALL ON FUNCTION public.revoke_shop_vehicle_link(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revoke_shop_vehicle_link(uuid,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.revoke_link(uuid,uuid) TO authenticated,service_role;

-- Network installations acquire the explicitly approved owner link automatically.
CREATE FUNCTION vehicle_receipts_private.link_installed_component() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  SELECT vehicle_id INTO NEW.public_vehicle_id FROM public.vehicle_shop_links WHERE shop_vehicle_id=NEW.shop_manager_vehicle_id AND active;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vehicle_receipts_private.link_installed_component() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER installed_component_owner_link BEFORE INSERT ON public.installed_components
FOR EACH ROW EXECUTE FUNCTION vehicle_receipts_private.link_installed_component();

-- Authenticated visitors must not use the public-summary policy to read private
-- event metadata. Public reports use an explicit server projection instead.
DROP POLICY IF EXISTS "vehicle history: opted-in public summary" ON public.vehicle_history_events;
CREATE POLICY "vehicle history: opted-in public summary" ON public.vehicle_history_events
FOR SELECT TO anon USING (public_summary_allowed AND EXISTS(SELECT 1 FROM public.vehicles v WHERE v.id=vehicle_id AND v.is_public));
-- Publish network installations to the same owner ledger after explicit linking.
CREATE FUNCTION vehicle_receipts_private.sync_component_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE owner_id uuid; account_id uuid;
BEGIN
 IF NEW.public_vehicle_id IS NULL THEN RETURN NEW; END IF;
 SELECT owner_user_id INTO owner_id FROM public.vehicles WHERE id=NEW.public_vehicle_id;
 INSERT INTO public.customer_accounts(user_id) VALUES(owner_id) ON CONFLICT(user_id) DO NOTHING;
 SELECT id INTO account_id FROM public.customer_accounts WHERE user_id=owner_id;
 INSERT INTO public.vehicle_history_events(vehicle_id,customer_account_id,business_id,event_type,occurred_at,odometer_km,title,summary,source_table,source_id,verification_status,actor_id)
 VALUES(NEW.public_vehicle_id,account_id,NEW.business_id,'part_installed',NEW.installed_at,NEW.installed_odometer_km,NEW.name_snapshot,'Shop recorded installation','installed_components',NEW.id,'business_attested',NEW.installer_user_id)
 ON CONFLICT(source_table,source_id,event_type) WHERE source_id IS NOT NULL DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vehicle_receipts_private.sync_component_history() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER installed_component_history AFTER INSERT OR UPDATE OF public_vehicle_id ON public.installed_components
FOR EACH ROW EXECUTE FUNCTION vehicle_receipts_private.sync_component_history();

ALTER TABLE shop_manager.expenses ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES shop_manager.vehicles(id);
ALTER TABLE shop_manager.expenses ADD COLUMN IF NOT EXISTS vehicle_receipt_id uuid UNIQUE REFERENCES public.vehicle_receipts(id);
CREATE INDEX IF NOT EXISTS expenses_vehicle_id_idx ON shop_manager.expenses(vehicle_id);
CREATE FUNCTION vehicle_receipts_private.record_expense(_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,shop_manager,pg_temp AS $$
DECLARE r public.vehicle_receipts; shop_id_value uuid; expense_id uuid;
BEGIN
 SELECT * INTO r FROM public.vehicle_receipts WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR r.shop_vehicle_id IS NULL OR NOT vehicle_receipts_private.shop_access(r.shop_vehicle_id,true) THEN RAISE EXCEPTION 'Shop receipt access required'; END IF;
 SELECT c.shop_id INTO shop_id_value FROM shop_manager.customers c JOIN shop_manager.vehicles v ON v.customer_id=c.id WHERE v.id=r.shop_vehicle_id;
 IF NOT shop_manager.is_shop_operations_manager(auth.uid(),shop_id_value) THEN RAISE EXCEPTION 'Shop manager access required for accounting'; END IF;
 IF r.status<>'confirmed' OR r.currency<>'PHP' OR r.total IS NULL THEN RAISE EXCEPTION 'Confirm receipt with a PHP total first'; END IF;
 INSERT INTO shop_manager.expenses(shop_id,vehicle_id,vehicle_receipt_id,amount,expense_date,description,created_by)
 VALUES(shop_id_value,r.shop_vehicle_id,r.id,r.total,r.purchased_on,COALESCE(r.vendor,'Vehicle parts receipt'),auth.uid())
 ON CONFLICT(vehicle_receipt_id) DO UPDATE SET vehicle_receipt_id=EXCLUDED.vehicle_receipt_id RETURNING id INTO expense_id;
 RETURN expense_id;
END $$;
REVOKE ALL ON FUNCTION vehicle_receipts_private.record_expense(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.record_expense(uuid) TO authenticated,service_role;
CREATE FUNCTION public.record_vehicle_receipt_expense(_id uuid) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$ SELECT vehicle_receipts_private.record_expense(_id) $$;
REVOKE ALL ON FUNCTION public.record_vehicle_receipt_expense(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_vehicle_receipt_expense(uuid) TO authenticated,service_role;
CREATE FUNCTION vehicle_receipts_private.set_history_visibility(_id uuid,_public boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE e public.vehicle_history_events;
BEGIN
 SELECT * INTO e FROM public.vehicle_history_events WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR NOT vehicle_receipts_private.owns_vehicle(e.vehicle_id) THEN RAISE EXCEPTION 'Vehicle owner access required'; END IF;
 UPDATE public.vehicle_history_events SET public_summary_allowed=_public WHERE id=_id;
 IF e.source_table='vehicle_receipt_items' THEN
   UPDATE public.vehicle_receipt_items SET public_summary_allowed=_public WHERE id=e.source_id;
   UPDATE public.vehicle_history_events SET public_summary_allowed=_public WHERE source_table=e.source_table AND source_id=e.source_id;
 END IF;
END $$;
REVOKE ALL ON FUNCTION vehicle_receipts_private.set_history_visibility(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.set_history_visibility(uuid,boolean) TO authenticated,service_role;
CREATE FUNCTION public.set_vehicle_history_visibility(_id uuid,_public boolean) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$ SELECT vehicle_receipts_private.set_history_visibility(_id,_public) $$;
REVOKE ALL ON FUNCTION public.set_vehicle_history_visibility(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_vehicle_history_visibility(uuid,boolean) TO authenticated,service_role;

CREATE FUNCTION vehicle_receipts_private.sync_service_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE owner_id uuid; account_id uuid;
BEGIN
 IF TG_OP='DELETE' THEN
   UPDATE public.vehicle_history_events SET public_summary_allowed=false,summary='Service entry removed by owner' WHERE source_table='vehicle_service_records' AND source_id=OLD.id;
   RETURN OLD;
 END IF;
 SELECT owner_user_id INTO owner_id FROM public.vehicles WHERE id=NEW.vehicle_id;
 INSERT INTO public.customer_accounts(user_id) VALUES(owner_id) ON CONFLICT(user_id) DO NOTHING;
 SELECT id INTO account_id FROM public.customer_accounts WHERE user_id=owner_id;
 INSERT INTO public.vehicle_history_events(vehicle_id,customer_account_id,event_type,occurred_at,odometer_km,title,summary,source_table,source_id,verification_status,actor_id)
 VALUES(NEW.vehicle_id,account_id,'service',NEW.performed_at::timestamptz,NEW.mileage_km,NEW.title,NEW.service_type::text,'vehicle_service_records',NEW.id,'customer_entered',NEW.created_by)
 ON CONFLICT(source_table,source_id,event_type) WHERE source_id IS NOT NULL DO UPDATE SET occurred_at=EXCLUDED.occurred_at,odometer_km=EXCLUDED.odometer_km,title=EXCLUDED.title,summary=EXCLUDED.summary;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vehicle_receipts_private.sync_service_history() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER service_record_history AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_service_records FOR EACH ROW EXECUTE FUNCTION vehicle_receipts_private.sync_service_history();
-- Backfill summaries only; existing receipts remain private and require the migration utility.
INSERT INTO public.customer_accounts(user_id) SELECT DISTINCT owner_user_id FROM public.vehicles v JOIN public.vehicle_service_records s ON s.vehicle_id=v.id ON CONFLICT(user_id) DO NOTHING;
INSERT INTO public.vehicle_history_events(vehicle_id,customer_account_id,event_type,occurred_at,odometer_km,title,summary,source_table,source_id,verification_status,actor_id)
SELECT s.vehicle_id,c.id,'service',s.performed_at::timestamptz,s.mileage_km,s.title,s.service_type::text,'vehicle_service_records',s.id,'customer_entered',s.created_by
FROM public.vehicle_service_records s JOIN public.vehicles v ON v.id=s.vehicle_id JOIN public.customer_accounts c ON c.user_id=v.owner_user_id
ON CONFLICT(source_table,source_id,event_type) WHERE source_id IS NOT NULL DO NOTHING;
CREATE FUNCTION vehicle_receipts_private.workspace_access(_vehicle_id uuid,_shop_vehicle_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,shop_manager,pg_temp AS $$
DECLARE writable boolean; can_expense boolean:=false; sid uuid;
BEGIN
 IF auth.uid() IS NULL OR (_vehicle_id IS NULL)=(_shop_vehicle_id IS NULL) THEN RAISE EXCEPTION 'Choose one vehicle'; END IF;
 IF _vehicle_id IS NOT NULL THEN
   writable:=vehicle_receipts_private.owns_vehicle(_vehicle_id);
   IF NOT writable THEN RAISE EXCEPTION 'Vehicle owner access required'; END IF;
 ELSE
   IF NOT vehicle_receipts_private.shop_access(_shop_vehicle_id,false) THEN RAISE EXCEPTION 'Receipt module access required'; END IF;
   writable:=vehicle_receipts_private.shop_access(_shop_vehicle_id,true);
   SELECT c.shop_id INTO sid FROM shop_manager.vehicles v JOIN shop_manager.customers c ON c.id=v.customer_id WHERE v.id=_shop_vehicle_id;
   can_expense:=shop_manager.is_shop_operations_manager(auth.uid(),sid);
 END IF;
 RETURN jsonb_build_object('can_write',writable,'can_record_expense',can_expense);
END $$;
REVOKE ALL ON FUNCTION vehicle_receipts_private.workspace_access(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.workspace_access(uuid,uuid) TO authenticated,service_role;
CREATE FUNCTION public.vehicle_receipt_workspace_access(_vehicle_id uuid,_shop_vehicle_id uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$ SELECT vehicle_receipts_private.workspace_access(_vehicle_id,_shop_vehicle_id) $$;
REVOKE ALL ON FUNCTION public.vehicle_receipt_workspace_access(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.vehicle_receipt_workspace_access(uuid,uuid) TO authenticated,service_role;
CREATE FUNCTION vehicle_receipts_private.attachment_status(_ids uuid[]) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,storage,pg_temp AS $$
 SELECT COALESCE(jsonb_object_agg(r.id,EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='vehicle-receipts' AND o.name=r.file_path)),'{}'::jsonb)
 FROM public.vehicle_receipts r WHERE r.id=ANY(_ids) AND vehicle_receipts_private.receipt_access(r.id,false)
$$;
REVOKE ALL ON FUNCTION vehicle_receipts_private.attachment_status(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION vehicle_receipts_private.attachment_status(uuid[]) TO authenticated,service_role;
CREATE FUNCTION public.vehicle_receipt_attachment_status(_ids uuid[]) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $$ SELECT vehicle_receipts_private.attachment_status(_ids) $$;
REVOKE ALL ON FUNCTION public.vehicle_receipt_attachment_status(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.vehicle_receipt_attachment_status(uuid[]) TO authenticated,service_role;
CREATE FUNCTION vehicle_receipts_private.guard_expense_vehicle() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,shop_manager,pg_temp AS $$
BEGIN
 IF NEW.vehicle_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM shop_manager.vehicles v JOIN shop_manager.customers c ON c.id=v.customer_id WHERE v.id=NEW.vehicle_id AND c.shop_id=NEW.shop_id) THEN RAISE EXCEPTION 'Expense vehicle must belong to this shop'; END IF;
 IF NEW.vehicle_receipt_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.vehicle_receipts r WHERE r.id=NEW.vehicle_receipt_id AND r.shop_vehicle_id=NEW.vehicle_id AND r.status='confirmed') THEN RAISE EXCEPTION 'Expense must reference this vehicle receipt'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vehicle_receipts_private.guard_expense_vehicle() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER expense_vehicle_scope BEFORE INSERT OR UPDATE OF vehicle_id,vehicle_receipt_id,shop_id ON shop_manager.expenses FOR EACH ROW EXECUTE FUNCTION vehicle_receipts_private.guard_expense_vehicle();
COMMIT;
