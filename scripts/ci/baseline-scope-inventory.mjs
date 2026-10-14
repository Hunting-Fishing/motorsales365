// Metadata-only, read-only declaration checks. No database/network clients,
// SQL execution/generation, shell commands, writes, or history adoption.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

export const canonicalProject = "wjxaajgvddtrxxtocxen";
export const canonicalRepository = "Hunting-Fishing/motorsales365";
const shaPattern = /^[a-f0-9]{64}$/;
const idPattern = /^[A-Za-z0-9][A-Za-z0-9_.:,()-]{0,199}$/;
const lineages = [
  "source-correspondence",
  "catalog-correspondence",
  "pending-forward",
  "unclassified",
];
const kinds = [
  "table",
  "function",
  "trigger",
  "policy",
  "grant",
  "view",
  "logical-binding",
  "external",
];
const relations = [
  "foreign-key",
  "logical-binding",
  "calls",
  "trigger-function",
  "policy-helper",
  "grant-target",
  "contains",
  "external-prerequisite",
];
const tableFacets = [
  "owner",
  "columns",
  "defaults",
  "sequences",
  "constraints",
  "indexes",
  "policies",
  "grants",
  "triggers",
];
const maxFileBytes = 8 * 1024 * 1024;
const maxTotalBytes = 32 * 1024 * 1024;
const validId = (value) => typeof value === "string" && idPattern.test(value);
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sorted = (values) => [...values].sort(compare);
const hash = (content) => createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
const fail = (message) => {
  throw new Error(message);
};
const nonempty = (value) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 2000;
function shape(value, keys, description) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  )
    fail(`Invalid ${description} fields`);
}
function boundedJson(value) {
  const pending = [{ value, depth: 0 }];
  let nodes = 0;
  while (pending.length) {
    const next = pending.pop();
    if (++nodes > 50_000 || next.depth > 32) fail("JSON metadata count/depth cap exceeded");
    if (next.value && typeof next.value === "object")
      for (const child of Object.values(next.value))
        pending.push({ value: child, depth: next.depth + 1 });
  }
}
function rows(value, description, max = 1000) {
  if (!Array.isArray(value) || value.length > max) fail(`Invalid ${description} list`);
}
function unique(values, description) {
  if (new Set(values).size !== values.length) fail(`Duplicate ${description}`);
}
function ids(values, description) {
  rows(values, description);
  if (values.some((id) => typeof id !== "string" || !idPattern.test(id)))
    fail(`Invalid ${description} ID`);
  unique(values, description);
}
export function canonicalFunctionSignature(signature) {
  if (
    typeof signature !== "string" ||
    signature.length > 512 ||
    !/^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*\([A-Za-z0-9_., \[\]]*\)$/.test(signature)
  )
    fail("Invalid function signature");
  return signature.toLowerCase().replace(/\s+/g, "");
}
export function validateInventoryPath(relativePath, kind) {
  if (
    typeof relativePath !== "string" ||
    relativePath.includes("..") ||
    relativePath.includes("\\") ||
    relativePath.includes(":") ||
    relativePath.includes("%") ||
    relativePath.startsWith("/")
  )
    fail("Unsafe inventory path");
  const allowed =
    kind === "source"
      ? /^supabase\/migrations\/\d{14}_[A-Za-z0-9_-]+\.sql$/
      : /^docs\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:json|md|sql)$/;
  if (!allowed.test(relativePath)) fail("Inventory path outside allowed source/evidence scope");
  return relativePath;
}

