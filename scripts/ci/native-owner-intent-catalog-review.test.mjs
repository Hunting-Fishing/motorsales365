// Dated, privacy-reviewed catalog contracts. No network, application rows or SQL execution.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
const artifacts = [
  [
    "scripts/ci/native-owner-intent-catalog-review.sql",
    7029,
    "e78e67538224878c8e807f1d1800c27c92a0421acb37921bcccb41c3e5078ebf",
  ],
  [
    "scripts/ci/native-owner-intent-enum-review.sql",
    1145,
    "6f5ced4ab26ef060483414f8b484fb761bfccd37db407e988081f44f7ad3a7e0",
  ],
  [
    "docs/evidence/native-owner-intent-catalog-2026-10-15.json",
    37602,
    "a82598cdf7fd1f1d3310c23e09ecf1885ca9b30f82adefddaf9a8f7d9fb42dad",
  ],
  [
    "docs/evidence/native-owner-intent-enums-2026-10-15.json",
    770,
    "a83137d5b93403dab43ad87bb43d69a6b2f6dfd2ebc7b2a23092664337574c65",
  ],
];
const observed = JSON.parse(read(artifacts[2][0]));
const enumObserved = JSON.parse(read(artifacts[3][0]));
const fn = (signature) => {
  const result = observed.functions.find((record) => record.signature === signature);
  assert.ok(result, signature);
  return result;
};

test("both reviewed queries and separate dated observations have immutable LF pins", () => {
  for (const [path, bytes, sha] of artifacts) {
    const raw = read(path);
    assert.equal(Buffer.byteLength(raw), bytes, path);
    assert.equal(createHash("sha256").update(raw).digest("hex"), sha, path);
  }
});

test("queries contain read-only time-bounded catalog surfaces, not helper or application reads", () => {
  for (const [path] of artifacts.slice(0, 2)) {
    const sql = read(path);
    assert.match(sql, /BEGIN READ ONLY;/);
    assert.match(sql, /SET LOCAL statement_timeout\s*=\s*'(?:5000ms|5s)';/);
    assert.match(sql, /SET LOCAL lock_timeout\s*=\s*'(?:1000ms|1s)';/);
    assert.match(sql, /SET LOCAL search_path\s*=\s*pg_catalog,\s*pg_temp;/);
    assert.match(sql, /ROLLBACK;\s*$/);
    // Static bounded controls, not a SQL parser or replacement for READ ONLY execution.
    const surface = sql.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
    assert.doesNotMatch(
      surface,
      /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|EXECUTE|COPY|CALL|COMMIT)\b/i,
    );
    assert.doesNotMatch(surface, /\b(?:FROM|JOIN)\s+(?:public|auth|shop_manager)\./i);
    assert.doesNotMatch(surface, /\b(?:public|auth|shop_manager)\.[a-z_]+\s*\(/i);
    assert.doesNotMatch(sql, /pg_read_file|pg_ls_dir|lo_import|COPY.*PROGRAM/i);
  }
});

test("capture bounds distinguish current metadata from application data and applied lineage", () => {
  assert.equal(observed.observedAtUtc, "2026-10-15T04:00:11.110715");
  assert.equal(enumObserved.observedAtUtc, "2026-10-15T04:08:11.297488");
  for (const catalog of [observed, enumObserved]) {
    assert.equal(catalog.projectRef, "wjxaajgvddtrxxtocxen");
    assert.equal(catalog.serverVersion, "17.6");
    for (const field of ["rows", "rowCounts", "appliedHistory", "acceptedBaseline", "releaseReady"])
      assert.ok(!Object.hasOwn(catalog, field));
  }
  assert.equal(observed.mode, "read-only-catalog");
  assert.equal(enumObserved.mode, "read-only-enum-catalog");
  assert.deepEqual(
    observed.tables.map((row) => row.table),
    ["admin_audit_log", "profiles", "user_roles"],
  );
  assert.equal(observed.functions.length, 7);
  assert.equal(observed.columns.length, 22);
  assert.equal(observed.triggers.length, 12);
  assert.equal(observed.policies.length, 12);
  assert.match(observed.limits, /No business\/auth\/profile\/audit\/role row data/);
  assert.match(observed.limits, /source-history adoption, baseline\/parity or release acceptance/);
  for (const f of observed.functions) {
    assert.ok(f.definitionBytes <= 65536);
    assert.equal(Buffer.byteLength(f.definition), f.definitionBytes);
    assert.equal(createHash("md5").update(f.definition).digest("hex"), f.definitionMd5);
    assert.match(f.definition, /^CREATE OR REPLACE FUNCTION public\./);
  }
});

