// OFFLINE selected-source trigger composition, not production/offboarding acceptance.
// No history, seeds, backfills, audit writers, chat delivery or native repair runs.
// Actual retained critical DDL and functions below execute unchanged. Synthetic
// auth/session/public-business support and narrow catalog-ACL reproduction are
// explicit fixture prerequisites, not applied lineage or complete schema parity.
// In particular, profiles.shop_id has NO invented FK, legacy IDs stay intact,
// and neither chat nor shift CHECK is weakened to admit the writer's statuses.
// Source-only chat self-update policies are NOT loaded: their effective/current
// reachability is unverified. Reactivation here is a roster-trigger side effect.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../../", import.meta.url);
const sha = (raw) => createHash("sha256").update(raw.replace(/\r\n/g, "\n")).digest("hex");
function pin(raw, expected, label) {
  assert.ok(raw.length > 0 && raw.length < 512 * 1024, `${label}: bounded input`);
  assert.equal(sha(raw), expected, `${label}: LF source drift`);
  return raw.replace(/\r\n/g, "\n");
}
function read(path, expected) {
  return pin(fs.readFileSync(new URL(path, root), "utf8"), expected, path);
}
function source(name, expected) {
  return read(`supabase/migrations/${name}.sql`, expected);
}
function lines(raw, first, last, marker, expected) {
  assert.equal(raw.split(marker).length, 2, `${marker}: unique declaration`);
  const all = raw.split("\n");
  assert.ok(first >= 1 && last >= first && last <= all.length);
  const selected = all.slice(first - 1, last).join("\n") + "\n";
  assert.ok(selected.includes(marker));
  return pin(selected, expected, marker);
}
function fn(raw, name, expected) {
  const escaped = name.replaceAll(".", "\\.");
  const matches = [
    ...raw.matchAll(new RegExp(`^CREATE OR REPLACE FUNCTION ${escaped}\\([\\s\\S]*?\\$\\$;`, "gm")),
  ];
  assert.equal(matches.length, 1, `${name}: one complete definition`);
  return pin(matches[0][0], expected, name);
}
const sources = {
  roster: source(
    "20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12",
    "69afe9112531bd75d0bc68d4b31461d9e1c9aae41337ebdf79e6f40056447d62",
  ),
  timestamp: source(
    "20260620173020_b2bd6551-8f88-4050-bf57-10a0e7be4da2",
    "61280ef72b2f631d1117b8b8dc3564442fff95be67b78d48e97250dc2cacbe84",
  ),
  chat: source(
    "20260711073331_3314948d-c196-44ff-b656-7be383f5d16b",
    "67bba50f869ebbd00edab5de5d7913e91112073b7f7a1c75475bb4125414dac4",
  ),
  team: source(
    "20260713071921_8c790938-2bb4-420b-b1df-3261d4bed855",
    "2231cdf09ee79ed8a8e0d93ef55176c2e32f245494f55c93dba5e5cbe4a171d7",
  ),
  ledger: source(
    "20260831124952_employee_operations_ledger",
    "2386ee30a1b12cd124445adf3da3568c35e567e96aa9f7b83e6cd4211ccae6b2",
  ),
  counter: source(
    "20260831193523_counter_sales_registers_pricebook",
    "e2736908cc1e3343e4cb1a784c0f839ff198e0754c015f39b831fb3482f0327c",
  ),
  bridge: source(
    "20260901025424_business_staff_shop_manager_bridge",
    "a49e50ecd9a621d4162ff58666ab98584d9aa009775732ce4cf8b645d8c21a9e",
  ),
  boundary: source(
    "20260901090422_correct_business_role_and_associate_boundaries",
    "bd5de1d18b1e22e361e161a249e22d36759cc24ba9b9636de5dd762b90a7ccd4",
  ),
  latest: source(
    "20260902151438_assistant_manager_temporary_canonical_permission",
    "1ac1aaed2fb7fe17bd10a73a1f62f9eab4764248bf257518b84b14db23752522",
  ),
  native: source(
    "20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe",
    "f958d20e3b1ce5472cf292288f4710aab0ea858e5fd4f701bd0680cc0b039e71",
  ),
  fk: source(
    "20260713070436_a4f482f9-5657-4142-88e7-047bd0e90a42",
    "b06be51908df335850c5132d8d5403d1918164bb2faded5195867e21b0a41a68",
  ),
  parts: source(
    "20260831041350_associate_parts_catalogue_operations",
    "837be415b06829396f80cf53ba8245fa02ad1dabdd93bcb58235467fe30ed10e",
  ),
  enum: source(
    "20260713044701_64bcbe3c-76cf-4ed0-ba80-4e9c57766705",
    "7bf224ec3dd224af201b73868146927a6dd14713c13ed68adf049d8e6d644442",
  ),
  roles: source(
    "20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e",
    "30dfd8df0c3537efb5155a8891804e00444b180f55e674b56d522e473e2f4144",
  ),
};
const ddl = {
  staffEnum: lines(
    sources.roster,
    3,
    6,
    "CREATE TYPE public.business_staff_role AS ENUM",
    "85da808b4640853449e53470961085caee52e6d07e6d8aa143b1f90b3a5a0d41",
  ),
  assistant: lines(
    sources.latest,
    4,
    4,
    "ALTER TYPE public.business_staff_role ADD VALUE",
    "0de4ff6467e79d73b827f18fdeca9c7b37436beb23f2d2efe4043e83c368f8fe",
  ),
  roster: lines(
    sources.roster,
    19,
    38,
    "CREATE TABLE IF NOT EXISTS public.business_staff (",
    "8dc0f54ae0fb36e4c3fc8397e5017c0af861debe22f02275d06ac98ab9ce85df",
  ),
  policies: lines(
    sources.roster,
    67,
    82,
    'CREATE POLICY "staff: members read"',
    "8d0ea891710bac8646c2e3b6407350d33bf92b4bf864f4bd87bf3adce9fe755e",
  ),
  timestampAttach: lines(
    sources.roster,
    214,
    216,
    "CREATE TRIGGER trg_business_staff_updated",
    "97fae96805252fbc77dab8da4645ef0cbf9621ca35776ff36d79411851d64fdb",
  ),
  chat: lines(
    sources.chat,
    3,
    25,
    "CREATE TABLE public.chat_threads (",
    "4086319bae65c7d59e8479bfdb170714deaed67fc73524319a57cb6af724855b",
  ),
  chatScope: lines(
    sources.team,
    3,
    10,
    "ADD COLUMN IF NOT EXISTS business_id uuid",
    "0ec4d97c529df8f3da6a975b649589e8758fb67b059b64b933175f4723baa5cb",
  ),
  chatAttach: lines(
    sources.team,
    91,
    94,
    "CREATE TRIGGER business_staff_team_thread_sync",
    "adf6bc99a6c67aebe678f3c6a527a8d4ab695ab0f361ef6c0fafd365f3a6500a",
  ),
  locations: lines(
    sources.ledger,
    5,
    17,
    "CREATE TABLE IF NOT EXISTS shop_manager.employee_work_locations (",
    "fff9648e1854710ea2c0dd2c3d3e7e47b0a47d9ae1344e33a0d7aae1db955092",
  ),
  defaultLocation: lines(
    sources.ledger,
    23,
    36,
    "CREATE OR REPLACE FUNCTION shop_manager.create_default_employee_work_location()",
    "4a931eb2414962eeefb493d390063139730a0ca0658a6189bfaab84d1b2c34a6",
  ),
  shifts: lines(
    sources.ledger,
    38,
    60,
    "CREATE TABLE IF NOT EXISTS shop_manager.employee_shifts (",
    "b84cf79056e58e07ad9c2efdd00590bf4de9cf2572e0a2e465b69c1f5ca34a22",
  ),
  registers: lines(
    sources.counter,
    3,
    3,
    "CREATE TABLE shop_manager.cash_registers(",
    "6a188e8d68805b44aa6cf52009485bf90f28b1b9f468e527717040b1f75b9376",
  ),
  sessions: lines(
    sources.counter,
    5,
    6,
    "CREATE TABLE shop_manager.register_sessions(",
    "ae4eb17508a17bdf2f778bc543a8130bc2d574606d492ad0fd9e1658a0e76057",
  ),
  nativeAttach: lines(
    sources.bridge,
    135,
    138,
    "CREATE TRIGGER sync_business_staff_to_shop_manager",
    "ed84dde2fa01e12826afa79193aa8a6d33d240b4a29599d692273cf929e16e99",
  ),
  profiles: lines(
    sources.native,
    57,
    85,
    "CREATE TABLE shop_manager.profiles (",
    "b9ae44c03daaa146750a69d273f2b1d785ac1f47853cea54c18aafd1eaa63e5e",
  ),
  shops: lines(
    sources.native,
    565,
    598,
    "CREATE TABLE shop_manager.shops (",
    "fdba3f5b2a8befd49cc91dda27b92ea89eb096dcbb79b3e16206537130041cd9",
  ),
  userRoles: lines(
    sources.native,
    721,
    728,
    "CREATE TABLE shop_manager.user_roles (",
    "f57ac2e904e81ed8b15a1b21327c3a55789102b9115b4db6d2c0d051aff14605",
  ),
  authFk: lines(
    sources.fk,
    83,
    83,
    "ALTER TABLE shop_manager.profiles ADD CONSTRAINT profiles_user_id_fkey",
    "1ae891be95b84c0ddb368d5f6aef72319fed08245b3a7f983bd6d932e4fe4a2f",
  ),
  roleAuthFk: lines(
    sources.fk,
    93,
    93,
    "ALTER TABLE shop_manager.user_roles ADD CONSTRAINT user_roles_user_id_fkey",
    "5de96d8ae596502a129a6615d02962a946ad87b3f3c0e774d5f7cbf0c3a3e445",
  ),
  link: lines(
    sources.parts,
    355,
    359,
    "ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id)",
    "85756a93c1106bacab73e85d91ec8f0cec870c56c08b2111c09fcb1dd392b821",
  ),
  unique: lines(
    sources.bridge,
    2,
    5,
    "CREATE UNIQUE INDEX IF NOT EXISTS shops_one_per_business",
    "7bc721ed361a170d3c3fe6db0c5d3ef052718fbea994c8cb99c2f270063dfdc0",
  ),
  enum: lines(
    sources.enum,
    9,
    9,
    "CREATE TYPE shop_manager.app_role AS ENUM",
    "d7d828bdb7d7d7b9229f26ab537675b56f6b8f12f047fc670a54c290496f7e8e",
  ),
  roles: lines(
    sources.roles,
    14,
    18,
    "CREATE TABLE IF NOT EXISTS shop_manager.roles (",
    "c586077e0711ef753eb5031deb08551a6f942183c4496b15ade9c1954627b1be",
  ),
};
const functions = {
  owner: fn(
    sources.roster,
    "public.is_business_owner",
    "ee45fa3776435d09c53ebb6813a8f996ea88d81ddb9cf7ed382a05f29505d3e3",
  ),
  member: fn(
    sources.roster,
    "public.is_business_member",
    "3506596bd8d29e279220e91a6240ff20a8e3c216501a8a255ee4b15e4770dadd",
  ),
  manager: fn(
    sources.latest,
    "public.has_business_role",
    "e4c225778fec745ed02225d4f9bafa1d2854ecd2a4da554f4ca00383a3ee0f37",
  ),
  timestamp: fn(
    sources.timestamp,
    "public.set_updated_at",
    "30e5b93643627357ee83766d73a146613ede34734839f7072d0d7817d50031cb",
  ),
  ensure: fn(
    sources.team,
    "public.ensure_business_team_thread",
    "1d877294aa6f87af8375926bb0d2a0297fb28502153e75f427aad8a6c21230b3",
  ),
  chat: fn(
    sources.team,
    "public.trg_staff_sync_team_thread",
    "277e157ff7821eab043c1e690903ffe83d274343d35cb80e5ab4d212a56d1e49",
  ),
  nativeMember: fn(
    sources.latest,
    "shop_manager.sync_business_staff_member",
    "73562fb19efda957ba6fd0574797a70ecf1b8281ed6cde15020d0622210c45d5",
  ),
  nativeTrigger: fn(
    sources.boundary,
    "shop_manager.sync_business_staff_trigger",
    "e46a9d8d72bb19138e70129666388bdc4da87d34bd8fae777db00094df78f627",
  ),
};
const observed = JSON.parse(
  read(
    "docs/evidence/native-staff-trigger-catalog-2026-10-15.json",
    "5c10e2399f1bbfe4ba16f1b2cf434fd4d9cbba5e72e18185e748760e16eed567",
  ),
);
const options = { concurrency: false, timeout: 30_000 };
const id = {
  actor: "00000000-0000-4000-8000-000000000001",
  ownerA: "00000000-0000-4000-8000-000000000002",
  ownerB: "00000000-0000-4000-8000-000000000003",
  stranger: "00000000-0000-4000-8000-000000000004",
  businessA: "10000000-0000-4000-8000-000000000001",
  businessB: "10000000-0000-4000-8000-000000000002",
  shopA: "20000000-0000-4000-8000-000000000001",
  shopB: "20000000-0000-4000-8000-000000000002",
  staffA: "30000000-0000-4000-8000-000000000001",
  staffB: "30000000-0000-4000-8000-000000000002",
  legacy: "40000000-0000-4000-8000-000000000001",
  threadA: "50000000-0000-4000-8000-000000000001",
  threadB: "50000000-0000-4000-8000-000000000002",
};
const relationNames = [
  "auth.users",
  "public.businesses",
  "public.profiles",
  "public.business_staff",
  "public.chat_threads",
  "public.chat_thread_members",
  "shop_manager.profiles",
  "shop_manager.shops",
  "shop_manager.roles",
  "shop_manager.user_roles",
  "shop_manager.employee_work_locations",
  "shop_manager.employee_shifts",
  "shop_manager.cash_registers",
  "shop_manager.register_sessions",
];
// Deliberately synthetic platform/public support, not native source schema parity.
const support = `
  SET statement_timeout='3000ms'; SET lock_timeout='1000ms'; SET search_path=public;
  CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  CREATE SCHEMA auth; CREATE SCHEMA shop_manager;
  CREATE FUNCTION auth.uid() RETURNS pg_catalog.uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::pg_catalog.uuid
  $$;
  CREATE TABLE auth.users(id uuid PRIMARY KEY,email text NOT NULL);
  CREATE TABLE public.businesses(id uuid PRIMARY KEY,owner_id uuid NOT NULL,
    name text NOT NULL,street_address text,phone text,email text,city text,type_slug text);
  CREATE TABLE public.profiles(id uuid PRIMARY KEY,first_name text,last_name text);
  GRANT USAGE ON SCHEMA public,auth,shop_manager TO anon,authenticated,service_role;
`;

