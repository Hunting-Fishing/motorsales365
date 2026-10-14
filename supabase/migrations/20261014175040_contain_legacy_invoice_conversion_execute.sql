-- Owner-approved, narrowly scoped temporary containment (2026-10-15 PH).
-- This is NOT an invoice authorization/atomicity replacement or a history repair.
-- Apply this file alone after the documented impact/rollback rehearsal.
-- A single DO statement keeps its assertions and REVOKE atomic. Do not use CASCADE.
DO $containment$
DECLARE
  target oid := to_regprocedure('shop_manager.convert_work_order_to_invoice(uuid)');
  totals oid := to_regprocedure('shop_manager.calculate_work_order_totals(uuid)');
  owner_id oid;
  service_id oid := (SELECT oid FROM pg_roles WHERE rolname = 'service_role');
  before_state text[];
  after_state text[];
  helper_acl aclitem[];
  helper_definition text;
  expected_original constant text[] := ARRAY[
    'PUBLIC/postgres/EXECUTE/false',
    'postgres/postgres/EXECUTE/false',
    'service_role/postgres/EXECUTE/false'
  ];
  expected_restricted constant text[] := ARRAY[
    'postgres/postgres/EXECUTE/false',
    'service_role/postgres/EXECUTE/false'
  ];
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);
  IF target IS NULL OR totals IS NULL OR service_id IS NULL THEN
    RAISE EXCEPTION 'Invoice containment prerequisite is missing' USING ERRCODE = '55000';
  END IF;
  SELECT proowner INTO owner_id FROM pg_proc WHERE oid = target;
  IF pg_get_userbyid(owner_id) <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid = target AND prosecdef AND prokind = 'f'
      AND prorettype = 'text'::regtype
      AND md5(pg_get_functiondef(oid)) = 'e590e08f9f68cc5fdead8a853af670b9'
  ) THEN
    RAISE EXCEPTION 'Invoice containment definition/owner precondition changed' USING ERRCODE = '55000';
  END IF;

  SELECT array_agg(
    (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END)
      || '/' || pg_get_userbyid(a.grantor) || '/' || a.privilege_type || '/' || a.is_grantable::text
    ORDER BY (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C"
  ) INTO before_state
  FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
  WHERE p.oid = target;
  IF before_state IS DISTINCT FROM expected_original AND before_state IS DISTINCT FROM expected_restricted THEN
    RAISE EXCEPTION 'Invoice containment ACL precondition changed' USING ERRCODE = '55000';
  END IF;
  SELECT proacl, md5(pg_get_functiondef(oid)) INTO helper_acl, helper_definition
  FROM pg_proc WHERE oid = totals;

  -- An exact restricted state is accepted on a deliberate rerun, not broadened.
  REVOKE EXECUTE ON FUNCTION shop_manager.convert_work_order_to_invoice(uuid)
    FROM PUBLIC, anon, authenticated RESTRICT;

  SELECT array_agg(
    (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END)
      || '/' || pg_get_userbyid(a.grantor) || '/' || a.privilege_type || '/' || a.is_grantable::text
    ORDER BY (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C"
  ) INTO after_state
  FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
  WHERE p.oid = target;
  IF after_state IS DISTINCT FROM expected_restricted
    OR has_function_privilege('anon', target, 'EXECUTE')
    OR has_function_privilege('authenticated', target, 'EXECUTE')
    OR NOT has_function_privilege('postgres', target, 'EXECUTE')
    OR NOT has_function_privilege('service_role', target, 'EXECUTE')
  THEN
    RAISE EXCEPTION 'Invoice containment effective-privilege verification failed' USING ERRCODE = '55000';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = totals
      AND proacl IS NOT DISTINCT FROM helper_acl
      AND md5(pg_get_functiondef(oid)) = helper_definition
  ) OR md5(pg_get_functiondef(target)) <> 'e590e08f9f68cc5fdead8a853af670b9' THEN
    RAISE EXCEPTION 'Invoice containment changed an out-of-scope object' USING ERRCODE = '55000';
  END IF;
END
$containment$;
