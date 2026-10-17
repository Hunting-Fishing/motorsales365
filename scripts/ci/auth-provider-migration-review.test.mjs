// Sequential isolated PGlite metadata models only, never native Auth authority.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const source = fs
  .readFileSync(new URL("./auth-provider-migration-review.sql", import.meta.url), "utf8")
  .replaceAll("\r\n", "\n");
const code = source.replace(/--[^\n]*/g, "");
const statements = code.replace(/'(?:''|[^'])*'/g, "''");
const flags = [
  "runningServiceVersionVerified",
  "migrationBodiesVerified",
  "managedAuthBaselineVerified",
  "sessionAuthorityVerified",
  "releaseReady",
];
const hash = (value) => createHash("sha256").update(value).digest("hex");

test("actual version-metadata capture and exact query are pinned without promoting provider authority", () => {
  assert.equal(hash(source), "8832dd2c9d6bf7d1960da3ea246f7b12826834f153c4866583a836b4e1ad5fd5");
  const text = fs
    .readFileSync(
      new URL(
        "../../docs/evidence/auth-provider-migration-versions-2026-10-17.json",
        import.meta.url,
      ),
      "utf8",
    )
    .replaceAll("\r\n", "\n");
  assert.equal(hash(text), "d845ba39672e9f645dffeb4a19c6b7a136cccc0f9d9fc274e3384edaba124030");
  const value = JSON.parse(text);
  assert.deepEqual(
    Object.keys(value).sort(),
    [
      "scope",
      "complete",
      "versions",
      "truncated",
      "observedAt",
      "projectRef",
      "releaseReady",
      "selectedRows",
      "versionBound",
      "formatVersion",
      "catalogMatched",
      "serverVersionNum",
      "duplicateVersionRows",
      "unexpectedVersionRows",
      "migrationBodiesVerified",
      "sessionAuthorityVerified",
      "managedAuthBaselineVerified",
      "runningServiceVersionVerified",
    ].sort(),
  );
  assert.equal(value.formatVersion, 1);
  assert.equal(value.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(value.serverVersionNum, 170006);
  assert.equal(value.catalogMatched, true);
  assert.equal(value.complete, true);
  assert.equal(value.truncated, false);
  assert.equal(value.selectedRows, 82);
  assert.equal(value.versionBound, 256);
  assert.equal(value.unexpectedVersionRows, 0);
  assert.equal(value.duplicateVersionRows, 0);
  assert.equal(value.versions.length, 82);
  assert.equal(new Set(value.versions).size, 82);
  assert.deepEqual(value.versions, [...value.versions].sort());
  assert.ok(value.versions.every((v) => typeof v === "string" && /^(00|[0-9]{14})$/.test(v)));
  assert.equal(value.versions[0], "00");
  // These real numeric migration IDs are NOT valid calendar timestamps.
  assert.ok(value.versions.includes("20230322519590"));
  assert.ok(value.versions.includes("20230402418590"));
  assert.match(value.observedAt, /^2026-10-16T20:23:01\.943209\+00:00$/);
  for (const flag of flags) assert.equal(value[flag], false);
});

test("provider version privacy/capture/model gate is mandatory and serialized, never quarantined", () => {
  const workflow = fs
    .readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8")
    .replaceAll("\r\n", "\n");
  const name = "Auth provider migration-version provenance (offline, never quarantined)";
  assert.equal(workflow.split(name).length, 2);
  assert.ok(
    workflow.includes(
      `- name: ${name}\n        run: node --test --test-concurrency=1 scripts/ci/auth-provider-migration-review.test.mjs`,
    ),
  );
});

test("version query is bounded READ ONLY managed metadata, never Auth users/sessions/config or privileges", () => {
  assert.match(code, /^\s*BEGIN READ ONLY;/);
  assert.match(code, /SET LOCAL statement_timeout='5000ms';/);
  assert.match(code, /SET LOCAL lock_timeout='1000ms';/);
  assert.match(code, /SET LOCAL search_path=pg_catalog,pg_temp;/);
  assert.match(code, /ROLLBACK;\s*$/);
  assert.doesNotMatch(
    statements,
    /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|CREATE|DROP|GRANT|REVOKE|COPY|DO|CALL|EXECUTE)\b/i,
  );
  const authTables = [...code.matchAll(/\b(?:FROM|JOIN)\s+(auth\.[a-z_]+)/gi)].map((m) => m[1]);
  assert.deepEqual(authTables, ["auth.schema_migrations"]);
  assert.doesNotMatch(
    code,
    /auth\.(?:users|sessions|identities|refresh_tokens)|pg_read_file|pg_ls_dir|pg_get_functiondef|current_user|session_user/i,
  );
  assert.match(code, /ORDER BY version COLLATE "C" LIMIT 257/);
  assert.match(code, /NOT pg_catalog\.row_security_active\(c\.oid\)/);
  assert.match(code, /pg_catalog\.octet_length\(version\) IN \(2,14\)/);
  assert.match(code, /version COLLATE "C" ~ '\^\(00\|\[0-9\]\{14\}\)\$'/);
  assert.match(code, /count\(DISTINCT version COLLATE "C"\)/);
  assert.match(code, /s\.selected_rows<=256 AND s\.unexpected_rows=0/);
  assert.match(code, /s\.distinct_versions=s\.selected_rows/);
  assert.match(code, /'versions',CASE WHEN a\.complete THEN/);
  for (const flag of flags) assert.match(code, new RegExp(`'${flag}',false`));
});

