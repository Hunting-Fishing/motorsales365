-- Approval-scoped, metadata-only pre/postflight SELECT for two legacy helper
-- EXECUTE restrictions. Invoice conversion is a previously restricted control;
-- quote conversion is an unchanged residual-risk control, NOT an approved change.
-- Exactly four routine identities and three migration-history names are selected.
-- No application rows/counts, application-function calls, raw bodies/configuration
-- values/default expressions/stored migration SQL, DDL, writes or history repairs.
-- Definition/body/header/config/default fingerprints are hashes, not secrecy,
-- authenticity, migration adoption, caller authorization or release acceptance.
-- Body LF MD5 removes CR as retained helper fingerprints do. Full definition MD5
-- uses pg_get_functiondef output; selected header MD5 includes catalog OIDs and is
-- not a portable cross-database signature.
-- History hashes normalize CRLF to LF ONLY; no trimming/comment removal. Combined
-- source hashes join statement-array elements with LF, as retained invoice evidence
-- does; inspect array cardinality and ordered element metadata before comparing.
-- Missing helpers/roles or unexpected history cardinality require manual review;
-- do not widen this query or infer an absent name from a different timestamp.
-- Execution-context fields are fixed nonsensitive settings for THIS connection.
-- They do not establish the separate migration-tool connection's execution context.
-- Execute only in a reviewed read-only transaction with external bounded statement
-- and lock timeouts/trusted search_path; this SELECT does not configure/enforce them.
-- Effective ACL observations do not close inherited/SET ROLE/SECURITY DEFINER paths,
-- schema/API exposure, dependency/writer closure, application behavior or recovery.
WITH requested_helpers(position, requested_signature) AS (
  VALUES
    (1, 'shop_manager.ensure_profile_for(pg_catalog.uuid)'::pg_catalog.text),
    (2, 'shop_manager.calculate_work_order_totals(pg_catalog.uuid)'::pg_catalog.text),
    (3, 'shop_manager.convert_work_order_to_invoice(pg_catalog.uuid)'::pg_catalog.text),
    (4, 'shop_manager.convert_quote_to_work_order(pg_catalog.uuid)'::pg_catalog.text)
), requested_roles(position, role_name) AS (
  VALUES
    (1, 'anon'::pg_catalog.text),
    (2, 'authenticated'::pg_catalog.text),
    (3, 'postgres'::pg_catalog.text),
    (4, 'service_role'::pg_catalog.text)
), selected_roles AS (
  SELECT r.position,r.role_name,p.oid AS role_oid
  FROM requested_roles AS r
  LEFT JOIN pg_catalog.pg_roles AS p ON p.rolname=r.role_name
), requested_history(position, migration_name) AS (
  VALUES
    (1, 'contain_legacy_profile_bootstrap_execute'::pg_catalog.text),
    (2, 'contain_legacy_work_order_totals_execute'::pg_catalog.text),
    (3, 'contain_legacy_invoice_conversion_execute'::pg_catalog.text)
), selected_history AS (
  SELECT m.version,m.name,m.statements
  FROM supabase_migrations.schema_migrations AS m
  WHERE m.name IN (SELECT h.migration_name FROM requested_history AS h)
)
SELECT 'wjxaajgvddtrxxtocxen'::pg_catalog.text AS project_ref,
  pg_catalog.clock_timestamp() AT TIME ZONE 'UTC' AS observed_at_utc,
  pg_catalog.jsonb_build_object(
    'current_user',CURRENT_USER,'session_user',SESSION_USER,
    'database',pg_catalog.current_database(),
    'server_version',pg_catalog.current_setting('server_version'),
    'server_version_num',pg_catalog.current_setting('server_version_num'),
    'transaction_read_only',pg_catalog.current_setting('transaction_read_only'),
    'statement_timeout',pg_catalog.current_setting('statement_timeout'),
    'lock_timeout',pg_catalog.current_setting('lock_timeout'),
    'search_path',pg_catalog.current_setting('search_path'),
    'effective_search_schemas',pg_catalog.current_schemas(true),
    'temp_schema_oid',pg_catalog.pg_my_temp_schema(),
    'temp_schema_name',(SELECT n.nspname FROM pg_catalog.pg_namespace AS n
      WHERE n.oid=pg_catalog.pg_my_temp_schema())
  ) AS execution_context,
  (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'role',r.role_name,'found',r.role_oid IS NOT NULL
  ) ORDER BY r.position) FROM selected_roles AS r) AS roles,
  (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'requested_signature',h.requested_signature,'found',p.oid IS NOT NULL,
    'schema',n.nspname,'name',p.proname,
    'signature',p.oid::pg_catalog.regprocedure::pg_catalog.text,
    'kind',p.prokind,
    'identity_arguments',pg_catalog.pg_get_function_identity_arguments(p.oid),
    'argument_names',p.proargnames,'argument_modes',p.proargmodes,
    'argument_count',p.pronargs,'argument_defaults_count',p.pronargdefaults,
    'argument_types',CASE WHEN p.oid IS NULL THEN NULL ELSE ARRAY(
      SELECT pg_catalog.format_type(a.type_oid,NULL::pg_catalog.int4)
      FROM pg_catalog.unnest(p.proargtypes::pg_catalog.oid[]) WITH ORDINALITY AS a(type_oid,position)
      ORDER BY a.position) END,
    'all_argument_types',CASE WHEN p.proallargtypes IS NULL THEN NULL ELSE ARRAY(
      SELECT pg_catalog.format_type(a.type_oid,NULL::pg_catalog.int4)
      FROM pg_catalog.unnest(p.proallargtypes) WITH ORDINALITY AS a(type_oid,position)
      ORDER BY a.position) END,
    'argument_defaults_md5',pg_catalog.md5(pg_catalog.pg_get_expr(p.proargdefaults,0)),
    'variadic_type',CASE WHEN p.provariadic=0 THEN NULL
      ELSE pg_catalog.format_type(p.provariadic,NULL::pg_catalog.int4) END,
    'return_type',pg_catalog.format_type(p.prorettype,NULL::pg_catalog.int4),
    'returns_set',p.proretset,'return_shape',pg_catalog.pg_get_function_result(p.oid),
    'owner',pg_catalog.pg_get_userbyid(p.proowner),'language',l.lanname,
    'volatility',p.provolatile,'security_definer',p.prosecdef,
    'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,
    'cost',p.procost,'rows',p.prorows,
    'config_keys',CASE WHEN p.oid IS NULL THEN NULL ELSE ARRAY(
      SELECT pg_catalog.split_part(s.setting,'=',1)
      FROM pg_catalog.unnest(p.proconfig) WITH ORDINALITY AS s(setting,position)
      ORDER BY s.position) END,
    'config_value_hashes',CASE WHEN p.oid IS NULL THEN NULL ELSE (
      SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'key',pg_catalog.split_part(s.setting,'=',1),
        'value_md5',pg_catalog.md5(pg_catalog.substr(s.setting,pg_catalog.strpos(s.setting,'=')+1))
      ) ORDER BY s.position),'[]'::pg_catalog.jsonb)
      FROM pg_catalog.unnest(p.proconfig) WITH ORDINALITY AS s(setting,position)) END,
    'config_md5',pg_catalog.md5(p.proconfig::pg_catalog.text),
    'selected_header_md5',CASE WHEN p.oid IS NULL THEN NULL ELSE pg_catalog.md5(
      pg_catalog.jsonb_build_object(
        'owner',p.proowner,'language',p.prolang,'kind',p.prokind,
        'argument_types',p.proargtypes::pg_catalog.text,'argument_modes',p.proargmodes,
        'argument_names',p.proargnames,'all_argument_types',p.proallargtypes,
        'argument_count',p.pronargs,'argument_defaults_count',p.pronargdefaults,
        'argument_defaults_md5',pg_catalog.md5(pg_catalog.pg_get_expr(p.proargdefaults,0)),
        'return_type',p.prorettype,'returns_set',p.proretset,'variadic_type',p.provariadic,
        'security_definer',p.prosecdef,'volatility',p.provolatile,
        'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,
        'cost',p.procost,'rows',p.prorows,'config_md5',pg_catalog.md5(p.proconfig::pg_catalog.text)
      )::pg_catalog.text) END,
    'definition_md5',CASE WHEN p.prokind IN ('f','p')
      THEN pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)) END,
    'body_md5_lf',pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')),
    'acl',p.proacl::pg_catalog.text,
    'normalized_acl',CASE WHEN p.oid IS NULL THEN NULL ELSE ARRAY(
      SELECT (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END)
        || '/' || pg_catalog.pg_get_userbyid(a.grantor) || '/' || a.privilege_type
        || '/' || a.is_grantable::pg_catalog.text
      FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) AS a
      ORDER BY (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END)
        COLLATE pg_catalog."C",a.grantor,a.privilege_type,a.is_grantable) END,
    'effective_acl',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'role',r.role_name,'role_found',r.role_oid IS NOT NULL,
      'execute',pg_catalog.has_function_privilege(r.role_oid,p.oid,'EXECUTE'),
      'schema_usage',pg_catalog.has_schema_privilege(r.role_oid,n.oid,'USAGE')
    ) ORDER BY r.position) FROM selected_roles AS r)
  ) ORDER BY h.position)
    FROM requested_helpers AS h
    LEFT JOIN pg_catalog.pg_proc AS p ON p.oid=pg_catalog.to_regprocedure(h.requested_signature)
    LEFT JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
    LEFT JOIN pg_catalog.pg_language AS l ON l.oid=p.prolang) AS functions,
  (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'requested_name',h.migration_name,
    'row_count',(SELECT pg_catalog.count(*) FROM selected_history AS m WHERE m.name=h.migration_name),
    'rows',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'version',m.version,'name',m.name,
      'statements_array_is_null',m.statements IS NULL,
      'statement_count',pg_catalog.cardinality(m.statements),
      'source_bytes_lf',pg_catalog.octet_length(pg_catalog.convert_to(
        pg_catalog.replace(pg_catalog.array_to_string(m.statements,E'\n'),E'\r\n',E'\n'),'UTF8')),
      'sql_sha256_lf',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
        pg_catalog.replace(pg_catalog.array_to_string(m.statements,E'\n'),E'\r\n',E'\n'),'UTF8')),'hex'),
      'statement_metadata',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'position',s.position,'is_null',s.statement IS NULL,
        'source_bytes_lf',pg_catalog.octet_length(pg_catalog.convert_to(
          pg_catalog.replace(s.statement,E'\r\n',E'\n'),'UTF8')),
        'sql_sha256_lf',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
          pg_catalog.replace(s.statement,E'\r\n',E'\n'),'UTF8')),'hex')
      ) ORDER BY s.position),'[]'::pg_catalog.jsonb)
        FROM pg_catalog.unnest(m.statements) WITH ORDINALITY AS s(statement,position))
    ) ORDER BY m.version),'[]'::pg_catalog.jsonb)
      FROM selected_history AS m WHERE m.name=h.migration_name)
  ) ORDER BY h.position) FROM requested_history AS h) AS migration_history;
