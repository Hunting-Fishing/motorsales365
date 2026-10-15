-- READ-ONLY CATALOG REVIEW ONLY. No business/auth/claim/audit rows or counts,
-- application helper/RPC invocation, DDL, history repair or release acceptance.
-- Project identity is supplied by the reviewed connector target, not inferred
-- from the common postgres database name. Preserve dated results separately.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='1000ms';
SET LOCAL search_path=pg_catalog,pg_temp;
WITH selected_relations AS (
  SELECT c.oid,n.nspname,c.relname,c.relowner,c.relkind,c.relispartition,
    c.relrowsecurity,c.relforcerowsecurity,c.relacl
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname IN
    ('businesses','business_claim_requests','business_claim_audit')
), selected_functions AS (
  SELECT p.* FROM pg_catalog.pg_proc p WHERE p.oid IN (
    pg_catalog.to_regprocedure('public.approve_business_claim(pg_catalog.uuid,pg_catalog.bool)'),
    pg_catalog.to_regprocedure('public.can_moderate(pg_catalog.uuid)'),
    pg_catalog.to_regprocedure('public.has_role(pg_catalog.uuid,public.app_role)'),
    pg_catalog.to_regprocedure('public.guard_business_owner_update()'),
    pg_catalog.to_regprocedure('public.tg_claim_audit_status()'),
    pg_catalog.to_regprocedure('public.touch_updated_at()'),
    pg_catalog.to_regprocedure('public.update_updated_at_column()')
  )
), selected_columns AS (
  SELECT r.*,a.attnum,a.attname,a.atttypid,a.atttypmod,a.attnotnull,a.attacl,
    pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS default_expression
  FROM selected_relations r JOIN pg_catalog.pg_attribute a ON a.attrelid=r.oid
  LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=r.oid AND d.adnum=a.attnum
  WHERE a.attnum>0 AND NOT a.attisdropped AND (r.relname<>'businesses' OR a.attname IN
    ('id','owner_id','name','claim_state','source','source_external_id',
     'subscription_tier','featured','featured_until','status','created_at','updated_at'))
)
SELECT pg_catalog.jsonb_build_object(
  'projectRef','wjxaajgvddtrxxtocxen',
  'mode','read-only-catalog',
  'observedAtUtc',pg_catalog.timezone('UTC',pg_catalog.statement_timestamp()),
  'serverVersion',pg_catalog.current_setting('server_version'),
  'scope','Seven selected function signatures; three selected relations, all their policies/noninternal attachments, claim/audit critical shape, and only twelve named business columns. No business rows or whole-schema/applied-history acceptance.',
  'functions',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'signature',p.oid::pg_catalog.regprocedure::pg_catalog.text,
    'owner',pg_catalog.pg_get_userbyid(p.proowner),'language',l.lanname,
    'kind',p.prokind,'securityDefiner',p.prosecdef,'volatility',p.provolatile,
    'strict',p.proisstrict,'returnsSet',p.proretset,
    'arguments',pg_catalog.pg_get_function_arguments(p.oid),
    'result',pg_catalog.pg_get_function_result(p.oid),'config',p.proconfig,
    'acl',p.proacl::pg_catalog.text,
    'definitionMd5',pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)),
    'bodyMd5Lf',pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')),
    'anonExecute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
    'authenticatedExecute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
    'serviceExecute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'),
    'postgresExecute',pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
  ) ORDER BY p.oid::pg_catalog.regprocedure::pg_catalog.text)
  FROM selected_functions p JOIN pg_catalog.pg_language l ON l.oid=p.prolang),'[]'::pg_catalog.jsonb),
  'tables',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'schema',r.nspname,'table',r.relname,'owner',pg_catalog.pg_get_userbyid(r.relowner),
    'kind',r.relkind,'partition',r.relispartition,'rls',r.relrowsecurity,
    'forceRls',r.relforcerowsecurity,'acl',r.relacl::pg_catalog.text,
    'inheritanceEdges',(SELECT count(*) FROM pg_catalog.pg_inherits i WHERE i.inhrelid=r.oid OR i.inhparent=r.oid),
    'rights',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'role',v.role,'select',pg_catalog.has_table_privilege(v.role,r.oid,'SELECT'),
      'insert',pg_catalog.has_table_privilege(v.role,r.oid,'INSERT'),
      'update',pg_catalog.has_table_privilege(v.role,r.oid,'UPDATE'),
      'delete',pg_catalog.has_table_privilege(v.role,r.oid,'DELETE')
    ) ORDER BY v.role) FROM (VALUES('anon'),('authenticated'),('postgres'),('service_role')) v(role))
  ) ORDER BY r.relname) FROM selected_relations r),'[]'::pg_catalog.jsonb),
  'columns',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'table',r.relname,'position',r.attnum,'name',r.attname,
    'type',pg_catalog.format_type(r.atttypid,r.atttypmod),'notNull',r.attnotnull,
    'default',r.default_expression,'acl',r.attacl::pg_catalog.text,
    'authenticatedSelect',pg_catalog.has_column_privilege('authenticated',r.oid,r.attnum,'SELECT'),
    'authenticatedInsert',pg_catalog.has_column_privilege('authenticated',r.oid,r.attnum,'INSERT'),
    'authenticatedUpdate',pg_catalog.has_column_privilege('authenticated',r.oid,r.attnum,'UPDATE')
  ) ORDER BY r.relname,r.attnum) FROM selected_columns r),'[]'::pg_catalog.jsonb),
  'constraints',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'table',r.relname,'name',k.conname,'type',k.contype,'validated',k.convalidated,
    'definition',pg_catalog.pg_get_constraintdef(k.oid)
  ) ORDER BY r.relname,k.conname) FROM selected_relations r JOIN pg_catalog.pg_constraint k ON k.conrelid=r.oid),'[]'::pg_catalog.jsonb),
  'policies',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'table',p.tablename,'name',p.policyname,'permissive',p.permissive,
    'roles',p.roles,'command',p.cmd,'using',p.qual,'check',p.with_check
  ) ORDER BY p.tablename,p.policyname) FROM pg_catalog.pg_policies p
    WHERE p.schemaname='public' AND p.tablename IN (SELECT relname FROM selected_relations)),'[]'::pg_catalog.jsonb),
  'triggers',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'table',r.relname,'name',t.tgname,'enabled',t.tgenabled,
    'definition',pg_catalog.pg_get_triggerdef(t.oid),
    'function',t.tgfoid::pg_catalog.regprocedure::pg_catalog.text,
    'functionOwner',pg_catalog.pg_get_userbyid(p.proowner),
    'functionSecurityDefiner',p.prosecdef,'functionConfig',p.proconfig,
    'functionAcl',p.proacl::pg_catalog.text,
    'functionDefinitionMd5',pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)),
    'functionBodyMd5Lf',pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),''))
  ) ORDER BY r.relname,t.tgname) FROM selected_relations r JOIN pg_catalog.pg_trigger t ON t.tgrelid=r.oid
    JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal),'[]'::pg_catalog.jsonb),
  'limits','Catalog metadata only. Missing signatures remain missing, not stubbed current functions. No customer/auth/business/claim/audit content or row counts, callable application behavior, full writer closure, concurrent sessions, authenticated API, migration provenance, baseline/parity or release acceptance.'
) AS catalog;
ROLLBACK;
