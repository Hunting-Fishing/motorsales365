-- Review-only catalog SELECT: two exact public relations, six exact chat writers,
-- the exact notify_user dependency, and functions attached to these relations.
-- No application records/counts, application-function calls, DDL or writes.
-- Defaults/policy/constraint/index expressions can still contain sensitive text:
-- review the result privately before saving or publishing it. Function defaults,
-- bodies, trigger WHEN/arguments and non-search_path config values are hashed.
-- Missing targets are detected by reviewing the returned identity sets, not by
-- widening this query. This is not global dependency/privilege closure, a shared
-- snapshot with earlier observations, or enforced READ ONLY/timeouts.
WITH targets AS (
  SELECT c.oid,c.relname,c.relowner,c.relrowsecurity,c.relforcerowsecurity,c.relacl,n.nspname
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
  WHERE n.nspname='public'
    AND c.relname IN ('chat_thread_messages','user_notifications')
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
      pg_catalog.to_regprocedure('public.create_group_chat(pg_catalog.text,pg_catalog.uuid[])'),
      pg_catalog.to_regprocedure('public.invite_to_thread(pg_catalog.uuid,pg_catalog.uuid[])'),
      pg_catalog.to_regprocedure('public.respond_to_thread_invite(pg_catalog.uuid,pg_catalog.bool)'),
      pg_catalog.to_regprocedure('public.leave_thread(pg_catalog.uuid)'),
      pg_catalog.to_regprocedure('public.mark_thread_read(pg_catalog.uuid)'),
      pg_catalog.to_regprocedure('public.mark_thread_unread(pg_catalog.uuid)'),
      pg_catalog.to_regprocedure('public.notify_user(pg_catalog.uuid,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.uuid,pg_catalog.jsonb)')
    ) OR p.oid IN (SELECT t.tgfoid FROM attached AS t)
  )
)
SELECT pg_catalog.clock_timestamp() AT TIME ZONE 'UTC' AS observed_at_utc,
  (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'schema',c.nspname,'table',c.relname,
    'owner',pg_catalog.pg_get_userbyid(c.relowner),
    'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
    'acl',c.relacl::pg_catalog.text,
    'columns',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',a.attname,'type',pg_catalog.format_type(a.atttypid,a.atttypmod),
      'not_null',a.attnotnull,
      'default',pg_catalog.pg_get_expr(d.adbin,d.adrelid),
      'acl',a.attacl::pg_catalog.text
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
      'update_columns',ARRAY(SELECT a.attname
        FROM pg_catalog.pg_attribute AS a
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
    'search_path',ARRAY(SELECT s.setting FROM pg_catalog.unnest(p.proconfig) AS s(setting)
      WHERE pg_catalog.split_part(s.setting,'=',1)='search_path'),
    'config_keys',ARRAY(SELECT pg_catalog.split_part(s.setting,'=',1)
      FROM pg_catalog.unnest(p.proconfig) WITH ORDINALITY AS s(setting,position)
      ORDER BY s.position),
    'config_value_hashes',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'key',pg_catalog.split_part(s.setting,'=',1),
      'value_md5',pg_catalog.md5(pg_catalog.substr(s.setting,pg_catalog.strpos(s.setting,'=')+1))
    ) ORDER BY s.position),'[]'::pg_catalog.jsonb)
      FROM pg_catalog.unnest(p.proconfig) WITH ORDINALITY AS s(setting,position)),
    'config_md5',pg_catalog.md5(p.proconfig::pg_catalog.text),
    'definition_md5',pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)),
    'body_md5_lf',pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')),
    'acl',p.proacl::pg_catalog.text,
    'anon_execute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
    'authenticated_execute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
    'service_execute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
  ) ORDER BY n.nspname,p.proname,p.oid::pg_catalog.regprocedure::pg_catalog.text),'[]'::pg_catalog.jsonb)
    FROM pg_catalog.pg_proc AS p
    JOIN selected_functions AS f ON f.oid=p.oid
    JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
    JOIN pg_catalog.pg_language AS l ON l.oid=p.prolang) AS functions;
