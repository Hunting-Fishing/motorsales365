-- READ ONLY claim/request/evidence/audit structural fingerprints and selected
-- ownership writer envelopes. No raw bodies/defaults/config/expressions, rows,
-- file names/paths or content, helper calls, settings/sequence values or changes.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='1000ms';
SET LOCAL search_path=pg_catalog,pg_temp;
WITH selected_relations AS (
 SELECT c.*,n.nspname FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN
 ('business_claim_requests','business_claim_audit','business_claim_evidence')
), column_relations AS (
 SELECT oid,relname,nspname FROM selected_relations
), selected_columns AS (
 SELECT r.nspname,r.relname,a.*,d.adbin,d.adrelid FROM column_relations r
 JOIN pg_catalog.pg_attribute a ON a.attrelid=r.oid
 LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=r.oid AND d.adnum=a.attnum
 WHERE a.attnum>0 AND NOT a.attisdropped
), selected_triggers AS (
 SELECT t.* FROM pg_catalog.pg_trigger t WHERE NOT t.tgisinternal AND
 t.tgrelid IN (SELECT oid FROM selected_relations)
), expression_functions AS (
 SELECT DISTINCT d.refobjid FROM pg_catalog.pg_depend d
 WHERE d.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass AND
 ((d.classid='pg_catalog.pg_policy'::pg_catalog.regclass AND
   d.objid IN (SELECT oid FROM pg_catalog.pg_policy WHERE polrelid IN (SELECT oid FROM selected_relations))) OR
  (d.classid='pg_catalog.pg_attrdef'::pg_catalog.regclass AND
   d.objid IN (SELECT oid FROM pg_catalog.pg_attrdef WHERE adrelid IN (SELECT oid FROM selected_relations))) OR
  (d.classid='pg_catalog.pg_constraint'::pg_catalog.regclass AND
   d.objid IN (SELECT oid FROM pg_catalog.pg_constraint WHERE conrelid IN (SELECT oid FROM selected_relations))))
), selected_functions AS (
 SELECT p.* FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 WHERE p.prokind='f' AND
 ((n.nspname='public' AND p.proname IN
 ('approve_business_claim','can_moderate','guard_business_owner_update',
  'touch_updated_at','tg_claim_audit_status','tg_claim_audit_evidence','trg_businesses_recompute_intent')) OR
  p.oid IN (SELECT tgfoid FROM selected_triggers) OR
  (n.nspname IN ('public','auth') AND p.oid IN (SELECT refobjid FROM expression_functions)))
)
SELECT pg_catalog.jsonb_build_object(
 'projectRef','wjxaajgvddtrxxtocxen','mode','read-only-catalog-fingerprints',
 'observedAtUtc',pg_catalog.timezone('UTC',pg_catalog.statement_timestamp()),
 'serverVersion',pg_catalog.current_setting('server_version'),
 'scope','Full business_claim_requests, business_claim_audit and business_claim_evidence metadata; selected approval/guard/owner-intent/status/evidence/touch/moderation/provider function fingerprints and related enums. No app/Auth/config/content/storage rows, raw definitions or helper calls.',
 'functions',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'signature',p.oid::pg_catalog.regprocedure::pg_catalog.text,
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
   'delete',pg_catalog.has_table_privilege(v.role,r.oid,'DELETE'),
   'truncate',pg_catalog.has_table_privilege(v.role,r.oid,'TRUNCATE'),
   'references',pg_catalog.has_table_privilege(v.role,r.oid,'REFERENCES'),
   'trigger',pg_catalog.has_table_privilege(v.role,r.oid,'TRIGGER')) ORDER BY v.role)
   FROM (VALUES('anon'),('authenticated'),('postgres'),('service_role'))v(role))
 ) ORDER BY r.relname) FROM selected_relations r),'[]'::pg_catalog.jsonb),
 'columns',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'schema',a.nspname,'table',a.relname,'position',a.attnum,'name',a.attname,
  'type',pg_catalog.format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,
  'identity',a.attidentity,'generated',a.attgenerated,
  'defaultMd5',pg_catalog.md5(pg_catalog.pg_get_expr(a.adbin,a.adrelid)),
  'acl',a.attacl::pg_catalog.text
 ) ORDER BY a.nspname,a.relname,a.attnum) FROM selected_columns a),'[]'::pg_catalog.jsonb),
 'enums',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'schema',n.nspname,'name',t.typname,'labels',
   (SELECT pg_catalog.jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
    FROM pg_catalog.pg_enum e WHERE e.enumtypid=t.oid)
 ) ORDER BY n.nspname,t.typname) FROM pg_catalog.pg_type t
 JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
 WHERE t.typtype='e' AND (t.oid IN (SELECT atttypid FROM selected_columns) OR
       (n.nspname='public' AND t.typname='app_role'))),'[]'::pg_catalog.jsonb),
 'constraints',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'table',r.relname,'name',k.conname,'type',k.contype,'validated',k.convalidated,
  'deferrable',k.condeferrable,'deferred',k.condeferred,
  'columns',ARRAY(SELECT a.attname FROM pg_catalog.unnest(k.conkey) WITH ORDINALITY v(num,pos)
   JOIN pg_catalog.pg_attribute a ON a.attrelid=r.oid AND a.attnum=v.num ORDER BY v.pos),
  'referenceTable',CASE WHEN k.confrelid<>0 THEN k.confrelid::pg_catalog.regclass::pg_catalog.text END,
  'referenceColumns',ARRAY(SELECT a.attname FROM pg_catalog.unnest(k.confkey) WITH ORDINALITY v(num,pos)
   JOIN pg_catalog.pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=v.num ORDER BY v.pos),
  'onUpdate',k.confupdtype,'onDelete',k.confdeltype,'match',k.confmatchtype,
  'definitionMd5',pg_catalog.md5(pg_catalog.pg_get_constraintdef(k.oid))
 ) ORDER BY r.relname,k.conname) FROM selected_relations r
 JOIN pg_catalog.pg_constraint k ON k.conrelid=r.oid),'[]'::pg_catalog.jsonb),
 'indexes',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'table',r.relname,'name',c.relname,'unique',i.indisunique,'primary',i.indisprimary,
  'valid',i.indisvalid,'ready',i.indisready,
  'definitionMd5',pg_catalog.md5(pg_catalog.pg_get_indexdef(i.indexrelid))
 ) ORDER BY r.relname,c.relname) FROM selected_relations r
 JOIN pg_catalog.pg_index i ON i.indrelid=r.oid
 JOIN pg_catalog.pg_class c ON c.oid=i.indexrelid),'[]'::pg_catalog.jsonb),
 'policies',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'table',r.relname,'name',p.polname,'permissive',p.polpermissive,'command',p.polcmd,
  'roles',ARRAY(SELECT CASE WHEN v=0 THEN 'public' ELSE pg_catalog.pg_get_userbyid(v)::pg_catalog.text END
   FROM pg_catalog.unnest(p.polroles)v),
  'usingMd5',pg_catalog.md5(pg_catalog.pg_get_expr(p.polqual,p.polrelid)),
  'checkMd5',pg_catalog.md5(pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid))
 ) ORDER BY r.relname,p.polname) FROM selected_relations r
 JOIN pg_catalog.pg_policy p ON p.polrelid=r.oid),'[]'::pg_catalog.jsonb),
 'triggers',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'table',t.tgrelid::pg_catalog.regclass::pg_catalog.text,'name',t.tgname,
  'enabled',t.tgenabled,'typeBits',t.tgtype,'function',t.tgfoid::pg_catalog.regprocedure::pg_catalog.text,
  'updateColumns',ARRAY(SELECT a.attname FROM pg_catalog.pg_attribute a
   WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr::pg_catalog.int2[]) ORDER BY a.attnum),
  'argumentCount',t.tgnargs,'argumentsMd5',pg_catalog.md5(t.tgargs),
  'whenTreeMd5',pg_catalog.md5(t.tgqual::pg_catalog.text),
  'definitionMd5',pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid))
 ) ORDER BY t.tgrelid::pg_catalog.regclass::pg_catalog.text,t.tgname)
 FROM selected_triggers t),'[]'::pg_catalog.jsonb),
 'limits','Three selected claim tables only. No app/Auth/config/storage rows or counts, helper calls, raw bodies/defaults/config/SQL expressions, sequence/settings values, mutation, original-source/history adoption, approved baseline, original actor/session, native/offboarding or release acceptance. Storage-object bytes/policies and unselected incoming/transitive writers are not evaluated. Effective MAINTAIN is not evaluated; raw ACL retained.'
) catalog;
ROLLBACK;


