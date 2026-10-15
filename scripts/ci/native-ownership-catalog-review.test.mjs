// Read-only catalog artifact contract; no business data, RPC, network or DB.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
const sql = read("scripts/ci/native-ownership-catalog-review.sql");
const raw = read("docs/evidence/native-ownership-claim-catalog-2026-10-15.json");
const observed = JSON.parse(raw);
const hash = (value) => createHash("sha256").update(value).digest("hex");

test("review query and dated catalog bytes are independently pinned", () => {
  assert.equal(Buffer.byteLength(sql), 7257);
  assert.equal(hash(sql), "1bca0f1f2bb3cdcaa6ad96f3159ebbfefaa20eb54977abcc51d1bfef05bcfdbe");
  assert.equal(Buffer.byteLength(raw), 34859);
  assert.equal(hash(raw), "d5caade20f8218117fc41d139d581a7e61ab2ad501d1b077cc278bf5ca3dca3a");
});

test("catalog review is a bounded read-only transaction with catalog-only relation reads", () => {
  assert.match(sql, /BEGIN READ ONLY;/);
  assert.match(sql, /SET LOCAL statement_timeout='5000ms';/);
  assert.match(sql, /SET LOCAL lock_timeout='1000ms';/);
  assert.match(sql, /SET LOCAL search_path=pg_catalog,pg_temp;/);
  assert.match(sql, /ROLLBACK;\s*$/);
  // Strip comments and string literals only for this static surface control.
  // This is not a SQL parser, SQL authorization proof or substitute for the
  // actual READ ONLY execution reported in the dated observation.
  const surface = sql.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
  assert.doesNotMatch(
    surface,
    /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|EXECUTE|COPY|CALL|COMMIT)\b/i,
  );
  assert.doesNotMatch(surface, /\b(?:FROM|JOIN)\s+(?:public|auth|shop_manager)\./i);
  assert.doesNotMatch(surface, /\b(?:public|auth|shop_manager)\.[a-z_]+\s*\(/i);
  assert.doesNotMatch(sql, /pg_read_file|pg_ls_dir|lo_import|COPY.*PROGRAM/i);
});

test("dated metadata identity and bounded selected objects do not promote lineage or parity", () => {
  assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(observed.mode, "read-only-catalog");
  assert.equal(observed.observedAtUtc, "2026-10-15T03:28:20.852805");
  assert.equal(observed.serverVersion, "17.6");
  assert.ok(Buffer.byteLength(raw) < 64 * 1024);
  assert.deepEqual(
    observed.tables.map((record) => record.table),
    ["business_claim_audit", "business_claim_requests", "businesses"],
  );
  assert.equal(observed.functions.length, 7);
  assert.equal(observed.columns.length, 33);
  assert.equal(observed.policies.length, 12);
  assert.equal(observed.triggers.length, 12);
  assert.match(observed.limits, /No customer\/auth\/business\/claim\/audit content or row counts/);
  assert.match(observed.limits, /migration provenance, baseline\/parity or release acceptance/);
  for (const field of [
    "rows",
    "businessRows",
    "appliedHistory",
    "acceptedBaseline",
    "releaseReady",
  ])
    assert.ok(!Object.hasOwn(observed, field));
});

test("service-only approval is distinguished from public role lookup and table ACL versus RLS", () => {
  const approval = observed.functions.find(
    (record) => record.signature === "public.approve_business_claim(uuid,boolean)",
  );
  assert.ok(approval);
  assert.equal(approval.bodyMd5Lf, "bad56233bdb5168c543db21995aa5ed6");
  assert.equal(approval.definitionMd5, "e920491d076114fcd68cfef040693f52");
  assert.equal(approval.acl, "{postgres=X/postgres,service_role=X/postgres}");
  assert.equal(approval.anonExecute, false);
  assert.equal(approval.authenticatedExecute, false);
  assert.equal(approval.serviceExecute, true);
  assert.equal(approval.postgresExecute, true);
  assert.equal(approval.securityDefiner, true);
  const lookup = observed.functions.find(
    (record) => record.signature === "public.can_moderate(uuid)",
  );
  assert.equal(lookup.authenticatedExecute, true);
  assert.equal(lookup.anonExecute, true);
  for (const table of observed.tables) {
    assert.equal(table.rls, true);
    assert.equal(table.forceRls, false);
    assert.equal(table.inheritanceEdges, 0);
    for (const rights of table.rights)
      for (const key of ["select", "insert", "update", "delete"]) assert.equal(rights[key], true);
  }
  assert.equal(
    observed.policies.find((record) => record.name === "Block direct inserts").check,
    "false",
  );
  assert.match(
    observed.policies.find((record) => record.name === "Staff update claims").using,
    /can_moderate/,
  );
});

test("owner-intent incoming attachment remains visible rather than silently certified or stubbed", () => {
  const selected = observed.triggers.filter((record) => record.table === "business_claim_requests");
  assert.deepEqual(
    selected.map((record) => record.name),
    ["trg_bcr_touch", "trg_claim_audit_status"],
  );
  const incoming = observed.triggers.find(
    (record) => record.name === "businesses_recompute_intent",
  );
  assert.ok(incoming);
  assert.equal(incoming.functionBodyMd5Lf, "46b92e78631dff66834b7e4035b4e251");
  assert.match(incoming.definition, /UPDATE OF owner_id/);
  assert.equal(observed.triggers.filter((record) => record.table === "businesses").length, 10);
  assert.equal(
    observed.triggers.filter((record) => record.table === "business_claim_audit").length,
    0,
  );
});
