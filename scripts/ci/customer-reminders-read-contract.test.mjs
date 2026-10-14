// OFFLINE candidate/recovery characterization only. Selected retained reminder
// SQL, native customer/profile policies and current-shop helper execute unchanged.
// Supporting table shapes/auth.uid/session claims are minimal synthetic controls,
// not full native closure, trusted membership, JWT/HTTP or production acceptance.
// All writes below are disposable fixture setup/drift probes, never live repair.
// STABLE observes one statement; between-statement tests are not concurrency proof.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../../", import.meta.url);
const sha = (raw) => createHash("sha256").update(raw.replace(/\r\n/g, "\n")).digest("hex");
const md5 = (raw) => createHash("md5").update(raw.replace(/\r/g, "")).digest("hex");
function pinned(path, expected) {
  const raw = fs.readFileSync(new URL(path, root), "utf8");
  assert.ok(raw.length > 0 && raw.length < 512 * 1024, `${path}: bounded retained input`);
  assert.equal(sha(raw), expected, `${path}: LF pin drift`);
  return raw.replace(/\r\n/g, "\n");
}
function section(raw, pattern) {
  assert.ok(typeof raw === "string" && raw.length > 0 && raw.length < 512 * 1024);
  const matches = [...raw.matchAll(pattern)];
  assert.equal(matches.length, 1, "one exact unchanged selected section");
  const boundary = matches[0][0].split("\n").slice(0, 4).join("\n");
  assert.equal(
    raw.split(boundary).length,
    2,
    "one selected declaration boundary, including suffixes",
  );
  return matches[0][0];
}
const candidate = pinned(
  "supabase/migrations/20261014214406_customer_reminders_invoker_read.sql",
  "c65593b7a93048b3801e50853ce72bac58c83d6f76a8848cedb2d7ff3adfbb5d",
);
const recovery = pinned(
  "docs/evidence/customer-reminders-drop-review.sql",
  "1408ebbb6c9c0e90dca6a41c64f3d16c177adb7ead6d62e815236edb64b324d0",
);
const reminderSource = pinned(
  "supabase/migrations/20260714034131_1bed039d-569f-4b91-8f56-bf19451a7786.sql",
  "b19993ff90b57a5adb8272b141d7bdb765f1066dca4a554ec46ab4d8cfe821c9",
);
const sweepSource = pinned(
  "supabase/migrations/20260805084402_cd07847a-26f0-4c31-a2fe-ab0088684f77.sql",
  "d987fe1e83505eb4002529a5290361fba2ff4af994938986ced9006c1502b321",
);
const resolverSource = pinned(
  "supabase/migrations/20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql",
  "30dfd8df0c3537efb5155a8891804e00444b180f55e674b56d522e473e2f4144",
);
const nativeSource = pinned(
  "supabase/migrations/20260713081838_b99aba93-f19b-4aec-b7a1-3bdb86faadc6.sql",
  "5ea2e85cf05bf006dcb684ef063f9ef15f38fdfcc9dccd2c050f4c0a5a115647",
);
const selected = [
  [
    "reminders",
    reminderSource,
    /^CREATE TABLE IF NOT EXISTS shop_manager\.customer_reminders \([\s\S]*$/gm,
    "458cecadc4c851ddcff20b16b7662b9a543ecc28c78668088ad031a55c68fff7",
  ],
  [
    "rewrite",
    sweepSource,
    /^-- 4\. Replace always-true shop_manager policies with shop-scoped ones[\s\S]*?END \$\$;/gm,
    "6e2959313b8a75248d90b0b74f9f988015c48410801d4d32f61b24916ae260ef",
  ],
  [
    "currentShop",
    resolverSource,
    /^CREATE OR REPLACE FUNCTION shop_manager\.get_current_user_shop_id\(\)[\s\S]*?\$\$;/gm,
    "96d278351d5b335519711b97e89dd5b52052886929fbce820951414612cd7845",
  ],
  [
    "profileSelf",
    nativeSource,
    /^CREATE POLICY "sm_profiles_select_self"[\s\S]*?;/gm,
    "03566d3ad99f23abfc83b9ec238cdd08f3c4ee1dfda4ce9dd208b0c5fe4ed84e",
  ],
  [
    "customerSelf",
    nativeSource,
    /^CREATE POLICY "sm_customers_self_select"[\s\S]*?;/gm,
    "8aefdf4701b6055b5278166928342b46c84debbf3085b34be29e158ee28f0453",
  ],
  [
    "customerShop",
    nativeSource,
    /^DO \$\$\nDECLARE t text;\nBEGIN\n  FOR t IN SELECT unnest\(ARRAY\['customers','inventory_items','work_orders'\]\) LOOP[\s\S]*?END\$\$;/gm,
    "f9db6a21b1b6c181e313e7e20cd7d9f1d5d030070c4ef2230b79a5c43284b34c",
  ],
].map(([name, source, pattern, expected]) => {
  const sql = section(source, pattern);
  assert.equal(sha(sql), expected, `${name}: extracted source drift`);
  return { name, source, pattern, sql };
});
const sql = Object.fromEntries(selected.map((part) => [part.name, part.sql]));
const functionSql = section(
  candidate,
  /^CREATE FUNCTION public\.crm_customer_reminders\([\s\S]*?\$reader\$;/gm,
);
const bodyMd5 = "74e7436ee945b5db183c2dcf5be820df";
const evidence = Object.fromEntries(
  [
    [
      "parent",
      "customer-reminder-customer-scope-metadata-2026-10-15.json",
      "dc210c419872819a12b082ce688cef68e33f2e9f992e0eb183edae1561d13f87",
    ],
    [
      "integrity",
      "customer-card-integrity-metadata-2026-10-15.json",
      "e7a667979e7a3ba9ac0056370149d36fc05d1a64b4aeb630ad2bb5eff0f7d1aa",
    ],
    [
      "indexes",
      "customer-card-index-metadata-2026-10-15.json",
      "2b3fec3f37eb1b5585ec9b607181f88718cb7909fb92606c09520e4dcc8733c4",
    ],
  ].map(([name, file, expected]) => {
    const parsed = JSON.parse(pinned(`docs/evidence/${file}`, expected));
    assert.equal(parsed.projectRef, "wjxaajgvddtrxxtocxen");
    assert.equal(parsed.mode, "read-only-catalog");
    return [name, parsed];
  }),
);
const tableEvidence = evidence.integrity.tables.filter(
  (row) => row.relname === "customer_reminders",
);
assert.equal(tableEvidence.length, 1);
const observed = tableEvidence[0];
const options = { concurrency: false, timeout: 30_000 };
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const staff = uuid(1),
  otherStaff = uuid(2),
  selfCustomer = uuid(3),
  stranger = uuid(4);
const shop = uuid(101),
  otherShop = uuid(102);
const customer = uuid(201),
  sibling = uuid(202),
  otherCustomer = uuid(203),
  emptyCustomer = uuid(204);
const reminder = uuid(401),
  siblingReminder = uuid(402),
  otherReminder = uuid(403);
const signature = "public.crm_customer_reminders(pg_catalog.uuid)";
const unavailable = { available: false, customer_id: null, shop_id: null, rows: [] };

async function asActor(db, subject, run, role = "authenticated") {
  assert.ok(["authenticated", "anon", "service_role"].includes(role));
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [subject ?? ""]);
  try {
    await db.exec(`SET ROLE ${role}`);
    const actual = (
      await db.query(`SELECT current_user AS actor,session_user,auth.uid() AS subject,
      rolsuper,rolbypassrls,row_security_active('shop_manager.customers') AS customer_rls,
      row_security_active('shop_manager.customer_reminders') AS reminder_rls
      FROM pg_roles WHERE rolname=current_user`)
    ).rows[0];
    assert.deepEqual(actual, {
      actor: role,
      session_user: "postgres",
      subject: subject ?? null,
      rolsuper: false,
      rolbypassrls: role === "service_role",
      customer_rls: role !== "service_role",
      reminder_rls: role !== "service_role",
    });
    await run();
  } finally {
    await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)");
  }
}
async function read(db, id = customer) {
  return (
    await db.query("SELECT public.crm_customer_reminders($1::pg_catalog.uuid) AS result", [id])
  ).rows[0].result;
}
async function targetState(db) {
  return (
    (
      await db.query(`SELECT p.oid::regprocedure::text AS signature,pg_get_userbyid(p.proowner) AS owner,
    l.lanname AS language,p.prokind::text,p.prosecdef,p.provolatile::text,p.proisstrict,p.proleakproof,
    p.proparallel::text,p.prorettype::regtype::text AS return_type,p.proretset,p.pronargdefaults,
    p.provariadic::int,p.proargnames,p.proargmodes,p.proconfig,p.proacl::text AS acl,
    md5(pg_get_functiondef(p.oid)) AS definition_md5,md5(replace(p.prosrc,chr(13),'')) AS body_md5,
    has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
    has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
    has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute,
    has_function_privilege('postgres',p.oid,'EXECUTE') AS owner_execute
    FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
    WHERE p.oid=to_regprocedure('${signature}')`)
    ).rows[0] ?? null
  );
}
async function sourceSnapshot(db) {
  await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)");
  const catalog = (
    await db.query(`SELECT
    (SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'owner',c.relowner,
      'acl',c.relacl::text,'rls',c.relrowsecurity,'force',c.relforcerowsecurity) ORDER BY c.oid)
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='shop_manager' AND c.relkind='r') AS tables,
    (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.attrelid,a.attnum) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='shop_manager') AS attributes,
    (SELECT jsonb_agg(jsonb_build_object('table',d.adrelid,'column',d.adnum,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY d.adrelid,d.adnum)
      FROM pg_attrdef d JOIN pg_class c ON c.oid=d.adrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='shop_manager') AS defaults,
    (SELECT jsonb_agg(jsonb_build_object('table',conrelid,'name',conname,'type',contype,'validated',convalidated,'definition',pg_get_constraintdef(oid)) ORDER BY conrelid,conname)
      FROM pg_constraint WHERE connamespace='shop_manager'::regnamespace) AS constraints,
    (SELECT jsonb_agg(jsonb_build_object('table',i.indrelid,'valid',i.indisvalid,'ready',i.indisready,'definition',pg_get_indexdef(i.indexrelid)) ORDER BY i.indexrelid)
      FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='shop_manager') AS indexes,
    (SELECT jsonb_agg(jsonb_build_object('table',t.tgrelid,'name',t.tgname,'enabled',t.tgenabled,'internal',t.tgisinternal,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgrelid,t.tgname)
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='shop_manager') AS triggers,
    (SELECT jsonb_agg(jsonb_build_object('table',polrelid,'name',polname,'roles',polroles::text,'using',pg_get_expr(polqual,polrelid),'check',pg_get_expr(polwithcheck,polrelid),'command',polcmd,'permissive',polpermissive) ORDER BY polrelid,polname) FROM pg_policy) AS policies,
    (SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',p.proowner,'definition',md5(pg_get_functiondef(p.oid)),'acl',p.proacl::text) ORDER BY p.oid)
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('auth','shop_manager','public')
      AND NOT (n.nspname='public' AND p.proname='crm_customer_reminders' AND p.pronargs=1 AND p.proargtypes[0]='pg_catalog.uuid'::pg_catalog.regtype)) AS functions,
    (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.oid) FROM pg_default_acl d) AS default_acl,
    (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.roleid,m.member,m.grantor) FROM pg_auth_members m) AS memberships,
    (SELECT jsonb_agg(jsonb_build_object('role',rolname,'super',rolsuper,'bypass',rolbypassrls,'inherit',rolinherit) ORDER BY rolname) FROM pg_roles) AS roles,
    to_regclass('shop_manager.expenses') AS expenses,to_regnamespace('storage') AS storage`)
  ).rows[0];
  const data = {};
  for (const table of [
    "profiles",
    "customers",
    "inventory_items",
    "work_orders",
    "customer_reminders",
  ])
    data[table] = (
      await db.query(
        `SELECT to_jsonb(t) AS row FROM shop_manager.${table} t ORDER BY to_jsonb(t)::text`,
      )
    ).rows;
  return { catalog, data };
}
async function candidateRefusal(db) {
  const before = await sourceSnapshot(db),
    target = await targetState(db);
  await assert.rejects(db.exec(candidate), { code: "55000" });
  await db.exec("ROLLBACK");
  assert.deepEqual(await sourceSnapshot(db), before);
  assert.deepEqual(await targetState(db), target);
}
async function recover(db, optin = "operator-reviewed-drop") {
  await db.exec("BEGIN");
  try {
    if (optin !== null)
      await db.query("SELECT set_config('motorsales365.customer_reminders_drop_review',$1,true)", [
        optin,
      ]);
    await db.exec(recovery);
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
async function recoveryRefusal(db, { optin = "operator-reviewed-drop", code = "55000" } = {}) {
  const before = await sourceSnapshot(db),
    target = await targetState(db);
  await assert.rejects(recover(db, optin), { code });
  assert.deepEqual(await sourceSnapshot(db), before);
  assert.deepEqual(await targetState(db), target);
}
async function withFixture(run, { apply = true } = {}) {
  const db = new PGlite("memory://");
  try {
    await db.exec(`SET statement_timeout='3000ms'; SET lock_timeout='1000ms'; SET TIME ZONE 'UTC';
      CREATE ROLE anon NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
      CREATE ROLE authenticated NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
      CREATE ROLE service_role NOLOGIN NOINHERIT NOSUPERUSER BYPASSRLS;
      CREATE ROLE fixture_owner NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
      CREATE ROLE unexpected_reader NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA shop_manager;
      CREATE FUNCTION auth.uid() RETURNS pg_catalog.uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::pg_catalog.uuid $$;
      CREATE TABLE shop_manager.profiles(id uuid PRIMARY KEY,user_id uuid,shop_id uuid);
      CREATE TABLE shop_manager.customers(id uuid PRIMARY KEY,shop_id uuid NOT NULL,user_id uuid);
      CREATE TABLE shop_manager.inventory_items(id uuid PRIMARY KEY,shop_id uuid);
      CREATE TABLE shop_manager.work_orders(id uuid PRIMARY KEY,shop_id uuid);
      ALTER TABLE shop_manager.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE shop_manager.customers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE shop_manager.inventory_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE shop_manager.work_orders ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA public,auth,shop_manager TO anon,authenticated,service_role;
      GRANT SELECT ON shop_manager.profiles,shop_manager.customers TO authenticated;`);
    await db.exec(sql.currentShop);
    // Explicit observed helper ACL, not replay of the historical privilege sweep.
    await db.exec(
      "GRANT EXECUTE ON FUNCTION shop_manager.get_current_user_shop_id() TO authenticated,service_role",
    );
    await db.exec(sql.reminders);
    await db.exec("GRANT EXECUTE ON FUNCTION shop_manager.touch_updated_at() TO service_role");
    await db.exec(sql.profileSelf);
    await db.exec(sql.customerShop);
    await db.exec(sql.customerSelf);
    await db.exec(sql.rewrite);
    await db.query("INSERT INTO shop_manager.profiles VALUES($1,$1,$2),($3,$3,$4)", [
      staff,
      shop,
      otherStaff,
      otherShop,
    ]);
    await db.query(
      "INSERT INTO shop_manager.customers VALUES($1,$2,$3),($4,$2,NULL),($5,$6,$3),($7,$2,NULL)",
      [customer, shop, selfCustomer, sibling, otherCustomer, otherShop, emptyCustomer],
    );
    for (const [id, c, s] of [
      [reminder, customer, shop],
      [siblingReminder, sibling, shop],
      [otherReminder, otherCustomer, otherShop],
    ])
      await db.query(
        `INSERT INTO shop_manager.customer_reminders
        (id,customer_id,shop_id,title,due_date,notes,created_by,assigned_to)
        VALUES($1,$2,$3,'Synthetic reminder','2026-10-15','Synthetic notes',$4,$5)`,
        [id, c, s, stranger, otherStaff],
      );
    // Common hosted defaults must be normalized only on the new function.
    await db.exec(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role",
    );
    if (apply) await db.exec(candidate);
    await run(db);
  } finally {
    await db.close();
  }
}

test(
  "pins only selected actual sources/candidate/recovery and fails extraction on missing or duplicate boundaries",
  options,
  () => {
    assert.equal(selected.length, 6);
    assert.equal(md5(functionSql.match(/AS \$reader\$([\s\S]*?)\$reader\$;/)[1]), bodyMd5);
    assert.match(candidate, new RegExp(bodyMd5));
    assert.match(recovery, new RegExp(bodyMd5));
    assert.doesNotMatch(sql.reminders, /storage\.|shop_manager\.expenses/);
    assert.doesNotMatch(sql.rewrite, /REVOKE|-- 5\.|storage\./);
    assert.doesNotMatch(
      candidate,
      /CREATE OR REPLACE|SECURITY DEFINER|CREATE TABLE|ALTER TABLE|CREATE POLICY|CASCADE/,
    );
    assert.doesNotMatch(recovery, /CASCADE|DROP TABLE|ALTER TABLE|CREATE OR REPLACE/);
    for (const part of selected) {
      assert.equal(section(part.source, part.pattern), part.sql);
      assert.throws(() => section("", part.pattern));
      assert.throws(() => section(part.source + "\n" + part.source, part.pattern));
      assert.notEqual(sha(part.sql + " "), sha(part.sql));
    }
    assert.equal((candidate.match(/LIMIT 101/g) ?? []).length, 1);
    assert.match(candidate, /WITH context AS MATERIALIZED/);
    assert.match(candidate, /r\.customer_id = x\.customer_id AND r\.shop_id = x\.shop_id/);
    assert.match(candidate, /ORDER BY r\.due_date ASC NULLS LAST, r\.id ASC/g);
  },
);

test(
  "matches selected reminder catalog observations with exact attnotnull then PG18-only constraint representation exclusion",
  options,
  async () => {
    await withFixture(async (db) => {
      assert.equal(
        JSON.parse(fs.readFileSync(new URL("package.json", root), "utf8")).devDependencies[
          "@electric-sql/pglite"
        ],
        "0.5.9",
      );
      const engine = (
        await db.query(
          "SELECT version() AS version,current_setting('server_version_num') AS version_num",
        )
      ).rows[0];
      assert.match(engine.version, /PGlite 0\.5\.9/);
      assert.match(engine.version_num, /^18\d{4}$/);
      // Parent prerequisite correspondence is types/nullability only. The
      // supporting customer table is synthetic, not default/full-schema parity.
      const parent = (
        await db.query(`SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,
          a.attnotnull AS not_null FROM pg_attribute a WHERE a.attrelid='shop_manager.customers'::regclass
          AND a.attname IN ('id','shop_id') AND NOT a.attisdropped ORDER BY a.attnum`)
      ).rows;
      assert.deepEqual(
        parent,
        evidence.parent.columns.map(({ name, type, not_null }) => ({ name, type, not_null })),
      );
      const table = (
        await db.query(`SELECT pg_get_userbyid(relowner) AS owner,relrowsecurity AS rls,
      relforcerowsecurity AS force_rls,relacl::text AS acl FROM pg_class WHERE oid='shop_manager.customer_reminders'::regclass`)
      ).rows[0];
      assert.deepEqual(table, {
        owner: observed.owner,
        rls: observed.rls,
        force_rls: observed.force_rls,
        acl: observed.acl,
      });
      const columns = (
        await db.query(`SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,
      a.attnotnull AS not_null,pg_get_expr(d.adbin,d.adrelid) AS column_default FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid='shop_manager.customer_reminders'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`)
      ).rows;
      assert.deepEqual(
        columns,
        evidence.integrity.columns
          .filter((row) => row.relname === "customer_reminders")
          .map(({ observed_at_utc: _time, relname: _table, ...row }) => row),
      );
      // Only the PG18 NOT NULL pg_constraint representation differs. Its actual
      // semantics remain covered by every exact column attnotnull assertion above.
      assert.deepEqual(
        (
          await db.query(`SELECT conname AS name,contype::text AS type,convalidated AS validated,
      pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='shop_manager.customer_reminders'::regclass AND contype<>'n' ORDER BY conname`)
        ).rows,
        observed.constraints,
      );
      assert.deepEqual(
        (
          await db.query(`SELECT polname AS name,pg_get_expr(polwithcheck,polrelid) AS check,
      ARRAY(SELECT rolname::text FROM pg_roles WHERE oid=ANY(polroles) ORDER BY rolname) AS roles,
      pg_get_expr(polqual,polrelid) AS using,polcmd::text AS command,polpermissive AS permissive
      FROM pg_policy WHERE polrelid='shop_manager.customer_reminders'::regclass ORDER BY polname`)
        ).rows,
        observed.policies,
      );
      assert.deepEqual(
        (
          await db.query(`SELECT tgname AS name,tgenabled::text AS enabled,tgisinternal AS internal,
      pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='shop_manager.customer_reminders'::regclass ORDER BY tgname`)
        ).rows,
        observed.triggers,
      );
      assert.deepEqual(
        (
          await db.query(`SELECT indisvalid AS valid,indisready AS ready,pg_get_indexdef(indexrelid) AS definition
      FROM pg_index WHERE indrelid='shop_manager.customer_reminders'::regclass ORDER BY indexrelid::regclass::text`)
        ).rows,
        evidence.indexes.indexes
          .filter((row) => row.table_name === "customer_reminders")
          .map(({ observed_at_utc: _time, table_name: _table, ...row }) => row),
      );
      for (const row of evidence.integrity.functions) {
        const actual = (
          await db.query(
            `SELECT pg_get_userbyid(p.proowner) AS owner,l.lanname AS language,p.prosecdef,p.provolatile,p.proconfig,p.proacl::text AS acl,
        md5(pg_get_functiondef(p.oid)) AS definition_md5,md5(replace(p.prosrc,chr(13),'')) AS body_md5,
        has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
        has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=$1::regprocedure`,
            [row.signature],
          )
        ).rows[0];
        const { observed_at_utc: _time, signature: _signature, ...expected } = row;
        assert.deepEqual(actual, expected);
      }
    });
  },
);

test(
  "unchanged candidate/read/reviewed recovery preserve all fixture source catalog/ACL/defaults/data and normalize only the new API",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const before = await sourceSnapshot(db);
        await db.exec(candidate);
        assert.deepEqual(await sourceSnapshot(db), before);
        const target = await targetState(db);
        const { definition_md5: definition, ...actual } = target;
        assert.match(definition, /^[a-f0-9]{32}$/);
        assert.deepEqual(actual, {
          signature: "crm_customer_reminders(uuid)",
          owner: "postgres",
          language: "sql",
          prokind: "f",
          prosecdef: false,
          provolatile: "s",
          proisstrict: false,
          proleakproof: false,
          proparallel: "u",
          return_type: "jsonb",
          proretset: false,
          pronargdefaults: 0,
          provariadic: 0,
          proargnames: ["_customer_id"],
          proargmodes: null,
          proconfig: ['search_path=""'],
          acl: "{postgres=X/postgres,authenticated=X/postgres}",
          body_md5: bodyMd5,
          anon_execute: false,
          authenticated_execute: true,
          service_execute: false,
          owner_execute: true,
        });
        await asActor(db, staff, async () => assert.equal((await read(db)).available, true));
        assert.deepEqual(await sourceSnapshot(db), before);
        assert.deepEqual(await targetState(db), target);
        for (const role of ["anon", "service_role"])
          await asActor(
            db,
            staff,
            async () => await assert.rejects(read(db), { code: "42501" }),
            role,
          );
        await recover(db);
        assert.equal(await targetState(db), null);
        assert.deepEqual(await sourceSnapshot(db), before);
        assert.equal(before.catalog.expenses, null);
        assert.equal(before.catalog.storage, null);
      },
      { apply: false },
    );
  },
);

