-- Read-only provider migration VERSION metadata, never Auth users/sessions/keys.
-- Run only against the owner-designated 365 project after the catalog-only
-- observation confirms this exact managed relation/column. No schema repair.
-- Upstream also has the explicit legacy 00_init_auth_schema migration. These
-- shapes identify metadata only; neither version IDs nor this file prove bodies.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='1000ms';
SET LOCAL search_path=pg_catalog,pg_temp;
WITH catalog_guard AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='auth' AND c.relname='schema_migrations' AND c.relkind='r'
      AND pg_catalog.pg_get_userbyid(c.relowner)='supabase_auth_admin'
      AND c.relrowsecurity AND NOT c.relforcerowsecurity
      -- Refuse policy-filtered ledgers instead of calling a partial vector complete.
      AND NOT pg_catalog.row_security_active(c.oid)
      AND (SELECT count(*) FROM pg_catalog.pg_attribute a
        WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped)=1
      AND EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid=c.oid AND a.attname='version' AND a.attnum>0
          AND NOT a.attisdropped AND a.attnotnull
          AND pg_catalog.format_type(a.atttypid,a.atttypmod)='character varying(255)')
  ) AS matched
), selected AS MATERIALIZED (
  SELECT version::text AS version FROM auth.schema_migrations
  WHERE (SELECT matched FROM catalog_guard)
  ORDER BY version COLLATE "C" LIMIT 257
), summary AS (
  SELECT count(*) AS selected_rows,
    count(*) FILTER (WHERE NOT (pg_catalog.octet_length(version) IN (2,14)
      AND version COLLATE "C" ~ '^(00|[0-9]{14})$')) AS unexpected_rows,
    count(DISTINCT version COLLATE "C") AS distinct_versions
  FROM selected
), admission AS (
  SELECT g.matched AND s.selected_rows<=256 AND s.unexpected_rows=0
    AND s.distinct_versions=s.selected_rows AS complete,
    g.matched,s.selected_rows,s.unexpected_rows,s.distinct_versions
  FROM catalog_guard g CROSS JOIN summary s
)
SELECT pg_catalog.jsonb_build_object(
  'formatVersion',1,
  'projectRef','wjxaajgvddtrxxtocxen',
  'observedAt',pg_catalog.clock_timestamp(),
  'serverVersionNum',pg_catalog.current_setting('server_version_num')::integer,
  'scope','auth.schema_migrations canonical version identifiers only',
  'catalogMatched',a.matched,
  'versionBound',256,
  'selectedRows',a.selected_rows,
  'unexpectedVersionRows',a.unexpected_rows,
  'duplicateVersionRows',a.selected_rows-a.distinct_versions,
  'complete',a.complete,
  'truncated',a.selected_rows>256,
  -- Refuse the WHOLE version vector on bad shape, duplicates or truncation.
  -- No unexpected metadata value is reflected, even in an error diagnostic.
  'versions',CASE WHEN a.complete THEN COALESCE(
    (SELECT pg_catalog.jsonb_agg(version ORDER BY version COLLATE "C") FROM selected),
    '[]'::jsonb) ELSE '[]'::jsonb END,
  'runningServiceVersionVerified',false,
  'migrationBodiesVerified',false,
  'managedAuthBaselineVerified',false,
  'sessionAuthorityVerified',false,
  'releaseReady',false
) AS result FROM admission a;
ROLLBACK;
