// MEMORY-ONLY selected PLATFORM public.user_roles policy/INSERT forward chain.
// Not shop_manager roles, accepted authority, trusted JWT/human attribution,
// whole source history, hosted API, concurrent/session or production proof.
// Six actual tables/constraints/policies and thirteen unchanged source functions
// execute. Auth users/profiles are explicit projected SYNTHETIC read supports.
// Seeds precede attachments; auth bootstrap/profile fanouts and staff-domain
// partner tables are OMITTED, never permissive stubs. Nonstaff accreditation
// returns through the real observed July body. The absent partner branch is a
// deliberate boundary, not a repaired or complete provisioning workflow.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../../../", import.meta.url);
const sha = (text) => createHash("sha256").update(text).digest("hex");
const md5 = (text) => createHash("md5").update(text).digest("hex");
function readPinned(path, expected, max = 512 * 1024) {
  const bytes = fs.readFileSync(new URL(path, root));
  assert.ok(bytes.length > 0 && bytes.length <= max, `${path}: bounded UTF8 bytes`);
  const raw = bytes.toString("utf8");
  assert.ok(Buffer.from(raw, "utf8").equals(bytes), `${path}: exact UTF8`);
  const text = raw.replace(/\r\n/g, "\n");
  assert.equal(sha(text), expected, `${path}: LF pin`);
  return text;
}
const sourcePins = {
  base: [
    "20260501224406_1fde4d15-467c-4a50-a39e-089c25417e52",
    "53dd7b960d83bbda344e9a1bb266c13ac4885b627ec2ca96e6fc96d2ceaa0bc7",
  ],
  salesEnum: [
    "20260511140502_bce2adb4-7c11-477f-89ef-bdf9ce1b4185",
    "dd2548b0b43993e1dfc2e8455ebd8b5c3d9de8f5ba493ee1de5d9aa9cb23571a",
  ],
  moderation: [
    "20260512023916_08c3429a-e992-4bc3-ae1c-118ace98df45",
    "eb1890a93e8bb1698619587218698f3c4eddb6bc8422d89930fa98ca192b46f6",
  ],
  salesLevels: [
    "20260605033802_58c5391b-eb0e-40fd-babd-8203a211081e",
    "7437c8ffbea865bedcd89873c016e37d46757fbe0a2d63dfd79c5ae42abc5c6b",
  ],
  staff: [
    "20260512034115_20d8dec1-5c0e-44b9-b23b-bf899ef89f48",
    "4ebb50a031d04e6f96aaa529d9ea9585dcbd8a3b428104ad257ebff530076f15",
  ],
  staffCreate: [
    "20260512071955_7309943a-34a5-4e6d-a9ee-315cb2cdb12b",
    "8114af11dcb63ada611a0af3e278d29f185fbf9bfb3e639707bae282bd4a1b9d",
  ],
  staffAudit: [
    "20260512100854_68ca1079-f761-4859-9bb7-e42aaac54f01",
    "28d011c7d05428a3ac72d72ab6b10d71cb7c359ea4e689560ba4584f7e2c3a36",
  ],
  staffOwn: [
    "20260526135703_84f307b7-e94c-43dc-aeb6-bc64b7791a18",
    "97649b737a3819a86e37773dce6f0d3747cde777b75726cb4670659e5d2e8dc2",
  ],
  staffSalesDrop: [
    "20260619180927_a58c4f00-1cfa-4714-b52d-272bade66b23",
    "ca4f2dc6d6cdb9d1c869a30c1ee17a178dea5a90b5d0897c132eee3e03c46690",
  ],
  staffAdvertisingDrop: [
    "20260626051831_65f37d9e-5d7f-4ee7-a9fe-3e5ea97f2aae",
    "193a001910e1ba07cb5deb51a381acb02001aa5b60d605f5db20f314da692a06",
  ],
  sales: [
    "20260605050625_ab3ca880-2df9-4ae9-865f-cd1ca5c84255",
    "c6d06a6f89cf3900eb765387e0e518993331430c80fd708f2fe91df78e29765f",
  ],
  assignment: [
    "20260619191109_b6c5a81a-a8ea-4168-b767-e1e21a1b67c9",
    "af6fba63a04970e5d3b634f92b3b8e203cecead708e372e5a2df4285d1f987d0",
  ],
  salesPolicy: [
    "20260627112833_1ec2290c-82f7-4ce8-9c26-b00513855013",
    "a3f0eb812e4fd74e53af824ba72ee3e0fc80573646a26f0508194628a42d8901",
  ],
  timestamp: [
    "20260627150439_5c3d6dc8-8f14-45b1-9eb3-dc261579364b",
    "904dca2383a666cdae96b1723e744f257f63c723d4695040214af61c34d49b77",
  ],
  supplier: [
    "20260704080518_4e24ea68-0ef0-4482-862a-e3dd6e601dd8",
    "badfe6ebef88cafbc7b8a4cb66b1969b1cb3257a8300338729d492fa0cb44b1f",
  ],
  accreditation: [
    "20260706042027_d7ff3b5e-60ff-4d87-ad68-c6934d53d076",
    "edc61be0bec4265ad933e6a22c834e2103aa61f07fd9e1a951ffe84f0170ed71",
  ],
  commission: [
    "20260706053153_e5511901-f040-4b61-b703-264d0911ac16",
    "c12e33b4d3ff6c5edb410776bae8619e9610982f90f0d487fa92ad66aaac0373",
  ],
  territory: [
    "20260706054357_10431f45-ac66-46e5-a269-94edb188c7ea",
    "a4cf61af8feea22c5368ffa641775f9255931cf0cb79ff4e50671e530cb633fd",
  ],
};
const sources = Object.fromEntries(
  Object.entries(sourcePins).map(([key, [name, hash]]) => [
    key,
    readPinned(`supabase/migrations/${name}.sql`, hash),
  ]),
);
const selections = {};
function select(key, source, marker, end = ";") {
  const raw = sources[source];
  assert.equal(raw.split(marker).length, 2, `${key}: one start`);
  const start = raw.indexOf(marker),
    last = raw.indexOf(end, start + marker.length);
  assert.ok(last >= start, `${key}: complete end`);
  const text = raw.slice(start, last + end.length);
  selections[key] = {
    source,
    marker,
    end,
    firstLine: raw.slice(0, start).split("\n").length,
    lastLine: raw.slice(0, last + end.length).split("\n").length,
    sha256Lf: sha(text),
    bytes: Buffer.byteLength(text),
  };
  return text;
}
function fn(key, source, name) {
  const text = select(key, source, `CREATE OR REPLACE FUNCTION public.${name}(`, "$$;");
  assert.equal(text.split("$$").length, 3);
  selections[key].bodyMd5Lf = md5(text.split("$$")[1]);
  return text;
}
const signatures = {
  hasRole: "public.has_role(uuid,public.app_role)",
  moderate: "public.can_moderate(uuid)",
  assigned: "public.is_sales_assigned_user(uuid,uuid)",
  code: "public.gen_referral_code(text)",
  staff: "public.tg_create_staff_referral()",
  sales: "public.tg_create_sales_rep_profile()",
  territory: "public.auto_setup_sales_rep_territory(uuid)",
  territoryTrigger: "public.trg_auto_setup_sales_rep_territory()",
  accredit: "public.accredit_staff_partner(uuid)",
  accreditTrigger: "public.tg_staff_referrals_accredit()",
  audit: "public.tg_staff_referral_audit()",
  auditInsert: "public.tg_staff_referral_audit_insert()",
  timestamp: "public.tg_set_updated_at()",
};
const functions = {
  hasRole: fn("hasRole", "base", "has_role"),
  moderate: fn("moderate", "moderation", "can_moderate"),
  assigned: fn("assigned", "assignment", "is_sales_assigned_user"),
  code: fn("code", "staffCreate", "gen_referral_code"),
  staff: fn("staffFunction", "staffCreate", "tg_create_staff_referral"),
  sales: fn("salesFunction", "sales", "tg_create_sales_rep_profile"),
  territory: fn("territoryFunction", "territory", "auto_setup_sales_rep_territory"),
  territoryTrigger: fn("territoryTrigger", "territory", "trg_auto_setup_sales_rep_territory"),
  accredit: fn("accredit", "accreditation", "accredit_staff_partner"),
  accreditTrigger: fn("accreditTrigger", "accreditation", "tg_staff_referrals_accredit"),
  audit: fn("auditFunction", "staffAudit", "tg_staff_referral_audit"),
  auditInsert: fn("auditInsert", "staffAudit", "tg_staff_referral_audit_insert"),
  timestamp: fn("timestampFunction", "timestamp", "tg_set_updated_at"),
};
const ddl = {
  appEnum: select("appEnum", "base", "CREATE TYPE public.app_role AS ENUM"),
  salesEnum: select("salesEnum", "salesEnum", "ALTER TYPE public.app_role ADD VALUE"),
  levelEnums: ["sales_junior", "sales_senior", "sales_manager"].map((role) =>
    select(role, "salesLevels", `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS '${role}'`),
  ),
  staffEnums: ["moderator", "support", "advertising"].map((role) =>
    select(role, "moderation", `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS '${role}'`),
  ),
  subjectEnum: select("subjectEnum", "sales", "CREATE TYPE public.sales_rep_subject AS ENUM"),
  sourceEnum: select("sourceEnum", "sales", "CREATE TYPE public.sales_rep_source AS ENUM"),
  supplier: select("supplier", "supplier", "ALTER TYPE public.sales_rep_subject ADD VALUE"),
  userRoles: select("userRoles", "base", "CREATE TABLE public.user_roles ("),
  staff: select("staffTable", "staff", "CREATE TABLE public.staff_referrals ("),
  audit: select("auditTable", "staffAudit", "CREATE TABLE public.staff_referral_audit ("),
  salesProfiles: select("salesProfiles", "sales", "CREATE TABLE public.sales_rep_profiles ("),
  territories: select("territories", "sales", "CREATE TABLE public.sales_rep_territories ("),
  assignments: select("assignments", "sales", "CREATE TABLE public.sales_rep_assignments ("),
  commission: select("commission", "commission", "ALTER TABLE public.sales_rep_profiles"),
  policies: [
    select("rolesOwn", "base", 'CREATE POLICY "Users can view own roles"'),
    select("rolesAdmin", "base", 'CREATE POLICY "Admins manage roles"'),
    select("rolesSales", "salesPolicy", 'CREATE POLICY "Sales view user_roles"'),
    select("staffAdmin", "staff", 'CREATE POLICY "Admins manage staff_referrals"'),
    select("staffOwn", "staffOwn", 'CREATE POLICY "Staff read own referral row"'),
    ...["Admins read sr audit", "Admins insert sr audit"].map((name) =>
      select(name, "staffAudit", `CREATE POLICY "${name}"`),
    ),
    ...[
      "Rep can view own profile",
      "Rep can upsert own profile",
      "Rep can update own profile",
      "Admins manage all rep profiles",
      "Rep manages own territories",
      "Admins manage all territories",
      "Rep views own assignments",
      "Admins manage all assignments",
    ].map((name) => select(name, "sales", `CREATE POLICY "${name}"`)),
  ],
  indexes: [
    ...["idx_staff_referrals_code", "idx_staff_referrals_user"].map((name) =>
      select(name, "staff", `CREATE INDEX ${name}`),
    ),
    ...["idx_sr_audit_staff", "idx_sr_audit_created"].map((name) =>
      select(name, "staffAudit", `CREATE INDEX ${name}`),
    ),
    ...[
      "idx_sales_rep_territories_rep",
      "idx_sales_rep_territories_geo",
      "idx_sales_rep_assignments_rep",
    ].map((name) => select(name, "sales", `CREATE INDEX ${name}`)),
    select("activeAssignment", "sales", "CREATE UNIQUE INDEX uniq_active_assignment"),
  ],
  attachments: [
    select("staffTimestamp", "staff", "CREATE TRIGGER trg_staff_referrals_updated"),
    select("roleStaff", "staffCreate", "CREATE TRIGGER trg_create_staff_referral"),
    select("auditUpdateAttachment", "staffAudit", "CREATE TRIGGER staff_referral_audit_trg"),
    select("auditInsertAttachment", "staffAudit", "CREATE TRIGGER staff_referral_audit_insert_trg"),
    select("salesTimestamp", "sales", "CREATE TRIGGER trg_sales_rep_profiles_updated"),
    select("assignmentTimestamp", "sales", "CREATE TRIGGER trg_sales_rep_assignments_updated"),
    select("roleSales", "sales", "CREATE TRIGGER trg_user_roles_create_sales_rep"),
    select(
      "roleTerritory",
      "territory",
      "CREATE TRIGGER trg_auto_setup_sales_rep_territory_on_role",
    ),
    select("staffAccredit", "accreditation", "CREATE TRIGGER staff_referrals_accredit"),
  ],
};
// These drops are pinned source correspondence, not full historical policy replay.
const policyDrops = [
  select("staffSalesDrop", "staffSalesDrop", 'DROP POLICY IF EXISTS "Sales read staff_referrals"'),
  select(
    "staffAdvertisingDrop",
    "staffAdvertisingDrop",
    'DROP POLICY IF EXISTS "Advertising read staff_referrals"',
  ),
];
const observation = {
  path: "docs/evidence/platform-role-catalog-2026-10-15.json",
  sha256Lf: "78586245e5426261006a7381724c68315a4dd11b5729b0635a26aad4b953fcda",
};
const observed = JSON.parse(readPinned(observation.path, observation.sha256Lf, 128 * 1024));
assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
assert.equal(observed.observedAtUtc, "2026-10-15T05:15:07.018072");
assert.equal(observed.serverVersion, "17.6");
assert.deepEqual(
  [
    observed.tables.length,
    observed.columns.length,
    observed.constraints.length,
    observed.indexes.length,
    observed.policies.length,
    observed.triggers.length,
    observed.functions.length,
  ],
  [6, 60, 16, 17, 15, 11, 18],
);
const catalogQuery = {
  path: "scripts/ci/platform-role-catalog-review.sql",
  sha256Lf: "c8163fdf9419afbe6bf27157cd53f366b42731f575a2fb78478962ae4a5690a0",
};
const querySource = readPinned(catalogQuery.path, catalogQuery.sha256Lf, 16 * 1024);
assert.equal(querySource.split("WITH selected_relations AS (").length, 2);
assert.equal(querySource.split(") catalog;").length, 2);
const catalogSql = querySource.slice(
  querySource.indexOf("WITH selected_relations AS ("),
  querySource.indexOf(") catalog;") + ") catalog;".length,
);
for (const [key, signature] of Object.entries(signatures)) {
  const saved = observed.functions.find((value) => value.signature === signature);
  assert.ok(saved, `${key}: observed signature`);
  assert.equal(
    md5(functions[key].split("$$")[1]),
    saved.bodyMd5Lf,
    `${key}: source body correspondence`,
  );
}
assert.equal(
  observed.functions.some((value) => value.signature === "public.request_jwt_role()"),
  false,
);
const pins = {
  sources: sourcePins,
  selections,
  observation,
  catalogQuery,
  catalogSelect: { sha256Lf: sha(catalogSql), bytes: Buffer.byteLength(catalogSql) },
  exclusions: {
    auth: "Two observed auth.users attachments and their bootstrap/internal-org/accreditation dependencies omitted; no auth INSERT trigger execution",
    profiles:
      "Six selected read columns, synthetic constraints/RLS/deny-client policies and seed data; other profile fields/writers/incoming dependencies omitted",
    partner:
      "Real OLD July accreditation used only through nonstaff-domain return; partner application/partner tables and staff-domain downstream are absent, not stubbed",
    authority:
      "No new grants or role decisions recommended; fixture admin/global roles are synthetic existing state, not accepted business ownership or human authorization",
    temporal:
      "Dated selected catalog reproduction only, not source-history adoption, live incident, hosted JWT/session/offboarding/concurrency proof",
    nonRow:
      "ALL observed table grants retained, including nonrow rights; RLS DML denial does not establish write containment; effective MAINTAIN absent from capture",
  },
};
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const id = Object.freeze({
  admin: uuid(1),
  ordinary: uuid(2),
  moderator: uuid(3),
  sales: uuid(4),
  target: uuid(5),
  other: uuid(6),
  nullEmail: uuid(7),
  staffDomain: uuid(8),
  missing: uuid(999),
  roleOrdinary: uuid(102),
  roleTarget: uuid(105),
});
const tables = observed.tables.map((value) => value.table);