async function withFixture(
  run,
  {
    membership = "active",
    owner = false,
    legacy = false,
    secondRoster = false,
    nativeShop = id.shopA,
  } = {},
) {
  const db = new PGlite("memory://");
  const user = owner ? id.ownerA : id.actor;
  const profile = legacy ? id.legacy : user;
  try {
    await db.exec(support);
    for (const sql of [
      ddl.staffEnum,
      ddl.assistant,
      ddl.roster,
      ddl.enum,
      ddl.profiles,
      ddl.shops,
      ddl.userRoles,
      ddl.roles,
      ddl.authFk,
      ddl.roleAuthFk,
      ddl.link,
      ddl.unique,
      ddl.chat,
      ddl.chatScope,
      ddl.locations,
      ddl.defaultLocation,
      ddl.shifts,
      ddl.registers,
      ddl.sessions,
      functions.owner,
      functions.member,
      functions.manager,
      ddl.policies,
      functions.timestamp,
      functions.ensure,
      functions.chat,
      functions.nativeMember,
      functions.nativeTrigger,
    ]) {
      await db.exec(sql);
    }
    // These five dated effective function ACLs are reproduced explicitly here;
    // historical sweep/default-privilege changes are NOT replayed or inferred.
    for (const record of observed.functions) {
      const signature = record.signature.includes(".")
        ? record.signature
        : `public.${record.signature}`;
      assert.match(signature, /^(public|shop_manager)\.[a-z_]+\([a-z,]*\)$/);
      await db.exec(`REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC,anon,authenticated,service_role;
        GRANT EXECUTE ON FUNCTION ${signature} TO service_role;`);
    }
    // Source chat/roster RLS is retained. Shift RLS/SELECT reproduce only saved
    // catalog flags/ACL privilege, with NO invented actor row policy. Other
    // native RLS below is synthetic defense-in-depth, not captured policy parity.
    await db.exec(`ALTER TABLE shop_manager.employee_shifts ENABLE ROW LEVEL SECURITY;
      GRANT SELECT ON shop_manager.employee_shifts TO authenticated;
      ALTER TABLE shop_manager.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE shop_manager.user_roles ENABLE ROW LEVEL SECURITY;`);
    for (const [userId, label] of [
      [id.actor, "actor"],
      [id.ownerA, "owner-a"],
      [id.ownerB, "owner-b"],
      [id.stranger, "stranger"],
    ]) {
      await db.query("INSERT INTO auth.users VALUES($1,$2)", [userId, `${label}@example.test`]);
      await db.query("INSERT INTO public.profiles VALUES($1,$2,'Fixture')", [userId, label]);
    }
    await db.query(
      "INSERT INTO public.businesses(id,owner_id,name,type_slug) VALUES($1,$2,'Business A','repair'),($3,$4,'Business B','repair')",
      [id.businessA, id.ownerA, id.businessB, id.ownerB],
    );
    await db.query(
      "INSERT INTO shop_manager.shops(id,name,organization_id,business_id) VALUES($1,'Shop A',$2,$2),($3,'Shop B',$4,$4)",
      [id.shopA, id.businessA, id.shopB, id.businessB],
    );
    await db.exec(
      "INSERT INTO shop_manager.roles(name) VALUES('owner'),('manager'),('dispatch'),('truck_driver'),('technician'),('office_admin'),('other_staff')",
    );
    await db.query(
      "INSERT INTO shop_manager.profiles(id,user_id,email,shop_id,first_name,last_name,has_auth_account) SELECT $1,id,email,$3,'Selected','Fixture',true FROM auth.users WHERE id=$2",
      [profile, user, nativeShop],
    );
    await db.query(
      "INSERT INTO shop_manager.user_roles(user_id,role_id) SELECT $1,id FROM shop_manager.roles WHERE name=$2::shop_manager.app_role",
      [user, owner ? "owner" : "truck_driver"],
    );
    await db.query(
      "INSERT INTO public.business_staff(id,business_id,user_id,role,title,updated_at) VALUES($1,$2,$3,$4::public.business_staff_role,'Fixture title','2000-01-01Z')",
      [id.staffA, id.businessA, user, owner ? "owner" : "driver"],
    );
    if (secondRoster) {
      await db.query(
        "INSERT INTO public.business_staff(id,business_id,user_id,role) VALUES($1,$2,$3,'driver')",
        [id.staffB, id.businessB, user],
      );
    }
    // Existing teams deliberately precede enabled staff attachments. The real
    // ensure helper returns these immediately; no backfill branch is assumed.
    await db.query(
      "INSERT INTO public.chat_threads(id,title,created_by,business_id,kind) VALUES($1,'A team',$2,$3,'team'),($4,'B team',$5,$6,'team')",
      [id.threadA, id.ownerA, id.businessA, id.threadB, id.ownerB, id.businessB],
    );
    await db.query(
      "INSERT INTO public.chat_thread_members(thread_id,user_id) VALUES($1,$2),($3,$4)",
      [id.threadA, id.ownerA, id.threadB, id.ownerB],
    );
    if (membership !== null) {
      await db.query(
        "INSERT INTO public.chat_thread_members(thread_id,user_id,status) VALUES($1,$2,$3) ON CONFLICT(thread_id,user_id) DO UPDATE SET status=EXCLUDED.status",
        [id.threadA, user, membership],
      );
    }
    for (const sql of [ddl.timestampAttach, ddl.chatAttach, ddl.nativeAttach]) await db.exec(sql);
    await run(db, { user, profile });
  } finally {
    await db.close();
  }
}
async function actor(db, user, sql, parameters = []) {
  await db.exec("BEGIN; SET LOCAL ROLE authenticated;");
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [user ?? ""]);
    const result = await db.query(sql, parameters);
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
async function catalog(db) {
  const out = {};
  for (const [key, sql] of Object.entries({
    tables: `SELECT n.nspname,c.relname,pg_get_userbyid(c.relowner) owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('auth','public','shop_manager') AND c.relkind IN ('r','S') ORDER BY 1,2`,
    columns: `SELECT n.nspname,c.relname,a.attname,a.attnotnull,format_type(a.atttypid,a.atttypmod) type,pg_get_expr(d.adbin,d.adrelid) default_expr FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname IN ('auth','public','shop_manager') AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2,a.attnum`,
    constraints: `SELECT n.nspname,c.relname,k.conname,k.contype,k.convalidated,pg_get_constraintdef(k.oid) definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('auth','public','shop_manager') ORDER BY 1,2,3`,
    indexes: `SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ('auth','public','shop_manager') ORDER BY 1,2,3`,
    triggers: `SELECT n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('auth','public','shop_manager') AND NOT t.tgisinternal ORDER BY 1,2,3`,
    policies: `SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('auth','public','shop_manager') ORDER BY 1,2,3`,
    functions: `SELECT n.nspname,p.proname,p.oid::regprocedure::text signature,md5(pg_get_functiondef(p.oid)) definition_md5,p.prosecdef,p.proconfig,p.proacl::text acl,pg_get_userbyid(p.proowner) owner FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('auth','public','shop_manager') AND p.prokind='f' ORDER BY 1,2,3`,
    roles: `SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolbypassrls FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role') ORDER BY 1`,
    schemas: `SELECT nspname,nspacl::text acl,pg_get_userbyid(nspowner) owner FROM pg_namespace WHERE nspname IN ('auth','public','shop_manager') ORDER BY 1`,
    memberships: `SELECT roleid::regrole::text role,member::regrole::text member,admin_option FROM pg_auth_members ORDER BY 1,2`,
  }))
    out[key] = (await db.query(sql)).rows;
  return out;
}
async function data(db) {
  const out = {};
  for (const name of relationNames)
    out[name] = (
      await db.query(`SELECT to_jsonb(t) row FROM ${name} t ORDER BY to_jsonb(t)::text`)
    ).rows;
  return out;
}
async function snapshot(db) {
  return { catalog: await catalog(db), data: await data(db) };
}
async function target(db) {
  return (await db.query("SELECT * FROM public.business_staff WHERE id=$1", [id.staffA])).rows[0];
}
async function binding(db, user) {
  return (
    await db.query("SELECT id,user_id,shop_id FROM shop_manager.profiles WHERE user_id=$1", [user])
  ).rows;
}
async function roles(db, user) {
  return (
    await db.query(
      "SELECT r.name::text name FROM shop_manager.user_roles ur JOIN shop_manager.roles r ON r.id=ur.role_id WHERE ur.user_id=$1 ORDER BY 1",
      [user],
    )
  ).rows.map((r) => r.name);
}
async function membership(db, thread, user) {
  return (
    await db.query(
      "SELECT status FROM public.chat_thread_members WHERE thread_id=$1 AND user_id=$2",
      [thread, user],
    )
  ).rows.map((r) => r.status);
}
async function seedSession(db, user, profile, shop, status = "on_shift") {
  const shift = (
    await db.query(
      "INSERT INTO shop_manager.employee_shifts(shop_id,profile_id,user_id,status,clocked_in_at,clocked_out_at) VALUES($1,$2,$3,$4,'2000-01-01Z',CASE WHEN $4='completed' THEN '2000-01-02Z'::timestamptz ELSE NULL END) RETURNING id",
      [shop, profile, user, status],
    )
  ).rows[0].id;
  const register = (
    await db.query(
      "INSERT INTO shop_manager.cash_registers(shop_id,name) VALUES($1,'Fixture register') RETURNING id",
      [shop],
    )
  ).rows[0].id;
  const session = (
    await db.query(
      "INSERT INTO shop_manager.register_sessions(register_id,shop_id,shift_id,opened_by_profile_id,opened_by_user_id,expected_cash) VALUES($1,$2,$3,$4,$5,12.50) RETURNING id",
      [register, shop, shift, profile, user],
    )
  ).rows[0].id;
  return { shift, register, session };
}
const hasCode = (code, constraint) => (error) =>
  error.code === code && (!constraint || error.constraint === constraint);

