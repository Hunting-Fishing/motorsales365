// Offline static safety checks only. This file never executes SQL, connects to
// a database, starts a process, fabricates hosted evidence or grants authority.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

const source = fs
  .readFileSync(new URL("./stock-writer-catalog-review.sql", import.meta.url), "utf8")
  .replaceAll("\r\n", "\n");
const executable = (value) => value.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
const sql = executable(source);
const relations = [
  "public.business_inventory_items",
  "public.business_inventory_movements",
  "public.business_inventory_locations",
  "public.network_part_inquiries",
  "public.parts_orders",
  "public.parts_order_lines",
  "public.parts_reservations",
  "public.parts_order_events",
  "public.parts_receipts",
  "public.parts_receipt_lines",
  "public.parts_returns",
  "public.parts_return_lines",
  "public.parts_receiving_exceptions",
  "public.business_invoice_items",
  "public.business_invoices",
  "public.business_part_cross_references",
  "public.installed_components",
  "public.parts_warranty_claims",
  "shop_manager.inventory_items",
  "shop_manager.inventory_transactions",
  "shop_manager.purchase_orders",
  "shop_manager.purchase_order_items",
  "shop_manager.stock_transfers",
  "shop_manager.work_order_parts",
  "shop_manager.invoice_items",
  "shop_manager.invoices",
  "shop_manager.counter_sales",
  "shop_manager.counter_sale_lines",
  "shop_manager.register_sessions",
];
const functions = [
  "public.active_reservation_qty",
  "public.reserve_network_inquiry",
  "public.release_network_inquiry",
  "public.create_parts_network_order",
  "public.transition_parts_network_order",
  "public.receive_parts_network_order",
  "public.create_parts_return",
  "public.transition_parts_return",
  "public.record_installed_component",
  "public.create_parts_warranty_claim",
  "public.transition_parts_warranty_claim",
  "public.create_parts_receiving_exception",
  "public.transition_parts_receiving_exception",
  "public.enforce_receiving_exception_quarantine",
  "public.sync_invoice_item_inventory",
  "public.link_business_inventory_catalog_part",
  "public.sync_inventory_part_cross_references",
  "public.stamp_network_inquiry_response",
  "public.throttle_network_part_inquiry",
  "public.notify_network_inquiry_created",
  "public.notify_network_inquiry_status_change",
  "public.set_updated_at",
  "public.reset_tow_demo_workspace",
  "shop_manager.sm_apply_invoice_line_stock",
  "shop_manager.sm_apply_invoice_stock",
  "shop_manager.sm_trg_invoice_stock",
  "shop_manager.sm_trg_invoice_item_stock",
  "shop_manager.complete_counter_sale",
  "shop_manager.accrue_counter_sale_commission",
  "shop_manager.seed_tow_demo_workspace",
  "shop_manager.sm_seed_chart_of_accounts",
  "shop_manager.sm_post_journal",
  "shop_manager.sm_void_journal_by_source",
];
const vectors = [
  "schemas",
  "relations",
  "columns",
  "constraints",
  "indexes",
  "policies",
  "triggers",
  "functions",
];
const ctes = new Set([
  "requested_relations",
  "requested_functions",
  "fixed_roles",
  "roles",
  "caps",
  "reader_catalog_names",
  "reader_catalogs",
  "schemas_raw",
  "relations_raw",
  "columns_raw",
  "constraints_raw",
  "indexes_raw",
  "policies_raw",
  "triggers_raw",
  "discovery_scan",
  "text_mentions",
  "relation_dependencies",
  "functions_candidates",
  "functions_raw",
  "missing_relations",
  "missing_functions",
  "observed",
  "checks",
  "admission",
]);
const catalogs = new Set([
  "pg_roles",
  "pg_namespace",
  "pg_class",
  "pg_attribute",
  "pg_attrdef",
  "pg_constraint",
  "pg_index",
  "pg_policy",
  "pg_trigger",
  "pg_proc",
  "pg_language",
  "pg_depend",
]);
const builtins = new Set([
  "array_remove",
  "cardinality",
  "chr",
  "convert_to",
  "count",
  "current_setting",
  "encode",
  "format_type",
  "has_column_privilege",
  "has_function_privilege",
  "has_schema_privilege",
  "has_table_privilege",
  "jsonb_agg",
  "jsonb_build_object",
  "octet_length",
  "pg_get_constraintdef",
  "pg_get_expr",
  "pg_get_function_identity_arguments",
  "pg_get_functiondef",
  "pg_get_indexdef",
  "pg_get_triggerdef",
  "pg_get_userbyid",
  "replace",
  "row_security_active",
  "sha256",
  "statement_timestamp",
  "timezone",
  "to_jsonb",
  "unnest",
]);
function checkSources(value) {
  const clean = executable(value);
  // FROM inside this exact Boolean comparison is SQL syntax, not a source.
  // Do not allow true/false as relation names or mask any ordinary FROM.
  const relationSources = clean.replace(
    /\bIS\s+DISTINCT\s+FROM\s+(?:true|false)\b/gi,
    "IS_DISTINCT_BOOLEAN",
  );
  for (const match of relationSources.matchAll(
    /\b(?:FROM|JOIN)\s+([a-z_]\w*)(?:\.([a-z_]\w*))?/gi,
  )) {
    if (match[2]) {
      assert.equal(match[1], "pg_catalog");
      assert.ok(catalogs.has(match[2]) || match[2] === "unnest", match[2]);
    } else assert.ok(ctes.has(match[1]), match[1]);
  }
  for (const match of clean.matchAll(/\b([a-z_]\w*)\.([a-z_]\w*)\s*\(/gi)) {
    assert.equal(match[1], "pg_catalog");
    assert.ok(builtins.has(match[2]), match[2]);
  }
  const unqualified = new Set([
    "requested_relations",
    "requested_functions",
    "fixed_roles",
    "reader_catalog_names",
    "AS",
    "MATERIALIZED",
    // Reserved SELECT opens a scalar subquery, never an application callable.
    "SELECT",
    "VALUES",
    "IN",
    "WHEN",
    "AND",
    "OR",
    "EXISTS",
    "COALESCE",
    "x",
  ]);
  for (const match of clean.matchAll(/(?<![\w.])([a-z_]\w*)\s*\(/gi)) {
    assert.ok(unqualified.has(match[1]), match[1]);
  }
}
function cteTuples(first, next) {
  const block = source.slice(source.indexOf(first), source.indexOf(next));
  return [...block.matchAll(/\('([^']+)','([^']+)'\)/g)].map((match) => `${match[1]}.${match[2]}`);
}

test("static: a single fixed WITH SELECT, no write/DDL/session/helper statement", () => {
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "c604084f3ebf5f7daa851bff12671ae29f8ece4f7a6525272205a931b480c292",
  );
  assert.ok(Buffer.byteLength(source) > 10000 && Buffer.byteLength(source) < 64 * 1024);
  assert.match(sql.trim(), /^WITH\b/);
  assert.equal((sql.match(/;/g) ?? []).length, 1);
  assert.match(sql.trim(), /\) AS catalog\s+FROM admission ch;$/);
  assert.doesNotMatch(
    sql,
    /\b(?:BEGIN|COMMIT|ROLLBACK|SET|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|GRANT|REVOKE|COPY|CALL|DO|EXECUTE|TRUNCATE|VACUUM|ANALYZE|INTO|LIMIT|OFFSET)\b/i,
  );
  assert.doesNotMatch(source, /\$[A-Za-z0-9_]*\$/);
  assert.doesNotMatch(sql, /\b(?:auth|storage|public|shop_manager)\s*\./i);
});

