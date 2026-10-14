#!/usr/bin/env node
// Diff-aware ESLint: lint only files changed since <base>, and fail only on
// errors that land on lines this change added or modified.
//
// The repository carries ~13.8k pre-existing ESLint errors (mostly Prettier
// formatting). Linting whole changed files would make any PR touching an old
// file fail for problems it did not introduce, so we filter to changed lines.
// New files are therefore linted in full.
//
// Usage: node scripts/ci/eslint-changed-lines.mjs <base-ref-or-sha>
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";

const base = process.argv[2];
if (!base) {
  console.error("usage: eslint-changed-lines.mjs <base-ref-or-sha>");
  process.exit(2);
}
const inActions = process.env.GITHUB_ACTIONS === "true";
const summaryFile = process.env.GITHUB_STEP_SUMMARY;
const EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
// Generated files are never hand-linted.
const IGNORE = new Set(["src/routeTree.gen.ts", "src/integrations/supabase/types.ts"]);

const diff = execFileSync(
  "git",
  ["diff", "-U0", "--no-color", "--diff-filter=ACMR", `${base}...HEAD`],
  {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  },
);

const changed = new Map(); // file -> Set(lines)
let current = null;
for (const line of diff.split("\n")) {
  if (line.startsWith("+++ ")) {
    const p = line.slice(4).replace(/^b\//, "");
    current = p !== "/dev/null" && EXT.test(p) && !IGNORE.has(p) && fs.existsSync(p) ? p : null;
    if (current && !changed.has(current)) changed.set(current, new Set());
  } else if (current && line.startsWith("@@")) {
    const m = /\+(\d+)(?:,(\d+))?/.exec(line);
    if (!m) continue;
    const start = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);
    for (let i = start; i < start + count; i++) changed.get(current).add(i);
  }
}

const files = [...changed.keys()];
if (files.length === 0) {
  const msg = "ESLint (changed lines): no changed JS/TS files.";
  console.log(msg);
  if (summaryFile) fs.appendFileSync(summaryFile, `### ${msg}\n`);
  process.exit(0);
}

const res = spawnSync("npx", ["eslint", "--format", "json", "--no-warn-ignored", ...files], {
  encoding: "utf8",
  maxBuffer: 256 * 1024 * 1024,
});
let results;
try {
  results = JSON.parse(res.stdout);
} catch {
  console.error(res.stdout);
  console.error(res.stderr);
  console.error("ESLint did not produce JSON output (config or crash error).");
  process.exit(2);
}

const cwd = process.cwd();
let blocking = 0;
let warnings = 0;
let preexisting = 0;
const out = [];
for (const r of results) {
  const rel = r.filePath.startsWith(cwd) ? r.filePath.slice(cwd.length + 1) : r.filePath;
  const lines = changed.get(rel) ?? new Set();
  for (const m of r.messages) {
    const onChangedLine = m.fatal || lines.has(m.line);
    if (!onChangedLine) {
      preexisting++;
      continue;
    }
    const level = m.severity === 2 ? "error" : "warning";
    if (level === "error") blocking++;
    else warnings++;
    const text = `${m.message}${m.ruleId ? ` (${m.ruleId})` : ""}`;
    out.push(`${rel}:${m.line}:${m.column ?? 0} ${level} ${text}`);
    if (inActions)
      console.log(`::${level} file=${rel},line=${m.line},col=${m.column ?? 0}::${text}`);
  }
}

if (!inActions) out.forEach((l) => console.log(l));
const summary = [
  `### ESLint on changed lines (${files.length} file(s) vs \`${base}\`)`,
  "",
  `- Errors on changed lines (block the build): **${blocking}**`,
  `- Warnings on changed lines: ${warnings}`,
  `- Pre-existing problems elsewhere in those files (ignored): ${preexisting}`,
  "",
  blocking ? "Fix locally with `npx eslint --fix <file>` (Prettier issues auto-fix)." : "",
].join("\n");
console.log(summary);
if (summaryFile) fs.appendFileSync(summaryFile, `${summary}\n`);
process.exit(blocking ? 1 : 0);
