// Read-only comparison of repository SQL with an exported migration manifest.
// Never applies SQL or repairs migration history.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export function classifyMigrations(files, snapshot, hashEvidence) {
  if (hashEvidence && hashEvidence.project !== snapshot.project) {
    throw new Error("Migration evidence project mismatch");
  }
  const history = new Map(snapshot.history.map((row) => [row.version, row]));
  const legacy = new Map(snapshot.legacyApplied.map((row) => [row.source_file, row]));
  const remoteHashes = hashEvidence?.historySqlHashes ?? [];
  for (const row of remoteHashes) {
    if (!history.has(row.version) || !/^[a-f0-9]{64}$/.test(row.sql_sha256_lf)) {
      throw new Error("Invalid remote migration hash evidence");
    }
  }
  const sha = (text) => createHash("sha256").update(text).digest("hex");
  const result = {
    recordedVersion: [],
    recordedVersionUnverified: [],
    recordedSqlHashMismatch: [],
    legacyHashMatch: [],
    legacyHashMismatch: [],
    remoteSqlHashMatch: [],
    unclassified: [],
  };
  for (const { name, sql } of files) {
    const normalized = sql.replace(/\r\n/g, "\n");
    const hash = sha(normalized);
    const version = name.split("_")[0];
    const versionHash = remoteHashes.find((row) => row.version === version);
    if (history.has(version)) {
      if (!versionHash) result.recordedVersionUnverified.push(name);
      else
        result[
          versionHash.sql_sha256_lf === hash ? "recordedVersion" : "recordedSqlHashMismatch"
        ].push(name);
    } else if (legacy.has(name)) {
      // Checkout line endings are transport details, not SQL changes.
      const expected = legacy.get(name).source_sha256;
      const matches = [sql, normalized].some((text) => sha(text) === expected);
      result[matches ? "legacyHashMatch" : "legacyHashMismatch"].push(name);
    } else {
      const matches = remoteHashes.filter((row) => row.sql_sha256_lf === hash);
      if (matches.length) {
        result.remoteSqlHashMatch.push({
          source_file: name,
          remoteVersions: matches.map((row) => row.version),
        });
      } else result.unclassified.push(name);
    }
  }
  return result;
}

export function hasUnverifiedSources(result) {
  return [
    "legacyHashMismatch",
    "recordedVersionUnverified",
    "recordedSqlHashMismatch",
    "unclassified",
  ].some((key) => result[key].length > 0);
}

function main() {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) {
    console.error(
      "Usage: node scripts/ci/migration-provenance.mjs <snapshot.json> [history-sql-hashes.json] [--summary]",
    );
    process.exitCode = 2;
    return;
  }
  const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
  const hashFile = process.argv.slice(3).find((arg) => !arg.startsWith("--"));
  const hashEvidence = hashFile ? JSON.parse(fs.readFileSync(hashFile, "utf8")) : undefined;
  const files = fs
    .readdirSync("supabase/migrations")
    .filter((name) => name.endsWith(".sql"))
    .map((name) => ({
      name,
      sql: fs.readFileSync(path.join("supabase/migrations", name), "utf8"),
    }));
  const result = classifyMigrations(files, snapshot, hashEvidence);
  console.log(
    JSON.stringify(
      {
        project: snapshot.project,
        observedOn: snapshot.observedOn,
        counts: Object.fromEntries(
          Object.entries(result).map(([key, values]) => [key, values.length]),
        ),
        ...(process.argv.includes("--summary")
          ? {
              unclassified: result.unclassified,
              legacyHashMismatch: result.legacyHashMismatch,
              recordedVersionUnverified: result.recordedVersionUnverified,
              recordedSqlHashMismatch: result.recordedSqlHashMismatch,
              remoteSqlHashMatch: result.remoteSqlHashMatch,
            }
          : result),
      },
      null,
      2,
    ),
  );
  // Matching filenames alone cannot prove schema parity. Unknown/mismatched SQL
  // blocks automated baseline approval until reviewed against deployed objects.
  if (hasUnverifiedSources(result)) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
