// Mandatory offline validation of the ONE supplied actual catalog observation.
// No connector/SQL/process/network, fabricated fixture, fallback or skipped gate.
// Effective ACL metadata is NOT RLS admission or native-session authority.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
const query = read("scripts/ci/stock-writer-catalog-review.sql");
const raw = read("docs/evidence/stock-writer-catalog-2026-10-17.json");
const capture = JSON.parse(raw);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const querySha = "c604084f3ebf5f7daa851bff12671ae29f8ece4f7a6525272205a931b480c292";
const evidenceSha = "638be776f0192d8f4fa5a99ed0a1d4970dabba030e038c41f56c41526888aec8";
const roles = ["anon", "authenticated", "service_role"];
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
const fixedCounts = {
  roles: 3,
  schemas: 2,
  relations: 29,
  columns: 501,
  constraints: 193,
  indexes: 83,
  policies: 49,
  triggers: 288,
  functions: 57,
  reader_catalogs: 12,
  discovery_functions: 368,
};
const refusedKeys = [
  "reader_metadata_refused",
  "schema_bytes_exceeded",
  "relation_bytes_exceeded",
  "column_bytes_exceeded",
  "constraint_bytes_exceeded",
  "index_bytes_exceeded",
  "policy_bytes_exceeded",
  "trigger_bytes_exceeded",
  "discovery_bytes_exceeded",
  "function_bytes_exceeded",
];
const sorted = (value) => [...value].sort();
const tuples = (start, end) =>
  [...query.slice(query.indexOf(start), query.indexOf(end)).matchAll(/\('([^']+)','([^']+)'\)/g)]
    .map((match) => `${match[1]}.${match[2]}`)
    .sort();
const relations = tuples("requested_relations(", "requested_functions(");
const requestedFunctions = tuples("requested_functions(", "fixed_roles(");
const caps = Object.fromEntries(
  [
    ...query
      .slice(query.indexOf("caps AS ("), query.indexOf("reader_catalog_names("))
      .matchAll(/\b(\d+) AS ([a-z_]+)\b/g),
  ].map((match) => [match[2], Number(match[1])]),
);
const readers = [
  ...query
    .slice(query.indexOf("reader_catalog_names("), query.indexOf("reader_catalogs AS"))
    .matchAll(/\('([^']+)'\)/g),
]
  .map((match) => `pg_catalog.${match[1]}`)
  .sort();
