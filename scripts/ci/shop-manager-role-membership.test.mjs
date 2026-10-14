// Offline read-only-helper behavior proof, NOT a mitigation, complete baseline,
// deployed ACL parity, auth/JWT verification or permission to execute live RPCs.
// Only four selected historical definitions execute unchanged (CRLF -> LF).
// Reduced synthetic tables/enum and observed function ACLs are fixture setup;
// no historical chain, seed/backfill/trigger installation, credentials or network.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const sha = (sql) => createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
const evidenceSource = fs.readFileSync(
  new URL("../../docs/evidence/native-role-membership-metadata-2026-10-15.json", import.meta.url),
  "utf8",
);
const evidence = JSON.parse(evidenceSource);
const helpers = [
  {
    id: "enum",
    signature: "shop_manager.has_role(uuid,shop_manager.app_role)",
    file: "20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql",
    sourceSha: "30dfd8df0c3537efb5155a8891804e00444b180f55e674b56d522e473e2f4144",
    declaration:
      "CREATE OR REPLACE FUNCTION shop_manager.has_role(_user_id uuid, _role shop_manager.app_role)",
    definitionSha: "6bd2e19228db266f3502e6e17d8fc3c44625ead617d4d8dbf163981635df9dc3",
    definitionMd5: "8bace4af65b1d02f541518da374db9a5",
    bodyMd5: "e305bae6d347f91a9bfa8d7a4bbbb99d",
  },
  {
    id: "text",
    signature: "shop_manager.has_role(uuid,text)",
    file: "20260713081559_69ad9a73-edab-4719-b16e-38541b8ba91a.sql",
    sourceSha: "23169927a45a5c47406181fb4e2e2c049e5282698f31a840c17cdbc2725a4472",
    declaration: "CREATE OR REPLACE FUNCTION shop_manager.has_role(_user_id uuid, _role text)",
    definitionSha: "1ca7e9492dc55ff4ce67a41a0b85460e5912389567396ff9020911cd03c2ed0b",
    definitionMd5: "0922679e807df45f65778f92e91c08ca",
    bodyMd5: "968f4a4ddba98dc347c0da5717cbce07",
  },
  {
    id: "membership",
    signature: "shop_manager.user_belongs_to_shop(uuid,uuid)",
    file: "20260713081649_7763bb16-35c5-4c76-a8f9-36c3f58090ce.sql",
    sourceSha: "738cecf5f28c9cc3cce5e2980a6ebb5c324d18fbd5b92aeb151448c89afd7bb9",
    declaration:
      "CREATE OR REPLACE FUNCTION shop_manager.user_belongs_to_shop(_user_id uuid, _shop_id uuid)",
    definitionSha: "0b7e3f7cc785ac83b62f053d18c18b94b9b6bc2c17d2fd9f6c694cbb6cdd8285",
    definitionMd5: "ef1de965a932a522f9dd61a203338d17",
    bodyMd5: "7786134c6646c4ade72c0107d4219236",
  },
  {
    id: "operations",
    signature: "shop_manager.is_shop_operations_manager(uuid,uuid)",
    file: "20260831124952_employee_operations_ledger.sql",
    sourceSha: "2386ee30a1b12cd124445adf3da3568c35e567e96aa9f7b83e6cd4211ccae6b2",
    declaration:
      "CREATE OR REPLACE FUNCTION shop_manager.is_shop_operations_manager(_user_id uuid, _shop_id uuid)",
    definitionSha: "426521f20c383a51b0ee09c684ba49b83af2b884a8a4be30a96b4672e6fc52ac",
    definitionMd5: "e4acd815f99a4a61a24b3623db2e230c",
    bodyMd5: "7a0da5b98b02455de0d968a12170df77",
  },
];
function extract(source, helper) {
  assert.ok(typeof source === "string" && source.length > 0 && source.length < 512 * 1024);
  assert.equal(sha(source), helper.sourceSha, "whole-source pin changed");
  assert.equal(source.split(helper.declaration).length, 2, "expected one exact declaration");
  const start = source.indexOf(helper.declaration);
  const end = source.indexOf("$$;", start);
  assert.ok(end > start, "missing definition terminator");
  const definition = source.slice(start, end + 3).replace(/\r\n/g, "\n");
  assert.equal(sha(definition), helper.definitionSha, "selected-definition pin changed");
  return definition;
}
for (const helper of helpers) {
  helper.source = fs.readFileSync(new URL(helper.file, migrations), "utf8");
  helper.definition = extract(helper.source, helper);
}
const byId = Object.fromEntries(helpers.map((helper) => [helper.id, helper]));
const options = { concurrency: false, timeout: 20_000 };
const uuid = (number, prefix = "00000000") =>
  `${prefix}-0000-4000-8000-${String(number).padStart(12, "0")}`;
