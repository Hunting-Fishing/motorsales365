// OFFLINE selected native identity/role policy composition, not a production fix.
// Actual retained DDL, constraints, policies and three helpers execute unchanged.
// Only selected sections execute: no full import, cron/secret insertion, historical seeds,
// ensure_profile_for, staff/owner triggers, backfills or indirect writers run.
// auth.users/auth.uid and connection roles are explicit synthetic platform support.
// There is no invented profiles.shop_id FK or user_roles.role_id FK, no shops or
// businesses table, and no claim that a labelled independent owner is authorized.
// Dated metadata compares selected catalog surfaces, not complete live lineage,
// Data API reachability, trusted JWTs, writer closure or concurrent transactions.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../../../", import.meta.url);
const sha = (raw) => createHash("sha256").update(raw.replace(/\r\n/g, "\n")).digest("hex");
function pin(raw, expected, label) {
  assert.ok(raw.length > 0 && raw.length < 512 * 1024, `${label}: bounded input`);
  assert.equal(sha(raw), expected, `${label}: LF source drift`);
  return raw.replace(/\r\n/g, "\n");
}
function read(path, expected) {
  return pin(fs.readFileSync(new URL(path, root), "utf8"), expected, path);
}
function lines(raw, first, last, marker, expected) {
  assert.equal(raw.split(marker).length, 2, `${marker}: unique source marker`);
  const all = raw.split("\n");
  assert.ok(first >= 1 && last >= first && last <= all.length);
  const selected = all.slice(first - 1, last).join("\n") + "\n";
  assert.ok(selected.includes(marker));
  return pin(selected, expected, marker);
}
function fn(raw, name, expected, bodyMd5) {
  const escaped = name.replaceAll(".", "\\.");
  const matches = [
    ...raw.matchAll(new RegExp(`^CREATE OR REPLACE FUNCTION ${escaped}\\([\\s\\S]*?\\$\\$;`, "gm")),
  ];
  assert.equal(matches.length, 1, `${name}: one complete definition`);
  const selected = pin(matches[0][0], expected, name);
  assert.equal(createHash("md5").update(selected.split("$$")[1]).digest("hex"), bodyMd5);
  return selected;
}

