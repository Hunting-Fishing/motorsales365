-- OFFLINE REVIEW CANDIDATE. Not a production release or native identity repair.
-- One caller snapshot joins the visible customer and reminders; source RLS stays
-- authoritative. STABLE is not continuous revocation after statement start.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL search_path = '';

DO $preflight$
BEGIN
  IF current_user <> 'postgres' OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='crm_customer_reminders'
  ) THEN
    RAISE EXCEPTION 'Reminder reader operator/name collision' USING ERRCODE='55000';
  END IF;
  IF (
    SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute AS a
    WHERE a.attrelid=pg_catalog.to_regclass('shop_manager.customers')
      AND a.attname IN ('id','shop_id') AND NOT a.attisdropped
      AND a.atttypid='pg_catalog.uuid'::pg_catalog.regtype AND a.attnotnull
  ) <> 2 THEN
    RAISE EXCEPTION 'Reminder reader customer schema prerequisite failed' USING ERRCODE='55000';
  END IF;
END;
$preflight$;

CREATE FUNCTION public.crm_customer_reminders(_customer_id pg_catalog.uuid)
RETURNS pg_catalog.jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $reader$
  WITH context AS MATERIALIZED (
    SELECT c.id AS customer_id, c.shop_id
    FROM shop_manager.customers AS c
    WHERE c.id = _customer_id AND auth.uid() IS NOT NULL
  ), limited AS (
    SELECT r.id, r.customer_id, r.shop_id, r.reminder_type, r.title, r.notes,
      r.due_date, r.status, r.completed_at
    FROM shop_manager.customer_reminders AS r
    JOIN context AS x ON r.customer_id = x.customer_id AND r.shop_id = x.shop_id
    ORDER BY r.due_date ASC NULLS LAST, r.id ASC
    LIMIT 101
  )
  SELECT pg_catalog.jsonb_build_object(
    'available', EXISTS (SELECT 1 FROM context),
    'customer_id', (SELECT customer_id FROM context),
    'shop_id', (SELECT shop_id FROM context),
    'rows', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', r.id, 'customer_id', r.customer_id, 'shop_id', r.shop_id,
        'reminder_type', r.reminder_type, 'title', r.title, 'notes', r.notes,
        'due_date', r.due_date, 'status', r.status, 'completed_at', r.completed_at
      ) ORDER BY r.due_date ASC NULLS LAST, r.id ASC)
      FROM limited AS r
    ), '[]'::pg_catalog.jsonb)
  );
$reader$;

-- Normalize only this NEW API; never source grants, RLS or default privileges.
REVOKE ALL ON FUNCTION public.crm_customer_reminders(pg_catalog.uuid)
  FROM PUBLIC, anon, authenticated, service_role RESTRICT;
GRANT EXECUTE ON FUNCTION public.crm_customer_reminders(pg_catalog.uuid) TO authenticated;

DO $verify$
DECLARE target pg_catalog.oid; actual_acl pg_catalog.jsonb; expected_acl pg_catalog.jsonb;
BEGIN
  target := pg_catalog.to_regprocedure('public.crm_customer_reminders(pg_catalog.uuid)');
  IF current_user <> 'postgres' OR target IS NULL OR (
    SELECT pg_catalog.count(*) FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='crm_customer_reminders'
  ) <> 1 OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_language AS l ON l.oid=p.prolang
    WHERE p.oid=target AND p.proowner='postgres'::pg_catalog.regrole
      AND l.lanname='sql' AND p.prokind='f' AND NOT p.prosecdef
      AND p.provolatile='s' AND NOT p.proisstrict AND NOT p.proleakproof
      AND p.proparallel='u' AND p.prorettype='pg_catalog.jsonb'::pg_catalog.regtype AND NOT p.proretset
      AND p.pronargdefaults=0 AND p.provariadic=0
      AND p.pronargs=1 AND p.proargtypes[0]='pg_catalog.uuid'::pg_catalog.regtype
      AND p.proargnames=ARRAY['_customer_id']::pg_catalog.text[] AND p.proargmodes IS NULL
      AND p.proconfig=ARRAY['search_path=""']::pg_catalog.text[]
      AND pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),''))='74e7436ee945b5db183c2dcf5be820df'
  ) THEN RAISE EXCEPTION 'Reminder reader definition contract failed' USING ERRCODE='55000'; END IF;
  expected_acl := pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object('grantee','authenticated','grantor','postgres',
      'privilege','EXECUTE','grantable',false),
    pg_catalog.jsonb_build_object('grantee','postgres','grantor','postgres',
      'privilege','EXECUTE','grantable',false)
  );
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
    OR NOT pg_catalog.has_function_privilege('postgres',target,'EXECUTE')
  THEN RAISE EXCEPTION 'Reminder reader execution contract failed' USING ERRCODE='55000'; END IF;
END;
$verify$;
COMMIT;