test("static: only exact pg_catalog/CTE sources and allowlisted builtins; negative controls reject ingress", () => {
  checkSources(source);
  assert.throws(() =>
    checkSources(source.replace("FROM roles r", "FROM public.business_inventory_items r")),
  );
  assert.throws(() => checkSources(source.replace("FROM roles r", "FROM true r")));
  assert.throws(() => checkSources(source.replace("FROM roles r", "FROM false r")));
  assert.throws(() => checkSources(source.replace("pg_catalog.sha256(", "public.secret_helper(")));
  assert.throws(() =>
    checkSources(source.replace("pg_catalog.sha256(", "pg_catalog.pg_read_file(")),
  );
  assert.throws(() => checkSources(source.replace("pg_catalog.sha256(", "secret_helper(")));
  assert.throws(() => checkSources(source.replace("pg_catalog.sha256(", "SELECT secret_helper(")));
  assert.throws(() =>
    checkSources(
      source.replace("FROM roles r", "FROM (SELECT * FROM public.business_inventory_items) r"),
    ),
  );
});

test("static: the complete reviewed unqualified token set separates reserved subquery syntax from callables", () => {
  const tokens = [
    ...new Set([...sql.matchAll(/(?<![\w.])([a-z_]\w*)\s*\(/gi)].map((match) => match[1])),
  ].sort();
  assert.deepEqual(tokens, [
    "AND",
    "AS",
    "COALESCE",
    "EXISTS",
    "IN",
    "MATERIALIZED",
    "OR",
    "SELECT",
    "VALUES",
    "WHEN",
    "fixed_roles",
    "reader_catalog_names",
    "requested_functions",
    "requested_relations",
    "x",
  ]);
  assert.equal(tokens.filter((token) => token === "SELECT").length, 1);
  assert.throws(() => checkSources(source.replace("pg_catalog.sha256(", "select_secret_helper(")));
});

test("static: both fixed stock domains and all requested names/overloads are explicit", () => {
  assert.equal(relations.length, 29);
  assert.equal(functions.length, 33);
  assert.equal(new Set(relations).size, relations.length);
  assert.equal(new Set(functions).size, functions.length);
  assert.deepEqual(cteTuples("requested_relations(", "requested_functions("), relations);
  assert.deepEqual(cteTuples("requested_functions(", "fixed_roles("), functions);
  assert.match(source, /VALUES \('anon'\),\('authenticated'\),\('service_role'\)/);
  assert.match(source, /WHERE c\.relkind IN \('r','p','v','m','f'\)/);
  assert.match(source, /q\.schema_name=n\.nspname AND q\.function_name=p\.proname/);
  assert.doesNotMatch(source, /p\.pronargs\s*=/);
});

test("static: reader completeness requires exact catalog footprint, SELECT and inactive RLS without role override", () => {
  const readerBlock = source.slice(
    source.indexOf("reader_catalog_names("),
    source.indexOf("reader_catalogs AS"),
  );
  assert.deepEqual(
    [...readerBlock.matchAll(/\('([^']+)'\)/g)].map((match) => match[1]),
    [...catalogs],
  );
  assert.match(source, /pg_catalog\.has_table_privilege\(c\.oid,'SELECT'\)/);
  assert.match(source, /pg_catalog\.row_security_active\(c\.oid\)/);
  assert.match(
    source,
    /relrowsecurity IS DISTINCT FROM false OR active_rls IS DISTINCT FROM false/,
  );
  assert.match(source, /o\.reader_catalogs=12 AND o\.roles=3 AND NOT o\.reader_metadata_refused/);
  assert.match(source, /catalog-reader-metadata-refused/);
  assert.match(source, /missing-fixed-role/);
  assert.doesNotMatch(sql, /\b(?:SET_CONFIG|SET_ROLE|PG_HAS_ROLE|CURRENT_USER|SESSION_USER)\b/i);
  assert.deepEqual(
    [...source.matchAll(/pg_catalog\.current_setting\('([^']+)'\)/g)].map((match) => match[1]),
    ["server_version_num"],
  );
});

test("static: bounded exact-token text frontier, direct dependencies and any-schema trigger functions, no execution", () => {
  assert.match(
    source,
    /WHERE n\.nspname IN \('public','shop_manager'\) AND p\.prokind IN \('f','p','w'\)/,
  );
  assert.match(
    source,
    /p\.prosrc ~\* \('\(\^\|\[\^\[:alnum:\]_\$\]\)'\|\|q\.relation_name\|\|'\(\[\^\[:alnum:\]_\$\]\|\$\)'\)/,
  );
  assert.match(source, /pg_catalog\.count\(\*\) FROM discovery_scan\)<=c\.discovery_functions/);
  assert.match(source, /pg_catalog\.octet_length\(p\.prosrc\)<=c\.discovery_body_bytes/);
  assert.match(
    source,
    /d\.classid='pg_catalog\.pg_proc'::regclass AND d\.refclassid='pg_catalog\.pg_class'::regclass/,
  );
  assert.match(source, /OR EXISTS\(SELECT 1 FROM triggers_raw t WHERE t\.tgfoid=p\.oid\)/);
  assert.match(source, /pg_catalog\.count\(\*\) FROM functions_candidates\)<=c\.functions/);
  assert.match(source, /'requested',p\.requested,'triggerAttached',p\.trigger_attached/);
  assert.match(
    source,
    /'relationDependency',p\.relation_dependency,'textualMention',p\.textual_mention/,
  );
  assert.match(
    source,
    /Comments\/strings may produce candidates; indirect\/dynamic SQL may be absent/,
  );
});

test("static: fixed count and byte caps refuse the whole metadata vector, not a LIMIT-based partial", () => {
  for (const [count, name] of [
    [1024, "columns"],
    [512, "constraints"],
    [512, "indexes"],
    [512, "policies"],
    [1024, "triggers"],
    [256, "functions"],
    [4096, "discovery_functions"],
    [65536, "expression_bytes"],
    [131072, "definition_bytes"],
    [131072, "discovery_body_bytes"],
    [16384, "acl_bytes"],
    [16384, "config_bytes"],
    [16384, "trigger_argument_bytes"],
    [64, "config_keys"],
    [64, "policy_roles"],
    [16384, "policy_role_bytes"],
    [65536, "signature_bytes"],
  ])
    assert.match(source, new RegExp(`\\b${count} AS ${name}\\b`));
  for (const vector of vectors) {
    const marker = `'${vector}',CASE WHEN NOT ch.emit_vectors THEN '[]'::jsonb ELSE`;
    assert.equal(source.split(marker).length, 2, vector);
  }
  assert.equal(
    (source.match(/CASE WHEN NOT ch\.emit_vectors THEN '\[\]'::jsonb ELSE/g) ?? []).length,
    8,
  );
  assert.match(source, /ch\.reader_metadata_complete AND NOT ch\.truncated AS emit_vectors/);
  for (const count of [
    "columns",
    "constraints",
    "indexes",
    "policies",
    "triggers",
    "functions",
    "discovery_functions",
  ])
    assert.ok(source.includes(`o.${count}>c.${count}`), count);
  for (const prefix of [
    "schema",
    "relation",
    "column",
    "constraint",
    "index",
    "policy",
    "trigger",
    "discovery",
    "function",
  ])
    assert.ok(source.includes(`OR o.${prefix}_bytes_exceeded`), prefix);
  for (const scalar of [
    "expression",
    "attacl::text",
    "nspacl::text",
    "relacl::text",
    "using_expression",
    "check_expression",
    "polroles::text",
    "tgargs",
    "prosrc",
    "signature",
    "proacl::text",
    "proconfig::text",
    "definition",
  ])
    assert.ok(source.includes(`pg_catalog.octet_length(${scalar})>`), scalar);
  assert.match(source, /pg_catalog\.cardinality\(polroles\)>caps\.policy_roles/);
  assert.match(source, /pg_catalog\.cardinality\(proconfig\),0\)>caps\.config_keys/);
  assert.doesNotMatch(sql, /\b(?:LIMIT|OFFSET)\b/i);
});

