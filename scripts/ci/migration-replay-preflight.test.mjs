import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import {
  detectCostFixReplayHazards,
  evaluateMigrationReplay,
} from "./migration-replay-preflight.mjs";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const fixName = "20260901021500_fix_counter_sale_inventory_cost.sql";
const fixSql = fs.readFileSync(new URL(fixName, migrations), "utf8");
const sourceName = "20260831193523_counter_sales_registers_pricebook.sql";
const snapshot = { project: "disposable-fixture", history: [], legacyApplied: [] };
const sha = (sql) => createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
const file = (name, sql) => ({ name, sql });

// Minimal inline signature/body fixture, NOT the complete sales application.
// No dataDir, URL, connection string, environment secret, or network endpoint.
const fixture = (reference) => `
CREATE SCHEMA shop_manager;
CREATE TABLE shop_manager.replay_cost_probe(cost_snapshot numeric);
CREATE FUNCTION shop_manager.complete_counter_sale(
  _register_session_id uuid, _customer_id uuid, _tender_type text,
  _amount_tendered numeric, _lines jsonb, _discount numeric,
  _tax numeric, _approval_id uuid
) RETURNS jsonb LANGUAGE plpgsql AS $counter$
DECLARE i record;
BEGIN
  SELECT 12.50::numeric AS cost_per_unit INTO i;
  INSERT INTO shop_manager.replay_cost_probe(cost_snapshot) VALUES(${reference});UPDATE shop_manager.replay_cost_probe SET cost_snapshot=cost_snapshot;
  RETURN jsonb_build_object('cost_snapshot', (SELECT cost_snapshot FROM shop_manager.replay_cost_probe LIMIT 1));
END;
$counter$;
`;
const original = file(sourceName, fixture("i.cost"));
const corrected = file(sourceName, fixture("i.cost_per_unit"));
const fix = file(fixName, fixSql);
const verified = (files) => ({
  ...snapshot,
  legacyApplied: files.map(({ name, sql }) => ({ source_file: name, source_sha256: sha(sql) })),
});
const bodyQuery =
  "select prosrc from pg_proc where oid='shop_manager.complete_counter_sale(uuid,uuid,text,numeric,jsonb,numeric,numeric,uuid)'::regprocedure";
const callQuery =
  "select shop_manager.complete_counter_sale(null::uuid,null::uuid,'cash',0::numeric,'[]'::jsonb,0::numeric,0::numeric,null::uuid) as result";

test("actual historical SQL corrects original cost reference in disposable PGlite", async () => {
  const db = new PGlite();
  try {
    await db.exec(original.sql);
    assert.match((await db.query(bodyQuery)).rows[0].prosrc, /i\.cost\);UPDATE/);
    await assert.rejects(db.query(callQuery), /record "i" has no field "cost"/);
    await db.exec(fixSql);
    const body = (await db.query(bodyQuery)).rows[0].prosrc;
    assert.ok(body.includes("i.cost_per_unit);UPDATE"));
    assert.ok(!body.includes("i.cost);UPDATE"));
    assert.deepEqual((await db.query(callQuery)).rows[0].result, { cost_snapshot: 12.5 });
    await assert.rejects(db.exec(fixSql), /Expected inventory cost reference was not found/);
    assert.equal((await db.query(bodyQuery)).rows[0].prosrc, body);
  } finally {
    await db.close();
  }
});

test("actual historical SQL fails on an already-corrected disposable fixture", async () => {
  const db = new PGlite();
  try {
    await db.exec(corrected.sql);
    const before = (await db.query(bodyQuery)).rows[0].prosrc;
    await assert.rejects(db.exec(fixSql), /Expected inventory cost reference was not found/);
    assert.equal((await db.query(bodyQuery)).rows[0].prosrc, before);
    assert.deepEqual((await db.query(callQuery)).rows[0].result, { cost_snapshot: 12.5 });
  } finally {
    await db.close();
  }
});

test("verified historical hashes do not override the folded-in cost replay hazard", () => {
  const files = [corrected, fix];
  const report = evaluateMigrationReplay({ files, snapshot: verified(files) });
  assert.equal(report.sourceEvidenceComplete, true);
  assert.equal(report.status, "blocked");
  assert.equal(report.findings[0].code, "HISTORICAL_COST_FIX_ALREADY_FOLDED_IN");
  assert.deepEqual(report.findings[0].sources, [sourceName, fixName]);
  assert.equal(report.fullReplayVerified, false);
  assert.equal(report.databaseReleaseApproved, false);
});

test("recognized original patch precondition passes only limited static checks", () => {
  const files = [fix, original]; // source order must be timestamp order, not input order
  const before = JSON.stringify(files);
  const report = evaluateMigrationReplay({ files, snapshot: verified(files) });
  assert.equal(report.status, "source_checks_passed_not_release_approval");
  assert.equal(report.baselineVerified, false);
  assert.equal(report.databaseReleaseApproved, false);
  assert.equal(JSON.stringify(files), before);
});

test("unknown provenance blocks even when no recognized replay trap is present", () => {
  const report = evaluateMigrationReplay({ files: [original], snapshot });
  assert.equal(report.status, "blocked");
  assert.equal(report.sourceEvidenceComplete, false);
  assert.equal(report.counts.unclassified, 1);
  assert.equal(report.findings[0].code, "UNVERIFIED_MIGRATION_SOURCES");
});