test(
  "actual source RLS controls non-bypass staff/cross-shop/null/no-profile/NULL-input/unknown-customer results",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await sourceSnapshot(db);
      await asActor(db, staff, async () => {
        assert.deepEqual(
          (await db.query("SELECT id FROM shop_manager.profiles ORDER BY id")).rows,
          [{ id: staff }],
        );
        assert.deepEqual(
          (await read(db)).rows.map((row) => row.id),
          [reminder],
        );
        assert.deepEqual(await read(db, otherCustomer), unavailable);
        assert.deepEqual(await read(db, null), unavailable);
        assert.deepEqual(await read(db, uuid(9999)), unavailable);
      });
      await asActor(db, otherStaff, async () => {
        assert.deepEqual(await read(db), unavailable);
        assert.deepEqual(
          (await read(db, otherCustomer)).rows.map((row) => row.id),
          [otherReminder],
        );
      });
      for (const subject of [null, stranger])
        await asActor(db, subject, async () => assert.deepEqual(await read(db), unavailable));
      assert.deepEqual(await sourceSnapshot(db), before);
    });
  },
);

test(
  "visible empty and source customer-self visibility stay distinct from missing context without inventing shop membership",
  options,
  async () => {
    await withFixture(async (db) => {
      await asActor(db, staff, async () =>
        assert.deepEqual(await read(db, emptyCustomer), {
          available: true,
          customer_id: emptyCustomer,
          shop_id: shop,
          rows: [],
        }),
      );
      await asActor(db, selfCustomer, async () => {
        assert.equal(
          (await db.query("SELECT shop_manager.get_current_user_shop_id() AS shop")).rows[0].shop,
          null,
        );
        for (const [c, s] of [
          [customer, shop],
          [otherCustomer, otherShop],
        ]) {
          assert.deepEqual(
            (await db.query("SELECT id FROM shop_manager.customers WHERE id=$1", [c])).rows,
            [{ id: c }],
          );
          assert.deepEqual(await read(db, c), {
            available: true,
            customer_id: c,
            shop_id: s,
            rows: [],
          });
        }
      });
    });
  },
);

