// Authorized offline regression only. No network client, live credentials or
// persistent database. Historical SQL is hash-pinned, LF transport normalized.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const sha = (s) => createHash("sha256").update(s.replace(/\r\n/g, "\n")).digest("hex");
const source = fs.readFileSync(
  new URL(
    "../../supabase/migrations/20260713081838_b99aba93-f19b-4aec-b7a1-3bdb86faadc6.sql",
    import.meta.url,
  ),
  "utf8",
);
const pattern =
  /^CREATE OR REPLACE FUNCTION shop_manager\.ensure_profile_for\(_user_id uuid\)[\s\S]*?END\$\$;/gm;
function extract(raw) {
  assert.ok(typeof raw === "string" && raw.length > 0 && raw.length < 256 * 1024);
  const matches = [...raw.matchAll(pattern)];
  assert.equal(matches.length, 1, "expected exactly one bootstrap definition");
  assert.equal(sha(raw), "5ea2e85cf05bf006dcb684ef063f9ef15f38fdfcc9dccd2c050f4c0a5a115647");
  assert.equal(
    sha(matches[0][0]),
    "8f86e53b90d08631378fd50e28b63dceac4ede81059748dc255c15f0b0f5a554",
  );
  return matches[0][0].replace(/\r\n/g, "\n");
}
const bootstrap = extract(source);
const historicalGrants = source.match(
  /^GRANT EXECUTE ON FUNCTION shop_manager\.ensure_profile_for\(uuid\) TO authenticated;/gm,
);
assert.equal(historicalGrants?.length, 1);
const actor = "00000000-0000-4000-8000-000000000001";
const target = "00000000-0000-4000-8000-000000000002";
const legacyUser = "00000000-0000-4000-8000-000000000003";
const newUser = "00000000-0000-4000-8000-000000000004";
const missingUser = "00000000-0000-4000-8000-000000000099";
const legacyId = "10000000-0000-4000-8000-000000000003";
const shop = "20000000-0000-4000-8000-000000000002";
const business = "30000000-0000-4000-8000-000000000002";
const options = { concurrency: false, timeout: 20_000 };

async function fixture(run) {
  const db = new PGlite("memory://");
  try {
    await db.exec(`
      SET statement_timeout='3000ms'; SET lock_timeout='1000ms';
      CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT NOBYPASSRLS;
      CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT NOBYPASSRLS;
      CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA shop_manager;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
      CREATE TABLE public.businesses(id uuid PRIMARY KEY,owner_id uuid,created_at timestamptz DEFAULT now());
      CREATE TABLE shop_manager.shops(id uuid PRIMARY KEY,business_id uuid);
      -- Match inspected identity constraints: native shop_id has NO FK. A
      -- separate test adds one as a proposed stricter contrast, not live state.
      CREATE TABLE shop_manager.profiles(
        id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        email text NOT NULL UNIQUE,first_name text,last_name text,shop_id uuid
      );
      CREATE UNIQUE INDEX profiles_one_per_auth_user ON shop_manager.profiles(user_id)
        WHERE user_id IS NOT NULL;
      CREATE TABLE shop_manager.user_roles(user_id uuid,role_id uuid);
      ALTER TABLE shop_manager.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE shop_manager.user_roles ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA auth,shop_manager TO anon,authenticated,service_role;
      -- Native client authority is deliberately locked to contrast RPC access.
      REVOKE ALL ON shop_manager.profiles,shop_manager.user_roles FROM PUBLIC,anon,authenticated;
    `);
    for (const [id, email] of [
      [actor, "actor@example.test"],
      [target, "target@example.test"],
      [legacyUser, "legacy@example.test"],
      [newUser, "new@example.test"],
    ]) {
      await db.query(
        'INSERT INTO auth.users VALUES($1,$2,\'{"first_name":"Fixture","last_name":"User"}\')',
        [id, email],
      );
    }
    await db.query("INSERT INTO public.businesses(id,owner_id) VALUES($1,$2)", [business, target]);
    await db.query("INSERT INTO shop_manager.shops VALUES($1,$2)", [shop, business]);
    await db.query(
      "INSERT INTO shop_manager.profiles(id,user_id,email,shop_id) VALUES($1,$2,'legacy@example.test',$3)",
      [legacyId, legacyUser, shop],
    );
    await db.exec(bootstrap);
    // Retain the actual historical direct grant; PUBLIC-only denial must not
    // accidentally pass a fixture that omitted this additional access path.
    await db.exec(historicalGrants[0]);
    await db.exec(
      "GRANT EXECUTE ON FUNCTION shop_manager.ensure_profile_for(uuid) TO service_role",
    );
    const fingerprint = (
      await db.query(`SELECT md5(pg_get_functiondef(oid)) AS definition,
      md5(replace(prosrc,chr(13),'')) AS body FROM pg_proc
      WHERE oid='shop_manager.ensure_profile_for(uuid)'::regprocedure`)
    ).rows[0];
    assert.deepEqual(fingerprint, {
      definition: "77cb775bfedfb78996b31fcbdd3ada4c",
      body: "ec9ce0a3dc3bcd576cef57c5ea347d58",
    });
    await run(db);
  } finally {
    await db.close();
  }
}
async function asRole(db, role, sub, run) {
  assert.ok(["anon", "authenticated", "service_role"].includes(role));
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [sub ?? ""]);
  try {
    await db.exec(`SET ROLE ${role}`);
    const state = (
      await db.query(`SELECT current_user AS actor,auth.uid() AS subject,rolsuper,rolbypassrls,
      row_security_active('shop_manager.profiles') AS rls FROM pg_roles WHERE rolname=current_user`)
    ).rows[0];
    assert.deepEqual(state, {
      actor: role,
      subject: sub ?? null,
      rolsuper: false,
      rolbypassrls: role === "service_role",
      rls: role !== "service_role",
    });
    await run();
  } finally {
    await db.exec("RESET ROLE");
    await db.exec("SELECT set_config('request.jwt.claim.sub','',false)");
  }
}
const provision = async (db, id) =>
  (await db.query("SELECT shop_manager.ensure_profile_for($1) AS shop", [id])).rows[0].shop;