test(
  "whole sources, unique complete selections and dated evidence stay fail-closed",
  options,
  () => {
    assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
    assert.equal(observed.mode, "read-only-catalog");
    assert.match(
      observed.scope,
      /Four selected staff\/chat\/shift table catalog records plus five selected function/,
    );
    assert.equal(observed.tables.length, 4);
    assert.equal(observed.functions.length, 5);
    assert.equal(Object.keys(sources).length, 14);
    for (const sql of Object.values(functions)) assert.match(sql, /^CREATE OR REPLACE FUNCTION /);
    assert.throws(
      () => pin(`${sources.roster}\n`, sha(sources.roster), "tamper"),
      /LF source drift/,
    );
    assert.throws(
      () =>
        fn(
          functions.ensure + "\n" + functions.ensure,
          "public.ensure_business_team_thread",
          sha(functions.ensure),
        ),
      /one complete definition/,
    );
    assert.throws(
      () => fn("", "public.ensure_business_team_thread", sha(functions.ensure)),
      /one complete definition/,
    );
    assert.equal(sha(sources.team.replaceAll("\n", "\r\n")), sha(sources.team));
    assert.match(ddl.shifts, /'completed','manager_closed'/);
    assert.doesNotMatch(ddl.shifts, /'clocked_out'/);
    assert.match(ddl.chat, /'invited','active','left'/);
    assert.doesNotMatch(ddl.chat, /'inactive'/);
    assert.match(functions.chat, /SET status = 'inactive'/);
    assert.match(functions.nativeMember, /SET status='clocked_out'/);
    assert.doesNotMatch(ddl.profiles, /REFERENCES/);
    assert.match(functions.ensure, /IF _thread_id IS NOT NULL THEN RETURN _thread_id; END IF/);
  },
);

