-- OFFLINE CANDIDATE: no consumer or live-release approval is implied.
-- Each invoker SELECT uses the calling query's snapshot and existing RLS.
-- Private public-vehicle rows invisible to staff deliberately remain unavailable.
-- A matching current owner is not proof of uninterrupted ownership tenure.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE FUNCTION public.crm_customer_vehicle_receipts(
  _customer_id uuid, _shop_vehicle_id uuid
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $reader$
  WITH context AS MATERIALIZED (
    SELECT c.id AS customer_id, c.shop_id, v.id AS shop_vehicle_id,
      s.business_id, pv.id AS public_vehicle_id, pv.owner_user_id
    FROM shop_manager.customers AS c
    JOIN shop_manager.vehicles AS v ON v.customer_id = c.id
    JOIN shop_manager.shops AS s ON s.id = c.shop_id
    JOIN public.vehicle_shop_links AS l
      ON l.shop_vehicle_id = v.id AND l.shop_id = c.shop_id
    JOIN public.vehicles AS pv
      ON pv.id = l.vehicle_id AND pv.owner_user_id = l.approved_by
    WHERE c.id = _customer_id AND v.id = _shop_vehicle_id
      AND auth.uid() IS NOT NULL AND l.active IS TRUE AND l.revoked_at IS NULL
  ), limited AS (
    SELECT r.id, r.vendor, r.purchased_on, r.currency, r.total
    FROM public.vehicle_receipts AS r
    JOIN context AS x ON r.vehicle_id = x.public_vehicle_id
    WHERE r.status = 'confirmed'
      AND (r.shop_vehicle_id = x.shop_vehicle_id
        OR (r.shop_vehicle_id IS NULL AND r.share_with_shop IS TRUE
          AND r.created_by = x.owner_user_id))
    ORDER BY r.purchased_on DESC NULLS LAST, r.id DESC
    LIMIT 26
  )
  SELECT pg_catalog.jsonb_build_object(
    'available', EXISTS (SELECT 1 FROM context),
    'rows', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', r.id, 'vendor', r.vendor, 'purchased_on', r.purchased_on,
        'currency', r.currency, 'total', r.total
      ) ORDER BY r.purchased_on DESC NULLS LAST, r.id DESC)
      FROM limited AS r
    ), '[]'::jsonb)
  );
$reader$;

CREATE FUNCTION public.crm_customer_vehicle_installations(
  _customer_id uuid, _shop_vehicle_id uuid
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $reader$
  WITH context AS MATERIALIZED (
    SELECT c.id AS customer_id, c.shop_id, v.id AS shop_vehicle_id,
      s.business_id, pv.id AS public_vehicle_id, pv.owner_user_id
    FROM shop_manager.customers AS c
    JOIN shop_manager.vehicles AS v ON v.customer_id = c.id
    JOIN shop_manager.shops AS s ON s.id = c.shop_id
    JOIN public.vehicle_shop_links AS l
      ON l.shop_vehicle_id = v.id AND l.shop_id = c.shop_id
    JOIN public.vehicles AS pv
      ON pv.id = l.vehicle_id AND pv.owner_user_id = l.approved_by
    WHERE c.id = _customer_id AND v.id = _shop_vehicle_id
      AND auth.uid() IS NOT NULL AND l.active IS TRUE AND l.revoked_at IS NULL
  ), limited AS (
    SELECT i.id, i.name_snapshot, i.part_number_snapshot, i.installed_quantity,
      i.installed_at, i.installed_odometer_km, i.work_order_id
    FROM public.installed_components AS i
    JOIN context AS x ON i.business_id = x.business_id
      AND i.shop_manager_vehicle_id = x.shop_vehicle_id
      AND i.public_vehicle_id = x.public_vehicle_id
    WHERE x.business_id IS NOT NULL AND (i.work_order_id IS NULL OR EXISTS (
      SELECT 1 FROM shop_manager.work_orders AS w
      WHERE w.id = i.work_order_id AND w.shop_id = x.shop_id
        AND w.customer_id = x.customer_id AND w.vehicle_id = x.shop_vehicle_id
    ))
    ORDER BY i.installed_at DESC NULLS LAST, i.id DESC
    LIMIT 26
  )
  SELECT pg_catalog.jsonb_build_object(
    'available', EXISTS (SELECT 1 FROM context),
    'rows', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', i.id, 'name_snapshot', i.name_snapshot,
        'part_number_snapshot', i.part_number_snapshot,
        'installed_quantity', i.installed_quantity, 'installed_at', i.installed_at,
        'installed_odometer_km', i.installed_odometer_km, 'work_order_id', i.work_order_id
      ) ORDER BY i.installed_at DESC NULLS LAST, i.id DESC)
      FROM limited AS i
    ), '[]'::jsonb)
  );
