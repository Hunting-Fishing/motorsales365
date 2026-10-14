#!/usr/bin/env node
// Compare a vitest JSON report against scripts/ci/vitest-quarantine.json.
//
// - Any failing test (or test file that failed to load) that is NOT quarantined -> exit 1.
// - Quarantined tests that still fail are reported, not fatal.
// - Quarantined tests that now pass, or no longer exist, produce warnings so the
//   list shrinks over time.
//
// Usage: node scripts/ci/check-vitest-results.mjs <vitest-report.json> [quarantine.json]
import fs from "node:fs";
import path from "node:path";

const reportPath = process.argv[2] ?? "vitest-report.json";
const quarantinePath = process.argv[3] ?? "scripts/ci/vitest-quarantine.json";
const summaryFile = process.env.GITHUB_STEP_SUMMARY;
const inActions = process.env.GITHUB_ACTIONS === "true";

function annotate(level, msg, file) {
  if (inActions)
    console.log(`::${level}${file ? ` file=${file}` : ""}::${msg.replace(/\n/g, "%0A")}`);
  else console.log(`[${level}] ${file ? `${file}: ` : ""}${msg}`);
}

if (!fs.existsSync(reportPath)) {
  annotate(
    "error",
    `vitest report ${reportPath} was not written; vitest crashed before reporting.`,
  );
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const quarantine = JSON.parse(fs.readFileSync(quarantinePath, "utf8")).tests ?? [];
const key = (file, name) => `${file} :: ${name}`;
const quarantined = new Map(quarantine.map((q) => [key(q.file, q.name), q]));

const root = process.cwd();
const failures = [];
const passed = new Set();
const seen = new Set();

for (const file of report.testResults ?? []) {
  const rel = path.relative(root, file.name).split(path.sep).join("/");
  const failedAssertions = (file.assertionResults ?? []).filter((a) => a.status === "failed");
  for (const a of file.assertionResults ?? []) {
    const k = key(rel, a.fullName);
    seen.add(k);
    if (a.status === "passed") passed.add(k);
  }
  for (const a of failedAssertions) {
    failures.push({
      file: rel,
      name: a.fullName,
      message: (a.failureMessages ?? []).join("\n").split("\n")[0],
    });
  }
  if (file.status === "failed" && failedAssertions.length === 0) {
    // Suite-level error (import/compile failure). Quarantinable only as "<file load error>".
    failures.push({
      file: rel,
      name: "<file load error>",
      message: (file.message ?? "").split("\n")[0],
    });
  }
}

const unexpected = failures.filter((f) => !quarantined.has(key(f.file, f.name)));
const known = failures.filter((f) => quarantined.has(key(f.file, f.name)));
const nowPassing = quarantine.filter((q) => passed.has(key(q.file, q.name)));
const missing = quarantine.filter(
  (q) =>
    !seen.has(key(q.file, q.name)) &&
    !failures.some((f) => key(f.file, f.name) === key(q.file, q.name)),
);

const total = report.numTotalTests ?? 0;
const lines = [];
lines.push(`### Vitest: ${report.numPassedTests ?? 0}/${total} passed`);
lines.push("");
lines.push(`- Unexpected failures (block the build): **${unexpected.length}**`);
lines.push(`- Quarantined known failures (reported only): ${known.length}`);
lines.push(`- Quarantined tests now passing (remove from list): ${nowPassing.length}`);
if (missing.length)
  lines.push(`- Quarantine entries not found in this run (renamed/deleted?): ${missing.length}`);
if (unexpected.length) {
  lines.push("", "#### Unexpected failures");
  for (const f of unexpected)
    lines.push(`- \`${f.file}\` — ${f.name}${f.message ? `: ${f.message.slice(0, 200)}` : ""}`);
}
if (known.length) {
  lines.push("", "<details><summary>Quarantined failures</summary>", "");
  for (const f of known) lines.push(`- \`${f.file}\` — ${f.name}`);
  lines.push("", "</details>");
}
const text = lines.join("\n");
console.log(text);
if (summaryFile) fs.appendFileSync(summaryFile, `${text}\n`);

for (const f of unexpected)
  annotate(
    "error",
    `New test failure: ${f.name}${f.message ? ` — ${f.message.slice(0, 300)}` : ""}`,
    f.file,
  );
for (const q of nowPassing)
  annotate(
    "warning",
    `Quarantined test now passes; remove it from ${quarantinePath}: ${q.name}`,
    q.file,
  );
for (const q of missing)
  annotate("warning", `Quarantine entry did not run (renamed or deleted?): ${q.name}`, q.file);

process.exit(unexpected.length ? 1 : 0);
