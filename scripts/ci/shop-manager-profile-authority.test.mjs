// Disposable authority regression only. No live clients, credentials, persistent
// database paths, applied-SQL changes, or production mitigation are involved.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const sha = (text) => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
function verifySource(raw, hash, label) {
  assert.equal(sha(raw), hash, `${label}: historical source changed; review before updating pins`);
  return raw;
}
function readPinned(name, hash) {
  return verifySource(fs.readFileSync(new URL(name, migrations), "utf8"), hash, name);
}
function extractPinned(raw, pattern, hash, label) {
  const matches = [...raw.matchAll(pattern)];
  assert.equal(matches.length, 1, `${label}: expected exactly one SQL section`);
  const sql = matches[0][0]; // Execute the original matched bytes; never reconstruct SQL.
  assert.equal(sha(sql), hash, `${label}: extracted SQL changed`);
  return sql;
}

const helperSource = readPinned(
  "20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql",
  "30dfd8df0c3537efb5155a8891804e00444b180f55e674b56d522e473e2f4144",
);
const policySource = readPinned(
  "20260713081838_b99aba93-f19b-4aec-b7a1-3bdb86faadc6.sql",
  "5ea2e85cf05bf006dcb684ef063f9ef15f38fdfcc9dccd2c050f4c0a5a115647",
);
const employeeSource = readPinned(
  "20260831124952_employee_operations_ledger.sql",
  "2386ee30a1b12cd124445adf3da3568c35e567e96aa9f7b83e6cd4211ccae6b2",
);
const helperPattern =
  /^CREATE OR REPLACE FUNCTION shop_manager\.get_current_user_shop_id\(\)[\s\S]*?\$\$;/gm;
const currentShopSql = extractPinned(
  helperSource,
  helperPattern,
  "96d278351d5b335519711b97e89dd5b52052886929fbce820951414612cd7845",
  "current-shop helper",
);
const currentEmployeeSql = extractPinned(
  employeeSource,
  /^CREATE OR REPLACE FUNCTION shop_manager\.current_employee_profile\(\)[\s\S]*?\$\$;/gm,
  "340715972e053fa97ae0593c6209cc7b0111a4a1ba0ffc9f7d690deebe45712f",
  "employee-profile resolver",
);
const profilePolicyPins = [
  ["select_self", "03566d3ad99f23abfc83b9ec238cdd08f3c4ee1dfda4ce9dd208b0c5fe4ed84e"],
  ["select_shop", "7da7f4848c48adff21316f50f9491da43ecb077a69065bd2f67d4ed3279799b4"],
  ["update_self", "3bfc6a748cfad5aaf330e11523d06e6f1600dea3ac3ad55db0538f97bc2f6ce1"],
  ["insert_self", "92aa2bd24bd9978b16072b307fa4e927976f4ef81db2b58f1fc0f2879aee0a9c"],
];
const profilePolicies = profilePolicyPins.map(([suffix, hash]) =>
  extractPinned(
    policySource,
    new RegExp(`^CREATE POLICY "sm_profiles_${suffix}"[\\s\\S]*?;`, "gm"),
    hash,
    `self-profile ${suffix}`,
  ),
);
// The original dynamic block creates shop-scoped policies for three tables.
// Two extra minimal empty tables allow this exact block to run unchanged.
const tenantPolicies = extractPinned(
  policySource,
  /^DO \$\$\r?\nDECLARE t text;\r?\nBEGIN\r?\n  FOR t IN SELECT unnest\(ARRAY\['customers','inventory_items','work_orders'\]\) LOOP[\s\S]*?END\$\$;/gm,
  "f9db6a21b1b6c181e313e7e20cd7d9f1d5d030070c4ef2230b79a5c43284b34c",
  "shop-scoped table policies",
);

const actorA = "00000000-0000-4000-8000-000000000001";
const actorB = "00000000-0000-4000-8000-000000000002";
const actorNew = "00000000-0000-4000-8000-000000000003";
const actorLegacy = "00000000-0000-4000-8000-000000000004";
const legacyProfile = "10000000-0000-4000-8000-000000000004";
const shopA = "20000000-0000-4000-8000-000000000001";
const shopB = "20000000-0000-4000-8000-000000000002";
const customerA = "30000000-0000-4000-8000-000000000001";
const customerB = "30000000-0000-4000-8000-000000000002";
const options = { concurrency: false, timeout: 20_000 };