$reader$;

CREATE FUNCTION public.crm_customer_vehicle_work_orders(
  _customer_id uuid, _shop_vehicle_id uuid
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $reader$
  WITH context AS MATERIALIZED (
    SELECT c.id AS customer_id, c.shop_id, v.id AS shop_vehicle_id,
      s.business_id, pv.id AS public_vehicle_id, pv.owner_user_id
    FROM shop_manager.customers AS c
    JOIN shop_manager.vehicles AS v ON v.customer_id = c.id
    JOIN shop_manager.shops AS s ON s.id = c.shop_id
    JOIN public.vehicle_shop_links AS l
      ON l.shop_vehicle_id = v.id AND l.shop_id = c.shop_id
    JOIN public.vehicles AS pv
      ON pv.id = l.vehicle_id AND pv.owner_user_id = l.approved_by
    WHERE c.id = _customer_id AND v.id = _shop_vehicle_id
      AND auth.uid() IS NOT NULL AND l.active IS TRUE AND l.revoked_at IS NULL
  ), limited AS (
    SELECT w.id, w.work_order_number, w.status, w.created_at
    FROM shop_manager.work_orders AS w
    JOIN context AS x ON w.shop_id = x.shop_id
      AND w.customer_id = x.customer_id AND w.vehicle_id = x.shop_vehicle_id
    ORDER BY w.created_at DESC NULLS LAST, w.id DESC
    LIMIT 26
  )
  SELECT pg_catalog.jsonb_build_object(
    'available', EXISTS (SELECT 1 FROM context),
    'rows', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', w.id, 'work_order_number', w.work_order_number,
        'status', w.status, 'created_at', w.created_at
      ) ORDER BY w.created_at DESC NULLS LAST, w.id DESC)
      FROM limited AS w
    ), '[]'::jsonb)
  );
$reader$;

-- Normalize only these newly created APIs, including common hosted defaults.
REVOKE ALL ON FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid),
  public.crm_customer_vehicle_installations(uuid,uuid),
  public.crm_customer_vehicle_work_orders(uuid,uuid)
  FROM PUBLIC, anon, authenticated, service_role RESTRICT;
GRANT EXECUTE ON FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid),
  public.crm_customer_vehicle_installations(uuid,uuid),
  public.crm_customer_vehicle_work_orders(uuid,uuid) TO authenticated;

DO $verify$
DECLARE signature text; target oid; actual_acl jsonb; expected_acl jsonb;
BEGIN
  expected_acl := pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object('grantee','authenticated','grantor',current_user,
      'privilege','EXECUTE','grantable',false),
    pg_catalog.jsonb_build_object('grantee',current_user,'grantor',current_user,
      'privilege','EXECUTE','grantable',false)
  );
  FOR signature IN SELECT pg_catalog.unnest(ARRAY[
    'public.crm_customer_vehicle_receipts(uuid,uuid)',
    'public.crm_customer_vehicle_installations(uuid,uuid)',
    'public.crm_customer_vehicle_work_orders(uuid,uuid)'
  ]) LOOP
    target := pg_catalog.to_regprocedure(signature);
    IF target IS NULL OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc AS p
      JOIN pg_catalog.pg_language AS l ON l.oid=p.prolang
      WHERE p.oid=target AND NOT p.prosecdef AND p.provolatile='s'
        AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u'
        AND l.lanname='sql' AND p.prokind='f' AND p.prorettype='jsonb'::regtype
        AND NOT p.proretset AND p.pronargdefaults=0 AND p.provariadic=0
        AND p.proargnames=ARRAY['_customer_id','_shop_vehicle_id']::text[]
        AND p.proargmodes IS NULL
        AND p.proowner=current_user::regrole
        AND p.proconfig=ARRAY['search_path=""']::text[]
    ) THEN RAISE EXCEPTION 'Activity reader safety contract failed' USING ERRCODE='55000'; END IF;
    SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END,
      'grantor',pg_catalog.pg_get_userbyid(a.grantor),
      'privilege',a.privilege_type,'grantable',a.is_grantable
    ) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END)
      INTO actual_acl FROM pg_catalog.pg_proc AS p,
      LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) AS a
      WHERE p.oid=target;
    IF actual_acl IS DISTINCT FROM expected_acl
      OR pg_catalog.has_function_privilege('anon',target,'EXECUTE')
      OR pg_catalog.has_function_privilege('service_role',target,'EXECUTE')
      OR NOT pg_catalog.has_function_privilege('authenticated',target,'EXECUTE')
      OR NOT pg_catalog.has_function_privilege(current_user,target,'EXECUTE')
    THEN RAISE EXCEPTION 'Activity reader execution contract failed' USING ERRCODE='55000'; END IF;
  END LOOP;
END;
$verify$;
COMMIT;
