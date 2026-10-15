-- Review-only catalog SELECT: three exact native relations, three exact helpers,
-- and functions attached by noninternal triggers to only those relations.
-- No application records/counts, application-function calls, DDL or writes.
-- Defaults, bodies, configuration values and trigger WHEN/arguments are hashes.
-- Policy/constraint/index expressions can contain sensitive text: review output
-- privately before saving/publishing. Hashes are not secrecy/authenticity proof.
-- Effective ACL checks do not establish RLS admission, Data API exposure or
-- original-human authority. Incoming FKs, role membership/default ACL closure,
-- invoked dependencies and earlier observations are outside this snapshot.
-- Review returned identity sets for missing targets; do not widen this query.
-- This file does not enforce READ ONLY transactions or statement/lock timeouts.
WITH targets AS (
  SELECT c.oid,c.relname,c.relowner,c.relrowsecurity,c.relforcerowsecurity,c.relacl,
    n.oid AS schema_oid,n.nspname,n.nspacl
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
  WHERE n.nspname='shop_manager'
    AND c.relname IN ('profiles','roles','user_roles')
    AND c.relkind='r'
), attached AS (
  SELECT t.*
  FROM pg_catalog.pg_trigger AS t
  JOIN targets AS c ON c.oid=t.tgrelid
  WHERE NOT t.tgisinternal
), selected_functions AS (
  SELECT p.oid
  FROM pg_catalog.pg_proc AS p
  WHERE p.prokind='f' AND (
    p.oid IN (
      pg_catalog.to_regprocedure('shop_manager.is_owner_or_admin(pg_catalog.uuid)'),
      pg_catalog.to_regprocedure('shop_manager.user_belongs_to_shop(pg_catalog.uuid,pg_catalog.uuid)'),
      pg_catalog.to_regprocedure('shop_manager.get_current_user_shop_id()')
    ) OR p.oid IN (SELECT t.tgfoid FROM attached AS t)
  )
)
SELECT pg_catalog.clock_timestamp() AT TIME ZONE 'UTC' AS observed_at_utc,
  (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'schema',c.nspname,'table',c.relname,
    'owner',pg_catalog.pg_get_userbyid(c.relowner),
    'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
    'acl',c.relacl::pg_catalog.text,'schema_acl',c.nspacl::pg_catalog.text,
    'effective_acl',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'role',r.role_name,
      'schema_usage',pg_catalog.has_schema_privilege(r.role_name::pg_catalog.name,c.schema_oid,'USAGE'),
      'select',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'SELECT'),
      'insert',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'INSERT'),
      'update',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'UPDATE'),
      'delete',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'DELETE'),
      'truncate',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'TRUNCATE'),
      'references',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'REFERENCES'),
      'trigger',pg_catalog.has_table_privilege(r.role_name::pg_catalog.name,c.oid,'TRIGGER')
    ) ORDER BY r.role_name)
      FROM pg_catalog.unnest(ARRAY['anon','authenticated','service_role']::pg_catalog.text[]) AS r(role_name)),
    'columns',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',a.attname,'type',pg_catalog.format_type(a.atttypid,a.atttypmod),
      'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,
      'default_md5',pg_catalog.md5(pg_catalog.pg_get_expr(d.adbin,d.adrelid)),
      'acl',a.attacl::pg_catalog.text,
      'effective_acl',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'role',r.role_name,
        'select',pg_catalog.has_column_privilege(r.role_name::pg_catalog.name,c.oid,a.attnum,'SELECT'),
        'insert',pg_catalog.has_column_privilege(r.role_name::pg_catalog.name,c.oid,a.attnum,'INSERT'),
        'update',pg_catalog.has_column_privilege(r.role_name::pg_catalog.name,c.oid,a.attnum,'UPDATE'),
        'references',pg_catalog.has_column_privilege(r.role_name::pg_catalog.name,c.oid,a.attnum,'REFERENCES')
      ) ORDER BY r.role_name)
        FROM pg_catalog.unnest(ARRAY['anon','authenticated','service_role']::pg_catalog.text[]) AS r(role_name))
    ) ORDER BY a.attnum),'[]'::pg_catalog.jsonb)
      FROM pg_catalog.pg_attribute AS a
      LEFT JOIN pg_catalog.pg_attrdef AS d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
    'constraints',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',k.conname,'type',k.contype,'validated',k.convalidated,
      'definition',pg_catalog.pg_get_constraintdef(k.oid)
    ) ORDER BY k.conname),'[]'::pg_catalog.jsonb)
      FROM pg_catalog.pg_constraint AS k WHERE k.conrelid=c.oid),
    'indexes',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',ic.relname,'unique',i.indisunique,'valid',i.indisvalid,'ready',i.indisready,
      'definition',pg_catalog.pg_get_indexdef(i.indexrelid)
    ) ORDER BY ic.relname),'[]'::pg_catalog.jsonb)
      FROM pg_catalog.pg_index AS i
      JOIN pg_catalog.pg_class AS ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid),
    'policies',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',pol.polname,'command',pol.polcmd,'permissive',pol.polpermissive,
      'roles',ARRAY(SELECT CASE WHEN r.role_oid=0 THEN 'PUBLIC'
        ELSE pg_catalog.pg_get_userbyid(r.role_oid) END
        FROM pg_catalog.unnest(pol.polroles) AS r(role_oid) ORDER BY r.role_oid),
      'using',pg_catalog.pg_get_expr(pol.polqual,pol.polrelid),
      'check',pg_catalog.pg_get_expr(pol.polwithcheck,pol.polrelid)
    ) ORDER BY pol.polname),'[]'::pg_catalog.jsonb)
      FROM pg_catalog.pg_policy AS pol WHERE pol.polrelid=c.oid),
    'user_triggers',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',t.tgname,'enabled',t.tgenabled,
      'function',t.tgfoid::pg_catalog.regprocedure::pg_catalog.text,
      'type_bits',t.tgtype,
      'level',CASE WHEN (t.tgtype::pg_catalog.int4 & 1)=1 THEN 'ROW' ELSE 'STATEMENT' END,
      'timing',CASE WHEN (t.tgtype::pg_catalog.int4 & 64)=64 THEN 'INSTEAD OF'
        WHEN (t.tgtype::pg_catalog.int4 & 2)=2 THEN 'BEFORE' ELSE 'AFTER' END,
      'events',pg_catalog.array_remove(ARRAY[
        CASE WHEN (t.tgtype::pg_catalog.int4 & 4)=4 THEN 'INSERT'::pg_catalog.text END,
        CASE WHEN (t.tgtype::pg_catalog.int4 & 8)=8 THEN 'DELETE'::pg_catalog.text END,
        CASE WHEN (t.tgtype::pg_catalog.int4 & 16)=16 THEN 'UPDATE'::pg_catalog.text END,
        CASE WHEN (t.tgtype::pg_catalog.int4 & 32)=32 THEN 'TRUNCATE'::pg_catalog.text END
      ],NULL::pg_catalog.text),
      'update_columns',ARRAY(SELECT a.attname FROM pg_catalog.pg_attribute AS a
        WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr::pg_catalog.int2[])
        ORDER BY a.attnum),
      'when_md5',pg_catalog.md5(pg_catalog.pg_get_expr(t.tgqual,t.tgrelid)),
      'argument_count',t.tgnargs,
      'arguments_md5',pg_catalog.md5(t.tgargs::pg_catalog.text),
      'definition_md5',pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid))
    ) ORDER BY t.tgname),'[]'::pg_catalog.jsonb)
      FROM attached AS t WHERE t.tgrelid=c.oid)
  ) ORDER BY c.relname),'[]'::pg_catalog.jsonb) FROM targets AS c) AS tables,
  (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'schema',n.nspname,'name',p.proname,
    'signature',p.oid::pg_catalog.regprocedure::pg_catalog.text,
    'identity_arguments',pg_catalog.pg_get_function_identity_arguments(p.oid),
    'argument_names',p.proargnames,'argument_modes',p.proargmodes,
    'argument_count',p.pronargs,'argument_defaults_count',p.pronargdefaults,
    'argument_types',ARRAY(SELECT pg_catalog.format_type(a.type_oid,NULL::pg_catalog.int4)
      FROM pg_catalog.unnest(p.proargtypes::pg_catalog.oid[]) WITH ORDINALITY AS a(type_oid,position)
      ORDER BY a.position),
    'all_argument_types',CASE WHEN p.proallargtypes IS NULL THEN NULL
      ELSE ARRAY(SELECT pg_catalog.format_type(a.type_oid,NULL::pg_catalog.int4)
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
    'config_keys',ARRAY(SELECT pg_catalog.split_part(s.setting,'=',1)
      FROM pg_catalog.unnest(p.proconfig) WITH ORDINALITY AS s(setting,position)
      ORDER BY s.position),
    'config_value_hashes',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'key',pg_catalog.split_part(s.setting,'=',1),
      'value_md5',pg_catalog.md5(pg_catalog.substr(s.setting,pg_catalog.strpos(s.setting,'=')+1))
    ) ORDER BY s.position),'[]'::pg_catalog.jsonb)
      FROM pg_catalog.unnest(p.proconfig) WITH ORDINALITY AS s(setting,position)),
    'config_md5',pg_catalog.md5(p.proconfig::pg_catalog.text),
    'selected_header_md5',pg_catalog.md5(pg_catalog.jsonb_build_object(
      'owner',p.proowner,'language',p.prolang,'kind',p.prokind,
      'argument_types',p.proargtypes::pg_catalog.text,'argument_modes',p.proargmodes,
      'argument_names',p.proargnames,'all_argument_types',p.proallargtypes,
      'argument_count',p.pronargs,'argument_defaults_count',p.pronargdefaults,
      'argument_defaults_md5',pg_catalog.md5(pg_catalog.pg_get_expr(p.proargdefaults,0)),
      'return_type',p.prorettype,'returns_set',p.proretset,'variadic_type',p.provariadic,
      'security_definer',p.prosecdef,'volatility',p.provolatile,
      'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,
      'cost',p.procost,'rows',p.prorows,'config_md5',pg_catalog.md5(p.proconfig::pg_catalog.text)
    )::pg_catalog.text),
    'definition_md5',pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)),
    'body_md5_lf',pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')),
    'acl',p.proacl::pg_catalog.text,
    'anon_execute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
    'authenticated_execute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
    'service_execute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'),
    'anon_schema_usage',pg_catalog.has_schema_privilege('anon',n.oid,'USAGE'),
    'authenticated_schema_usage',pg_catalog.has_schema_privilege('authenticated',n.oid,'USAGE'),
    'service_schema_usage',pg_catalog.has_schema_privilege('service_role',n.oid,'USAGE')
  ) ORDER BY n.nspname,p.proname,p.oid::pg_catalog.regprocedure::pg_catalog.text),'[]'::pg_catalog.jsonb)
    FROM pg_catalog.pg_proc AS p
    JOIN selected_functions AS f ON f.oid=p.oid
    JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
    JOIN pg_catalog.pg_language AS l ON l.oid=p.prolang) AS functions;