export function validateBaselineScope(
  manifest,
  { expectedProject = canonicalProject, expectedRepository = canonicalRepository } = {},
) {
  shape(
    manifest,
    [
      "formatVersion",
      "scopeId",
      "repository",
      "project",
      "sourceCommit",
      "observedAtUtc",
      "normalization",
      "sources",
      "evidenceFiles",
      "roots",
      "objects",
      "platformPrerequisites",
      "forwardOnlySources",
      "excludedExecutions",
      "separateDataAssertions",
    ],
    "manifest",
  );
  boundedJson(manifest);
  if (
    manifest.formatVersion !== 1 ||
    !validId(manifest.scopeId) ||
    manifest.repository !== expectedRepository ||
    manifest.project !== expectedProject
  )
    fail("Manifest identity/project/repository mismatch");
  if (
    !/^[a-f0-9]{40}$/.test(manifest.sourceCommit ?? "") ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(manifest.observedAtUtc ?? "") ||
    !Number.isFinite(Date.parse(manifest.observedAtUtc)) ||
    manifest.normalization !== "CRLF-to-LF-only"
  )
    fail("Invalid source snapshot/normalization");
  for (const field of [
    "sources",
    "evidenceFiles",
    "objects",
    "platformPrerequisites",
    "excludedExecutions",
    "separateDataAssertions",
  ])
    rows(manifest[field], field, field === "evidenceFiles" ? 64 : 512);
  if (!manifest.sources.length || !manifest.objects.length) fail("Empty source/object scope");
  const allIds = [];
  for (const [field, keys, fileKind] of [
    ["sources", ["id", "path", "sha256Lf", "lineageClass", "evidenceRefs"], "source"],
    ["evidenceFiles", ["id", "path", "sha256Lf"], "evidence"],
  ]) {
    for (const row of manifest[field]) {
      shape(row, keys, field);
      if (!validId(row.id) || !shaPattern.test(row.sha256Lf ?? "")) fail(`Invalid ${field} pin`);
      validateInventoryPath(row.path, fileKind);
      allIds.push(row.id);
      if (field === "sources") {
        if (!lineages.includes(row.lineageClass))
          fail("Invalid lineage class; applied lineage cannot be asserted");
        ids(row.evidenceRefs, "source evidence refs");
      }
    }
    unique(
      manifest[field].map((row) => row.path),
      `${field} paths`,
    );
  }
  const sourceIds = new Set(manifest.sources.map((row) => row.id));
  const evidenceIds = new Set(manifest.evidenceFiles.map((row) => row.id));
  for (const source of manifest.sources)
    if (source.evidenceRefs.some((id) => !evidenceIds.has(id)))
      fail("Dangling source evidence reference");
  const signatures = [];
  for (const object of manifest.objects) {
    shape(
      object,
      ["id", "kind", "signature", "disposition", "sourceRefs", "dependencies", "facets"],
      "object",
    );
    if (
      !validId(object.id) ||
      !kinds.includes(object.kind) ||
      !["candidate", "unverified"].includes(object.disposition)
    )
      fail("Invalid object identity/disposition");
    allIds.push(object.id);
    if (object.kind === "function") signatures.push(canonicalFunctionSignature(object.signature));
    else if (object.signature !== undefined) fail("Only function objects may carry signatures");
    ids(object.sourceRefs, "object source refs");
    if (
      object.sourceRefs.some((id) => !sourceIds.has(id)) ||
      (!object.sourceRefs.length && object.disposition !== "unverified")
    )
      fail("Dangling/missing object source");
    rows(object.dependencies, "object dependencies", 128);
    for (const dependency of object.dependencies) {
      shape(dependency, ["id", "relation", "reviewStatus"], "dependency");
      if (
        !validId(dependency.id) ||
        !relations.includes(dependency.relation) ||
        !["source-observed", "unverified"].includes(dependency.reviewStatus)
      )
        fail("Invalid dependency metadata");
    }
    unique(
      object.dependencies.map((row) => `${row.id}:${row.relation}`),
      "dependency edges",
    );
    if (
      !object.facets ||
      Array.isArray(object.facets) ||
      typeof object.facets !== "object" ||
      !Object.keys(object.facets).length ||
      Object.entries(object.facets).some(
        ([key, value]) =>
          !/^[A-Za-z][A-Za-z0-9]*$/.test(key) || !["source-observed", "unreviewed"].includes(value),
      )
    )
      fail("Invalid object facets");
    if (
      object.kind === "table" &&
      tableFacets.some((facet) => !Object.hasOwn(object.facets, facet))
    )
      fail("Missing required table facets");
    // IDs are declared manually, not identities parsed from SQL. Parent-scoped
    // names must not disappear behind a reviewed status on an unrelated object.
    if (
      ["trigger", "policy", "grant"].includes(object.kind) &&
      ["identity", "attachment"].some((facet) => !Object.hasOwn(object.facets, facet))
    )
      fail("Missing declared identity/attachment facets");
  }
  unique(signatures, "function signatures");
  const objectIds = new Set(manifest.objects.map((row) => row.id));
  ids(manifest.roots, "roots");
  if (!manifest.roots.length || manifest.roots.some((id) => !objectIds.has(id)))
    fail("Dangling/empty roots");
  for (const object of manifest.objects)
    if (object.dependencies.some((dependency) => !objectIds.has(dependency.id)))
      fail("Dangling dependency");
  for (const prerequisite of manifest.platformPrerequisites) {
    shape(prerequisite, ["id", "reason", "reviewStatus"], "platform prerequisite");
    if (
      !validId(prerequisite.id) ||
      !nonempty(prerequisite.reason) ||
      prerequisite.reviewStatus !== "unverified"
    )
      fail("Platform prerequisites cannot be marked verified by this inventory");
    allIds.push(prerequisite.id);
  }
  unique(allIds, "inventory IDs");
  ids(manifest.forwardOnlySources, "forward-only sources");
  if (manifest.forwardOnlySources.some((id) => !sourceIds.has(id))) fail("Dangling forward source");
  const forward = new Set(manifest.forwardOnlySources);
  if (
    manifest.sources.some((row) => (row.lineageClass === "pending-forward") !== forward.has(row.id))
  )
    fail("Forward-only sources must remain pending, never applied/correspondence");
  for (const exclusion of manifest.excludedExecutions) {
    shape(exclusion, ["id", "sourceRefs", "reason"], "excluded execution");
    if (!validId(exclusion.id) || !nonempty(exclusion.reason)) fail("Invalid excluded execution");
    ids(exclusion.sourceRefs, "exclusion source refs");
    if (exclusion.sourceRefs.some((id) => !sourceIds.has(id))) fail("Dangling exclusion source");
  }
  unique(
    manifest.excludedExecutions.map((row) => row.id),
    "excluded execution IDs",
  );
  for (const assertion of manifest.separateDataAssertions) {
    shape(assertion, ["id", "reason", "status"], "data assertion");
    if (!validId(assertion.id) || !nonempty(assertion.reason) || assertion.status !== "unverified")
      fail("Data assertions cannot be verified by a metadata inventory");
  }
  unique(
    manifest.separateDataAssertions.map((row) => row.id),
    "data assertion IDs",
  );
  unique(
    [...allIds, ...manifest.separateDataAssertions.map((row) => row.id)],
    "inventory/data assertion IDs",
  );
  return true;
}

