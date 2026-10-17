-- One fixed pg_catalog-only WITH SELECT. No application data, row counts, helper
-- execution, settings changes, raw source/ACL/config/default/policy/trigger values.
-- projectRef is a scope label, NOT server identity; caller pins the connector.
-- Missing requested objects are not permission to provision them. All variable
-- metadata vectors are suppressed together on any reader/count/byte refusal.
-- Text mentions and direct pg_depend edges are a bounded frontier, NOT exhaustive
-- indirect/dynamic-SQL writer discovery or current stock/authority acceptance.
WITH
requested_relations(schema_name,relation_name) AS (
  VALUES
    ('public','business_inventory_items'),('public','business_inventory_movements'),
    ('public','business_inventory_locations'),('public','network_part_inquiries'),
    ('public','parts_orders'),('public','parts_order_lines'),
    ('public','parts_reservations'),('public','parts_order_events'),
    ('public','parts_receipts'),('public','parts_receipt_lines'),
    ('public','parts_returns'),('public','parts_return_lines'),
    ('public','parts_receiving_exceptions'),('public','business_invoice_items'),
    ('public','business_invoices'),('public','business_part_cross_references'),
    ('public','installed_components'),('public','parts_warranty_claims'),
    ('shop_manager','inventory_items'),('shop_manager','inventory_transactions'),
    ('shop_manager','purchase_orders'),('shop_manager','purchase_order_items'),
    ('shop_manager','stock_transfers'),('shop_manager','work_order_parts'),
    ('shop_manager','invoice_items'),('shop_manager','invoices'),
    ('shop_manager','counter_sales'),('shop_manager','counter_sale_lines'),
    ('shop_manager','register_sessions')
),
requested_functions(schema_name,function_name) AS (
  VALUES
    ('public','active_reservation_qty'),('public','reserve_network_inquiry'),
    ('public','release_network_inquiry'),('public','create_parts_network_order'),
    ('public','transition_parts_network_order'),('public','receive_parts_network_order'),
    ('public','create_parts_return'),('public','transition_parts_return'),
    ('public','record_installed_component'),('public','create_parts_warranty_claim'),
    ('public','transition_parts_warranty_claim'),('public','create_parts_receiving_exception'),
    ('public','transition_parts_receiving_exception'),('public','enforce_receiving_exception_quarantine'),
    ('public','sync_invoice_item_inventory'),('public','link_business_inventory_catalog_part'),
    ('public','sync_inventory_part_cross_references'),('public','stamp_network_inquiry_response'),
    ('public','throttle_network_part_inquiry'),('public','notify_network_inquiry_created'),
    ('public','notify_network_inquiry_status_change'),('public','set_updated_at'),
    ('public','reset_tow_demo_workspace'),
    ('shop_manager','sm_apply_invoice_line_stock'),('shop_manager','sm_apply_invoice_stock'),
    ('shop_manager','sm_trg_invoice_stock'),('shop_manager','sm_trg_invoice_item_stock'),
    ('shop_manager','complete_counter_sale'),('shop_manager','accrue_counter_sale_commission'),
    ('shop_manager','seed_tow_demo_workspace'),('shop_manager','sm_seed_chart_of_accounts'),
    ('shop_manager','sm_post_journal'),('shop_manager','sm_void_journal_by_source')
),
fixed_roles(name) AS (
  VALUES ('anon'),('authenticated'),('service_role')
),
roles AS MATERIALIZED (
  SELECT f.name,r.oid,r.rolsuper,r.rolinherit,r.rolcanlogin,r.rolbypassrls
  FROM fixed_roles f LEFT JOIN pg_catalog.pg_roles r ON r.rolname=f.name
),
caps AS (
  SELECT 1024 AS columns,512 AS constraints,512 AS indexes,512 AS policies,
    1024 AS triggers,256 AS functions,4096 AS discovery_functions,
    65536 AS expression_bytes,131072 AS definition_bytes,131072 AS discovery_body_bytes,
    16384 AS acl_bytes,16384 AS config_bytes,16384 AS trigger_argument_bytes,
    64 AS config_keys,64 AS policy_roles,16384 AS policy_role_bytes,
    65536 AS signature_bytes
),
reader_catalog_names(name) AS (
  VALUES ('pg_roles'),('pg_namespace'),('pg_class'),('pg_attribute'),
    ('pg_attrdef'),('pg_constraint'),('pg_index'),('pg_policy'),
    ('pg_trigger'),('pg_proc'),('pg_language'),('pg_depend')
),
reader_catalogs AS MATERIALIZED (
  SELECT f.name,c.oid,c.relkind,c.relrowsecurity,
    CASE WHEN c.oid IS NOT NULL THEN pg_catalog.has_table_privilege(c.oid,'SELECT') END AS can_select,
    CASE WHEN c.oid IS NOT NULL THEN pg_catalog.row_security_active(c.oid) END AS active_rls
  FROM reader_catalog_names f
  LEFT JOIN pg_catalog.pg_namespace n ON n.nspname='pg_catalog'
  LEFT JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid AND c.relname=f.name
),
schemas_raw AS MATERIALIZED (
  SELECT n.oid,n.nspname,n.nspowner,n.nspacl
  FROM pg_catalog.pg_namespace n WHERE n.nspname IN ('public','shop_manager')
),
relations_raw AS MATERIALIZED (
  SELECT c.*,n.nspname,n.oid AS schema_oid,n.nspname||'.'||c.relname AS relation_name
  FROM requested_relations q
  JOIN pg_catalog.pg_namespace n ON n.nspname=q.schema_name
  JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid AND c.relname=q.relation_name
  WHERE c.relkind IN ('r','p','v','m','f')
),
columns_raw AS MATERIALIZED (
  SELECT r.oid AS relation_oid,r.relation_name,a.attnum,a.attname,a.atttypid,a.atttypmod,
    a.attnotnull,a.attidentity,a.attgenerated,a.attacl,
    pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS expression
  FROM relations_raw r JOIN pg_catalog.pg_attribute a ON a.attrelid=r.oid
  LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=r.oid AND d.adnum=a.attnum
  WHERE a.attnum>0 AND NOT a.attisdropped
),
constraints_raw AS MATERIALIZED (
  SELECT k.*,r.relation_name,pg_catalog.pg_get_constraintdef(k.oid) AS expression,
    CASE WHEN k.confrelid=0 THEN NULL ELSE rn.nspname||'.'||rc.relname END AS referenced_relation
  FROM pg_catalog.pg_constraint k JOIN relations_raw r ON r.oid=k.conrelid
  LEFT JOIN pg_catalog.pg_class rc ON rc.oid=k.confrelid
  LEFT JOIN pg_catalog.pg_namespace rn ON rn.oid=rc.relnamespace
),
indexes_raw AS MATERIALIZED (
  SELECT i.*,r.relation_name,ic.relname AS index_name,
    pg_catalog.pg_get_indexdef(i.indexrelid) AS expression
  FROM pg_catalog.pg_index i JOIN relations_raw r ON r.oid=i.indrelid
  JOIN pg_catalog.pg_class ic ON ic.oid=i.indexrelid
),
policies_raw AS MATERIALIZED (
  SELECT p.*,r.relation_name,pg_catalog.pg_get_expr(p.polqual,p.polrelid) AS using_expression,
    pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid) AS check_expression
  FROM pg_catalog.pg_policy p JOIN relations_raw r ON r.oid=p.polrelid
),
triggers_raw AS MATERIALIZED (
  SELECT t.*,r.relation_name,pg_catalog.pg_get_triggerdef(t.oid) AS expression
  FROM pg_catalog.pg_trigger t JOIN relations_raw r ON r.oid=t.tgrelid
),
discovery_scan AS MATERIALIZED (
  SELECT p.oid,p.proname,p.prosrc,n.nspname
  FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('public','shop_manager') AND p.prokind IN ('f','p','w')
),
text_mentions AS MATERIALIZED (
  SELECT p.oid,q.schema_name||'.'||q.relation_name AS relation_name
  FROM discovery_scan p CROSS JOIN requested_relations q CROSS JOIN caps c
  WHERE CASE WHEN (SELECT pg_catalog.count(*) FROM discovery_scan)<=c.discovery_functions
    AND pg_catalog.octet_length(p.prosrc)<=c.discovery_body_bytes
    THEN p.prosrc ~* ('(^|[^[:alnum:]_$])'||q.relation_name||'([^[:alnum:]_$]|$)') ELSE false END
),
relation_dependencies AS MATERIALIZED (
  SELECT DISTINCT d.objid AS function_oid,r.relation_name
  FROM pg_catalog.pg_depend d JOIN relations_raw r ON d.refobjid=r.oid
  WHERE d.classid='pg_catalog.pg_proc'::regclass AND d.refclassid='pg_catalog.pg_class'::regclass
),
functions_candidates AS MATERIALIZED (
  SELECT p.*,n.nspname,n.oid AS schema_oid,l.lanname,
    EXISTS(SELECT 1 FROM requested_functions q WHERE q.schema_name=n.nspname AND q.function_name=p.proname) AS requested,
    EXISTS(SELECT 1 FROM triggers_raw t WHERE t.tgfoid=p.oid) AS trigger_attached,
    EXISTS(SELECT 1 FROM relation_dependencies d WHERE d.function_oid=p.oid) AS relation_dependency,
    EXISTS(SELECT 1 FROM text_mentions m WHERE m.oid=p.oid) AS textual_mention
  FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  JOIN pg_catalog.pg_language l ON l.oid=p.prolang
  WHERE p.prokind IN ('f','p','w') AND (
    EXISTS(SELECT 1 FROM requested_functions q WHERE q.schema_name=n.nspname AND q.function_name=p.proname)
    OR EXISTS(SELECT 1 FROM triggers_raw t WHERE t.tgfoid=p.oid)
    OR (n.nspname IN ('public','shop_manager') AND (
      EXISTS(SELECT 1 FROM relation_dependencies d WHERE d.function_oid=p.oid)
      OR EXISTS(SELECT 1 FROM text_mentions m WHERE m.oid=p.oid))))
),
functions_raw AS MATERIALIZED (
  SELECT p.*,
    p.nspname||'.'||p.proname||'('||pg_catalog.pg_get_function_identity_arguments(p.oid)||')' AS signature,
    CASE WHEN (SELECT pg_catalog.count(*) FROM functions_candidates)<=c.functions
      AND pg_catalog.octet_length(p.prosrc)<=c.discovery_body_bytes
      THEN pg_catalog.pg_get_functiondef(p.oid) END AS definition
  FROM functions_candidates p CROSS JOIN caps c
),
missing_relations AS (
  SELECT q.schema_name||'.'||q.relation_name AS name FROM requested_relations q
  WHERE NOT EXISTS(SELECT 1 FROM relations_raw r WHERE r.nspname=q.schema_name AND r.relname=q.relation_name)
),
missing_functions AS (
  SELECT q.schema_name||'.'||q.function_name AS name FROM requested_functions q
  WHERE NOT EXISTS(SELECT 1 FROM functions_candidates p WHERE p.nspname=q.schema_name AND p.proname=q.function_name)
),
observed AS (
  SELECT
    (SELECT pg_catalog.count(*) FROM reader_catalogs) AS reader_catalogs,
    (SELECT pg_catalog.count(*) FROM roles WHERE oid IS NOT NULL) AS roles,
    (SELECT pg_catalog.count(*) FROM schemas_raw) AS schemas,
    (SELECT pg_catalog.count(*) FROM relations_raw) AS relations,
    (SELECT pg_catalog.count(*) FROM columns_raw) AS columns,
    (SELECT pg_catalog.count(*) FROM constraints_raw) AS constraints,
    (SELECT pg_catalog.count(*) FROM indexes_raw) AS indexes,
    (SELECT pg_catalog.count(*) FROM policies_raw) AS policies,
    (SELECT pg_catalog.count(*) FROM triggers_raw) AS triggers,
    (SELECT pg_catalog.count(*) FROM functions_raw) AS functions,
    (SELECT pg_catalog.count(*) FROM discovery_scan) AS discovery_functions,
    EXISTS(SELECT 1 FROM reader_catalogs WHERE oid IS NULL OR can_select IS DISTINCT FROM true
      OR relrowsecurity IS DISTINCT FROM false OR active_rls IS DISTINCT FROM false
      OR (name='pg_roles' AND relkind<>'v') OR (name<>'pg_roles' AND relkind<>'r')) AS reader_metadata_refused,
    EXISTS(SELECT 1 FROM schemas_raw,caps WHERE pg_catalog.octet_length(nspacl::text)>caps.acl_bytes) AS schema_bytes_exceeded,
    EXISTS(SELECT 1 FROM relations_raw,caps WHERE pg_catalog.octet_length(relacl::text)>caps.acl_bytes) AS relation_bytes_exceeded,
    EXISTS(SELECT 1 FROM columns_raw,caps WHERE pg_catalog.octet_length(expression)>caps.expression_bytes
      OR pg_catalog.octet_length(attacl::text)>caps.acl_bytes) AS column_bytes_exceeded,
    EXISTS(SELECT 1 FROM constraints_raw,caps WHERE pg_catalog.octet_length(expression)>caps.expression_bytes) AS constraint_bytes_exceeded,
    EXISTS(SELECT 1 FROM indexes_raw,caps WHERE pg_catalog.octet_length(expression)>caps.expression_bytes) AS index_bytes_exceeded,
    EXISTS(SELECT 1 FROM policies_raw,caps WHERE pg_catalog.octet_length(using_expression)>caps.expression_bytes
      OR pg_catalog.octet_length(check_expression)>caps.expression_bytes
      OR pg_catalog.octet_length(polroles::text)>caps.policy_role_bytes
      OR pg_catalog.cardinality(polroles)>caps.policy_roles) AS policy_bytes_exceeded,
    EXISTS(SELECT 1 FROM triggers_raw,caps WHERE pg_catalog.octet_length(expression)>caps.expression_bytes
      OR pg_catalog.octet_length(tgargs)>caps.trigger_argument_bytes) AS trigger_bytes_exceeded,
    EXISTS(SELECT 1 FROM discovery_scan,caps WHERE pg_catalog.octet_length(prosrc)>caps.discovery_body_bytes) AS discovery_bytes_exceeded,
    EXISTS(SELECT 1 FROM functions_raw,caps WHERE pg_catalog.octet_length(definition)>caps.definition_bytes
      OR pg_catalog.octet_length(prosrc)>caps.discovery_body_bytes OR pg_catalog.octet_length(signature)>caps.signature_bytes
      OR pg_catalog.octet_length(proacl::text)>caps.acl_bytes OR pg_catalog.octet_length(proconfig::text)>caps.config_bytes
      OR COALESCE(pg_catalog.cardinality(proconfig),0)>caps.config_keys) AS function_bytes_exceeded
),
checks AS (
  SELECT o.*,
    (o.reader_catalogs=12 AND o.roles=3 AND NOT o.reader_metadata_refused) AS reader_metadata_complete,
    (o.columns>c.columns OR o.constraints>c.constraints OR o.indexes>c.indexes OR o.policies>c.policies
      OR o.triggers>c.triggers OR o.functions>c.functions OR o.discovery_functions>c.discovery_functions
      OR o.schema_bytes_exceeded OR o.relation_bytes_exceeded OR o.column_bytes_exceeded
      OR o.constraint_bytes_exceeded OR o.index_bytes_exceeded OR o.policy_bytes_exceeded
      OR o.trigger_bytes_exceeded OR o.discovery_bytes_exceeded OR o.function_bytes_exceeded) AS truncated,
    pg_catalog.array_remove(ARRAY[
      CASE WHEN o.reader_catalogs<>12 OR o.reader_metadata_refused THEN 'catalog-reader-metadata-refused' END,
      CASE WHEN o.roles<>3 THEN 'missing-fixed-role' END,
      CASE WHEN o.columns>c.columns THEN 'column-cap-exceeded' END,
      CASE WHEN o.constraints>c.constraints THEN 'constraint-cap-exceeded' END,
      CASE WHEN o.indexes>c.indexes THEN 'index-cap-exceeded' END,
      CASE WHEN o.policies>c.policies THEN 'policy-cap-exceeded' END,
      CASE WHEN o.triggers>c.triggers THEN 'trigger-cap-exceeded' END,
      CASE WHEN o.functions>c.functions THEN 'function-cap-exceeded' END,
      CASE WHEN o.discovery_functions>c.discovery_functions THEN 'discovery-function-cap-exceeded' END,
      CASE WHEN o.schema_bytes_exceeded OR o.relation_bytes_exceeded OR o.column_bytes_exceeded
        OR o.constraint_bytes_exceeded OR o.index_bytes_exceeded OR o.policy_bytes_exceeded
        OR o.trigger_bytes_exceeded OR o.discovery_bytes_exceeded OR o.function_bytes_exceeded
        THEN 'metadata-byte-cap-exceeded' END
    ]::text[],NULL) AS metadata_failures
  FROM observed o CROSS JOIN caps c
),
admission AS (
  SELECT ch.*,ch.reader_metadata_complete AND NOT ch.truncated AS emit_vectors
  FROM checks ch
)
SELECT pg_catalog.jsonb_build_object(
  'projectRef','wjxaajgvddtrxxtocxen',
  'mode','read-only-selected-stock-catalog-fingerprints-v1',
  'observedAtUtc',pg_catalog.timezone('UTC',pg_catalog.statement_timestamp()),
  'serverVersionNum',pg_catalog.current_setting('server_version_num'),
  'scope',pg_catalog.jsonb_build_object(
    'relations',(SELECT pg_catalog.jsonb_agg(q.schema_name||'.'||q.relation_name ORDER BY q.schema_name,q.relation_name) FROM requested_relations q),
    'requestedFunctions',(SELECT pg_catalog.jsonb_agg(q.schema_name||'.'||q.function_name ORDER BY q.schema_name,q.function_name) FROM requested_functions q),
    'roles',ARRAY['anon','authenticated','service_role'],
    'discovery','All overloads of fixed requested names; attached trigger OIDs in any schema; public/shop_manager direct pg_depend relation edges and case-insensitive exact target-name token mentions in bounded prosrc. Comments/strings may produce candidates; indirect/dynamic SQL may be absent.',
    'source','pg_catalog only; no application/Auth/Storage rows or row counts; no helper or discovered function execution'),
  'readerMetadataComplete',ch.reader_metadata_complete,
  'boundedMetadataComplete',ch.emit_vectors,
  'allRequestedObjectsPresent',NOT EXISTS(SELECT 1 FROM missing_relations) AND NOT EXISTS(SELECT 1 FROM missing_functions),
  'truncated',ch.truncated,
  'metadataFailures',pg_catalog.to_jsonb(ch.metadata_failures),
  'missingRelations',COALESCE((SELECT pg_catalog.jsonb_agg(m.name ORDER BY m.name) FROM missing_relations m),'[]'::jsonb),
  'missingFunctions',COALESCE((SELECT pg_catalog.jsonb_agg(m.name ORDER BY m.name) FROM missing_functions m),'[]'::jsonb),
  'caps',(SELECT pg_catalog.to_jsonb(c) FROM caps c),
  'observedCatalogCounts',(SELECT pg_catalog.to_jsonb(o) FROM observed o),
  'readerCatalogs',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name','pg_catalog.'||r.name,'exists',r.oid IS NOT NULL,'kind',r.relkind,
    'select',r.can_select,'rls',r.relrowsecurity,'activeRls',r.active_rls) ORDER BY r.name) FROM reader_catalogs r),
  'roles',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name',r.name,'exists',r.oid IS NOT NULL,'superuser',r.rolsuper,'inherit',r.rolinherit,
    'login',r.rolcanlogin,'bypassRls',r.rolbypassrls) ORDER BY r.name) FROM roles r),
  'schemas',CASE WHEN NOT ch.emit_vectors THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',n.nspname,'ownerSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_userbyid(n.nspowner),'UTF8')),'hex'),
      'aclIsNull',n.nspacl IS NULL,'aclSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(n.nspacl::text,'UTF8')),'hex'),
      'privileges',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('role',p.name,
        'usage',pg_catalog.has_schema_privilege(p.oid,n.oid,'USAGE'),
        'create',pg_catalog.has_schema_privilege(p.oid,n.oid,'CREATE')) ORDER BY p.name) FROM roles p)
      ) ORDER BY n.nspname) FROM schemas_raw n),'[]'::jsonb) END,
  'relations',CASE WHEN NOT ch.emit_vectors THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name',r.relation_name,'kind',r.relkind,'ownerSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_userbyid(r.relowner),'UTF8')),'hex'),
      'rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,
      'aclIsNull',r.relacl IS NULL,'aclSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(r.relacl::text,'UTF8')),'hex'),
      'privileges',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('role',p.name,
        'schemaUsage',pg_catalog.has_schema_privilege(p.oid,r.schema_oid,'USAGE'),
        'select',pg_catalog.has_table_privilege(p.oid,r.oid,'SELECT'),
        'insert',pg_catalog.has_table_privilege(p.oid,r.oid,'INSERT'),
        'update',pg_catalog.has_table_privilege(p.oid,r.oid,'UPDATE'),
        'delete',pg_catalog.has_table_privilege(p.oid,r.oid,'DELETE'),
        'truncate',pg_catalog.has_table_privilege(p.oid,r.oid,'TRUNCATE'),
        'references',pg_catalog.has_table_privilege(p.oid,r.oid,'REFERENCES'),
        'trigger',pg_catalog.has_table_privilege(p.oid,r.oid,'TRIGGER')) ORDER BY p.name) FROM roles p)
      ) ORDER BY r.relation_name) FROM relations_raw r),'[]'::jsonb) END,
  'columns',CASE WHEN NOT ch.emit_vectors THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'relation',a.relation_name,'position',a.attnum,'name',a.attname,
      'type',pg_catalog.format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,
      'identity',a.attidentity,'generated',a.attgenerated,'hasDefault',a.expression IS NOT NULL,
      'defaultSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(a.expression,'UTF8')),'hex'),
      'aclIsNull',a.attacl IS NULL,'aclSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(a.attacl::text,'UTF8')),'hex'),
      'privileges',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('role',p.name,
        'select',pg_catalog.has_column_privilege(p.oid,a.relation_oid,a.attnum,'SELECT'),
        'insert',pg_catalog.has_column_privilege(p.oid,a.relation_oid,a.attnum,'INSERT'),
        'update',pg_catalog.has_column_privilege(p.oid,a.relation_oid,a.attnum,'UPDATE'),
        'references',pg_catalog.has_column_privilege(p.oid,a.relation_oid,a.attnum,'REFERENCES')) ORDER BY p.name) FROM roles p)
      ) ORDER BY a.relation_name,a.attnum) FROM columns_raw a),'[]'::jsonb) END,
  'constraints',CASE WHEN NOT ch.emit_vectors THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'relation',k.relation_name,'name',k.conname,'type',k.contype,'validated',k.convalidated,
      'deferrable',k.condeferrable,'initiallyDeferred',k.condeferred,'referencedRelation',k.referenced_relation,
      'updateAction',k.confupdtype,'deleteAction',k.confdeltype,'matchType',k.confmatchtype,
      'columns',COALESCE((SELECT pg_catalog.jsonb_agg(a.attname ORDER BY x.position)
        FROM pg_catalog.unnest(k.conkey) WITH ORDINALITY x(number,position)
        JOIN pg_catalog.pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=x.number),'[]'::jsonb),
      'referencedColumns',COALESCE((SELECT pg_catalog.jsonb_agg(a.attname ORDER BY x.position)
        FROM pg_catalog.unnest(k.confkey) WITH ORDINALITY x(number,position)
        JOIN pg_catalog.pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=x.number),'[]'::jsonb),
      'definitionSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(k.expression,'UTF8')),'hex')
      ) ORDER BY k.relation_name,k.conname) FROM constraints_raw k),'[]'::jsonb) END,
  'indexes',CASE WHEN NOT ch.emit_vectors THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'relation',i.relation_name,'name',i.index_name,'unique',i.indisunique,'primary',i.indisprimary,
      'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive,'keyCount',i.indnkeyatts,
      'columns',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'name',a.attname,'expressionColumn',x.number=0,'key',x.position<=i.indnkeyatts) ORDER BY x.position)
        FROM pg_catalog.unnest(i.indkey::smallint[]) WITH ORDINALITY x(number,position)
        LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=x.number),'[]'::jsonb),
      'definitionSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(i.expression,'UTF8')),'hex')
      ) ORDER BY i.relation_name,i.index_name) FROM indexes_raw i),'[]'::jsonb) END,
  'policies',CASE WHEN NOT ch.emit_vectors THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'relation',p.relation_name,'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
      'roles',COALESCE((SELECT pg_catalog.jsonb_agg(CASE WHEN x.role_oid=0 THEN 'PUBLIC'
        WHEN r.rolname IN ('anon','authenticated','service_role','supabase_auth_admin','postgres','dashboard_user')
          THEN r.rolname ELSE 'unclassified-role' END ORDER BY x.position)
        FROM pg_catalog.unnest(p.polroles) WITH ORDINALITY x(role_oid,position)
        LEFT JOIN pg_catalog.pg_roles r ON r.oid=x.role_oid),'[]'::jsonb),
      'rolesSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.polroles::text,'UTF8')),'hex'),
      'usingSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.using_expression,'UTF8')),'hex'),
      'checkSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.check_expression,'UTF8')),'hex')
      ) ORDER BY p.relation_name,p.polname) FROM policies_raw p),'[]'::jsonb) END,
  'triggers',CASE WHEN NOT ch.emit_vectors THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'relation',t.relation_name,'name',t.tgname,'enabled',t.tgenabled,'internal',t.tgisinternal,
      'typeBits',t.tgtype,'constraintName',k.conname,
      'function',n.nspname||'.'||p.proname||'('||pg_catalog.pg_get_function_identity_arguments(p.oid)||')',
      'argumentBytes',pg_catalog.octet_length(t.tgargs),
      'argumentsSha256',pg_catalog.encode(pg_catalog.sha256(t.tgargs),'hex'),
      'definitionSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(t.expression,'UTF8')),'hex')
      ) ORDER BY t.relation_name,t.tgname) FROM triggers_raw t
      JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      LEFT JOIN pg_catalog.pg_constraint k ON k.oid=t.tgconstraint),'[]'::jsonb) END,
  'functions',CASE WHEN NOT ch.emit_vectors THEN '[]'::jsonb ELSE
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'signature',p.signature,'requested',p.requested,'triggerAttached',p.trigger_attached,
      'relationDependency',p.relation_dependency,'textualMention',p.textual_mention,
      'mentionedRelations',COALESCE((SELECT pg_catalog.jsonb_agg(m.relation_name ORDER BY m.relation_name)
        FROM text_mentions m WHERE m.oid=p.oid),'[]'::jsonb),
      'relationDependencies',COALESCE((SELECT pg_catalog.jsonb_agg(d.relation_name ORDER BY d.relation_name)
        FROM relation_dependencies d WHERE d.function_oid=p.oid),'[]'::jsonb),
      'ownerSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_userbyid(p.proowner),'UTF8')),'hex'),
      'language',p.lanname,'kind',p.prokind,'securityDefiner',p.prosecdef,'volatility',p.provolatile,
      'strict',p.proisstrict,'returnsSet',p.proretset,'resultType',pg_catalog.format_type(p.prorettype,NULL),
      'aclIsNull',p.proacl IS NULL,'aclSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.proacl::text,'UTF8')),'hex'),
      'configEntryCount',COALESCE(pg_catalog.cardinality(p.proconfig),0),
      'configSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.proconfig::text,'UTF8')),'hex'),
      'definitionBytes',pg_catalog.octet_length(p.definition),
      'definitionSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.definition,'UTF8')),'hex'),
      'bodySha256Lf',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.replace(p.prosrc,pg_catalog.chr(13)||pg_catalog.chr(10),pg_catalog.chr(10)),'UTF8')),'hex'),
      'execute',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('role',r.name,
        'schemaUsage',pg_catalog.has_schema_privilege(r.oid,p.schema_oid,'USAGE'),
        'allowed',pg_catalog.has_function_privilege(r.oid,p.oid,'EXECUTE')) ORDER BY r.name) FROM roles r)
      ) ORDER BY p.signature) FROM functions_raw p),'[]'::jsonb) END,
  'acceptance',pg_catalog.jsonb_build_object(
    'sourceCorrespondence',false,'allWriters',false,'nativeAuthority',false,'recovery',false,'release',false),
  'limits',ARRAY[
    'Selected catalog fingerprints only; projectRef is a literal scope label and the caller must pin the canonical project connector. Not full schema/baseline/managed Auth lineage or source-body adoption.',
    'No application/Auth/Storage rows, business identifiers, row counts, raw definitions/expressions/ACL/config/trigger arguments, helper execution or mutations. Metadata counts only.',
    'Reader catalog visibility and caps certify only this bounded metadata vector. Missing requested names are explicit, not provisioning authority; fixed names include every observed overload, not an approved signature.',
    'Text mentions may be comments/strings and direct dependencies are not complete procedural/dynamic SQL, indirect/helper, cross-schema, client, provider or all-writer discovery. No global no-oversell or lock/deadlock/phantom/TTL proof.',
    'Effective object ACL privileges include inherited/PUBLIC effects but are not RLS row admission, Auth/session/native tenant authority, API reachability, grant permission or activation approval.',
    'No durable operation/idempotency/unknown-outcome reconciliation, private-object/API/device/owner/full recovery, financial/consumer ordering/main/deployed/live release acceptance.'
  ]
) AS catalog
FROM admission ch;
