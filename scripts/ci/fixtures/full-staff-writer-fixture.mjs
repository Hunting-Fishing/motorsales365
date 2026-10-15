// DISPOSABLE actual full Auth + role/staff/audit/sales/partner/referral writers.
// Provider uid is recovered source, NOT a JWT verifier or trusted human/session.
// Four Auth fields, plans/tiers, manager/org configuration, SQL caller/settings
// remain explicit synthetic supports. No legacy client policy/authority adoption.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  withReferrals,
  assertStructure as assertParent,
  signatures as parentSignatures,
  expectedAttachments as parentAttachments,
  tables as parentTables,
  data as parentData,
  functions as referralFunctions,
  signup,
  attempt,
  id,
  labSequenceState,
} from "./auth-referral-intent-bootstrap-fixture.mjs";
import { assertFunctionEnvelopes } from "./auth-no-referral-bootstrap-fixture.mjs";
import { query as coreQuery, sequenceCatalog } from "./bootstrap-core-structure-fixture.mjs";
import { query as businessQuery } from "./bootstrap-business-structure-fixture.mjs";
import {
  catalog as partnerCatalog,
  observed as partnerObserved,
} from "./staff-partner-empty-referrals-fixture.mjs";
import {
  query as financialQuery,
  catalog as financialCatalog,
  observed as financialObserved,
} from "./referral-financial-forward-fixture.mjs";
import {
  ddl as platformDDL,
  functions as platformFunctions,
  signatures as platformSignatures,
} from "./platform-role-forward-fixture.mjs";
import {
  install as installUid,
  assertEnvelope as assertUid,
} from "./provider-uid-source-fixture.mjs";
const root = new URL("../../../", import.meta.url);
const pins = {
  "scripts/ci/fixtures/auth-referral-intent-bootstrap-fixture.mjs":
    "08c4a71a4e97d2f22ebd2a191eaa8ac322d71afae997ac1f0bfe17027ce7e12f",
  "scripts/ci/auth-referral-intent-bootstrap.test.mjs":
    "4a8ef753c1aded123ab0f0ef0082cfb6c23ded7c39b0b18e2ba067329957688e",
  "scripts/ci/fixtures/provider-uid-source-fixture.mjs":
    "ca95448771e7f4f09dc2e9666340d6d690b2246d134903d90843ed2e41a47a05",
  "scripts/ci/provider-uid-source-review.test.mjs":
    "153319d148f6f2b779b527580aa6571300cfd6fb97a0ebfa2fab0715bdc9fd24",
  "scripts/ci/staff-auth-prerequisites.test.mjs":
    "fa26eaf914515a9c61fe90e590e6510d9afd858ad85e5544b0b7011b960a5ebb",
  "scripts/ci/fixtures/platform-role-forward-fixture.mjs":
    "e2843eaf7c185eb52a21c342a482a1adb894f34ec1f4d8288a32db15b64da512",
  "scripts/ci/platform-role-forward-composition.test.mjs":
    "55438e113952621868b15509e3926dd3a9307426df21df29cca8b082e951464b",
  "scripts/ci/fixtures/staff-partner-empty-referrals-fixture.mjs":
    "1d2c94fcf0bae4443dff0f5dbfdb42f767a365e24b57ab6e665daa7d8bbb329a",
};
function read(path) {
  const raw = fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
  assert.ok(Buffer.byteLength(raw) > 0 && Buffer.byteLength(raw) < 128 * 1024);
  assert.equal(createHash("sha256").update(raw).digest("hex"), pins[path], path);
  return raw;
}
for (const path of Object.keys(pins)) read(path);
const orgQuery = fs
  .readFileSync(new URL("scripts/ci/org-tier-structure-review.sql", root), "utf8")
  .replaceAll("\r\n", "\n");
