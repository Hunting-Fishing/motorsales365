// OFFLINE selected-read composition only: no live clients, mutation RPCs,
// chain replay, seeds/backfills, auth/JWT/HTTP/Storage or release acceptance.
// Real selected functions, receipt/link/item DDL and SELECT policies, and the
// override DDL/two FK patches run unchanged. Other tables/session/RLS setup are
// explicit synthetic fixtures, not complete native schema/writer/role parity.
// Locked PGlite 0.5.9 observed PostgreSQL 18.6 / server_version_num 180006;
// this engine's NOT NULL constraint catalog representation is not live parity.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const sha = (raw) => createHash("sha256").update(raw.replace(/\r\n/g, "\n")).digest("hex");
const pinnedFiles = [
  [
    "resolvers",
    "20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql",
    "30dfd8df0c3537efb5155a8891804e00444b180f55e674b56d522e473e2f4144",
  ],
  [
    "roles",
    "20260713081559_69ad9a73-edab-4719-b16e-38541b8ba91a.sql",
    "23169927a45a5c47406181fb4e2e2c049e5282698f31a840c17cdbc2725a4472",
  ],
  [
    "membership",
    "20260713081649_7763bb16-35c5-4c76-a8f9-36c3f58090ce.sql",
    "738cecf5f28c9cc3cce5e2980a6ebb5c324d18fbd5b92aeb151448c89afd7bb9",
  ],
  [
    "employees",
    "20260831124952_employee_operations_ledger.sql",
    "2386ee30a1b12cd124445adf3da3568c35e567e96aa9f7b83e6cd4211ccae6b2",
  ],
  [
    "modules",
    "20260901025637_add_driver_module_access.sql",
    "ee6d043f23fe25f7f849fdd2d2cc104983a0ae3594d2f269e22d748ad498cff8",
  ],
  [
    "receipts",
    "20261014043336_vehicle_receipts_shared_history.sql",
    "73de34ce2f20b6fb0b2bb9b343fd48cbed7e09091e0000f931fc7aa51637d21d",
  ],
  [
    "tables",
    "20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe.sql",
    "f958d20e3b1ce5472cf292288f4710aab0ea858e5fd4f701bd0680cc0b039e71",
  ],
  [
    "foreignKeys",
    "20260713070436_a4f482f9-5657-4142-88e7-047bd0e90a42.sql",
    "b06be51908df335850c5132d8d5403d1918164bb2faded5195867e21b0a41a68",
  ],
];
const sources = Object.fromEntries(
  pinnedFiles.map(([id, file, expected]) => {
    const raw = fs.readFileSync(new URL(file, migrations), "utf8");
    assert.ok(raw.length > 0 && raw.length < 512 * 1024);
    assert.equal(sha(raw), expected, `${file}: whole-source drift`);
    return [id, raw.replace(/\r\n/g, "\n")];
  }),
);
function extract(raw, declaration, endMarker) {
  assert.ok(typeof raw === "string" && raw.length > 0 && raw.length < 512 * 1024);
  assert.equal(raw.split(declaration).length, 2, "expected one exact source declaration");
  const start = raw.indexOf(declaration);
  const end = raw.indexOf(endMarker, start);
  assert.ok(end > start, "missing selected source terminator");
  return raw.slice(start, end + endMarker.length).replace(/\r\n/g, "\n");
}
const definitions = [
  [
    "resolvers",
    "CREATE OR REPLACE FUNCTION shop_manager.get_current_user_shop_id()",
    "shop_manager.get_current_user_shop_id()",
    "96d278351d5b335519711b97e89dd5b52052886929fbce820951414612cd7845",
  ],
  [
    "employees",
    "CREATE OR REPLACE FUNCTION shop_manager.current_employee_profile()",
    "shop_manager.current_employee_profile()",
    "340715972e053fa97ae0593c6209cc7b0111a4a1ba0ffc9f7d690deebe45712f",
  ],
  [
    "roles",
    "CREATE OR REPLACE FUNCTION shop_manager.has_role(_user_id uuid, _role text)",
    "shop_manager.has_role(uuid,text)",
    "1ca7e9492dc55ff4ce67a41a0b85460e5912389567396ff9020911cd03c2ed0b",
  ],
  [
    "membership",
    "CREATE OR REPLACE FUNCTION shop_manager.user_belongs_to_shop(_user_id uuid, _shop_id uuid)",
    "shop_manager.user_belongs_to_shop(uuid,uuid)",
    "0b7e3f7cc785ac83b62f053d18c18b94b9b6bc2c17d2fd9f6c694cbb6cdd8285",
  ],
  [
    "employees",
    "CREATE OR REPLACE FUNCTION shop_manager.is_shop_operations_manager(_user_id uuid, _shop_id uuid)",
    "shop_manager.is_shop_operations_manager(uuid,uuid)",
    "426521f20c383a51b0ee09c684ba49b83af2b884a8a4be30a96b4672e6fc52ac",
  ],
  [
    "modules",
    "CREATE OR REPLACE FUNCTION shop_manager.employee_allowed_modules()",
    "shop_manager.employee_allowed_modules()",
    "3c9291c80a1f51818a1a3edc70ad88bb608709ea0b9b2ea8fc2996a1d5dcdea2",
  ],
  [
    "receipts",
    "CREATE FUNCTION vehicle_receipts_private.owns_vehicle(_id uuid)",
    "vehicle_receipts_private.owns_vehicle(uuid)",
    "1e9e23b86ea82180b6134e0d2ccc3d879908bb409edf108db5cdbbf500eadce3",
  ],
  [
    "receipts",
    "CREATE FUNCTION vehicle_receipts_private.shop_access(_id uuid, _write boolean DEFAULT false)",
    "vehicle_receipts_private.shop_access(uuid,boolean)",
    "a20a9ae54e0c7bb745a705571f8e7bf477b4ea08b3bfd34ce181e8892c4faf36",
  ],
  [
    "receipts",
    "CREATE FUNCTION vehicle_receipts_private.receipt_access(_id uuid, _write boolean DEFAULT false)",
    "vehicle_receipts_private.receipt_access(uuid,boolean)",
    "7df9cd7084ce4bcea7983a6376b47cb1fcca3523d891d59f55ad6b10370725ce",
  ],
].map(([sourceId, declaration, signature, expected]) => {
  const sql = extract(sources[sourceId], declaration, "$$;");
  assert.equal(sha(sql), expected, `${signature}: selected-definition drift`);
  return { sourceId, declaration, signature, sql, expected };
});
const table = (source, name) => extract(source, `CREATE TABLE ${name} (`, "\n);");
const overrideDdl = table(sources.tables, "shop_manager.shop_role_permissions");
const receiptDdls = [
  "public.vehicle_shop_links",
  "public.vehicle_receipts",
  "public.vehicle_receipt_items",
].map((name) => table(sources.receipts, name));
const overrideFks = ["created_by", "shop_id"].map((field) => {
  const matches = sources.foreignKeys
    .split("\n")
    .filter(
      (line) =>
        line.startsWith("DO $$") &&
        line.includes(
          `ALTER TABLE shop_manager.shop_role_permissions ADD CONSTRAINT shop_role_permissions_${field}_fkey `,
        ),
    );
  assert.equal(matches.length, 1);
  return matches[0];
});
const receiptPolicies = ["receipt_read", "receipt_item_read", "vehicle_shop_link_read"].map(
  (name) => extract(sources.receipts, `CREATE POLICY ${name} ON `, ";"),
);
const evidenceFiles = [
  [
    "composition",
    "native-access-composition-metadata-2026-10-15.json",
    "aaece0fb7c90dbae55a19f797bc9baff647b64901cc321cb1c43b029b8ee6a4a",
  ],
  [
    "access",
    "native-access-helper-metadata-2026-10-15.json",
    "3cf13e8c9b1718cb6791c3fb88fe0319090c62888749dc5e45b097a76c124834",
  ],
  [
    "roles",
    "native-role-membership-metadata-2026-10-15.json",
    "fedaa75815414a84fea1b2414cc51a8e6ae9b0297a1da80b16e7ba57ee54bb64",
  ],
];
const evidence = Object.fromEntries(
  evidenceFiles.map(([id, file, expected]) => {
    const raw = fs.readFileSync(new URL(`../../docs/evidence/${file}`, import.meta.url), "utf8");
    assert.equal(sha(raw), expected, `${file}: evidence drift`);
    const parsed = JSON.parse(raw);
    assert.equal(parsed.project, "wjxaajgvddtrxxtocxen");
    return [id, parsed];
  }),
);
const options = { concurrency: false, timeout: 30_000 };
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = id(1),
  owner = id(2),
  otherActor = id(3),
  stranger = id(4),
  legacyId = id(5);
