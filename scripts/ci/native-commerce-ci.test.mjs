// Offline YAML assertions only; no runner, provider, database or network access.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";

const workflow = load(
  readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8"),
);

test("all six candidate CI gates pin the reviewed Ubuntu family, not a moving latest label", () => {
  assert.deepEqual(Object.keys(workflow.jobs).sort(), [
    "build",
    "lint",
    "parts-rls",
    "receipt-ocr-browser",
    "test",
    "typecheck",
  ]);
  for (const job of Object.values(workflow.jobs)) {
    assert.equal(job["runs-on"], "ubuntu-24.04");
    assert.equal(job["continue-on-error"], undefined);
  }
  assert.equal(workflow.env.NODE_VERSION, "22");
  assert.equal(workflow.jobs["parts-rls"].services.postgres.image, "postgres:17");
});

test("native commerce route suites stay explicit, single-worker and never quarantined", () => {
  const steps = workflow.jobs.test.steps;
  const expected = [
    [
      "Native invoice read lifetimes and financial acknowledgments (never quarantined)",
      "npx vitest run src/components/shop-manager/invoice-detail.test.tsx src/components/shop-manager/invoice-list.test.tsx --maxWorkers=1",
    ],
    [
      "Native quote and work-order list read lifetimes (never quarantined)",
      "npx vitest run src/components/shop-manager/quote-list.test.tsx src/components/shop-manager/work-order-list.test.tsx src/components/shop-manager/work-order-detail.test.tsx --maxWorkers=1",
    ],
    [
      "Native commerce test and pinned CI runner guards (offline, never quarantined)",
      "node --test scripts/ci/native-commerce-ci.test.mjs",
    ],
  ];
  for (const [name, command] of expected) {
    const matches = steps.filter((step) => step.name === name);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].run, command);
    assert.equal(matches[0].if, undefined);
    assert.equal(matches[0]["continue-on-error"], undefined);
  }
});
