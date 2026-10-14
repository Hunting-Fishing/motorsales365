-- REVIEW ONLY, outside migration path. No automatic/live recovery authorized.
-- Operator must use BEGIN, then SET LOCAL
-- motorsales365.customer_reminders_drop_review = 'operator-reviewed-drop',
-- execute this unchanged file, then COMMIT (ROLLBACK on any refusal/failure).
-- RESTRICT never deletes dependents. No business data or source authority changes.
DO $recovery$
DECLARE target pg_catalog.oid; actual_acl pg_catalog.jsonb; expected_acl pg_catalog.jsonb;
BEGIN
  -- Qualified types protect DO compilation; reset ambient operator resolution
  -- before planning/executing safety predicates in the operator transaction.
  PERFORM pg_catalog.set_config('search_path','',true);
  IF current_user <> 'postgres' OR
    pg_catalog.current_setting('motorsales365.customer_reminders_drop_review',true)
      IS DISTINCT FROM 'operator-reviewed-drop'
  THEN RAISE EXCEPTION 'Explicit reminder reader recovery opt-in/operator required' USING ERRCODE='55000'; END IF;
  target := pg_catalog.to_regprocedure('public.crm_customer_reminders(pg_catalog.uuid)');
  IF target IS NULL OR NOT EXISTS (
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
  ) THEN RAISE EXCEPTION 'Reminder reader recovery definition/owner drift' USING ERRCODE='55000'; END IF;
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
  THEN RAISE EXCEPTION 'Reminder reader recovery execution drift' USING ERRCODE='55000'; END IF;
  EXECUTE 'DROP FUNCTION public.crm_customer_reminders(pg_catalog.uuid) RESTRICT';
END;
$recovery$;
