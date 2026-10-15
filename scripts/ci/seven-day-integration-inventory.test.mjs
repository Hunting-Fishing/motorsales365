// Dated GitHub metadata / local commit ancestry capture, NOT operational proof.
// Hermetic: no git subprocess, credentials, network, source replay or DB access.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../../", import.meta.url);
const raw = fs
  .readFileSync(new URL("docs/evidence/seven-day-pr-inventory-2026-10-15.json", root), "utf8")
  .replaceAll("\r\n", "\n");
const capture = JSON.parse(raw);
const prs = capture.pullRequests;
test("dated canonical capture is bounded and immutable; no acceptance flags", () => {
  assert.equal(Buffer.byteLength(raw), 32594);
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    "898cde522511fb792356e3ddcd5652780b7c72057cf1c5c681b8b9f7444b7d3d",
  );
  assert.equal(raw, JSON.stringify(capture, null, 2) + "\n");
  assert.equal(capture.repository, "Hunting-Fishing/motorsales365");
  assert.equal(capture.candidateBranch, "completion/365-seven-day-integration");
  assert.equal(capture.candidateCommit, "0aa3fb5f1a3f0f664e4808b6eaab5342cc0acb27");
  assert.equal(capture.remoteMainCommit, "70ab892a8b7c05eac288ea4a6cce7a002d316f00");
  assert.equal(capture.localOriginMainCommit, capture.remoteMainCommit);
  assert.match(capture.observedAtUtc, /^2026-10-15 \d{2}:\d{2}:\d{2} UTC$/);
  assert.match(capture.meaning, /not patch parity/);
  for (const field of ["accepted", "deployed", "productionReady", "baselineApproved"])
    assert.ok(!Object.hasOwn(capture, field));
});
test("all 61 open PR heads remain individually identifiable, without treating draft as completion", () => {
  assert.equal(prs.length, 61);
  assert.equal(prs.filter((p) => p.isDraft).length, 58);
  assert.equal(new Set(prs.map((p) => p.number)).size, prs.length);
  assert.equal(new Set(prs.map((p) => p.headRefName)).size, prs.length);
  for (const p of prs) {
    assert.ok(Number.isInteger(p.number) && p.number > 0);
    assert.equal(p.url, "https://github.com/Hunting-Fishing/motorsales365/pull/" + p.number);
    assert.match(p.headRefOid, /^[a-f0-9]{40}$/);
    assert.equal(p.head, p.headRefOid);
    assert.ok(typeof p.title === "string" && p.title.length > 0 && p.title.length < 500);
    assert.equal(typeof p.isDraft, "boolean");
    assert.equal(typeof p.ancestorOfCandidate, "boolean");
    assert.equal(p.localCommitPresent, true);
  }
});
test("59 heads are already ancestors, including CI8; provider9 and plan2 need separate content reconciliation", () => {
  assert.equal(prs.filter((p) => p.ancestorOfCandidate).length, 59);
  assert.deepEqual(
    prs
      .filter((p) => !p.ancestorOfCandidate)
      .map((p) => p.number)
      .sort((a, b) => a - b),
    [2, 9],
  );
  assert.equal(prs.find((p) => p.number === 8).ancestorOfCandidate, true);
});
test("PR67 has a 58-head chain to PR5; the four main-target roots have no invented merge", () => {
  const byHead = new Map(prs.map((p) => [p.headRefName, p]));
  assert.deepEqual(
    prs
      .filter((p) => p.baseRefName === "main")
      .map((p) => p.number)
      .sort((a, b) => a - b),
    [2, 5, 8, 9],
  );
  const chain = [],
    seen = new Set();
  let p = prs.find((p) => p.number === 67);
  while (p) {
    assert.ok(!seen.has(p.number));
    seen.add(p.number);
    chain.push(p.number);
    p = byHead.get(p.baseRefName);
  }
  assert.equal(chain.length, 58);
  assert.equal(chain[0], 67);
  assert.equal(chain.at(-1), 5);
});
test("new internal staff and inventory CI steps remain explicit and never quarantined", () => {
  const yaml = fs.readFileSync(new URL(".github/workflows/ci.yml", root), "utf8");
  assert.match(
    yaml,
    /Internal staff acknowledgments and private UI lifetimes \(never quarantined\)/,
  );
  assert.match(
    yaml,
    /npx vitest run src\/lib\/internal-staff.functions.test.ts src\/components\/internal-staff\/InternalStaffView.test.tsx --maxWorkers=1/,
  );
  assert.match(yaml, /node --test scripts\/ci\/seven-day-integration-inventory.test.mjs/);
});