const shopA = id(101),
  shopB = id(102),
  customerA = id(201),
  customerB = id(202);
const nativeA = id(301),
  nativeB = id(302),
  publicA = id(401),
  publicB = id(402);
const personal = id(501),
  nativeReceipt = id(502),
  crossShopReceipt = id(503);
const roleNames = [
  "service_advisor",
  "parts_manager",
  "manager",
  "owner",
  "admin",
  "operations_manager",
  "developer",
  "technician",
  "office_admin",
];
const profile = (pid, uid, shop) => ({ id: pid, user_id: uid, shop_id: shop });
const moduleList = async (db) =>
  (await db.query("SELECT shop_manager.employee_allowed_modules() AS modules")).rows[0].modules;
const modules = async (db) => [...(await moduleList(db))].sort();
const employee = async (db) =>
  (await db.query("SELECT to_jsonb(shop_manager.current_employee_profile()) AS employee")).rows[0]
    .employee;
const currentShop = async (db) =>
  (await db.query("SELECT shop_manager.get_current_user_shop_id() AS shop")).rows[0].shop;
const shopAccess = async (db, vehicle = nativeA, write = false) =>
  (
    await db.query("SELECT vehicle_receipts_private.shop_access($1::uuid,$2::boolean) AS allowed", [
      vehicle,
      write,
    ])
  ).rows[0].allowed;