function graph(manifest) {
  const objects = new Map(manifest.objects.map((object) => [object.id, object]));
  const reached = new Set();
  const active = [];
  const complete = new Set();
  const cycles = new Set();
  function visit(id) {
    if (active.length > 512) fail("Dependency graph depth cap exceeded");
    const index = active.indexOf(id);
    if (index >= 0) {
      const ring = active.slice(index);
      const rotations = ring.map((_, offset) => [...ring.slice(offset), ...ring.slice(0, offset)]);
      rotations.sort((a, b) => compare(a.join("|"), b.join("|")));
      cycles.add(JSON.stringify([...rotations[0], rotations[0][0]]));
      return;
    }
    reached.add(id);
    if (complete.has(id)) return;
    active.push(id);
    for (const dependency of [...objects.get(id).dependencies].sort((a, b) => compare(a.id, b.id)))
      visit(dependency.id);
    active.pop();
    complete.add(id);
  }
  for (const id of sorted(manifest.roots)) visit(id);
  return { reached: sorted(reached), cycles: sorted(cycles).map((cycle) => JSON.parse(cycle)) };
}

export function analyzeBaselineScope(manifest, files, options) {
  validateBaselineScope(manifest, options);
  rows(files, "provided files", 576);
  let totalBytes = 0;
  for (const file of files) {
    shape(file, ["path", "content"], "provided file");
    if (typeof file.content !== "string" || Buffer.byteLength(file.content) > maxFileBytes)
      fail("Invalid provided file contents");
    totalBytes += Buffer.byteLength(file.content);
    if (totalBytes > maxTotalBytes) fail("Total inventory file byte cap exceeded");
  }
  unique(
    files.map((file) => file.path),
    "provided paths",
  );
  const contents = new Map(files.map((file) => [file.path, file.content]));
  const evidence = new Map();
  for (const pin of [...manifest.sources, ...manifest.evidenceFiles]) {
    if (!contents.has(pin.path) || hash(contents.get(pin.path)) !== pin.sha256Lf)
      fail(`Source/evidence pin mismatch: ${pin.id}`);
    if (pin.path.endsWith(".json")) {
      let parsed;
      try {
        parsed = JSON.parse(contents.get(pin.path));
      } catch {
        fail(`Invalid evidence JSON: ${pin.id}`);
      }
      boundedJson(parsed);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        fail(`Evidence project mismatch: ${pin.id}`);
      // Check every present spelling: malformed/conflicting project must not
      // fall through to projectRef. Manifest identity and lineage stay strict.
      const hasProject = Object.hasOwn(parsed, "project");
      const hasProjectRef = Object.hasOwn(parsed, "projectRef");
      if (
        (!hasProject && !hasProjectRef) ||
        (hasProject && parsed.project !== manifest.project) ||
        (hasProjectRef && parsed.projectRef !== manifest.project)
      )
        fail(`Evidence project mismatch: ${pin.id}`);
      evidence.set(pin.id, parsed);
    }
  }
  const sources = [...manifest.sources]
    .sort((a, b) => compare(a.id, b.id))
    .map((source) => {
      const referenced = source.evidenceRefs.map((id) => evidence.get(id)).filter(Boolean);
      const filename = source.path.split("/").at(-1);
      const supported = referenced.some(
        (snapshot) =>
          snapshot.legacyApplied?.some(
            (row) => row.source_file === filename && row.source_sha256 === source.sha256Lf,
          ) ||
          snapshot.historySqlHashes?.some(
            (row) =>
              row.sql_sha256_lf === source.sha256Lf &&
              (row.local_source_file === undefined || row.local_source_file === filename),
          ),
      );
      if (source.lineageClass === "source-correspondence" && !supported)
        fail(`Unsupported source-correspondence evidence: ${source.id}`);
      // Catalog fingerprints cover selected objects, not complete migration SQL.
      // Until an explicit narrower mapping format is reviewed, this class cannot
      // upgrade a source pin to a whole-file correspondence claim.
      if (source.lineageClass === "catalog-correspondence")
        fail(`Unsupported whole-source catalog correspondence: ${source.id}`);
      return {
        id: source.id,
        path: source.path,
        sha256Lf: source.sha256Lf,
        lineageClass: source.lineageClass,
        sourceHashCorrespondenceSupported: supported,
        exactAppliedLineageVerified: false,
        appliedLineageInferred: false,
      };
    });
  const closure = graph(manifest);
  const reached = new Set(closure.reached);
  const findings = [];
  const finding = (code, id) => findings.push({ code, id });
  for (const object of [...manifest.objects].sort((a, b) => compare(a.id, b.id))) {
    if (!reached.has(object.id)) finding("DECLARED_OBJECT_OUTSIDE_CLOSURE", object.id);
    if (object.disposition === "unverified") finding("UNVERIFIED_OBJECT", object.id);
    for (const [facet, status] of Object.entries(object.facets))
      if (status === "unreviewed") finding("UNREVIEWED_FACET", `${object.id}:${facet}`);
    for (const dependency of object.dependencies)
      if (dependency.reviewStatus === "unverified")
        finding("UNVERIFIED_DEPENDENCY", `${object.id}:${dependency.id}`);
    if (object.sourceRefs.some((id) => manifest.forwardOnlySources.includes(id)))
      finding("PENDING_FORWARD_OBJECT", object.id);
  }
  for (const cycle of closure.cycles) finding("DEPENDENCY_CYCLE_REQUIRES_REVIEW", cycle.join("->"));
  for (const prerequisite of manifest.platformPrerequisites)
    finding("UNVERIFIED_PLATFORM_PREREQUISITE", prerequisite.id);
  for (const assertion of manifest.separateDataAssertions)
    finding("SEPARATE_DATA_ASSERTION_UNVERIFIED", assertion.id);
  for (const exclusion of manifest.excludedExecutions)
    if (reached.has(exclusion.id)) finding("EXCLUDED_EXECUTION_REACHABLE", exclusion.id);
  for (const source of sources)
    if (source.lineageClass === "unclassified") finding("UNCLASSIFIED_SOURCE", source.id);
  findings.sort((a, b) => compare(a.code, b.code) || compare(a.id, b.id));
  const declaredCoverageComplete = findings.length === 0;
  return {
    formatVersion: 1,
    mode: "offline-read-only-metadata",
    project: manifest.project,
    repository: manifest.repository,
    scopeId: manifest.scopeId,
    sourceCommit: manifest.sourceCommit,
    observedAtUtc: manifest.observedAtUtc,
    status: declaredCoverageComplete
      ? "declared_structure_pins_closure_only"
      : "explicit_unknown_coverage",
    exitCode: declaredCoverageComplete ? 0 : 1,
    structureValid: true,
    pinsVerified: true,
    declaredCoverageComplete,
    fullReplayVerified: false,
    baselineVerified: false,
    databaseReleaseApproved: false,
    exactAppliedLineageVerified: false,
    schemaParityVerified: false,
    dataParityVerified: false,
    aclParityVerified: false,
    sqlObjectIdentityVerified: false,
    attachmentsVerified: false,
    counts: {
      sources: sources.length,
      evidenceFiles: manifest.evidenceFiles.length,
      objects: manifest.objects.length,
      reachable: closure.reached.length,
      forwardOnlySources: manifest.forwardOnlySources.length,
      findings: findings.length,
    },
    roots: sorted(manifest.roots),
    reachableObjectIds: closure.reached,
    dependencyCycles: closure.cycles,
    forwardOnlySources: sorted(manifest.forwardOnlySources),
    excludedExecutionIds: sorted(manifest.excludedExecutions.map((row) => row.id)),
    sources,
    findings,
  };
}