async function withFixture(run, { mitigate = false } = {}) {
  const db = new PGlite("memory://");
  try {
    await db.exec(`
      SET statement_timeout = '3000ms';
      SET lock_timeout = '1000ms';
      CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
      CREATE SCHEMA auth;
      CREATE SCHEMA shop_manager;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE TABLE shop_manager.shops(id uuid PRIMARY KEY);
      CREATE TABLE shop_manager.profiles(
        id uuid PRIMARY KEY, user_id uuid UNIQUE,
        shop_id uuid REFERENCES shop_manager.shops(id), first_name text
      );
      CREATE TABLE shop_manager.customers(id uuid PRIMARY KEY, shop_id uuid, label text);
      CREATE TABLE shop_manager.inventory_items(id uuid PRIMARY KEY, shop_id uuid);
      CREATE TABLE shop_manager.work_orders(id uuid PRIMARY KEY, shop_id uuid);
      CREATE TABLE shop_manager.fixture_memberships(
        user_id uuid, shop_id uuid, PRIMARY KEY(user_id, shop_id)
      );
      ALTER TABLE shop_manager.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE shop_manager.customers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE shop_manager.inventory_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE shop_manager.work_orders ENABLE ROW LEVEL SECURITY;
      ALTER TABLE shop_manager.fixture_memberships ENABLE ROW LEVEL SECURITY;
      CREATE POLICY fixture_membership_self_read ON shop_manager.fixture_memberships
        FOR SELECT TO authenticated USING (user_id=auth.uid());
      GRANT USAGE ON SCHEMA auth, shop_manager TO authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
      GRANT SELECT, INSERT, UPDATE ON shop_manager.profiles TO authenticated;
      GRANT SELECT ON shop_manager.customers, shop_manager.fixture_memberships TO authenticated;
    `);
    await db.query("INSERT INTO shop_manager.shops VALUES ($1),($2)", [shopA, shopB]);
    await db.query(
      "INSERT INTO shop_manager.profiles VALUES ($1,$1,$2,'Alpha'),($3,$3,$4,'Beta'),($5,$6,$2,'Legacy')",
      [actorA, shopA, actorB, shopB, legacyProfile, actorLegacy],
    );
    await db.query(
      "INSERT INTO shop_manager.customers VALUES ($1,$2,'Alpha private'),($3,$4,'Beta private')",
      [customerA, shopA, customerB, shopB],
    );
    await db.query("INSERT INTO shop_manager.fixture_memberships VALUES ($1,$2),($3,$4),($5,$2)", [
      actorA,
      shopA,
      actorB,
      shopB,
      actorLegacy,
    ]);
    await db.exec(currentShopSql);
    await db.exec(currentEmployeeSql);
    for (const sql of profilePolicies) await db.exec(sql);
    await db.exec(tenantPolicies);
    await db.exec(`
      REVOKE ALL ON FUNCTION shop_manager.get_current_user_shop_id() FROM PUBLIC;
      REVOKE ALL ON FUNCTION shop_manager.current_employee_profile() FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION shop_manager.get_current_user_shop_id() TO authenticated;
      GRANT EXECUTE ON FUNCTION shop_manager.current_employee_profile() TO authenticated;
    `);
    if (mitigate) {
      // FIXTURE-ONLY contrast, NOT a proposed/applied migration. Production
      // provisioning, all callers, other sensitive columns and grants need review.
      await db.exec(`
        REVOKE INSERT, UPDATE ON shop_manager.profiles FROM authenticated;
        GRANT UPDATE(first_name) ON shop_manager.profiles TO authenticated;
      `);
    }
    await db.exec("SET ROLE authenticated");
    await run(db);
  } finally {
    await db.close();
  }
}

async function actor(db, id) {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  const status = (
    await db.query(`
    SELECT current_user AS actor, r.rolsuper, r.rolbypassrls,
      row_security_active('shop_manager.customers') AS customer_rls,
      row_security_active('shop_manager.profiles') AS profile_rls
    FROM pg_roles r WHERE r.rolname=current_user
  `)
  ).rows[0];
  assert.deepEqual(status, {
    actor: "authenticated",
    rolsuper: false,
    rolbypassrls: false,
    customer_rls: true,
    profile_rls: true,
  });
}
const currentShop = async (db) =>
  (await db.query("SELECT shop_manager.get_current_user_shop_id() AS id")).rows[0].id;
const visibleCustomers = async (db) =>
  (await db.query("SELECT id FROM shop_manager.customers ORDER BY id")).rows.map((row) => row.id);
const memberships = async (db, shop) =>
  (
    await db.query(
      "SELECT count(*)::int AS n FROM shop_manager.fixture_memberships WHERE shop_id=$1",
      [shop],
    )
  ).rows[0].n;
const permissionDenied = (error) => error.code === "42501";

test(
  "historical source pins and unique extraction fail closed without rewriting SQL",
  options,
  () => {
    const root = JSON.parse(
      fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    );
    assert.equal(root.devDependencies["@electric-sql/pglite"], "0.5.9");
    assert.ok(helperSource.includes(currentShopSql));
    for (const sql of [...profilePolicies, tenantPolicies]) assert.ok(policySource.includes(sql));
    assert.ok(employeeSource.includes(currentEmployeeSql));
    assert.equal(sha(helperSource), sha(helperSource.replace(/\r?\n/g, "\r\n")));
    assert.throws(
      () => verifySource(`${helperSource}\n-- changed`, sha(helperSource), "fixture"),
      /historical source changed/,
    );
    assert.throws(
      () => extractPinned("", helperPattern, sha(currentShopSql), "fixture"),
      /exactly one SQL section/,
    );
    assert.throws(
      () =>
        extractPinned(
          `${helperSource}\n${currentShopSql}`,
          helperPattern,
          sha(currentShopSql),
          "fixture",
        ),
      /exactly one SQL section/,
    );
  },
);

