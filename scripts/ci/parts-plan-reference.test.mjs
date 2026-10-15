// Offline source recovery and authority separation, not operational acceptance.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../../", import.meta.url);
const referenceRoot = "docs/reference/parts-pr2/";
const manifest = JSON.parse(
  fs.readFileSync(new URL(referenceRoot + "manifest.json", root), "utf8"),
);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const expected = new Map([
  ["365_PARTS_DECISION_REGISTER.md", "caeba24c4d8f5abe217094538d49dedb71b03d21"],
  ["365_PARTS_EXECUTION_ROADMAP.md", "c03289cddeaad4d41863cba9f47448568611773f"],
  ["365_PARTS_GLOBAL_EXPANSION_PLAN.md", "e60c825b900b84287a8d82b1682f2c0cefbd5dee"],
  ["365_PARTS_GLOBAL_EXPORT_DISTRIBUTION_PLAN.md", "a7bfd90f400bc8c4ad3e5d85e056ff7503b84c4e"],
  ["365_PARTS_PROGRAM_INDEX.md", "1e3e22bdcf3efbbc4489ab45fcc432bd0061194f"],
  ["365_PARTS_QUALITY_TRACEABILITY_PLAN.md", "db5a959e87ec3483f3790676225fe7bff0c58a5e"],
  ["365_PARTS_REGULATORY_CHANGE_REGISTER.md", "14bd615b1e20d026fa249c754f5461b4e9cabdd4"],
  ["365_PARTS_UNIT_ECONOMICS_CAPITAL_PLAN.md", "72040e408a5955f30e6c05cf077737b9a4f690aa"],
  ["country-packs/PHILIPPINES.md", "13ace6527680134d76725d62909074f6dede56df"],
  [
    "history/365_PARTS_PARTNER_NETWORK_PLAN_BRANCH_ARCHIVE.md",
    "62af9a5e5a5f63ee73036520931b528d74ffd11c",
  ],
  ["trade-lanes/PH_ORIGIN_PILOT.md", "2df2dbbaf02151d47d6449d2db8bc28b8b176b2b"],
]);

test("recovery identifies the exact draft and observation without authority transfer", () => {
  assert.equal(manifest.formatVersion, 1);
  assert.equal(manifest.kind, "immutable-non-authoritative-plan-reference");
  assert.equal(manifest.repository, "Hunting-Fishing/motorsales365");
  assert.deepEqual(manifest.source, {
    pullRequest: 2,
    commit: "cc75542f183e5b8ab363edef24f712a3899fb96f",
    baseCommit: "c8b66ebd9eecfd5b76c385c4442e1282d27bd9ac",
    statusAtObservation: "draft-open",
  });
  assert.equal(manifest.observedIntegrationCommit, "06e21a2ef968975fc43e840d17c84ad77c4ea48c");
  assert.equal(manifest.noAuthorityTransfer, true);
  assert.deepEqual(manifest.approval, {
    sourcePrMerged: false,
    activeBaselineReplaced: false,
    buildOrLaunchApproved: false,
    runtimeAccepted: false,
    newHostedBackendApproved: false,
    paidResourcesApproved: false,
  });
  assert.equal(manifest.canonicalHostedProjectRef, "wjxaajgvddtrxxtocxen");
});

test("the complete missing-document set is bounded and has no path substitution", () => {
  assert.equal(manifest.files.length, 11);
  assert.deepEqual(
    manifest.files.map((f) => f.sourcePath).sort(),
    [...expected.keys()].map((p) => "docs/" + p).sort(),
  );
  assert.equal(new Set(manifest.files.map((f) => f.referencePath)).size, 11);
  assert.equal(
    manifest.files.reduce((sum, f) => sum + f.bytes, 0),
    381036,
  );
});

for (const [path, blob] of expected) {
  test("preserves original bytes and pinned source for " + path, () => {
    const file = manifest.files.find((f) => f.sourcePath === "docs/" + path);
    assert.ok(file);
    assert.equal(file.referencePath, referenceRoot + "source/" + path);
    assert.equal(file.gitBlob, blob);
    assert.equal(
      file.sourceUrl,
      "https://github.com/Hunting-Fishing/motorsales365/blob/" +
        manifest.source.commit +
        "/docs/" +
        path,
    );
    const url = new URL(referenceRoot + "source/" + path, root);
    assert.ok(fs.lstatSync(url).isFile(), "reference is a regular file, not a link");
    const bytes = fs.readFileSync(url);
    assert.equal(bytes.length, file.bytes);
    const header = Buffer.from("blob " + bytes.length + "\0");
    assert.equal(createHash("sha1").update(header).update(bytes).digest("hex"), blob);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256);
    assert.ok(!bytes.includes(13), "original source is LF, not formatter-normalized CRLF");
  });
}