test("static: only fingerprints, never raw bodies/expressions/ACL/config/trigger argument values", () => {
  assert.match(source, /pg_catalog\.sha256\(pg_catalog\.convert_to\(/);
  assert.match(source, /'argumentsSha256',pg_catalog\.encode\(pg_catalog\.sha256\(t\.tgargs\)/);
  assert.match(
    source,
    /'definitionSha256',pg_catalog\.encode\(pg_catalog\.sha256\(pg_catalog\.convert_to\(p\.definition,'UTF8'\)\),'hex'\)/,
  );
  assert.match(
    source,
    /pg_catalog\.replace\(p\.prosrc,pg_catalog\.chr\(13\)\|\|pg_catalog\.chr\(10\),pg_catalog\.chr\(10\)\)/,
  );
  const rawOutput =
    /'(?:definition|body|expression|using_expression|check_expression|prosrc|proconfig|tgargs|acl|configKeys|configValues|arguments|owner|userId|sessionId|email|password)'\s*,/;
  assert.doesNotMatch(source, rawOutput);
  assert.match(source.replace("'definitionSha256',", "'definition',"), rawOutput);
  assert.match(source, /'expressionColumn',x\.number=0/);
  assert.doesNotMatch(source, /\bdigest\s*\(/i);
  assert.doesNotMatch(source, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  assert.doesNotMatch(source, /(?:sb_secret_|sb_publishable_|Bearer |eyJ[A-Za-z0-9_-]+\.)/);
});

test("static: effective three-role table/column writes and function EXECUTE do not substitute RLS/session authority", () => {
  for (const operation of [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "TRUNCATE",
    "REFERENCES",
    "TRIGGER",
  ])
    assert.ok(source.includes(`pg_catalog.has_table_privilege(p.oid,r.oid,'${operation}')`));
  for (const operation of ["SELECT", "INSERT", "UPDATE", "REFERENCES"])
    assert.ok(
      source.includes(
        `pg_catalog.has_column_privilege(p.oid,a.relation_oid,a.attnum,'${operation}')`,
      ),
    );
  assert.match(source, /pg_catalog\.has_function_privilege\(r\.oid,p\.oid,'EXECUTE'\)/);
  assert.match(source, /pg_catalog\.has_schema_privilege\(r\.oid,p\.schema_oid,'USAGE'\)/);
  assert.match(source, /'rls',r\.relrowsecurity,'forceRls',r\.relforcerowsecurity/);
  assert.match(source, /'securityDefiner',p\.prosecdef/);
  assert.match(source, /inherited\/PUBLIC effects but are not RLS row admission/);
});

test("static: missing objects are explicit and distinct from bounded metadata, all acceptance flags remain false", () => {
  assert.match(source, /'boundedMetadataComplete',ch\.emit_vectors/);
  assert.match(
    source,
    /'allRequestedObjectsPresent',NOT EXISTS\(SELECT 1 FROM missing_relations\) AND NOT EXISTS\(SELECT 1 FROM missing_functions\)/,
  );
  assert.match(source, /'missingRelations',COALESCE/);
  assert.match(source, /'missingFunctions',COALESCE/);
  assert.match(source, /'projectRef','wjxaajgvddtrxxtocxen'/);
  assert.match(source, /'mode','read-only-selected-stock-catalog-fingerprints-v1'/);
  for (const marker of [
    "sourceCorrespondence",
    "allWriters",
    "nativeAuthority",
    "recovery",
    "release",
  ])
    assert.ok(source.includes(`'${marker}',false`));
  assert.match(source, /projectRef is a literal scope label/);
  assert.match(source, /not provisioning authority/);
  assert.match(source, /not complete procedural\/dynamic SQL/);
  assert.match(source, /No durable operation\/idempotency\/unknown-outcome reconciliation/);
});
