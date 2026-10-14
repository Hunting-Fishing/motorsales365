-- Catalog SELECT only: six selected incoming/operational relations.
-- No business rows/counts or application-function calls. Trigger arguments and
-- bodies are not disclosed; hashes identify definitions, not authenticity.
WITH targets AS (
  SELECT c.oid,c.relname,c.relowner,c.relrowsecurity,c.relforcerowsecurity,n.nspname
  FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
  WHERE c.relkind='r' AND ((n.nspname='public' AND c.relname='businesses') OR
    (n.nspname='shop_manager' AND c.relname IN ('shops','employee_work_locations','employee_shifts','cash_registers','register_sessions')))
), attached AS (
  SELECT t.* FROM pg_catalog.pg_trigger AS t JOIN targets AS c ON c.oid=t.tgrelid WHERE NOT t.tgisinternal
)
SELECT pg_catalog.clock_timestamp() AT TIME ZONE 'UTC' AS observed_at_utc,
  (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'schema',c.nspname,'table',c.relname,'owner',pg_catalog.pg_get_userbyid(c.relowner),
    'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
    'user_triggers',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',t.tgname,'enabled',t.tgenabled,'type_bits',t.tgtype,
      'function',t.tgfoid::pg_catalog.regprocedure::pg_catalog.text,
      'definition_md5',pg_catalog.md5(pg_catalog.pg_get_triggerdef(t.oid)),
      'when_md5',pg_catalog.md5(pg_catalog.pg_get_expr(t.tgqual,t.tgrelid)),
      'argument_count',t.tgnargs,'arguments_md5',pg_catalog.md5(t.tgargs::pg_catalog.text),
      'update_columns',ARRAY(SELECT a.attname FROM pg_catalog.pg_attribute AS a WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr::pg_catalog.int2[]) ORDER BY a.attnum)
    ) ORDER BY t.tgname),'[]'::pg_catalog.jsonb) FROM attached AS t WHERE t.tgrelid=c.oid),
    'indexes',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',ic.relname,'unique',i.indisunique,'valid',i.indisvalid,'ready',i.indisready,
      'definition_md5',pg_catalog.md5(pg_catalog.pg_get_indexdef(i.indexrelid)),
      'predicate_md5',pg_catalog.md5(pg_catalog.pg_get_expr(i.indpred,i.indrelid)),
      'selected_definition',CASE WHEN ic.relname IN ('shops_one_per_business','employee_shifts_one_open_per_user','register_one_open') THEN pg_catalog.pg_get_indexdef(i.indexrelid) ELSE NULL END
    ) ORDER BY ic.relname),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_index AS i JOIN pg_catalog.pg_class AS ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid)
  ) ORDER BY c.nspname,c.relname),'[]'::pg_catalog.jsonb) FROM targets AS c) AS tables,
  (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'signature',p.oid::pg_catalog.regprocedure::pg_catalog.text,
    'owner',pg_catalog.pg_get_userbyid(p.proowner),'language',l.lanname,
    'security_definer',p.prosecdef,'volatility',p.provolatile,
    'search_path',ARRAY(SELECT s FROM pg_catalog.unnest(p.proconfig) AS s WHERE s LIKE 'search_path=%'),
    'definition_md5',pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)),
    'body_md5_lf',pg_catalog.md5(pg_catalog.replace(p.prosrc,pg_catalog.chr(13),'')),
    'acl',p.proacl::pg_catalog.text,
    'anon_execute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
    'authenticated_execute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
    'service_execute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
  ) ORDER BY p.oid::pg_catalog.regprocedure::pg_catalog.text),'[]'::pg_catalog.jsonb)
   FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_language AS l ON l.oid=p.prolang
   WHERE p.prokind='f' AND p.oid IN (SELECT tgfoid FROM attached)) AS functions;
