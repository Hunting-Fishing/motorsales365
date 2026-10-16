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
  const parts = workflow.jobs["parts-rls"];
  assert.equal(parts.services, undefined);
  assert.equal(parts.container, undefined);
  assert.equal(parts.env, undefined);
  const install = parts.steps.find(
    (step) => step.name === "Install native PostgreSQL 17 (ephemeral runner only)",
  );
  const replay = parts.steps.find(
    (step) => step.name === "Run suite (--local replay of supabase/migrations)",
  );
  const cleanup = parts.steps.find(
    (step) => step.name === "Clean private PostgreSQL cluster (always)",
  );
  assert.ok(install && replay && cleanup);
  assert.equal(install.if, undefined);
  assert.equal(replay.if, undefined);
  assert.equal(cleanup.if, "always()");
  assert.equal(install["continue-on-error"], undefined);
  assert.equal(replay["continue-on-error"], undefined);
  assert.equal(cleanup["continue-on-error"], undefined);
  assert.equal(install["timeout-minutes"], 5);
  assert.equal(cleanup["timeout-minutes"], 2);
  assert.match(install.run, /https:\/\/www\.postgresql\.org\/media\/keys\/ACCC4CF8\.asc/);
  assert.match(
    install.run,
    /signed-by=\/usr\/share\/postgresql-common\/pgdg\/apt\.postgresql\.org\.asc/,
  );
  assert.match(install.run, /https:\/\/apt\.postgresql\.org\/pub\/repos\/apt noble-pgdg main/);
  assert.match(install.run, /postgresql-17 postgresql-client-17/);
  assert.match(install.run, /create_main_cluster = false/);
  assert.match(replay.run, /mktemp -d "\$parts_temp_base\/parts-rls\.XXXXXX"/);
  assert.match(replay.run, /PGPORT=55432 PGCONNECT_TIMEOUT=5/);
  assert.match(replay.run, /export PGHOST="\$parts_pg_root\/socket"/);
  assert.match(replay.run, /--auth-local=trust --auth-host=reject/);
  assert.match(replay.run, /--set=listen_addresses= /);
  assert.doesNotMatch(replay.run, /listen_addresses=''/);
  assert.match(replay.run, /unix_socket_permissions=0700/);
  assert.match(replay.run, /pg_ctl .* -w -t 30 start/);
  assert.match(replay.run, /pg_isready -d postgres -t 5/);
  assert.match(replay.run, /SHOW server_version_num/);
  assert.match(replay.run, /\^17\[0-9\]\{4\}\$/);
  assert.match(replay.run, /SHOW data_directory/);
  assert.match(replay.run, /SHOW unix_socket_directories/);
  assert.match(replay.run, /SHOW listen_addresses/);
  assert.match(replay.run, /SELECT rolsuper FROM pg_roles/);
  assert.match(
    replay.run,
    /unset DATABASE_URL PGSERVICE PGSERVICEFILE PGHOSTADDR PGPASSWORD PGOPTIONS/,
  );
  assert.match(replay.run, /trap cleanup_parts_cluster EXIT/);
  assert.match(replay.run, /-m fast -w -t 15 stop/);
  assert.match(replay.run, /-m immediate -w -t 15 stop/);
  assert.match(
    replay.run,
    /bash scripts\/test-parts-rls-adversarial\.sh --local 2>&1 \| tee parts-rls\.log/,
  );
  assert.match(replay.run, /SKIP\.\*parts adversarial RLS suite/);
  assert.match(replay.run, /Suite skipped unexpectedly.*exit 1/);
  assert.doesNotMatch(replay.run, /skipping\.|exit 0/);
  assert.match(cleanup.run, /realpath -e "\$PARTS_PG_ROOT"/);
  assert.match(cleanup.run, /case "\$parts_pg_root" in "\$parts_temp_base"\/parts-rls\.\*/);
  assert.match(cleanup.run, /test "\$\(dirname "\$parts_pg_root"\)" = "\$parts_temp_base"/);
  assert.match(cleanup.run, /\^parts-rls\\\.\[A-Za-z0-9\]\{6\}\$/);
  assert.match(cleanup.run, /-m fast -w -t 15 stop/);
  assert.match(cleanup.run, /-m immediate -w -t 15 stop/);
  assert.match(cleanup.run, /cp "\$parts_pg_root\/server\.log" parts-rls-server\.log/);
  assert.match(cleanup.run, /rm -rf -- "\$parts_pg_root"/);
  assert.doesNotMatch(JSON.stringify(parts), /docker|postgres:17|secrets\.|systemctl start/i);
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
    [
      "Native quote detail private lifetimes and conversion interlock (never quarantined)",
      "npx vitest run src/components/shop-manager/quote-detail.test.tsx --maxWorkers=1",
    ],
    [
      "Independent Workers build source freeze (offline, never quarantined)",
      "node --test scripts/ci/independent-workers-build.test.mjs",
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