assert.equal(
  createHash("sha256").update(orgQuery).digest("hex"),
  "fd07f10c8da9824667aeda0615a99ebc6673eed135e80c917dc9a57483fa2701",
);
const addedTables = ["staff_referral_audit", "sales_rep_profiles", "sales_rep_territories"];
const tables = [...parentTables, ...addedTables].sort();
assert.equal(new Set(tables).size, 21);
const functions = Object.fromEntries(
  Object.entries(platformFunctions)
    .filter(([k]) => !parentSignatures.includes(platformSignatures[k]))
    .map(([k, source]) => [platformSignatures[k], source]),
);
assert.equal(Object.keys(functions).length, 11);
const signatures = [...parentSignatures, ...Object.keys(functions)].sort();
const observedFunctions = Object.fromEntries(
  [...Object.keys(functions), ...Object.keys(referralFunctions)].map((s) => {
    const cap = [...partnerObserved.functions, ...financialObserved.functions].find(
      (f) => f.signature === s,
    );
    assert.ok(cap, s);
    return [s, cap];
  }),
);
const attachments = platformDDL.attachments.filter(
  (s) => !s.includes("CREATE TRIGGER trg_sales_rep_assignments_updated"),
);
assert.equal(attachments.length, 8);
const selectedNewTriggers = new Set(attachments.map((s) => s.match(/CREATE TRIGGER (\w+)/)[1]));
const expectedAttachments = [
  ...parentAttachments,
  ...partnerObserved.triggers.filter((t) => selectedNewTriggers.has(t.name)),
].sort((a, b) => (a.table + "\0" + a.name < b.table + "\0" + b.name ? -1 : 1));
assert.equal(expectedAttachments.length, 30);
const ddl = [
  platformDDL.audit,
  platformDDL.salesProfiles,
  platformDDL.territories,
  platformDDL.commission,
  ...platformDDL.indexes.filter((s) =>
    /ON public\.(staff_referral_audit|sales_rep_territories)\(/.test(s),
  ),
];
assert.equal(ddl.length, 8);
function fragment(q) {
  assert.equal(q.split("WITH selected_relations").length, 2);
  assert.equal(q.split(") catalog;").length, 2);
  return q.slice(
    q.indexOf("WITH selected_relations"),
    q.indexOf(") catalog;") + ") catalog;".length,
  );
}
async function existingStructure(db) {
  // Parent assertParent checks these against pinned reviewed observations before
  // extension. Child pre/post compares every structural facet without relaxing
  // the immutable parent's no-extra-function/trigger guard.
  const result = [];
  const path = (await db.query("SELECT current_setting('search_path') path")).rows[0].path;
  await db.exec("SET LOCAL search_path=pg_catalog,pg_temp");
  try {
    for (const q of [coreQuery, orgQuery, businessQuery, financialQuery]) {
      const c = (await db.query(fragment(q))).rows[0].catalog;
      result.push(
        Object.fromEntries(
          ["tables", "columns", "indexes", "enums", "policies", "constraints"].map((k) => [
            k,
            k === "constraints" ? c[k].filter((v) => v.type !== "n") : c[k],
          ]),
        ),
      );
    }
    result.push(await sequenceCatalog(db));
    result.push(
      (
        await db.query(
          'SELECT a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull AS "notNull",md5(pg_get_expr(d.adbin,d.adrelid)) AS "defaultMd5" FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=\'auth.users\'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attname',
        )
      ).rows,
    );
    return result;
  } finally {
    await db.query("SELECT set_config('search_path',$1,true)", [path]);
  }
}
async function assertStructure(db, existing) {
  assert.deepEqual(
    await existingStructure(db),
    existing,
    "immutable full parent structure, enums, sequence configuration/ACL and four Auth fields",
  );
  await assertUid(db);
  const path = (await db.query("SELECT current_setting('search_path') path")).rows[0].path;
  await db.exec("SET LOCAL search_path=pg_catalog,pg_temp");
  try {
    await assertFunctionEnvelopes(db);
    const p = await partnerCatalog(db);
    for (const k of ["tables", "indexes", "enums"])
      assert.deepEqual(
        p[k],
        partnerObserved[k],
        "all nine actual staff/role/sales/partner/referral " + k,
      );
    const columns = (values) =>
      values.map(({ position, ...c }) => (c.schema === "auth" ? c : { ...c, position }));
    assert.deepEqual(
      columns(p.columns),
      columns(partnerObserved.columns),
      "all nine full tables plus genuine full-profile read ordinals; only Auth positions synthetic",
    );
    assert.deepEqual(
      p.constraints.filter((c) => c.type !== "n"),
      partnerObserved.constraints,
      "all 28 critical selected staff/partner constraints",
    );
    assert.deepEqual(p.policies, [], "legacy client policies deliberately excluded");
    const f = await financialCatalog(db, financialQuery);
    assert.deepEqual(
      new Map(
        [...p.functions, ...f.functions]
          .filter((f) => Object.keys(observedFunctions).includes(f.signature))
          .map((f) => [f.signature, f]),
      ),
      new Map(Object.entries(observedFunctions)),
      "sixteen added full current function envelopes and ordered raw ACLs",
    );
    assert.deepEqual(
      (
        await db.query(
          "SELECT p.oid::regprocedure::text signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY p.oid::regprocedure::text",
        )
      ).rows.map((x) => x.signature),
      signatures,
      "exactly 37 genuine public functions, no shims or substitutes",
    );
    assert.deepEqual(
      (
        await db.query(
          "SELECT p.oid::regprocedure::text signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='auth' ORDER BY p.oid::regprocedure::text",
        )
      ).rows,
      [{ signature: "auth.uid()" }],
      "only actual recovered provider uid",
    );
    const triggers = (
      await db.query(
        'SELECT t.tgrelid::regclass::text AS table,t.tgname name,t.tgenabled enabled,t.tgtype AS "typeBits",t.tgfoid::regprocedure::text AS function,ARRAY(SELECT a.attname FROM pg_attribute a WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr::int2[]) ORDER BY a.attnum) AS "updateColumns",t.tgnargs AS "argumentCount",md5(t.tgargs) AS "argumentsMd5",md5(t.tgqual::text) AS "whenTreeMd5",md5(pg_get_triggerdef(t.oid)) AS "definitionMd5" FROM pg_trigger t WHERE NOT t.tgisinternal ORDER BY t.tgrelid::regclass::text,t.tgname',
      )
    ).rows;
    assert.deepEqual(triggers, expectedAttachments, "all thirty complete actual attachments");
    assert.deepEqual(
      (
        await db.query(
          "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname",
        )
      ).rows.map((x) => x.relname),
      tables,
      "exactly 21 full public tables",
    );
    assert.equal(
      (await db.query("SELECT count(*)::int n FROM pg_policy")).rows[0].n,
      0,
      "no client authority positive inferred",
    );
    const nn = (
      await db.query(
        "SELECT cardinality(k.conkey) size,k.convalidated valid,EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=k.conrelid AND a.attnum=k.conkey[1] AND a.attnotnull AND NOT a.attisdropped) backed FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND k.contype='n'",
      )
    ).rows;
    for (const n of nn)
      assert.deepEqual(
        [n.size, n.valid, n.backed],
        [1, true, true],
        "only backed PG18 NOT NULL normalization",
      );
  } finally {
    await db.query("SELECT set_config('search_path',$1,true)", [path]);
  }
}
async function data(db) {
  const result = await parentData(db);
  for (const table of addedTables)
    result["public." + table] = (
      await db.query(
        "SELECT to_jsonb(t) row FROM public." + table + " t ORDER BY to_jsonb(t)::text",
      )
    ).rows.map((r) => r.row);
  return result;
}
const snapshot = async (db) => JSON.stringify(await data(db));
async function asSettings(db, { role = "postgres", subject = "", claims = "" } = {}, run) {
  assert.ok(["postgres", "authenticated", "anon", "service_role"].includes(role));
  assert.ok(subject === "" || /^[0-9a-f-]{36}$/i.test(subject));
  // No BEGIN/COMMIT: retain outer disposable transaction and all parent guards.
  await db.exec("SAVEPOINT synthetic_caller");
  try {
    await db.exec("SET LOCAL ROLE " + role);
    await db.query(
      "SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
      [subject, claims],
    );
    return await run();
  } finally {
    await db.exec("ROLLBACK TO SAVEPOINT synthetic_caller;RELEASE SAVEPOINT synthetic_caller");
  }
}
async function staffSignup(
  db,
  { user = id(1), email = "synthetic@365motorsales.com", metadata = {}, confirmed = null } = {},
) {
  return db.query(
    "INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES($1,$2,$3,$4) RETURNING id",
    [user, email, JSON.stringify(metadata), confirmed],
  );
}
async function managerAndOrg(db) {
  const manager = (await db.query("SELECT public.canonical_365_admin_id() id")).rows[0].id;
  await signup(db, {
    user: manager,
    email: "canonical-lab-manager@example.invalid",
    metadata: { signup_intent: "buyer" },
  });
  const org = (await db.query("SELECT id FROM public.organizations WHERE created_by=$1", [manager]))
    .rows[0].id;
  await db.query(
    "INSERT INTO public.internal_org_settings(key,org_id) VALUES('canonical_365',$1)",
    [org],
  );
  return { manager, org };
}
async function withStaff(run) {
  return withReferrals(async (db) => {
    await assertParent(db);
    const existing = await existingStructure(db);
    await db.exec("SAVEPOINT full_staff_writers");
    try {
      for (const s of ddl) await db.exec(s);
      for (const t of addedTables) {
        const cap = partnerObserved.tables.find((v) => v.table === t);
        const entries = cap.acl.slice(1, -1).split(",");
        assert.ok(
          entries.every((e) =>
            /^(?:postgres|anon|authenticated|service_role)=arwdDxtm\/postgres$/.test(e),
          ),
        );
        const roles = entries.map((e) => e.split("=")[0]).filter((r) => r !== "postgres");
        await db.exec(
          "ALTER TABLE public." +
            t +
            " ENABLE ROW LEVEL SECURITY;GRANT ALL ON TABLE public." +
            t +
            " TO " +
            roles.join(","),
        );
      }
      await installUid(db);
      for (const [signature, source] of Object.entries(functions)) {
        await db.exec(source);
        const entries = observedFunctions[signature].acl.slice(1, -1).split(",");
        assert.ok(
          entries.every((e) =>
            /^(?:postgres|anon|authenticated|service_role)?=X\/postgres$/.test(e),
          ),
        );
        if (!entries.includes("=X/postgres"))
          await db.exec("REVOKE ALL ON FUNCTION " + signature + " FROM PUBLIC");
        for (const entry of entries) {
          const role = entry.split("=")[0];
          if (role && role !== "postgres")
            await db.exec("GRANT EXECUTE ON FUNCTION " + signature + " TO " + role);
        }
      }
      for (const s of attachments) await db.exec(s);
      const guard = () => assertStructure(db, existing);
      await guard();
      const result = await run(db, guard);
      await guard();
      return result;
    } finally {
      await db.exec(
        "ROLLBACK TO SAVEPOINT full_staff_writers;RELEASE SAVEPOINT full_staff_writers",
      );
    }
  });
}
export {
  withStaff,
  assertStructure,
  functions,
  signatures,
  attachments,
  expectedAttachments,
  ddl,
  tables,
  pins,
  data,
  snapshot,
  asSettings,
  staffSignup,
  managerAndOrg,
  signup,
  attempt,
  id,
  labSequenceState,
};
