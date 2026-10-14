// Offline workflow/entry-point checks. No Supabase command or live target exists.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { load } from "js-yaml";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const migrations = load(read(".github/workflows/migrations.yml"));
const deploy = load(read(".github/workflows/deploy.yml"));
const bash =
  process.platform === "win32"
    ? path.join(process.env.ProgramFiles || "C:\\Program Files", "Git", "bin", "bash.exe")
    : "/bin/bash";

test("entry point and inline freeze fail before any CLI despite old overrides and fake credentials", () => {
  assert.ok(
    fs.existsSync(bash),
    "Git Bash (Windows) or /bin/bash is required; never skip this gate",
  );
  const attempts = [undefined, "staging", "production", "--help"].map((label) => [
    "scripts/ci/supabase-plan.sh",
    ...(label ? [label] : []),
  ]);
  attempts.push(["-c", migrations.jobs["release-safety"].steps[0].run]);
  for (const args of attempts) {
    const result = spawnSync(bash, ["--noprofile", "--norc", ...args], {
      cwd: root,
      timeout: 5000,
      encoding: "utf8",
      env: {
        ...process.env,
        // An absolute Bash path is used; an empty PATH proves no external
        // executable (including Supabase) is needed or successfully invoked.
        PATH: "",
        BASH_ENV: "",
        SUPABASE_ACCESS_TOKEN: "fixture-token-not-real",
        SUPABASE_DB_PASSWORD: "fixture-password-not-real",
        MAX_PENDING_MIGRATIONS: "999999",
        ALLOW_PROD_MIGRATIONS_WITHOUT_STAGING: "true",
      },
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Automated historical db push is disabled/);
    assert.match(result.stderr, /does not authorize/);
    assert.doesNotMatch(
      result.stderr,
      /fixture-token-not-real|fixture-password-not-real|command not found/,
    );
  }
});

test("workflow quarantine gates staging before any credential or database step", () => {
  assert.deepEqual(migrations.permissions, { contents: "read" });
  assert.deepEqual(Object.keys(migrations.jobs).sort(), [
    "production",
    "release-safety",
    "staging",
    "types",
  ]);
  const gate = migrations.jobs["release-safety"];
  assert.equal(gate["runs-on"], "ubuntu-latest");
  assert.equal(gate["timeout-minutes"], 5);
  assert.equal(gate.env, undefined);
  assert.equal(gate.environment, undefined);
  assert.equal(gate.if, undefined);
  assert.equal(gate["continue-on-error"], undefined);
  assert.equal(gate.steps.length, 1);
  assert.equal(gate.steps[0].uses, undefined);
  assert.equal(gate.steps[0]["continue-on-error"], undefined);
  assert.equal(gate.steps[0].if, undefined);
  assert.match(gate.steps[0].run, /Automated historical db push is disabled/);
  assert.match(gate.steps[0].run, /exit 1/);
  assert.doesNotMatch(
    JSON.stringify(gate),
    /secrets\.|inputs\.ref|checkout|supabase link|always\(/,
  );
  assert.equal(migrations.jobs.staging.needs, "release-safety");
  assert.equal(migrations.jobs.staging.if, undefined);
});

test("production requires successful configured staging and cannot use the retired bypass", () => {
  const production = migrations.jobs.production;
  assert.equal(production.needs, "staging");
  assert.match(production.if, /needs\.staging\.result == 'success'/);
  assert.match(production.if, /needs\.staging\.outputs\.status == 'applied'/);
  assert.match(production.if, /needs\.staging\.outputs\.status == 'up-to-date'/);
  assert.equal(production.environment.name, "production");
  assert.equal(migrations.jobs.types.needs, "production");
  assert.equal(migrations.jobs.types.if, "needs.production.outputs.status == 'applied'");
  assert.doesNotMatch(
    read(".github/workflows/migrations.yml"),
    /ALLOW_PROD_MIGRATIONS_WITHOUT_STAGING|MAX_PENDING_MIGRATIONS/,
  );
  assert.doesNotMatch(
    read("scripts/ci/supabase-plan.sh"),
    /supabase (?:link|db push|migration repair)/,
  );
});

test("application deployment still fails when required database release is blocked", () => {
  assert.ok(deploy.jobs.production.needs.includes("migrations"));
  const configuration = deploy.jobs.production.steps.find((step) => step.id === "cfg");
  assert.equal(configuration.env.MIGRATIONS_NEEDED, "${{ needs.changes.outputs.migrations }}");
  assert.equal(
    configuration.env.PROD_MIGRATION_STATUS,
    "${{ needs.migrations.outputs.production_status }}",
  );
  assert.match(configuration.run, /PROD_MIGRATION_STATUS.*!= "applied"/);
  assert.match(configuration.run, /PROD_MIGRATION_STATUS.*!= "up-to-date"/);
  assert.match(configuration.run, /::error title=Deploy blocked/);
  assert.match(configuration.run, /exit 1/);
});
