import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { classifyMigrations, hasUnverifiedSources } from "./migration-provenance.mjs";

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