const literal = (key) => query.match(new RegExp(`'${key}','([^']+)'`))[1];
const limitsMarker = "'limits',ARRAY[";
assert.equal(query.split(limitsMarker).length, 2, "one exact limitations array marker");
const limits = [
  ...query.slice(query.indexOf(limitsMarker) + limitsMarker.length).matchAll(/^\s*'([^']+)'/gm),
].map((match) => match[1]);
const scope = {
  relations,
  requestedFunctions,
  roles,
  discovery: literal("discovery"),
  source: literal("source"),
};
const flagKeys = ["sourceCorrespondence", "allWriters", "nativeAuthority", "recovery", "release"];
function exact(value, keys) {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(), sorted(keys));
}
function bool(value) {
  assert.equal(typeof value, "boolean");
}
function integer(value, max = 100000, min = 0) {
  assert.ok(Number.isSafeInteger(value) && value >= min && value <= max);
}
function text(value, max = 512, nullable = false) {
  assert.ok(
    (nullable && value === null) ||
      (typeof value === "string" &&
        Buffer.byteLength(value) > 0 &&
        Buffer.byteLength(value) <= max),
  );
}
function fingerprint(value, nullable = false) {
  assert.ok(
    (nullable && value === null) || (typeof value === "string" && /^[a-f0-9]{64}$/.test(value)),
  );
}
function array(value, max) {
  assert.ok(Array.isArray(value) && value.length <= max);
}
function unique(value, key = (row) => row) {
  assert.equal(new Set(value.map(key)).size, value.length);
}
function acl(row) {
  bool(row.aclIsNull);
  fingerprint(row.aclSha256, true);
  assert.equal(row.aclSha256 === null, row.aclIsNull);
}
function privileges(value, keys) {
  array(value, 3);
  assert.deepEqual(sorted(value.map((row) => row.role)), roles);
  for (const row of value) {
    exact(row, ["role", ...keys]);
    keys.forEach((key) => bool(row[key]));
  }
}
function relation(row) {
  assert.ok(relations.includes(row.relation));
}
function names(value, max = 32767) {
  array(value, max);
  value.forEach((name) => text(name, 63));
  unique(value);
}
function frontier(value) {
  array(value, 29);
  unique(value);
  value.forEach((name) => assert.ok(relations.includes(name)));
}
function validate(value) {
  exact(value, [
    "projectRef",
    "mode",
    "observedAtUtc",
    "serverVersionNum",
    "scope",
    "readerMetadataComplete",
    "boundedMetadataComplete",
    "allRequestedObjectsPresent",
    "truncated",
    "metadataFailures",
    "missingRelations",
    "missingFunctions",
    "caps",
    "observedCatalogCounts",
    "readerCatalogs",
    "roles",
    ...vectors,
    "acceptance",
    "limits",
  ]);
  assert.equal(value.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(value.mode, "read-only-selected-stock-catalog-fingerprints-v1");
  assert.equal(value.observedAtUtc, "2026-10-17T01:11:13.137905");
  assert.equal(value.serverVersionNum, "170006");
  assert.equal(relations.length, 29);
  assert.equal(requestedFunctions.length, 33);
  assert.equal(readers.length, 12);
  assert.deepEqual(value.scope, scope);
  assert.deepEqual(value.caps, caps);
  assert.deepEqual(value.limits, limits);
  assert.equal(value.readerMetadataComplete, true);
  assert.equal(value.boundedMetadataComplete, true);
  assert.equal(value.truncated, false);
  assert.deepEqual(value.metadataFailures, []);
  exact(value.acceptance, flagKeys);
  flagKeys.forEach((key) => assert.equal(value.acceptance[key], false));
  exact(value.observedCatalogCounts, [...Object.keys(fixedCounts), ...refusedKeys]);
  for (const [key, count] of Object.entries(fixedCounts))
    assert.equal(value.observedCatalogCounts[key], count, key);
  refusedKeys.forEach((key) => assert.equal(value.observedCatalogCounts[key], false));
  for (const vector of vectors) {
    array(value[vector], caps[vector] ?? fixedCounts[vector]);
    assert.equal(value[vector].length, value.observedCatalogCounts[vector], vector);
  }
  integer(value.observedCatalogCounts.discovery_functions, caps.discovery_functions);
  array(value.readerCatalogs, 12);
  assert.deepEqual(sorted(value.readerCatalogs.map((row) => row.name)), readers);
  for (const row of value.readerCatalogs) {
    exact(row, ["name", "exists", "kind", "select", "rls", "activeRls"]);
    assert.equal(row.exists, true);
    assert.equal(row.select, true);
    assert.equal(row.rls, false);
    assert.equal(row.activeRls, false);
    assert.equal(row.kind, row.name === "pg_catalog.pg_roles" ? "v" : "r");
  }
  array(value.roles, 3);
  assert.deepEqual(sorted(value.roles.map((row) => row.name)), roles);
  for (const row of value.roles) {
    exact(row, ["name", "exists", "superuser", "inherit", "login", "bypassRls"]);
    assert.equal(row.exists, true);
    ["superuser", "inherit", "login", "bypassRls"].forEach((key) => bool(row[key]));
  }
  assert.deepEqual(sorted(value.schemas.map((row) => row.name)), ["public", "shop_manager"]);
  for (const row of value.schemas) {
    exact(row, ["name", "ownerSha256", "aclIsNull", "aclSha256", "privileges"]);
    fingerprint(row.ownerSha256);
    acl(row);
    privileges(row.privileges, ["usage", "create"]);
  }
  unique(value.relations, (row) => row.name);
  for (const row of value.relations) {
    exact(row, [
      "name",
      "kind",
      "ownerSha256",
      "rls",
      "forceRls",
      "aclIsNull",
      "aclSha256",
      "privileges",
    ]);
    assert.ok(relations.includes(row.name));
    assert.ok(["r", "p", "v", "m", "f"].includes(row.kind));
    fingerprint(row.ownerSha256);
    bool(row.rls);
    bool(row.forceRls);
    acl(row);
    privileges(row.privileges, [
      "schemaUsage",
      "select",
      "insert",
      "update",
      "delete",
      "truncate",
      "references",
      "trigger",
    ]);
  }
  unique(value.columns, (row) => `${row.relation}:${row.position}`);
  unique(value.columns, (row) => `${row.relation}:${row.name}`);
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
    relation(row);
    integer(row.position, 32767, 1);
    text(row.name, 63);
    text(row.type);
    bool(row.notNull);
    assert.ok(["", "a", "d"].includes(row.identity));
    assert.ok(["", "s"].includes(row.generated));
    bool(row.hasDefault);
    fingerprint(row.defaultSha256, true);
    assert.equal(row.defaultSha256 === null, !row.hasDefault);
    acl(row);
    privileges(row.privileges, ["select", "insert", "update", "references"]);
  }
  for (const vector of ["constraints", "indexes", "policies", "triggers"])
    unique(value[vector], (row) => `${row.relation}:${row.name}`);
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
    relation(row);
    text(row.name, 63);
    assert.ok(["c", "f", "p", "u", "t", "x"].includes(row.type));
    ["validated", "deferrable", "initiallyDeferred"].forEach((key) => bool(row[key]));
    text(row.referencedRelation, 512, true);
    for (const key of ["updateAction", "deleteAction"])
      assert.ok([" ", "a", "r", "c", "n", "d"].includes(row[key]));
    assert.ok([" ", "f", "p", "s"].includes(row.matchType));
    names(row.columns);
    names(row.referencedColumns);
    fingerprint(row.definitionSha256);
    if (row.type === "f") {
      assert.notEqual(row.referencedRelation, null);
      assert.equal(row.columns.length, row.referencedColumns.length);
      assert.ok(row.columns.length > 0);
    } else assert.equal(row.referencedRelation, null);
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
    relation(row);
    text(row.name, 63);
    ["unique", "primary", "valid", "ready", "live"].forEach((key) => bool(row[key]));
    integer(row.keyCount, 32);
    array(row.columns, 32);
    assert.ok(row.keyCount <= row.columns.length);
    fingerprint(row.definitionSha256);
    row.columns.forEach((column, position) => {
      exact(column, ["name", "expressionColumn", "key"]);
      text(column.name, 63, true);
      bool(column.expressionColumn);
      bool(column.key);
      assert.equal(column.name === null, column.expressionColumn);
      assert.equal(column.key, position < row.keyCount);
    });
  }
  const policyRoles = [
    "PUBLIC",
    ...roles,
    "supabase_auth_admin",
    "postgres",
    "dashboard_user",
    "unclassified-role",
  ];
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
    relation(row);
    text(row.name, 63);
    assert.ok(["*", "a", "d", "r", "w"].includes(row.command));
    bool(row.permissive);
    array(row.roles, caps.policy_roles);
    row.roles.forEach((role) => assert.ok(policyRoles.includes(role)));
    fingerprint(row.rolesSha256);
    fingerprint(row.usingSha256, true);
    fingerprint(row.checkSha256, true);
  }
  const signatures = new Set(value.functions.map((row) => row.signature));
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
    relation(row);
    text(row.name, 63);
    assert.ok(["O", "D", "R", "A"].includes(row.enabled));
    bool(row.internal);
    integer(row.typeBits, 32767);
    text(row.constraintName, 63, true);
    text(row.function, caps.signature_bytes);
    assert.ok(signatures.has(row.function));
    integer(row.argumentBytes, caps.trigger_argument_bytes);
    fingerprint(row.argumentsSha256);
    fingerprint(row.definitionSha256);
  }
  unique(value.functions, (row) => row.signature);
  for (const row of value.functions) {
    exact(row, [
      "signature",
      "requested",
      "triggerAttached",
      "relationDependency",
      "textualMention",
      "mentionedRelations",
      "relationDependencies",
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
      "configEntryCount",
      "configSha256",
      "definitionBytes",
      "definitionSha256",
      "bodySha256Lf",
      "execute",
    ]);
    text(row.signature, caps.signature_bytes);
    assert.match(row.signature, /^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*\([^;]*\)$/);
    [
      "requested",
      "triggerAttached",
      "relationDependency",
      "textualMention",
      "securityDefiner",
      "strict",
      "returnsSet",
    ].forEach((key) => bool(row[key]));
    const name = row.signature.split("(")[0];
    assert.equal(row.requested, requestedFunctions.includes(name));
    assert.ok(row.requested || row.triggerAttached || row.relationDependency || row.textualMention);
    assert.equal(
      row.triggerAttached,
      value.triggers.some((trigger) => trigger.function === row.signature),
    );
    frontier(row.mentionedRelations);
    frontier(row.relationDependencies);
    assert.equal(row.textualMention, row.mentionedRelations.length > 0);
    assert.equal(row.relationDependency, row.relationDependencies.length > 0);
    if (!row.requested && !row.triggerAttached) assert.match(name, /^(?:public|shop_manager)\./);
    fingerprint(row.ownerSha256);
    text(row.language, 63);
    assert.ok(["f", "p", "w"].includes(row.kind));
    assert.ok(["i", "s", "v"].includes(row.volatility));
    text(row.resultType);
    acl(row);
    integer(row.configEntryCount, caps.config_keys);
    fingerprint(row.configSha256, true);
    if (row.configSha256 === null) assert.equal(row.configEntryCount, 0);
    integer(row.definitionBytes, caps.definition_bytes, 1);
    fingerprint(row.definitionSha256);
    fingerprint(row.bodySha256Lf);
    privileges(row.execute, ["schemaUsage", "allowed"]);
  }
  const observedRelations = new Set(value.relations.map((row) => row.name));
  const observedRequested = new Set(
    value.functions.filter((row) => row.requested).map((row) => row.signature.split("(")[0]),
  );
  assert.deepEqual(
    value.missingRelations,
    relations.filter((name) => !observedRelations.has(name)),
  );
  assert.deepEqual(
    value.missingFunctions,
    requestedFunctions.filter((name) => !observedRequested.has(name)),
  );
  assert.deepEqual(value.missingRelations, []);
  assert.deepEqual(value.missingFunctions, ["public.throttle_network_part_inquiry"]);
  assert.equal(
    value.allRequestedObjectsPresent,
    value.missingRelations.length === 0 && value.missingFunctions.length === 0,
  );
  assert.equal(value.allRequestedObjectsPresent, false);
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  assert.doesNotMatch(serialized, /(?:sb_secret_|sb_publishable_|Bearer |eyJ[A-Za-z0-9_-]+\.)/);
  assert.doesNotMatch(
    serialized,
    /"(?:definition|body|expression|prosrc|proconfig|tgargs|acl|configValues|arguments|owner|userId|sessionId|email|password)"\s*:/,
  );
}
function reject(change) {
  const changed = structuredClone(capture);
  change(changed);
  assert.throws(() => validate(changed));
}

