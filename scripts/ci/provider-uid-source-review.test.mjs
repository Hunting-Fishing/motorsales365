// Query guard + actual provider function only. Never JWT/original actor acceptance.
import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import {
  query,
  observed,
  expected,
  definition,
  catalog,
  withUid,
} from "./fixtures/provider-uid-source-fixture.mjs";
const options = { concurrency: false, timeout: 30_000 };
async function execute(db, sql = query) {
  const settings = async () =>
    (
      await db.query(
        "SELECT current_setting('search_path') path,current_setting('statement_timeout') timeout,current_setting('lock_timeout') lock,current_setting('transaction_read_only') readonly",
      )
    ).rows[0];
  const before = await settings(),
    r = await db.exec(sql);
  assert.equal(r.length, 6);
  assert.deepEqual(await settings(), before);
  return r.find((x) => x.rows[0]?.source).rows[0].source;
}
async function diagnostic(db, body) {
  // Deliberately changed diagnostic function, NEVER a claimed provider support.
  await db.exec(
    "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $probe$" +
      body +
      "$probe$",
  );
  const actual = (await catalog(db)).functions[0].envelope;
  let sql = query;
  for (const key of ["bodyMd5Lf", "definitionMd5", "definitionBytes"]) {
    const old = JSON.stringify(key) + ":" + JSON.stringify(expected[key]),
      replacement = JSON.stringify(key) + ":" + JSON.stringify(actual[key]);
    assert.equal(sql.split(old).length, 2);
    sql = sql.replace(old, () => replacement);
  }
  return sql;
}
async function disposable(run) {
  const db = new PGlite();
  try {
    return await run(db);
  } finally {
    await db.close();
  }
}
const setClaims = (db, sub, claims) =>
  db.query(
    "SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
    [sub, claims],
  );
const uid = async (db) => (await db.query("SELECT auth.uid() value")).rows[0].value;
const A = "10000000-0000-4000-8000-000000000001",
  B = "10000000-0000-4000-8000-000000000002";