test("reference source tree contains only the eleven recovered regular files", () => {
  const actual = [];
  function walk(url, prefix = "") {
    for (const name of fs.readdirSync(url)) {
      const child = new URL(name, url);
      const stat = fs.lstatSync(child);
      assert.ok(!stat.isSymbolicLink());
      if (stat.isDirectory()) walk(new URL(name + "/", url), prefix + name + "/");
      else {
        assert.ok(stat.isFile());
        actual.push(prefix + name);
      }
    }
  }
  walk(new URL(referenceRoot + "source/", root));
  assert.deepEqual(actual.sort(), [...expected.keys()].sort());
});

test("draft gate numbers cannot be treated as equivalent or passed active gates", () => {
  assert.equal(manifest.gateCrosswalk.length, 10);
  const active = [
    ["PARTS-G0"],
    ["PARTS-G1", "PARTS-G2"],
    ["PARTS-G3"],
    ["PARTS-G7", "PARTS-G3", "PARTS-G6"],
    ["PARTS-G5"],
    ["PARTS-G6"],
    ["PARTS-G8"],
    ["PARTS-G9"],
    ["PARTS-G10"],
    [],
  ];
  manifest.gateCrosswalk.forEach((gate, index) => {
    assert.equal(gate.draftGate, "PR2-G" + index);
    assert.deepEqual(gate.activeGates, active[index]);
    assert.equal(gate.equivalent, false);
    assert.equal(gate.passed, false);
  });
  assert.equal(manifest.precedence.activeBuildAuthorizationGate, "PARTS-G4");
  assert.equal(manifest.precedence.activeSecurityGate, "PARTS-G2");
  assert.match(read("docs/365_PARTS_PARTNER_NETWORK_PLAN.md"), /G2 — tenancy and security/);
  assert.match(read("docs/365_PARTS_PARTNER_NETWORK_PLAN.md"), /G4 — build authorization/);
});

test("the shared Repair proposal is recorded separately rather than adopted as authority", () => {
  const shared = manifest.sharedChangeNotAdopted;
  assert.equal(shared.path, "docs/365_REPAIR_KNOWLEDGE_NETWORK_PLAN.md");
  assert.equal(shared.activeBlobAtObservation, "6939c590c8108cc0b112a2ee7f3a5f38cd983ae2");
  assert.equal(shared.sourceBlob, "df07ecf6520d08280688b5e209a8231e5959cb68");
  assert.equal(shared.addedLines, 2);
  assert.equal(shared.proposedText.split("\n").length - 1, 2);
  assert.match(shared.proposedText, /^> \*\*Related Parts program:\*\*/);
  assert.match(shared.reason, /Do not transfer/);
});

test("the current-authority link map resolves while original-link and decision gaps remain explicit", () => {
  const readme = read(referenceRoot + "README.md");
  assert.match(readme, /not the active Parts control baseline/);
  for (const field of [
    "platform",
    "activeParts",
    "activeRlsReport",
    "activeRepair",
    "activeHistory",
  ]) {
    const path = manifest.precedence[field];
    assert.ok(path.startsWith("docs/") && !path.includes(".."));
    assert.ok(fs.lstatSync(new URL(path, root)).isFile());
    assert.ok(readme.includes("../../" + path.slice(5)));
  }
  assert.equal(manifest.knownLinkLimits.length, 3);
  assert.match(readme, /not a claim that every historical link resolves/);
  assert.match(readme, /D-001–D-010/);
  assert.match(readme, /D-011–D-025/);
  assert.match(readme, /D-050/);
  assert.match(readme, /not seven-day activation commitments/);
});

test("formatting and CI preserve source bytes without quarantining reference checks", () => {
  assert.match(read(".prettierignore"), /^docs\/reference\/parts-pr2\/source\/$/m);
  const workflow = read(".github/workflows/ci.yml");
  assert.match(
    workflow,
    /Recovered Parts and remaining migration source guards \(never quarantined\)/,
  );
  assert.match(workflow, /node --test scripts\/ci\/parts-plan-reference.test.mjs/);
});
