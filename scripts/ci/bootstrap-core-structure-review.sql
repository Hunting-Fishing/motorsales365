-- READ-ONLY selected bootstrap core structure recovery, NOT historical source.
-- Four tables only; no app/Auth/config rows, counts, settings or sequence values.
-- Raw structural pieces stay NULL unless prior PR55 hash AND privacy guards match.
-- Function bodies are fingerprints only. No helper calls, seeds or backfills.
-- Separate privacy review required before retaining output.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='1000ms';
SET LOCAL search_path=pg_catalog,pg_temp;
WITH selected_relations AS (
 SELECT c.*,n.nspname FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN
 ('profiles','internal_org_settings','subscription_plans','subscriptions')
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
 ('accredit_staff_partner','assign_founding_member','assign_profile_member_number','attach_signup_referral','block_internal_staff_org','can_manage_org','can_moderate','can_support','canonical_365_admin_id','canonical_365_org_id','derive_signup_intent','grant_business_trial','grant_founding_bronze','handle_new_user','has_role','is_internal_365_email','is_internal_365_staff','is_org_member','is_sales_assigned_user','recompute_signup_intent','set_internal_staff_manager','tg_auth_user_staff_accredit','tg_auto_create_seller_org','tg_org_add_creator_as_owner','tg_set_updated_at','trg_profiles_recompute_intent','update_updated_at_column')) OR
  p.oid IN (SELECT tgfoid FROM selected_triggers) OR
  (n.nspname IN ('public','auth') AND p.oid IN (SELECT refobjid FROM expression_functions)))
), expected_pieces(category,table_name,name,hash) AS (
 VALUES
 ('column','internal_org_settings','key',NULL),
 ('column','internal_org_settings','org_id',NULL),
 ('column','internal_org_settings','updated_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','profiles','id',NULL),
 ('column','profiles','full_name',NULL),
 ('column','profiles','phone',NULL),
 ('column','profiles','seller_type','760a861afda3e7f257d0efcb3182d172'),
 ('column','profiles','avatar_url',NULL),
 ('column','profiles','business_name',NULL),
 ('column','profiles','business_logo_url',NULL),
 ('column','profiles','business_address',NULL),
 ('column','profiles','business_region',NULL),
 ('column','profiles','business_city',NULL),
 ('column','profiles','business_lat',NULL),
 ('column','profiles','business_lng',NULL),
 ('column','profiles','business_hours',NULL),
 ('column','profiles','created_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','profiles','updated_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','profiles','verification_status','770739f7c7688f9d248312b9251dfe14'),
 ('column','profiles','verified_at',NULL),
 ('column','profiles','business_kind',NULL),
 ('column','profiles','business_province',NULL),
 ('column','profiles','business_barangay',NULL),
 ('column','profiles','phone_e164',NULL),
 ('column','profiles','phone_verified_at',NULL),
 ('column','profiles','welcome_email_sent_at',NULL),
 ('column','profiles','account_status','d3f886740d8a127cb03273fe14f67393'),
 ('column','profiles','is_founding_member','68934a3e9455fa72420237eb05902327'),
 ('column','profiles','founding_member_number',NULL),
 ('column','profiles','signup_intent',NULL),
 ('column','profiles','signup_city',NULL),
 ('column','profiles','first_name',NULL),
 ('column','profiles','last_name',NULL),
 ('column','profiles','signup_region',NULL),
 ('column','profiles','signup_province',NULL),
 ('column','profiles','fb_profile_url',NULL),
 ('column','profiles','fb_profile_id',NULL),
 ('column','profiles','fb_verified_at',NULL),
 ('column','profiles','fb_verification_method',NULL),
 ('column','profiles','fb_verification_code',NULL),
 ('column','profiles','fb_verification_code_expires_at',NULL),
 ('column','profiles','street_address',NULL),
 ('column','profiles','postal_code',NULL),
 ('column','profiles','business_postal_code',NULL),
 ('column','profiles','display_currency',NULL),
 ('column','profiles','seller_rating_avg','cfcd208495d565ef66e7dff9f98764da'),
 ('column','profiles','seller_rating_count','cfcd208495d565ef66e7dff9f98764da'),
 ('column','profiles','reviews_updated_at',NULL),
 ('column','profiles','login_username',NULL),
 ('column','profiles','parent_org_id',NULL),
 ('column','profiles','is_staff_account','68934a3e9455fa72420237eb05902327'),
 ('column','profiles','member_number','bef45d2aa8376de3f75847a69101adf9'),
 ('column','profiles','tier_id','d1a6b664ca83e0a4a84c3cadb28d9614'),
 ('column','profiles','tier_recomputed_at',NULL),
 ('column','profiles','personal_email',NULL),
 ('column','profiles','signup_source',NULL),
 ('column','profiles','intent_evaluated_at',NULL),
 ('column','profiles','intent_evaluated_by',NULL),
 ('column','profiles','manager_user_id',NULL),
 ('column','profiles','referral_code',NULL),
 ('column','profiles','barangay',NULL),
 ('column','subscription_plans','id','f3b72bb359a50b640590970a2ab8e514'),
 ('column','subscription_plans','name',NULL),
 ('column','subscription_plans','listings_per_month',NULL),
 ('column','subscription_plans','price_php',NULL),
 ('column','subscription_plans','active','b326b5062b2f0e69046810717534cb09'),
 ('column','subscription_plans','sort_order','cfcd208495d565ef66e7dff9f98764da'),
 ('column','subscription_plans','features','8b4b2df56ad0773943ef9179742da01b'),
 ('column','subscription_plans','created_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','subscription_plans','max_photos_per_listing','e4da3b7fbbce2345d7772b0674a318d5'),
 ('column','subscription_plans','stripe_lookup_key',NULL),
 ('column','subscription_plans','max_seats',NULL),
 ('column','subscriptions','id','f3b72bb359a50b640590970a2ab8e514'),
 ('column','subscriptions','user_id',NULL),
 ('column','subscriptions','plan_id',NULL),
 ('column','subscriptions','status','3d0c12821e68f0fc31291c72ad568aa9'),
 ('column','subscriptions','current_period_end',NULL),
 ('column','subscriptions','created_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','subscriptions','complimentary','68934a3e9455fa72420237eb05902327'),
 ('column','subscriptions','discount_percent','cfcd208495d565ef66e7dff9f98764da'),
 ('column','subscriptions','paused_at',NULL),
 ('column','subscriptions','notes',NULL),
 ('column','subscriptions','updated_at','75230039beb12ce952f24927f2bfa2f2'),
 ('column','subscriptions','stripe_customer_id',NULL),
 ('column','subscriptions','stripe_subscription_id',NULL),
 ('column','subscriptions','stripe_price_id',NULL),
 ('column','subscriptions','environment','a79d5bf3e2ca495ae75f53c2e4f1ffe3'),
 ('column','subscriptions','cancel_at_period_end','68934a3e9455fa72420237eb05902327'),
 ('column','subscriptions','current_period_start',NULL),
 ('column','subscriptions','organization_id',NULL),
 ('constraint','internal_org_settings','internal_org_settings_org_id_fkey','dd1f7839b970ce8b115d179393ee1079'),
 ('constraint','internal_org_settings','internal_org_settings_pkey','729d3ed6c85722f863da384d2313331e'),
 ('constraint','profiles','profiles_founding_member_number_key','509e171138082c9c7b57f9d0adac1f64'),
 ('constraint','profiles','profiles_id_fkey','0061c9fb3a9abcf2edbcd4a42467a9c3'),
 ('constraint','profiles','profiles_intent_evaluated_by_fkey','15682e02afb07e18c1c0880775e49022'),
 ('constraint','profiles','profiles_login_username_key','43b45529c631b1de64c9f9aa35d93fb4'),
 ('constraint','profiles','profiles_manager_user_id_fkey','68e46c9fc986b125981537408948aa37'),
 ('constraint','profiles','profiles_parent_org_id_fkey','6e5810fc1930d0638a987b839b089682'),
 ('constraint','profiles','profiles_pkey','4c6419b3704337bbfe50f018842a9ad3'),
 ('constraint','profiles','profiles_signup_intent_check','f013f4be3844dc28f959fb17dddcabe0'),
 ('constraint','profiles','profiles_signup_source_check','784a0c4a6b14c840bbb3d555697d9ece'),
 ('constraint','profiles','profiles_tier_id_fkey','bc9ee1ae842a0e76db9bcbb591bb5eca'),
 ('constraint','subscription_plans','subscription_plans_pkey','4c6419b3704337bbfe50f018842a9ad3'),
 ('constraint','subscriptions','subscriptions_organization_id_fkey','dfae532b0de8c0f4bb512c9b30235ed9'),
 ('constraint','subscriptions','subscriptions_pkey','4c6419b3704337bbfe50f018842a9ad3'),
 ('constraint','subscriptions','subscriptions_plan_id_fkey','a7168e4f71e06fbb429b2d9b5337f322'),
 ('constraint','subscriptions','subscriptions_user_id_fkey','85d8b2f5f0c0f6b4dcb854efb61a8cb1'),
 ('index','internal_org_settings','internal_org_settings_pkey','b3f84146ecd3d6ca531c51b8d2e62da5'),
 ('index','profiles','idx_profiles_manager_user_id','dedb6f75f814ed79c3dfefd357ee2290'),
 ('index','profiles','idx_profiles_parent_org','7db7dfe0ad24231cbc9f5e87358c7147'),
 ('index','profiles','profiles_fb_profile_id_key','b1c7f3eb13c9ba1433ac00f687f7ae54'),
 ('index','profiles','profiles_founding_member_number_key','bf5e1db0b57833adbe3a1e4db7691fdc'),
 ('index','profiles','profiles_login_username_key','d291816a998e0d0f09535cc2a1e3023b'),
 ('index','profiles','profiles_member_number_key','71098116a35b000ae503d839f0dd6579'),
 ('index','profiles','profiles_personal_email_idx','49c85efcfa638dc30b9c816c07dac5d2'),
 ('index','profiles','profiles_pkey','b7142bbffc23de763c1bd9f00489ec05'),
 ('index','profiles','profiles_tier_idx','bd7db2ed81197b1eb6fdbd0eda9ff526'),
 ('index','subscription_plans','subscription_plans_pkey','92ff01d051bbffe25befece0b62a6f82'),
 ('index','subscription_plans','subscription_plans_stripe_lookup_key_uidx','01ee6f57c5409a6885901c24a42e3d67'),
 ('index','subscriptions','idx_subscriptions_organization_id','bc500f4e13665d6fe9374423542d69dc'),
 ('index','subscriptions','subscriptions_pkey','48072941fe7cc327a956204d2eefbd7d'),
 ('index','subscriptions','subscriptions_stripe_customer_id_idx','0505f1cfe29f233b377c43717afa5b70'),
 ('index','subscriptions','subscriptions_stripe_subscription_id_idx','2efd65a8f4c716931db5e7e50da8a5d3'),
 ('policyUsing','internal_org_settings','No direct client access','68934a3e9455fa72420237eb05902327'),
 ('policyCheck','internal_org_settings','No direct client access',NULL),
 ('policyUsing','profiles','Admins can manage all profiles','52601dff68335277823fcbfe28ec86d5'),
 ('policyCheck','profiles','Admins can manage all profiles',NULL),
 ('policyUsing','profiles','Sales view assigned profiles','8baad7fa8f2fce1d876d922c1fed12e0'),
 ('policyCheck','profiles','Sales view assigned profiles',NULL),
 ('policyUsing','profiles','Support read profiles','01bcb07f9a9ee3cbedc16fc50e7eb119'),
 ('policyCheck','profiles','Support read profiles',NULL),
 ('policyUsing','profiles','Users can insert own profile',NULL),
 ('policyCheck','profiles','Users can insert own profile','2d312ca7802e180e20000853982d7043'),
 ('policyUsing','profiles','Users can update own profile','bc9c729a84690340789a4e4f01175335'),
 ('policyCheck','profiles','Users can update own profile','e94a6ed10db59f3f13609187a30ab2bb'),
 ('policyUsing','profiles','Users can view own profile','bc9c729a84690340789a4e4f01175335'),
 ('policyCheck','profiles','Users can view own profile',NULL),
 ('policyUsing','subscription_plans','Admins manage plans','52601dff68335277823fcbfe28ec86d5'),
 ('policyCheck','subscription_plans','Admins manage plans',NULL),
 ('policyUsing','subscription_plans','Plans public read','1e119b8c77b9492bca35370f81f4f1dd'),
 ('policyCheck','subscription_plans','Plans public read',NULL),
 ('policyUsing','subscription_plans','Sales view subscription_plans','72e0ff16177cc0b3c99e202442e53471'),
 ('policyCheck','subscription_plans','Sales view subscription_plans',NULL),
 ('policyUsing','subscriptions','Admins manage subscriptions','52601dff68335277823fcbfe28ec86d5'),
 ('policyCheck','subscriptions','Admins manage subscriptions',NULL),
 ('policyUsing','subscriptions','Sales insert assigned subscriptions',NULL),
 ('policyCheck','subscriptions','Sales insert assigned subscriptions','31d468492553825c582b0c69647b5a45'),
 ('policyUsing','subscriptions','Sales update assigned subscriptions','31d468492553825c582b0c69647b5a45'),
 ('policyCheck','subscriptions','Sales update assigned subscriptions','31d468492553825c582b0c69647b5a45'),
 ('policyUsing','subscriptions','Sales view assigned subscriptions','31d468492553825c582b0c69647b5a45'),
 ('policyCheck','subscriptions','Sales view assigned subscriptions',NULL),
 ('policyUsing','subscriptions','Users insert own subscription',NULL),
 ('policyCheck','subscriptions','Users insert own subscription','35d8ce44b25e6a7a8eb20533941f8013'),
 ('policyUsing','subscriptions','Users see own subscription','446c0428749737e24493d26321c2c66e'),
 ('policyCheck','subscriptions','Users see own subscription',NULL),
 ('trigger','profiles','auto_create_seller_org','c91e3988ddde30328d8f05bc337cac48'),
 ('trigger','profiles','profiles_recompute_intent','38ddee8100c63d67a0b80d5ddbce5795'),
 ('trigger','profiles','set_profiles_updated','b4cdacabcae623e992b85e940d03330c'),
 ('trigger','profiles','tg_assign_founding_member','d6612fafb2701a3ffd98d1c3cc405dc4'),
 ('trigger','profiles','tg_grant_founding_bronze','b34146f689edf3895e54d16228f93850'),
 ('trigger','profiles','trg_assign_profile_member_number','b34a60274f274e91beb925fc56941c60'),
 ('trigger','profiles','trg_attach_signup_referral','e88ccec69a08694dbc230191ae499166'),
 ('trigger','profiles','trg_grant_business_trial','7eabe27a1028df2dfc7c8e9087ab479e'),
 ('trigger','profiles','trg_set_internal_staff_manager','3fcc714421fff262722b531c0b7fd414'),
 ('trigger','subscriptions','set_subscriptions_updated_at','673164c4e190e74385d8549a79e7855b')
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
      WHERE literal[1] NOT IN ('public','public.profiles_member_number_seq','common','[]','{}','direct','qr','link','buyer','private_seller','business','service_provider','internal_staff','PHP','live','test','sandbox','active','cancelled','expired','pending','trial','paused','banned','admin','user','sales','moderator','support','advertising','sales_junior','sales_senior','sales_manager','repair_shop','insurance','dealership','other','parts_accessories','towing','body_paint','carwash','salvage','rental','financing','trucking','tire_shop','battery_shop','fuel_station','accessories','audio_tint','inspection','driving_school','lto_services','transport','motorcycle_shop','used_dealership','owner','manager','member','viewer','private','staff','unverified','verified','rejected')
    )
   ))) permitted
 FROM raw_pieces r LEFT JOIN expected_pieces e ON e.category=r.category AND e.table_name=r.table_name AND e.name=r.name
)
SELECT pg_catalog.jsonb_build_object(
 'projectRef','wjxaajgvddtrxxtocxen','mode','read-only-selected-structure-not-history',
 'observedAtUtc',pg_catalog.timezone('UTC',pg_catalog.statement_timestamp()),
 'serverVersion',pg_catalog.current_setting('server_version'),
 'scope','Four public bootstrap core relations with complete structural metadata and selected dependency fingerprints. Default/constraint/index/policy/trigger text only behind prior expected-hash/privacy gates. No data rows, function bodies or sequence values.',
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
 'limits','Four selected tables only. No app/Auth/config rows or counts, helper calls/function bodies, arbitrary structural definitions, sequence or settings/config values, mutation, original-source/history adoption, approved baseline, complete bootstrap/actor/authority/offboarding or release acceptance. Raw pieces require prior PR55 hashes plus privacy checks. Denials return NULL. Effective MAINTAIN is not evaluated; raw ACL retained.'
) catalog;
ROLLBACK;
