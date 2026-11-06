// Read-only comparison of repository SQL with an exported migration manifest.
// Never applies SQL or repairs migration history.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/ci/migration-provenance.mjs <snapshot.json>");
  process.exit(2);
}
const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
const history = new Map(snapshot.history.map((row) => [row.version, row]));
const legacy = new Map(snapshot.legacyApplied.map((row) => [row.source_file, row]));
const sha = (text) => createHash("sha256").update(text).digest("hex");
const result = {
  recordedVersion: [],
  legacyHashMatch: [],
  legacyHashMismatch: [],
  unclassified: [],
};
for (const name of fs.readdirSync("supabase/migrations").filter((name) => name.endsWith(".sql"))) {
  const sql = fs.readFileSync(path.join("supabase/migrations", name), "utf8");
  if (history.has(name.split("_")[0])) {
    result.recordedVersion.push(name);
  } else if (legacy.has(name)) {
    // Checkout line endings are transport details, not SQL changes.
    const expected = legacy.get(name).source_sha256;
    const matches = [sql, sql.replace(/\r\n/g, "\n")].some((text) => sha(text) === expected);
    result[matches ? "legacyHashMatch" : "legacyHashMismatch"].push(name);
  } else {
    result.unclassified.push(name);
  }
}
console.log(
  JSON.stringify(
    {
      project: snapshot.project,
      observedOn: snapshot.observedOn,
      counts: Object.fromEntries(
        Object.entries(result).map(([key, values]) => [key, values.length]),
      ),
      ...(process.argv.includes("--summary")
        ? { unclassified: result.unclassified, legacyHashMismatch: result.legacyHashMismatch }
        : result),
    },
    null,
    2,
  ),
);
// Matching filenames alone cannot prove schema parity. Unknown/mismatched SQL
// blocks automated baseline approval until reviewed against deployed objects.
if (result.legacyHashMismatch.length || result.unclassified.length) process.exitCode = 1;
