-- READ-ONLY gated referral bounty/payout dependency structure, NOT history.
-- Two financial tables only. No app/Auth/config rows/counts, helpers or sequence values.
-- Expected hashes from the preceding reviewed metadata-only capture in this slice.
-- Raw pieces require BOTH matching fingerprints and fixed privacy guards.
-- Function bodies remain fingerprints only; review output before retention.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='1000ms';
SET LOCAL search_path=pg_catalog,pg_temp;
WITH selected_relations AS (
 SELECT c.*,n.nspname FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN
 ('partner_program_commission_events','partner_program_payouts')
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
 ('has_role','pp_award_bounty','pp_user_signup_bounty',
  'tg_auto_assign_sales_rep','pp_recompute_payout_total')) OR
  p.oid IN (SELECT tgfoid FROM selected_triggers) OR
  (n.nspname IN ('public','auth') AND p.oid IN (SELECT refobjid FROM expression_functions)))
), expected_pieces(category,table_name,name,hash) AS (
 VALUES
 ('column','partner_program_commission_events','id','f3b72bb359a50b640590970a2ab8e514'),
 ('column','partner_program_commission_events','partner_id',NULL),
 ('column','partner_program_commission_events','event_type',NULL),
 ('column','partner_program_commission_events','amount_php','cfcd208495d565ef66e7dff9f98764da'),
 ('column','partner_program_commission_events','commission_php','cfcd208495d565ef66e7dff9f98764da'),
 ('column','partner_program_commission_events','status','3d0c12821e68f0fc31291c72ad568aa9'),
 ('column','partner_program_commission_events','source_ref',NULL),
 ('column','partner_program_commission_events','event_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','partner_program_commission_events','cleared_at',NULL),
 ('column','partner_program_commission_events','notes',NULL),
 ('column','partner_program_commission_events','created_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','partner_program_commission_events','payout_id',NULL),
 ('column','partner_program_commission_events','approved_by',NULL),
 ('column','partner_program_commission_events','approved_at',NULL),
 ('column','partner_program_commission_events','paid_at',NULL),
 ('column','partner_program_commission_events','clawed_back_reason',NULL),
 ('column','partner_program_commission_events','clawed_back_at',NULL),
 ('column','partner_program_commission_events','clawed_back_by',NULL),
 ('column','partner_program_payouts','id','f3b72bb359a50b640590970a2ab8e514'),
 ('column','partner_program_payouts','partner_id',NULL),
 ('column','partner_program_payouts','amount_php','cfcd208495d565ef66e7dff9f98764da'),
 ('column','partner_program_payouts','method','1c86fb6219cabad38570bf1d10fc4e27'),
 ('column','partner_program_payouts','reference',NULL),
 ('column','partner_program_payouts','status','3d0c12821e68f0fc31291c72ad568aa9'),
 ('column','partner_program_payouts','notes',NULL),
 ('column','partner_program_payouts','created_by',NULL),
 ('column','partner_program_payouts','paid_by',NULL),
 ('column','partner_program_payouts','paid_at',NULL),
 ('column','partner_program_payouts','created_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','partner_program_payouts','updated_at','75230039beb12ce952f24927f2bfa2f2'),
 ('constraint','partner_program_commission_events','partner_program_commission_events_approved_by_fkey','605edf7a887a2105b2c0312e5bc6fd91'),
 ('constraint','partner_program_commission_events','partner_program_commission_events_clawed_back_by_fkey','4af6124ff58f5756d9455c2963cddf2a'),
 ('constraint','partner_program_commission_events','partner_program_commission_events_event_type_check','5b18c304faa814933bc38f2b90e6c4c4'),
 ('constraint','partner_program_commission_events','partner_program_commission_events_partner_id_fkey','5707efabf3288ab2212ed453dade65b3'),
 ('constraint','partner_program_commission_events','partner_program_commission_events_payout_id_fkey','019c5c6f7b3fe782ffd174e1c03bcb4c'),
 ('constraint','partner_program_commission_events','partner_program_commission_events_pkey','4c6419b3704337bbfe50f018842a9ad3'),
 ('constraint','partner_program_commission_events','partner_program_commission_events_status_check','82b270b6e0af4a39ce582daaa162dabf'),
 ('constraint','partner_program_payouts','partner_program_payouts_created_by_fkey','1ceab562a11c774dbbb18205981be824'),
 ('constraint','partner_program_payouts','partner_program_payouts_paid_by_fkey','623bc12172bfead3e8c85781a90e0232'),
 ('constraint','partner_program_payouts','partner_program_payouts_partner_id_fkey','5707efabf3288ab2212ed453dade65b3'),
 ('constraint','partner_program_payouts','partner_program_payouts_pkey','4c6419b3704337bbfe50f018842a9ad3'),
 ('constraint','partner_program_payouts','partner_program_payouts_status_check','d3208dbcd2016084b60c4c2aae620dcd'),
 ('index','partner_program_commission_events','partner_program_commission_events_pkey','6908d0ea49146721cb6121873f2eb8e3'),
 ('index','partner_program_commission_events','pp_commission_events_source_uniq','4df3bdb6c10afef695355e984605075d'),
 ('index','partner_program_commission_events','pp_events_partner_idx','5b97ebc248121780f8f19ea7e61838fb'),
 ('index','partner_program_commission_events','pp_events_payout_idx','4e553a4ddaf1e4830f9f34fbb23696dc'),
 ('index','partner_program_payouts','partner_program_payouts_pkey','d40f20de2bfa8f30afbad787e569af53'),
 ('index','partner_program_payouts','pp_payouts_partner_idx','7bed178f29c34c1bca62890b05b6114f'),
 ('policyUsing','partner_program_commission_events','admin_write_events','52601dff68335277823fcbfe28ec86d5'),
 ('policyCheck','partner_program_commission_events','admin_write_events','52601dff68335277823fcbfe28ec86d5'),
 ('policyUsing','partner_program_commission_events','partner_or_admin_read_events','d23e472f5c50c17231f03cf86851f27d'),
 ('policyCheck','partner_program_commission_events','partner_or_admin_read_events',NULL),
 ('policyUsing','partner_program_payouts','admin_write_payouts','52601dff68335277823fcbfe28ec86d5'),
 ('policyCheck','partner_program_payouts','admin_write_payouts','52601dff68335277823fcbfe28ec86d5'),
 ('policyUsing','partner_program_payouts','partner_or_admin_read_payouts','d23e472f5c50c17231f03cf86851f27d'),
 ('policyCheck','partner_program_payouts','partner_or_admin_read_payouts',NULL),
 ('trigger','partner_program_payouts','pp_payouts_updated','df61d876689524477524d5977b72d802')
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
      WHERE literal[1] NOT IN ('public','manual','pending','approved','clawed_back','paid','processing','failed','cancelled','seller_sub','boost','verified_business','advertiser_purchase','shop_purchase','user_signup','business_signup','other','admin')
    )
   ))) permitted
 FROM raw_pieces r LEFT JOIN expected_pieces e ON e.category=r.category AND e.table_name=r.table_name AND e.name=r.name
)
SELECT pg_catalog.jsonb_build_object(
 'projectRef','wjxaajgvddtrxxtocxen','mode','read-only-selected-structure-not-history',
 'observedAtUtc',pg_catalog.timezone('UTC',pg_catalog.statement_timestamp()),
 'serverVersion',pg_catalog.current_setting('server_version'),
 'scope','Full partner_program_commission_events and partner_program_payouts structural metadata, selected/direct-expression function fingerprints and related enums. Structural definitions only behind preceding metadata hashes and privacy gates. No data rows, helper calls or function bodies.',
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
 'limits','Two selected financial tables only. No app/Auth/config rows or counts, helper calls/function bodies, arbitrary structural definitions, sequence or settings/config values, mutation, original-source/history adoption, approved baseline, complete bootstrap/actor/authority/offboarding or release acceptance. Expected hashes come from the preceding reviewed metadata-only capture; privacy independently gates raw pieces. Denials return NULL. Referral/bounty writes/forward attachments remain a separate behavioral frontier. Effective MAINTAIN is not evaluated; raw ACL retained.'
) catalog;
ROLLBACK;