test("actual enum labels are not expanded to make unreachable derivation branches pass", () => {
  assert.deepEqual(
    enumObserved.enums.map((row) => row.type),
    ["app_role", "seller_type"],
  );
  assert.deepEqual(enumObserved.enums.find((row) => row.type === "seller_type").labels, [
    "private",
    "business",
    "staff",
  ]);
  assert.deepEqual(enumObserved.enums.find((row) => row.type === "app_role").labels, [
    "admin",
    "user",
    "sales",
    "moderator",
    "support",
    "advertising",
    "sales_junior",
    "sales_senior",
    "sales_manager",
  ]);
  const derive = fn("public.derive_signup_intent(uuid)");
  assert.equal(derive.bodyMd5Lf, "eee9038a5060ac2f0a74871148972abe");
  assert.match(derive.definition, /public\.profiles/);
  assert.match(derive.definition, /public\.businesses/);
  assert.doesNotMatch(
    derive.definition,
    /public\.(?:user_roles|partners|user_referrals)|has_role\s*\(|can_support\s*\(/i,
  );
  assert.match(derive.definition, /dealer/);
  assert.match(derive.definition, /repair_shop/);
  assert.match(derive.definition, /insurance/);
});

test("both overloaded recompute signatures and asymmetric client EXECUTE remain distinct", () => {
  const one = fn("public.recompute_signup_intent(uuid)");
  const seven = fn("public.recompute_signup_intent(uuid,text,text,text,text,text,text)");
  assert.equal(one.defaults, 0);
  assert.equal(seven.defaults, 6);
  assert.equal(one.bodyMd5Lf, "bf98af3fb51d414f568de3fa34e80afa");
  assert.equal(seven.bodyMd5Lf, "0f539857998f64fb0e3bcc212941ce90");
  for (const f of [
    one,
    seven,
    fn("public.trg_businesses_recompute_intent()"),
    fn("public.trg_profiles_recompute_intent()"),
  ]) {
    assert.equal(f.acl, "{postgres=X/postgres,service_role=X/postgres}");
    assert.equal(f.anonExecute, false);
    assert.equal(f.authenticatedExecute, false);
    assert.equal(f.postgresExecute, true);
    assert.equal(f.serviceExecute, true);
    assert.equal(f.securityDefiner, true);
    assert.deepEqual(f.config, ["search_path=public"]);
  }
  const derive = fn("public.derive_signup_intent(uuid)");
  assert.equal(derive.authenticatedExecute, true);
  assert.equal(derive.anonExecute, false);
  assert.equal(
    derive.acl,
    "{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}",
  );
  // has_role/can_support are captured policy dependencies, not permissive fixture stubs.
  assert.equal(
    fn("public.has_role(uuid,public.app_role)").bodyMd5Lf,
    "dae5cfc5a8d92461a428f6702e4e65af",
  );
});

test("selected UPDATE forward chain includes timestamp, not unrelated INSERT fanouts or audit triggers", () => {
  const profileTriggers = observed.triggers.filter((row) => row.table === "profiles");
  assert.equal(profileTriggers.length, 9);
  assert.deepEqual(
    observed.triggers.filter((row) => row.table === "admin_audit_log"),
    [],
  );
  const timestamp = profileTriggers.find((row) => row.name === "set_profiles_updated");
  assert.match(timestamp.definition, /BEFORE UPDATE ON public\.profiles/);
  assert.equal(timestamp.functionBodyMd5Lf, "301a884953d37769916294bb60562e05");
  const wrapper = profileTriggers.find((row) => row.name === "profiles_recompute_intent");
  assert.deepEqual(wrapper.updateColumns, ["seller_type"]);
  assert.equal(wrapper.functionBodyMd5Lf, "8a393cd291584b8d821c01af94753c27");
  const trial = profileTriggers.find((row) => row.name === "trg_grant_business_trial");
  assert.deepEqual(trial.updateColumns, ["verification_status", "business_kind"]);
  for (const table of observed.tables) {
    assert.equal(table.owner, "postgres");
    assert.equal(table.rls, true);
    assert.equal(table.forceRls, false);
    assert.equal(table.inheritanceEdges, 0);
    assert.equal(table.partition, false);
  }
  assert.equal(observed.constraints.filter((row) => row.table === "admin_audit_log").length, 1);
  assert.equal(observed.constraints.find((row) => row.table === "admin_audit_log").type, "p");
});
