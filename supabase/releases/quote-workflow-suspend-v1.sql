-- Maintenance suspension: retain source, work orders, audit and outcome history.
-- Both mutations and outcome inspections share this endpoint and are withdrawn.
-- Authorized quote reads remain available. Never restore the broken legacy RPC.
BEGIN;
REVOKE ALL ON FUNCTION public.quote_workflow_change_v1(jsonb,boolean),
  quote_workflow_v1.execute(jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