const users = {
  managerA: uuid(1),
  managerB: uuid(2),
  legacy: uuid(3),
  nullShop: uuid(4),
  aliasProfile: uuid(5),
  aliasUser: uuid(6),
  roleOnly: uuid(7),
  staff: uuid(8),
  missing: uuid(99),
};
const legacyProfile = uuid(3, "10000000");
const shops = { a: uuid(1, "20000000"), b: uuid(2, "20000000"), missing: uuid(99, "20000000") };
const roleLabels = [
  "owner",
  "admin",
  "manager",
  "operations_manager",
  "parts_manager",
  "office_admin",
  "technician",
  "developer",
];
const operationsLabels = roleLabels.slice(0, 6);
const fixtureSql = `
SET statement_timeout='3000ms'; SET lock_timeout='1000ms';
CREATE ROLE anon NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE service_role NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA shop_manager;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE TYPE shop_manager.app_role AS ENUM (${roleLabels.map((label) => `'${label}'`).join(",")});
CREATE TABLE shop_manager.roles(id uuid PRIMARY KEY,name shop_manager.app_role NOT NULL UNIQUE);
CREATE TABLE shop_manager.user_roles(user_id uuid,role_id uuid REFERENCES shop_manager.roles(id));
CREATE TABLE shop_manager.profiles(id uuid PRIMARY KEY,user_id uuid,shop_id uuid);
GRANT USAGE ON SCHEMA auth,shop_manager TO anon,authenticated,service_role;
GRANT SELECT ON shop_manager.profiles,shop_manager.roles,shop_manager.user_roles TO authenticated;
ALTER TABLE shop_manager.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.user_roles ENABLE ROW LEVEL SECURITY;
-- No SELECT policies: the client sees no rows despite the SELECT grant.
INSERT INTO shop_manager.profiles VALUES
 ('${users.managerA}','${users.managerA}','${shops.a}'),
 ('${users.managerB}','${users.managerB}','${shops.b}'),
 ('${legacyProfile}','${users.legacy}','${shops.a}'),
 ('${users.nullShop}','${users.nullShop}',NULL),
 ('${users.aliasProfile}','${users.aliasUser}','${shops.a}'),
 ('${users.staff}','${users.staff}','${shops.a}');
`;
async function nativeState(db) {
  return (
    await db.query(`SELECT
    (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM shop_manager.profiles p) AS profiles,
    (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM shop_manager.roles r) AS roles,
    (SELECT jsonb_agg(to_jsonb(r) ORDER BY user_id,role_id) FROM shop_manager.user_roles r) AS bindings,
    (SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',nspowner,'acl',nspacl::text) ORDER BY nspname)
      FROM pg_namespace WHERE nspname IN ('auth','shop_manager','public')) AS schemas,
    (SELECT jsonb_agg(jsonb_build_object('name',relname,'owner',relowner,'acl',relacl::text,
      'rls',relrowsecurity,'forced',relforcerowsecurity) ORDER BY relname)
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='shop_manager' AND c.relkind='r') AS tables`)
  ).rows[0];
}
async function functionState(db) {
  return (
    await db.query(`SELECT p.oid::regprocedure::text AS signature,
    md5(pg_get_functiondef(p.oid)) AS definition,md5(replace(p.prosrc,chr(13),'')) AS body,
    pg_get_userbyid(p.proowner) AS owner,l.lanname AS language,p.provolatile,p.prosecdef,p.proconfig,
    has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
    has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
    has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute,
    p.proacl::text AS acl
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
    WHERE n.nspname='shop_manager' ORDER BY 1`)
  ).rows;
}
async function withFixture(run) {
  const db = new PGlite("memory://");
  try {
    await db.exec(fixtureSql);
    for (const [index, label] of roleLabels.entries())
      await db.query("INSERT INTO shop_manager.roles VALUES($1,$2::shop_manager.app_role)", [
        uuid(index + 1, "30000000"),
        label,
      ]);
    for (const user of [
      users.managerA,
      users.managerB,
      users.legacy,
      users.nullShop,
      users.aliasUser,
      users.roleOnly,
    ])
      await db.query(
        "INSERT INTO shop_manager.user_roles SELECT $1,id FROM shop_manager.roles WHERE name='manager'",
        [user],
      );
    const beforeDefinitions = await nativeState(db);
    for (const helper of helpers) await db.exec(helper.definition);
    // Fixture-only reproduction of the 2026-10-14T19:36:00.351Z catalog ACL
    // supplied by the root's read-only observation, not an applied-migration claim.
    for (const helper of helpers)
      await db.exec(`GRANT EXECUTE ON FUNCTION ${helper.signature} TO authenticated,service_role`);
    await db.exec(`REVOKE EXECUTE ON FUNCTION ${byId.operations.signature} FROM PUBLIC,anon`);
    assert.deepEqual(
      await nativeState(db),
      beforeDefinitions,
      "selected definitions must not seed or change native rows/schema/table ACLs",
    );
    const functions = await functionState(db);
    for (const helper of helpers) {
      const state = functions.find((row) => row.signature === helper.signature);
      assert.ok(state, helper.signature);
      assert.equal(state.definition, helper.definitionMd5);
      assert.equal(state.body, helper.bodyMd5);
      assert.equal(state.owner, "postgres");
      assert.equal(state.language, "sql");
      assert.equal(state.provolatile, "s");
      assert.equal(state.prosecdef, true);
      assert.deepEqual(state.proconfig, [
        helper.id === "operations"
          ? "search_path=shop_manager, public, pg_temp"
          : "search_path=public, shop_manager",
      ]);
      assert.equal(state.anon_execute, helper.id !== "operations");
      assert.equal(state.authenticated_execute, true);
      assert.equal(state.service_execute, true);
    }
    await run(db);
  } finally {
    await db.close();
  }
}
async function asRole(db, role, subject, run) {
  assert.ok(["anon", "authenticated", "service_role"].includes(role));
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [subject ?? ""]);
  try {
    await db.exec(`SET ROLE ${role}`);
    const state = (
      await db.query(`SELECT current_user AS actor,session_user,auth.uid() AS subject,
      rolsuper,rolbypassrls,row_security_active('shop_manager.profiles') AS profile_rls,
      row_security_active('shop_manager.user_roles') AS roles_rls
      FROM pg_roles WHERE rolname=current_user`)
    ).rows[0];
    assert.deepEqual(state, {
      actor: role,
      session_user: "postgres",
      subject: subject ?? null,
      rolsuper: false,
      rolbypassrls: role === "service_role",
      profile_rls: role !== "service_role",
      roles_rls: role !== "service_role",
    });
    await run();
  } finally {
    await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)");
  }
}
async function hasRole(db, user, role, overload = "text") {
  assert.ok(["text", "shop_manager.app_role"].includes(overload));
  return (
    await db.query(`SELECT shop_manager.has_role($1::uuid,$2::${overload}) AS allowed`, [
      user,
      role,
    ])
  ).rows[0].allowed;
}
const membership = async (db, user, shop) =>
  (
    await db.query("SELECT shop_manager.user_belongs_to_shop($1::uuid,$2::uuid) AS allowed", [
      user,
      shop,
    ])
  ).rows[0].allowed;