test(
  "explicit dual bindings exclude same-shop sibling, mismatched/null shop and orphan reminder rows without tightening source RLS",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const [id, c, s] of [
        [uuid(410), customer, otherShop],
        [uuid(411), customer, null],
        [uuid(412), uuid(9998), shop],
        [uuid(413), customer, uuid(9997)],
      ])
        await db.query(
          `INSERT INTO shop_manager.customer_reminders(id,customer_id,shop_id,title,due_date)
        VALUES($1,$2,$3,'Excluded synthetic row','2026-10-01')`,
          [id, c, s],
        );
      // UUID9997 is an unmatched shop binding here, not a physical shops-table
      // existence claim. The next SAME-actor case independently proves the join.
      const before = await sourceSnapshot(db);
      await asActor(db, staff, async () => {
        const direct = (
          await db.query("SELECT id FROM shop_manager.customer_reminders ORDER BY id")
        ).rows.map((row) => row.id);
        assert.ok(direct.includes(siblingReminder));
        assert.ok(
          direct.includes(uuid(412)),
          "orphan is source-RLS-visible; RPC context must exclude it",
        );
        assert.deepEqual(
          (await read(db)).rows.map((row) => row.id),
          [reminder],
        );
        assert.deepEqual(
          (await read(db, sibling)).rows.map((row) => row.id),
          [siblingReminder],
        );
        assert.deepEqual(await read(db, uuid(9998)), unavailable);
      });
      assert.deepEqual(await sourceSnapshot(db), before);
    });
  },
);