async function fixture(run) {
  const db = new PGlite(); // No dataDir/host/URL/connector/process/network.
  try {
    await db.exec(
      "CREATE ROLE supabase_auth_admin; CREATE SCHEMA auth; CREATE TABLE auth.schema_migrations(version varchar(255) NOT NULL); ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin; ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;",
    );
    await run(db);
  } finally {
    await db.close();
  }
}
async function capture(db) {
  const settings = async () =>
    (
      await db.query(
        "SELECT current_setting('statement_timeout') AS statement,current_setting('lock_timeout') AS lock,current_setting('search_path') AS path,current_setting('transaction_read_only') AS readonly",
      )
    ).rows[0];
  const before = await settings();
  const results = await db.exec(source);
  assert.equal(results.length, 6);
  assert.deepEqual(await settings(), before);
  const result = results.find((item) => item.rows[0]?.result)?.rows[0].result;
  assert.ok(result);
  for (const flag of flags) assert.equal(result[flag], false);
  assert.equal(result.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(result.versionBound, 256);
  return result;
}

test(
  "actual query metadata admission and whole-vector privacy refusal stay distinct from authority",
  { concurrency: false, timeout: 30_000 },
  async (t) => {
    await fixture(async (db) => {
      await t.test(
        "empty managed ledger is complete metadata, not a verified service",
        async () => {
          const value = await capture(db);
          assert.equal(value.complete, true);
          assert.deepEqual(value.versions, []);
          assert.equal(value.selectedRows, 0);
        },
      );
      await t.test(
        "legacy00 and numeric migration IDs remain text, sorted, with no service-version inference",
        async () => {
          await db.exec(
            "INSERT INTO auth.schema_migrations VALUES('20260101000001'),('00'),('20171026211738');",
          );
          const value = await capture(db);
          assert.equal(value.complete, true);
          assert.deepEqual(value.versions, ["00", "20171026211738", "20260101000001"]);
          assert.equal(value.selectedRows, 3);
          await db.exec("TRUNCATE auth.schema_migrations;");
        },
      );
      await t.test(
        "unexpected metadata never reflects private-shaped text or a partial valid vector",
        async () => {
          await db.query("INSERT INTO auth.schema_migrations VALUES($1),($2),($3),($4)", [
            "20260101000001",
            "PRIVATE-METADATA-SENTINEL",
            "００",
            "00\n",
          ]);
          const value = await capture(db);
          assert.equal(value.complete, false);
          assert.equal(value.unexpectedVersionRows, 3);
          assert.deepEqual(value.versions, []);
          assert.ok(!JSON.stringify(value).includes("PRIVATE-METADATA-SENTINEL"));
          await db.exec("TRUNCATE auth.schema_migrations;");
        },
      );
      await t.test(
        "duplicate version refuses the whole vector without deduplicating evidence",
        async () => {
          await db.exec("INSERT INTO auth.schema_migrations VALUES('00'),('00');");
          const value = await capture(db);
          assert.equal(value.complete, false);
          assert.equal(value.duplicateVersionRows, 1);
          assert.deepEqual(value.versions, []);
          await db.exec("TRUNCATE auth.schema_migrations;");
        },
      );
      await t.test(
        "256 versions fit;257 sentinel refuses all instead of silently truncating",
        async () => {
          await db.exec(
            "INSERT INTO auth.schema_migrations SELECT lpad(n::text,14,'0') FROM generate_series(1,256) n;",
          );
          const complete = await capture(db);
          assert.equal(complete.complete, true);
          assert.equal(complete.versions.length, 256);
          await db.exec("INSERT INTO auth.schema_migrations VALUES('00000000000257');");
          const refused = await capture(db);
          assert.equal(refused.complete, false);
          assert.equal(refused.truncated, true);
          assert.equal(refused.selectedRows, 257);
          assert.deepEqual(refused.versions, []);
          await db.exec("TRUNCATE auth.schema_migrations;");
        },
      );
      await t.test(
        "policy-filtered invoker cannot misreport an empty managed ledger as complete",
        async () => {
          await db.exec(
            "INSERT INTO auth.schema_migrations VALUES('00'); CREATE ROLE provenance_reader; GRANT USAGE ON SCHEMA auth TO provenance_reader; GRANT SELECT ON auth.schema_migrations TO provenance_reader; SET ROLE provenance_reader;",
          );
          try {
            assert.deepEqual(
              (await db.query("SELECT version FROM auth.schema_migrations")).rows,
              [],
            );
            const refused = await capture(db);
            assert.equal(refused.catalogMatched, false);
            assert.equal(refused.complete, false);
            assert.deepEqual(refused.versions, []);
          } finally {
            await db.exec("RESET ROLE; TRUNCATE auth.schema_migrations;");
          }
        },
      );
      await t.test(
        "owner, extra column and FORCE RLS drift refuse before metadata emission",
        async () => {
          await db.exec(
            "INSERT INTO auth.schema_migrations VALUES('00'); ALTER TABLE auth.schema_migrations OWNER TO postgres;",
          );
          assert.equal((await capture(db)).catalogMatched, false);
          await db.exec(
            "ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin; ALTER TABLE auth.schema_migrations ADD COLUMN unexpected text;",
          );
          assert.deepEqual((await capture(db)).versions, []);
          await db.exec(
            "ALTER TABLE auth.schema_migrations DROP COLUMN unexpected; ALTER TABLE auth.schema_migrations FORCE ROW LEVEL SECURITY;",
          );
          assert.equal((await capture(db)).catalogMatched, false);
        },
      );
    });
  },
);
