-- REVIEW-ONLY recovery: restores known unsafe PUBLIC execution for work-order totals.
-- Outside the migration path. A new explicit operator/owner decision is required.
-- Must set LOCAL motorsales365.work_order_totals_acl_recovery = 'owner-reviewed-unsafe-restore'.
DO $guarded_acl$
DECLARE
  target oid := to_regprocedure('shop_manager.calculate_work_order_totals(uuid)');
  other_helper oid := to_regprocedure('shop_manager.ensure_profile_for(uuid)');
  converter oid := to_regprocedure('shop_manager.convert_work_order_to_invoice(uuid)');
  before_acl text[];
  after_acl text[];
  other_acl text[];
  converter_acl text[];
  protected_before jsonb;
  protected_after jsonb;
  original_acl constant text[] := ARRAY['PUBLIC/postgres/EXECUTE/false','postgres/postgres/EXECUTE/false','service_role/postgres/EXECUTE/false'];
  restricted_acl constant text[] := ARRAY['postgres/postgres/EXECUTE/false','service_role/postgres/EXECUTE/false'];
BEGIN
  PERFORM set_config('lock_timeout','5s',true);
  IF current_setting('motorsales365.work_order_totals_acl_recovery',true)
    IS DISTINCT FROM 'owner-reviewed-unsafe-restore' THEN
    RAISE EXCEPTION 'Unsafe helper ACL recovery requires explicit operator review' USING ERRCODE='55000';
  END IF;
  IF target IS NULL OR other_helper IS NULL OR converter IS NULL OR
    (SELECT count(*) FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role'))<>4 THEN
    RAISE EXCEPTION 'Helper ACL prerequisite is missing' USING ERRCODE='55000';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid=target AND prokind='f' AND prosecdef
      AND pg_get_userbyid(proowner)='postgres' AND prorettype='numeric'::regtype
      AND md5(pg_get_functiondef(oid))='1119dd7abe3e643d8d0c6979f19fc2a1'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid=other_helper AND pg_get_userbyid(proowner)='postgres'
      AND md5(pg_get_functiondef(oid))='77cb775bfedfb78996b31fcbdd3ada4c'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid=converter AND pg_get_userbyid(proowner)='postgres'
      AND md5(pg_get_functiondef(oid))='e590e08f9f68cc5fdead8a853af670b9'
  ) THEN
    RAISE EXCEPTION 'Helper ACL definition/owner precondition changed' USING ERRCODE='55000';
  END IF;
  SELECT array_agg(
    (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END)
      || '/' || pg_get_userbyid(a.grantor) || '/' || a.privilege_type || '/' || a.is_grantable::text
    ORDER BY (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C",
      a.grantor, a.privilege_type, a.is_grantable
  ) INTO converter_acl
  FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
  WHERE p.oid=converter;
  IF converter_acl IS DISTINCT FROM restricted_acl
    OR has_function_privilege('anon',converter,'EXECUTE')
    OR has_function_privilege('authenticated',converter,'EXECUTE')
    OR NOT has_function_privilege('postgres',converter,'EXECUTE')
    OR NOT has_function_privilege('service_role',converter,'EXECUTE') THEN
    RAISE EXCEPTION 'Previously approved converter containment is not intact' USING ERRCODE='55000';
  END IF;
  SELECT array_agg(
    (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END)
      || '/' || pg_get_userbyid(a.grantor) || '/' || a.privilege_type || '/' || a.is_grantable::text
    ORDER BY (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C",
      a.grantor, a.privilege_type, a.is_grantable
  ) INTO other_acl
  FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
  WHERE p.oid=other_helper;
  IF (other_acl IS DISTINCT FROM original_acl AND other_acl IS DISTINCT FROM restricted_acl)
    OR NOT has_function_privilege('postgres',other_helper,'EXECUTE')
    OR NOT has_function_privilege('service_role',other_helper,'EXECUTE')
    OR (other_acl=restricted_acl AND
      (has_function_privilege('anon',other_helper,'EXECUTE') OR
       has_function_privilege('authenticated',other_helper,'EXECUTE'))) THEN
    RAISE EXCEPTION 'Companion helper ACL precondition changed' USING ERRCODE='55000';
  END IF;
  SELECT array_agg(
    (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END)
      || '/' || pg_get_userbyid(a.grantor) || '/' || a.privilege_type || '/' || a.is_grantable::text
    ORDER BY (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C",
      a.grantor, a.privilege_type, a.is_grantable
  ) INTO before_acl
  FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
  WHERE p.oid=target;
  IF before_acl IS DISTINCT FROM restricted_acl THEN
    RAISE EXCEPTION 'Helper ACL precondition changed' USING ERRCODE='55000';
  END IF;
  SELECT jsonb_agg(jsonb_build_object('oid',oid,'owner',proowner,'acl',proacl::text,
    'definition',md5(pg_get_functiondef(oid))) ORDER BY oid) INTO protected_before
  FROM pg_proc WHERE oid=ANY(ARRAY[other_helper,converter]);

  GRANT EXECUTE ON FUNCTION shop_manager.calculate_work_order_totals(uuid) TO PUBLIC;

  SELECT array_agg(
    (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END)
      || '/' || pg_get_userbyid(a.grantor) || '/' || a.privilege_type || '/' || a.is_grantable::text
    ORDER BY (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C",
      a.grantor, a.privilege_type, a.is_grantable
  ) INTO after_acl
  FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
  WHERE p.oid=target;
  IF after_acl IS DISTINCT FROM original_acl
    OR NOT has_function_privilege('anon',target,'EXECUTE')
    OR NOT has_function_privilege('authenticated',target,'EXECUTE')
    OR NOT has_function_privilege('postgres',target,'EXECUTE')
    OR NOT has_function_privilege('service_role',target,'EXECUTE') THEN
    RAISE EXCEPTION 'Helper ACL effective-privilege postcondition failed' USING ERRCODE='55000';
  END IF;
  SELECT jsonb_agg(jsonb_build_object('oid',oid,'owner',proowner,'acl',proacl::text,
    'definition',md5(pg_get_functiondef(oid))) ORDER BY oid) INTO protected_after
  FROM pg_proc WHERE oid=ANY(ARRAY[other_helper,converter]);
  IF protected_after IS DISTINCT FROM protected_before OR
    md5(pg_get_functiondef(target))<>'1119dd7abe3e643d8d0c6979f19fc2a1' THEN
    RAISE EXCEPTION 'Helper ACL changed an out-of-scope definition or grant' USING ERRCODE='55000';
  END IF;
END
$guarded_acl$;
