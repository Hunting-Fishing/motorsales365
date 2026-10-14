import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { classifyMigrations, hasUnverifiedSources } from "./migration-provenance.mjs";
import { evaluateMigrationReplay } from "./migration-replay-preflight.mjs";

const sql = "select 1;\n";
const hash = createHash("sha256").update(sql).digest("hex");
const snapshot = {
  project: "test-project",
  history: [{ version: "20260101000000", name: "original" }],
  legacyApplied: [],
};
const evidence = {
  project: snapshot.project,
  historySqlHashes: [{ version: "20260101000000", sql_sha256_lf: hash }],
};
const file = (name = "20260101000000_original.sql", text = sql) => [{ name, sql: text }];

test("recorded version requires matching SQL, not just a timestamp", () => {
  const result = classifyMigrations(file(), snapshot);
  assert.equal(result.recordedVersion.length, 0);
  assert.equal(result.recordedVersionUnverified.length, 1);
  assert.equal(hasUnverifiedSources(result), true);
});
test("matching stored SQL is transport-line-ending independent", () => {
  const result = classifyMigrations(
    file(undefined, sql.replaceAll("\n", "\r\n")),
    snapshot,
    evidence,
  );
  assert.equal(result.recordedVersion.length, 1);
  assert.equal(hasUnverifiedSources(result), false);
});
test("modified SQL at an existing timestamp is a mismatch", () => {
  const result = classifyMigrations(file(undefined, "select 2;\n"), snapshot, evidence);
  assert.equal(result.recordedSqlHashMismatch.length, 1);
  assert.equal(hasUnverifiedSources(result), true);
});
test("exact source at another recorded version is evidence, not a history repair", () => {
  const result = classifyMigrations(file("20260202000000_renamed.sql"), snapshot, evidence);
  assert.deepEqual(result.remoteSqlHashMatch, [
    { source_file: "20260202000000_renamed.sql", remoteVersions: ["20260101000000"] },
  ]);
  assert.equal(hasUnverifiedSources(result), false);
  assert.equal(snapshot.history.length, 1);
});
test("names or whitespace similarity cannot classify unknown source", () => {
  const result = classifyMigrations(
    file("20260202000000_original.sql", "select  1;\n"),
    snapshot,
    evidence,
  );
  assert.equal(result.unclassified.length, 1);
  assert.equal(hasUnverifiedSources(result), true);
});
test("legacy source hashes remain verified and modified legacy SQL blocks", () => {
  const legacy = {
    ...snapshot,
    legacyApplied: [{ source_file: "20250101000000_legacy.sql", source_sha256: hash }],
  };
  assert.equal(
    classifyMigrations(file("20250101000000_legacy.sql"), legacy, evidence).legacyHashMatch.length,
    1,
  );
  const result = classifyMigrations(
    file("20250101000000_legacy.sql", "select 2;\n"),
    legacy,
    evidence,
  );
  assert.equal(result.legacyHashMismatch.length, 1);
  assert.equal(hasUnverifiedSources(result), true);
});
test("evidence from another project or unknown version is rejected", () => {
  assert.throws(
    () => classifyMigrations(file(), snapshot, { ...evidence, project: "other" }),
    /project mismatch/,
  );
  assert.throws(
    () =>
      classifyMigrations(file(), snapshot, {
        ...evidence,
        historySqlHashes: [{ ...evidence.historySqlHashes[0], version: "999" }],
      }),
    /Invalid remote/,
  );
});

const root = new URL("../../", import.meta.url);
const json = (name) => JSON.parse(fs.readFileSync(new URL(name, root), "utf8"));
const containmentFile = "20261014175040_contain_legacy_invoice_conversion_execute.sql";

