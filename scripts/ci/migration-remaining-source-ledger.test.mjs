// OFFLINE recorded-evidence consistency only: no SQL execution, database/client,
// network, shell/Git invocation, credentials, file writes or production checks.
// Categorization never substitutes embedded bytes for a retained whole statement.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { classifyMigrations } from "./migration-provenance.mjs";
import { evaluateMigrationReplay } from "./migration-replay-preflight.mjs";

const root = new URL("../../", import.meta.url);
const ledgerPath = "docs/evidence/migration-remaining-source-ledger-2026-10-15.json";
const limit = 1024 * 1024;
const sha = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => {
  const url = new URL(path, root);
  const stat = fs.lstatSync(url);
  assert.equal(stat.isFile(), true, "Only ordinary files are evidence");
  assert.ok(stat.size > 0 && stat.size <= limit, "Evidence size cap");
  return fs.readFileSync(url);
};
const lf = (raw) => {
  const text = raw.toString("utf8");
  assert.equal(Buffer.from(text, "utf8").equals(raw), true, "Exact UTF-8 required");
  return text.replace(/\r\n/g, "\n");
};
const json = (path) => JSON.parse(lf(read(path)));
const ledger = json(ledgerPath);
const helperProof = json("docs/evidence/approved-helper-execution-2026-10-15.json");
const historical = [
  "20260831041834_associate_parts_order_lifecycle.sql",
  "20260831113000_business_associate_enrollment.sql",
  "20260831114500_associate_privacy_customer_vehicle_ledger.sql",
  "20260831130502_employee_module_access.sql",
  "20260831193523_counter_sales_registers_pricebook.sql",
  "20260901025424_business_staff_shop_manager_bridge.sql",
  "20260901134215_parts_demo_playground.sql",
  "20260902123940_business_part_cross_references.sql",
  "20260902131844_seed_ph_chassis_vehicle_profiles.sql",
  "20260902162000_parts_receiving_exceptions.sql",
  "20260910170500_harden_parts_receiving_exception_privileges.sql",
  "20260911120000_close_standalone_migration_ingress.sql",
];
const pending = [
  "20260927090000_parts_network_cross_org_rls_hardening.sql",
  "20260927120000_parts_network_security_followups.sql",
  "20261014140802_preserve_direct_installed_vehicle.sql",
  "20261014194659_customer_vehicle_activity_readers.sql",
  "20261014214406_customer_reminders_invoker_read.sql",
];
const embedded = [
  "20261014185003_contain_legacy_profile_bootstrap_execute.sql",
  "20261014185052_contain_legacy_work_order_totals_execute.sql",
];
const categoryCounts = {
  "historical-unresolved": 12,
  "unapplied-candidate": 5,
  "recorded-embedded-execution": 2,
};
const exactCounts = {
  recordedVersion: 2,
  recordedVersionUnverified: 0,
  recordedSqlHashMismatch: 0,
  legacyHashMatch: 388,
  legacyHashMismatch: 0,
  remoteSqlHashMatch: 14,
  unclassified: 19,
};
const evidencePaths = {
  provenance: "migration-provenance-2026-10-14.json",
  historyHashes: "post-cutover-migration-hashes-2026-10-14.json",
  invoiceContainment: "invoice-containment-migration-2026-10-15.json",
  correspondenceAudit: "migration-object-audit-2026-10-15.md",
  baselineStrategy: "MIGRATION_BASELINE_STRATEGY.md",
  vehicleReaderContract: "CUSTOMER_VEHICLE_ACTIVITY_READ_CONTRACT.md",
  reminderReaderContract: "CUSTOMER_REMINDERS_INVOKER_READ_CONTRACT.md",
  approvedHelperExecution: "approved-helper-execution-2026-10-15.json",
  profileEnvelope: "approved-helper-profile_bootstrap-execution.sql",
  totalsEnvelope: "approved-helper-work_order_totals-execution.sql",
};
const acceptanceKeys = [
  "wholeSourceEqualityPromoted",
  "freshProductionStateVerified",
  "fullReplayVerified",
  "baselineVerified",
  "parityVerified",
  "databaseReleaseApproved",
  "applicationActivationVerified",
  "historyRepairAuthorized",
  "migrationExecutionAuthorized",
];
const keys = (value, expected) => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), "Exact bounded schema");
};
const text = (value, max = 1000) => {
  assert.equal(typeof value, "string");
  assert.ok(value.trim().length > 0 && value.length <= max);
};
const sourcePath = (value) => {
  assert.match(value, /^supabase\/migrations\/\d{14}_[A-Za-z0-9_-]+\.sql$/);
};
const fileMetadata = (value) => {
  assert.match(value.sha256Lf, /^[a-f0-9]{64}$/);
  assert.ok(Number.isSafeInteger(value.bytesLf) && value.bytesLf > 0 && value.bytesLf <= limit);
};
const expectedRefs = (name, classification) => {
  if (classification === "historical-unresolved")
    return name === historical[4]
      ? ["correspondenceAudit", "baselineStrategy"]
      : ["correspondenceAudit"];
  if (classification === "recorded-embedded-execution")
    return ["approvedHelperExecution", name === embedded[0] ? "profileEnvelope" : "totalsEnvelope"];
  if (name === pending[3]) return ["vehicleReaderContract"];
  if (name === pending[4]) return ["reminderReaderContract"];
  return ["baselineStrategy"];
};

