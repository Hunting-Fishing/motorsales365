// Memory-only read-contract candidate proof, not production/HTTP acceptance.
// Supporting tables are synthetic/minimal. Pinned retained policies and their
// retained helper implementations run unchanged; no permissive vehicle policy
// is added to make staff/private-vehicle access pass. No live client is used.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const candidate = fs.readFileSync(
  new URL("20261014194659_customer_vehicle_activity_readers.sql", migrations),
  "utf8",
);
const recovery = fs.readFileSync(
  new URL("../../docs/evidence/customer-vehicle-activity-drop-review.sql", import.meta.url),
  "utf8",
);
const sha = (raw) => createHash("sha256").update(raw.replace(/\r\n/g, "\n")).digest("hex");
function pin(name, expected) {
  const raw = fs.readFileSync(new URL(name, migrations), "utf8");
  assert.ok(raw.length > 0 && raw.length < 256 * 1024);
  assert.equal(sha(raw), expected, `${name}: retained source drift`);
  return raw;
}
function section(raw, pattern) {
  const matches = [...raw.matchAll(pattern)];
  assert.equal(matches.length, 1, "expected one unchanged source section");
  return matches[0][0];
}
function fn(raw, name) {
  return section(
    raw,
    new RegExp(`^CREATE(?: OR REPLACE)? FUNCTION ${name}\\([\\s\\S]*?\\$\\$;`, "gm"),
  );
}
function policy(raw, name) {
  return section(raw, new RegExp(`^CREATE POLICY ${name}[\\s\\S]*?;`, "gm"));
}
const vehicleSource = pin(
  "20260525155935_31efaded-ef49-43e7-945b-f213f41edda7.sql",
  "d295c784c97c5ee99dfbec99e4255651350f2a600187f1431fe1b0d264c54d3f",
);
const publicRoleSource = pin(
  "20260501224406_1fde4d15-467c-4a50-a39e-089c25417e52.sql",
  "53dd7b960d83bbda344e9a1bb266c13ac4885b627ec2ca96e6fc96d2ceaa0bc7",
);
const nativeSource = pin(
  "20260713081838_b99aba93-f19b-4aec-b7a1-3bdb86faadc6.sql",
  "5ea2e85cf05bf006dcb684ef063f9ef15f38fdfcc9dccd2c050f4c0a5a115647",
);
const shopSource = pin(
  "20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql",
  "30dfd8df0c3537efb5155a8891804e00444b180f55e674b56d522e473e2f4144",
);
const roleSource = pin(
  "20260713081559_69ad9a73-edab-4719-b16e-38541b8ba91a.sql",
  "23169927a45a5c47406181fb4e2e2c049e5282698f31a840c17cdbc2725a4472",
);
const belongsSource = pin(
  "20260713081649_7763bb16-35c5-4c76-a8f9-36c3f58090ce.sql",
  "738cecf5f28c9cc3cce5e2980a6ebb5c324d18fbd5b92aeb151448c89afd7bb9",
);
const employeeSource = pin(
  "20260831124952_employee_operations_ledger.sql",
  "2386ee30a1b12cd124445adf3da3568c35e567e96aa9f7b83e6cd4211ccae6b2",
);
const moduleSource = pin(
  "20260901025637_add_driver_module_access.sql",
  "ee6d043f23fe25f7f849fdd2d2cc104983a0ae3594d2f269e22d748ad498cff8",
);
const businessSource = pin(
  "20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12.sql",
  "69afe9112531bd75d0bc68d4b31461d9e1c9aae41337ebdf79e6f40056447d62",
);
const receiptSource = pin(
  "20261014043336_vehicle_receipts_shared_history.sql",
  "73de34ce2f20b6fb0b2bb9b343fd48cbed7e09091e0000f931fc7aa51637d21d",
);
const installSource = pin(
  "20260831041834_associate_parts_order_lifecycle.sql",
  "3fc2cdc241821d00fb37d7c75684062ba5c01d0519092e76e37d09b82380f654",
);
const sourceStatements = [
  fn(publicRoleSource, "public\\.has_role"),
  fn(shopSource, "shop_manager\\.get_current_user_shop_id"),
  fn(roleSource, "shop_manager\\.has_role"),
  fn(belongsSource, "shop_manager\\.user_belongs_to_shop"),
  fn(employeeSource, "shop_manager\\.current_employee_profile"),
  fn(employeeSource, "shop_manager\\.is_shop_operations_manager"),
  fn(moduleSource, "shop_manager\\.employee_allowed_modules"),
  fn(businessSource, "public\\.is_business_owner"),
  fn(businessSource, "public\\.is_business_member"),
  fn(receiptSource, "vehicle_receipts_private\\.owns_vehicle"),
  fn(receiptSource, "vehicle_receipts_private\\.shop_access"),
  fn(receiptSource, "vehicle_receipts_private\\.receipt_access"),
  ...["Owners manage own vehicles", "Public vehicles readable", "Admins manage vehicles"].map(
    (name) => policy(vehicleSource, `"${name}"`),
  ),
  ...["sm_profiles_select_self", "sm_shops_select_members", "sm_customers_self_select"].map(
    (name) => policy(nativeSource, `"${name}"`),
  ),
  section(
    nativeSource,
    /^DO \$\$\r?\nDECLARE t text;\r?\nBEGIN\r?\n  FOR t IN SELECT unnest\(ARRAY\['customers','inventory_items','work_orders'\]\) LOOP[\s\S]*?END\$\$;/gm,
  ),
  section(
    nativeSource,
    /^DO \$\$\r?\nDECLARE t text;\r?\nBEGIN\r?\n  FOR t IN SELECT unnest\(ARRAY\['vehicles','appointments','invoices','quotes'\]\) LOOP[\s\S]*?END\$\$;/gm,
  ),
  policy(receiptSource, "receipt_read"),
  policy(receiptSource, "vehicle_shop_link_read"),
  policy(installSource, '"installed components: business members read"'),
];

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const staff = id(1),
  owner = id(2),
  nextOwner = id(3),
  outsider = id(4),
  otherStaff = id(5),
  admin = id(6);