const receiptAccess = async (db, receipt = personal, write = false) =>
  (
    await db.query(
      "SELECT vehicle_receipts_private.receipt_access($1::uuid,$2::boolean) AS allowed",
      [receipt, write],
    )
  ).rows[0].allowed;

async function state(db) {
  const data = {};
  for (const name of [
    "auth.users",
    "shop_manager.profiles",
    "shop_manager.shops",
    "shop_manager.customers",
    "shop_manager.vehicles",
    "shop_manager.roles",
    "shop_manager.user_roles",
    "shop_manager.shop_role_permissions",
    "public.vehicles",
    "public.vehicle_shop_links",
    "public.vehicle_receipts",
    "public.vehicle_receipt_items",
  ])
    data[name] = (
      await db.query(`SELECT to_jsonb(t) AS row FROM ${name} t ORDER BY to_jsonb(t)::text`)
    ).rows;
  const catalog = (
    await db.query(`SELECT
    (SELECT jsonb_agg(jsonb_build_object('schema',nspname,'owner',nspowner,'acl',nspacl::text) ORDER BY nspname)
      FROM pg_namespace WHERE nspname IN ('auth','public','shop_manager','vehicle_receipts_private')) AS schemas,
    (SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'owner',c.relowner,'acl',c.relacl::text,
      'rls',c.relrowsecurity,'force',c.relforcerowsecurity) ORDER BY n.nspname,c.relname)
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('auth','public','shop_manager') AND c.relkind='r') AS tables,
    (SELECT jsonb_agg(jsonb_build_object('table',polrelid::regclass::text,'name',polname,'roles',polroles::text,
      'using',pg_get_expr(polqual,polrelid),'check',pg_get_expr(polwithcheck,polrelid)) ORDER BY polrelid,polname) FROM pg_policy) AS policies,
    (SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition',md5(pg_get_functiondef(p.oid)),
      'acl',p.proacl::text) ORDER BY p.oid::regprocedure::text) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname IN ('auth','shop_manager','vehicle_receipts_private')) AS functions`)
  ).rows[0];
  return { data, catalog };
}
async function readOnly(db, run) {
  const before = await state(db);
  await run();
  assert.deepEqual(await state(db), before);
}
async function asActor(db, subject, run, role = "authenticated") {
  assert.ok(["authenticated", "anon", "service_role"].includes(role));
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [subject ?? ""]);
  try {
    await db.exec(`SET ROLE ${role}`);
    assert.deepEqual(
      (
        await db.query(`SELECT current_user AS actor,session_user,auth.uid() AS subject,rolsuper,rolbypassrls,
      row_security_active('shop_manager.profiles') AS profile_rls,row_security_active('shop_manager.shop_role_permissions') AS override_rls,
      row_security_active('public.vehicle_receipts') AS receipt_rls FROM pg_roles WHERE rolname=current_user`)
      ).rows[0],
      {
        actor: role,
        session_user: "postgres",
        subject: subject ?? null,
        rolsuper: false,
        rolbypassrls: role === "service_role",
        profile_rls: role !== "service_role",
        override_rls: role !== "service_role",
        receipt_rls: role !== "service_role",
      },
    );
    await run();
  } finally {
    await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)");
  }
}
async function bindRole(db, label = "service_advisor", user = actor) {
  assert.ok(roleNames.includes(label));
  await db.query("DELETE FROM shop_manager.user_roles WHERE user_id=$1", [user]);
  await db.query(
    "INSERT INTO shop_manager.user_roles(user_id,role_id) SELECT $1,id FROM shop_manager.roles WHERE name=$2",
    [user, label],
  );
}
async function override(
  db,
  actions,
  { shop = shopA, role = "service_advisor", module = "vehicles", omitActions = false } = {},
) {
  if (omitActions)
    await db.query(
      "INSERT INTO shop_manager.shop_role_permissions(shop_id,role_name,module,created_by) VALUES($1,$2,$3,$4)",
      [shop, role, module, actor],
    );
  else
    await db.query(
      "INSERT INTO shop_manager.shop_role_permissions(shop_id,role_name,module,actions,created_by) VALUES($1,$2,$3,$4::jsonb,$5)",
      [shop, role, module, actions === null ? null : JSON.stringify(actions), actor],
    );
}
async function withFixture(run) {
  const db = new PGlite("memory://");
  try {
    await db.exec(`SET statement_timeout='3000ms'; SET lock_timeout='1000ms';
      CREATE ROLE anon NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
      CREATE ROLE authenticated NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
      CREATE ROLE service_role NOLOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA shop_manager; CREATE SCHEMA vehicle_receipts_private;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE shop_manager.shops(id uuid PRIMARY KEY);
      CREATE TABLE shop_manager.profiles(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id),shop_id uuid);
      CREATE UNIQUE INDEX fixture_profiles_nonnull_user ON shop_manager.profiles(user_id) WHERE user_id IS NOT NULL;
      CREATE TABLE shop_manager.customers(id uuid PRIMARY KEY,shop_id uuid NOT NULL REFERENCES shop_manager.shops(id));
      CREATE TABLE shop_manager.vehicles(id uuid PRIMARY KEY,customer_id uuid REFERENCES shop_manager.customers(id));
      CREATE TABLE shop_manager.roles(id uuid PRIMARY KEY,name text NOT NULL UNIQUE);
      CREATE TABLE shop_manager.user_roles(user_id uuid REFERENCES auth.users(id),role_id uuid REFERENCES shop_manager.roles(id),UNIQUE(user_id,role_id));
      CREATE TABLE public.vehicles(id uuid PRIMARY KEY,owner_user_id uuid NOT NULL REFERENCES auth.users(id));
      GRANT USAGE ON SCHEMA auth,shop_manager TO anon,authenticated,service_role;
      GRANT USAGE ON SCHEMA vehicle_receipts_private TO authenticated,service_role;
      GRANT SELECT ON shop_manager.profiles,shop_manager.vehicles,shop_manager.customers,public.vehicles TO authenticated;
      ALTER TABLE shop_manager.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE shop_manager.vehicles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE shop_manager.customers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;`);
    await db.exec(overrideDdl);
    for (const sql of overrideFks) await db.exec(sql);
    await db.exec(
      "ALTER TABLE shop_manager.shop_role_permissions ENABLE ROW LEVEL SECURITY; GRANT ALL ON shop_manager.shop_role_permissions TO service_role",
    );
    for (const sql of receiptDdls) await db.exec(sql);
    for (const helper of definitions) await db.exec(helper.sql);
    // Function ACLs are an explicit observed-state fixture, not proof of a full
    // migration path/default privilege/role inheritance or deployed API parity.
    for (const observed of evidence.composition.helpers) {
      if (!observed.anon_execute)
        await db.exec(`REVOKE EXECUTE ON FUNCTION ${observed.signature} FROM PUBLIC,anon`);
      await db.exec(
        `GRANT EXECUTE ON FUNCTION ${observed.signature} TO authenticated,service_role`,
      );
    }
    await db.exec(`ALTER TABLE public.vehicle_receipts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.vehicle_receipt_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.vehicle_shop_links ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON public.vehicle_receipts,public.vehicle_receipt_items,public.vehicle_shop_links FROM PUBLIC,anon,authenticated;
      GRANT SELECT ON public.vehicle_receipts,public.vehicle_receipt_items,public.vehicle_shop_links TO authenticated;
      GRANT ALL ON public.vehicle_receipts,public.vehicle_receipt_items,public.vehicle_shop_links TO service_role;`);
    for (const sql of receiptPolicies) await db.exec(sql);
    for (const user of [actor, owner, otherActor, stranger, legacyId])
      await db.query("INSERT INTO auth.users VALUES($1)", [user]);
    for (const [n, label] of roleNames.entries())
      await db.query("INSERT INTO shop_manager.roles VALUES($1,$2)", [id(700 + n), label]);
    await db.query("INSERT INTO shop_manager.shops VALUES($1),($2)", [shopA, shopB]);
    await db.query("INSERT INTO shop_manager.profiles VALUES($1,$1,$2),($3,$3,$4)", [
      actor,
      shopA,
      otherActor,
      shopB,
    ]);
    await db.query("INSERT INTO shop_manager.customers VALUES($1,$2),($3,$4)", [
      customerA,
      shopA,
      customerB,
      shopB,
    ]);
    await db.query("INSERT INTO shop_manager.vehicles VALUES($1,$2),($3,$4)", [
      nativeA,
      customerA,
      nativeB,
      customerB,
    ]);
    await db.query("INSERT INTO public.vehicles VALUES($1,$2),($3,$4)", [
      publicA,
      owner,
      publicB,
      otherActor,
    ]);
    await bindRole(db);
    await bindRole(db, "service_advisor", otherActor);
    await db.query(
      "INSERT INTO public.vehicle_shop_links(shop_vehicle_id,vehicle_id,shop_id,approved_by) VALUES($1,$2,$3,$4)",
      [nativeA, publicA, shopA, owner],
    );
    await db.query(
      `INSERT INTO public.vehicle_receipts(id,vehicle_id,shop_vehicle_id,created_by,status,share_with_shop)
      VALUES($1,$2,NULL,$3,'confirmed',true),($4,$2,$5,$6,'confirmed',false),($7,$8,$9,$10,'confirmed',false)`,
      [
        personal,
        publicA,
        owner,
        nativeReceipt,
        nativeA,
        actor,
        crossShopReceipt,
        publicB,
        nativeB,
        otherActor,
      ],
    );
    for (const [item, receipt] of [
      [id(601), personal],
      [id(602), nativeReceipt],
      [id(603), crossShopReceipt],
    ])
      await db.query(
        "INSERT INTO public.vehicle_receipt_items(id,receipt_id,description) VALUES($1,$2,'Synthetic reviewed evidence')",
        [item, receipt],
      );
    await run(db);
  } finally {
    await db.close();
  }
}

