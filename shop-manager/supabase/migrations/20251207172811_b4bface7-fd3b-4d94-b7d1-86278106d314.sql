-- Create table to store RLS security audit findings
CREATE TABLE IF NOT EXISTS public.rls_security_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_timestamp TIMESTAMPTZ NOT NULL,
  critical_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  info_count INTEGER NOT NULL DEFAULT 0,
  qual_true_count INTEGER NOT NULL DEFAULT 0,
  tables_without_rls TEXT[] DEFAULT '{}',
  findings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rls_security_findings ENABLE ROW LEVEL SECURITY;

-- Only owners/admins can view security findings
CREATE POLICY "Owners and admins can view security findings"
  ON public.rls_security_findings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('owner', 'admin')
    )
  );

-- Service role can insert findings (from edge function)
CREATE POLICY "Service role can insert findings"
  ON public.rls_security_findings
  FOR INSERT
  WITH CHECK (true);

-- Create helper function to get tables without RLS
CREATE OR REPLACE FUNCTION public.get_tables_without_rls()
RETURNS TABLE(table_schema TEXT, table_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT schemaname::TEXT, tablename::TEXT
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename FROM pg_catalog.pg_policies WHERE schemaname = 'public'
  )
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE '_%;'
$$;

-- Create helper function to find qual:true policies
CREATE OR REPLACE FUNCTION public.get_qual_true_policies()
RETURNS TABLE(
  table_schema TEXT,
  table_name TEXT,
  policy_name TEXT,
  command TEXT,
  qual TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    schemaname::TEXT,
    tablename::TEXT,
    policyname::TEXT,
    cmd::TEXT,
    qual::TEXT
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
  AND qual = 'true'
  AND cmd = 'SELECT';
$$;

-- Create helper function to get tables with shop_id column
CREATE OR REPLACE FUNCTION public.get_tables_with_shop_id()
RETURNS TABLE(table_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT table_name::TEXT
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND column_name = 'shop_id';
$$;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_rls_security_findings_created_at 
  ON public.rls_security_findings(created_at DESC);