export function readConstrainedInventoryFile(
  repositoryRoot,
  relativePath,
  kind = "evidence",
  fileSystem = fs,
  byteLimit = maxFileBytes,
) {
  validateInventoryPath(relativePath, kind);
  const root = fileSystem.realpathSync(repositoryRoot);
  const target = path.resolve(root, ...relativePath.split("/"));
  const within = (absolute) => {
    const relative = path.relative(root, absolute);
    return (
      relative !== "" &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
    );
  };
  if (!within(target)) fail("Inventory path escaped repository");
  let cursor = root;
  for (const segment of relativePath.split("/")) {
    cursor = path.join(cursor, segment);
    if (fileSystem.lstatSync(cursor).isSymbolicLink())
      fail("Symlink/junction inventory path rejected");
  }
  const realTarget = fileSystem.realpathSync(target);
  if (!within(realTarget)) fail("Resolved inventory path escaped repository");
  const stat = fileSystem.statSync(realTarget);
  if (!stat.isFile() || stat.size > byteLimit) fail("Inventory file is not a bounded regular file");
  const content = fileSystem.readFileSync(realTarget, "utf8");
  if (Buffer.byteLength(content) > byteLimit) fail("Inventory read exceeded byte cap");
  return content;
}
export function runInventoryCli(args, repositoryRoot, fileSystem = fs) {
  if (!Array.isArray(args) || args.length !== 1 || !args[0]?.endsWith(".json"))
    fail("Usage: node scripts/ci/baseline-scope-inventory.mjs docs/evidence/<inventory>.json");
  const manifest = JSON.parse(
    readConstrainedInventoryFile(repositoryRoot, args[0], "evidence", fileSystem, 2 * 1024 * 1024),
  );
  validateBaselineScope(manifest);
  let bytesRemaining = maxTotalBytes;
  const files = [
    ...manifest.sources.map((pin) => ({ ...pin, kind: "source" })),
    ...manifest.evidenceFiles.map((pin) => ({ ...pin, kind: "evidence" })),
  ].map((pin) => {
    if (bytesRemaining <= 0) fail("Total inventory file byte cap exceeded before read");
    const content = readConstrainedInventoryFile(
      repositoryRoot,
      pin.path,
      pin.kind,
      fileSystem,
      Math.min(maxFileBytes, bytesRemaining),
    );
    bytesRemaining -= Buffer.byteLength(content);
    return { path: pin.path, content };
  });
  return analyzeBaselineScope(manifest, files);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
    const report = runInventoryCli(process.argv.slice(2), repositoryRoot);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.exitCode;
  } catch (error) {
    console.error(
      JSON.stringify({ status: "invalid_inventory", exitCode: 2, error: error.message }),
    );
    process.exitCode = 2;
  }
}