test(
  "nine definitions and selected DDL/policies have unique pinned source boundaries/default argument identities",
  options,
  () => {
    assert.equal(definitions.length, 9);
    assert.equal(receiptDdls.length, 3);
    assert.equal(receiptPolicies.length, 3);
    assert.equal(overrideFks.length, 2);
    for (const helper of definitions) {
      assert.equal(
        extract(sources[helper.sourceId].replace(/\n/g, "\r\n"), helper.declaration, "$$;"),
        helper.sql,
      );
      for (const bad of ["", null, helper.sql + helper.sql])
        assert.throws(() => extract(bad, helper.declaration, "$$;"));
      assert.notEqual(
        sha(helper.sql.replace("SECURITY DEFINER", "SECURITY INVOKER")),
        helper.expected,
      );
    }
    assert.ok(
      definitions
        .find((h) => h.signature === "vehicle_receipts_private.shop_access(uuid,boolean)")
        .sql.includes("_write boolean DEFAULT false"),
    );
    assert.equal(
      definitions
        .find((h) => h.signature === "vehicle_receipts_private.shop_access(uuid,boolean)")
        .sql.match(/\b_write\b/g).length,
      1,
      "write argument is declared but unused",
    );
  },
);

test(
  "all nine observed fingerprints/ACLs/security agree with immutable dated evidence; override exact columns/FKs/ACL/RLS remain scoped",
  options,
  async () => {
    assert.equal(evidence.composition.formatVersion, 1);
    assert.equal(evidence.composition.mode, "read-only-catalog");
    assert.equal(evidence.composition.helpers.length, 9);
    assert.equal(evidence.access.observations.length, 6);
    assert.equal(
      evidence.composition.scope,
      "Nine selected native/module/receipt helper catalog observations and the shop_role_permissions table catalog only. No business rows, business RPC, data mutation, DDL or history/platform changes.",
    );
    await withFixture(async (db) => {
      assert.equal(
        JSON.parse(fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"))
          .devDependencies["@electric-sql/pglite"],
        "0.5.9",
      );
      const engine = (
        await db.query(
          "SELECT version() AS version,current_setting('server_version_num') AS version_num",
        )
      ).rows[0];
      assert.match(engine.version_num, /^18\d{4}$/);
      assert.match(engine.version, /PGlite 0\.5\.9/);
      for (const observed of evidence.composition.helpers) {
        assert.equal(observed.observed_at_utc, "2026-10-14 20:34:32.730047+00");
        const actual = (
          await db.query(
            `SELECT pg_get_userbyid(p.proowner) AS owner,l.lanname AS language,p.prosecdef,p.provolatile,
        p.proretset,p.pronargdefaults,p.provariadic,p.proargnames,p.proargmodes,p.prorettype::regtype::text AS result,p.proconfig,p.proacl::text AS acl,
        md5(pg_get_functiondef(p.oid)) AS definition_md5,md5(replace(p.prosrc,chr(13),'')) AS body_md5,
        has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
        has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=$1::regprocedure`,
            [observed.signature],
          )
        ).rows[0];
        const { oid: _oid, signature: _signature, observed_at_utc: _time, ...contract } = observed;
        assert.deepEqual(actual, contract);
        const previous = evidence.access.observations.find(
          (row) => row.signature === observed.signature,
        );
        const rolePrevious = evidence.roles.functions.find(
          (row) => row.signature === observed.signature,
        );
        if (previous) {
          assert.equal(actual.definition_md5, previous.definition_md5);
          assert.equal(actual.body_md5, previous.body_md5);
          assert.equal(actual.acl, previous.acl);
        } else {
          assert.ok(rolePrevious);
          assert.equal(actual.definition_md5, rolePrevious.definitionMd5);
          assert.equal(actual.body_md5, rolePrevious.bodyMd5CrRemoved);
          assert.equal(actual.acl, rolePrevious.proacl);
        }
      }
      assert.equal(
        (
          await db.query(
            "SELECT to_regprocedure('vehicle_receipts_private.shop_access(uuid)') AS overload",
          )
        ).rows[0].overload,
        null,
      );
      assert.equal(
        (
          await db.query(
            "SELECT to_regprocedure('vehicle_receipts_private.receipt_access(uuid)') AS overload",
          )
        ).rows[0].overload,
        null,
      );
      const overrideContract = (
        await db.query(`SELECT pg_get_userbyid(relowner) AS owner,relrowsecurity AS rls,relforcerowsecurity AS force_rls,relacl::text AS acl,
      has_table_privilege('authenticated',oid,'SELECT') AS authenticated_select,has_table_privilege('authenticated',oid,'INSERT') AS authenticated_insert,
      has_table_privilege('authenticated',oid,'UPDATE') AS authenticated_update,has_table_privilege('authenticated',oid,'DELETE') AS authenticated_delete,
      has_table_privilege('anon',oid,'SELECT') AS anon_select,has_table_privilege('service_role',oid,'SELECT') AS service_select
      FROM pg_class WHERE oid='shop_manager.shop_role_permissions'::regclass`)
      ).rows[0];
      const { oid: _oid, ...expectedTable } = evidence.composition.overrideTable.table_contract;
      assert.deepEqual(overrideContract, expectedTable);
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int n FROM pg_policy WHERE polrelid='shop_manager.shop_role_permissions'::regclass",
          )
        ).rows[0].n,
        0,
      );
      const columns = (
        await db.query(`SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,
      pg_get_expr(d.adbin,d.adrelid) AS default,a.attnotnull AS not_null,a.attacl::text AS column_acl
      FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid='shop_manager.shop_role_permissions'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`)
      ).rows;
      assert.deepEqual(columns, evidence.composition.overrideTable.columns);
      // PGlite's engine also catalogs NOT NULL as contype='n'; the dated live
      // snapshot uses column attnotnull instead. Column nullability was checked
      // independently above. Compare the source PK/unique/FKs without pretending
      // that the two engines have identical complete constraint catalogs.
      const constraints = (
        await db.query(`SELECT conname AS name,contype AS type,convalidated AS validated,pg_get_constraintdef(oid) AS definition
      FROM pg_constraint WHERE conrelid='shop_manager.shop_role_permissions'::regclass AND contype<>'n' ORDER BY conname`)
      ).rows;
      assert.deepEqual(constraints, evidence.composition.overrideTable.constraints);
      const indexes = (
        await db.query(`SELECT indisvalid AS valid,pg_get_indexdef(indexrelid) AS definition
        FROM pg_index WHERE indrelid='shop_manager.shop_role_permissions'::regclass ORDER BY indexrelid::regclass::text`)
      ).rows;
      assert.deepEqual(indexes, evidence.composition.overrideTable.indexes);
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int n FROM pg_trigger WHERE tgrelid='shop_manager.shop_role_permissions'::regclass AND tgisinternal",
          )
        ).rows[0].n,
        4,
      );
    });
  },
);