const pins = {
  sources: {
    enum: [
      "20260713044701_64bcbe3c-76cf-4ed0-ba80-4e9c57766705",
      "7bf224ec3dd224af201b73868146927a6dd14713c13ed68adf049d8e6d644442",
    ],
    native: [
      "20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe",
      "f958d20e3b1ce5472cf292288f4710aab0ea858e5fd4f701bd0680cc0b039e71",
    ],
    fk: [
      "20260713070436_a4f482f9-5657-4142-88e7-047bd0e90a42",
      "b06be51908df335850c5132d8d5403d1918164bb2faded5195867e21b0a41a68",
    ],
    grants: [
      "20260713070515_c57f9258-c8b3-4973-9eff-2d03ccade037",
      "c3b6e173df40642079846415d3eb200f2544c2114f2c19053fbfe2a53b1a0e62",
    ],
    roles: [
      "20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e",
      "30dfd8df0c3537efb5155a8891804e00444b180f55e674b56d522e473e2f4144",
    ],
    owner: [
      "20260713081559_69ad9a73-edab-4719-b16e-38541b8ba91a",
      "23169927a45a5c47406181fb4e2e2c049e5282698f31a840c17cdbc2725a4472",
    ],
    belongs: [
      "20260713081649_7763bb16-35c5-4c76-a8f9-36c3f58090ce",
      "738cecf5f28c9cc3cce5e2980a6ebb5c324d18fbd5b92aeb151448c89afd7bb9",
    ],
    policies: [
      "20260713081838_b99aba93-f19b-4aec-b7a1-3bdb86faadc6",
      "5ea2e85cf05bf006dcb684ef063f9ef15f38fdfcc9dccd2c050f4c0a5a115647",
    ],
    rates: [
      "20260714170250_e9540d54-e006-48bd-918c-8e5033f08dab",
      "985949cd42058aa6964d5674953e3719da98933429f8fb8a7d316739313b5cc6",
    ],
    sweep: [
      "20260805084402_cd07847a-26f0-4c31-a2fe-ab0088684f77",
      "d987fe1e83505eb4002529a5290361fba2ff4af994938986ced9006c1502b321",
    ],
    bridge: [
      "20260901025424_business_staff_shop_manager_bridge",
      "a49e50ecd9a621d4162ff58666ab98584d9aa009775732ce4cf8b645d8c21a9e",
    ],
  },
  segments: {
    schemaDefaults: [
      "enum",
      2,
      7,
      "CREATE SCHEMA IF NOT EXISTS shop_manager;",
      "6657bccef9d7cb2ae662c8791a25d7d47b822e8ddf51bf9b5e86e86c90be90d3",
    ],
    enum: [
      "enum",
      9,
      9,
      "CREATE TYPE shop_manager.app_role AS ENUM",
      "d7d828bdb7d7d7b9229f26ab537675b56f6b8f12f047fc670a54c290496f7e8e",
    ],
    profiles: [
      "native",
      57,
      85,
      "CREATE TABLE shop_manager.profiles (",
      "b9ae44c03daaa146750a69d273f2b1d785ac1f47853cea54c18aafd1eaa63e5e",
    ],
    userRoles: [
      "native",
      721,
      728,
      "CREATE TABLE shop_manager.user_roles (",
      "f57ac2e904e81ed8b15a1b21327c3a55789102b9115b4db6d2c0d051aff14605",
    ],
    profileAuthFk: [
      "fk",
      83,
      83,
      "ALTER TABLE shop_manager.profiles ADD CONSTRAINT profiles_user_id_fkey",
      "1ae891be95b84c0ddb368d5f6aef72319fed08245b3a7f983bd6d932e4fe4a2f",
    ],
    roleAuthFk: [
      "fk",
      93,
      93,
      "ALTER TABLE shop_manager.user_roles ADD CONSTRAINT user_roles_user_id_fkey",
      "5de96d8ae596502a129a6615d02962a946ad87b3f3c0e774d5f7cbf0c3a3e445",
    ],
    grantSweep: [
      "grants",
      1,
      10,
      "FOR r IN SELECT tablename FROM pg_tables",
      "17e9f164e052ac1e9b3582442c2e7e50c22a61e0607dc0c10ceff5596743fd65",
    ],
    roles: [
      "roles",
      14,
      18,
      "CREATE TABLE IF NOT EXISTS shop_manager.roles (",
      "c586077e0711ef753eb5031deb08551a6f942183c4496b15ade9c1954627b1be",
    ],
    rolesAccess: [
      "roles",
      19,
      23,
      "GRANT SELECT ON shop_manager.roles TO authenticated;",
      "970b647673be6869541cee551e19dc94d03787e067c4bb475a8ce9b1c9f547bc",
    ],
    profilesPolicies: [
      "policies",
      5,
      25,
      'DROP POLICY IF EXISTS "sm_profiles_select_self"',
      "dc81ffcc54e71f3a21e8fb28ccd38129ce87b6c36b95cc54d7d876550303edc5",
    ],
    userRolesPolicies: [
      "policies",
      45,
      57,
      'DROP POLICY IF EXISTS "sm_user_roles_select_self"',
      "53f40d54b92d3ab02bbb08ee4315e42d066e985cbe33484b21cf6ef889e5aadd",
    ],
    rates: [
      "rates",
      4,
      6,
      "ALTER TABLE shop_manager.profiles",
      "569421f87fdd5f00570c3a6eb71b4cf9653d2ea71ba8e48fb01268c9b1c71451",
    ],
    policySweep: [
      "sweep",
      87,
      116,
      "has_shop boolean;",
      "73e5a37b5d67a1bc0daca21195610a25db6472b1b8901ef81eabf42ede69439a",
    ],
    profileUnique: [
      "bridge",
      4,
      5,
      "ON shop_manager.profiles(user_id) WHERE user_id IS NOT NULL;",
      "c261711b1a0fe59d6c3c92d7aca23825677fd94f7b6480c074abc0bdbc204860",
    ],
  },
  functions: {
    currentShop: [
      "roles",
      "shop_manager.get_current_user_shop_id",
      "96d278351d5b335519711b97e89dd5b52052886929fbce820951414612cd7845",
      "6049d4aebd36a1230288e6a2227e1071",
    ],
    ownerOrAdmin: [
      "owner",
      "shop_manager.is_owner_or_admin",
      "a17c23e5eb0fbd870b596282c637c269bfc36a1bb8db88c94a2e07ead8926395",
      "2ffa08c10ab6bd41b1d47a9a2610d56a",
    ],
    belongsToShop: [
      "belongs",
      "shop_manager.user_belongs_to_shop",
      "0b7e3f7cc785ac83b62f053d18c18b94b9b6bc2c17d2fd9f6c694cbb6cdd8285",
      "7786134c6646c4ade72c0107d4219236",
    ],
  },
  observation: [
    "docs/evidence/native-profile-role-catalog-2026-10-15.json",
    "d92af49531821c95fe9173bc3184b77060c22ffdaac30d7e7b70311e60f2712a",
  ],
  catalogQuery: [
    "docs/evidence/native-profile-role-catalog-review.sql",
    "ea8597272733c8579651e6f9c47cb0e600a2cfa5addaf6b03ea91d7706ce880d",
  ],
};
const sources = Object.fromEntries(
  Object.entries(pins.sources).map(([key, [name, hash]]) => [
    key,
    read(`supabase/migrations/${name}.sql`, hash),
  ]),
);
const ddl = Object.fromEntries(
  Object.entries(pins.segments).map(([key, [source, first, last, marker, hash]]) => [
    key,
    lines(sources[source], first, last, marker, hash),
  ]),
);
const functions = Object.fromEntries(
  Object.entries(pins.functions).map(([key, [source, name, hash, body]]) => [
    key,
    fn(sources[source], name, hash, body),
  ]),
);
const policies = {
  profiles: ddl.profilesPolicies,
  userRoles: ddl.userRolesPolicies,
  originalRoles: ddl.rolesAccess,
  sweep: ddl.policySweep,
};
const observed = JSON.parse(read(...pins.observation));
assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
const catalogQuery = read(...pins.catalogQuery);

