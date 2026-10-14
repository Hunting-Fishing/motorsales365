-- REVIEW ONLY: not a migration and not authorized for automatic execution.
-- Operator must explicitly choose transaction-local opt-in before this file:
-- BEGIN;
-- SET LOCAL motorsales365.customer_vehicle_activity_drop_review = 'operator-reviewed-drop';
-- [execute this unchanged file]
-- COMMIT;
-- This removes only the three exact candidate readers; it never changes data,
-- source-table privileges/policies or their existing authorization functions.
DO $recovery$
DECLARE signature text; body_md5 text; target oid; actual_acl jsonb; expected_acl jsonb;
BEGIN
  IF pg_catalog.current_setting('motorsales365.customer_vehicle_activity_drop_review',true)
    IS DISTINCT FROM 'operator-reviewed-drop'
  THEN RAISE EXCEPTION 'Explicit activity reader recovery opt-in required' USING ERRCODE='55000'; END IF;
  expected_acl := pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object('grantee','authenticated','grantor',current_user,
      'privilege','EXECUTE','grantable',false),
    pg_catalog.jsonb_build_object('grantee',current_user,'grantor',current_user,
      'privilege','EXECUTE','grantable',false)
  );
  -- Check all three before the first DROP; drift is not permission to delete.
  FOR signature,body_md5 IN SELECT * FROM (VALUES
    ('public.crm_customer_vehicle_receipts(uuid,uuid)','be2cbbbfae0aa56fe6e1e263d56edf19'),
    ('public.crm_customer_vehicle_installations(uuid,uuid)','49bfb24df9b49f834ea6150ce44350b7'),
    ('public.crm_customer_vehicle_work_orders(uuid,uuid)','1b4d61c3f7f18535bc03e4f22b9a3102')
  ) AS reviewed(signature,body_md5) LOOP
    target := pg_catalog.to_regprocedure(signature);
    IF target IS NULL OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc AS p
      JOIN pg_catalog.pg_language AS l ON l.oid=p.prolang
      WHERE p.oid=target AND p.proowner=current_user::regrole
        AND NOT p.prosecdef AND p.provolatile='s' AND l.lanname='sql'
        AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u'
        AND p.prokind='f' AND p.prorettype='jsonb'::regtype
        AND NOT p.proretset AND p.pronargdefaults=0 AND p.provariadic=0
        AND p.proargnames=ARRAY['_customer_id','_shop_vehicle_id']::text[]
        AND p.proargmodes IS NULL
        AND p.proconfig=ARRAY['search_path=""']::text[]
        AND pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),''))=body_md5
    ) THEN RAISE EXCEPTION 'Activity reader recovery definition/owner drift' USING ERRCODE='55000'; END IF;
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
    THEN RAISE EXCEPTION 'Activity reader recovery ACL drift' USING ERRCODE='55000'; END IF;
  END LOOP;
  EXECUTE 'DROP FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid) RESTRICT';
  EXECUTE 'DROP FUNCTION public.crm_customer_vehicle_installations(uuid,uuid) RESTRICT';
  EXECUTE 'DROP FUNCTION public.crm_customer_vehicle_work_orders(uuid,uuid) RESTRICT';
END;
$recovery$;