test(
  "normal service-advisor composition retains RLS-selected own-shop receipts/items while excluding cross-shop data",
  options,
  async () => {
    await withFixture(async (db) =>
      readOnly(db, () =>
        asActor(db, actor, async () => {
          assert.deepEqual(await employee(db), profile(actor, actor, shopA));
          assert.equal(await currentShop(db), shopA);
          assert.ok((await modules(db)).includes("vehicles"));
          assert.equal(await shopAccess(db), true);
          assert.equal(await receiptAccess(db, personal, false), true);
          assert.equal(await receiptAccess(db, personal, true), false);
          assert.equal(await receiptAccess(db, nativeReceipt, true), true);
          assert.equal(await shopAccess(db, nativeB), false);
          assert.equal(await receiptAccess(db, crossShopReceipt), false);
          assert.deepEqual(
            (await db.query("SELECT id FROM public.vehicle_receipts ORDER BY id")).rows,
            [{ id: personal }, { id: nativeReceipt }],
          );
          assert.deepEqual(
            (await db.query("SELECT id FROM public.vehicle_receipt_items ORDER BY id")).rows,
            [{ id: id(601) }, { id: id(602) }],
          );
          assert.equal(
            (
              await db.query("SELECT vehicle_receipts_private.shop_access($1) AS allowed", [
                nativeA,
              ])
            ).rows[0].allowed,
            true,
          );
          assert.equal(
            (
              await db.query("SELECT vehicle_receipts_private.receipt_access($1) AS allowed", [
                personal,
              ])
            ).rows[0].allowed,
            true,
          );
        }),
      ),
    );
  },
);