test("same timestamp without retained SQL hash cannot pass provenance", () => {
  const recorded = {
    ...snapshot,
    history: [{ version: sourceName.slice(0, 14), name: "counter_sales_registers_pricebook" }],
  };
  const report = evaluateMigrationReplay({ files: [original], snapshot: recorded });
  assert.equal(report.counts.recordedVersionUnverified, 1);
  assert.equal(report.status, "blocked");
});

test("LF-normalized retained SQL hash is source evidence, not baseline approval", () => {
  const recorded = { ...snapshot, history: [{ version: sourceName.slice(0, 14) }] };
  const report = evaluateMigrationReplay({
    files: [file(sourceName, original.sql.replaceAll("\n", "\r\n"))],
    snapshot: recorded,
    hashEvidence: {
      project: snapshot.project,
      historySqlHashes: [{ version: sourceName.slice(0, 14), sql_sha256_lf: sha(original.sql) }],
    },
  });
  assert.equal(report.sourceEvidenceComplete, true);
  assert.equal(report.baselineVerified, false);
  assert.equal(report.fullReplayVerified, false);
});

test("missing, post-patch, or ambiguous counter definition fails closed", () => {
  assert.equal(detectCostFixReplayHazards([fix])[0].code, "COST_FIX_PRECONDITION_UNPROVEN");
  assert.equal(
    detectCostFixReplayHazards([fix, { ...original, name: "20260902000000_late.sql" }])[0].code,
    "COST_FIX_PRECONDITION_UNPROVEN",
  );
  const ambiguous = {
    ...original,
    sql: original.sql.replace("END;", "-- i.cost_per_unit);UPDATE\nEND;"),
  };
  assert.equal(
    detectCostFixReplayHazards([ambiguous, fix])[0].code,
    "COST_FIX_PRECONDITION_UNPROVEN",
  );
});

test("a changed historical patch is not silently treated as recognized", () => {
  const changed = { ...fix, sql: fix.sql.replace("IF corrected = ddl THEN", "IF false THEN") };
  assert.equal(
    detectCostFixReplayHazards([original, changed])[0].code,
    "COST_FIX_SOURCE_SHAPE_UNRECOGNIZED",
  );
});

test("an unrecognized later function definition cannot fall back to an earlier known body", () => {
  const changedDefinition = file(
    "20260901010000_replaced_function.sql",
    "CREATE OR REPLACE FUNCTION shop_manager.complete_counter_sale() RETURNS jsonb LANGUAGE sql AS 'select null::jsonb';",
  );
  const findings = detectCostFixReplayHazards([original, changedDefinition, fix]);
  assert.equal(findings[0].code, "COST_FIX_PRECONDITION_UNPROVEN");
  assert.deepEqual(findings[0].sources, [changedDefinition.name, fix.name]);
});

test("empty sources, duplicate timestamps, malformed hashes, and wrong project reject", () => {
  const run = (files, state = snapshot, hashEvidence) =>
    evaluateMigrationReplay({ files, snapshot: state, hashEvidence });
  assert.throws(() => run([]), /No migration files/);
  assert.throws(() => run([original, original]), /duplicate migration sources/);
  assert.throws(
    () => run([original, { ...original, name: sourceName.replace("pricebook", "other") }]),
    /Duplicate source timestamps/,
  );
  assert.throws(() => run([original], { ...snapshot, history: null }), /recorded history/);
  assert.throws(
    () =>
      run([original], {
        ...snapshot,
        legacyApplied: [{ source_file: sourceName, source_sha256: "bad" }],
      }),
    /legacy hash evidence/,
  );
  assert.throws(
    () => run([original], snapshot, { project: "wrong-project", historySqlHashes: [] }),
    /project mismatch/,
  );
});

test("repository CLI fails closed and emits metadata, not SQL or deployment commands", () => {
  const cli = fileURLToPath(new URL("./migration-replay-preflight.mjs", import.meta.url));
  const provenance = fileURLToPath(
    new URL("../../docs/evidence/migration-provenance-2026-10-14.json", import.meta.url),
  );
  const hashes = fileURLToPath(
    new URL("../../docs/evidence/post-cutover-migration-hashes-2026-10-14.json", import.meta.url),
  );
  const result = spawnSync(process.execPath, [cli, provenance, hashes], { encoding: "utf8" });
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.mode, "offline-read-only");
  assert.equal(report.status, "blocked");
  assert.ok(
    report.findings.some((finding) => finding.code === "HISTORICAL_COST_FIX_ALREADY_FOLDED_IN"),
  );
  assert.ok(report.findings.some((finding) => finding.code === "UNVERIFIED_MIGRATION_SOURCES"));
  assert.equal(report.databaseReleaseApproved, false);
  assert.ok(!result.stdout.includes("CREATE OR REPLACE FUNCTION"));
  assert.ok(!result.stdout.includes("migration repair"));
  assert.ok(!result.stdout.includes("db push"));
});

test("CLI has no execute/repair option and rejects malformed invocation", () => {
  const cli = fileURLToPath(new URL("./migration-replay-preflight.mjs", import.meta.url));
  for (const args of [[], ["--execute"], ["missing.json"]]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
  }
});