function validateLedger(value) {
  keys(value, [
    "formatVersion",
    "mode",
    "repository",
    "project",
    "observedOn",
    "observedCandidate",
    "normalization",
    "scope",
    "exactWholeSourceClassifier",
    "categoryCounts",
    "sources",
    "evidenceFiles",
    "outsideCandidate",
    "acceptance",
  ]);
  assert.equal(value.formatVersion, 1);
  assert.equal(value.mode, "offline-recorded-source-ledger");
  assert.equal(value.repository, "Hunting-Fishing/motorsales365");
  assert.equal(value.project, "wjxaajgvddtrxxtocxen");
  assert.equal(value.observedOn, "2026-10-15");
  assert.equal(value.observedCandidate, "06e21a2ef968975fc43e840d17c84ad77c4ea48c");
  assert.equal(
    value.normalization,
    "CRLF-to-LF-only; no whitespace, comments, tokens or SQL transformations",
  );
  text(value.scope);
  assert.match(value.scope, /not fresh production verification/);
  assert.match(
    value.scope,
    /No SQL execution, migration ingress, history adoption or schema activation is authorized/,
  );
  const classifier = value.exactWholeSourceClassifier;
  keys(classifier, [
    "totalSources",
    "matchedSources",
    "outsideExactClassifier",
    "counts",
    "compositionEvidenceRefs",
    "embeddedExecutionsAddedToExactMatches",
  ]);
  assert.equal(classifier.totalSources, 423);
  assert.equal(classifier.matchedSources, 404);
  assert.equal(classifier.outsideExactClassifier, 19);
  assert.deepEqual(classifier.counts, exactCounts);
  assert.deepEqual(classifier.compositionEvidenceRefs, [
    "provenance",
    "historyHashes",
    "invoiceContainment",
  ]);
  assert.equal(classifier.embeddedExecutionsAddedToExactMatches, false);
  assert.deepEqual(value.categoryCounts, categoryCounts);
  assert.ok(Array.isArray(value.sources) && value.sources.length === 19);
  assert.ok(Array.isArray(value.evidenceFiles) && value.evidenceFiles.length === 10);
  const evidenceIds = new Set();
  for (const item of value.evidenceFiles) {
    keys(item, ["id", "path", "sha256Lf", "bytesLf"]);
    assert.ok(Object.hasOwn(evidencePaths, item.id));
    assert.equal(evidenceIds.has(item.id), false, "Duplicate evidence ID");
    evidenceIds.add(item.id);
    assert.equal(item.path, `docs/evidence/${evidencePaths[item.id]}`);
    fileMetadata(item);
  }
  const paths = new Set();
  const counts = Object.fromEntries(Object.keys(categoryCounts).map((key) => [key, 0]));
  for (const item of value.sources) {
    const isEmbedded = item.classification === "recorded-embedded-execution";
    keys(item, [
      "path",
      "sha256Lf",
      "bytesLf",
      "classification",
      "evidenceRefs",
      "correspondenceNote",
      ...(isEmbedded ? ["recordedExecution"] : []),
    ]);
    sourcePath(item.path);
    assert.equal(paths.has(item.path), false, "Duplicate source");
    paths.add(item.path);
    fileMetadata(item);
    const name = item.path.slice("supabase/migrations/".length);
    const expected = historical.includes(name)
      ? "historical-unresolved"
      : pending.includes(name)
        ? "unapplied-candidate"
        : embedded.includes(name)
          ? "recorded-embedded-execution"
          : undefined;
    assert.ok(expected, "Source outside pinned nineteen");
    assert.equal(item.classification, expected);
    counts[item.classification]++;
    assert.deepEqual(item.evidenceRefs, expectedRefs(name, expected));
    for (const id of item.evidenceRefs) assert.ok(evidenceIds.has(id));
    text(item.correspondenceNote);
    if (isEmbedded) {
      const record = item.recordedExecution;
      keys(record, [
        "remoteVersion",
        "name",
        "envelopeEvidenceRef",
        "envelopeSha256Lf",
        "envelopeBytesLf",
        "embeddedByteStart",
        "embeddedByteEndExclusive",
        "recordedVerifiedAtUtc",
        "freshProductionVerification",
        "wholeSourceEquality",
        "replayAuthorized",
      ]);
      const proof = helperProof.source_mappings.find(
        (row) => row.embedded_original_file === item.path,
      );
      assert.ok(proof, "Exact existing execution evidence required");
      assert.equal(record.remoteVersion, proof.migration.version);
      assert.equal(record.name, proof.migration.name);
      assert.equal(
        record.envelopeEvidenceRef,
        name === embedded[0] ? "profileEnvelope" : "totalsEnvelope",
      );
      assert.equal(record.envelopeSha256Lf, proof.stored_statement_sha256_utf8_lf);
      assert.equal(record.envelopeBytesLf, proof.stored_statement_bytes);
      assert.equal(record.embeddedByteStart, proof.embedded_byte_start);
      assert.equal(record.embeddedByteEndExclusive, proof.embedded_byte_end_exclusive);
      assert.equal(record.recordedVerifiedAtUtc, helperProof.verifiedAtUtc);
      assert.equal(item.sha256Lf, proof.embedded_original_sha256_raw_and_utf8_lf);
      assert.equal(item.bytesLf, proof.embedded_original_bytes);
      assert.equal(record.embeddedByteEndExclusive - record.embeddedByteStart, item.bytesLf);
      for (const key of ["freshProductionVerification", "wholeSourceEquality", "replayAuthorized"])
        assert.equal(record[key], false);
    }
  }
  assert.deepEqual(counts, categoryCounts);
  assert.deepEqual(
    [...paths].sort(),
    [...historical, ...pending, ...embedded].map((name) => `supabase/migrations/${name}`).sort(),
  );
  const outside = value.outsideCandidate;
  keys(outside, [
    "pullRequest",
    "sourceCommit",
    "path",
    "presentAtObservedCandidate",
    "includedIn423Sources",
    "activeMigration",
    "pendingMigrationIngress",
    "migrationIngressAuthorized",
    "activationVerified",
    "note",
  ]);
  assert.equal(outside.pullRequest, 9);
  assert.equal(outside.sourceCommit, "300f02ba8f8fb0ad8b6c5746fc60373153187c65");
  assert.equal(
    outside.path,
    "supabase/migrations/20260928090000_rewrite_legacy_hosted_asset_urls.sql",
  );
  for (const key of [
    "presentAtObservedCandidate",
    "includedIn423Sources",
    "activeMigration",
    "pendingMigrationIngress",
    "migrationIngressAuthorized",
    "activationVerified",
  ])
    assert.equal(outside[key], false);
  assert.equal(paths.has(outside.path), false);
  text(outside.note);
  assert.match(
    outside.note,
    /Not one of the 19, not accepted migration ingress and not covered by 404\/423/,
  );
  keys(value.acceptance, acceptanceKeys);
  for (const key of acceptanceKeys) assert.equal(value.acceptance[key], false);
  return true;
}

