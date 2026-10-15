-- READ ONLY single previously fingerprinted provider Auth function source.
-- Full prior envelope + body/definition hashes + independent privacy guards.
-- No Auth/app/config rows, settings values, helpers, sequence or mutation.
-- Review the permitted source before retaining. Not provider API/JWT proof.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='1000ms';
SET LOCAL search_path=pg_catalog,pg_temp;
WITH expected(envelope) AS (
 SELECT '{"acl":"{=X/supabase_auth_admin,supabase_auth_admin=X/supabase_auth_admin,dashboard_user=X/supabase_auth_admin}","kind":"f","owner":"supabase_auth_admin","strict":false,"defaults":0,"language":"sql","bodyMd5Lf":"cdef18c69c4f4cbbced2eaf81e628b49","configMd5":null,"signature":"auth.uid()","configKeys":[],"resultType":"uuid","returnsSet":false,"volatility":"s","anonExecute":true,"argumentsMd5":"d41d8cd98f00b204e9800998ecf8427e","argumentModes":null,"argumentNames":null,"definitionMd5":"ea3b41bf29e2ad573067939329aa088e","serviceExecute":true,"definitionBytes":274,"postgresExecute":true,"securityDefiner":false,"authenticatedExecute":true}'::pg_catalog.jsonb
), selected AS (
 SELECT p.*,l.lanname,pg_catalog.pg_get_functiondef(p.oid) full_definition,
 pg_catalog.jsonb_build_object('signature',p.oid::pg_catalog.regprocedure::pg_catalog.text,
  'owner',pg_catalog.pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'securityDefiner',p.prosecdef,'volatility',p.provolatile,
  'strict',p.proisstrict,'returnsSet',p.proretset,'defaults',p.pronargdefaults,
  'resultType',pg_catalog.format_type(p.prorettype,NULL),
  'argumentNames',p.proargnames,'argumentModes',p.proargmodes,
  'argumentsMd5',pg_catalog.md5(pg_catalog.pg_get_function_arguments(p.oid)),
  'configKeys',ARRAY(SELECT pg_catalog.split_part(v,'=',1) FROM pg_catalog.unnest(p.proconfig)v),
  'configMd5',pg_catalog.md5(p.proconfig::pg_catalog.text),'acl',p.proacl::pg_catalog.text,
  'definitionMd5',pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)),
  'bodyMd5Lf',pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')),
  'definitionBytes',pg_catalog.octet_length(pg_catalog.pg_get_functiondef(p.oid)),
  'anonExecute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
  'authenticatedExecute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
  'serviceExecute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'),
  'postgresExecute',pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')) envelope
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang
 WHERE p.oid=pg_catalog.to_regprocedure('auth.uid()')
), screened AS (
 SELECT s.*,(s.envelope=e.envelope
 AND pg_catalog.octet_length(s.prosrc)<512
 AND s.prosrc !~* '(password|secret|token|api[_ -]?key|https?://|sk[-_]|@[a-z0-9])'
 AND s.prosrc !~ '\$[a-zA-Z0-9_]*\$'
 AND NOT EXISTS (
  SELECT 1 FROM pg_catalog.regexp_matches(s.prosrc,'''((?:''''|[^''])*)''','g') literal
  WHERE literal[1] NOT IN ('request.jwt.claim.sub','request.jwt.claims','sub','')
 )) permitted FROM selected s CROSS JOIN expected e
)
SELECT pg_catalog.jsonb_build_object(
 'projectRef','wjxaajgvddtrxxtocxen',
 'mode','read-only-selected-provider-source-not-history',
 'observedAtUtc',pg_catalog.timezone('UTC',pg_catalog.statement_timestamp()),
 'serverVersion',pg_catalog.current_setting('server_version'),
 'functions',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
 'signature','auth.uid()','envelope',s.envelope,
 'permitted',COALESCE(s.permitted,false),
 'definition',CASE WHEN s.permitted THEN s.full_definition ELSE NULL END
 )) FROM screened s),'[]'::pg_catalog.jsonb),
 'limits','Exactly auth.uid() previously fingerprinted in the reviewed referral financial capture. No app/Auth/config rows/counts, helper execution, settings values, arbitrary source, sequence, mutation or original history/baseline/JWT/session/actor adoption. Matching full envelope plus independent privacy/size/literal guards required. Manual review before source retention. Provider role flags and schema are not recovered.'
) source;
ROLLBACK;
