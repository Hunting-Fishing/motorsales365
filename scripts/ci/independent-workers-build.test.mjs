// Source/child-process checks only. No install, build, upload, secret or network call.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));
const script = join(root, "scripts/ci/guard-independent-workers-build.mjs");
const prefix = "node scripts/ci/guard-independent-workers-build.mjs && ";
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const fakeSecret = "synthetic-secret-never-print-365";

function environment(marker) {
  const env = {
    ...process.env,
    ALLOW_UNAPPROVED_BUILD: "true",
    DATABASE_RELEASE_APPROVED: "true",
    SUPABASE_SERVICE_ROLE_KEY: fakeSecret,
    CLOUDFLARE_API_TOKEN: fakeSecret,
    npm_config_ignore_scripts: "true",
  };
  delete env.WORKERS_CI;
  if (marker !== undefined) env.WORKERS_CI = marker;
  return env;
}

function checkBlocked(result) {
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Independent Workers Builds are blocked/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(fakeSecret));
  assert.doesNotMatch(result.stdout, /Prepared .*same-origin|vite v.*building/);
}

for (const marker of ["1", "0", "false", "", "true", "unexpected"]) {
  test(`provider marker ${JSON.stringify(marker)} blocks without an environment bypass`, () => {
    checkBlocked(
      spawnSync(process.execPath, [script], {
        cwd: root,
        env: environment(marker),
        encoding: "utf8",
        timeout: 10000,
      }),
    );
  });
}

test("ordinary local/Actions guard invocation is silent and does not grant release approval", () => {
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    env: environment(undefined),
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("caller flags cannot turn the guard into a release or upload interface", () => {
  for (const args of [["--force"], ["--allow"], ["--help"]]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      env: environment(undefined),
      encoding: "utf8",
      timeout: 10000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr.trim(), "Unexpected build guard arguments.");
  }
});

test("both build entrypoints guard before Vite and lifecycle preparation guards before assets", () => {
  for (const name of ["build", "build:dev", "prebuild", "prebuild:dev"]) {
    assert.ok(pkg.scripts[name].startsWith(prefix), `${name} must start with the freeze`);
  }
  assert.equal(pkg.scripts.prebuild, prefix + "npm run ocr:assets");
  assert.equal(pkg.scripts["prebuild:dev"], prefix + "npm run ocr:assets");
  assert.equal(
    pkg.scripts.build,
    prefix + "node --max-old-space-size=8192 ./node_modules/vite/bin/vite.js build",
  );
  assert.equal(
    pkg.scripts["build:dev"],
    prefix +
      "node --max-old-space-size=8192 ./node_modules/vite/bin/vite.js build --mode development",
  );
});

test("actual npm ignore-scripts invocation cannot skip the build-script freeze", () => {
  const nodeDir = dirname(process.execPath);
  const npmCli = [
    process.env.npm_execpath,
    join(nodeDir, "node_modules/npm/bin/npm-cli.js"),
    resolve(nodeDir, "../lib/node_modules/npm/bin/npm-cli.js"),
  ].find((candidate) => candidate && candidate.endsWith("npm-cli.js") && existsSync(candidate));
  assert.ok(npmCli, "Installed npm CLI is required; never download or skip this test");
  for (const target of ["build", "build:dev"]) {
    const result = spawnSync(process.execPath, [npmCli, "--ignore-scripts", "run", target], {
      cwd: root,
      env: environment("0"),
      encoding: "utf8",
      timeout: 10000,
    });
    checkBlocked(result);
    assert.doesNotMatch(result.stdout, /\n> prebuild/);
  }
});
