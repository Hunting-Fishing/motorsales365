-- REVIEW-ONLY RECOVERY: restores the known unsafe PUBLIC EXECUTE permission.
-- Never auto-run or put this file in the migration path. A fresh owner/operator
-- recovery decision is required. No invoice/profile/stock data is restored here.
-- Deliberate invocation must set LOCAL motorsales365.invoice_acl_recovery to
-- 'owner-reviewed-unsafe-restore' in the surrounding recovery transaction.
DO $recovery$
DECLARE
  target oid := to_regprocedure('shop_manager.convert_work_order_to_invoice(uuid)');
  helper oid := to_regprocedure('shop_manager.calculate_work_order_totals(uuid)');
  before_state text[];
  after_state text[];
  helper_acl aclitem[];
  helper_definition text;
BEGIN
  IF current_setting('motorsales365.invoice_acl_recovery', true)
    IS DISTINCT FROM 'owner-reviewed-unsafe-restore' THEN
    RAISE EXCEPTION 'Unsafe invoice ACL recovery requires explicit operator review' USING ERRCODE = '55000';
  END IF;
  IF target IS NULL OR helper IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = target AND prosecdef
      AND pg_get_userbyid(proowner) = 'postgres'
      AND md5(pg_get_functiondef(oid)) = 'e590e08f9f68cc5fdead8a853af670b9'
  ) THEN
    RAISE EXCEPTION 'Invoice ACL recovery definition/owner precondition changed' USING ERRCODE = '55000';
  END IF;
  SELECT array_agg(
    (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END)
      || '/' || pg_get_userbyid(a.grantor) || '/' || a.privilege_type || '/' || a.is_grantable::text
    ORDER BY (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C"
  ) INTO before_state
  FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
  WHERE p.oid = target;
  IF before_state IS DISTINCT FROM ARRAY[
    'postgres/postgres/EXECUTE/false', 'service_role/postgres/EXECUTE/false'
  ]::text[] THEN
    RAISE EXCEPTION 'Invoice ACL recovery state changed' USING ERRCODE = '55000';
  END IF;
  SELECT proacl, md5(pg_get_functiondef(oid)) INTO helper_acl, helper_definition
  FROM pg_proc WHERE oid = helper;

  GRANT EXECUTE ON FUNCTION shop_manager.convert_work_order_to_invoice(uuid) TO PUBLIC;

  SELECT array_agg(
    (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END)
      || '/' || pg_get_userbyid(a.grantor) || '/' || a.privilege_type || '/' || a.is_grantable::text
    ORDER BY (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C"
  ) INTO after_state
  FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
  WHERE p.oid = target;
  IF after_state IS DISTINCT FROM ARRAY[
    'PUBLIC/postgres/EXECUTE/false', 'postgres/postgres/EXECUTE/false',
    'service_role/postgres/EXECUTE/false'
  ]::text[] OR NOT has_function_privilege('anon', target, 'EXECUTE')
    OR NOT has_function_privilege('authenticated', target, 'EXECUTE')
    OR NOT has_function_privilege('postgres', target, 'EXECUTE')
    OR NOT has_function_privilege('service_role', target, 'EXECUTE')
    OR md5(pg_get_functiondef(target)) <> 'e590e08f9f68cc5fdead8a853af670b9'
    OR NOT EXISTS (
      SELECT 1 FROM pg_proc WHERE oid = helper
        AND proacl IS NOT DISTINCT FROM helper_acl
        AND md5(pg_get_functiondef(oid)) = helper_definition
    ) THEN
    RAISE EXCEPTION 'Invoice ACL recovery verification failed' USING ERRCODE = '55000';
  END IF;
END
$recovery$;