test("bounded recorded ledger preserves sole project, pinned candidate and exact 12/5/2 categories", () => {
  assert.equal(validateLedger(ledger), true);
});

test("all nineteen unchanged source and ten evidence files retain exact LF hashes and byte lengths", () => {
  validateLedger(ledger);
  for (const item of [...ledger.sources, ...ledger.evidenceFiles]) {
    const content = lf(read(item.path));
    assert.equal(sha(content), item.sha256Lf, item.path);
    assert.equal(Buffer.byteLength(content), item.bytesLf, item.path);
  }
});

test("existing whole-source composition remains 404/423 and exactly the same nineteen remain outside it", () => {
  const base = json(`docs/evidence/${evidencePaths.provenance}`);
  const hashes = json(`docs/evidence/${evidencePaths.historyHashes}`);
  const invoice = json(`docs/evidence/${evidencePaths.invoiceContainment}`);
  const original = JSON.stringify([base, hashes, invoice, helperProof]);
  assert.equal(base.project, ledger.project);
  assert.equal(hashes.project, ledger.project);
  assert.equal(invoice.project, ledger.project);
  assert.equal(helperProof.project_id, ledger.project);
  const files = fs
    .readdirSync(new URL("supabase/migrations/", root))
    .filter((name) => name.endsWith(".sql"))
    .map((name) => ({ name, sql: lf(read(`supabase/migrations/${name}`)) }));
  assert.equal(files.length, 423);
  const snapshot = { ...base, history: [...base.history, ...invoice.history] };
  const hashEvidence = {
    ...hashes,
    historySqlHashes: [...hashes.historySqlHashes, ...invoice.historySqlHashes],
  };
  const result = classifyMigrations(files, snapshot, hashEvidence);
  assert.deepEqual(
    Object.fromEntries(Object.entries(result).map(([key, rows]) => [key, rows.length])),
    exactCounts,
  );
  assert.deepEqual(
    result.unclassified.sort(),
    ledger.sources.map((item) => item.path.slice("supabase/migrations/".length)).sort(),
  );
  const replay = evaluateMigrationReplay({ files, snapshot, hashEvidence });
  assert.equal(replay.status, "blocked");
  assert.equal(replay.sourceEvidenceComplete, false);
  for (const key of ["fullReplayVerified", "baselineVerified", "databaseReleaseApproved"])
    assert.equal(replay[key], false);
  assert.ok(
    replay.findings.some((finding) => finding.code === "HISTORICAL_COST_FIX_ALREADY_FOLDED_IN"),
  );
  assert.equal(
    JSON.stringify([base, hashes, invoice, helperProof]),
    original,
    "Older evidence not mutated",
  );
});