test(
  "ordinary actors initially have their own shop rows and cannot change another profile",
  options,
  async () => {
    await withFixture(async (db) => {
      await actor(db, actorA);
      assert.equal(await currentShop(db), shopA);
      assert.deepEqual(await visibleCustomers(db), [customerA]);
      assert.deepEqual(
        (await db.query("SELECT id FROM shop_manager.customers WHERE id=$1", [customerB])).rows,
        [],
      );
      assert.deepEqual(
        (
          await db.query(
            "UPDATE shop_manager.profiles SET first_name='Not allowed' WHERE id=$1 RETURNING id",
            [actorB],
          )
        ).rows,
        [],
      );
      assert.deepEqual(
        (
          await db.query(
            "UPDATE shop_manager.profiles SET first_name='Allowed safe edit' WHERE id=$1 RETURNING first_name",
            [actorA],
          )
        ).rows,
        [{ first_name: "Allowed safe edit" }],
      );
      await actor(db, actorB);
      assert.deepEqual(await visibleCustomers(db), [customerB]);
      assert.deepEqual(
        (await db.query("SELECT first_name FROM shop_manager.profiles WHERE id=$1", [actorB])).rows,
        [{ first_name: "Beta" }],
      );
    });
  },
);

test(
  "self-profile UPDATE changes current-shop authority and exposes the other shop",
  options,
  async () => {
    await withFixture(async (db) => {
      await actor(db, actorA);
      assert.deepEqual(await visibleCustomers(db), [customerA]);
      assert.equal(await memberships(db, shopB), 0);
      const changed = await db.query(
        "UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2 RETURNING shop_id",
        [shopB, actorA],
      );
      assert.deepEqual(changed.rows, [{ shop_id: shopB }]);
      assert.equal(await currentShop(db), shopB);
      assert.deepEqual(await visibleCustomers(db), [customerB]);
      assert.equal(await memberships(db, shopB), 0);
    });
  },
);

test(
  "a profile-less ordinary actor can self-INSERT another shop without membership",
  options,
  async () => {
    await withFixture(async (db) => {
      await actor(db, actorNew);
      assert.equal(await currentShop(db), null);
      assert.deepEqual(await visibleCustomers(db), []);
      assert.equal(await memberships(db, shopB), 0);
      const inserted = await db.query(
        "INSERT INTO shop_manager.profiles(id,user_id,shop_id,first_name) VALUES($1,$1,$2,'Self provisioned') RETURNING shop_id",
        [actorNew, shopB],
      );
      assert.deepEqual(inserted.rows, [{ shop_id: shopB }]);
      assert.equal(await currentShop(db), shopB);
      assert.deepEqual(await visibleCustomers(db), [customerB]);
      assert.equal(await memberships(db, shopB), 0);
    });
  },
);

test(
  "legacy profile id differs from user_id and the two exact resolvers disagree",
  options,
  async () => {
    await withFixture(async (db) => {
      await actor(db, actorLegacy);
      assert.equal(await memberships(db, shopA), 1);
      assert.equal(await currentShop(db), null);
      assert.deepEqual(await visibleCustomers(db), []);
      const employee = await db.query(
        "SELECT id,user_id,shop_id FROM shop_manager.current_employee_profile()",
      );
      assert.deepEqual(employee.rows, [
        { id: legacyProfile, user_id: actorLegacy, shop_id: shopA },
      ]);
    });
  },
);

test(
  "fixture-only column grants block both pivots while preserving safe-field edits",
  options,
  async () => {
    await withFixture(
      async (db) => {
        await actor(db, actorA);
        assert.deepEqual(
          (
            await db.query(
              "UPDATE shop_manager.profiles SET first_name='Safe column edit' WHERE id=$1 RETURNING first_name",
              [actorA],
            )
          ).rows,
          [{ first_name: "Safe column edit" }],
        );
        await assert.rejects(
          db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2 RETURNING shop_id", [
            shopB,
            actorA,
          ]),
          permissionDenied,
        );
        await assert.rejects(
          db.query("UPDATE shop_manager.profiles SET user_id=$1 WHERE id=$2", [actorNew, actorA]),
          permissionDenied,
        );
        assert.equal(await currentShop(db), shopA);
        assert.deepEqual(await visibleCustomers(db), [customerA]);
        await actor(db, actorNew);
        await assert.rejects(
          db.query("INSERT INTO shop_manager.profiles(id,user_id,shop_id) VALUES($1,$1,$2)", [
            actorNew,
            shopB,
          ]),
          permissionDenied,
        );
        assert.equal(await currentShop(db), null);
        assert.deepEqual(await visibleCustomers(db), []);
      },
      { mitigate: true },
    );
  },
);