test("single-function source diagnostic is READ ONLY catalog access and never invokes provider helper or reads values", () => {
  assert.match(query, /BEGIN READ ONLY;/);
  assert.match(query, /SET LOCAL statement_timeout='5000ms';/);
  assert.match(query, /SET LOCAL lock_timeout='1000ms';/);
  assert.match(query, /SET LOCAL search_path=pg_catalog,pg_temp;/);
  assert.match(query, /ROLLBACK;\s*$/);
  assert.match(query, /s.envelope=e.envelope/);
  assert.match(query, /CASE WHEN s.permitted THEN s.full_definition ELSE NULL END/);
  const surface = query.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
  assert.doesNotMatch(
    surface,
    /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|EXECUTE|COPY|CALL|COMMIT)\b/i,
  );
  assert.doesNotMatch(surface, /\b(?:FROM|JOIN)\s+(?:public|auth|shop_manager)\./i);
  assert.doesNotMatch(surface, /\b(?:public|auth|shop_manager)\.[a-z_]+\s*\(/i);
  assert.doesNotMatch(
    query,
    /pg_read_file|pg_ls_dir|lo_import|dblink|query_to_xml|nextval|currval|setval|last_value/,
  );
  assert.match(query, /to_regprocedure\('auth.uid\(\)'\)/);
});
test("reviewed source matches full prior metadata including actual provider owner/ACL and exact 274-byte definition", () => {
  assert.equal(observed.observedAtUtc, "2026-10-15T10:40:55.605099");
  assert.equal(observed.serverVersion, "17.6");
  assert.equal(expected.definitionBytes, 274);
  assert.equal(expected.securityDefiner, false);
  assert.equal(expected.owner, "supabase_auth_admin");
  assert.equal(expected.language, "sql");
  assert.equal(expected.volatility, "s");
  assert.equal(expected.configMd5, null);
  assert.match(definition, /coalesce[\s\S]*request.jwt.claim.sub[\s\S]*request.jwt.claims/);
});
test(
  "empty catalog diagnostic rolls back settings without source/helper success",
  options,
  async () => {
    await disposable(async (db) => assert.deepEqual((await execute(db)).functions, []));
  },
);
test(
  "actual definition/envelope recovery passes locally and remains metadata-only despite configured malformed claims",
  options,
  async () => {
    await withUid(async (db) => {
      await setClaims(db, "malformed", "malformed");
      const c = await execute(db);
      assert.deepEqual(c.functions[0], observed.functions[0]);
    });
  },
);
test(
  "changed body or owner fails immutable full-envelope gate even when raw source otherwise looks safe",
  options,
  async () => {
    await withUid(async (db) => {
      await db.exec("BEGIN");
      try {
        await db.exec(
          "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULL::uuid$$",
        );
        const c = await execute(db);
        assert.equal(c.functions[0].permitted, false);
        assert.equal(c.functions[0].definition, null);
      } finally {
        await db.exec("ROLLBACK");
      }
      await db.exec("BEGIN");
      try {
        await db.exec("ALTER FUNCTION auth.uid() OWNER TO postgres");
        const c = await execute(db);
        assert.equal(c.functions[0].permitted, false);
        assert.equal(c.functions[0].definition, null);
      } finally {
        await db.exec("ROLLBACK");
      }
    });
  },
);
for (const [label, body] of [
  ["unreviewed literal", "SELECT NULLIF('unreviewed','unreviewed')::uuid"],
  ["sensitive comment marker", "SELECT NULL::uuid /* synthetic secret marker, no secret value */"],
  ["nested dollar quoting", "SELECT NULLIF($inner$$inner$,'')::uuid"],
  ["oversized body", "SELECT NULL::uuid /*" + "x".repeat(520) + "*/"],
]) {
  test(
    "independent privacy/size gate denies " +
      label +
      " even after three diagnostic fingerprints match",
    options,
    async () => {
      await withUid(async (db) => {
        await db.exec("BEGIN");
        try {
          const sql = await diagnostic(db, body),
            c = await execute(db, sql);
          assert.equal(c.functions[0].permitted, false);
          assert.equal(c.functions[0].definition, null);
        } finally {
          await db.exec("ROLLBACK");
        }
      });
    },
  );
}
test(
  "actual provider function returns NULL for unset/empty/no-sub contexts without inventing identity",
  options,
  async () => {
    await withUid(async (db) => {
      assert.equal(await uid(db), null);
      for (const claims of ["", "{}", '{"sub":null}', "null"]) {
        await setClaims(db, "", claims);
        assert.equal(await uid(db), null);
      }
    });
  },
);
test(
  "actual function reads synthetic legacy sub first, falls back to claims JSON and does not verify a JWT",
  options,
  async () => {
    await withUid(async (db) => {
      await setClaims(db, "", JSON.stringify({ sub: B }));
      assert.equal(await uid(db), B);
      await setClaims(db, A, JSON.stringify({ sub: B }));
      assert.equal(await uid(db), A);
      await setClaims(db, A, "malformed");
      assert.equal(await uid(db), A);
      // These strings are deliberately unsigned lab settings, not verified sessions.
      await setClaims(db, B, "{}");
      assert.equal(await uid(db), B);
    });
  },
);
test(
  "malformed sub or claims fails genuinely; role/schema lab controls do not turn settings into trusted subjects",
  options,
  async () => {
    await withUid(async (db) => {
      for (const [sub, claims] of [
        ["bad", "{}"],
        ["", "bad"],
        ["bad", JSON.stringify({ sub: B })],
      ]) {
        await setClaims(db, sub, claims);
        await assert.rejects(
          () => uid(db),
          (e) => e.code === "22P02",
        );
      }
      await setClaims(db, A, "{}");
      for (const role of ["anon", "authenticated", "service_role", "dashboard_user"]) {
        await db.exec("BEGIN;SET LOCAL ROLE " + role);
        try {
          assert.equal(await uid(db), A);
        } finally {
          await db.exec("ROLLBACK");
        }
      }
    });
  },
);
test(
  "component postflight detects function grants/source drift; no replacement function is an accepted provider proof",
  options,
  async () => {
    await assert.rejects(
      () => withUid((db) => db.exec("REVOKE EXECUTE ON FUNCTION auth.uid() FROM PUBLIC")),
      /exact actual provider uid/,
    );
  },
);