test("recorded helper envelopes retain exact original raw embedded slices, not whole-statement equality", () => {
  for (const item of ledger.sources.filter((row) => row.recordedExecution)) {
    const record = item.recordedExecution;
    const proof = helperProof.source_mappings.find(
      (row) => row.embedded_original_file === item.path,
    );
    const original = read(item.path);
    const envelope = read(proof.stored_statement_file);
    assert.equal(sha(original), item.sha256Lf);
    assert.equal(sha(envelope), record.envelopeSha256Lf);
    assert.equal(envelope.length, record.envelopeBytesLf);
    assert.equal(
      envelope.subarray(record.embeddedByteStart, record.embeddedByteEndExclusive).equals(original),
      true,
    );
    assert.notEqual(record.envelopeSha256Lf, item.sha256Lf);
    assert.notEqual(record.remoteVersion, item.path.split("/").at(-1).slice(0, 14));
    assert.equal(
      helperProof.finalObservation.migration_history.find(
        (group) => group.requested_name === record.name,
      ).rows[0].sql_sha256_lf,
      record.envelopeSha256Lf,
    );
  }
  assert.equal(helperProof.acceptance.global_source_evidence_composer_updated, false);
  for (const key of ["baselineAccepted", "parityAccepted", "replayAccepted", "releaseAccepted"])
    assert.equal(helperProof.acceptance[key], false);
});

test("PR9 URL migration remains absent/outside423 rather than active or pending migration ingress", () => {
  assert.equal(fs.existsSync(new URL(ledger.outsideCandidate.path, root)), false);
  assert.equal(
    ledger.sources.some((row) => row.path === ledger.outsideCandidate.path),
    false,
  );
  validateLedger(ledger);
});

