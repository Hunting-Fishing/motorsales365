-- Suspend NEW requests and operation lookup without deleting outcomes/history.
-- Stock detail reads remain available under the reviewed read-only endpoint.
-- Do not substitute the old direct split writer after suspension.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.shop_stock_operation_v1(jsonb,boolean)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE EXECUTE ON FUNCTION shop_stock_operations_v1.execute(jsonb,boolean)
  FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