const rows = async (db) =>
  (await db.query("SELECT id,user_id,email,shop_id FROM shop_manager.profiles ORDER BY id")).rows;
const permissions = async (db) =>
  (
    await db.query(`SELECT rolname,
  has_function_privilege(rolname,'shop_manager.ensure_profile_for(uuid)','EXECUTE') AS execute,
  has_table_privilege(rolname,'shop_manager.profiles','INSERT') AS profile_insert,
  has_table_privilege(rolname,'shop_manager.profiles','UPDATE') AS profile_update,
  has_table_privilege(rolname,'shop_manager.user_roles','INSERT,UPDATE,DELETE') AS role_write
  FROM pg_roles WHERE rolname IN ('anon','authenticated','postgres','service_role') ORDER BY rolname`)
  ).rows;

test(
  "bootstrap extraction rejects absent, ambiguous, changed and oversized source",
  options,
  () => {
    assert.equal(extract(source.replace(/\r?\n/g, "\r\n")), bootstrap);
    assert.throws(() => extract(""));
    assert.throws(() => extract(source + bootstrap), /exactly one/);
    assert.throws(() => extract(source.replace("ON CONFLICT (id)", "ON CONFLICT (user_id)")));
    assert.throws(() => extract("x".repeat(256 * 1024)));
  },
);

test(
  "locked table ACL does not prevent another-user bootstrap or a business-ID shop binding",
  options,
  async () => {
    await fixture(async (db) => {
      await asRole(db, "authenticated", actor, async () => {
        await assert.rejects(
          db.query(
            "INSERT INTO shop_manager.profiles(id,user_id,email) VALUES($1,$1,'new@example.test')",
            [newUser],
          ),
          { code: "42501" },
        );
        await assert.rejects(db.exec("UPDATE shop_manager.profiles SET shop_id=NULL"), {
          code: "42501",
        });
        assert.equal(await provision(db, target), business);
        assert.equal(await provision(db, actor), null);
      });
      const created = await rows(db);
      assert.equal(created.length, 3);
      assert.equal(created.find((r) => r.user_id === target).shop_id, business);
      assert.notEqual(business, shop);
      assert.equal(created.find((r) => r.user_id === actor).shop_id, null);
      assert.equal(
        (await db.query("SELECT count(*)::int AS n FROM shop_manager.user_roles")).rows[0].n,
        0,
      );
    });
  },
);

