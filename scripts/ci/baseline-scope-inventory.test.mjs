// Pure metadata/virtual read-only filesystem tests. No database, network,
// subprocess, filesystem writes, migration execution or generated SQL.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  analyzeBaselineScope,
  validateBaselineScope,
  validateInventoryPath,
  canonicalFunctionSignature,
  readConstrainedInventoryFile,
  runInventoryCli,
  canonicalProject,
  canonicalRepository,
} from "./baseline-scope-inventory.mjs";

const hash = (text) => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
const clone = (value) => JSON.parse(JSON.stringify(value));
const allFacets = () =>
  Object.fromEntries(
    [
      "owner",
      "columns",
      "defaults",
      "sequences",
      "constraints",
      "indexes",
      "policies",
      "grants",
      "triggers",
    ].map((key) => [key, "source-observed"]),
  );
function fixture() {
  const sql = "-- PRIVATE_SQL_BODY_SENTINEL\nSELECT 'never execute this';\n";
  const sourcePath = "supabase/migrations/20261014000000_synthetic_source.sql";
  const evidencePath = "docs/evidence/synthetic-source-evidence.json";
  const evidence = JSON.stringify({
    project: canonicalProject,
    legacyApplied: [{ source_file: sourcePath.split("/").at(-1), source_sha256: hash(sql) }],
  });
  const manifest = {
    formatVersion: 1,
    scopeId: "native-synthetic",
    repository: canonicalRepository,
    project: canonicalProject,
    sourceCommit: "1".repeat(40),
    observedAtUtc: "2026-10-14T19:00:00Z",
    normalization: "CRLF-to-LF-only",
    sources: [
      {
        id: "source:one",
        path: sourcePath,
        sha256Lf: hash(sql),
        lineageClass: "source-correspondence",
        evidenceRefs: ["evidence:one"],
      },
    ],
    evidenceFiles: [{ id: "evidence:one", path: evidencePath, sha256Lf: hash(evidence) }],
    roots: ["table:profiles"],
    objects: [
      {
        id: "table:profiles",
        kind: "table",
        disposition: "candidate",
        sourceRefs: ["source:one"],
        dependencies: [
          { id: "function:shop", relation: "policy-helper", reviewStatus: "source-observed" },
        ],
        facets: allFacets(),
      },
      {
        id: "function:shop",
        kind: "function",
        signature: "shop_manager.get_shop(uuid)",
        disposition: "candidate",
        sourceRefs: ["source:one"],
        dependencies: [],
        facets: { definition: "source-observed" },
      },
    ],
    platformPrerequisites: [],
    forwardOnlySources: [],
    excludedExecutions: [],
    separateDataAssertions: [],
  };
  const files = [
    { path: sourcePath, content: sql },
    { path: evidencePath, content: evidence },
  ];
  return { manifest, files };
}
const inspect = ({ manifest, files }) => analyzeBaselineScope(manifest, files);
function modify(change) {
  const item = fixture();
  change(item);
  return item;
}
function freeze(value) {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
test("exit0 proves declared metadata/pins/closure only, never release, applied lineage or parity", () => {
  const report = inspect(fixture());
  assert.equal(report.exitCode, 0);
  assert.equal(report.status, "declared_structure_pins_closure_only");
  assert.equal(report.declaredCoverageComplete, true);
  for (const key of [
    "fullReplayVerified",
    "baselineVerified",
    "databaseReleaseApproved",
    "exactAppliedLineageVerified",
    "schemaParityVerified",
    "dataParityVerified",
    "aclParityVerified",
  ])
    assert.equal(report[key], false);
  assert.equal(report.sources[0].appliedLineageInferred, false);
  assert.equal(report.sources[0].sourceHashCorrespondenceSupported, true);
  assert.ok(!JSON.stringify(report).includes("PRIVATE_SQL_BODY_SENTINEL"));
  assert.ok(!JSON.stringify(report).includes("SELECT"));
});
test("metadata report is deterministic under input ordering, LF/CRLF transport, and immutable inputs", () => {
  const item = fixture();
  const original = JSON.stringify(item);
  freeze(item);
  const report = inspect(item);
  assert.equal(JSON.stringify(item), original);
  const reordered = clone(item);
  reordered.manifest.objects.reverse();
  reordered.manifest.roots.reverse();
  reordered.files.reverse();
  reordered.files.forEach((file) => {
    file.content = file.content.replace(/\n/g, "\r\n");
  });
  assert.deepEqual(inspect(reordered), report);
});
test("source tamper, evidence tamper, missing pin and duplicate provided path fail closed", () => {
  for (const change of [
    ({ files }) => {
      files[0].content += " ";
    },
    ({ files }) => {
      files[1].content += " ";
    },
    ({ files }) => {
      files.pop();
    },
    ({ files }) => {
      files.push(clone(files[0]));
    },
  ])
    assert.throws(() => inspect(modify(change)));
});
test("source snapshot, canonical project/repository and evidence project must match", () => {
  for (const field of ["project", "repository", "sourceCommit", "observedAtUtc", "normalization"])
    assert.throws(() =>
      inspect(
        modify(({ manifest }) => {
          manifest[field] = "wrong";
        }),
      ),
    );
  const item = fixture();
  item.files[1].content = JSON.stringify({ project: "different", legacyApplied: [] });
  item.manifest.evidenceFiles[0].sha256Lf = hash(item.files[1].content);
  assert.throws(() => inspect(item), /Evidence project mismatch/);
});
test("duplicate object/source/evidence/global IDs and duplicate canonical function signatures are invalid", () => {
  for (const change of [
    ({ manifest }) => {
      manifest.objects.push(clone(manifest.objects[0]));
    },
    ({ manifest }) => {
      manifest.sources.push(clone(manifest.sources[0]));
    },
    ({ manifest }) => {
      manifest.evidenceFiles.push(clone(manifest.evidenceFiles[0]));
    },
    ({ manifest }) => {
      manifest.objects[0].id = manifest.sources[0].id;
    },
    ({ manifest }) => {
      const fn = clone(manifest.objects[1]);
      fn.id = "function:duplicate";
      fn.signature = "SHOP_MANAGER.GET_SHOP( UUID )";
      manifest.objects.push(fn);
    },
  ])
    assert.throws(() => inspect(modify(change)), /Duplicate|Dangling/);
  assert.equal(
    canonicalFunctionSignature("SHOP_MANAGER.GET_SHOP( UUID )"),
    "shop_manager.get_shop(uuid)",
  );
  assert.throws(() => canonicalFunctionSignature("public.fn(uuid); SELECT 1"));
});
test("dangling roots, dependencies, evidence/source refs and forward refs are invalid", () => {
  for (const change of [
    ({ manifest }) => {
      manifest.roots = ["unknown"];
    },
    ({ manifest }) => {
      manifest.objects[0].dependencies[0].id = "unknown";
    },
    ({ manifest }) => {
      manifest.objects[0].sourceRefs = ["unknown"];
    },
    ({ manifest }) => {
      manifest.sources[0].evidenceRefs = ["unknown"];
    },
    ({ manifest }) => {
      manifest.forwardOnlySources = ["unknown"];
    },
  ])
    assert.throws(() => inspect(modify(change)), /Dangling/);
});
test("real dependency cycles are deterministic unresolved coverage, never hidden or infinite recursion", () => {
  const item = modify(({ manifest }) => {
    manifest.objects[1].dependencies.push({
      id: "table:profiles",
      relation: "calls",
      reviewStatus: "source-observed",
    });
  });
  const report = inspect(item);
  assert.equal(report.exitCode, 1);
  assert.equal(report.declaredCoverageComplete, false);
  assert.deepEqual(report.dependencyCycles, [["function:shop", "table:profiles", "function:shop"]]);
  item.manifest.objects.reverse();
  assert.deepEqual(inspect(item), report);
});
test("unknown external nodes, unreviewed facets, dependencies and platform remain explicit exit1", () => {
  const item = modify(({ manifest }) => {
    manifest.objects.push({
      id: "external:auth",
      kind: "external",
      disposition: "unverified",
      sourceRefs: [],
      dependencies: [],
      facets: { contract: "unreviewed" },
    });
    manifest.objects[0].dependencies.push({
      id: "external:auth",
      relation: "external-prerequisite",
      reviewStatus: "unverified",
    });
    manifest.platformPrerequisites.push({
      id: "platform:auth",
      reason: "Platform installation is external",
      reviewStatus: "unverified",
    });
    manifest.separateDataAssertions.push({
      id: "data:receipts",
      reason: "Separate data reconciliation needed",
      status: "unverified",
    });
  });
  const report = inspect(item);
  assert.equal(report.exitCode, 1);
  for (const code of [
    "UNVERIFIED_OBJECT",
    "UNREVIEWED_FACET",
    "UNVERIFIED_DEPENDENCY",
    "UNVERIFIED_PLATFORM_PREREQUISITE",
    "SEPARATE_DATA_ASSERTION_UNVERIFIED",
  ])
    assert.ok(report.findings.some((row) => row.code === code));
  item.manifest.platformPrerequisites[0].reviewStatus = "verified";
  assert.throws(() => inspect(item), /cannot be marked verified/);
});
test("reachable exclusions block declared closure and disconnected objects cannot be hidden", () => {
  const item = modify(({ manifest }) => {
    manifest.excludedExecutions.push({
      id: "function:shop",
      sourceRefs: ["source:one"],
      reason: "Excluded temporary ingress",
    });
  });
  assert.ok(inspect(item).findings.some((row) => row.code === "EXCLUDED_EXECUTION_REACHABLE"));
  item.manifest.excludedExecutions[0].id = "execution:unused";
  assert.equal(inspect(item).exitCode, 0);
  item.manifest.objects[0].dependencies = [];
  assert.ok(inspect(item).findings.some((row) => row.code === "DECLARED_OBJECT_OUTSIDE_CLOSURE"));
});
test("pending forward sources are never applied or upgraded through matching evidence", () => {
  const item = modify(({ manifest }) => {
    manifest.sources[0].lineageClass = "pending-forward";
    manifest.forwardOnlySources = ["source:one"];
  });
  const report = inspect(item);
  assert.equal(report.exitCode, 1);
  assert.equal(report.sources[0].appliedLineageInferred, false);
  assert.equal(report.sources[0].sourceHashCorrespondenceSupported, true);
  assert.ok(report.findings.some((row) => row.code === "PENDING_FORWARD_OBJECT"));
  item.manifest.sources[0].lineageClass = "source-correspondence";
  assert.throws(() => inspect(item), /must remain pending/);
});
test("pinned evidence classes cannot be upgraded from catalog/filename-only to source or applied lineage", () => {
  const item = fixture();
  item.files[1].content = JSON.stringify({
    project: canonicalProject,
    history: [{ version: "20261014000000" }],
    catalog: { bodyMd5: "a".repeat(32) },
  });
  item.manifest.evidenceFiles[0].sha256Lf = hash(item.files[1].content);
  assert.throws(() => inspect(item), /Unsupported source-correspondence/);
  item.manifest.sources[0].lineageClass = "catalog-correspondence";
  assert.throws(() => inspect(item), /Unsupported whole-source catalog/);
  item.manifest.sources[0].lineageClass = "unclassified";
  assert.equal(inspect(item).exitCode, 1);
  item.manifest.sources[0].lineageClass = "applied";
  assert.throws(() => inspect(item), /applied lineage cannot/);
});
test("same-hash retained history supports correspondence, not exact applied lineage or parity", () => {
  const item = fixture();
  item.files[1].content = JSON.stringify({
    project: canonicalProject,
    historySqlHashes: [
      { version: "20261014000099", sql_sha256_lf: item.manifest.sources[0].sha256Lf },
    ],
  });
  item.manifest.evidenceFiles[0].sha256Lf = hash(item.files[1].content);
  assert.equal(inspect(item).exitCode, 0);
  assert.equal(inspect(item).exactAppliedLineageVerified, false);
});
test("table facets are mandatory, unreviewed facets block coverage, raw bodies and status upgrades rejected", () => {
  for (const change of [
    ({ manifest }) => {
      delete manifest.objects[0].facets.grants;
    },
    ({ manifest }) => {
      manifest.objects[0].sql = "SELECT 1";
    },
    ({ manifest }) => {
      manifest.objects[1].body = "secret body";
    },
    ({ manifest }) => {
      manifest.baselineVerified = true;
    },
    ({ manifest }) => {
      manifest.objects[0].facets.policies = "verified";
    },
  ])
    assert.throws(() => inspect(modify(change)));
  assert.equal(
    inspect(
      modify(({ manifest }) => {
        manifest.objects[0].facets.policies = "unreviewed";
      }),
    ).exitCode,
    1,
  );
});
test("logical shop binding is distinct metadata, never fabricated into an actual foreign key", () => {
  const item = fixture();
  item.manifest.objects[0].dependencies[0].relation = "logical-binding";
  assert.equal(inspect(item).exitCode, 0);
  assert.equal(item.manifest.objects[0].dependencies[0].relation, "logical-binding");
});
test("lexical path escapes, URLs, Windows paths and unsupported scopes are rejected before reads", () => {
  for (const unsafe of [
    "../docs/evidence/a.json",
    "/docs/evidence/a.json",
    "D:/docs/evidence/a.json",
    "docs\\evidence\\a.json",
    "docs/evidence/%2e%2e.json",
    "docs/evidence/a/../../a.json",
    "https://host/a.json",
    "docs/private/a.json",
    "supabase/migrations/a.sql",
  ])
    assert.throws(() =>
      validateInventoryPath(unsafe, unsafe.endsWith(".sql") ? "source" : "evidence"),
    );
  assert.equal(validateInventoryPath("docs/evidence/a.json", "evidence"), "docs/evidence/a.json");
  assert.throws(() => runInventoryCli(["--help"], "unused"), /Usage/);
  assert.throws(() => runInventoryCli(["../a.json"], "unused"), /Unsafe/);
});
function virtualFs({
  symbolic = false,
  escape = false,
  bytes = 2,
  regular = true,
  oversizedRead = false,
} = {}) {
  const root = path.resolve("VIRTUAL_BASELINE_ROOT");
  let reads = 0;
  const fake = {
    realpathSync: (target) =>
      target === root ? root : escape ? path.resolve(root, "..", "escaped.json") : target,
    lstatSync: () => ({ isSymbolicLink: () => symbolic }),
    statSync: () => ({ size: bytes, isFile: () => regular }),
    readFileSync: () => {
      reads++;
      return oversizedRead ? "x".repeat(8 * 1024 * 1024 + 1) : "{}";
    },
  };
  return { root, fake, reads: () => reads };
}
test("read-only path adapter rejects symlink/junction and resolved escapes before contents are read", () => {
  for (const settings of [
    { symbolic: true },
    { escape: true },
    { regular: false },
    { bytes: 9 * 1024 * 1024 },
  ]) {
    const item = virtualFs(settings);
    assert.throws(() =>
      readConstrainedInventoryFile(item.root, "docs/evidence/a.json", "evidence", item.fake),
    );
    assert.equal(item.reads(), 0);
  }
  const item = virtualFs();
  assert.equal(
    readConstrainedInventoryFile(item.root, "docs/evidence/a.json", "evidence", item.fake),
    "{}",
  );
  assert.equal(item.reads(), 1);
  const changed = virtualFs({ oversizedRead: true });
  assert.throws(
    () =>
      readConstrainedInventoryFile(changed.root, "docs/evidence/a.json", "evidence", changed.fake),
    /read exceeded/,
  );
});
test("byte/count/depth caps reject accidental huge inputs instead of accepting partial scope", () => {
  assert.throws(
    () =>
      inspect(
        modify(({ files }) => {
          files[0].content = "x".repeat(8 * 1024 * 1024 + 1);
        }),
      ),
    /contents/,
  );
  assert.throws(
    () =>
      inspect(
        modify(({ manifest }) => {
          manifest.objects = Array(513).fill(manifest.objects[0]);
        }),
      ),
    /list/,
  );
  assert.throws(
    () =>
      inspect(
        modify(({ manifest }) => {
          manifest.objects[0].dependencies = Array(129).fill(manifest.objects[0].dependencies[0]);
        }),
      ),
    /list/,
  );
  const item = fixture();
  let nested = {};
  for (let count = 0; count < 34; count++) nested = { nested };
  item.manifest.objects[0].facets = nested;
  assert.throws(() => validateBaselineScope(item.manifest), /depth cap/);
});

test("CLI enforces aggregate budget incrementally before any fifth maximum-size source read", () => {
  const item = fixture();
  item.manifest.evidenceFiles = [];
  const content = "x".repeat(8 * 1024 * 1024);
  item.manifest.sources = Array.from({ length: 5 }, (_, index) => ({
    id: `source:${index}`,
    path: `supabase/migrations/2026101400000${index}_source.sql`,
    sha256Lf: hash(content),
    lineageClass: "unclassified",
    evidenceRefs: [],
  }));
  for (const object of item.manifest.objects) object.sourceRefs = ["source:0"];
  const manifestContent = JSON.stringify(item.manifest);
  const root = path.resolve("VIRTUAL_BASELINE_ROOT");
  const reads = [];
  const manifestPath = "docs/evidence/synthetic-scope.json";
  const fake = {
    realpathSync: (target) => target,
    lstatSync: () => ({ isSymbolicLink: () => false }),
    statSync: (target) => ({
      isFile: () => true,
      size: target.endsWith("synthetic-scope.json")
        ? Buffer.byteLength(manifestContent)
        : Buffer.byteLength(content),
    }),
    readFileSync: (target) => {
      reads.push(target);
      return target.endsWith("synthetic-scope.json") ? manifestContent : content;
    },
  };
  assert.throws(() => runInventoryCli([manifestPath], root, fake), /cap exceeded before read/);
  assert.equal(reads.length, 5); // Manifest + first four sources, never fifth source.
  assert.ok(!reads.some((target) => target.endsWith("20261014000004_source.sql")));
});

test("trigger/policy/grant identities and attachments remain explicit manual declarations", () => {
  for (const kind of ["trigger", "policy", "grant"]) {
    const item = fixture();
    item.manifest.objects[1] = {
      id: `${kind}:profiles.synthetic`,
      kind,
      disposition: "candidate",
      sourceRefs: ["source:one"],
      dependencies: [],
      facets: { definition: "source-observed" },
    };
    item.manifest.objects[0].dependencies[0].id = item.manifest.objects[1].id;
    assert.throws(() => inspect(item), /identity\/attachment/);
    item.manifest.objects[1].facets.identity = "unreviewed";
    item.manifest.objects[1].facets.attachment = "unreviewed";
    const report = inspect(item);
    assert.equal(report.exitCode, 1);
    assert.equal(report.sqlObjectIdentityVerified, false);
    assert.equal(report.attachmentsVerified, false);
  }
});

test("actual repository inventory is pinned and explicitly incomplete, not approved baseline SQL", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const report = runInventoryCli(["docs/evidence/baseline-native-scope-v1.json"], root);
  assert.equal(report.exitCode, 1);
  assert.equal(report.structureValid, true);
  assert.equal(report.pinsVerified, true);
  assert.equal(report.declaredCoverageComplete, false);
  assert.equal(report.databaseReleaseApproved, false);
  assert.equal(report.baselineVerified, false);
  assert.ok(report.counts.sources > 0);
  assert.ok(report.findings.some((row) => row.code === "UNVERIFIED_PLATFORM_PREREQUISITE"));
  assert.ok(report.findings.some((row) => row.code === "UNREVIEWED_FACET"));
  assert.ok(report.sources.every((row) => row.appliedLineageInferred === false));
  assert.ok(!Object.hasOwn(report, "sql"));
  assert.ok(!JSON.stringify(report).includes("CREATE OR REPLACE FUNCTION"));
});
