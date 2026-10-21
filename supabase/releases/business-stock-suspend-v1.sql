-- Emergency suspension, not a destructive database rollback.
-- Reject new API calls AND lookups while preserving every outcome/movement.
-- Already executing transactions may still complete; suspension is not cancellation.
-- Keep the staff authorization boundary and lifecycle repairs installed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';
SET LOCAL search_path = pg_catalog, pg_temp;
REVOKE ALL ON FUNCTION public.business_stock_operation_v1(jsonb,boolean)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION business_stock_operations_v1.execute(jsonb,boolean)
  FROM PUBLIC, anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
