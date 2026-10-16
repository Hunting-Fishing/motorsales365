// Offline scope/privacy and actual supplied catalog-shape checks only. No SQL,
// Auth/session model, connector, process, network or synthetic authority fixture.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../../", import.meta.url);
const sourcePath = "scripts/ci/auth-session-catalog-review.sql";
const evidencePath = "docs/evidence/auth-session-catalog-2026-10-17.json";
const sourceSha256 = "ed3d0459f2c01946278c57c1df7252f12337323541a2ed3fe56e290966faf7d9";
const read = (path) => fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
const source = read(sourcePath);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const sql = source.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
const roles = ["anon", "authenticated", "service_role", "supabase_auth_admin"];
const relations = ["auth.sessions", "auth.users"];
const usersColumns = ["id", "is_anonymous", "deleted_at"];
const caps = {
  columns: 96,
  constraints: 64,
  indexes: 64,
  policies: 32,
  triggers: 256,
  functions: 32,
  expression_bytes: 65536,
  definition_bytes: 65536,
  acl_bytes: 8192,
  config_bytes: 8192,
  trigger_argument_bytes: 4096,
  config_keys: 32,
  policy_roles: 32,
  policy_role_bytes: 8192,
};
const scope = {
  relations,
  usersColumns,
  roles,
  requestedFunctions: ["auth.uid()", "auth.jwt()"],
  attachedFunctions:
    "fingerprints only for selected trigger function OIDs in any schema; no execution",
  triggers: "all sessions attachments plus users DELETE and inbound sessions-FK attachments",
  source: "pg_catalog only; no Auth/application rows or row counts",
};
const shaPattern = /^[a-f0-9]{64}$/;
function exact(value, keys) {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort());
}
function fingerprint(value, nullable = false) {
  assert.ok((nullable && value === null) || (typeof value === "string" && shaPattern.test(value)));
}
function text(value, nullable = false) {
  assert.ok(
    (nullable && value === null) ||
      (typeof value === "string" && value.length > 0 && value.length <= 512),
  );
}
function bool(value) {
  assert.equal(typeof value, "boolean");
}
function count(value, max = 100000) {
  assert.ok(Number.isSafeInteger(value) && value >= 0 && value <= max);
}
function privilegeRows(value, keys) {
  assert.ok(Array.isArray(value));
  assert.deepEqual(value.map((row) => row.role).sort(), [...roles].sort());
  for (const row of value) {
    exact(row, ["role", ...keys]);
    for (const key of keys) bool(row[key]);
  }
}
function validateCapture(value) {
  exact(value, [
    "projectRef",
    "mode",
    "observedAtUtc",
    "serverVersionNum",
    "scope",
    "complete",
    "truncated",
    "failures",
    "caps",
    "observedCatalogCounts",
    "schema",
    "roles",
    "relations",
    "columns",
    "constraints",
    "indexes",
    "policies",
    "triggers",
    "functions",
    "limits",
  ]);
  assert.equal(value.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(value.mode, "read-only-auth-session-catalog-fingerprints-v1");
  assert.match(value.observedAtUtc, /^\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d+)?$/);
  assert.match(value.serverVersionNum, /^17\d{4}$/);
  assert.deepEqual(value.scope, scope);
  assert.deepEqual(value.caps, caps);
  assert.equal(value.complete, true);
  assert.equal(value.truncated, false);
  assert.deepEqual(value.failures, []);
  exact(value.schema, ["name", "owner", "ownerSha256", "aclIsNull", "aclSha256"]);
  assert.equal(value.schema.name, "auth");
  text(value.schema.owner);
  fingerprint(value.schema.ownerSha256);
  bool(value.schema.aclIsNull);
  fingerprint(value.schema.aclSha256, true);
  assert.equal(value.roles.length, 4);
  assert.deepEqual(value.roles.map((row) => row.name).sort(), [...roles].sort());
  for (const row of value.roles) {
    exact(row, ["name", "exists", "superuser", "inherit", "login", "bypassRls"]);
    assert.equal(row.exists, true);
    for (const key of ["superuser", "inherit", "login", "bypassRls"]) bool(row[key]);
  }
  assert.equal(value.relations.length, 2);
  assert.deepEqual(value.relations.map((row) => row.name).sort(), relations);
  for (const row of value.relations) {
    exact(row, [
      "name",
      "kind",
      "owner",
      "ownerSha256",
      "rls",
      "forceRls",
      "aclIsNull",
      "aclSha256",
      "privileges",
    ]);
    assert.equal(row.kind, "r");
    text(row.owner);
    fingerprint(row.ownerSha256);
    bool(row.rls);
    bool(row.forceRls);
    bool(row.aclIsNull);
    fingerprint(row.aclSha256, true);
    privilegeRows(row.privileges, ["schemaUsage", "select", "update"]);
  }
  const boundedSections = [
    "columns",
    "constraints",
    "indexes",
    "policies",
    "triggers",
    "functions",
  ];
  for (const section of boundedSections) {
    assert.ok(Array.isArray(value[section]));
    assert.ok(value[section].length <= caps[section]);
    assert.equal(value.observedCatalogCounts[section], value[section].length);
  }
  for (const row of value.columns) {
    exact(row, [
      "relation",
      "position",
      "name",
      "type",
      "notNull",
      "identity",
      "generated",
      "hasDefault",
      "defaultSha256",
      "aclIsNull",
      "aclSha256",
      "privileges",
    ]);
    assert.ok(relations.includes(row.relation));
    count(row.position, 32767);
    assert.ok(row.position > 0);
    text(row.name);
    text(row.type);
    bool(row.notNull);
    assert.ok(["", "a", "d"].includes(row.identity));
    assert.ok(["", "s"].includes(row.generated));
    bool(row.hasDefault);
    fingerprint(row.defaultSha256, true);
    assert.equal(row.defaultSha256 === null, !row.hasDefault);
    bool(row.aclIsNull);
    fingerprint(row.aclSha256, true);
    privilegeRows(row.privileges, ["select", "update"]);
  }
  assert.deepEqual(
    value.columns
      .filter((row) => row.relation === "auth.users")
      .map((row) => row.name)
      .sort(),
    [...usersColumns].sort(),
  );
  for (const name of ["id", "user_id", "not_after"]) {
    const column = value.columns.find(
      (row) => row.relation === "auth.sessions" && row.name === name,
    );
    assert.ok(column);
    assert.equal(column.type, name === "not_after" ? "timestamp with time zone" : "uuid");
    if (name !== "not_after") assert.equal(column.notNull, true);
  }
  for (const row of value.constraints) {
    exact(row, [
      "relation",
      "name",
      "type",
      "validated",
      "deferrable",
      "initiallyDeferred",
      "referencedRelation",
      "updateAction",
      "deleteAction",
      "matchType",
      "columns",
      "referencedColumns",
      "definitionSha256",
    ]);
    assert.equal(row.relation, "auth.sessions");
    text(row.name);
    text(row.type);
    bool(row.validated);
    bool(row.deferrable);
    bool(row.initiallyDeferred);
    text(row.referencedRelation, true);
    assert.ok(Array.isArray(row.columns) && Array.isArray(row.referencedColumns));
    row.columns.forEach((item) => text(item));
    row.referencedColumns.forEach((item) => text(item));
    fingerprint(row.definitionSha256);
  }
  for (const row of value.indexes) {
    exact(row, [
      "relation",
      "name",
      "unique",
      "primary",
      "valid",
      "ready",
      "live",
      "keyCount",
      "columns",
      "definitionSha256",
    ]);
    assert.equal(row.relation, "auth.sessions");
    text(row.name);
    for (const key of ["unique", "primary", "valid", "ready", "live"]) bool(row[key]);
    count(row.keyCount, 32);
    assert.ok(Array.isArray(row.columns));
    for (const column of row.columns) {
      exact(column, ["name", "expression", "key"]);
      text(column.name, true);
      bool(column.expression);
      bool(column.key);
    }
    fingerprint(row.definitionSha256);
  }
  for (const row of value.policies) {
    exact(row, [
      "relation",
      "name",
      "command",
      "permissive",
      "roles",
      "rolesSha256",
      "usingSha256",
      "checkSha256",
    ]);
    assert.equal(row.relation, "auth.sessions");
    text(row.name);
    text(row.command);
    bool(row.permissive);
    assert.ok(Array.isArray(row.roles) && row.roles.length <= caps.policy_roles);
    row.roles.forEach((item) => text(item));
    fingerprint(row.rolesSha256);
    fingerprint(row.usingSha256, true);
    fingerprint(row.checkSha256, true);
  }
  for (const row of value.triggers) {
    exact(row, [
      "relation",
      "name",
      "enabled",
      "internal",
      "typeBits",
      "constraintName",
      "function",
      "argumentBytes",
      "argumentsSha256",
      "definitionSha256",
    ]);
    assert.ok(relations.includes(row.relation));
    text(row.name);
    text(row.enabled);
    bool(row.internal);
    count(row.typeBits, 32767);
    text(row.constraintName, true);
    text(row.function);
    count(row.argumentBytes, caps.trigger_argument_bytes);
    fingerprint(row.argumentsSha256);
    fingerprint(row.definitionSha256);
  }
  for (const row of value.functions) {
    exact(row, [
      "signature",
      "requested",
      "owner",
      "ownerSha256",
      "language",
      "kind",
      "securityDefiner",
      "volatility",
      "strict",
      "returnsSet",
      "resultType",
      "aclIsNull",
      "aclSha256",
      "configKeys",
      "configSha256",
      "definitionBytes",
      "definitionSha256",
      "bodySha256Lf",
      "execute",
    ]);
    text(row.signature);
    bool(row.requested);
    text(row.owner);
    fingerprint(row.ownerSha256);
    text(row.language);
    assert.equal(row.kind, "f");
    bool(row.securityDefiner);
    text(row.volatility);
    bool(row.strict);
    bool(row.returnsSet);
    text(row.resultType);
    bool(row.aclIsNull);
    fingerprint(row.aclSha256, true);
    assert.ok(Array.isArray(row.configKeys) && row.configKeys.length <= caps.config_keys);
    for (const key of row.configKeys) assert.match(key, /^[A-Za-z_][A-Za-z0-9_.]*$/);
    fingerprint(row.configSha256, true);
    count(row.definitionBytes, caps.definition_bytes);
    fingerprint(row.definitionSha256);
    fingerprint(row.bodySha256Lf);
    privilegeRows(row.execute, ["allowed"]);
  }
  assert.deepEqual(
    value.functions
      .filter((row) => row.requested)
      .map((row) => row.signature)
      .sort(),
    ["auth.jwt()", "auth.uid()"],
  );
  assert.equal(value.observedCatalogCounts.schemas, 1);
  assert.equal(value.observedCatalogCounts.relations, 2);
  assert.equal(value.observedCatalogCounts.roles, 4);
  assert.equal(value.observedCatalogCounts.requested_functions, 2);
  for (const [key, item] of Object.entries(value.observedCatalogCounts)) {
    if (key.endsWith("_exceeded")) assert.equal(item, false);
    else count(item);
  }
  assert.ok(Array.isArray(value.limits) && value.limits.length === 4);
  assert.match(value.limits.join(" "), /no managed Auth migration lineage/);
  assert.match(value.limits.join(" "), /not permission to grant access/);
  assert.match(value.limits.join(" "), /No logout, termination/);
  const json = JSON.stringify(value);
  assert.doesNotMatch(json, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  assert.doesNotMatch(json, /(?:sb_secret_|sb_publishable_|Bearer |eyJ[A-Za-z0-9_-]+\.)/);
}

test("static: exact reviewed SQL source is pinned and contains one SELECT/CTE statement only", () => {
  assert.equal(hash(source), sourceSha256);
  assert.match(sql.trim(), /^WITH\b/i);
  assert.equal((sql.match(/;/g) ?? []).length, 1);
  assert.match(sql.trim(), /FROM checks ch;$/);
  assert.doesNotMatch(
    sql,
    /\b(?:BEGIN|COMMIT|ROLLBACK|SET|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|GRANT|REVOKE|COPY|CALL|DO|EXECUTE|TRUNCATE|VACUUM|ANALYZE|INTO)\b/i,
  );
  assert.doesNotMatch(source, /\$[A-Za-z0-9_]*\$/);
});
test("static: FROM/JOIN sources are fixed pg_catalog relations/CTEs only and all functions are allowed builtins", () => {
  const ctes = new Set([
    "fixed_roles",
    "roles",
    "caps",
    "auth_schema",
    "relations",
    "columns_raw",
    "constraints_raw",
    "indexes_raw",
    "policies_raw",
    "triggers_raw",
    "functions_raw",
    "observed",
    "checks",
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
    "unnest",
  ]);
  for (const match of sql.matchAll(/\b(?:FROM|JOIN)\s+([a-z_]\w*)(?:\.([a-z_]\w*))?/gi)) {
    if (match[2]) {
      assert.equal(match[1], "pg_catalog");
      assert.ok(catalogs.has(match[2]));
    } else assert.ok(ctes.has(match[1]), match[1]);
  }
  const functions = new Set([
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
    "sha256",
    "split_part",
    "statement_timestamp",
    "timezone",
    "to_jsonb",
    "unnest",
  ]);
  for (const match of sql.matchAll(/\b([a-z_]\w*)\.([a-z_]\w*)\s*\(/gi)) {
    assert.equal(match[1], "pg_catalog");
    assert.ok(functions.has(match[2]), match[2]);
  }
  assert.doesNotMatch(sql, /\bauth\s*\./i);
});
test("static: fingerprints only, fixed environment identity, no raw bodies/expressions/config/arguments", () => {
  assert.match(source, /pg_catalog\.sha256\(pg_catalog\.convert_to\(/);
  assert.doesNotMatch(source, /\bdigest\s*\(/i);
  assert.deepEqual(
    [...source.matchAll(/pg_catalog\.current_setting\('([^']+)'\)/g)].map((match) => match[1]),
    ["server_version_num"],
  );
  assert.match(source, /'projectRef','wjxaajgvddtrxxtocxen'/);
  const rawOutput =
    /'(?:definition|body|expression|using_expression|check_expression|prosrc|proconfig|tgargs|configValues|arguments|userId|sessionId|email|password)'\s*,/;
  const indexExpressionFlag = "'expression',x.number=0,";
  // This ONE output is a Boolean index-column marker, never an expression.
  // Keep the raw-expression ban everywhere else and prove its negative control.
  assert.equal(source.split(indexExpressionFlag).length, 2);
  assert.equal([...source.matchAll(/'expression'\s*,/g)].length, 1);
  assert.doesNotMatch(source.replace(indexExpressionFlag, ""), rawOutput);
  assert.match(source.replace(indexExpressionFlag, "'expression',i.expression,"), rawOutput);
  assert.doesNotMatch(source, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  assert.match(source, /'configKeys'.*pg_catalog\.split_part\(v\.setting,'=',1\)/);
  assert.match(source, /'argumentsSha256',pg_catalog\.encode\(pg_catalog\.sha256\(t\.tgargs\)/);
  assert.match(
    source,
    /pg_catalog\.replace\(p\.prosrc,pg_catalog\.chr\(13\)\|\|pg_catalog\.chr\(10\),pg_catalog\.chr\(10\)\)/,
  );
});
test("static: missing/cap conditions are explicit and no LIMIT silently certifies partial metadata", () => {
  assert.doesNotMatch(sql, /\bLIMIT\b/i);
  for (const section of ["column", "constraint", "index", "policy", "trigger", "function"])
    assert.match(source, new RegExp(section + "-cap-exceeded"));
  for (const marker of [
    "missing-auth-schema",
    "missing-selected-auth-relation",
    "missing-fixed-role",
    "missing-auth-uid-or-jwt-function",
    "missing-required-session-column",
    "missing-selected-user-column",
    "partitioned-relation-unreviewed",
    "metadata-byte-cap-exceeded",
    "policy-role-cap-exceeded",
  ])
    assert.ok(source.includes(marker));
  assert.match(
    source,
    /'complete',pg_catalog\.cardinality\(ch\.failures\)=0 AND NOT ch\.truncated/,
  );
  assert.match(source, /'truncated',ch\.truncated/);
  assert.match(source, /has_column_privilege\(p\.oid,a\.relation_oid,a\.attnum,'UPDATE'\)/);
});
test("actual: supplied sole-project metadata satisfies the reviewed bounded privacy/scope contract, not session authority", () => {
  // Root writes only the privacy-reviewed inner catalog object from its ONE
  // canonical query. Missing evidence FAILS; no conditional registration/skip.
  const raw = read(evidencePath);
  assert.ok(Buffer.byteLength(raw) > 0 && Buffer.byteLength(raw) <= 512 * 1024);
  validateCapture(JSON.parse(raw));
});

test("actual: first incomplete attempt is immutable and rejected; the single bounded alternative preserves scope", () => {
  const raw = read("docs/evidence/auth-session-catalog-2026-10-17-attempt-1-incomplete.json");
  assert.equal(hash(raw), "e1ffac57e1e1591c9d07ebcf3ed2d1e9dc06c820c4d79e0832585af90d023df6");
  assert.ok(Buffer.byteLength(raw) <= 512 * 1024);
  const first = JSON.parse(raw);
  assert.equal(first.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(first.mode, "read-only-auth-session-catalog-fingerprints-v1");
  assert.deepEqual(first.scope, scope);
  assert.deepEqual(first.caps, { ...caps, triggers: 64 });
  assert.equal(first.complete, false);
  assert.equal(first.truncated, true);
  assert.deepEqual(first.failures, ["trigger-cap-exceeded"]);
  assert.equal(first.observedCatalogCounts.triggers, 218);
  assert.deepEqual(first.triggers, []);
  assert.throws(() => validateCapture(first));
  const final = JSON.parse(read(evidencePath));
  assert.deepEqual(final.scope, first.scope);
  assert.deepEqual(final.caps, { ...first.caps, triggers: 256 });
  assert.equal(final.observedCatalogCounts.triggers, first.observedCatalogCounts.triggers);
  assert.equal(final.triggers.length, 218);
  assert.equal(final.complete, true);
  assert.equal(final.truncated, false);
  assert.deepEqual(final.failures, []);
});