const operations = async (db, user, shop) =>
  (
    await db.query("SELECT shop_manager.is_shop_operations_manager($1::uuid,$2::uuid) AS allowed", [
      user,
      shop,
    ])
  ).rows[0].allowed;

test(
  "source/selected-definition pins reject missing, duplicate, tampered or oversized SQL; CRLF is transport only",
  options,
  () => {
    for (const helper of helpers) {
      assert.equal(extract(helper.source.replace(/\r?\n/g, "\r\n"), helper), helper.definition);
      for (const bad of [
        "",
        null,
        helper.source + helper.definition,
        helper.source.replace(helper.declaration, helper.declaration + " -- changed"),
        "x".repeat(512 * 1024),
      ])
        assert.throws(() => extract(bad, helper));
    }
    assert.equal((byId.operations.definition.match(/::text/g) ?? []).length, 6);
    assert.ok(!byId.operations.definition.includes("::shop_manager.app_role"));
  },
);

test(
  "unchanged definitions reproduce all four observed catalog definition/body fingerprints without native ACL/data changes",
  options,
  async () => {
    assert.equal(
      sha(evidenceSource),
      "fedaa75815414a84fea1b2414cc51a8e6ae9b0297a1da80b16e7ba57ee54bb64",
    );
    assert.equal(evidence.formatVersion, 1);
    assert.equal(evidence.project, "wjxaajgvddtrxxtocxen");
    assert.equal(evidence.observedAtUtc, "2026-10-14T19:36:00.351Z");
    assert.equal(evidence.mode, "read-only-catalog");
    assert.equal(
      evidence.scope,
      "Six existing native lookup/operating-manager functions; metadata only, no business function invocation or customer/profile row read or mutation.",
    );
    assert.equal(
      evidence.sourceNormalization,
      "body MD5 removes CR; full definition MD5 identifies pg_get_functiondef output, not cryptographic source authenticity or full schema parity",
    );
    assert.equal(evidence.functions.length, 6);
    assert.equal(new Set(evidence.functions.map((row) => row.signature)).size, 6);
    for (const helper of helpers) {
      const observed = evidence.functions.filter((row) => row.signature === helper.signature);
      assert.equal(observed.length, 1, "one saved observation per exact overload");
      assert.equal(observed[0].definitionMd5, helper.definitionMd5);
      assert.equal(observed[0].bodyMd5CrRemoved, helper.bodyMd5);
      assert.equal(observed[0].resultType, "boolean");
      assert.equal(observed[0].owner, "postgres");
      assert.equal(observed[0].language, "sql");
      assert.equal(observed[0].securityDefiner, true);
      assert.equal(observed[0].volatility, "s");
      assert.deepEqual(observed[0].proconfig, [
        helper.id === "operations"
          ? "search_path=shop_manager, public, pg_temp"
          : "search_path=public, shop_manager",
      ]);
      assert.deepEqual(observed[0].execute, {
        anon: helper.id !== "operations",
        authenticated: true,
        service_role: true,
      });
    }
    await withFixture(async (db) => {
      const before = await nativeState(db);
      const definitions = await functionState(db);
      assert.equal(definitions.length, 4);
      for (const helper of helpers) await db.exec(helper.definition);
      assert.deepEqual(await functionState(db), definitions);
      assert.deepEqual(await nativeState(db), before);
    });
  },
);