test(
  "selected catalog correspondence, real actor and denied direct EXECUTE coexist with enabled triggers",
  options,
  async (t) => {
    await withFixture(async (db) => {
      const version = (await db.query("SHOW server_version")).rows[0].server_version;
      t.diagnostic(
        `Memory engine PostgreSQL ${version}; NOT NULL catalog representation is version-specific.`,
      );
      assert.match(version, /^18\./);
      for (const record of observed.functions) {
        const signature = record.signature.includes(".")
          ? record.signature
          : `public.${record.signature}`;
        const actual = (
          await db.query(
            `SELECT pg_get_userbyid(p.proowner) owner,l.lanname language,p.prosecdef security_definer,p.provolatile volatility,p.proconfig config,p.proacl::text acl,md5(pg_get_functiondef(p.oid)) definition_md5,md5(replace(p.prosrc,chr(13),'')) body_md5_lf,has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,has_function_privilege('service_role',p.oid,'EXECUTE') service_execute FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=$1::regprocedure`,
            [signature],
          )
        ).rows[0];
        const { observed_at_utc, signature: savedSignature, ...expected } = record;
        assert.match(observed_at_utc, /^2026-10-14 22:28:36\./);
        assert.ok(savedSignature);
        assert.deepEqual(actual, expected);
      }
      const before = await snapshot(db);
      for (const expression of [
        "public.ensure_business_team_thread(NULL::uuid)",
        "public.set_updated_at()",
        "public.trg_staff_sync_team_thread()",
        "shop_manager.sync_business_staff_trigger()",
        "shop_manager.sync_business_staff_member(NULL::uuid,NULL::uuid,false,''::text,NULL::text)",
      ]) {
        await assert.rejects(actor(db, id.actor, `SELECT ${expression}`), hasCode("42501"));
      }
      await assert.rejects(
        actor(db, id.actor, "UPDATE shop_manager.profiles SET shop_id=NULL"),
        hasCode("42501"),
      );
      const role = (
        await actor(
          db,
          id.actor,
          "SELECT current_user name,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
        )
      ).rows[0];
      assert.deepEqual(role, { name: "authenticated", rolsuper: false, rolbypassrls: false });
      assert.deepEqual(await snapshot(db), before);
      const current = await catalog(db);
      const staffTriggers = current.triggers
        .filter((r) => r.relname === "business_staff")
        .map(({ tgname, tgenabled, definition }) => ({
          name: tgname,
          enabled: tgenabled,
          definition,
        }));
      const expectedTriggers = observed.tables
        .find((r) => r.table === "business_staff")
        .triggers.filter((r) => !r.internal)
        .map(({ name, enabled, definition }) => ({ name, enabled, definition }));
      assert.deepEqual(staffTriggers, expectedTriggers);
      // PG18 emits contype=n for NOT NULL in addition to attnotnull. Exclude ONLY
      // this version representation after separately checking every selected NN
      // column; all other selected PK/unique/CHECK/FK definitions compare exactly.
      const notNull = {
        business_staff: [
          "id",
          "business_id",
          "user_id",
          "role",
          "duties",
          "active",
          "on_shift",
          "created_at",
          "updated_at",
        ],
        chat_threads: ["id", "title", "created_by", "created_at", "updated_at", "kind"],
        chat_thread_members: ["thread_id", "user_id", "status", "joined_at"],
        employee_shifts: [
          "id",
          "shop_id",
          "profile_id",
          "user_id",
          "status",
          "clocked_in_at",
          "created_at",
          "updated_at",
        ],
      };
      for (const record of observed.tables) {
        const actualTable = current.tables.find(
          (r) => r.nspname === record.schema && r.relname === record.table,
        );
        assert.equal(actualTable.owner, record.owner);
        assert.equal(actualTable.relrowsecurity, record.rls);
        assert.equal(actualTable.relforcerowsecurity, record.force_rls);
        assert.deepEqual(
          current.columns
            .filter(
              (r) => r.nspname === record.schema && r.relname === record.table && r.attnotnull,
            )
            .map((r) => r.attname)
            .sort(),
          notNull[record.table].sort(),
        );
        const constraints = current.constraints
          .filter(
            (r) => r.nspname === record.schema && r.relname === record.table && r.contype !== "n",
          )
          .map(({ conname, contype, convalidated, definition }) => ({
            name: conname,
            type: contype,
            validated: convalidated,
            definition,
          }));
        assert.deepEqual(constraints, record.constraints);
      }
      const profileFks = current.constraints.filter(
        (r) => r.nspname === "shop_manager" && r.relname === "profiles" && r.contype === "f",
      );
      assert.deepEqual(
        profileFks.map((r) => r.conname),
        ["profiles_user_id_fkey"],
      );
      assert.ok(profileFks.every((r) => r.convalidated));
      assert.ok(
        current.constraints.some((r) => r.conname === "user_roles_user_id_fkey" && r.convalidated),
      );
      assert.equal(current.policies.filter((r) => r.tablename === "business_staff").length, 4);
      assert.equal(
        current.policies.filter((r) => r.tablename.startsWith("chat_")).length,
        0,
        "no invented/current chat-policy reachability proof",
      );
      assert.equal(
        (await db.query("SELECT count(*)::integer n FROM shop_manager.employee_work_locations"))
          .rows[0].n,
        2,
        "actual shops INSERT writer ran; attachment is retained-source-only, not captured live",
      );
    });
  },
);