test(
  "moved/deleted customer next statements block stale shop-only reminders even while direct reminder RLS still exposes them",
  options,
  async () => {
    await withFixture(async (db) => {
      await asActor(db, staff, async () => assert.equal((await read(db)).available, true));
      await db.query("UPDATE shop_manager.customers SET shop_id=$1 WHERE id=$2", [
        otherShop,
        customer,
      ]);
      await asActor(db, staff, async () => {
        assert.deepEqual(
          (await db.query("SELECT id FROM shop_manager.customer_reminders WHERE id=$1", [reminder]))
            .rows,
          [{ id: reminder }],
        );
        assert.deepEqual(await read(db), unavailable);
      });
      // Customer-self branch remains visible but its new shop does not match the
      // stale reminder. This is not an assumption that customers are employees.
      await asActor(db, selfCustomer, async () =>
        assert.deepEqual(await read(db), {
          available: true,
          customer_id: customer,
          shop_id: otherShop,
          rows: [],
        }),
      );
      await db.query("DELETE FROM shop_manager.customers WHERE id=$1", [customer]);
      await asActor(db, staff, async () => {
        assert.deepEqual(
          (await db.query("SELECT id FROM shop_manager.customer_reminders WHERE id=$1", [reminder]))
            .rows,
          [{ id: reminder }],
        );
        assert.deepEqual(await read(db), unavailable);
      });
    });
  },
);

