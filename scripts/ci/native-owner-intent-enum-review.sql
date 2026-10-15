-- Read-only enum-shape companion to the selected owner-intent catalog capture.
-- No application rows/counts or helper calls; no mutation or migration adoption.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';
SET LOCAL search_path = pg_catalog, pg_temp;
SELECT jsonb_build_object(
  'mode', 'read-only-enum-catalog',
  'projectRef', 'wjxaajgvddtrxxtocxen',
  'observedAtUtc', timezone('UTC', statement_timestamp()),
  'serverVersion', current_setting('server_version'),
  'scope', 'Only public.seller_type and public.app_role catalog labels; no application data or authority acceptance.',
  'enums', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'type', t.typname,
      'owner', pg_get_userbyid(t.typowner),
      'labels', (SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
                 FROM pg_enum e WHERE e.enumtypid = t.oid)
    ) ORDER BY t.typname)
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname IN ('seller_type', 'app_role')
      AND t.typtype = 'e'
  ), '[]'::jsonb)
) AS catalog;
ROLLBACK;