test(
  "critical unchanged CHECK, FK, team uniqueness and open-session/open-shift constraints are enforced",
  options,
  async () => {
    await withFixture(async (db, { user, profile }) => {
      const seeded = await seedSession(db, user, profile, id.shopA);
      const before = await snapshot(db);
      const failures = [
        [
          "UPDATE public.chat_thread_members SET status='inactive' WHERE user_id=$1",
          [user],
          "23514",
          "chat_thread_members_status_check",
        ],
        [
          "UPDATE shop_manager.employee_shifts SET status='clocked_out' WHERE id=$1",
          [seeded.shift],
          "23514",
          "employee_shifts_status_check",
        ],
        [
          "UPDATE shop_manager.employee_shifts SET clocked_out_at='1999-01-01Z' WHERE id=$1",
          [seeded.shift],
          "23514",
          "employee_shifts_check",
        ],
        [
          "INSERT INTO shop_manager.employee_shifts(shop_id,profile_id,user_id) VALUES($1,$2,$3)",
          [id.shopB, profile, user],
          "23505",
          "employee_shifts_one_open_per_user",
        ],
        [
          "INSERT INTO shop_manager.register_sessions(register_id,shop_id,shift_id,opened_by_profile_id,opened_by_user_id) VALUES($1,$2,$3,$4,$5)",
          [seeded.register, id.shopA, seeded.shift, profile, user],
          "23505",
          "register_one_open",
        ],
        [
          "UPDATE shop_manager.register_sessions SET status='inactive' WHERE id=$1",
          [seeded.session],
          "23514",
          "register_sessions_status_check",
        ],
        [
          "UPDATE shop_manager.register_sessions SET shift_id=$1 WHERE id=$2",
          [id.stranger, seeded.session],
          "23503",
          "register_sessions_shift_id_fkey",
        ],
        [
          "UPDATE shop_manager.employee_shifts SET profile_id=$1 WHERE id=$2",
          [id.stranger, seeded.shift],
          "23503",
          "employee_shifts_profile_id_fkey",
        ],
        [
          "INSERT INTO public.chat_threads(title,created_by,business_id,kind) VALUES('duplicate',$1,$2,'team')",
          [id.ownerA, id.businessA],
          "23505",
          "chat_threads_business_team_unique",
        ],
        [
          "UPDATE shop_manager.profiles SET user_id=$1 WHERE id=$2",
          [id.legacy, profile],
          "23503",
          "profiles_user_id_fkey",
        ],
      ];
      for (const [sql, params, code, constraint] of failures)
        await assert.rejects(db.query(sql, params), hasCode(code, constraint));
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "self on_shift and no-op UPDATE reactivate left membership without native remapping; targeted role no-op does remap",
  options,
  async () => {
    await withFixture(
      async (db, { user }) => {
        const originalCatalog = await catalog(db);
        const originalBinding = await binding(db, user);
        const originalRoles = await roles(db, user);
        const old = await target(db);
        const result = await actor(
          db,
          user,
          "UPDATE public.business_staff SET on_shift=on_shift WHERE id=$1 RETURNING id,on_shift",
          [id.staffA],
        );
        assert.equal(result.rows.length, 1);
        assert.equal(result.rows[0].on_shift, false);
        assert.deepEqual(await membership(db, id.threadA, user), ["active"]);
        assert.ok((await target(db)).updated_at > old.updated_at);
        assert.deepEqual(await binding(db, user), originalBinding);
        assert.deepEqual(await roles(db, user), originalRoles);
        await actor(
          db,
          user,
          "UPDATE public.business_staff SET on_shift=true WHERE id=$1 RETURNING id",
          [id.staffA],
        );
        assert.equal((await target(db)).on_shift, true);
        assert.deepEqual(await binding(db, user), originalBinding);
        // Privileged setup creates a deliberately different single native binding.
        // The subsequent real actor's role-targeted no-op invokes UPDATE OF bridge.
        await db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE user_id=$2", [
          id.shopB,
          user,
        ]);
        await actor(
          db,
          user,
          "UPDATE public.business_staff SET role=role WHERE id=$1 RETURNING id",
          [id.staffA],
        );
        assert.equal((await binding(db, user))[0].shop_id, id.shopA);
        assert.deepEqual(await roles(db, user), ["truck_driver"]);
        assert.deepEqual(await catalog(db), originalCatalog);
      },
      { membership: "left", legacy: true },
    );
  },
);

test(
  "self business_id-only retarget leaves old chat/native state; unrelated actor affects zero rows",
  options,
  async () => {
    await withFixture(
      async (db, { user }) => {
        const before = await snapshot(db);
        const denied = await actor(
          db,
          id.stranger,
          "UPDATE public.business_staff SET business_id=$1 WHERE id=$2 RETURNING id",
          [id.businessB, id.staffA],
        );
        assert.deepEqual(denied.rows, []);
        assert.deepEqual(await snapshot(db), before);
        const originalBinding = await binding(db, user);
        const originalRoles = await roles(db, user);
        const result = await actor(
          db,
          user,
          "UPDATE public.business_staff SET business_id=$1 WHERE id=$2 RETURNING business_id",
          [id.businessB, id.staffA],
        );
        assert.deepEqual(result.rows, [{ business_id: id.businessB }]);
        assert.deepEqual(await membership(db, id.threadA, user), ["active"]);
        assert.deepEqual(await membership(db, id.threadB, user), ["active"]);
        assert.deepEqual(await binding(db, user), originalBinding);
        assert.deepEqual(await roles(db, user), originalRoles);
        assert.deepEqual(await catalog(db), before.catalog);
      },
      { legacy: true },
    );
  },
);

test(
  "existing member deactivation rejects actual chat CHECK and explicitly rolls back all rows, timestamp and ACLs",
  options,
  async () => {
    await withFixture(
      async (db, { user, profile }) => {
        await seedSession(db, user, profile, id.shopA);
        const before = await snapshot(db);
        await assert.rejects(
          actor(
            db,
            id.ownerA,
            "UPDATE public.business_staff SET active=false WHERE id=$1 RETURNING id",
            [id.staffA],
          ),
          hasCode("23514", "chat_thread_members_status_check"),
        );
        assert.deepEqual(
          await snapshot(db),
          before,
          "explicit ROLLBACK restores roster/timestamp and preexisting affected state; both AFTER attachments retained",
        );
        assert.equal((await target(db)).active, true);
      },
      { legacy: true },
    );
  },
);

test(
  "absent chat member reaches open-shift CHECK failure and rolls back earlier register cleanup",
  options,
  async () => {
    await withFixture(
      async (db, { user, profile }) => {
        const seeded = await seedSession(db, user, profile, id.shopA);
        assert.deepEqual(await membership(db, id.threadA, user), []);
        const before = await snapshot(db);
        await assert.rejects(
          actor(
            db,
            id.ownerA,
            "UPDATE public.business_staff SET active=false WHERE id=$1 RETURNING id",
            [id.staffA],
          ),
          hasCode("23514", "employee_shifts_status_check"),
        );
        assert.deepEqual(await snapshot(db), before);
        assert.deepEqual(
          (
            await db.query(
              "SELECT status,closed_at,counted_cash,closing_note FROM shop_manager.register_sessions WHERE id=$1",
              [seeded.session],
            )
          ).rows,
          [{ status: "open", closed_at: null, counted_cash: null, closing_note: null }],
        );
        assert.equal((await target(db)).active, true);
      },
      { membership: null, legacy: true },
    );
  },
);

test(
  "actual owner DELETE removes chat member while native owner provisioning preserves legacy profile and role",
  options,
  async () => {
    await withFixture(
      async (db, { user, profile }) => {
        const beforeCatalog = await catalog(db);
        assert.deepEqual(await membership(db, id.threadA, user), ["active"]);
        const result = await actor(
          db,
          user,
          "DELETE FROM public.business_staff WHERE id=$1 RETURNING id",
          [id.staffA],
        );
        assert.deepEqual(result.rows, [{ id: id.staffA }]);
        assert.equal(await target(db), undefined);
        assert.deepEqual(await membership(db, id.threadA, user), []);
        assert.deepEqual(await binding(db, user), [
          { id: profile, user_id: user, shop_id: id.shopA },
        ]);
        assert.notEqual(profile, user);
        assert.deepEqual(await roles(db, user), ["owner"]);
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::integer n FROM shop_manager.cash_registers WHERE shop_id=$1",
              [id.shopA],
            )
          ).rows[0].n,
          1,
        );
        assert.deepEqual(await catalog(db), beforeCatalog);
      },
      { owner: true, legacy: true },
    );
  },
);

