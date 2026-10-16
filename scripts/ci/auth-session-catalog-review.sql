-- Fixed pg_catalog-only prerequisite; ONE SELECT, no helper/application execution.
-- No Auth/session/user rows or row counts, credentials, settings values, raw
-- definitions/expressions/configuration/trigger arguments are returned.
-- SHA256 is built into PostgreSQL17: functions-binarystring.html Table9.12.
-- Missing objects and metadata bounds are explicit failures, never full parity.
WITH
fixed_roles(name) AS (
  VALUES ('anon'),('authenticated'),('service_role'),('supabase_auth_admin')
),
roles AS MATERIALIZED (
  SELECT f.name,r.oid,r.rolsuper,r.rolinherit,r.rolcanlogin,r.rolbypassrls
  FROM fixed_roles f LEFT JOIN pg_catalog.pg_roles r ON r.rolname=f.name
),
caps AS (
  SELECT 96 AS columns,64 AS constraints,64 AS indexes,32 AS policies,
    256 AS triggers,32 AS functions,65536 AS expression_bytes,
    65536 AS definition_bytes,8192 AS acl_bytes,8192 AS config_bytes,
    4096 AS trigger_argument_bytes,32 AS config_keys,32 AS policy_roles,8192 AS policy_role_bytes
),
auth_schema AS MATERIALIZED (
  SELECT n.oid,n.nspname,n.nspowner,n.nspacl
  FROM pg_catalog.pg_namespace n WHERE n.nspname='auth'
),
relations AS MATERIALIZED (
  SELECT c.*,n.nspname,n.oid AS schema_oid
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='auth' AND c.relname IN ('sessions','users') AND c.relkind IN ('r','p')
),
columns_raw AS MATERIALIZED (
  SELECT r.oid AS relation_oid,r.relname,a.attnum,a.attname,a.atttypid,a.atttypmod,
    a.attnotnull,a.attidentity,a.attgenerated,a.attacl,
    pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS expression
  FROM relations r JOIN pg_catalog.pg_attribute a ON a.attrelid=r.oid
  LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=r.oid AND d.adnum=a.attnum
  WHERE a.attnum>0 AND NOT a.attisdropped
    AND (r.relname='sessions' OR a.attname IN ('id','is_anonymous','deleted_at'))
),
constraints_raw AS MATERIALIZED (
  SELECT k.*,r.relname,pg_catalog.pg_get_constraintdef(k.oid) AS expression,
    CASE WHEN k.confrelid=0 THEN NULL ELSE rn.nspname||'.'||rc.relname END AS referenced_relation
  FROM pg_catalog.pg_constraint k JOIN relations r ON r.oid=k.conrelid
  LEFT JOIN pg_catalog.pg_class rc ON rc.oid=k.confrelid
  LEFT JOIN pg_catalog.pg_namespace rn ON rn.oid=rc.relnamespace
  WHERE r.relname='sessions'
),
indexes_raw AS MATERIALIZED (
  SELECT i.*,r.relname,ic.relname AS index_name,
    pg_catalog.pg_get_indexdef(i.indexrelid) AS expression
  FROM pg_catalog.pg_index i JOIN relations r ON r.oid=i.indrelid
  JOIN pg_catalog.pg_class ic ON ic.oid=i.indexrelid
  WHERE r.relname='sessions'
),
policies_raw AS MATERIALIZED (
  SELECT p.*,r.relname,pg_catalog.pg_get_expr(p.polqual,p.polrelid) AS using_expression,
    pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid) AS check_expression
  FROM pg_catalog.pg_policy p JOIN relations r ON r.oid=p.polrelid WHERE r.relname='sessions'
),
triggers_raw AS MATERIALIZED (
  SELECT t.*,r.relname,pg_catalog.pg_get_triggerdef(t.oid) AS expression
  FROM pg_catalog.pg_trigger t JOIN relations r ON r.oid=t.tgrelid
  WHERE r.relname='sessions' OR (r.relname='users' AND
    ((t.tgtype::integer & 8)<>0 OR EXISTS (
      SELECT 1 FROM constraints_raw k WHERE k.contype='f' AND k.confrelid=r.oid AND k.oid=t.tgconstraint)))
),
functions_raw AS MATERIALIZED (
  SELECT p.*,n.nspname,l.lanname,
    (n.nspname='auth' AND p.proname IN ('uid','jwt') AND p.pronargs=0) AS requested,
    pg_catalog.pg_get_functiondef(p.oid) AS definition
  FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  JOIN pg_catalog.pg_language l ON l.oid=p.prolang
  WHERE p.prokind='f' AND ((n.nspname='auth' AND p.proname IN ('uid','jwt') AND p.pronargs=0)
    OR p.oid IN (SELECT t.tgfoid FROM triggers_raw t))
),
observed AS (
  SELECT
    (SELECT pg_catalog.count(*) FROM auth_schema) AS schemas,
    (SELECT pg_catalog.count(*) FROM relations) AS relations,
    (SELECT pg_catalog.count(*) FROM roles WHERE oid IS NOT NULL) AS roles,
    (SELECT pg_catalog.count(*) FROM columns_raw) AS columns,
    (SELECT pg_catalog.count(*) FROM constraints_raw) AS constraints,
    (SELECT pg_catalog.count(*) FROM indexes_raw) AS indexes,
    (SELECT pg_catalog.count(*) FROM policies_raw) AS policies,
    (SELECT pg_catalog.count(*) FROM triggers_raw) AS triggers,
    (SELECT pg_catalog.count(*) FROM functions_raw) AS functions,
    (SELECT pg_catalog.count(*) FROM functions_raw WHERE requested) AS requested_functions,
    (SELECT pg_catalog.count(*) FROM columns_raw WHERE relname='sessions'
      AND attname IN ('id','user_id','not_after')) AS required_session_columns,
    (SELECT pg_catalog.count(*) FROM columns_raw WHERE relname='users') AS required_user_columns,
    EXISTS(SELECT 1 FROM columns_raw,caps WHERE pg_catalog.octet_length(expression)>caps.expression_bytes
      OR pg_catalog.octet_length(attacl::text)>caps.acl_bytes) AS column_bytes_exceeded,
    EXISTS(SELECT 1 FROM constraints_raw,caps WHERE pg_catalog.octet_length(expression)>caps.expression_bytes) AS constraint_bytes_exceeded,
    EXISTS(SELECT 1 FROM indexes_raw,caps WHERE pg_catalog.octet_length(expression)>caps.expression_bytes) AS index_bytes_exceeded,
    EXISTS(SELECT 1 FROM policies_raw,caps WHERE pg_catalog.octet_length(using_expression)>caps.expression_bytes
      OR pg_catalog.octet_length(check_expression)>caps.expression_bytes
      OR pg_catalog.octet_length(polroles::text)>caps.policy_role_bytes) AS policy_bytes_exceeded,
    EXISTS(SELECT 1 FROM policies_raw,caps WHERE pg_catalog.cardinality(polroles)>caps.policy_roles) AS policy_roles_exceeded,
    EXISTS(SELECT 1 FROM triggers_raw,caps WHERE pg_catalog.octet_length(expression)>caps.expression_bytes
      OR pg_catalog.octet_length(tgargs)>caps.trigger_argument_bytes) AS trigger_bytes_exceeded,
    EXISTS(SELECT 1 FROM functions_raw,caps WHERE pg_catalog.octet_length(definition)>caps.definition_bytes
      OR pg_catalog.octet_length(proacl::text)>caps.acl_bytes OR pg_catalog.octet_length(proconfig::text)>caps.config_bytes
      OR COALESCE(pg_catalog.cardinality(proconfig),0)>caps.config_keys) AS function_bytes_exceeded,
    EXISTS(SELECT 1 FROM relations,caps WHERE pg_catalog.octet_length(relacl::text)>caps.acl_bytes) AS relation_acl_bytes_exceeded,
    EXISTS(SELECT 1 FROM auth_schema,caps WHERE pg_catalog.octet_length(nspacl::text)>caps.acl_bytes) AS schema_acl_bytes_exceeded
),
checks AS (
  SELECT o.*,
    (o.columns>c.columns OR o.constraints>c.constraints OR o.indexes>c.indexes OR o.policies>c.policies
      OR o.triggers>c.triggers OR o.functions>c.functions OR o.column_bytes_exceeded
      OR o.constraint_bytes_exceeded OR o.index_bytes_exceeded OR o.policy_bytes_exceeded OR o.policy_roles_exceeded
      OR o.trigger_bytes_exceeded OR o.function_bytes_exceeded OR o.relation_acl_bytes_exceeded
      OR o.schema_acl_bytes_exceeded) AS truncated,
    pg_catalog.array_remove(ARRAY[
      CASE WHEN o.schemas<>1 THEN 'missing-auth-schema' END,
      CASE WHEN o.relations<>2 THEN 'missing-selected-auth-relation' END,
      CASE WHEN o.roles<>4 THEN 'missing-fixed-role' END,
      CASE WHEN o.requested_functions<>2 THEN 'missing-auth-uid-or-jwt-function' END,
      CASE WHEN o.required_session_columns<>3 THEN 'missing-required-session-column' END,
      CASE WHEN o.required_user_columns<>3 THEN 'missing-selected-user-column' END,
      CASE WHEN EXISTS(SELECT 1 FROM relations WHERE relkind<>'r') THEN 'partitioned-relation-unreviewed' END,
      CASE WHEN o.columns>c.columns THEN 'column-cap-exceeded' END,
      CASE WHEN o.constraints>c.constraints THEN 'constraint-cap-exceeded' END,
      CASE WHEN o.indexes>c.indexes THEN 'index-cap-exceeded' END,
      CASE WHEN o.policies>c.policies THEN 'policy-cap-exceeded' END,
      CASE WHEN o.policy_roles_exceeded THEN 'policy-role-cap-exceeded' END,
      CASE WHEN o.triggers>c.triggers THEN 'trigger-cap-exceeded' END,
      CASE WHEN o.functions>c.functions THEN 'function-cap-exceeded' END,
      CASE WHEN o.column_bytes_exceeded OR o.constraint_bytes_exceeded OR o.index_bytes_exceeded
        OR o.policy_bytes_exceeded OR o.trigger_bytes_exceeded OR o.function_bytes_exceeded
        OR o.relation_acl_bytes_exceeded OR o.schema_acl_bytes_exceeded THEN 'metadata-byte-cap-exceeded' END
    ]::text[],NULL) AS failures
  FROM observed o CROSS JOIN caps c
)
SELECT pg_catalog.jsonb_build_object(
  'projectRef','wjxaajgvddtrxxtocxen',
  'mode','read-only-auth-session-catalog-fingerprints-v1',
  'observedAtUtc',pg_catalog.timezone('UTC',pg_catalog.statement_timestamp()),
  'serverVersionNum',pg_catalog.current_setting('server_version_num'),
  'scope',pg_catalog.jsonb_build_object(
    'relations',ARRAY['auth.sessions','auth.users'],
    'usersColumns',ARRAY['id','is_anonymous','deleted_at'],
    'roles',ARRAY['anon','authenticated','service_role','supabase_auth_admin'],
    'requestedFunctions',ARRAY['auth.uid()','auth.jwt()'],
    'attachedFunctions','fingerprints only for selected trigger function OIDs in any schema; no execution',
    'triggers','all sessions attachments plus users DELETE and inbound sessions-FK attachments',
    'source','pg_catalog only; no Auth/application rows or row counts'),
  'complete',pg_catalog.cardinality(ch.failures)=0 AND NOT ch.truncated,
  'truncated',ch.truncated,'failures',pg_catalog.to_jsonb(ch.failures),
  'caps',(SELECT pg_catalog.to_jsonb(c) FROM caps c),
  'observedCatalogCounts',(SELECT pg_catalog.to_jsonb(o) FROM observed o),
  'schema',COALESCE((SELECT pg_catalog.jsonb_build_object(
    'name',n.nspname,'owner',CASE WHEN pg_catalog.pg_get_userbyid(n.nspowner) IN
      ('postgres','supabase_auth_admin','dashboard_user','anon','authenticated','service_role')
      THEN pg_catalog.pg_get_userbyid(n.nspowner) ELSE 'unclassified-role' END,
    'ownerSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_userbyid(n.nspowner),'UTF8')),'hex'),
    'aclIsNull',n.nspacl IS NULL,'aclSha256',CASE WHEN NOT ch.schema_acl_bytes_exceeded THEN
      pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(n.nspacl::text,'UTF8')),'hex') END)
    FROM auth_schema n),'null'::jsonb),
  'roles',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name',r.name,'exists',r.oid IS NOT NULL,'superuser',r.rolsuper,'inherit',r.rolinherit,
    'login',r.rolcanlogin,'bypassRls',r.rolbypassrls) ORDER BY r.name) FROM roles r),
  'relations',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name','auth.'||r.relname,'kind',r.relkind,'owner',CASE WHEN pg_catalog.pg_get_userbyid(r.relowner) IN
      ('postgres','supabase_auth_admin','dashboard_user','anon','authenticated','service_role')
      THEN pg_catalog.pg_get_userbyid(r.relowner) ELSE 'unclassified-role' END,
    'ownerSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_userbyid(r.relowner),'UTF8')),'hex'),
    'rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,'aclIsNull',r.relacl IS NULL,
    'aclSha256',CASE WHEN NOT ch.relation_acl_bytes_exceeded THEN pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(r.relacl::text,'UTF8')),'hex') END,
    'privileges',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('role',p.name,
      'schemaUsage',CASE WHEN p.oid IS NOT NULL THEN pg_catalog.has_schema_privilege(p.oid,r.schema_oid,'USAGE') END,
      'select',CASE WHEN p.oid IS NOT NULL THEN pg_catalog.has_table_privilege(p.oid,r.oid,'SELECT') END,
      'update',CASE WHEN p.oid IS NOT NULL THEN pg_catalog.has_table_privilege(p.oid,r.oid,'UPDATE') END) ORDER BY p.name) FROM roles p)
    ) ORDER BY r.relname) FROM relations r),'[]'::jsonb),
  'columns',CASE WHEN (SELECT columns FROM observed)>(SELECT columns FROM caps) OR ch.column_bytes_exceeded THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'relation','auth.'||a.relname,'position',a.attnum,'name',a.attname,
      'type',pg_catalog.format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,
      'identity',a.attidentity,'generated',a.attgenerated,'hasDefault',a.expression IS NOT NULL,
      'defaultSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(a.expression,'UTF8')),'hex'),
      'aclIsNull',a.attacl IS NULL,'aclSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(a.attacl::text,'UTF8')),'hex'),
      'privileges',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('role',p.name,
        'select',CASE WHEN p.oid IS NOT NULL THEN pg_catalog.has_column_privilege(p.oid,a.relation_oid,a.attnum,'SELECT') END,
        'update',CASE WHEN p.oid IS NOT NULL THEN pg_catalog.has_column_privilege(p.oid,a.relation_oid,a.attnum,'UPDATE') END) ORDER BY p.name) FROM roles p)
      ) ORDER BY a.relname,a.attnum) FROM columns_raw a),'[]'::jsonb) END,
  'constraints',CASE WHEN (SELECT constraints FROM observed)>(SELECT constraints FROM caps) OR ch.constraint_bytes_exceeded THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'relation','auth.'||k.relname,'name',k.conname,'type',k.contype,'validated',k.convalidated,
      'deferrable',k.condeferrable,'initiallyDeferred',k.condeferred,'referencedRelation',k.referenced_relation,
      'updateAction',k.confupdtype,'deleteAction',k.confdeltype,'matchType',k.confmatchtype,
      'columns',COALESCE((SELECT pg_catalog.jsonb_agg(a.attname ORDER BY x.position)
        FROM pg_catalog.unnest(k.conkey) WITH ORDINALITY x(number,position)
        JOIN pg_catalog.pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=x.number),'[]'::jsonb),
      'referencedColumns',COALESCE((SELECT pg_catalog.jsonb_agg(a.attname ORDER BY x.position)
        FROM pg_catalog.unnest(k.confkey) WITH ORDINALITY x(number,position)
        JOIN pg_catalog.pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=x.number),'[]'::jsonb),
      'definitionSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(k.expression,'UTF8')),'hex')
      ) ORDER BY k.conname) FROM constraints_raw k),'[]'::jsonb) END,
  'indexes',CASE WHEN (SELECT indexes FROM observed)>(SELECT indexes FROM caps) OR ch.index_bytes_exceeded THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'relation','auth.'||i.relname,'name',i.index_name,'unique',i.indisunique,'primary',i.indisprimary,
      'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive,'keyCount',i.indnkeyatts,
      'columns',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'name',a.attname,'expression',x.number=0,'key',x.position<=i.indnkeyatts) ORDER BY x.position)
        FROM pg_catalog.unnest(i.indkey::smallint[]) WITH ORDINALITY x(number,position)
        LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=x.number),'[]'::jsonb),
      'definitionSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(i.expression,'UTF8')),'hex')
      ) ORDER BY i.index_name) FROM indexes_raw i),'[]'::jsonb) END,
  'policies',CASE WHEN (SELECT policies FROM observed)>(SELECT policies FROM caps) OR ch.policy_bytes_exceeded OR ch.policy_roles_exceeded THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'relation','auth.'||p.relname,'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
      'roles',COALESCE((SELECT pg_catalog.jsonb_agg(CASE WHEN x.role_oid=0 THEN 'PUBLIC'
        WHEN r.rolname IN ('anon','authenticated','service_role','supabase_auth_admin','postgres','dashboard_user')
          THEN r.rolname ELSE 'unclassified-role' END ORDER BY x.position)
        FROM pg_catalog.unnest(p.polroles) WITH ORDINALITY x(role_oid,position)
        LEFT JOIN pg_catalog.pg_roles r ON r.oid=x.role_oid),'[]'::jsonb),
      'rolesSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.polroles::text,'UTF8')),'hex'),
      'usingSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.using_expression,'UTF8')),'hex'),
      'checkSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.check_expression,'UTF8')),'hex')
      ) ORDER BY p.polname) FROM policies_raw p),'[]'::jsonb) END,
  'triggers',CASE WHEN (SELECT triggers FROM observed)>(SELECT triggers FROM caps) OR ch.trigger_bytes_exceeded THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'relation','auth.'||t.relname,'name',t.tgname,'enabled',t.tgenabled,'internal',t.tgisinternal,
      'typeBits',t.tgtype,'constraintName',k.conname,'function',n.nspname||'.'||p.proname,
      'argumentBytes',pg_catalog.octet_length(t.tgargs),
      'argumentsSha256',pg_catalog.encode(pg_catalog.sha256(t.tgargs),'hex'),
      'definitionSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(t.expression,'UTF8')),'hex')
      ) ORDER BY t.relname,t.tgname) FROM triggers_raw t
      JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      LEFT JOIN pg_catalog.pg_constraint k ON k.oid=t.tgconstraint),'[]'::jsonb) END,
  'functions',CASE WHEN (SELECT functions FROM observed)>(SELECT functions FROM caps) OR ch.function_bytes_exceeded THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'signature',p.nspname||'.'||p.proname||'('||pg_catalog.pg_get_function_identity_arguments(p.oid)||')',
      'requested',p.requested,'owner',CASE WHEN pg_catalog.pg_get_userbyid(p.proowner) IN
        ('postgres','supabase_auth_admin','dashboard_user','anon','authenticated','service_role')
        THEN pg_catalog.pg_get_userbyid(p.proowner) ELSE 'unclassified-role' END,
      'ownerSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_userbyid(p.proowner),'UTF8')),'hex'),
      'language',p.lanname,'kind',p.prokind,'securityDefiner',p.prosecdef,'volatility',p.provolatile,
      'strict',p.proisstrict,'returnsSet',p.proretset,'resultType',pg_catalog.format_type(p.prorettype,NULL),
      'aclIsNull',p.proacl IS NULL,'aclSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.proacl::text,'UTF8')),'hex'),
      'configKeys',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.split_part(v.setting,'=',1) ORDER BY pg_catalog.split_part(v.setting,'=',1))
        FROM pg_catalog.unnest(p.proconfig) v(setting)),'[]'::jsonb),
      'configSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.proconfig::text,'UTF8')),'hex'),
      'definitionBytes',pg_catalog.octet_length(p.definition),
      'definitionSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.definition,'UTF8')),'hex'),
      'bodySha256Lf',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.replace(p.prosrc,pg_catalog.chr(13)||pg_catalog.chr(10),pg_catalog.chr(10)),'UTF8')),'hex'),
      'execute',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('role',r.name,
        'allowed',CASE WHEN r.oid IS NOT NULL THEN pg_catalog.has_function_privilege(r.oid,p.oid,'EXECUTE') END) ORDER BY r.name) FROM roles r)
      ) ORDER BY p.nspname,p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid)) FROM functions_raw p),'[]'::jsonb) END,
  'limits',ARRAY[
    'Catalog fingerprints only; no managed Auth migration lineage, raw source recovery or complete baseline adoption.',
    'No Auth/user/session rows, identifiers, row counts, credentials, configuration values or helper execution.',
    'Effective privileges are dated metadata, not permission to grant access or a strict-session/native-role authorization path.',
    'No logout, termination, timebox/inactivity, JWT/API behavior, lock-order/all-writer concurrency, financial, recovery or release acceptance.'
  ]
) AS catalog
FROM checks ch;