const uuid = (number) => `11111111-1111-4111-8111-${String(number).padStart(12, "0")}`;
const ids = Object.freeze({
  actor: uuid(1),
  admin: uuid(2),
  target: uuid(3),
  other: uuid(4),
  independentOwner: uuid(5),
  noProfile: uuid(6),
  legacy: uuid(7),
  shadow: uuid(8),
  newProfile: uuid(9),
  shopA: uuid(101),
  shopB: uuid(102),
  shopC: uuid(103),
  roleOwner: uuid(201),
  roleAdmin: uuid(202),
  roleTechnician: uuid(203),
  roleOther: uuid(204),
  orphanRole: uuid(205),
  actorRole: uuid(301),
  adminRole: uuid(302),
  targetRole: uuid(303),
  otherRole: uuid(304),
  newRoleAssignment: uuid(305),
});
const relationNames = [
  "auth.users",
  "shop_manager.profiles",
  "shop_manager.roles",
  "shop_manager.user_roles",
];
// Synthetic platform support only. SET LOCAL ROLE plus a synthetic claim GUC is
// not real JWT verification, connection-pool behavior or Supabase Auth parity.
const support = `
  SET statement_timeout='3000ms'; SET lock_timeout='1000ms'; SET search_path=public;
  CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS pg_catalog.uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::pg_catalog.uuid
  $$;
  CREATE TABLE auth.users(id uuid PRIMARY KEY,email text NOT NULL);
  GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
`;

async function seed(db) {
  for (const [key, shop] of [
    ["actor", ids.shopA],
    ["admin", ids.shopA],
    ["target", ids.shopA],
    ["other", ids.shopB],
    ["independentOwner", ids.shopA],
    ["noProfile", null],
  ]) {
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2)", [
      ids[key],
      `${key}@example.test`,
    ]);
    if (key !== "noProfile") {
      await db.query(
        `INSERT INTO shop_manager.profiles
        (id,user_id,email,shop_id,first_name,last_name,has_auth_account,created_at,updated_at)
        VALUES($1,$1,$2,$3,$4,'Fixture',true,'2000-01-01Z','2000-01-01Z')`,
        [ids[key], `${key}@example.test`, shop, key],
      );
    }
  }
  // Synthetic deterministic rows cover the full actual 31-label enum; this is
  // not the historical INSERT seed section or evidence of live role rows.
  const namedRoles = {
    owner: ids.roleOwner,
    admin: ids.roleAdmin,
    technician: ids.roleTechnician,
    other_staff: ids.roleOther,
  };
  const enumRoles = (
    await db.query("SELECT unnest(enum_range(NULL::shop_manager.app_role))::text AS name")
  ).rows;
  assert.equal(enumRoles.length, 31);
  let nextRole = 210;
  for (const { name } of enumRoles) {
    const roleId = namedRoles[name] ?? uuid(nextRole++);
    await db.query(
      "INSERT INTO shop_manager.roles(id,name,created_at) VALUES($1,$2::shop_manager.app_role,'2000-01-01Z')",
      [roleId, name],
    );
  }
  for (const [assignment, user, role] of [
    [ids.actorRole, ids.actor, ids.roleTechnician],
    [ids.adminRole, ids.admin, ids.roleAdmin],
    [ids.targetRole, ids.target, ids.roleTechnician],
    [ids.otherRole, ids.other, ids.roleTechnician],
  ]) {
    await db.query(
      "INSERT INTO shop_manager.user_roles(id,user_id,role_id,created_at) VALUES($1,$2,$3,'2000-01-01Z')",
      [assignment, user, role],
    );
  }
}