test(
  "absent overrides use fallback modules; actual rows with default empty or NULL actions override fallback to operations only",
  options,
  async () => {
    await withFixture(async (db) => {
      await readOnly(db, () =>
        asActor(db, actor, async () => assert.ok((await modules(db)).includes("vehicles"))),
      );
      for (const [actions, omitActions] of [
        [{}, true],
        [{}, false],
        [null, false],
      ]) {
        await override(db, actions, { omitActions });
        await readOnly(db, () =>
          asActor(db, actor, async () => {
            assert.deepEqual(await modules(db), ["operations"]);
            assert.equal(await shopAccess(db), false);
            assert.equal(await receiptAccess(db, nativeReceipt, true), false);
          }),
        );
        await db.exec("DELETE FROM shop_manager.shop_role_permissions");
      }
    });
  },
);

test(
  "view/read/manage each enable the same shop-access true/false helper path; write-only action does not grant vehicles",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const action of ["view", "read", "manage"]) {
        await override(db, { [action]: true });
        await readOnly(db, () =>
          asActor(db, actor, async () => {
            assert.deepEqual(await modules(db), ["operations", "vehicles"]);
            assert.equal(await shopAccess(db, nativeA, false), true);
            assert.equal(await shopAccess(db, nativeA, true), true);
            assert.equal(await receiptAccess(db, nativeReceipt, false), true);
            assert.equal(await receiptAccess(db, nativeReceipt, true), true);
            assert.equal(await receiptAccess(db, personal, true), false);
          }),
        );
        await db.exec("DELETE FROM shop_manager.shop_role_permissions");
      }
      await override(db, { write: true });
      await readOnly(db, () =>
        asActor(db, actor, async () => {
          assert.deepEqual(await modules(db), ["operations"]);
          assert.equal(await shopAccess(db, nativeA, true), false);
        }),
      );
      // These are boolean read-helper paths only. No actual receipt/save/stock or
      // other mutation function is invoked or claimed authorized by this proof.
    });
  },
);

