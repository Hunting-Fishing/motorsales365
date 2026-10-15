-- READ-ONLY gated bootstrap business-read/admin-audit structure, NOT history.
-- Three tables only. No app/Auth/config rows/counts, helpers or sequence values.
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
 ('businesses','business_types','admin_audit_log')
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
 ('has_role','can_moderate','can_support','derive_signup_intent',
  'recompute_signup_intent','trg_profiles_recompute_intent','trg_businesses_recompute_intent')) OR
  p.oid IN (SELECT tgfoid FROM selected_triggers) OR
  (n.nspname IN ('public','auth') AND p.oid IN (SELECT refobjid FROM expression_functions)))
), expected_pieces(category,table_name,name,hash) AS (
 VALUES
 ('column','admin_audit_log','id','f3b72bb359a50b640590970a2ab8e514'),
 ('column','admin_audit_log','actor_id',NULL),
 ('column','admin_audit_log','target_user_id',NULL),
 ('column','admin_audit_log','action',NULL),
 ('column','admin_audit_log','field',NULL),
 ('column','admin_audit_log','old_value',NULL),
 ('column','admin_audit_log','new_value',NULL),
 ('column','admin_audit_log','note',NULL),
 ('column','admin_audit_log','created_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','admin_audit_log','entity_type',NULL),
 ('column','admin_audit_log','entity_id',NULL),
 ('column','admin_audit_log','metadata',NULL),
 ('column','business_types','slug',NULL),
 ('column','business_types','label',NULL),
 ('column','business_types','icon',NULL),
 ('column','business_types','sort_order','cfcd208495d565ef66e7dff9f98764da'),
 ('column','businesses','id','f3b72bb359a50b640590970a2ab8e514'),
 ('column','businesses','owner_id',NULL),
 ('column','businesses','slug',NULL),
 ('column','businesses','name',NULL),
 ('column','businesses','type_slug',NULL),
 ('column','businesses','description',NULL),
 ('column','businesses','logo_url',NULL),
 ('column','businesses','cover_url',NULL),
 ('column','businesses','photos','8b4b2df56ad0773943ef9179742da01b'),
 ('column','businesses','phone',NULL),
 ('column','businesses','email',NULL),
 ('column','businesses','website',NULL),
 ('column','businesses','messenger_url',NULL),
 ('column','businesses','hours',NULL),
 ('column','businesses','region',NULL),
 ('column','businesses','province',NULL),
 ('column','businesses','city',NULL),
 ('column','businesses','barangay',NULL),
 ('column','businesses','street_address',NULL),
 ('column','businesses','lat',NULL),
 ('column','businesses','lng',NULL),
 ('column','businesses','status','15a5a4bca68c8abf9d4a8dd6bdb5eeff'),
 ('column','businesses','featured','68934a3e9455fa72420237eb05902327'),
 ('column','businesses','rating_avg','cfcd208495d565ef66e7dff9f98764da'),
 ('column','businesses','rating_count','cfcd208495d565ef66e7dff9f98764da'),
 ('column','businesses','created_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','businesses','updated_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','businesses','postal_code',NULL),
 ('column','businesses','brands_carried',NULL),
 ('column','businesses','price_label',NULL),
 ('column','businesses','price_updated_at',NULL),
 ('column','businesses','source','1c86fb6219cabad38570bf1d10fc4e27'),
 ('column','businesses','source_external_id',NULL),
 ('column','businesses','subscription_tier','1f9d28e7a80fe25e88b6e26c9a7b34c4'),
 ('column','businesses','featured_until',NULL),
 ('column','businesses','organization_id',NULL),
 ('column','businesses','tagline',NULL),
 ('column','businesses','theme_color',NULL),
 ('column','businesses','show_services','b326b5062b2f0e69046810717534cb09'),
 ('column','businesses','show_products','b326b5062b2f0e69046810717534cb09'),
 ('column','businesses','show_posts','b326b5062b2f0e69046810717534cb09'),
 ('column','businesses','cta_primary','d2f978a113d24af7d844a6f0b4f03502'),
 ('column','businesses','show_gallery','b326b5062b2f0e69046810717534cb09'),
 ('column','businesses','show_contact','b326b5062b2f0e69046810717534cb09'),
 ('column','businesses','featured_video_url',NULL),
 ('column','businesses','featured_video_provider',NULL),
 ('column','businesses','vanity_slug',NULL),
 ('column','businesses','claim_state','e202a18c0f509b7c9549959f76be2a25'),
 ('column','businesses','import_metadata',NULL),
 ('column','businesses','attribution',NULL),
 ('column','businesses','removal_requested_at',NULL),
 ('column','businesses','facebook_url',NULL),
 ('column','businesses','whatsapp_number',NULL),
 ('column','businesses','expose_inventory_to_network','68934a3e9455fa72420237eb05902327'),
 ('column','businesses','network_exposure_status','3efd06564e0691c4ca7f3df332cbb312'),
 ('column','businesses','network_exposure_requested_at',NULL),
 ('column','businesses','network_exposure_reviewed_at',NULL),
 ('column','businesses','network_exposure_reviewed_by',NULL),
 ('column','businesses','network_exposure_review_note',NULL),
 ('column','businesses','custom_domain',NULL),
 ('column','businesses','custom_domain_status','3efd06564e0691c4ca7f3df332cbb312'),
 ('column','businesses','custom_domain_verify_token',NULL),
 ('column','businesses','custom_domain_verified_at',NULL),
 ('constraint','admin_audit_log','admin_audit_log_pkey','4c6419b3704337bbfe50f018842a9ad3'),
 ('constraint','business_types','business_types_pkey','df1d6753f9f1b7aeda2246f8247da522'),
 ('constraint','businesses','businesses_claim_state_check','200a7f3ac1786a022f3784e4401c8c75'),
 ('constraint','businesses','businesses_featured_video_provider_check','e757b86ec912cd815b7e5e8f7b78eb98'),
 ('constraint','businesses','businesses_network_exposure_reviewed_by_fkey','f38f2a3dc227338a060e1d78f4aa0c98'),
 ('constraint','businesses','businesses_network_exposure_status_check','76db3ba69e3b15b0eade488e84f538b8'),
 ('constraint','businesses','businesses_organization_id_fkey','dfae532b0de8c0f4bb512c9b30235ed9'),
 ('constraint','businesses','businesses_pkey','4c6419b3704337bbfe50f018842a9ad3'),
 ('constraint','businesses','businesses_slug_key','687397275d0e852fb2a4b50394adffee'),
 ('constraint','businesses','businesses_type_slug_fkey','ec942722226f529ad569e51a5f0fa435'),
 ('constraint','businesses','businesses_vanity_slug_format_chk','9078bbd0dfc8379d5675d4bb7b42538a'),
 ('index','admin_audit_log','admin_audit_log_pkey','29fda601e4c4b3790790c6b6b28f1b8a'),
 ('index','admin_audit_log','idx_admin_audit_action','df2a899dbb625567a5a1a61accf1c977'),
 ('index','admin_audit_log','idx_admin_audit_actor','a205989317c5597070e26d7706e4f563'),
 ('index','admin_audit_log','idx_admin_audit_created','6fb8a5147a2ca8e902903038f0b6149c'),
 ('index','admin_audit_log','idx_admin_audit_entity','ae60a7cd40a577f2e5d832f38724074e'),
 ('index','admin_audit_log','idx_admin_audit_target','a30e2c8f582d42f22558fa54188b28bb'),
 ('index','business_types','business_types_pkey','1561f7d1d35a90d7f98feaf47c4f0e61'),
 ('index','businesses','businesses_lat_lng_idx','3031ba3e2eabe2e40efc0a5050fc85f5'),
 ('index','businesses','businesses_network_exposure_status_idx','5476ac1d0e29dd7a3d2763e4b0a277d3'),
 ('index','businesses','businesses_pkey','2f94b1c1ec96859e0551bd5d6c0f1b08'),
 ('index','businesses','businesses_slug_key','cb3f88e8fc2dbd89c3da72dd0753bc55'),
 ('index','businesses','businesses_source_external_id_unique','cd1a82dfebaacfffc70a0686d9ceef2c'),
 ('index','businesses','businesses_vanity_slug_lower_uidx','99ca865f91cd0dc11ae3bb1b63365a71'),
 ('index','businesses','idx_businesses_city','a66fd93e16a1bbde2ce5be57cb335819'),
 ('index','businesses','idx_businesses_claim_state','64c85254afd8d9d070ff39e87a09492a'),
 ('index','businesses','idx_businesses_organization_id','73533000127ad553d849a993943716f6'),
 ('index','businesses','idx_businesses_owner','61b83c2fe3f6cdec1a13d8fd878dfc77'),
 ('index','businesses','idx_businesses_province','b9328e6651bf227b971e323437b5f6b0'),
 ('index','businesses','idx_businesses_region','e7fa8858735747d245ef097ab9900afc'),
 ('index','businesses','idx_businesses_status','207b0fdc5e8e80a39eb9bad47163abb5'),
 ('index','businesses','idx_businesses_tier_featured','8246463eab01415a7e19ce4834d69d0b'),
 ('index','businesses','idx_businesses_type','1cb388a84a7587736491031fca8bfb45'),
 ('index','businesses','uniq_business_custom_domain','d74743f21db3efbc7601a1492cc3a9a8'),
 ('policyUsing','admin_audit_log','Admins read admin audit','52601dff68335277823fcbfe28ec86d5'),
 ('policyCheck','admin_audit_log','Admins read admin audit',NULL),
 ('policyUsing','admin_audit_log','Admins write admin audit',NULL),
 ('policyCheck','admin_audit_log','Admins write admin audit','42f97d95c904a075a7bd26312db73461'),
 ('policyUsing','admin_audit_log','Support read admin audit','01bcb07f9a9ee3cbedc16fc50e7eb119'),
 ('policyCheck','admin_audit_log','Support read admin audit',NULL),
 ('policyUsing','business_types','Admins manage business types','52601dff68335277823fcbfe28ec86d5'),
 ('policyCheck','business_types','Admins manage business types','52601dff68335277823fcbfe28ec86d5'),
 ('policyUsing','business_types','Business types public read','b326b5062b2f0e69046810717534cb09'),
 ('policyCheck','business_types','Business types public read',NULL),
 ('policyUsing','businesses','Active businesses public read','dcd60eff20b467df6d2140c61dced723'),
 ('policyCheck','businesses','Active businesses public read',NULL),
 ('policyUsing','businesses','Business owners can read own businesses','dd01f9aa259e485c4c0bc023d3a0a965'),
 ('policyCheck','businesses','Business owners can read own businesses',NULL),
 ('policyUsing','businesses','Moderators manage businesses','fc10a64d29959c789918a9f3bce331e3'),
 ('policyCheck','businesses','Moderators manage businesses','fc10a64d29959c789918a9f3bce331e3'),
 ('policyUsing','businesses','Owners delete own businesses','dd01f9aa259e485c4c0bc023d3a0a965'),
 ('policyCheck','businesses','Owners delete own businesses',NULL),
 ('policyUsing','businesses','Owners insert businesses',NULL),
 ('policyCheck','businesses','Owners insert businesses','64f9350ee6d0aeb102a1dbbc8be84888'),
 ('policyUsing','businesses','Owners update own businesses','dd01f9aa259e485c4c0bc023d3a0a965'),
 ('policyCheck','businesses','Owners update own businesses','dd01f9aa259e485c4c0bc023d3a0a965'),
 ('policyUsing','businesses','Public can resolve verified custom domains','2a1d8b440c9ea6949fc7dc5912dc2646'),
 ('policyCheck','businesses','Public can resolve verified custom domains',NULL),
 ('trigger','businesses','business_team_thread_on_create','db389d1a96becdea574203f4323edc76'),
 ('trigger','businesses','businesses_recompute_intent','44234a98b0dbeb833a6033bf42ec26d5'),
 ('trigger','businesses','set_businesses_updated_at','a0f9d25d2c190f91aa068867c3fe31f0'),
 ('trigger','businesses','trg_block_internal_staff_business','de3397695e95fd79a098bb863a63ddd2'),
 ('trigger','businesses','trg_enforce_business_custom_domain','767dc3bc6ebf89c6ca9249e9dec56d80'),
 ('trigger','businesses','trg_guard_business_owner_update','16f225e2d5a34fd2871c762ff4d8773b'),
 ('trigger','businesses','trg_notify_business_approved','b0e9077178bcb78a490e56a8799b6b1d'),
 ('trigger','businesses','trg_notify_business_archive_change','207992e8b0439d3cacbb6291ba9c9355'),
 ('trigger','businesses','trg_notify_business_submitted','8eb9defcd63018d8ddb275dd0e49537e'),
 ('trigger','businesses','trg_pp_business_signup_bounty','dbe661b67d6a677ab0afc4cb8cee4a6b')
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
      WHERE literal[1] NOT IN ('public','[]','manual','inquiry','owned','unclaimed','claim_pending','youtube','vimeo','facebook','none','pending','approved','revoked','verified','^[a-z0-9]([a-z0-9-]{1,30})[a-z0-9]$','admin','user','sales','moderator','support','advertising','sales_junior','sales_senior','sales_manager','active','rejected','hidden','archived','free','listed','featured','premium')
    )
   ))) permitted
 FROM raw_pieces r LEFT JOIN expected_pieces e ON e.category=r.category AND e.table_name=r.table_name AND e.name=r.name
)
SELECT pg_catalog.jsonb_build_object(
 'projectRef','wjxaajgvddtrxxtocxen','mode','read-only-selected-structure-not-history',
 'observedAtUtc',pg_catalog.timezone('UTC',pg_catalog.statement_timestamp()),
 'serverVersion',pg_catalog.current_setting('server_version'),
 'scope','Full businesses, business_types and admin_audit_log structural metadata, selected/direct-expression function fingerprints and related enums. Structural definitions only behind preceding metadata hashes and privacy gates. No data rows, helper calls or function bodies.',
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
 'limits','Three selected tables only. No app/Auth/config rows or counts, helper calls/function bodies, arbitrary structural definitions, sequence or settings/config values, mutation, original-source/history adoption, approved baseline, complete bootstrap/actor/authority/offboarding or release acceptance. Expected hashes come from the preceding reviewed metadata-only capture; privacy independently gates raw pieces. Denials return NULL. Business writes/forward attachments remain a separate behavioral frontier. Effective MAINTAIN is not evaluated; raw ACL retained.'
) catalog;
ROLLBACK;