const shop = id(101),
  otherShop = id(102),
  business = id(201),
  otherBusiness = id(202);
const customer = id(301),
  siblingCustomer = id(302),
  otherCustomer = id(303);
const native = id(401),
  siblingNative = id(402),
  otherNative = id(403);
const vehicle = id(501),
  otherVehicle = id(502),
  workOrder = id(601);
const signatures = ["receipts", "installations", "work_orders"].map(
  (kind) => `public.crm_customer_vehicle_${kind}(uuid,uuid)`,
);
const unavailable = { available: false, rows: [] };
const options = { concurrency: false, timeout: 30_000 };
const fixtureSql = `
 SET statement_timeout='3000ms'; SET lock_timeout='1000ms'; SET TIME ZONE 'UTC';
 CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
 CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
 CREATE ROLE service_role NOLOGIN NOSUPERUSER BYPASSRLS NOINHERIT;
 CREATE SCHEMA auth; CREATE SCHEMA shop_manager; CREATE SCHEMA vehicle_receipts_private;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
   SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
 $$;
 CREATE TYPE public.app_role AS ENUM('admin','user');
 CREATE TABLE public.user_roles(user_id uuid,role public.app_role);
 CREATE TABLE public.businesses(id uuid PRIMARY KEY,owner_id uuid);
 CREATE TABLE public.business_staff(business_id uuid,user_id uuid,active boolean,role text);
 CREATE TABLE shop_manager.shops(id uuid PRIMARY KEY,business_id uuid,organization_id uuid NOT NULL);
 CREATE TABLE shop_manager.profiles(id uuid PRIMARY KEY,user_id uuid,shop_id uuid);
 CREATE TABLE shop_manager.roles(id uuid PRIMARY KEY,name text);
 CREATE TABLE shop_manager.user_roles(user_id uuid,role_id uuid);
 CREATE TABLE shop_manager.shop_role_permissions(shop_id uuid,role_name text,module text,actions jsonb);
 CREATE TABLE shop_manager.customers(id uuid PRIMARY KEY,shop_id uuid NOT NULL,user_id uuid);
 CREATE TABLE shop_manager.vehicles(id uuid PRIMARY KEY,customer_id uuid);
 CREATE TABLE shop_manager.inventory_items(id uuid PRIMARY KEY,shop_id uuid);
 CREATE TABLE shop_manager.appointments(id uuid PRIMARY KEY,customer_id uuid);
 CREATE TABLE shop_manager.invoices(id uuid PRIMARY KEY,customer_id uuid);
 CREATE TABLE shop_manager.quotes(id uuid PRIMARY KEY,customer_id uuid);
 CREATE TABLE shop_manager.work_orders(id uuid PRIMARY KEY,shop_id uuid NOT NULL,customer_id uuid,
   vehicle_id uuid,work_order_number text,status text NOT NULL,created_at timestamptz NOT NULL,
   total_cost numeric,description text,customer_complaint text);
 CREATE TABLE public.vehicles(id uuid PRIMARY KEY,owner_user_id uuid NOT NULL,is_public boolean NOT NULL);
 CREATE TABLE public.vehicle_shop_links(shop_vehicle_id uuid PRIMARY KEY,vehicle_id uuid NOT NULL,
   shop_id uuid NOT NULL,active boolean NOT NULL,approved_by uuid NOT NULL,
   approved_at timestamptz NOT NULL DEFAULT now(),revoked_at timestamptz);
 CREATE TABLE public.vehicle_receipts(id uuid PRIMARY KEY,vehicle_id uuid,shop_vehicle_id uuid,
   created_by uuid NOT NULL,vendor text,purchased_on date,currency text NOT NULL,total numeric,
   status text NOT NULL,share_with_shop boolean NOT NULL,file_path text,file_name text,media_type text);
 CREATE TABLE public.installed_components(id uuid PRIMARY KEY,business_id uuid NOT NULL,work_order_id uuid,
   shop_manager_vehicle_id uuid,public_vehicle_id uuid,name_snapshot text NOT NULL,part_number_snapshot text,
   installed_quantity numeric(12,2) NOT NULL,installed_at timestamptz NOT NULL,installed_odometer_km integer,
   serial_number text,notes text,installer_user_id uuid);
 GRANT USAGE ON SCHEMA public,auth,shop_manager,vehicle_receipts_private TO authenticated,anon,service_role;
 GRANT SELECT ON shop_manager.shops,shop_manager.profiles,shop_manager.customers,shop_manager.vehicles,
   shop_manager.work_orders,public.vehicles,public.vehicle_shop_links,public.vehicle_receipts,
   public.installed_components TO authenticated;
 ALTER TABLE shop_manager.shops ENABLE ROW LEVEL SECURITY;
 ALTER TABLE shop_manager.profiles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE shop_manager.customers ENABLE ROW LEVEL SECURITY;
 ALTER TABLE shop_manager.vehicles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE shop_manager.work_orders ENABLE ROW LEVEL SECURITY;
 ALTER TABLE shop_manager.inventory_items ENABLE ROW LEVEL SECURITY;
 ALTER TABLE shop_manager.appointments ENABLE ROW LEVEL SECURITY;
 ALTER TABLE shop_manager.invoices ENABLE ROW LEVEL SECURITY;
 ALTER TABLE shop_manager.quotes ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.vehicle_shop_links ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.vehicle_receipts ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.installed_components ENABLE ROW LEVEL SECURITY;
`;