test(
  "text and enum overloads agree on valid exact roles, but invalid enum input raises instead of text false",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await nativeState(db);
      await asRole(db, "authenticated", users.managerB, async () => {
        for (const overload of ["text", "shop_manager.app_role"]) {
          assert.equal(await hasRole(db, users.managerA, "manager", overload), true);
          assert.equal(await hasRole(db, users.managerA, "owner", overload), false);
          assert.equal(await hasRole(db, users.staff, "manager", overload), false);
          assert.equal(await hasRole(db, users.missing, "manager", overload), false);
          assert.equal(await hasRole(db, null, "manager", overload), false);
          assert.equal(await hasRole(db, users.managerA, null, overload), false);
        }
        for (const invalid of ["MANAGER", "not_a_role", "", " manager "]) {
          assert.equal(await hasRole(db, users.managerA, invalid), false);
          await assert.rejects(hasRole(db, users.managerA, invalid, "shop_manager.app_role"), {
            code: "22P02",
          });
        }
      });
      assert.deepEqual(await nativeState(db), before);
    });
  },
);

test(
  "membership matches profile.id only: same/other/missing/null shops and legacy user_id mismatch remain distinct",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await nativeState(db);
      await asRole(db, "authenticated", users.managerB, async () => {
        for (const [user, shop, expected] of [
          [users.managerA, shops.a, true],
          [users.managerA, shops.b, false],
          [users.managerB, shops.b, true],
          [users.managerB, shops.a, false],
          [users.managerA, shops.missing, false],
          [users.missing, shops.a, false],
          [users.managerA, null, false],
          [null, shops.a, false],
          [null, null, false],
          [users.nullShop, shops.a, false],
          [users.nullShop, null, false],
          [users.legacy, shops.a, false],
          [legacyProfile, shops.a, true],
          [users.aliasUser, shops.a, false],
          [users.aliasProfile, shops.a, true],
        ])
          assert.equal(await membership(db, user, shop), expected, `${user}/${shop}`);
      });
      assert.deepEqual(await nativeState(db), before);
    });
  },
);

