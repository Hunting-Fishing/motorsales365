-- READ-ONLY selected current source recovery, NOT historical provenance.
-- Only three previously fingerprinted organization functions. No app/auth rows,
-- helper calls, settings values, generic body dump or schema mutation.
-- Definitions remain NULL unless fingerprint/header/privacy guards all match.
-- A separate human/agent privacy review is required before retaining source.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='1000ms';
SET LOCAL search_path=pg_catalog,pg_temp;
WITH expected(signature,body_md5,definition_md5,definition_bytes) AS (
 VALUES
 ('public.can_manage_org(uuid,uuid)',
  '4b54f3895e3fab6350dea558838bdd05','935d3e6f96bf9ff0bef97b72bb8d0960',369),
 ('public.is_org_member(uuid,uuid)',
  'cefe2097db7339afc78a8e4bbb665c4b','d9dc0bcc29c9dc6b890100871fa617e4',330),
 ('public.tg_org_add_creator_as_owner()',
  '866cb0936b4e0fb9f8babcbc24482324','c1ea913652a5e36a8b096f50678c7cb9',436)
), selected AS (
 SELECT e.*,p.*,l.lanname,
  pg_catalog.pg_get_functiondef(p.oid) full_definition,
  pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')) actual_body_md5
 FROM expected e JOIN pg_catalog.pg_proc p
  ON p.oid=pg_catalog.to_regprocedure(e.signature)
 JOIN pg_catalog.pg_language l ON l.oid=p.prolang
), screened AS (
 SELECT s.*,
  (s.prokind='f' AND pg_catalog.pg_get_userbyid(s.proowner)='postgres'
   AND s.lanname IN ('sql','plpgsql') AND s.prosecdef
   AND s.pronargdefaults=0 AND NOT s.proretset
   AND s.proconfig=ARRAY['search_path=public']::pg_catalog.text[]
   AND s.actual_body_md5=s.body_md5
   AND pg_catalog.md5(s.full_definition)=s.definition_md5
   AND pg_catalog.octet_length(s.full_definition)=s.definition_bytes
   AND pg_catalog.octet_length(s.prosrc)<1024
   AND s.prosrc !~* '(password|secret|token|api[_ -]?key|https?://|sk[-_]|@[a-z0-9])'
   AND s.prosrc !~ '\$[a-zA-Z0-9_]*\$'
   AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.regexp_matches(s.prosrc,'''((?:''''|[^''])*)''','g') literal
    WHERE literal[1] NOT IN ('owner','admin','manager','member','viewer')
   )) permitted
 FROM selected s
)
SELECT pg_catalog.jsonb_build_object(
 'projectRef','wjxaajgvddtrxxtocxen',
 'mode','read-only-selected-source-recovery-not-history',
 'observedAtUtc',pg_catalog.timezone('UTC',pg_catalog.statement_timestamp()),
 'serverVersion',pg_catalog.current_setting('server_version'),
 'functions',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'signature',s.signature,'bodyMd5Lf',s.actual_body_md5,
   'definitionMd5',pg_catalog.md5(s.full_definition),
   'definitionBytes',pg_catalog.octet_length(s.full_definition),
   'permitted',COALESCE(s.permitted,false),
   'definition',CASE WHEN s.permitted THEN s.full_definition ELSE NULL END
  ) ORDER BY s.signature) FROM screened s),'[]'::pg_catalog.jsonb),
 'limits','Exactly three selected previously fingerprinted current functions only. No rows, counts, helper execution, settings/config values, arbitrary definitions, schema/data/history/privilege mutation or sequence access. Guard denial returns NULL definition. Further privacy/source review required; not historical provenance, approved baseline, behavioral/authority or release acceptance.'
) source;
ROLLBACK;
