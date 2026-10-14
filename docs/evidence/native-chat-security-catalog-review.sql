-- Catalog SELECT only: no business rows/counts, helper/RPC invocation or writes.
-- Two public chat tables and two exact membership helpers; review output before
-- saving. Metadata can still be sensitive. No default-privilege or RLS changes.
SELECT pg_catalog.clock_timestamp() AT TIME ZONE 'UTC' AS observed_at_utc,
  (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'signature',p.oid::pg_catalog.regprocedure::pg_catalog.text,
    'owner',pg_catalog.pg_get_userbyid(p.proowner),
    'language',l.lanname,'security_definer',p.prosecdef,'volatility',p.provolatile,
    'search_path',ARRAY(SELECT s FROM pg_catalog.unnest(p.proconfig) AS s WHERE s LIKE 'search_path=%'),
    'acl',p.proacl::pg_catalog.text,
    'definition_md5',pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)),
    'body_md5_lf',pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')),
    'anon_execute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
    'authenticated_execute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
    'service_execute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
  ) ORDER BY p.proname),'[]'::pg_catalog.jsonb)
   FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_language AS l ON l.oid=p.prolang
   WHERE p.prokind='f' AND p.oid IN (
     pg_catalog.to_regprocedure('public.is_thread_member(pg_catalog.uuid,pg_catalog.uuid)'),
     pg_catalog.to_regprocedure('public.is_active_thread_member(pg_catalog.uuid,pg_catalog.uuid)')
   )) AS functions,
  (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'schema',n.nspname,'table',c.relname,'owner',pg_catalog.pg_get_userbyid(c.relowner),
    'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl::pg_catalog.text,
    'columns',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',a.attname,'type',pg_catalog.format_type(a.atttypid,a.atttypmod),
      'not_null',a.attnotnull,'default',pg_catalog.pg_get_expr(d.adbin,d.adrelid),
      'acl',a.attacl::pg_catalog.text
    ) ORDER BY a.attnum),'[]'::pg_catalog.jsonb)
      FROM pg_catalog.pg_attribute AS a LEFT JOIN pg_catalog.pg_attrdef AS d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
    'constraints',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',k.conname,'type',k.contype,'validated',k.convalidated,'definition',pg_catalog.pg_get_constraintdef(k.oid)
    ) ORDER BY k.conname),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_constraint AS k WHERE k.conrelid=c.oid),
    'indexes',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',ic.relname,'unique',i.indisunique,'valid',i.indisvalid,'ready',i.indisready,
      'definition',pg_catalog.pg_get_indexdef(i.indexrelid)
    ) ORDER BY ic.relname),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_index AS i
      JOIN pg_catalog.pg_class AS ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid),
    'policies',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',pol.polname,'command',pol.polcmd,'permissive',pol.polpermissive,
      'roles',ARRAY(SELECT CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(r) END FROM pg_catalog.unnest(pol.polroles) AS r ORDER BY r),
      'using',pg_catalog.pg_get_expr(pol.polqual,pol.polrelid),
      'check',pg_catalog.pg_get_expr(pol.polwithcheck,pol.polrelid)
    ) ORDER BY pol.polname),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_policy AS pol WHERE pol.polrelid=c.oid),
    'user_triggers',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',t.tgname,'enabled',t.tgenabled,'function',t.tgfoid::pg_catalog.regprocedure::pg_catalog.text,
      'definition_md5',pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid)),
      'argument_count',t.tgnargs
    ) ORDER BY t.tgname),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_trigger AS t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal)
  ) ORDER BY c.relname),'[]'::pg_catalog.jsonb)
   FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN ('chat_threads','chat_thread_members') AND c.relkind='r') AS tables;