const invalidCases = [
  [
    "another hosted project",
    (copy) => {
      copy.project = "ujkizgblscqcejghxemb";
    },
  ],
  [
    "unpinned candidate",
    (copy) => {
      copy.observedCandidate = "0".repeat(40);
    },
  ],
  [
    "unknown top-level field",
    (copy) => {
      copy.approved = true;
    },
  ],
  [
    "different normalization",
    (copy) => {
      copy.normalization = "ignore comments and whitespace";
    },
  ],
  [
    "oversized source list",
    (copy) => {
      copy.sources.push(copy.sources[0]);
    },
  ],
  [
    "duplicate source",
    (copy) => {
      copy.sources[1] = copy.sources[0];
    },
  ],
  [
    "source traversal",
    (copy) => {
      copy.sources[0].path = "supabase/migrations/../../secret.sql";
    },
  ],
  [
    "unknown classification",
    (copy) => {
      copy.sources[0].classification = "applied";
    },
  ],
  [
    "pending relabeled applied",
    (copy) => {
      copy.sources[12].classification = "recorded-embedded-execution";
    },
  ],
  [
    "historical relabeled pending",
    (copy) => {
      copy.sources[0].classification = "unapplied-candidate";
    },
  ],
  [
    "invalid hash",
    (copy) => {
      copy.sources[0].sha256Lf = "f".repeat(63);
    },
  ],
  [
    "unbounded bytes",
    (copy) => {
      copy.sources[0].bytesLf = limit + 1;
    },
  ],
  [
    "unknown evidence reference",
    (copy) => {
      copy.sources[0].evidenceRefs = ["untrusted"];
    },
  ],
  [
    "evidence ID substitution",
    (copy) => {
      copy.evidenceFiles[0].path = copy.evidenceFiles[1].path;
    },
  ],
  [
    "duplicate evidence ID",
    (copy) => {
      copy.evidenceFiles[1].id = copy.evidenceFiles[0].id;
    },
  ],
  [
    "changed category totals",
    (copy) => {
      copy.categoryCounts["historical-unresolved"] = 11;
    },
  ],
  [
    "embedded promoted into exact source count",
    (copy) => {
      copy.exactWholeSourceClassifier.matchedSources = 406;
    },
  ],
  [
    "embedded exact-match adoption",
    (copy) => {
      copy.exactWholeSourceClassifier.embeddedExecutionsAddedToExactMatches = true;
    },
  ],
  [
    "changed recorded remote version",
    (copy) => {
      copy.sources[15].recordedExecution.remoteVersion = "20261014185003";
    },
  ],
  [
    "changed envelope hash",
    (copy) => {
      copy.sources[15].recordedExecution.envelopeSha256Lf = copy.sources[15].sha256Lf;
    },
  ],
  [
    "changed embedded range",
    (copy) => {
      copy.sources[15].recordedExecution.embeddedByteStart++;
    },
  ],
  [
    "invented fresh helper verification",
    (copy) => {
      copy.sources[15].recordedExecution.freshProductionVerification = true;
    },
  ],
  [
    "invented helper whole-source equality",
    (copy) => {
      copy.sources[15].recordedExecution.wholeSourceEquality = true;
    },
  ],
  [
    "helper replay permission",
    (copy) => {
      copy.sources[15].recordedExecution.replayAuthorized = true;
    },
  ],
  [
    "outside candidate added to423",
    (copy) => {
      copy.outsideCandidate.includedIn423Sources = true;
    },
  ],
  [
    "outside candidate pending ingress",
    (copy) => {
      copy.outsideCandidate.pendingMigrationIngress = true;
    },
  ],
  [
    "outside candidate execution permission",
    (copy) => {
      copy.outsideCandidate.migrationIngressAuthorized = true;
    },
  ],
];
for (const [name, mutate] of invalidCases) {
  test(`recorded ledger rejects ${name}`, () => {
    const copy = structuredClone(ledger);
    mutate(copy);
    assert.throws(() => validateLedger(copy));
  });
}
for (const key of acceptanceKeys) {
  test(`ledger cannot promote ${key}`, () => {
    const copy = structuredClone(ledger);
    copy.acceptance[key] = true;
    assert.throws(() => validateLedger(copy));
  });
}
