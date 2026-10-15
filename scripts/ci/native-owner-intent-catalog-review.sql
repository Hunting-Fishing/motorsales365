-- READ-ONLY selected owner-intent/profile/admin-audit metadata; no application
-- helper calls, auth/business/profile/audit rows or counts, DDL/history adoption.
-- Raw definitions are limited to six named reviewed helper families, bounded
-- to 64 KiB each and require privacy review before saving any later capture.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='1000ms';
SET LOCAL search_path=pg_catalog,pg_temp;
WITH selected_relations AS (
 SELECT c.*,n.nspname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN ('profiles','admin_audit_log','user_roles')
), selected_functions AS (
 SELECT p.* FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prokind='f' AND p.proname IN
 ('derive_signup_intent','recompute_signup_intent','trg_businesses_recompute_intent',
  'trg_profiles_recompute_intent','has_role','can_support')
), selected_columns AS (
 SELECT r.oid,r.relname,a.*,pg_catalog.pg_get_expr(d.adbin,d.adrelid) default_expression
 FROM selected_relations r JOIN pg_catalog.pg_attribute a ON a.attrelid=r.oid
 LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=r.oid AND d.adnum=a.attnum
 WHERE a.attnum>0 AND NOT a.attisdropped AND (r.relname<>'profiles' OR a.attname IN
 ('id','seller_type','signup_intent','intent_evaluated_at','intent_evaluated_by','updated_at'))
)
SELECT pg_catalog.jsonb_build_object(
 'projectRef','wjxaajgvddtrxxtocxen','mode','read-only-catalog',
 'observedAtUtc',pg_catalog.timezone('UTC',pg_catalog.statement_timestamp()),
 'serverVersion',pg_catalog.current_setting('server_version'),
 'scope','Six named public helper families including every retained recompute overload; profiles six named columns, admin-audit/user-role columns, selected constraints/policies/noninternal attachments. Catalog definitions are observation evidence, not applied migration provenance.',
 'functions',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
 'signature',p.oid::pg_catalog.regprocedure::pg_catalog.text,
 'owner',pg_catalog.pg_get_userbyid(p.proowner),'language',l.lanname,
 'kind',p.prokind,'securityDefiner',p.prosecdef,'volatility',p.provolatile,
 'strict',p.proisstrict,'returnsSet',p.proretset,
 'arguments',pg_catalog.pg_get_function_arguments(p.oid),'defaults',p.pronargdefaults,
 'result',pg_catalog.pg_get_function_result(p.oid),'config',p.proconfig,'acl',p.proacl::pg_catalog.text,
 'definitionMd5',pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)),
 'bodyMd5Lf',pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')),
 'definitionBytes',pg_catalog.octet_length(pg_catalog.pg_get_functiondef(p.oid)),
 'definition',CASE WHEN pg_catalog.octet_length(pg_catalog.pg_get_functiondef(p.oid))<=65536
   THEN pg_catalog.pg_get_functiondef(p.oid) ELSE NULL END,
 'anonExecute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
 'authenticatedExecute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
 'serviceExecute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'),
 'postgresExecute',pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
 ) ORDER BY p.oid::pg_catalog.regprocedure::pg_catalog.text) FROM selected_functions p
 JOIN pg_catalog.pg_language l ON l.oid=p.prolang),'[]'::pg_catalog.jsonb),
 'tables',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
 'table',r.relname,'owner',pg_catalog.pg_get_userbyid(r.relowner),'kind',r.relkind,
 'partition',r.relispartition,'rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,
 'acl',r.relacl::pg_catalog.text,
 'inheritanceEdges',(SELECT count(*) FROM pg_catalog.pg_inherits i WHERE i.inhrelid=r.oid OR i.inhparent=r.oid),
 'rights',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('role',v.role,
 'select',pg_catalog.has_table_privilege(v.role,r.oid,'SELECT'),
 'insert',pg_catalog.has_table_privilege(v.role,r.oid,'INSERT'),
 'update',pg_catalog.has_table_privilege(v.role,r.oid,'UPDATE'),
 'delete',pg_catalog.has_table_privilege(v.role,r.oid,'DELETE')) ORDER BY v.role)
 FROM (VALUES('anon'),('authenticated'),('postgres'),('service_role'))v(role))
 ) ORDER BY r.relname) FROM selected_relations r),'[]'::pg_catalog.jsonb),
 'columns',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
 'table',a.relname,'position',a.attnum,'name',a.attname,
 'type',pg_catalog.format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,
 'default',a.default_expression,'acl',a.attacl::pg_catalog.text,
 'authenticatedSelect',pg_catalog.has_column_privilege('authenticated',a.oid,a.attnum,'SELECT'),
 'authenticatedInsert',pg_catalog.has_column_privilege('authenticated',a.oid,a.attnum,'INSERT'),
 'authenticatedUpdate',pg_catalog.has_column_privilege('authenticated',a.oid,a.attnum,'UPDATE')
 ) ORDER BY a.relname,a.attnum) FROM selected_columns a),'[]'::pg_catalog.jsonb),
 'constraints',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
 'table',r.relname,'name',k.conname,'type',k.contype,'validated',k.convalidated,
 'definition',pg_catalog.pg_get_constraintdef(k.oid)
 ) ORDER BY r.relname,k.conname) FROM selected_relations r
 JOIN pg_catalog.pg_constraint k ON k.conrelid=r.oid),'[]'::pg_catalog.jsonb),
 'policies',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
 'table',p.tablename,'name',p.policyname,'roles',p.roles,'permissive',p.permissive,
 'command',p.cmd,'using',p.qual,'check',p.with_check
 ) ORDER BY p.tablename,p.policyname) FROM pg_catalog.pg_policies p
 WHERE p.schemaname='public' AND p.tablename IN(SELECT relname FROM selected_relations)),'[]'::pg_catalog.jsonb),
 'triggers',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
 'table',r.relname,'name',t.tgname,'enabled',t.tgenabled,
 'definition',pg_catalog.pg_get_triggerdef(t.oid),
 'updateColumns',ARRAY(SELECT a.attname FROM pg_catalog.pg_attribute a
    WHERE a.attrelid=r.oid AND a.attnum=ANY(t.tgattr::pg_catalog.int2[]) ORDER BY a.attnum),
 'function',t.tgfoid::pg_catalog.regprocedure::pg_catalog.text,
 'functionOwner',pg_catalog.pg_get_userbyid(p.proowner),
 'functionSecurityDefiner',p.prosecdef,'functionConfig',p.proconfig,'functionAcl',p.proacl::pg_catalog.text,
 'functionDefinitionMd5',pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)),
 'functionBodyMd5Lf',pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),''))
 ) ORDER BY r.relname,t.tgname) FROM selected_relations r
 JOIN pg_catalog.pg_trigger t ON t.tgrelid=r.oid JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
 WHERE NOT t.tgisinternal),'[]'::pg_catalog.jsonb),
 'limits','No business/auth/profile/audit/role row data or business counts, helper invocation, mutation, hosted API/session/concurrency, full incoming writer/role/object-identity closure, source-history adoption, baseline/parity or release acceptance. Only selected columns and raw metadata values; future capture requires fresh privacy review.'
) catalog;
ROLLBACK;