async function asActor(db, user = staff, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user ?? ""]);
  await db.exec(`SET ROLE ${role}`); // Closed fixture-only role enumeration in test callers.
  if (role === "authenticated") {
    assert.deepEqual(
      (
        await db.query(`SELECT current_user,rolsuper,rolbypassrls,
      row_security_active('public.vehicles') AS public_rls,
      row_security_active('shop_manager.customers') AS native_rls,
      row_security_active('public.vehicle_shop_links') AS link_rls
      FROM pg_roles WHERE rolname=current_user`)
      ).rows[0],
      {
        current_user: "authenticated",
        rolsuper: false,
        rolbypassrls: false,
        public_rls: true,
        native_rls: true,
        link_rls: true,
      },
    );
  }
}
async function operator(db, sql, params = []) {
  await db.exec("RESET ROLE");
  return db.query(sql, params);
}
async function read(db, kind, c = customer, v = native) {
  assert.ok(["receipts", "installations", "work_orders"].includes(kind));
  return (await db.query(`SELECT public.crm_customer_vehicle_${kind}($1,$2) AS result`, [c, v]))
    .rows[0].result;
}
async function allUnavailable(db, c = customer, v = native) {
  for (const kind of ["receipts", "installations", "work_orders"])
    assert.deepEqual(await read(db, kind, c, v), unavailable);
}
async function sourceSnapshot(db) {
  await db.exec("RESET ROLE");
  const catalog = (
    await db.query(`SELECT
    (SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'acl',c.relacl::text,
      'rls',c.relrowsecurity,'force',c.relforcerowsecurity) ORDER BY n.nspname,c.relname)
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname IN ('public','shop_manager') AND c.relkind='r') AS tables,
    (SELECT jsonb_agg(jsonb_build_object('table',polrelid::regclass::text,'name',polname,
      'roles',polroles::text,'using',pg_get_expr(polqual,polrelid),
      'check',pg_get_expr(polwithcheck,polrelid)) ORDER BY polrelid,polname) FROM pg_policy) AS policies,
    (SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
      'definition',md5(pg_get_functiondef(p.oid)),'acl',p.proacl::text) ORDER BY p.oid::regprocedure::text)
     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname IN ('public','auth','shop_manager','vehicle_receipts_private')
       AND NOT (p.proname IN ('crm_customer_vehicle_receipts','crm_customer_vehicle_installations',
         'crm_customer_vehicle_work_orders') AND p.pronargs=2
         AND p.proargtypes[0]='uuid'::regtype AND p.proargtypes[1]='uuid'::regtype)) AS functions
  `)
  ).rows[0];
  const data = {};
  for (const table of [
    "public.vehicles",
    "public.vehicle_shop_links",
    "public.vehicle_receipts",
    "public.installed_components",
    "shop_manager.work_orders",
    "shop_manager.customers",
    "shop_manager.vehicles",
    "shop_manager.shops",
    "shop_manager.profiles",
    "public.businesses",
    "public.business_staff",
    "public.user_roles",
    "shop_manager.roles",
    "shop_manager.user_roles",
    "shop_manager.shop_role_permissions",
  ])
    data[table] = (
      await db.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`)
    ).rows;
  return { catalog, data };
}
async function withFixture(run, { apply = true, privateVehicle = false } = {}) {
  const db = new PGlite("memory://");
  try {
    await db.exec(fixtureSql);
    for (const sql of sourceStatements) await db.exec(sql);
    await db.query("INSERT INTO public.businesses VALUES($1,$2),($3,$4)", [
      business,
      owner,
      otherBusiness,
      nextOwner,
    ]);
    await db.query(
      "INSERT INTO public.business_staff VALUES($1,$2,true,'manager'),($3,$2,true,'manager'),($3,$4,true,'manager')",
      [business, staff, otherBusiness, otherStaff],
    );
    await db.query("INSERT INTO shop_manager.shops VALUES($1,$2,$3),($4,$5,$6)", [
      shop,
      business,
      id(901),
      otherShop,
      otherBusiness,
      id(902),
    ]);
    await db.query(
      "INSERT INTO shop_manager.profiles VALUES($1,$1,$2),($3,$3,$2),($4,$4,$5),($6,$6,$2)",
      [staff, shop, owner, otherStaff, otherShop, admin],
    );
    await db.query("INSERT INTO shop_manager.roles VALUES($1,'manager')", [id(999)]);
    await db.query("INSERT INTO shop_manager.user_roles VALUES($1,$2),($3,$2),($4,$2),($5,$2)", [
      staff,
      id(999),
      owner,
      otherStaff,
      admin,
    ]);
    await db.query("INSERT INTO public.user_roles VALUES($1,'admin')", [admin]);
    await db.query(
      "INSERT INTO shop_manager.customers VALUES($1,$2,$3),($4,$2,NULL),($5,$6,NULL)",
      [customer, shop, owner, siblingCustomer, otherCustomer, otherShop],
    );
    await db.query("INSERT INTO shop_manager.vehicles VALUES($1,$2),($3,$4),($5,$6)", [
      native,
      customer,
      siblingNative,
      siblingCustomer,
      otherNative,
      otherCustomer,
    ]);
    await db.query("INSERT INTO public.vehicles VALUES($1,$2,$3),($4,$2,true)", [
      vehicle,
      owner,
      !privateVehicle,
      otherVehicle,
    ]);
    await db.query(
      "INSERT INTO public.vehicle_shop_links(shop_vehicle_id,vehicle_id,shop_id,active,approved_by) VALUES($1,$2,$3,true,$4)",
      [native, vehicle, shop, owner],
    );
    await db.query(
      `INSERT INTO shop_manager.work_orders(id,shop_id,customer_id,vehicle_id,work_order_number,status,created_at,total_cost,description,customer_complaint)
      VALUES($1,$2,$3,$4,'WO-001','open','2026-10-14T10:00:00Z',999,'secret description','secret complaint'),
      ($5,$2,$3,$6,'WRONG-VEHICLE','open','2026-10-14T10:00:00Z',0,NULL,NULL),
      ($7,$2,$8,$4,'WRONG-CUSTOMER','open','2026-10-14T10:00:00Z',0,NULL,NULL),
      ($9,$10,$3,$4,'WRONG-SHOP','open','2026-10-14T10:00:00Z',0,NULL,NULL)`,
      [
        workOrder,
        shop,
        customer,
        native,
        id(602),
        siblingNative,
        id(603),
        siblingCustomer,
        id(604),
        otherShop,
      ],
    );
    await db.query(
      `INSERT INTO public.vehicle_receipts VALUES
      ($1,$2,NULL,$3,NULL,NULL,'PHP',NULL,'confirmed',true,'secret/path','secret-name','image/png'),
      ($4,$2,$5,$6,'Shop supplier','2026-10-14','USD',20.50,'confirmed',false,NULL,NULL,NULL)`,
      [id(701), vehicle, owner, id(702), native, staff],
    );
    await db.query(
      `INSERT INTO public.installed_components VALUES
      ($1,$2,$3,$4,$5,'Oil filter','OF-1',1.25,'2026-10-14T10:00:00Z',12345,'secret serial','secret notes',$6),
      ($7,$2,NULL,$4,$5,'No-work-order part',NULL,2,'2026-10-13T10:00:00Z',NULL,NULL,NULL,$6)`,
      [id(801), business, workOrder, native, vehicle, staff, id(802)],
    );
    // Model common hosted defaults; candidate must explicitly remove these.
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
  "pins retained policy/helper sources, checks curated catalog subset and fixed reader projections",
  options,
  () => {
    assert.equal(
      JSON.parse(fs.readFileSync(new URL("../../package.json", import.meta.url))).devDependencies[
        "@electric-sql/pglite"
      ],
      "0.5.9",
    );
    const evidence = JSON.parse(
      fs.readFileSync(
        new URL(
          "../../docs/evidence/customer-activity-catalog-subset-2026-10-15.json",
          import.meta.url,
        ),
      ),
    );
    assert.equal(evidence.mode, "read-only-catalog-subset");
    assert.equal(evidence.project, "wjxaajgvddtrxxtocxen");
    assert.deepEqual(
      evidence.publicVehicle.allObservedPoliciesForThisTable.map((p) => p.name).sort(),
      ["Admins manage vehicles", "Owners manage own vehicles", "Public vehicles readable"],
    );
    assert.equal(
      evidence.installations.requiredColumns.installed_quantity,
      "numeric(12,2) NOT NULL",
    );
    assert.equal(evidence.native.tables["shop_manager.work_orders"].shop_id, "uuid NOT NULL");
    assert.equal(evidence.native.tables["shop_manager.shops"].business_id, "uuid");
    assert.throws(() => section("", /^CREATE POLICY/gm), /one unchanged/);
    assert.throws(
      () =>
        section(
          sourceStatements[0] + "\n" + sourceStatements[0],
          /^CREATE OR REPLACE FUNCTION[\s\S]*?\$\$;/gm,
        ),
      /one unchanged/,
    );
    assert.equal(
      (candidate.match(/CREATE FUNCTION public\.crm_customer_vehicle_/g) || []).length,
      3,
    );
    assert.equal((candidate.match(/LIMIT 26/g) || []).length, 3);
    assert.equal((candidate.match(/LANGUAGE sql STABLE SECURITY INVOKER/g) || []).length, 3);
    assert.equal((candidate.match(/SET search_path = ''/g) || []).length, 3);
    assert.doesNotMatch(
      candidate,
      /CREATE OR REPLACE|SECURITY DEFINER|CREATE TABLE|CREATE ROLE|ALTER TABLE|CREATE POLICY|CASCADE/,
    );
    assert.doesNotMatch(recovery, /CASCADE|DROP TABLE|ALTER TABLE|CREATE OR REPLACE/);
  },
);

test(
  "exact candidate preserves all source grants, policies, helpers and data while exposing narrow rows",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const before = await sourceSnapshot(db);
        await db.exec(candidate);
        assert.deepEqual(await sourceSnapshot(db), before);
        await asActor(db);
        const receipts = await read(db, "receipts");
        assert.equal(receipts.available, true);
        assert.deepEqual(
          receipts.rows.map((r) => r.id),
          [id(702), id(701)],
        );
        assert.deepEqual(receipts.rows[1], {
          id: id(701),
          vendor: null,
          purchased_on: null,
          currency: "PHP",
          total: null,
        });
        assert.equal(receipts.rows[0].currency, "USD");
        assert.equal(receipts.rows[0].total, 20.5);
        const installations = await read(db, "installations");
        assert.equal(installations.available, true);
        assert.equal(installations.rows[0].installed_quantity, 1.25);
        assert.equal(installations.rows[0].installed_odometer_km, 12345);
        assert.equal(installations.rows[0].installed_at, "2026-10-14T10:00:00+00:00");
        assert.equal(installations.rows[1].work_order_id, null);
        const workOrders = await read(db, "work_orders");
        assert.equal(workOrders.available, true);
        assert.deepEqual(
          workOrders.rows.map((r) => r.id),
          [workOrder],
        );
        for (const [result, keys] of [
          [receipts, ["id", "vendor", "purchased_on", "currency", "total"]],
          [
            installations,
            [
              "id",
              "name_snapshot",
              "part_number_snapshot",
              "installed_quantity",
              "installed_at",
              "installed_odometer_km",
              "work_order_id",
            ],
          ],
          [workOrders, ["id", "work_order_number", "status", "created_at"]],
        ]) {
          assert.deepEqual(Object.keys(result).sort(), ["available", "rows"]);
          for (const row of result.rows) assert.deepEqual(Object.keys(row).sort(), keys.sort());
          assert.doesNotMatch(
            JSON.stringify(result),
            /secret|owner_user_id|approved_by|business_id|created_by|file_path|media_type/,
          );
        }
        assert.deepEqual(await sourceSnapshot(db), before);
      },
      { apply: false },
    );
  },
);

test(
  "existing actual public-vehicle RLS keeps a private linked owner vehicle unavailable to staff",
  options,
  async () => {
    await withFixture(
      async (db) => {
        await asActor(db);
        assert.equal(
          (await db.query("SELECT count(*)::int n FROM public.vehicle_shop_links")).rows[0].n,
          1,
        );
        assert.equal(
          (await db.query("SELECT count(*)::int n FROM public.vehicles WHERE id=$1", [vehicle]))
            .rows[0].n,
          0,
        );
        await allUnavailable(db);
        await asActor(db, owner);
        assert.equal((await read(db, "receipts")).available, true);
        await asActor(db, admin);
        assert.equal((await read(db, "work_orders")).available, true);
        await asActor(db, outsider);
        await allUnavailable(db);
        await asActor(db, null);
        await allUnavailable(db);
      },
      { privateVehicle: true },
    );
  },
);

test(
  "missing, revoked, wrong-customer/native/shop/owner links fail closed without granting visibility",
  options,
  async () => {
    await withFixture(async (db) => {
      await asActor(db);
      await allUnavailable(db, siblingCustomer, native);
      await allUnavailable(db, customer, siblingNative);
      await allUnavailable(db, id(9999), native);
      await allUnavailable(db, null, native);
      await allUnavailable(db, customer, null);
      await asActor(db, otherStaff);
      await allUnavailable(db);
      await operator(
        db,
        "UPDATE public.vehicle_shop_links SET active=false WHERE shop_vehicle_id=$1",
        [native],
      );
      await asActor(db);
      await allUnavailable(db);
      await operator(
        db,
        "UPDATE public.vehicle_shop_links SET active=true,revoked_at=now() WHERE shop_vehicle_id=$1",
        [native],
      );
      await asActor(db);
      await allUnavailable(db);
      await operator(
        db,
        "UPDATE public.vehicle_shop_links SET revoked_at=NULL,shop_id=$1 WHERE shop_vehicle_id=$2",
        [otherShop, native],
      );
      await asActor(db);
      await allUnavailable(db);
      await operator(
        db,
        "UPDATE public.vehicle_shop_links SET shop_id=$1,approved_by=$2 WHERE shop_vehicle_id=$3",
        [shop, nextOwner, native],
      );
      await asActor(db);
      await allUnavailable(db);
      await operator(db, "DELETE FROM public.vehicle_shop_links WHERE shop_vehicle_id=$1", [
        native,
      ]);
      await asActor(db);
      await allUnavailable(db);
    });
  },
);

test(
  "A-to-B ownership change invalidates stale approval and excludes previous-owner personal receipts",
  options,
  async () => {
    await withFixture(async (db) => {
      await operator(db, "UPDATE public.vehicles SET owner_user_id=$1 WHERE id=$2", [
        nextOwner,
        vehicle,
      ]);
      await asActor(db);
      await allUnavailable(db);
      await operator(
        db,
        "UPDATE public.vehicle_shop_links SET approved_by=$1 WHERE shop_vehicle_id=$2",
        [nextOwner, native],
      );
      await operator(
        db,
        `INSERT INTO public.vehicle_receipts(id,vehicle_id,created_by,currency,total,status,share_with_shop)
      VALUES($1,$2,$3,'EUR',7,'confirmed',true)`,
        [id(703), vehicle, nextOwner],
      );
      await asActor(db);
      assert.deepEqual(
        (await read(db, "receipts")).rows.map((r) => r.id),
        [id(702), id(703)],
      );
      // No ownership epoch exists: equality alone cannot prove an A-to-B-to-A tenure.
      await operator(db, "UPDATE public.vehicles SET owner_user_id=$1 WHERE id=$2", [
        owner,
        vehicle,
      ]);
      await asActor(db);
      await allUnavailable(db);
      await operator(
        db,
        "UPDATE public.vehicle_shop_links SET approved_by=$1 WHERE shop_vehicle_id=$2",
        [owner, native],
      );
      await asActor(db);
      assert.deepEqual(
        (await read(db, "receipts")).rows.map((r) => r.id),
        [id(702), id(701)],
      );
      // Deliberate release gap: retaining A's approval through A->B->A
      // makes owner equality pass again. There is no immutable tenure epoch.
      await operator(db, "UPDATE public.vehicles SET owner_user_id=$1 WHERE id=$2", [
        nextOwner,
        vehicle,
      ]);
      await asActor(db);
      await allUnavailable(db);
      await operator(db, "UPDATE public.vehicles SET owner_user_id=$1 WHERE id=$2", [
        owner,
        vehicle,
      ]);
      await asActor(db);
      assert.equal((await read(db, "receipts")).available, true);
    });
  },
);

test(
  "draft/unshared/other-shop/other-vehicle/prior-owner receipts and all mismatched installation scopes stay excluded",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const [n, publicId, nativeId, creator, status, shared] of [
        [710, vehicle, null, owner, "draft", true],
        [711, vehicle, null, owner, "confirmed", false],
        [712, vehicle, siblingNative, staff, "confirmed", true],
        [713, otherVehicle, native, staff, "confirmed", false],
        [714, vehicle, null, nextOwner, "confirmed", true],
      ])
        await operator(
          db,
          `INSERT INTO public.vehicle_receipts(id,vehicle_id,shop_vehicle_id,created_by,currency,status,share_with_shop)
      VALUES($1,$2,$3,$4,'PHP',$5,$6)`,
          [id(n), publicId, nativeId, creator, status, shared],
        );
      for (const [n, b, v, p, w] of [
        [810, otherBusiness, native, vehicle, null],
        [811, business, siblingNative, vehicle, null],
        [812, business, native, otherVehicle, null],
        [813, business, native, vehicle, id(602)],
        [814, business, native, vehicle, id(603)],
        [815, business, native, vehicle, id(604)],
      ])
        await operator(
          db,
          `INSERT INTO public.installed_components(id,business_id,shop_manager_vehicle_id,public_vehicle_id,work_order_id,
        name_snapshot,installed_quantity,installed_at) VALUES($1,$2,$3,$4,$5,'Excluded part',1,now())`,
          [id(n), b, v, p, w],
        );
      await asActor(db);
      assert.equal(
        (
          await db.query("SELECT count(*)::int n FROM public.installed_components WHERE id=$1", [
            id(810),
          ])
        ).rows[0].n,
        1,
        "wrong-business row is RLS-visible, so explicit resolved business match is tested",
      );
      assert.deepEqual(
        (await read(db, "receipts")).rows.map((r) => r.id),
        [id(702), id(701)],
      );
      assert.deepEqual(
        (await read(db, "installations")).rows.map((r) => r.id),
        [id(801), id(802)],
      );
      assert.deepEqual(
        (await read(db, "work_orders")).rows.map((r) => r.id),
        [workOrder],
      );
      await operator(db, "UPDATE shop_manager.shops SET business_id=NULL WHERE id=$1", [shop]);
      await asActor(db);
      assert.deepEqual(await read(db, "installations"), { available: true, rows: [] });
      assert.equal((await read(db, "receipts")).available, true);
    });
  },
);

test(
  "all readers return exactly 26 deterministic most-recent rows for tied dates",
  options,
  async () => {
    await withFixture(async (db) => {
      for (let n = 0; n < 28; n++) {
        await operator(
          db,
          `INSERT INTO public.vehicle_receipts(id,vehicle_id,created_by,currency,status,share_with_shop,purchased_on)
        VALUES($1,$2,$3,'PHP','confirmed',true,'2026-10-15')`,
          [id(1000 + n), vehicle, owner],
        );
        await operator(
          db,
          `INSERT INTO public.installed_components(id,business_id,shop_manager_vehicle_id,public_vehicle_id,
        name_snapshot,installed_quantity,installed_at) VALUES($1,$2,$3,$4,'Tied part',1,'2026-10-15T10:00:00Z')`,
          [id(2000 + n), business, native, vehicle],
        );
        await operator(
          db,
          `INSERT INTO shop_manager.work_orders(id,shop_id,customer_id,vehicle_id,status,created_at)
        VALUES($1,$2,$3,$4,'open','2026-10-15T10:00:00Z')`,
          [id(3000 + n), shop, customer, native],
        );
      }
      await asActor(db);
      for (const [kind, start] of [
        ["receipts", 1000],
        ["installations", 2000],
        ["work_orders", 3000],
      ]) {
        const result = await read(db, kind);
        assert.equal(result.available, true);
        assert.equal(result.rows.length, 26);
        assert.deepEqual(
          result.rows.map((r) => r.id),
          Array.from({ length: 26 }, (_, i) => id(start + 27 - i)),
        );
        assert.deepEqual(await read(db, kind), result);
      }
    });
  },
);

test(
  "SQL/STABLE/invoker/empty-search-path and exact new-function ACLs deny anon/service execution",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const signature of signatures) {
        const row = (
          await db.query(
            `SELECT p.prosecdef,p.provolatile,p.proconfig,l.lanname,p.proowner::regrole::text AS owner,
        md5(replace(p.prosrc,chr(13),'')) AS body,
        (SELECT array_agg(CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END ORDER BY a.grantee::regrole::text)
          FROM aclexplode(p.proacl) a) AS grantees
        FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=$1::regprocedure`,
            [signature],
          )
        ).rows[0];
        assert.equal(row.prosecdef, false);
        assert.equal(row.provolatile, "s");
        assert.equal(row.lanname, "sql");
        assert.deepEqual(row.proconfig, ['search_path=""']);
        assert.equal(row.owner, "postgres");
        assert.deepEqual(row.grantees.sort(), ["authenticated", "postgres"]);
      }
      await asActor(db, null, "anon");
      for (const kind of ["receipts", "installations", "work_orders"])
        await assert.rejects(read(db, kind), { code: "42501" });
      await asActor(db, staff, "service_role");
      for (const kind of ["receipts", "installations", "work_orders"])
        await assert.rejects(read(db, kind), { code: "42501" });
    });
  },
);

test(
  "candidate CREATE collision or unexpected inherited defaults abort atomically without replacing objects",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const before = await sourceSnapshot(db);
        await db.exec(
          "CREATE FUNCTION public.crm_customer_vehicle_installations(uuid,uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$",
        );
        const existing = (
          await db.query(
            "SELECT pg_get_functiondef('public.crm_customer_vehicle_installations(uuid,uuid)'::regprocedure) AS definition",
          )
        ).rows[0].definition;
        await assert.rejects(db.exec(candidate), { code: "42723" });
        await db.exec("ROLLBACK");
        assert.equal(
          (
            await db.query(
              "SELECT to_regprocedure('public.crm_customer_vehicle_receipts(uuid,uuid)') AS target",
            )
          ).rows[0].target,
          null,
        );
        assert.equal(
          (
            await db.query(
              "SELECT pg_get_functiondef('public.crm_customer_vehicle_installations(uuid,uuid)'::regprocedure) AS definition",
            )
          ).rows[0].definition,
          existing,
        );
        await db.exec(
          "DROP FUNCTION public.crm_customer_vehicle_installations(uuid,uuid) RESTRICT",
        );
        await db.exec(
          "CREATE ROLE fixture_observer NOLOGIN; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO fixture_observer",
        );
        await assert.rejects(db.exec(candidate), { code: "55000" });
        await db.exec("ROLLBACK");
        for (const signature of signatures)
          assert.equal(
            (await db.query("SELECT to_regprocedure($1) AS target", [signature])).rows[0].target,
            null,
          );
        await db.exec(
          "ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM fixture_observer",
        );
        await db.exec("GRANT authenticated TO service_role WITH INHERIT TRUE");
        await assert.rejects(db.exec(candidate), { code: "55000" });
        await db.exec("ROLLBACK");
        for (const signature of signatures)
          assert.equal(
            (await db.query("SELECT to_regprocedure($1) AS target", [signature])).rows[0].target,
            null,
          );
        assert.deepEqual(await sourceSnapshot(db), before);
      },
      { apply: false },
    );
  },
);

test(
  "unavailable differs from visible-but-empty, source permission errors propagate, and legacy authority is not repaired",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec("REVOKE SELECT ON public.vehicle_receipts FROM authenticated");
      await asActor(db);
      await assert.rejects(read(db, "receipts"), { code: "42501" });
      assert.equal((await read(db, "installations")).available, true);
      await operator(db, "GRANT SELECT ON public.vehicle_receipts TO authenticated");
      await operator(db, "DELETE FROM public.vehicle_receipts");
      await operator(db, "DELETE FROM public.installed_components");
      await operator(db, "DELETE FROM shop_manager.work_orders");
      await asActor(db);
      for (const kind of ["receipts", "installations", "work_orders"])
        assert.deepEqual(await read(db, kind), { available: true, rows: [] });
      await operator(db, "UPDATE shop_manager.profiles SET id=$1 WHERE user_id=$2", [
        id(9901),
        staff,
      ]);
      await asActor(db);
      await allUnavailable(db);
      await operator(db, "SELECT 1");
      assert.deepEqual(
        (await db.query("SELECT id,user_id FROM shop_manager.profiles WHERE user_id=$1", [staff]))
          .rows,
        [{ id: id(9901), user_id: staff }],
      );
    });
  },
);

test(
  "unchanged review-only recovery needs opt-in, drops only the three readers, and preserves sources",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec(
        "CREATE FUNCTION public.crm_customer_vehicle_receipts(uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$",
      );
      const before = await sourceSnapshot(db);
      await assert.rejects(db.exec(recovery), { code: "55000" });
      await db.exec(
        "BEGIN; SET LOCAL motorsales365.customer_vehicle_activity_drop_review='operator-reviewed-drop'",
      );
      await db.exec(recovery);
      await db.exec("COMMIT");
      for (const signature of signatures)
        assert.equal(
          (await db.query("SELECT to_regprocedure($1) AS target", [signature])).rows[0].target,
          null,
        );
      assert.notEqual(
        (
          await db.query(
            "SELECT current_setting('motorsales365.customer_vehicle_activity_drop_review',true) AS optin",
          )
        ).rows[0].optin,
        "operator-reviewed-drop",
      );
      assert.notEqual(
        (
          await db.query(
            "SELECT to_regprocedure('public.crm_customer_vehicle_receipts(uuid)') AS target",
          )
        ).rows[0].target,
        null,
      );
      assert.deepEqual(await sourceSnapshot(db), before);
    });
  },
);

test(
  "recovery refuses definition/owner/ACL drift and RESTRICT dependency failure rolls all drops back",
  options,
  async () => {
    await withFixture(async (db) => {
      const attempt = async () => {
        await db.exec(
          "BEGIN; SET LOCAL motorsales365.customer_vehicle_activity_drop_review='operator-reviewed-drop'",
        );
        try {
          await db.exec(recovery);
          assert.fail("recovery should have failed");
        } finally {
          await db.exec("ROLLBACK");
        }
      };
      const original = (
        await db.query(
          "SELECT pg_get_functiondef('public.crm_customer_vehicle_receipts(uuid,uuid)'::regprocedure) AS definition",
        )
      ).rows[0].definition;
      await db.exec(
        "CREATE OR REPLACE FUNCTION public.crm_customer_vehicle_receipts(_customer_id uuid,_shop_vehicle_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT '{}'::jsonb $$",
      );
      await assert.rejects(attempt(), { code: "55000" });
      await db.exec(original);
      await db.exec("ALTER FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid) VOLATILE");
      await assert.rejects(attempt(), { code: "55000" });
      await db.exec("ALTER FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid) STABLE");
      await db.exec("ALTER FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid) STRICT");
      await assert.rejects(attempt(), { code: "55000" });
      await db.exec(
        "ALTER FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid) CALLED ON NULL INPUT",
      );
      await db.exec(
        "GRANT EXECUTE ON FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid) TO anon",
      );
      await assert.rejects(attempt(), { code: "55000" });
      await db.exec(
        "REVOKE EXECUTE ON FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid) FROM anon RESTRICT",
      );
      await db.exec(
        "ALTER FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid) OWNER TO service_role",
      );
      await assert.rejects(attempt(), { code: "55000" });
      await db.exec(
        "ALTER FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid) OWNER TO postgres",
      );
      await db.exec(
        "REVOKE ALL ON FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid) FROM service_role RESTRICT",
      );
      await db.exec(
        `CREATE VIEW public.fixture_reader_dependency AS SELECT public.crm_customer_vehicle_work_orders('${customer}'::uuid,'${native}'::uuid) AS result`,
      );
      await assert.rejects(attempt(), { code: "2BP01" });
      for (const signature of signatures)
        assert.notEqual(
          (await db.query("SELECT to_regprocedure($1) AS target", [signature])).rows[0].target,
          null,
        );
    });
  },
);

test(
  "recovery refuses identical-body SETOF/default-argument replacements rather than dropping API drift",
  options,
  async () => {
    await withFixture(async (db) => {
      const signature = "public.crm_customer_vehicle_receipts(uuid,uuid)";
      const original = (
        await db.query("SELECT pg_get_functiondef($1::regprocedure) AS definition", [signature])
      ).rows[0].definition;
      const metadata = async () =>
        (
          await db.query(
            `SELECT proretset,pronargdefaults,provariadic,proargnames,proargmodes,
      prorettype::regtype::text AS result_type,prosecdef,provolatile,proconfig,proowner::regrole::text AS owner,
      md5(replace(prosrc,chr(13),'')) AS body_md5,proacl::text AS acl
      FROM pg_proc WHERE oid=$1::regprocedure`,
            [signature],
          )
        ).rows[0];
      const before = await metadata();
      assert.equal(before.proretset, false);
      assert.equal(before.pronargdefaults, 0);
      assert.equal(before.provariadic, 0);
      assert.deepEqual(before.proargnames, ["_customer_id", "_shop_vehicle_id"]);
      assert.equal(before.proargmodes, null);
      const replace = async (definition) => {
        await db.exec("DROP FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid) RESTRICT");
        await db.exec(definition);
        // Match every reviewed grant: denial must detect the API-shape drift,
        // not accidentally pass because hosted default ACLs differ after CREATE.
        await db.exec(`REVOKE ALL ON FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid)
        FROM PUBLIC,anon,authenticated,service_role RESTRICT;
        GRANT EXECUTE ON FUNCTION public.crm_customer_vehicle_receipts(uuid,uuid) TO authenticated`);
      };
      const refuse = async () => {
        await db.exec(
          "BEGIN; SET LOCAL motorsales365.customer_vehicle_activity_drop_review='operator-reviewed-drop'",
        );
        try {
          await assert.rejects(db.exec(recovery), { code: "55000" });
        } finally {
          await db.exec("ROLLBACK");
        }
        for (const target of signatures)
          assert.notEqual(
            (await db.query("SELECT to_regprocedure($1) AS target", [target])).rows[0].target,
            null,
          );
      };
      const setReturning = original.replace("RETURNS jsonb", "RETURNS SETOF jsonb");
      assert.notEqual(setReturning, original);
      await replace(setReturning);
      const afterSet = await metadata();
      assert.deepEqual({ ...afterSet, proretset: false }, before);
      await refuse();
      const defaultArgument = original.replace(
        "_shop_vehicle_id uuid)",
        "_shop_vehicle_id uuid DEFAULT NULL::uuid)",
      );
      assert.notEqual(defaultArgument, original);
      await replace(defaultArgument);
      const afterDefault = await metadata();
      assert.deepEqual({ ...afterDefault, pronargdefaults: 0 }, before);
      await refuse();
      await replace(original);
      assert.deepEqual(await metadata(), before);
    });
  },
);
