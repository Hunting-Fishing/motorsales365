import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const checker = fileURLToPath(new URL("./check-vitest-results.mjs", import.meta.url));

function run(overrides = {}, quarantined = false) {
  const directory = mkdtempSync(path.join(tmpdir(), "365-ci-report-"));
  try {
    const report = {
      numTotalTests: 1,
      numPassedTests: 1,
      numFailedTests: 0,
      success: true,
      testResults: [
        {
          name: path.join(directory, "example.test.ts"),
          status: "passed",
          assertionResults: [{ fullName: "example", status: "passed" }],
        },
      ],
      ...overrides,
    };
    writeFileSync(path.join(directory, "report.json"), JSON.stringify(report));
    writeFileSync(
      path.join(directory, "quarantine.json"),
      JSON.stringify({
        tests: quarantined ? [{ file: "example.test.ts", name: "example" }] : [],
      }),
    );
    const result = spawnSync(process.execPath, [checker, "report.json", "quarantine.json"], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, GITHUB_ACTIONS: "false", GITHUB_STEP_SUMMARY: "" },
    });
    assert.ifError(result.error);
    return result.status;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("complete passing report succeeds", () => assert.equal(run(), 0));
test("empty report fails", () => assert.equal(run({ numTotalTests: 0, testResults: [] }), 1));
test("unhandled runtime errors fail even when assertions pass", () => {
  assert.equal(run({ unhandledErrors: [{ message: "unhandled rejection" }] }), 1);
});
test("failed process without failure details fails", () => {
  assert.equal(run({ success: false }), 1);
});
test("unreported failed assertions fail", () => {
  assert.equal(run({ numFailedTests: 1 }), 1);
});
test("quarantined assertion remains visible without blocking", () => {
  // Vitest's fullName is the quarantine identity; the test filename is relative
  // to the checker working directory on both Windows and Linux.
  const failed = {
    numPassedTests: 0,
    numFailedTests: 1,
    success: false,
    testResults: [
      {
        name: "example.test.ts",
        status: "failed",
        assertionResults: [
          { fullName: "example", status: "failed", failureMessages: ["known failure"] },
        ],
      },
    ],
  };
  assert.equal(run(failed, true), 0);
  assert.equal(run(failed), 1);
});
