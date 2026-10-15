-- READ-ONLY bounded auth/profile/org bootstrap inventory, not authority,
-- migration provenance or release acceptance. No application/auth rows/counts
-- or helper invocation. Structure and fingerprints only; no raw definitions,
-- defaults, config values, expressions or sequence current values.
-- Privacy review required before saving output; no baseline/schema adoption.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='1000ms';
SET LOCAL search_path=pg_catalog,pg_temp;
WITH selected_relations AS (
 SELECT c.*,n.nspname FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN
 ('profiles','organizations','organization_members','internal_org_settings',
  'subscriptions','subscription_plans')
), column_relations AS (
 SELECT oid,relname,nspname FROM selected_relations
 UNION ALL
 SELECT c.oid,c.relname,n.nspname FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='auth' AND c.relname='users'
), selected_columns AS (
 SELECT r.nspname,r.relname,a.*,d.adbin,d.adrelid FROM column_relations r
 JOIN pg_catalog.pg_attribute a ON a.attrelid=r.oid
 LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=r.oid AND d.adnum=a.attnum
 WHERE a.attnum>0 AND NOT a.attisdropped AND
 (r.nspname='public' OR
  (r.nspname='auth' AND a.attname IN ('id','email','raw_user_meta_data','email_confirmed_at')))
), selected_triggers AS (
 SELECT t.* FROM pg_catalog.pg_trigger t WHERE NOT t.tgisinternal AND
 (t.tgrelid IN (SELECT oid FROM selected_relations) OR
  t.tgrelid IN (SELECT c.oid FROM pg_catalog.pg_class c
   JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='auth' AND c.relname='users'))
), selected_sequences AS (
 SELECT c.*,n.nspname,s.seqtypid,s.seqstart,s.seqincrement,s.seqmax,s.seqmin,s.seqcache,s.seqcycle
 FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_catalog.pg_sequence s ON s.seqrelid=c.oid
 WHERE n.nspname='public' AND c.relname='profiles_member_number_seq'
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
 ('has_role','can_moderate','can_support','is_sales_assigned_user',
  'handle_new_user','tg_auth_user_staff_accredit','accredit_staff_partner',
  'canonical_365_org_id','canonical_365_admin_id','is_internal_365_email',
  'is_internal_365_staff','set_internal_staff_manager','tg_auto_create_seller_org',
  'tg_org_add_creator_as_owner','block_internal_staff_org','assign_founding_member',
  'grant_founding_bronze','assign_profile_member_number','attach_signup_referral',
  'grant_business_trial','tg_set_updated_at','update_updated_at_column',
  'derive_signup_intent','recompute_signup_intent')) OR
  p.oid IN (SELECT tgfoid FROM selected_triggers) OR
  (n.nspname IN ('public','auth') AND p.oid IN (SELECT refobjid FROM expression_functions)))
)
SELECT pg_catalog.jsonb_build_object(
 'projectRef','wjxaajgvddtrxxtocxen','mode','read-only-catalog-fingerprints',
 'observedAtUtc',pg_catalog.timezone('UTC',pg_catalog.statement_timestamp()),
 'serverVersion',pg_catalog.current_setting('server_version'),
 'scope','Six selected public auth-bootstrap relations including full profiles, four auth.users support columns, selected-table/auth.users attachments, named helper families and direct public/auth expression-function dependencies. One member-number sequence metadata only. No rows, raw definitions or sequence current values.',
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
 'sequences',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'schema',s.nspname,'name',s.relname,'owner',pg_catalog.pg_get_userbyid(s.relowner),
  'acl',s.relacl::pg_catalog.text,'type',pg_catalog.format_type(s.seqtypid,NULL),
  'start',s.seqstart::pg_catalog.text,'increment',s.seqincrement::pg_catalog.text,
  'minimum',s.seqmin::pg_catalog.text,'maximum',s.seqmax::pg_catalog.text,
  'cache',s.seqcache::pg_catalog.text,'cycle',s.seqcycle,
  'ownedBy',ARRAY(SELECT n.nspname||'.'||c.relname||'.'||a.attname FROM pg_catalog.pg_depend d
    JOIN pg_catalog.pg_class c ON c.oid=d.refobjid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum=d.refobjsubid
    WHERE d.classid='pg_catalog.pg_class'::pg_catalog.regclass AND d.objid=s.oid
      AND d.refclassid='pg_catalog.pg_class'::pg_catalog.regclass AND d.deptype IN ('a','i')
    ORDER BY n.nspname,c.relname,a.attnum),
  'rights',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('role',v.role,
    'usage',pg_catalog.has_sequence_privilege(v.role,s.oid,'USAGE'),
    'select',pg_catalog.has_sequence_privilege(v.role,s.oid,'SELECT'),
    'update',pg_catalog.has_sequence_privilege(v.role,s.oid,'UPDATE')) ORDER BY v.role)
    FROM (VALUES('anon'),('authenticated'),('postgres'),('service_role'))v(role))
 ) ORDER BY s.nspname,s.relname) FROM selected_sequences s),'[]'::pg_catalog.jsonb),
 'limits','No row data, application/auth counts or helper calls, raw bodies/defaults/config values/SQL expressions, sequence last/current values, mutation, history adoption, trusted original actor, complete dependency closure, hosted behavior, baseline/parity or release acceptance. Direct catalog dependencies do not enumerate PL/pgSQL dynamic/transitive calls. Nonempty referrals, incoming writers and offboarding remain separate. Effective MAINTAIN is not evaluated; raw ACL retains it.'
) catalog;
ROLLBACK;