test(
  "other-role/other-shop overrides are ignored; a matching other-module override does not grant vehicles",
  options,
  async () => {
    await withFixture(async (db) => {
      await override(db, { view: true }, { role: "technician" });
      await override(db, { view: true }, { shop: shopB });
      await readOnly(db, () =>
        asActor(db, actor, async () => {
          assert.ok((await modules(db)).includes("vehicles"));
          assert.equal(await shopAccess(db), true);
        }),
      );
      await override(db, { view: true }, { module: "invoices" });
      await readOnly(db, () =>
        asActor(db, actor, async () => {
          assert.deepEqual(await modules(db), ["invoices", "operations"]);
          assert.equal(await shopAccess(db), false);
        }),
      );
    });
  },
);

test(
  "malformed boolean action strings propagate SQL errors instead of empty authorization, with no read side effects",
  options,
  async () => {
    await withFixture(async (db) => {
      await override(db, { view: "not-a-boolean" });
      await readOnly(db, () =>
        asActor(db, actor, async () => {
          for (const read of [
            () => moduleList(db),
            () => shopAccess(db),
            () => receiptAccess(db, nativeReceipt),
          ])
            await assert.rejects(read(), { code: "22P02" });
        }),
      );
    });
  },
);

test(
  "privileged role early return bypasses denying override rows, but all-modules developer is not an operations-manager role",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const role of ["owner", "admin", "manager", "operations_manager", "developer"]) {
        await bindRole(db, role);
        await override(db, {}, { role });
        await readOnly(db, () =>
          asActor(db, actor, async () => {
            const allowed = await modules(db);
            assert.equal(allowed.length, 22);
            assert.ok(allowed.includes("vehicles"));
            assert.equal(await shopAccess(db), role !== "developer");
          }),
        );
        await db.exec("DELETE FROM shop_manager.shop_role_permissions");
      }
    });
  },
);

test(
  "legacy-only resolution combines auth/profile-keyed roles but id-only operations membership still differs",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.query("UPDATE shop_manager.profiles SET id=$1 WHERE id=$2", [legacyId, actor]);
      for (const [role, user, expectedAccess] of [
        ["service_advisor", actor, true],
        ["manager", actor, false],
        ["parts_manager", legacyId, true],
      ]) {
        await db.query("DELETE FROM shop_manager.user_roles WHERE user_id=$1 OR user_id=$2", [
          actor,
          legacyId,
        ]);
        await bindRole(db, role, user);
        await readOnly(db, () =>
          asActor(db, actor, async () => {
            assert.deepEqual(await employee(db), profile(legacyId, actor, shopA));
            assert.equal(await currentShop(db), null);
            assert.ok((await modules(db)).includes("vehicles"));
            assert.equal(await shopAccess(db), expectedAccess);
            assert.equal(
              (
                await db.query("SELECT shop_manager.is_shop_operations_manager($1,$2) AS allowed", [
                  actor,
                  shopA,
                ])
              ).rows[0].allowed,
              false,
            );
          }),
        );
      }
      // legacyId is a distinct synthetic auth.users row so fixture user_roles FK
      // remains valid; this does not assert such cross-identity bindings exist live.
    });
  },
);

test(
  "nullable shadow changes the global module-override shop; explicit false restores true legacy ordering but not id-only scope",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.query("UPDATE shop_manager.profiles SET id=$1 WHERE id=$2", [legacyId, actor]);
      await db.query("INSERT INTO shop_manager.profiles VALUES($1,NULL,$2)", [actor, shopB]);
      await bindRole(db, "parts_manager");
      await override(db, { view: true }, { role: "parts_manager" });
      await override(db, {}, { role: "parts_manager", shop: shopB });
      await readOnly(db, () =>
        asActor(db, actor, async () => {
          assert.deepEqual(await employee(db), profile(actor, null, shopB));
          assert.equal(await currentShop(db), shopB);
          assert.deepEqual(await modules(db), ["operations"]);
          assert.equal(await shopAccess(db, nativeA), false);
          assert.equal(await shopAccess(db, nativeB), false);
        }),
      );
      await db.query("UPDATE shop_manager.profiles SET user_id=$1 WHERE id=$2", [owner, actor]);
      await readOnly(db, () =>
        asActor(db, actor, async () => {
          assert.deepEqual(await employee(db), profile(legacyId, actor, shopA));
          assert.equal(await currentShop(db), shopB);
          assert.deepEqual(await modules(db), ["operations", "vehicles"]);
          assert.equal(await shopAccess(db, nativeA), true);
          assert.equal(await shopAccess(db, nativeB), true);
        }),
      );
    });
  },
);