test(
  "multi-roster no-open-shift success closes user-wide sessions but keeps other-shop legacy binding and other_staff",
  options,
  async () => {
    await withFixture(
      async (db, { user, profile }) => {
        // Deliberately stale but physically permitted: open sessions reference
        // completed shifts in distinct registers/shops. No dual open shifts exist.
        const a = await seedSession(db, user, profile, id.shopA, "completed");
        const b = await seedSession(db, user, profile, id.shopB, "completed");
        await db.query(
          "INSERT INTO shop_manager.user_roles(user_id,role_id) SELECT $1,id FROM shop_manager.roles WHERE name='other_staff'",
          [user],
        );
        assert.deepEqual(await membership(db, id.threadA, user), []);
        const before = await snapshot(db);
        const result = await actor(
          db,
          id.ownerA,
          "UPDATE public.business_staff SET active=false WHERE id=$1 RETURNING active",
          [id.staffA],
        );
        assert.deepEqual(result.rows, [{ active: false }]);
        assert.deepEqual(await binding(db, user), [
          { id: profile, user_id: user, shop_id: id.shopB },
        ]);
        assert.notEqual(profile, user);
        assert.deepEqual(
          await roles(db, user),
          ["other_staff"],
          "inactive role list omits other_staff while active remapping includes it",
        );
        assert.deepEqual(
          (await db.query("SELECT active FROM public.business_staff WHERE id=$1", [id.staffB]))
            .rows,
          [{ active: true }],
        );
        assert.deepEqual(await membership(db, id.threadA, user), []);
        const sessions = (
          await db.query(
            "SELECT id,shop_id,status,counted_cash,expected_cash,variance,closing_note,closed_at IS NOT NULL closed FROM shop_manager.register_sessions ORDER BY shop_id",
          )
        ).rows;
        assert.deepEqual(sessions.map((r) => r.id).sort(), [a.session, b.session].sort());
        for (const row of sessions) {
          assert.equal(row.status, "manager_closed");
          assert.equal(row.counted_cash, row.expected_cash);
          assert.equal(Number(row.variance), 0);
          assert.equal(row.closing_note, "Employee access deactivated");
          assert.equal(row.closed, true);
        }
        assert.deepEqual(
          (await data(db))["shop_manager.employee_shifts"],
          before.data["shop_manager.employee_shifts"],
        );
        assert.deepEqual(await catalog(db), before.catalog);
      },
      { membership: null, legacy: true, secondRoster: true, nativeShop: id.shopB },
    );
  },
);