async function withFixture(run, { policyVariant = "swept", seed: seedRows = true } = {}) {
  assert.ok(["original", "swept"].includes(policyVariant));
  assert.equal(typeof seedRows, "boolean");
  const db = new PGlite("memory://");
  try {
    await db.exec(support);
    // Original chronology is intentional: the broad grants see only profiles
    // and user_roles here. The later roles table also receives CRUD through the
    // earlier, unchanged postgres owner-default ACL, not a fabricated grant.
    for (const sql of [
      ddl.schemaDefaults,
      ddl.enum,
      ddl.profiles,
      ddl.userRoles,
      ddl.profileAuthFk,
      ddl.roleAuthFk,
      ddl.grantSweep,
      ddl.roles,
      ddl.rolesAccess,
      functions.currentShop,
      functions.ownerOrAdmin,
      functions.belongsToShop,
      ddl.profilesPolicies,
      ddl.userRolesPolicies,
      ddl.rates,
      ddl.profileUnique,
    ])
      await db.exec(sql);
    if (policyVariant === "swept") {
      // Actual block 4, unmodified; only these three shop_manager tables exist.
      // This does not replay the sweep on a full schema or establish its lineage.
      await db.exec(ddl.policySweep);
    }
    // The actual retained FK DOs catch errors, so assert successful installation
    // rather than treating a swallowed source exception as constraint coverage.
    assert.deepEqual(
      (
        await db.query(`SELECT conname,convalidated FROM pg_catalog.pg_constraint
      WHERE conname IN ('profiles_user_id_fkey','user_roles_user_id_fkey') ORDER BY conname`)
      ).rows,
      [
        { conname: "profiles_user_id_fkey", convalidated: true },
        { conname: "user_roles_user_id_fkey", convalidated: true },
      ],
    );
    if (seedRows) await seed(db);
    await run(db, { policyVariant, ids });
  } finally {
    await db.close();
  }
}

async function actor(db, user, sql, parameters = [], role = "authenticated") {
  assert.ok(["authenticated", "anon", "service_role"].includes(role));
  await db.exec(`BEGIN; SET LOCAL ROLE ${role};`);
  try {
    await db.query("SELECT pg_catalog.set_config('request.jwt.claim.sub',$1,true)", [user ?? ""]);
    const result = await db.query(sql, parameters);
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
async function catalog(db) {
  const result = (await db.query(catalogQuery)).rows[0];
  // The observation clock is deliberately not part of a preserve-state check.
  return { tables: result.tables, functions: result.functions };
}
async function data(db) {
  const result = {};
  for (const relation of relationNames) {
    result[relation] = (
      await db.query(
        `SELECT pg_catalog.to_jsonb(t) AS row FROM ${relation} AS t ORDER BY pg_catalog.to_jsonb(t)::pg_catalog.text`,
      )
    ).rows;
  }
  return result;
}
async function state(db) {
  const platform = {};
  for (const [key, sql] of Object.entries({
    roles: `SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolbypassrls FROM pg_catalog.pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role') ORDER BY rolname`,
    schemas: `SELECT nspname,nspacl::pg_catalog.text AS acl,pg_catalog.pg_get_userbyid(nspowner) AS owner FROM pg_catalog.pg_namespace WHERE nspname IN ('public','auth','shop_manager') ORDER BY nspname`,
    memberships: `SELECT roleid::pg_catalog.regrole::pg_catalog.text AS role,member::pg_catalog.regrole::pg_catalog.text AS member,admin_option FROM pg_catalog.pg_auth_members ORDER BY 1,2`,
    defaults: `SELECT pg_catalog.pg_get_userbyid(d.defaclrole) AS owner,n.nspname,d.defaclobjtype,d.defaclacl::pg_catalog.text AS acl FROM pg_catalog.pg_default_acl AS d LEFT JOIN pg_catalog.pg_namespace AS n ON n.oid=d.defaclnamespace ORDER BY 1,2,3`,
  }))
    platform[key] = (await db.query(sql)).rows;
  return { catalog: await catalog(db), data: await data(db), platform };
}
const hasCode = (code) => (error) => error.code === code;

export {
  pins,
  sources,
  ddl,
  policies,
  functions,
  observed,
  catalogQuery,
  ids,
  support,
  relationNames,
  seed,
  withFixture,
  actor,
  catalog,
  data,
  state,
  hasCode,
  sha,
  pin,
  read,
  lines,
  fn,
};