test("approved containment source maps only to its exact retained remote version", () => {
  const release = json("docs/evidence/invoice-containment-migration-2026-10-15.json");
  const source = fs
    .readFileSync(new URL(`supabase/migrations/${containmentFile}`, root), "utf8")
    .replace(/\r\n/g, "\n");
  assert.equal(release.project, "wjxaajgvddtrxxtocxen");
  assert.deepEqual(release.history, [
    { version: "20261014180351", name: "contain_legacy_invoice_conversion_execute" },
  ]);
  assert.deepEqual(release.legacyApplied, []);
  assert.equal(release.historySqlHashes.length, 1);
  const retained = release.historySqlHashes[0];
  assert.equal(retained.version, release.history[0].version);
  assert.equal(retained.local_source_file, containmentFile);
  assert.equal(retained.statement_count, 1);
  assert.equal(retained.source_bytes, Buffer.byteLength(source));
  assert.equal(retained.source_bytes, 3914);
  assert.equal(retained.source_commit, "1d500beb42ef7956cb3f6f209575a3182e232c14");
  assert.equal(retained.sql_sha256_lf, createHash("sha256").update(source).digest("hex"));
  const result = classifyMigrations(file(containmentFile, source), release, release);
  assert.deepEqual(result.remoteSqlHashMatch, [
    { source_file: containmentFile, remoteVersions: ["20261014180351"] },
  ]);
  assert.deepEqual(result.recordedVersion, []);
  assert.equal(hasUnverifiedSources(result), false);
  assert.deepEqual(
    classifyMigrations(file(containmentFile, source.replaceAll("\n", "\r\n")), release, release),
    result,
  );
  assert.equal(
    classifyMigrations(file(containmentFile, source + "-- changed\n"), release, release)
      .unclassified.length,
    1,
  );
});

test("scoped containment evidence cannot approve historical replay or mutate older snapshots", () => {
  const base = json("docs/evidence/migration-provenance-2026-10-14.json");
  const hashes = json("docs/evidence/post-cutover-migration-hashes-2026-10-14.json");
  const release = json("docs/evidence/invoice-containment-migration-2026-10-15.json");
  const original = JSON.stringify([base, hashes, release]);
  assert.equal(base.project, hashes.project);
  assert.equal(base.project, release.project);
  // Explicit in-memory union for this observation only. No history writes or
  // reinterpretation of the older snapshot as a fresh full project export.
  const combined = { ...base, history: [...base.history, ...release.history] };
  const combinedHashes = {
    ...hashes,
    historySqlHashes: [...hashes.historySqlHashes, ...release.historySqlHashes],
  };
  for (const rows of [combined.history, combinedHashes.historySqlHashes]) {
    assert.equal(new Set(rows.map((row) => row.version)).size, rows.length);
  }
  const files = fs
    .readdirSync(new URL("supabase/migrations/", root))
    .filter((name) => name.endsWith(".sql"))
    .map((name) => ({
      name,
      sql: fs.readFileSync(new URL(`supabase/migrations/${name}`, root), "utf8"),
    }));
  const previous = classifyMigrations(
    files.filter((source) => source.name !== containmentFile),
    base,
    hashes,
  );
  const report = evaluateMigrationReplay({
    files,
    snapshot: combined,
    hashEvidence: combinedHashes,
  });
  assert.equal(report.status, "blocked");
  assert.equal(report.fullReplayVerified, false);
  assert.equal(report.baselineVerified, false);
  assert.equal(report.databaseReleaseApproved, false);
  assert.ok(
    report.findings.some((finding) => finding.code === "HISTORICAL_COST_FIX_ALREADY_FOLDED_IN"),
  );
  assert.ok(report.findings.some((finding) => finding.code === "UNVERIFIED_MIGRATION_SOURCES"));
  assert.deepEqual(report.classification.unclassified, previous.unclassified);
  assert.equal(report.counts.remoteSqlHashMatch, previous.remoteSqlHashMatch.length + 1);
  assert.ok(
    report.classification.remoteSqlHashMatch.some((row) => row.source_file === containmentFile),
  );
  assert.equal(JSON.stringify([base, hashes, release]), original);
});