test(
  "actual customer-self and shop-only reminder policies can expose a moved parent and stale child to the SAME actor; the RPC shop join excludes it",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.query("UPDATE shop_manager.customers SET shop_id=$1,user_id=$2 WHERE id=$3", [
        otherShop,
        staff,
        customer,
      ]);
      await db.query(
        `INSERT INTO shop_manager.customer_reminders(id,customer_id,shop_id,title,due_date)
        VALUES($1,$2,$3,'Synthetic new-shop reminder','2026-10-15')`,
        [uuid(414), customer, otherShop],
      );
      const before = await sourceSnapshot(db);
      await asActor(db, staff, async () => {
        assert.equal(
          (await db.query("SELECT shop_manager.get_current_user_shop_id() AS shop")).rows[0].shop,
          shop,
        );
        assert.deepEqual(
          (await db.query("SELECT id,shop_id FROM shop_manager.customers WHERE id=$1", [customer]))
            .rows,
          [{ id: customer, shop_id: otherShop }],
        );
        assert.deepEqual(
          (
            await db.query(
              "SELECT id,customer_id,shop_id FROM shop_manager.customer_reminders WHERE customer_id=$1 ORDER BY id",
              [customer],
            )
          ).rows,
          [{ id: reminder, customer_id: customer, shop_id: shop }],
        );
        assert.deepEqual(await read(db), {
          available: true,
          customer_id: customer,
          shop_id: otherShop,
          rows: [],
        });
      });
      assert.deepEqual(await sourceSnapshot(db), before);
    });
  },
);