test(
  "global role bindings are independent of shop, while exact operations caller requires profile-id membership AND text role",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await nativeState(db);
      await asRole(db, "authenticated", users.staff, async () => {
        assert.equal(await hasRole(db, users.managerA, "manager"), true);
        assert.equal(await operations(db, users.managerA, shops.a), true);
        assert.equal(await operations(db, users.managerA, shops.b), false);
        assert.equal(await operations(db, users.managerB, shops.b), true);
        assert.equal(await operations(db, users.managerB, shops.a), false);
        assert.equal(await hasRole(db, users.roleOnly, "manager"), true);
        assert.equal(await operations(db, users.roleOnly, shops.a), false);
        assert.equal(await membership(db, users.staff, shops.a), true);
        assert.equal(await operations(db, users.staff, shops.a), false);
        assert.equal(await hasRole(db, users.legacy, "manager"), true);
        assert.equal(await operations(db, users.legacy, shops.a), false);
        assert.equal(await operations(db, legacyProfile, shops.a), false);
        assert.equal(await hasRole(db, users.aliasUser, "manager"), true);
        assert.equal(await operations(db, users.aliasUser, shops.a), false);
        assert.equal(await operations(db, users.aliasProfile, shops.a), false);
        for (const [user, shop] of [
          [users.nullShop, shops.a],
          [users.nullShop, null],
          [users.missing, shops.a],
          [users.managerA, shops.missing],
          [users.managerA, null],
          [null, shops.a],
          [null, null],
        ])
          assert.equal(await operations(db, user, shop), false);
      });
      assert.deepEqual(await nativeState(db), before);
    });
  },
);

test(
  "every literal operations role is accepted when scoped and other valid enum roles are not implicitly promoted",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await nativeState(db);
      for (const label of roleLabels) {
        // Synthetic binding permutation is isolated in a transaction; helpers
        // remain unchanged. This is not a production role mutation or role seed.
        await db.exec("BEGIN");
        try {
          await db.query("DELETE FROM shop_manager.user_roles WHERE user_id=$1", [users.managerA]);
          await db.query(
            "INSERT INTO shop_manager.user_roles SELECT $1,id FROM shop_manager.roles WHERE name=$2::shop_manager.app_role",
            [users.managerA, label],
          );
          const beforeCalls = await nativeState(db);
          await asRole(db, "authenticated", users.staff, async () => {
            assert.equal(await hasRole(db, users.managerA, label), true);
            assert.equal(
              await operations(db, users.managerA, shops.a),
              operationsLabels.includes(label),
            );
            assert.equal(await operations(db, users.managerA, shops.b), false);
          });
          assert.deepEqual(await nativeState(db), beforeCalls);
        } finally {
          await db.exec("ROLLBACK");
        }
        assert.deepEqual(await nativeState(db), before);
      }
    });
  },
);

test(
  "SECURITY DEFINER lookup bypasses active RLS/direct table denial without changing table/schema grants or requiring matching JWT subject",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await nativeState(db);
      await asRole(db, "authenticated", users.managerB, async () => {
        for (const table of ["profiles", "roles", "user_roles"])
          assert.deepEqual((await db.query(`SELECT * FROM shop_manager.${table}`)).rows, []);
        assert.equal(await hasRole(db, users.managerA, "manager"), true);
        assert.equal(await membership(db, users.managerA, shops.a), true);
        assert.equal(await operations(db, users.managerA, shops.a), true);
      });
      assert.deepEqual(await nativeState(db), before);
      await db.exec(
        "REVOKE SELECT ON shop_manager.profiles,shop_manager.roles,shop_manager.user_roles FROM authenticated",
      );
      const locked = await nativeState(db);
      await asRole(db, "authenticated", null, async () => {
        for (const table of ["profiles", "roles", "user_roles"])
          await assert.rejects(db.query(`SELECT * FROM shop_manager.${table}`), { code: "42501" });
        assert.equal(await hasRole(db, users.managerA, "manager"), true);
        assert.equal(await membership(db, users.managerA, shops.a), true);
        assert.equal(await operations(db, users.managerA, shops.a), true);
      });
      assert.deepEqual(await nativeState(db), locked);
    });
  },
);

test(
  "observed anonymous helper exposure and owner/service behavior are distinguished from operations caller EXECUTE denial",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await nativeState(db);
      await asRole(db, "anon", null, async () => {
        assert.equal(await hasRole(db, users.managerA, "manager"), true);
        assert.equal(await hasRole(db, users.managerA, "manager", "shop_manager.app_role"), true);
        assert.equal(await membership(db, users.managerA, shops.a), true);
        await assert.rejects(operations(db, users.managerA, shops.a), { code: "42501" });
        await assert.rejects(db.query("SELECT * FROM shop_manager.user_roles"), { code: "42501" });
      });
      assert.equal(await operations(db, users.managerA, shops.a), true);
      await asRole(db, "service_role", null, async () => {
        assert.equal(await hasRole(db, users.managerA, "manager"), true);
        assert.equal(await membership(db, users.managerA, shops.a), true);
        assert.equal(await operations(db, users.managerA, shops.a), true);
      });
      assert.deepEqual(await nativeState(db), before);
    });
  },
);