async function catalog(db) {
  const path = (await db.query("SELECT pg_catalog.current_setting('search_path') value")).rows[0]
    .value;
  await db.query("SELECT pg_catalog.set_config('search_path','pg_catalog,pg_temp',false)");
  try {
    const { observedAtUtc, ...selected } = (await db.query(catalogSql)).rows[0].catalog;
    return selected;
  } finally {
    await db.query("SELECT pg_catalog.set_config('search_path',$1,false)", [path]);
  }
}
async function assertObservedSubset(db) {
  const actual = await catalog(db);
  for (const facet of ["tables", "enums", "policies", "indexes"])
    assert.deepEqual(actual[facet], observed[facet], `${facet}: exact selected metadata`);
  const shape = (values) =>
    values.map(({ position, ...value }) =>
      ["profiles", "users"].includes(value.table) ? value : { ...value, position },
    );
  assert.deepEqual(
    shape(actual.columns),
    shape(observed.columns),
    "Exact selected columns except synthetic support physical positions",
  );
  const nn = (
    await db.query(
      `SELECT k.conname name,pg_catalog.cardinality(k.conkey) size,k.convalidated valid,
    EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=k.conrelid AND a.attnum=k.conkey[1] AND a.attnotnull AND NOT a.attisdropped) backed
    FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=ANY($1::pg_catalog.text[]) AND k.contype='n' ORDER BY k.conname`,
      [tables],
    )
  ).rows;
  assert.equal(nn.length, actual.constraints.filter((value) => value.type === "n").length);
  for (const entry of nn)
    assert.deepEqual([entry.size, entry.valid, entry.backed], [1, true, true]);
  assert.deepEqual(
    actual.constraints.filter((value) => value.type !== "n"),
    observed.constraints,
    "Only backed PG18 NOT NULL catalog entries excluded",
  );
  const expectedFunctions = observed.functions.filter((value) =>
    Object.values(signatures).includes(value.signature),
  );
  assert.equal(actual.functions.length, 13);
  assert.equal(expectedFunctions.length, 13);
  assert.equal(new Set(actual.functions.map((value) => value.signature)).size, 13);
  assert.deepEqual(
    new Map(actual.functions.map((value) => [value.signature, value])),
    new Map(expectedFunctions.map((value) => [value.signature, value])),
  );
  assert.deepEqual(
    actual.triggers,
    observed.triggers.filter((value) => value.table !== "auth.users"),
    "Nine actual forward attachments; auth attachments excluded",
  );
  return actual;
}
async function data(db) {
  const rows = {};
  for (const table of [...tables, "profiles"])
    rows[table] = (
      await db.query(
        `SELECT pg_catalog.to_jsonb(t) row FROM public.${table} t ORDER BY pg_catalog.to_jsonb(t)::pg_catalog.text`,
      )
    ).rows.map((value) => value.row);
  rows.authUsers = (
    await db.query("SELECT pg_catalog.to_jsonb(t) row FROM auth.users t ORDER BY id")
  ).rows.map((value) => value.row);
  return rows;
}
async function snapshot(db) {
  return {
    data: await data(db),
    catalog: await catalog(db),
    settings: (
      await db.query(`SELECT CURRENT_USER actor,
    pg_catalog.current_setting('search_path') path,pg_catalog.current_setting('request.jwt.claim.sub',true) subject`)
    ).rows[0],
  };
}
async function actor(db, role, subject, sql, args = []) {
  assert.ok(["postgres", "authenticated", "anon", "service_role"].includes(role));
  assert.ok(subject === null || /^[0-9a-f-]{36}$/i.test(subject));
  await db.exec("BEGIN");
  try {
    await db.exec(`SET LOCAL ROLE ${role}`);
    await db.query("SELECT pg_catalog.set_config('request.jwt.claim.sub',$1,true)", [
      subject ?? "",
    ]);
    const result = await db.query(sql, args);
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
async function withFixture(
  run,
  { omitProfiles = [], profileOverrides = [], emailOverrides = [] } = {},
) {
  const db = new PGlite();
  try {
    await db.waitReady;
    await db.query("SELECT pg_catalog.set_config('request.jwt.claim.sub','',false)");
    await db.exec(`CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
      CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
      CREATE ROLE service_role NOLOGIN NOSUPERUSER BYPASSRLS NOINHERIT;
      CREATE SCHEMA auth;GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
      CREATE TABLE auth.users(id uuid PRIMARY KEY,email varchar(255));
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id),full_name text,
        business_region text,business_city text,signup_city text,signup_region text);
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      CREATE POLICY lab_deny_projected_profiles ON public.profiles TO anon,authenticated USING(false) WITH CHECK(false);
      GRANT SELECT ON public.profiles TO anon,authenticated,service_role;`);
    for (const sql of [
      ddl.appEnum,
      ddl.salesEnum,
      ...ddl.staffEnums,
      ...ddl.levelEnums,
      ddl.subjectEnum,
      ddl.sourceEnum,
      ddl.supplier,
    ])
      await db.exec(sql);
    for (const sql of [
      ddl.userRoles,
      ddl.staff,
      ddl.audit,
      ddl.salesProfiles,
      ddl.territories,
      ddl.assignments,
      ddl.commission,
      ...ddl.indexes,
    ])
      await db.exec(sql);
    for (const sql of Object.values(functions)) await db.exec(sql);
    for (const [key, signature] of Object.entries(signatures)) {
      const saved = observed.functions.find((value) => value.signature === signature);
      const entries = saved.acl.slice(1, -1).split(",");
      assert.ok(
        entries.every((entry) =>
          /^(?:postgres|anon|authenticated|service_role)?=X\/postgres$/.test(entry),
        ),
      );
      const publicExecute = entries[0] === "=X/postgres";
      if (!publicExecute) await db.exec(`REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC`);
      for (const entry of entries) {
        const role = entry.split("=")[0];
        if (role && role !== "postgres")
          await db.exec(`GRANT EXECUTE ON FUNCTION ${signature} TO ${role}`);
      }
      assert.equal(publicExecute, entries.includes("=X/postgres"));
      assert.ok(functions[key]);
    }
    for (const table of observed.tables) {
      assert.ok(table.acl.startsWith("{postgres=arwdDxtm/postgres,"));
      const roles = table.acl
        .slice(1, -1)
        .split(",")
        .map((entry) => entry.split("=")[0])
        .filter((role) => role !== "postgres");
      assert.ok(roles.every((role) => ["anon", "authenticated", "service_role"].includes(role)));
      await db.exec(
        `GRANT ALL ON TABLE public.${table.table} TO ${roles.join(",")};ALTER TABLE public.${table.table} ENABLE ROW LEVEL SECURITY`,
      );
    }
    for (const sql of ddl.policies) await db.exec(sql);
    const subjects = Object.entries(id).filter(
      ([key]) => !["missing", "roleOrdinary", "roleTarget"].includes(key),
    );
    for (const [key, user] of subjects) {
      const override = emailOverrides.find((value) => value.id === user);
      const email = override
        ? override.email
        : key === "nullEmail"
          ? null
          : key === "staffDomain"
            ? "synthetic@365motorsales.com"
            : `${key}@example.invalid`;
      await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2)", [user, email]);
      if (!omitProfiles.includes(user))
        await db.query(
          "INSERT INTO public.profiles(id,full_name,signup_region,signup_city) VALUES($1,$2,'Synthetic Region','Synthetic City')",
          [user, `Synthetic ${key}`],
        );
    }
    for (const override of profileOverrides) {
      assert.ok(
        subjects.some(([, user]) => user === override.id) && !omitProfiles.includes(override.id),
      );
      const fields = Object.keys(override).filter((key) => key !== "id");
      assert.ok(
        fields.every((key) =>
          [
            "full_name",
            "signup_region",
            "signup_city",
            "business_region",
            "business_city",
          ].includes(key),
        ),
      );
      if (fields.length)
        await db.query(
          `UPDATE public.profiles SET ${fields.map((field, index) => `${field}=$${index + 2}`).join(",")} WHERE id=$1`,
          [override.id, ...fields.map((field) => override[field])],
        );
    }
    // Fixture-only existing role state, NOT historical seed replay or adopted
    // admin authority. No derived referral/sales rows are invented for seeds.
    for (const [index, [key, user]] of subjects.entries())
      await db.query(
        "INSERT INTO public.user_roles(id,user_id,role) VALUES($1,$2,$3::public.app_role)",
        [
          uuid(101 + index),
          user,
          key === "admin"
            ? "admin"
            : key === "moderator"
              ? "moderator"
              : key === "sales"
                ? "sales"
                : "user",
        ],
      );
    for (const sql of ddl.attachments) await db.exec(sql);
    await assertObservedSubset(db);
    return await run(db);
  } finally {
    await db.close();
  }
}
export {
  sources,
  functions,
  ddl,
  policyDrops,
  pins,
  observed,
  signatures,
  id,
  withFixture,
  actor,
  catalog,
  data,
  snapshot,
  assertObservedSubset,
  sha,
};