test(
  "profile shop changes are reevaluated on the next statement, not immutable actor authority or continuous revocation proof",
  options,
  async () => {
    await withFixture(async (db) => {
      await asActor(db, staff, async () => assert.equal((await read(db)).available, true));
      await db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2", [otherShop, staff]);
      await asActor(db, staff, async () => {
        assert.deepEqual(await read(db), unavailable);
        assert.deepEqual(
          (await read(db, otherCustomer)).rows.map((row) => row.id),
          [otherReminder],
        );
      });
      await db.query("UPDATE shop_manager.profiles SET shop_id=NULL WHERE id=$1", [staff]);
      await asActor(db, staff, async () =>
        assert.deepEqual(await read(db, otherCustomer), unavailable),
      );
    });
  },
);

test(
  "returns only strict fixed envelope/row keys while preserving arbitrary/empty native text, nullable notes and complete stored timestamps",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.query(
        `UPDATE shop_manager.customer_reminders SET reminder_type='',title='',notes=NULL,status='paused_for_owner',
      completed_at='2026-10-15T21:14:13.123456-05:00' WHERE id=$1`,
        [reminder],
      );
      const before = await sourceSnapshot(db);
      await asActor(db, staff, async () => {
        const result = await read(db);
        assert.deepEqual(Object.keys(result).sort(), [
          "available",
          "customer_id",
          "rows",
          "shop_id",
        ]);
        assert.deepEqual(result, {
          available: true,
          customer_id: customer,
          shop_id: shop,
          rows: [
            {
              id: reminder,
              customer_id: customer,
              shop_id: shop,
              reminder_type: "",
              title: "",
              notes: null,
              due_date: "2026-10-15",
              status: "paused_for_owner",
              completed_at: "2026-10-16T02:14:13.123456+00:00",
            },
          ],
        });
        assert.doesNotMatch(
          JSON.stringify(result),
          /created_by|assigned_to|created_at|updated_at|vehicle_id/,
        );
      });
      assert.deepEqual(await sourceSnapshot(db), before);
    });
  },
);

test(
  "101-row bound preserves earliest due dates, ascending UUID ties and all stored statuses, without claiming a complete queue",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.query("DELETE FROM shop_manager.customer_reminders WHERE customer_id=$1", [
        customer,
      ]);
      for (let n = 104; n >= 0; n--)
        await db.query(
          `INSERT INTO shop_manager.customer_reminders(id,customer_id,shop_id,title,due_date,status)
        VALUES($1,$2,$3,'Tied synthetic reminder',$4,$5)`,
          [
            uuid(1000 + n),
            customer,
            shop,
            n === 104 ? "2020-01-01" : "2026-10-15",
            ["completed", "pending", "arbitrary_native_status", ""][n % 4],
          ],
        );
      const before = await sourceSnapshot(db);
      await asActor(db, staff, async () => {
        const result = await read(db);
        assert.equal(result.rows.length, 101);
        assert.deepEqual(
          result.rows.map((row) => row.id),
          [uuid(1104), ...Array.from({ length: 100 }, (_, n) => uuid(1000 + n))],
        );
        assert.deepEqual([...new Set(result.rows.map((row) => row.status))].sort(), [
          "",
          "arbitrary_native_status",
          "completed",
          "pending",
        ]);
      });
      assert.deepEqual(await sourceSnapshot(db), before);
    });
  },
);

test(
  "source permission failures raise42501 instead of being converted into empty/unavailable snapshots",
  options,
  async () => {
    for (const revoke of [
      "REVOKE SELECT ON shop_manager.customers FROM authenticated",
      "REVOKE SELECT ON shop_manager.customer_reminders FROM authenticated",
      "REVOKE EXECUTE ON FUNCTION shop_manager.get_current_user_shop_id() FROM PUBLIC,authenticated",
    ])
      await withFixture(async (db) => {
        await db.exec(revoke);
        const before = await sourceSnapshot(db);
        await asActor(db, staff, async () => await assert.rejects(read(db), { code: "42501" }));
        assert.deepEqual(await sourceSnapshot(db), before);
      });
  },
);

test(
  "unexpected custom default EXECUTE and inherited anon/service execution refuse atomically without broad default repairs",
  options,
  async () => {
    await withFixture(
      async (db) => {
        await db.exec(
          "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO unexpected_reader",
        );
        await candidateRefusal(db);
        assert.equal(await targetState(db), null);
      },
      { apply: false },
    );
    for (const role of ["anon", "service_role"])
      await withFixture(
        async (db) => {
          await db.exec(
            `ALTER ROLE ${role} INHERIT; GRANT authenticated TO ${role} WITH INHERIT TRUE`,
          );
          await candidateRefusal(db);
          assert.equal(await targetState(db), null);
        },
        { apply: false },
      );
  },
);

