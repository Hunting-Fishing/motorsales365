-- READ-ONLY selected org/member/tier structure recovery, NOT historical source.
-- Three tables only, no rows/counts/helper calls/sequence or settings values.
-- Raw structural pieces stay NULL unless pinned hash and privacy guards match.
-- Org/member hashes: PR55; tier hashes: actual retained selected DDL in memory.
-- No seeds/backfills. Separate privacy review required before retaining output.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='1000ms';
SET LOCAL search_path=pg_catalog,pg_temp;
WITH selected_relations AS (
 SELECT c.*,n.nspname FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN
 ('organizations','organization_members','member_tiers')
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
 ('has_role','can_manage_org','is_org_member','tg_org_add_creator_as_owner',
  'block_internal_staff_org','tg_set_updated_at','canonical_365_org_id',
  'is_internal_365_staff')) OR
  p.oid IN (SELECT tgfoid FROM selected_triggers) OR
  (n.nspname IN ('public','auth') AND p.oid IN (SELECT refobjid FROM expression_functions)))
), expected_pieces(category,table_name,name,hash) AS (
 VALUES
 ('column','organization_members','id','f3b72bb359a50b640590970a2ab8e514'),
 ('column','organization_members','organization_id',NULL),
 ('column','organization_members','user_id',NULL),
 ('column','organization_members','role','aaf5e2d423e0ac6be311292ab8cfff7a'),
 ('column','organization_members','invited_by',NULL),
 ('column','organization_members','joined_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','organizations','id','f3b72bb359a50b640590970a2ab8e514'),
 ('column','organizations','name',NULL),
 ('column','organizations','slug',NULL),
 ('column','organizations','kind','d89737d751a4c361676751f4e475b055'),
 ('column','organizations','description',NULL),
 ('column','organizations','logo_url',NULL),
 ('column','organizations','website',NULL),
 ('column','organizations','phone',NULL),
 ('column','organizations','email',NULL),
 ('column','organizations','street_address',NULL),
 ('column','organizations','barangay',NULL),
 ('column','organizations','city',NULL),
 ('column','organizations','province',NULL),
 ('column','organizations','region',NULL),
 ('column','organizations','postal_code',NULL),
 ('column','organizations','lat',NULL),
 ('column','organizations','lng',NULL),
 ('column','organizations','status','cfaf8d9e8ae4be644c6e743d4de4ac24'),
 ('column','organizations','verification_status','770739f7c7688f9d248312b9251dfe14'),
 ('column','organizations','verified_at',NULL),
 ('column','organizations','created_by',NULL),
 ('column','organizations','created_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','organizations','updated_at','75230039beb12ce952f24927f2bfa2f2'),
 ('constraint','organization_members','organization_members_invited_by_fkey','a69b0a652c9ebb326a06cb48b47c5215'),
 ('constraint','organization_members','organization_members_organization_id_fkey','862d3e65572468c2226ee609d16b40e4'),
 ('constraint','organization_members','organization_members_organization_id_user_id_key','0522fd08870e800988ad0017c5465df8'),
 ('constraint','organization_members','organization_members_pkey','4c6419b3704337bbfe50f018842a9ad3'),
 ('constraint','organization_members','organization_members_user_id_fkey','85d8b2f5f0c0f6b4dcb854efb61a8cb1'),
 ('constraint','organizations','organizations_created_by_fkey','894265d4102fcf170b5b0f16b5f40a3f'),
 ('constraint','organizations','organizations_pkey','4c6419b3704337bbfe50f018842a9ad3'),
 ('constraint','organizations','organizations_slug_key','687397275d0e852fb2a4b50394adffee'),
 ('index','organization_members','idx_organization_members_org_role','2a4110d6bda0406865fee715cb59ade5'),
 ('index','organization_members','idx_organization_members_user_id','3e8d0759ea76d3cb328ee90e57ad3512'),
 ('index','organization_members','organization_members_organization_id_user_id_key','b7abeb76f43c357e789ce83f97079997'),
 ('index','organization_members','organization_members_pkey','0958b9906b37482cf5ebd4675dd6e0c1'),
 ('index','organizations','organizations_pkey','f45c1aefdc5c9e573ccc52f6cb1e62d3'),
 ('index','organizations','organizations_slug_key','a881bf64441213989542be703220da41'),
 ('policyUsing','organization_members','Org managers add memberships',NULL),
 ('policyCheck','organization_members','Org managers add memberships','c9c3aeee2b2becf3ae46c67bb3e75f65'),
 ('policyUsing','organization_members','Org managers remove memberships','c9c3aeee2b2becf3ae46c67bb3e75f65'),
 ('policyCheck','organization_members','Org managers remove memberships',NULL),
 ('policyUsing','organization_members','Org managers update memberships','c9c3aeee2b2becf3ae46c67bb3e75f65'),
 ('policyCheck','organization_members','Org managers update memberships','c9c3aeee2b2becf3ae46c67bb3e75f65'),
 ('policyUsing','organization_members','Org members read memberships','e8f73862f87c6808044ed7b1c2ffbcc7'),
 ('policyCheck','organization_members','Org members read memberships',NULL),
 ('policyUsing','organizations','Org managers delete organizations','cbb06892211e532bb2fb0e40415d0d7d'),
 ('policyCheck','organizations','Org managers delete organizations',NULL),
 ('policyUsing','organizations','Org managers update organizations','cbb06892211e532bb2fb0e40415d0d7d'),
 ('policyCheck','organizations','Org managers update organizations','cbb06892211e532bb2fb0e40415d0d7d'),
 ('policyUsing','organizations','Public read organizations','b326b5062b2f0e69046810717534cb09'),
 ('policyCheck','organizations','Public read organizations',NULL),
 ('policyUsing','organizations','Users create own organizations',NULL),
 ('policyCheck','organizations','Users create own organizations','987767fc803474751ce44a4235a12922'),
 ('trigger','organizations','org_add_creator_as_owner','3965da0eed938e77308130f0cbc01a4f'),
 ('trigger','organizations','organizations_set_updated_at','4ca0905dcbde8dc8735f888edf4da07f'),
 ('trigger','organizations','trg_block_internal_staff_org','2d1f40720016dd513188942b21c8a5e7'),
 ('column','member_tiers','annual_badge_months','cfcd208495d565ef66e7dff9f98764da'),
 ('column','member_tiers','annual_boost_credits','cfcd208495d565ef66e7dff9f98764da'),
 ('column','member_tiers','color',NULL),
 ('column','member_tiers','created_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','member_tiers','id',NULL),
 ('column','member_tiers','min_score',NULL),
 ('column','member_tiers','min_tenure_days',NULL),
 ('column','member_tiers','name',NULL),
 ('column','member_tiers','quarterly_boost_credits','cfcd208495d565ef66e7dff9f98764da'),
 ('column','member_tiers','rank',NULL),
 ('constraint','member_tiers','member_tiers_pkey','4c6419b3704337bbfe50f018842a9ad3'),
 ('constraint','member_tiers','member_tiers_rank_key','de4b57fdebbb1adeaae27590fb8a912c'),
 ('index','member_tiers','member_tiers_pkey','ea5c3dc47b455f5053757de5cee0c0ae'),
 ('index','member_tiers','member_tiers_rank_key','b15af776f45b9238ea924d3e82639960'),
 ('policyCheck','member_tiers','tiers readable',NULL),
 ('policyUsing','member_tiers','tiers readable','b326b5062b2f0e69046810717534cb09')
), raw_pieces AS (
 SELECT 'column'::pg_catalog.text category,r.relname table_name,a.attname name,
  pg_catalog.pg_get_expr(d.adbin,d.adrelid) definition
 FROM selected_relations r JOIN pg_catalog.pg_attribute a ON a.attrelid=r.oid
 LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=r.oid AND d.adnum=a.attnum
 WHERE a.attnum>0 AND NOT a.attisdropped
 UNION ALL
 SELECT 'constraint',r.relname,k.conname,pg_catalog.pg_get_constraintdef(k.oid)
 FROM selected_relations r JOIN pg_catalog.pg_constraint k ON k.conrelid=r.oid
 UNION ALL
 SELECT 'index',r.relname,c.relname,pg_catalog.pg_get_indexdef(i.indexrelid)
 FROM selected_relations r JOIN pg_catalog.pg_index i ON i.indrelid=r.oid
 JOIN pg_catalog.pg_class c ON c.oid=i.indexrelid
 UNION ALL
 SELECT 'policyUsing',r.relname,p.polname,pg_catalog.pg_get_expr(p.polqual,p.polrelid)
 FROM selected_relations r JOIN pg_catalog.pg_policy p ON p.polrelid=r.oid
 UNION ALL
 SELECT 'policyCheck',r.relname,p.polname,pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid)
 FROM selected_relations r JOIN pg_catalog.pg_policy p ON p.polrelid=r.oid
 UNION ALL
 SELECT 'trigger',r.relname,t.tgname,pg_catalog.pg_get_triggerdef(t.oid)
 FROM selected_relations r JOIN selected_triggers t ON t.tgrelid=r.oid
), screened_pieces AS (
 SELECT r.*,e.hash expected_hash,
  (e.name IS NOT NULL AND pg_catalog.md5(r.definition) IS NOT DISTINCT FROM e.hash
   AND (r.definition IS NULL OR (
    pg_catalog.octet_length(r.definition)<2048
    AND r.definition !~* '(password|secret|token|api[_ -]?key|https?://|sk[-_]|@[a-z0-9])'
    AND r.definition !~ '\$[a-zA-Z0-9_]*\$'
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.regexp_matches(r.definition,'''((?:''''|[^''])*)''','g') literal
      WHERE literal[1] NOT IN ('public','owner','admin','manager','member','viewer','dealership','active','unverified','common')
    )
   ))) permitted
 FROM raw_pieces r LEFT JOIN expected_pieces e ON e.category=r.category AND e.table_name=r.table_name AND e.name=r.name
)
SELECT pg_catalog.jsonb_build_object(
 'projectRef','wjxaajgvddtrxxtocxen','mode','read-only-selected-structure-not-history',
 'observedAtUtc',pg_catalog.timezone('UTC',pg_catalog.statement_timestamp()),
 'serverVersion',pg_catalog.current_setting('server_version'),
 'scope','Three public org/member/tier relations, complete structural metadata/attachments, named/direct-expression helper fingerprints and related enums. Default/constraint/index/policy/trigger text only behind expected-hash/privacy gates. No data rows or function bodies.',
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
 'pieces',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'category',s.category,'table',s.table_name,'name',s.name,
  'definitionMd5',pg_catalog.md5(s.definition),'expectedMd5',s.expected_hash,
  'permitted',COALESCE(s.permitted,false),
  'definition',CASE WHEN s.permitted THEN s.definition ELSE NULL END
 ) ORDER BY s.table_name,s.category,s.name) FROM screened_pieces s),'[]'::pg_catalog.jsonb),
 'limits','Three selected tables only. No rows/counts/helper calls/function bodies, arbitrary structural definitions, sequence or settings/config values, mutation, original-source/history adoption, approved baseline, complete auth/bootstrap/actor/authority/offboarding or release acceptance. Raw pieces require prior catalog or pinned retained tier-source hashes plus privacy checks. Denials return NULL. Effective MAINTAIN is not evaluated; raw ACL retained.'
) catalog;
ROLLBACK;
