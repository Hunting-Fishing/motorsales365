// Offline source checks only. Never connects to a database, executes SQL,
// changes migration history, or grants release approval.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { classifyMigrations, hasUnverifiedSources } from "./migration-provenance.mjs";

const migrationName = /^\d{14}_[A-Za-z0-9_-]+\.sql$/;
const sha256 = /^[a-f0-9]{64}$/;
const targetSignature =
  "shop_manager.complete_counter_sale(uuid,uuid,text,numeric,jsonb,numeric,numeric,uuid)";

function uniqueRows(rows, field, valid, description) {
  if (!Array.isArray(rows)) throw new Error(`Missing ${description}`);
  const seen = new Set();
  for (const row of rows) {
    if (!row || !valid(row) || seen.has(row[field])) {
      throw new Error(`Invalid or duplicate ${description}`);
    }
    seen.add(row[field]);
  }
}

function validateInputs(files, snapshot, hashEvidence) {
  if (!snapshot || typeof snapshot.project !== "string" || !snapshot.project.trim()) {
    throw new Error("Missing provenance project");
  }
  if (!Array.isArray(files) || !files.length) throw new Error("No migration files supplied");
  uniqueRows(
    files,
    "name",
    (row) => migrationName.test(row.name) && typeof row.sql === "string" && row.sql.trim(),
    "migration sources",
  );
  const versions = files.map((row) => row.name.slice(0, 14));
  if (new Set(versions).size !== versions.length) throw new Error("Duplicate source timestamps");
  uniqueRows(
    snapshot.history,
    "version",
    (row) => typeof row.version === "string" && /^\d{14}$/.test(row.version),
    "recorded history",
  );
  uniqueRows(
    snapshot.legacyApplied,
    "source_file",
    (row) => migrationName.test(row.source_file) && sha256.test(row.source_sha256),
    "legacy hash evidence",
  );
  if (hashEvidence) {
    uniqueRows(
      hashEvidence.historySqlHashes,
      "version",
      (row) =>
        typeof row.version === "string" &&
        /^\d{14}$/.test(row.version) &&
        sha256.test(row.sql_sha256_lf),
      "retained hash evidence",
    );
  }
}

// Deliberately narrow: this is a recognizer for one confirmed historical patch,
// not a SQL parser, general replay simulator, or proof of schema equivalence.
function lastCounterDefinition(sql) {
  const declaration =
    /\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+shop_manager\.complete_counter_sale\s*\(/gi;
  let result;
  for (let match; (match = declaration.exec(sql)); ) {
    const remainder = sql.slice(match.index);
    const opening = /\bAS\s+(\$[A-Za-z_0-9]*\$)/i.exec(remainder);
    if (!opening) return { body: undefined };
    const start = opening.index + opening[0].length;
    const end = remainder.indexOf(opening[1], start);
    if (end === -1) return { body: undefined };
    result = { body: remainder.slice(start, end) };
  }
  return result;
}

export function detectCostFixReplayHazards(files) {
  const ordered = [...files].sort((a, b) => a.name.localeCompare(b.name));
  const findings = [];
  for (const [index, fix] of ordered.entries()) {
    if (!fix.name.endsWith("_fix_counter_sale_inventory_cost.sql")) continue;
    const fixSql = fix.sql.replace(/\r\n/g, "\n");
    const recognized =
      fixSql.includes(targetSignature) &&
      fixSql.includes("corrected := replace(ddl, 'i.cost);UPDATE', 'i.cost_per_unit);UPDATE');") &&
      fixSql.includes("IF corrected = ddl THEN") &&
      fixSql.includes("Expected inventory cost reference was not found");
    if (!recognized) {
      findings.push({
        code: "COST_FIX_SOURCE_SHAPE_UNRECOGNIZED",
        sources: [fix.name],
        detail: "The historical patch changed; its replay precondition cannot be established.",
      });
      continue;
    }
    const definitions = ordered
      .slice(0, index)
      .map((file) => {
        const definition = lastCounterDefinition(file.sql);
        return definition ? { name: file.name, ...definition } : undefined;
      })
      .filter(Boolean);
    const previous = definitions.at(-1);
    const hasOriginal = previous?.body?.includes("i.cost);UPDATE");
    const hasCorrected = previous?.body?.includes("i.cost_per_unit);UPDATE");
    if (hasCorrected && !hasOriginal) {
      findings.push({
        code: "HISTORICAL_COST_FIX_ALREADY_FOLDED_IN",
        sources: [previous.name, fix.name],
        detail:
          "An earlier function already has the corrected cost reference. The later patch raises when its original text is absent.",
      });
    } else if (!hasOriginal || hasCorrected) {
      findings.push({
        code: "COST_FIX_PRECONDITION_UNPROVEN",
        sources: previous ? [previous.name, fix.name] : [fix.name],
        detail:
          "The immediately preceding recognized definition does not establish the patch's unique original-text precondition.",
      });
    }
  }
  return findings;
}

export function evaluateMigrationReplay({ files, snapshot, hashEvidence }) {
  validateInputs(files, snapshot, hashEvidence);
  const classification = classifyMigrations(files, snapshot, hashEvidence);
  const findings = detectCostFixReplayHazards(files);
  const sourceEvidenceComplete = !hasUnverifiedSources(classification);
  if (!sourceEvidenceComplete) {
    findings.push({
      code: "UNVERIFIED_MIGRATION_SOURCES",
      detail: "Unknown, modified, or timestamp-only sources require evidence and review.",
    });
  }
  const blocked = findings.length > 0;
  return {
    formatVersion: 1,
    mode: "offline-read-only",
    project: snapshot.project,
    observedOn: snapshot.observedOn ?? null,
    status: blocked ? "blocked" : "source_checks_passed_not_release_approval",
    sourceEvidenceComplete,
    fullReplayVerified: false,
    baselineVerified: false,
    databaseReleaseApproved: false,
    counts: Object.fromEntries(
      Object.entries(classification).map(([key, values]) => [key, values.length]),
    ),
    classification,
    findings,
  };
}

function main(args) {
  if (!args.length || args.length > 2 || args.some((arg) => arg.startsWith("--"))) {
    throw new Error(
      "Usage: node scripts/ci/migration-replay-preflight.mjs <snapshot.json> [history-sql-hashes.json]",
    );
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const migrations = path.join(root, "supabase", "migrations");
  const files = fs
    .readdirSync(migrations)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => ({ name, sql: fs.readFileSync(path.join(migrations, name), "utf8") }));
  const snapshot = JSON.parse(fs.readFileSync(args[0], "utf8"));
  const hashEvidence = args[1] ? JSON.parse(fs.readFileSync(args[1], "utf8")) : undefined;
  const report = evaluateMigrationReplay({ files, snapshot, hashEvidence });
  console.log(JSON.stringify(report, null, 2));
  if (report.status === "blocked") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