test(
  "anonymous null-JWT bootstrap can create a requested unlinked user but invalid targets fail atomically",
  options,
  async () => {
    await fixture(async (db) => {
      await asRole(db, "anon", null, async () => {
        assert.equal(await provision(db, newUser), null);
      });
      const before = await rows(db);
      assert.equal(before.find((r) => r.user_id === newUser).shop_id, null);
      await asRole(db, "anon", null, async () => {
        await assert.rejects(provision(db, missingUser), { code: "23502" });
      });
      assert.deepEqual(await rows(db), before);
    });
  },
);

test(
  "legacy id/user_id mismatch hits uniqueness without altering the existing profile",
  options,
  async () => {
    await fixture(async (db) => {
      const before = await rows(db);
      await asRole(db, "authenticated", legacyUser, async () => {
        await assert.rejects(provision(db, legacyUser), { code: "23505" });
      });
      assert.deepEqual(await rows(db), before);
    });
  },
);

test(
  "existing shop is disclosed to other actors and a null-shop conflict return is not provisioning",
  options,
  async () => {
    await fixture(async (db) => {
      await db.query(
        "INSERT INTO shop_manager.profiles(id,user_id,email,shop_id) VALUES($1,$1,'target@example.test',NULL)",
        [target],
      );
      const before = await rows(db);
      await asRole(db, "authenticated", actor, async () => {
        assert.equal(await provision(db, legacyId), shop);
        assert.equal(await provision(db, target), business);
      });
      assert.deepEqual(await rows(db), before);
      assert.equal((await rows(db)).find((r) => r.user_id === target).shop_id, null);
    });
  },
);

test(
  "fixture-only full client EXECUTE denial preserves owner/service behavior and locked native ACL",
  options,
  async () => {
    await fixture(async (db) => {
      const before = await permissions(db);
      await db.exec("REVOKE EXECUTE ON FUNCTION shop_manager.ensure_profile_for(uuid) FROM PUBLIC");
      assert.equal(
        (await permissions(db)).find((r) => r.rolname === "authenticated").execute,
        true,
      );
      await db.exec(
        "REVOKE EXECUTE ON FUNCTION shop_manager.ensure_profile_for(uuid) FROM anon,authenticated",
      );
      const after = await permissions(db);
      for (const role of ["anon", "authenticated"]) {
        assert.equal(after.find((r) => r.rolname === role).execute, false);
        await asRole(db, role, role === "anon" ? null : actor, async () => {
          await assert.rejects(provision(db, newUser), { code: "42501" });
        });
      }
      assert.deepEqual(
        after.map((r) => r.profile_insert),
        before.map((r) => r.profile_insert),
      );
      assert.deepEqual(
        after.map((r) => r.profile_update),
        before.map((r) => r.profile_update),
      );
      assert.deepEqual(
        after.map((r) => r.role_write),
        before.map((r) => r.role_write),
      );
      assert.equal(
        (
          await db.query(
            "SELECT md5(pg_get_functiondef('shop_manager.ensure_profile_for(uuid)'::regprocedure)) AS hash",
          )
        ).rows[0].hash,
        "77cb775bfedfb78996b31fcbdd3ada4c",
      );
      for (const role of ["postgres", "service_role"])
        assert.equal(after.find((r) => r.rolname === role).execute, true);
      assert.equal(await provision(db, legacyId), shop);
      await asRole(db, "service_role", null, async () => {
        assert.equal(await provision(db, newUser), null);
      });
      assert.equal((await rows(db)).find((r) => r.user_id === newUser).shop_id, null);
    });
  },
);

test(
  "a proposed shop foreign key refuses the mismatched business UUID without partial profile writes",
  options,
  async () => {
    await fixture(async (db) => {
      // Hypothetical stricter schema only; this FK is absent in inspected live
      // native profiles. It is not introduced or approved by these tests.
      await db.exec(
        "ALTER TABLE shop_manager.profiles ADD CONSTRAINT fixture_shop_fk FOREIGN KEY(shop_id) REFERENCES shop_manager.shops(id)",
      );
      const before = await rows(db);
      await asRole(db, "authenticated", target, async () => {
        await assert.rejects(provision(db, target), { code: "23503" });
      });
      assert.deepEqual(await rows(db), before);
    });
  },
);