test(
  "shared owner receipt is read-only for staff, and inactive link hides it while native receipt branch survives; timestamp alone is not revocation",
  options,
  async () => {
    await withFixture(async (db) => {
      await readOnly(db, () =>
        asActor(db, actor, async () => {
          assert.equal(await receiptAccess(db, personal, false), true);
          assert.equal(await receiptAccess(db, personal, true), false);
        }),
      );
      await db.exec("UPDATE public.vehicle_shop_links SET revoked_at=now()");
      await readOnly(db, () =>
        asActor(db, actor, async () =>
          assert.equal(await receiptAccess(db, personal, false), true),
        ),
      );
      await db.exec("UPDATE public.vehicle_shop_links SET active=false");
      await readOnly(db, () =>
        asActor(db, actor, async () => {
          assert.equal(await receiptAccess(db, personal, false), false);
          assert.equal(await receiptAccess(db, personal, true), false);
          assert.equal(await receiptAccess(db, nativeReceipt, false), true);
          assert.equal(await receiptAccess(db, nativeReceipt, true), true);
          assert.deepEqual(
            (await db.query("SELECT id FROM public.vehicle_receipts ORDER BY id")).rows,
            [{ id: nativeReceipt }],
          );
          assert.deepEqual(
            (await db.query("SELECT id FROM public.vehicle_receipt_items ORDER BY id")).rows,
            [{ id: id(602) }],
          );
        }),
      );
      await readOnly(db, () =>
        asActor(db, owner, async () => {
          assert.equal(
            (
              await db.query("SELECT vehicle_receipts_private.owns_vehicle($1) AS allowed", [
                publicA,
              ])
            ).rows[0].allowed,
            true,
          );
          assert.equal(await receiptAccess(db, personal, true), true);
          assert.deepEqual(await modules(db), []);
        }),
      );
    });
  },
);

test(
  "null subject/stranger/missing/cross-shop helpers fail closed while direct native/override denial differs from elevated reads",
  options,
  async () => {
    await withFixture(async (db) =>
      readOnly(db, async () => {
        for (const subject of [null, stranger])
          await asActor(db, subject, async () => {
            assert.equal(await employee(db), null);
            assert.equal(await currentShop(db), null);
            assert.deepEqual(await modules(db), []);
            assert.equal(await shopAccess(db), false);
            assert.equal(await receiptAccess(db), false);
            assert.deepEqual((await db.query("SELECT id FROM public.vehicle_receipts")).rows, []);
          });
        await asActor(db, otherActor, async () => {
          assert.equal(await shopAccess(db, nativeA), false);
          assert.equal(await receiptAccess(db, personal), false);
          assert.equal(await receiptAccess(db, crossShopReceipt), true);
        });
        await asActor(db, actor, async () => {
          assert.deepEqual((await db.query("SELECT * FROM shop_manager.profiles")).rows, []);
          await assert.rejects(db.query("SELECT * FROM shop_manager.shop_role_permissions"), {
            code: "42501",
          });
          await assert.rejects(db.query("SELECT * FROM shop_manager.user_roles"), {
            code: "42501",
          });
          assert.equal(await shopAccess(db), true);
          assert.equal(await shopAccess(db, id(9999)), false);
          assert.equal(await receiptAccess(db, id(9999)), false);
        });
      }),
    );
  },
);

test(
  "real override/receipt constraints and SELECT policies remain present, with no helper-triggered mutation or extra policy grants",
  options,
  async () => {
    await withFixture(async (db) => {
      await assert.rejects(override(db, { view: true }, { shop: id(9999) }), { code: "23503" });
      await override(db, { view: true });
      await assert.rejects(override(db, { read: true }), { code: "23505" });
      await assert.rejects(
        db.query(
          "INSERT INTO public.vehicle_receipt_items(receipt_id,description,quantity) VALUES($1,'Invalid quantity',0)",
          [personal],
        ),
        { code: "23514" },
      );
      await readOnly(db, () =>
        asActor(db, actor, async () => {
          for (let n = 0; n < 2; n++) {
            assert.deepEqual(await modules(db), ["operations", "vehicles"]);
            assert.equal(await shopAccess(db), true);
            assert.equal(await receiptAccess(db), true);
          }
          for (const table of [
            "public.vehicle_receipts",
            "public.vehicle_receipt_items",
            "public.vehicle_shop_links",
          ])
            assert.equal(
              (
                await db.query(
                  "SELECT has_table_privilege('authenticated',$1,'INSERT,UPDATE,DELETE') AS mutation",
                  [table],
                )
              ).rows[0].mutation,
              false,
            );
        }),
      );
    });
  },
);
