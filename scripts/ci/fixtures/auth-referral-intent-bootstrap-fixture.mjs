// DISPOSABLE actual nonstaff Auth→full profile/org/subscription/referral/intent.
// Immutable PR60/61 sources; NO projected profiles, auth.uid/JWT stub, has_role
// substitute or policy/privileged-actor acceptance. Preexisting referrer role/
// staff/partner state is explicit lab input, NOT staff provisioning proof.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  withBootstrap,
  assertFunctionEnvelopes,
  id,
  planId,
  labSequenceState,
  functions as baseFunctions,
} from "./auth-no-referral-bootstrap-fixture.mjs";
import {
  observed as coreObserved,
  prior as bootstrapObserved,
  orgObserved,
  query as coreQuery,
  sequenceCatalog,
} from "./bootstrap-core-structure-fixture.mjs";
import {
  observed as businessObserved,
  query as businessQuery,
} from "./bootstrap-business-structure-fixture.mjs";
import {
  ddl as partnerDDL,
  functions as partnerFunctions,
  observed as partnerObserved,
  catalog as partnerCatalog,
} from "./staff-partner-empty-referrals-fixture.mjs";
import { ddl as platformDDL } from "./platform-role-forward-fixture.mjs";
import {
  ddl as financialDDL,
  functions as financialFunctions,
  attachments as financialAttachments,
  observed as financialObserved,
  query as financialQuery,
  catalog as financialCatalog,
} from "./referral-financial-forward-fixture.mjs";
const root = new URL("../../../", import.meta.url);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const pins = {
  "scripts/ci/fixtures/auth-no-referral-bootstrap-fixture.mjs":
    "83498e136bc10fc04af9d15e91af160169d68220e091443bcfc4e4272a7419ac",
  "scripts/ci/auth-no-referral-bootstrap.test.mjs":
    "afa6aaccb9830e2722f565b155294df3741fe3a162a8b869ab6c57c3f52e089b",
  "scripts/ci/fixtures/referral-financial-forward-fixture.mjs":
    "059ea6e1db88f02bb2939bbb737fbc44c5ed6d1b8c0dce243410916dca92ad58",
  "scripts/ci/referral-financial-forward.test.mjs":
    "6f1f49960c1cab59fa8e6e6696d819945b1072cf52d15c356aa84d38610ca4e0",
  "scripts/ci/org-tier-structure-review.sql":
    "fd07f10c8da9824667aeda0615a99ebc6673eed135e80c917dc9a57483fa2701",
};
function read(p) {
  const raw = fs.readFileSync(new URL(p, root), "utf8").replaceAll("\r\n", "\n");
  assert.ok(Buffer.byteLength(raw) > 0 && Buffer.byteLength(raw) < 128 * 1024);
  assert.equal(sha(raw), pins[p], p);
  return raw;
}
for (const p of Object.keys(pins)) read(p);
const orgQuery = read("scripts/ci/org-tier-structure-review.sql");
const addedTables = [
  "user_roles",
  "user_referrals",
  "partner_program_applications",
  "partner_program_partners",
  "sales_rep_assignments",
  "partner_program_commission_events",
  "partner_program_payouts",
];
const scopedParentTables = ["staff_referrals", ...addedTables.slice(0, 5)];
const tables = [
  ...new Set(
    [
      ...coreObserved.tables,
      ...orgObserved.tables,
      ...businessObserved.tables,
      ...partnerObserved.tables.filter((t) => scopedParentTables.includes(t.table)),
      ...financialObserved.tables,
    ].map((t) => t.table),
  ),
].sort();
assert.equal(tables.length, 18);
const functions = {
  "public.update_updated_at_column()": partnerFunctions.timestamp,
  "public.trg_partners_recompute_intent()": partnerFunctions.wrapper,
  ...Object.fromEntries(
    Object.entries(financialFunctions).filter(
      ([s]) => s !== "public.pp_recompute_payout_total(uuid)",
    ),
  ),
};
assert.equal(Object.keys(functions).length, 5);
const signatures = [...Object.keys(baseFunctions), ...Object.keys(functions)].sort();
const observedFunctions = Object.fromEntries(
  Object.keys(functions).map((s) => [
    s,
    [...financialObserved.functions, ...partnerObserved.functions].find((f) => f.signature === s),
  ]),
);
const attachments = [
  ...partnerDDL.attachments,
  ...financialAttachments,
  ...platformDDL.attachments.filter((s) =>
    s.includes("CREATE TRIGGER trg_sales_rep_assignments_updated"),
  ),
];
assert.equal(attachments.length, 7);
const expectedAttachments = [
  ...bootstrapObserved.triggers,
  ...partnerObserved.triggers.filter((t) =>
    [
      "public.user_referrals",
      "public.partner_program_applications",
      "public.partner_program_partners",
      "public.sales_rep_assignments",
    ].includes(t.table),
  ),
  ...financialObserved.triggers,
].sort((a, b) => (a.table + "\0" + a.name < b.table + "\0" + b.name ? -1 : 1));
assert.equal(expectedAttachments.length, 22);
const ddl = [
  platformDDL.userRoles,
  ...partnerDDL.tables,
  ...partnerDDL.deltas,
  platformDDL.assignments,
  ...partnerDDL.indexes,
  ...platformDDL.indexes.filter(
    (s) => s.includes("sales_rep_assignments") || s.includes("uniq_active_assignment"),
  ),
  ...financialDDL,
];
const fragment = (q) => {
  assert.equal(q.split("WITH selected_relations").length, 2);
  assert.equal(q.split(") catalog;").length, 2);
  return q.slice(
    q.indexOf("WITH selected_relations"),
    q.indexOf(") catalog;") + ") catalog;".length,
  );
};
async function baseCatalog(db, sql) {
  return (await db.query(fragment(sql))).rows[0].catalog;
}
const baseQueries = [
  [coreQuery, coreObserved],
  [orgQuery, orgObserved],
  [businessQuery, businessObserved],
];
async function attachmentCatalog(db) {
  return (
    await db.query(
      'SELECT t.tgrelid::regclass::text AS table,t.tgname name,t.tgenabled enabled,t.tgtype AS "typeBits",t.tgfoid::regprocedure::text AS function,ARRAY(SELECT a.attname FROM pg_attribute a WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr::int2[]) ORDER BY a.attnum) AS "updateColumns",t.tgnargs AS "argumentCount",md5(t.tgargs) AS "argumentsMd5",md5(t.tgqual::text) AS "whenTreeMd5",md5(pg_get_triggerdef(t.oid)) AS "definitionMd5" FROM pg_trigger t WHERE NOT t.tgisinternal ORDER BY t.tgrelid::regclass::text,t.tgname',
    )
  ).rows;
}
async function assertStructure(db) {
  const path = (await db.query("SELECT current_setting('search_path') path")).rows[0].path;
  await db.exec("SET LOCAL search_path=pg_catalog,pg_temp");
  try {
    await assertFunctionEnvelopes(db);
    assert.deepEqual(
      await sequenceCatalog(db),
      bootstrapObserved.sequences,
      "exact member sequence configuration/ownership/ACL, never live state",
    );
    const auth = (
      await db.query(
        'SELECT a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull AS "notNull",md5(pg_get_expr(d.adbin,d.adrelid)) AS "defaultMd5" FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=\'auth.users\'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attname',
      )
    ).rows;
    assert.deepEqual(
      auth,
      bootstrapObserved.columns
        .filter((c) => c.schema === "auth")
        .map((c) => ({ name: c.name, type: c.type, notNull: c.notNull, defaultMd5: c.defaultMd5 }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      "only four observed synthetic provider field definitions",
    );
    for (const [sql, expected] of baseQueries) {
      const actual = await baseCatalog(db, sql);
      for (const k of ["tables", "columns", "indexes", "enums"])
        assert.deepEqual(actual[k], expected[k], "full bootstrap " + k);
      assert.deepEqual(
        actual.constraints.filter((c) => c.type !== "n"),
        expected.constraints,
        "full bootstrap critical constraints",
      );
      assert.deepEqual(actual.policies, [], "client policies not installed");
    }
    const parent = await partnerCatalog(db);
    for (const k of ["tables", "indexes"])
      assert.deepEqual(
        parent[k],
        partnerObserved[k].filter((x) => scopedParentTables.includes(x.table)),
        "full actual referrer/referral/assignment " + k,
      );
    const columns = (values) =>
      values
        .filter(
          (c) => scopedParentTables.includes(c.table) || ["profiles", "users"].includes(c.table),
        )
        .map(({ position, ...c }) => (c.schema === "auth" ? c : { ...c, position }));
    assert.deepEqual(
      columns(parent.columns),
      columns(partnerObserved.columns),
      "all actual referral/role/staff/partner/assignment columns plus full-profile read fields; Auth positions synthetic",
    );
    assert.deepEqual(
      parent.constraints.filter((c) => c.type !== "n"),
      partnerObserved.constraints.filter((c) => scopedParentTables.includes(c.table)),
      "all actual referral/role/staff/partner/assignment critical constraints",
    );
    assert.deepEqual(parent.policies, [], "no legacy client-authority adoption");
    assert.deepEqual(parent.enums, partnerObserved.enums, "actual app and assignment enums");
    const fin = await financialCatalog(db, financialQuery);
    for (const k of ["tables", "columns", "indexes", "enums"])
      assert.deepEqual(fin[k], financialObserved[k], "full actual financial " + k);
    assert.deepEqual(
      fin.constraints.filter((c) => c.type !== "n"),
      financialObserved.constraints,
      "all 12 critical financial constraints",
    );
    assert.deepEqual(fin.policies, [], "financial client policies excluded");
    const newEnvelopes = new Map(
      [...fin.functions, ...parent.functions]
        .filter((f) => Object.keys(functions).includes(f.signature))
        .map((f) => [f.signature, f]),
    );
    assert.deepEqual(
      newEnvelopes,
      new Map(Object.entries(observedFunctions)),
      "five exact new function envelopes/ACL",
    );
    const installed = (
      await db.query(
        "SELECT p.oid::regprocedure::text signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY p.oid::regprocedure::text",
      )
    ).rows.map((x) => x.signature);
    assert.deepEqual(installed, signatures, "exactly 26 actual public functions, no substitutions");
    assert.deepEqual(
      (
        await db.query(
          "SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='auth'",
        )
      ).rows,
      [],
      "no provider Auth uid/JWT shim",
    );
    assert.deepEqual(
      await attachmentCatalog(db),
      expectedAttachments,
      "all 22 actual selected attachments",
    );
    assert.deepEqual(
      (
        await db.query(
          "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname",
        )
      ).rows.map((x) => x.relname),
      tables,
      "exactly eighteen complete public tables, no reduced supports",
    );
    assert.equal((await db.query("SELECT count(*)::int n FROM pg_policy")).rows[0].n, 0);
    const nn = (
      await db.query(
        "SELECT k.conname name,cardinality(k.conkey) size,k.convalidated valid,EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=k.conrelid AND a.attnum=k.conkey[1] AND a.attnotnull AND NOT a.attisdropped) backed FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND k.contype='n'",
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
  const result = {};
  for (const table of ["auth.users", ...tables.map((t) => "public." + t)])
    result[table] = (
      await db.query("SELECT to_jsonb(t) row FROM " + table + " t ORDER BY to_jsonb(t)::text")
    ).rows.map((r) => r.row);
  return result;
}
const snapshot = async (db) => JSON.stringify(await data(db));
async function attempt(db, run) {
  await db.exec("SAVEPOINT auth_referral_attempt");
  try {
    const r = await run();
    await db.exec("RELEASE SAVEPOINT auth_referral_attempt");
    return r;
  } catch (e) {
    await db.exec(
      "ROLLBACK TO SAVEPOINT auth_referral_attempt;RELEASE SAVEPOINT auth_referral_attempt",
    );
    throw e;
  }
}
async function signup(
  db,
  { user = id(1), email = "ordinary@example.invalid", metadata = {}, confirmed = null } = {},
) {
  assert.ok(
    email === null || !/@365motorsales\.com$/i.test(email),
    "staff-domain provisioning is a separate frontier",
  );
  return db.query(
    "INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES($1,$2,$3,$4) RETURNING id",
    [user, email, JSON.stringify(metadata), confirmed],
  );
}
async function seedReferrer(
  db,
  {
    user = id(501),
    code = "synthetic-referral",
    role = "sales",
    staffActive = true,
    partnerActive = true,
    partnerUser = user,
    signupBounty = 2,
    withPartner = true,
  } = {},
) {
  await signup(db, {
    user,
    email: "referrer-" + user.slice(-4) + "@example.invalid",
    metadata: { signup_intent: "buyer" },
  });
  if (role !== null)
    await db.query("INSERT INTO public.user_roles(user_id,role) VALUES($1,$2::public.app_role)", [
      user,
      role,
    ]);
  const staff = (
    await db.query(
      "INSERT INTO public.staff_referrals(staff_user_id,email,full_name,referral_code,active) VALUES($1,'referrer@example.invalid','Synthetic Preexisting Referrer',$2,$3) RETURNING *",
      [user, code, staffActive],
    )
  ).rows[0];
  const partner = withPartner
    ? (
        await db.query(
          "INSERT INTO public.partner_program_partners(user_id,referral_code,display_name,active,signup_bounty_php) VALUES($1,$2,'Synthetic Preexisting Partner',$3,$4) RETURNING *",
          [partnerUser, code, partnerActive, signupBounty],
        )
      ).rows[0]
    : null;
  return { user, code, staff, partner };
}
async function withReferrals(run, options) {
  return withBootstrap(async (db) => {
    await db.exec("SAVEPOINT full_auth_referral");
    try {
      // Actual assignment enums only; app_role already exists with nine labels.
      for (const name of ["sales_rep_subject", "sales_rep_source"]) {
        const e = partnerObserved.enums.find((e) => e.name === name);
        assert.ok(e);
        await db.exec(
          "CREATE TYPE public." +
            name +
            " AS ENUM (" +
            e.labels.map((l) => "'" + l + "'").join(",") +
            ")",
        );
      }
      for (const s of ddl) await db.exec(s);
      for (const [sig, s] of Object.entries(functions)) {
        await db.exec(s);
        assert.equal(observedFunctions[sig].acl, "{postgres=X/postgres,service_role=X/postgres}");
        await db.exec(
          "REVOKE ALL ON FUNCTION " +
            sig +
            " FROM PUBLIC;GRANT EXECUTE ON FUNCTION " +
            sig +
            " TO service_role",
        );
      }
      for (const t of addedTables)
        await db.exec(
          "ALTER TABLE public." +
            t +
            " ENABLE ROW LEVEL SECURITY;GRANT ALL ON TABLE public." +
            t +
            " TO anon,authenticated,service_role",
        );
      for (const s of attachments) await db.exec(s);
      await assertStructure(db);
      const result = await run(db);
      await assertStructure(db);
      return result;
    } finally {
      await db.exec(
        "ROLLBACK TO SAVEPOINT full_auth_referral;RELEASE SAVEPOINT full_auth_referral",
      );
    }
  }, options);
}
export {
  withReferrals,
  assertStructure,
  data,
  snapshot,
  attempt,
  signup,
  seedReferrer,
  id,
  planId,
  labSequenceState,
  pins,
  functions,
  signatures,
  attachments,
  expectedAttachments,
  ddl,
  tables,
};