test("actual: immutable sole-project query and supplied first capture are mandatory, bounded and pinned", () => {
  assert.equal(limits.length, 6);
  assert.ok(!limits.includes("limits"));
  assert.equal(Buffer.byteLength(query), 27546);
  assert.equal(sha(query), querySha);
  assert.ok(Buffer.byteLength(raw) > 0 && Buffer.byteLength(raw) <= 2 * 1024 * 1024);
  assert.equal(Buffer.byteLength(raw), 856330);
  assert.equal(sha(raw), evidenceSha);
  validate(capture);
});
test("negative: a changed count, removed row or partial-vector success cannot certify complete metadata", () => {
  reject((value) => value.observedCatalogCounts.columns++);
  reject((value) => value.columns.pop());
  reject((value) => {
    value.functions = [];
    value.observedCatalogCounts.functions = 0;
  });
  reject((value) => value.caps.columns++);
});
test("negative: raw body/config/ACL/arguments, malformed digests and null defaults are rejected", () => {
  reject((value) => (value.functions[0].body = "SELECT private_value"));
  reject((value) => (value.functions[0].configValues = ["private_value"]));
  reject((value) => (value.triggers[0].arguments = "private_value"));
  reject((value) => (value.functions[0].bodySha256Lf = "not-a-digest"));
  reject((value) => (value.columns.find((row) => row.hasDefault).defaultSha256 = null));
});
test("negative: authority/release promotion or silent missing-function invention is rejected", () => {
  for (const key of flagKeys) reject((value) => (value.acceptance[key] = true));
  reject((value) => (value.allRequestedObjectsPresent = true));
  reject((value) => (value.missingFunctions = []));
  reject((value) => (value.functions.find((row) => row.requested).requested = false));
});
test("negative: reader/RLS refusal, role substitution, leaked UUID/secret or invented scope cannot pass", () => {
  reject((value) => (value.readerCatalogs[0].activeRls = true));
  reject((value) => (value.readerMetadataComplete = false));
  reject((value) => (value.relations[0].privileges[0].role = "platform_admin"));
  // Legal-length metadata strings keep their surrounding shape, so the final
  // privacy bans themselves reject these values, not an unrelated limits check.
  reject((value) => (value.columns[0].name = "11111111-1111-4111-8111-111111111111"));
  reject((value) => (value.columns[0].name = "sb_secret_do_not_return"));
  reject((value) => value.scope.relations.push("auth.users"));
});
