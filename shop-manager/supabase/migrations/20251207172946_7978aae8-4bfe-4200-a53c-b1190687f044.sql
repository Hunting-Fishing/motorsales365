-- Create helper functions to query security findings (avoiding TypeScript type issues)
CREATE OR REPLACE FUNCTION public.get_latest_security_finding()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(r)
  FROM (
    SELECT id, audit_timestamp, critical_count, warning_count, info_count, 
           qual_true_count, tables_without_rls, findings, created_at
    FROM public.rls_security_findings
    ORDER BY created_at DESC
    LIMIT 1
  ) r;
$$;

CREATE OR REPLACE FUNCTION public.get_security_audit_history()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_agg(r)
  FROM (
    SELECT id, audit_timestamp, critical_count, warning_count, info_count, qual_true_count
    FROM public.rls_security_findings
    ORDER BY created_at DESC
    LIMIT 10
  ) r;
$$;