test(
  "exact/overload name collisions and reruns preserve the existing object rather than replacing it",
  options,
  async () => {
    for (const argument of ["uuid", "text"])
      await withFixture(
        async (db) => {
          await db.exec(
            `CREATE FUNCTION public.crm_customer_reminders(value ${argument}) RETURNS jsonb LANGUAGE sql AS $$SELECT '{}'::jsonb$$`,
          );
          await candidateRefusal(db);
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM pg_proc WHERE proname='crm_customer_reminders'`,
              )
            ).rows[0].n,
            1,
          );
        },
        { apply: false },
      );
    await withFixture(async (db) => await candidateRefusal(db));
  },
);

test(
  "wrong operator and nullable/type-drift customer schema prerequisites refuse before creating any reader",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const before = await sourceSnapshot(db);
        await db.exec("SET ROLE authenticated");
        await assert.rejects(db.exec(candidate), { code: "55000" });
        await db.exec("ROLLBACK; RESET ROLE");
        assert.equal(await targetState(db), null);
        assert.deepEqual(await sourceSnapshot(db), before);
      },
      { apply: false },
    );
    await withFixture(
      async (db) => {
        await db.exec("ALTER TABLE shop_manager.customers ALTER COLUMN shop_id DROP NOT NULL");
        await candidateRefusal(db);
      },
      { apply: false },
    );
    await withFixture(
      async (db) => {
        // Isolated schema-drift probe, not an actual native DDL repair. Drop dependent
        // fixture policies explicitly before changing the required column's type.
        await db.exec(
          'DROP POLICY "sm_customers_shop_all" ON shop_manager.customers; ALTER TABLE shop_manager.customers ALTER COLUMN shop_id TYPE text USING shop_id::text',
        );
        await candidateRefusal(db);
      },
      { apply: false },
    );
  },
);

test(
  "recovery requires exact explicit local opt-in and operator, with no automatic fallback on refusal",
  options,
  async () => {
    await withFixture(async (db) => {
      await recoveryRefusal(db, { optin: null });
      await recoveryRefusal(db, { optin: "unreviewed" });
      const before = await sourceSnapshot(db),
        target = await targetState(db);
      await db.exec("SET ROLE authenticated");
      await assert.rejects(recover(db), { code: "55000" });
      await db.exec("RESET ROLE");
      assert.deepEqual(await sourceSnapshot(db), before);
      assert.deepEqual(await targetState(db), target);
    });
  },
);

test(
  "recovery refuses body/config/owner/ACL/SETOF/default/strict/security drift while preserving the drifted object and source state",
  options,
  async () => {
    for (const drift of ["body", "config", "owner", "acl", "setof", "default", "strict", "definer"])
      await withFixture(async (db) => {
        if (drift === "body")
          await db.exec(
            "CREATE OR REPLACE FUNCTION public.crm_customer_reminders(_customer_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT '{}'::jsonb$$",
          );
        if (drift === "config") await db.exec(`ALTER FUNCTION ${signature} SET search_path=public`);
        if (drift === "owner") await db.exec(`ALTER FUNCTION ${signature} OWNER TO fixture_owner`);
        if (drift === "acl") await db.exec(`GRANT EXECUTE ON FUNCTION ${signature} TO anon`);
        if (drift === "setof") {
          await db.exec(`DROP FUNCTION ${signature} RESTRICT`);
          const changed = functionSql.replace(
            "RETURNS pg_catalog.jsonb",
            "RETURNS SETOF pg_catalog.jsonb",
          );
          assert.notEqual(changed, functionSql, "SETOF drift is not a no-op");
          await db.exec(changed);
          await db.exec(
            `REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC,anon,authenticated,service_role; GRANT EXECUTE ON FUNCTION ${signature} TO authenticated`,
          );
          assert.equal((await targetState(db)).body_md5, bodyMd5);
          assert.equal((await targetState(db)).proretset, true);
        }
        if (drift === "default") {
          const changed = functionSql
            .replace("CREATE FUNCTION", "CREATE OR REPLACE FUNCTION")
            .replace(
              "(_customer_id pg_catalog.uuid)",
              "(_customer_id pg_catalog.uuid DEFAULT NULL)",
            );
          assert.ok(
            changed.includes("pg_catalog.uuid DEFAULT NULL"),
            "default argument drift is not a no-op",
          );
          await db.exec(changed);
          assert.equal((await targetState(db)).pronargdefaults, 1);
          assert.equal((await targetState(db)).body_md5, bodyMd5);
        }
        if (drift === "strict") await db.exec(`ALTER FUNCTION ${signature} STRICT`);
        if (drift === "definer") await db.exec(`ALTER FUNCTION ${signature} SECURITY DEFINER`);
        await recoveryRefusal(db);
      });
  },
);

test(
  "recovery refuses newly inherited anon/service access without changing role membership, target ACL or source state",
  options,
  async () => {
    for (const role of ["anon", "service_role"])
      await withFixture(async (db) => {
        await db.exec(
          `ALTER ROLE ${role} INHERIT; GRANT authenticated TO ${role} WITH INHERIT TRUE`,
        );
        assert.equal(
          (
            await db.query(
              `SELECT has_function_privilege($1,'${signature}','EXECUTE') AS allowed`,
              [role],
            )
          ).rows[0].allowed,
          true,
        );
        await recoveryRefusal(db);
      });
  },
);

test(
  "recovery resets hostile operator resolution before rejecting same-shape body drift and restores the caller path on rollback",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec(`CREATE SCHEMA synthetic_shadow;
        CREATE FUNCTION synthetic_shadow.always_equal(pg_catalog.text,pg_catalog.text)
          RETURNS pg_catalog.bool LANGUAGE sql IMMUTABLE AS $$SELECT true$$;
        CREATE OPERATOR synthetic_shadow.= (LEFTARG=pg_catalog.text,RIGHTARG=pg_catalog.text,
          FUNCTION=synthetic_shadow.always_equal);
        CREATE OR REPLACE FUNCTION public.crm_customer_reminders(_customer_id pg_catalog.uuid)
          RETURNS pg_catalog.jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
          AS $$SELECT '{}'::pg_catalog.jsonb$$;
        SET search_path=pg_catalog,public`);
      const before = await sourceSnapshot(db),
        target = await targetState(db);
      assert.notEqual(target.body_md5, bodyMd5);
      await db.exec("SET search_path=synthetic_shadow,pg_catalog,public");
      assert.deepEqual(
        (
          await db.query(`SELECT 'left'::pg_catalog.text='right'::pg_catalog.text AS shadowed,
        'left'::pg_catalog.text OPERATOR(pg_catalog.=) 'right'::pg_catalog.text AS builtin`)
        ).rows[0],
        { shadowed: true, builtin: false },
      );
      const dirtyPath = (await db.query("SELECT current_setting('search_path') AS path")).rows[0]
        .path;
      await assert.rejects(recover(db), { code: "55000" });
      assert.equal(
        (await db.query("SELECT current_setting('search_path') AS path")).rows[0].path,
        dirtyPath,
      );
      // Inspect snapshots under a known safe path; do not let the fixture's
      // deliberately hostile text operator influence the assertions themselves.
      await db.exec("SET search_path=pg_catalog,public");
      assert.deepEqual(await targetState(db), target);
      assert.deepEqual(await sourceSnapshot(db), before);
      assert.equal(
        (
          await db.query(
            "SELECT to_regprocedure('synthetic_shadow.always_equal(pg_catalog.text,pg_catalog.text)') IS NOT NULL AS preserved",
          )
        ).rows[0].preserved,
        true,
      );
    });
  },
);

test(
  "RESTRICT recovery refuses dependent views without dropping the API or dependent/source objects",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec(
        "CREATE VIEW public.synthetic_reminder_dependency AS SELECT public.crm_customer_reminders(NULL::uuid) AS result",
      );
      const view = (
        await db.query(
          "SELECT pg_get_viewdef('public.synthetic_reminder_dependency'::regclass) AS definition",
        )
      ).rows[0];
      await recoveryRefusal(db, { code: "2BP01" });
      assert.deepEqual(
        (
          await db.query(
            "SELECT pg_get_viewdef('public.synthetic_reminder_dependency'::regclass) AS definition",
          )
        ).rows[0],
        view,
      );
    });
  },
);

test(
  "dirty operator search_path and real temporary uuid/jsonb domains cannot rebind builtin API types or reviewed drop lookup",
  options,
  async () => {
    await withFixture(
      async (db) => {
        await db.exec(`CREATE SCHEMA synthetic_dirty_path;
        CREATE TEMP TABLE synthetic_temp_anchor(id integer);
        CREATE DOMAIN pg_temp.uuid AS pg_catalog.uuid;
        CREATE DOMAIN pg_temp.jsonb AS pg_catalog.jsonb;
        SET search_path=synthetic_dirty_path,public`);
        // Prove the fixture actually exposes the hazardous unqualified TYPE lookup;
        // synthetic auth.uid's declaration/cast were builtin-qualified at creation.
        assert.deepEqual(
          (
            await db.query(`SELECT
        'uuid'::pg_catalog.regtype::oid='pg_temp.uuid'::pg_catalog.regtype::oid AS uuid_shadowed,
        'jsonb'::pg_catalog.regtype::oid='pg_temp.jsonb'::pg_catalog.regtype::oid AS jsonb_shadowed`)
          ).rows[0],
          { uuid_shadowed: true, jsonb_shadowed: true },
        );
        const before = await sourceSnapshot(db);
        await db.exec(candidate);
        assert.deepEqual(
          (
            await db.query(`SELECT p.pronargs=1 AS one_argument,
        p.proargtypes[0]='pg_catalog.uuid'::pg_catalog.regtype AS builtin_uuid,
        p.prorettype='pg_catalog.jsonb'::pg_catalog.regtype AS builtin_jsonb
        FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('public.crm_customer_reminders(pg_catalog.uuid)')`)
          ).rows[0],
          { one_argument: true, builtin_uuid: true, builtin_jsonb: true },
        );
        assert.equal((await targetState(db)).body_md5, bodyMd5);
        await asActor(db, staff, async () =>
          assert.deepEqual(
            (await read(db)).rows.map((row) => row.id),
            [reminder],
          ),
        );
        assert.deepEqual(await sourceSnapshot(db), before);
        await recover(db);
        assert.equal(await targetState(db), null);
        assert.deepEqual(await sourceSnapshot(db), before);
        assert.notEqual(
          (
            await db.query(
              "SELECT current_setting('motorsales365.customer_reminders_drop_review',true) AS optin",
            )
          ).rows[0].optin,
          "operator-reviewed-drop",
        );
      },
      { apply: false },
    );
  },
);

test(
  "reviewed recovery drops only the exact signature, preserves unrelated overloads and its LOCAL opt-in expires at transaction end",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec(
        "CREATE FUNCTION public.crm_customer_reminders(value text) RETURNS text LANGUAGE sql AS $$SELECT value$$",
      );
      const before = await sourceSnapshot(db);
      await recover(db);
      assert.equal(await targetState(db), null);
      assert.deepEqual(await sourceSnapshot(db), before);
      assert.equal(
        (await db.query("SELECT public.crm_customer_reminders('preserved'::text) AS value")).rows[0]
          .value,
        "preserved",
      );
      assert.notEqual(
        (
          await db.query(
            "SELECT current_setting('motorsales365.customer_reminders_drop_review',true) AS optin",
          )
        ).rows[0].optin,
        "operator-reviewed-drop",
      );
      await db.exec("DROP FUNCTION public.crm_customer_reminders(text) RESTRICT");
      await db.exec(candidate);
      await recoveryRefusal(db, { optin: null });
      await recover(db);
      await recoveryRefusal(db);
    });
  },
);
