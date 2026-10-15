// MEMORY ONLY ordinary, nonstaff, no-referral Auth INSERT forward rehearsal.
// Full ten-table structure is unchanged; all behavior/config/support is enclosed
// in a transaction rolled back before the parent's empty structural invariants.
// Not provider Auth/JWT/client-policy, trusted actor, concurrency or release proof.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  withStructure as withBusiness,
  observed as businessObserved,
  query as businessQuery,
} from "./bootstrap-business-structure-fixture.mjs";
import {
  observed as coreObserved,
  prior as bootstrapObserved,
  orgObserved,
  query as coreQuery,
} from "./bootstrap-core-structure-fixture.mjs";
import { sources, mappings, manifest, body } from "./auth-bootstrap-source-correspondence.mjs";
import {
  ddl as platformDDL,
  observed as platformObserved,
} from "./platform-role-forward-fixture.mjs";
const root = new URL("../../../", import.meta.url);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const md5 = (s) => (s === null ? null : createHash("md5").update(s).digest("hex"));
const orgQuery = fs
  .readFileSync(new URL("scripts/ci/org-tier-structure-review.sql", root), "utf8")
  .replaceAll("\r\n", "\n");
assert.equal(sha(orgQuery), "fd07f10c8da9824667aeda0615a99ebc6673eed135e80c917dc9a57483fa2701");
function readPinned(path, hash, max = 128 * 1024) {
  const raw = fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
  assert.ok(Buffer.byteLength(raw) > 0 && Buffer.byteLength(raw) < max);
  assert.equal(sha(raw), hash, path);
  return raw;
}
readPinned(
  "scripts/ci/fixtures/bootstrap-business-structure-fixture.mjs",
  "69087d87fdd7e0a2076360945b2d9422207ab2c89b606307c8748d0e6b236fec",
);
readPinned(
  "scripts/ci/fixtures/platform-role-forward-fixture.mjs",
  "e2843eaf7c185eb52a21c342a482a1adb894f34ec1f4d8288a32db15b64da512",
);
readPinned(
  "scripts/ci/fixtures/auth-bootstrap-source-correspondence.mjs",
  "b6f4859d92b319f148cda6a2cd3c889b97693116f9f1fe8e52d0167dec51c968",
);
const orgSource = JSON.parse(
  readPinned(
    "docs/evidence/org-function-source-2026-10-15.json",
    "a4e4aad2d5fff5ef16b008e04c930a449d578698434101d010fb657e25b18f98",
    8 * 1024,
  ),
);
const hardening = readPinned(
  "supabase/migrations/20260805084402_cd07847a-26f0-4c31-a2fe-ab0088684f77.sql",
  "d987fe1e83505eb4002529a5290361fba2ff4af994938986ced9006c1502b321",
  16 * 1024,
);
const hardeningMarker = "ALTER FUNCTION %s SET search_path = public, shop_manager, pg_temp";
assert.equal(hardening.split(hardeningMarker).length, 2);
const names = [
  "assign_founding_member()",
  "grant_founding_bronze()",
  "grant_business_trial()",
  "assign_profile_member_number()",
  "tg_auto_create_seller_org()",
  "tg_set_updated_at()",
  "accredit_staff_partner(uuid)",
  "tg_auth_user_staff_accredit()",
  "attach_signup_referral()",
  "derive_signup_intent(uuid)",
  "recompute_signup_intent(uuid)",
  "recompute_signup_intent(uuid,text,text,text,text,text,text)",
  "handle_new_user()",
  "canonical_365_org_id()",
  "is_internal_365_email(text)",
  "is_internal_365_staff(uuid)",
  "block_internal_staff_org()",
  "canonical_365_admin_id()",
  "set_internal_staff_manager()",
  "trg_profiles_recompute_intent()",
].map((n) => "public." + n);
const functions = {};
const selectionPins = {};
for (const signature of names) {
  const source = sources[mappings[signature]],
    name = signature.slice(7).split("(")[0],
    marker = "CREATE OR REPLACE FUNCTION public." + name + "(";
  assert.equal(source.split(marker).length, 2);
  const first = source.indexOf(marker),
    scope = source.slice(first),
    m = scope.match(/\bAS\s+(\$[a-z_]*\$)([\s\S]*?)\1/i);
  assert.ok(m);
  const end = first + m.index + m[0].length;
  assert.equal(source[end], ";");
  const value = source.slice(first, end + 1);
  assert.equal(m[2], body[signature]);
  const observed = bootstrapObserved.functions.find((f) => f.signature === signature);
  assert.ok(observed);
  assert.equal(md5(m[2]), observed.bodyMd5Lf);
  functions[signature] = value;
  selectionPins[signature] = {
    ...manifest[signature],
    definitionSha256Lf: sha(value),
    definitionBytes: Buffer.byteLength(value),
  };
}
const creator = orgSource.functions.find(
  (f) => f.signature === "public.tg_org_add_creator_as_owner()",
);
assert.equal(creator.permitted, true);
assert.equal(md5(creator.definition), creator.definitionMd5);
functions[creator.signature] = creator.definition;
selectionPins[creator.signature] = {
  currentCatalogReference: true,
  definitionMd5: creator.definitionMd5,
  bodyMd5Lf: creator.bodyMd5Lf,
};
const signatures = Object.keys(functions);
assert.equal(signatures.length, 21);
const ident = (s) => {
  assert.match(s, /^[a-z_][a-z0-9_]*$/);
  return '"' + s + '"';
};
const attachments = [
  ...orgObserved.pieces.filter((p) => p.category === "trigger"),
  ...coreObserved.pieces.filter((p) => p.category === "trigger"),
].map((p) => {
  assert.equal(p.permitted, true);
  assert.equal(md5(p.definition), p.definitionMd5);
  return p.definition;
});
function selectedStatement(source, marker) {
  assert.equal(source.split(marker).length, 2);
  const first = source.indexOf(marker),
    last = source.indexOf(";", first);
  assert.ok(last > first);
  return source.slice(first, last + 1);
}
attachments.push(
  selectedStatement(sources.accreditation, "CREATE TRIGGER on_auth_user_confirmed_accredit_staff"),
  selectedStatement(sources.roles, "CREATE TRIGGER on_auth_user_created"),
);
assert.equal(attachments.length, 15);
const tables = [
  "auth.users",
  "public.staff_referrals",
  ...new Set(
    [...coreObserved.tables, ...orgObserved.tables, ...businessObserved.tables].map(
      (t) => "public." + ident(t.table),
    ),
  ),
];
const id = (n) => "10000000-0000-4000-8000-" + String(n).padStart(12, "0");
const planId = id(900);
async function data(db) {
  const result = {};
  for (const table of tables) {
    const rows = (await db.query("SELECT to_jsonb(t) AS value FROM " + table + " t")).rows.map(
      (r) => r.value,
    );
    result[table.replaceAll('"', "")] = rows.sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    );
  }
  return result;
}
async function snapshot(db) {
  return JSON.stringify(await data(db));
}
async function labSequenceState(db) {
  // Local in-memory state ONLY, never a live database diagnostic query.
  return (
    await db.query(
      "SELECT last_value::text value,is_called called FROM public.profiles_member_number_seq",
    )
  ).rows[0];
}
async function assertFunctionEnvelopes(db) {
  for (const signature of signatures) {
    const actual = (
      await db.query(
        'SELECT p.oid::regprocedure::text signature,pg_get_userbyid(p.proowner) owner,l.lanname language,p.prokind kind,p.prosecdef AS "securityDefiner",p.provolatile volatility,p.proisstrict strict,p.proretset AS "returnsSet",p.pronargdefaults defaults,format_type(p.prorettype,NULL) AS "resultType",p.proargnames AS "argumentNames",p.proargmodes AS "argumentModes",md5(pg_get_function_arguments(p.oid)) AS "argumentsMd5",ARRAY(SELECT split_part(v,\'=\',1) FROM unnest(p.proconfig)v) AS "configKeys",md5(p.proconfig::text) AS "configMd5",p.proacl::text acl,md5(pg_get_functiondef(p.oid)) AS "definitionMd5",md5(replace(p.prosrc,chr(13),\'\')) AS "bodyMd5Lf",octet_length(pg_get_functiondef(p.oid)) AS "definitionBytes",has_function_privilege(\'anon\',p.oid,\'EXECUTE\') AS "anonExecute",has_function_privilege(\'authenticated\',p.oid,\'EXECUTE\') AS "authenticatedExecute",has_function_privilege(\'service_role\',p.oid,\'EXECUTE\') AS "serviceExecute",has_function_privilege(\'postgres\',p.oid,\'EXECUTE\') AS "postgresExecute" FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=$1::regprocedure',
        [signature],
      )
    ).rows[0];
    assert.deepEqual(
      actual,
      bootstrapObserved.functions.find((f) => f.signature === signature),
      signature + ": exact current function envelope/body/definition/ACL",
    );
  }
}
async function assertAttachments(db) {
  const actual = (
    await db.query(
      'SELECT t.tgrelid::regclass::text AS table,t.tgname name,t.tgenabled enabled,t.tgtype AS "typeBits",t.tgfoid::regprocedure::text AS function,ARRAY(SELECT a.attname FROM pg_attribute a WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr::int2[]) ORDER BY a.attnum) AS "updateColumns",t.tgnargs AS "argumentCount",md5(t.tgargs) AS "argumentsMd5",md5(t.tgqual::text) AS "whenTreeMd5",md5(pg_get_triggerdef(t.oid)) AS "definitionMd5" FROM pg_trigger t WHERE NOT t.tgisinternal ORDER BY t.tgrelid::regclass::text,t.tgname',
    )
  ).rows;
  assert.deepEqual(
    actual,
    bootstrapObserved.triggers,
    "all fifteen actual auth/profile/org/subscription attachments",
  );
}
async function assertRuntimeStructure(db) {
  // Use only the pinned WITH/SELECT fragments in this local outer transaction.
  // Never execute the diagnostic BEGIN/ROLLBACK wrappers inside the rehearsal.
  for (const [sql, expected] of [
    [coreQuery, coreObserved],
    [orgQuery, orgObserved],
    [businessQuery, businessObserved],
  ]) {
    assert.equal(sql.split("WITH selected_relations").length, 2);
    assert.equal(sql.split("\nROLLBACK;").length, 2);
    const fragment = sql.slice(
      sql.indexOf("WITH selected_relations"),
      sql.lastIndexOf("\nROLLBACK;"),
    );
    const actual = (await db.query(fragment)).rows[0].catalog;
    for (const key of ["tables", "columns", "indexes", "enums"])
      assert.deepEqual(actual[key], expected[key], "runtime " + key + " unchanged");
    assert.deepEqual(
      actual.constraints.filter((c) => c.type !== "n"),
      expected.constraints,
      "runtime critical constraints unchanged",
    );
    assert.deepEqual(actual.policies, [], "actual client policies deliberately not installed");
  }
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
  const installed = (
    await db.query(
      "SELECT p.oid::regprocedure::text signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY p.oid::regprocedure::text",
    )
  ).rows.map((r) => r.signature);
  assert.deepEqual(
    installed,
    [...signatures].sort(),
    "no undeclared public function substitutions",
  );
  assert.equal((await db.query("SELECT count(*)::int value FROM pg_policy")).rows[0].value, 0);
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
    "only four synthetic provider field definitions, not provider ordinals/schema",
  );
}
async function assertStaffSupport(db) {
  // Real retained full staff rowtype and all critical structure, no staff writes.
  const declared = (
    await db.query(
      'SELECT pg_get_userbyid(c.relowner) owner,c.relkind kind,c.relispartition partition,c.relrowsecurity rls,c.relforcerowsecurity AS "forceRls",c.relacl::text acl,(SELECT count(*)::int FROM pg_inherits i WHERE i.inhrelid=c.oid OR i.inhparent=c.oid) AS "inheritanceEdges" FROM pg_class c WHERE c.oid=\'public.staff_referrals\'::regclass',
    )
  ).rows[0];
  const saved = platformObserved.tables.find((t) => t.table === "staff_referrals");
  assert.deepEqual(declared, Object.fromEntries(Object.keys(declared).map((k) => [k, saved[k]])));
  const columns = (
    await db.query(
      "SELECT 'public' AS schema,'staff_referrals' AS table,a.attnum position,a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull AS \"notNull\",a.attidentity identity,a.attgenerated generated,md5(pg_get_expr(d.adbin,d.adrelid)) AS \"defaultMd5\",a.attacl::text acl FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid='public.staff_referrals'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum",
    )
  ).rows;
  assert.deepEqual(
    columns,
    platformObserved.columns.filter((c) => c.table === "staff_referrals"),
  );
  const constraints = (
    await db.query(
      "SELECT conname name,contype type,convalidated valid,md5(pg_get_constraintdef(oid)) hash FROM pg_constraint WHERE conrelid='public.staff_referrals'::regclass AND contype<>'n' ORDER BY conname",
    )
  ).rows;
  assert.deepEqual(
    constraints,
    platformObserved.constraints
      .filter((c) => c.table === "staff_referrals")
      .map((c) => ({ name: c.name, type: c.type, valid: c.validated, hash: c.definitionMd5 })),
  );
  const indexes = (
    await db.query(
      "SELECT c.relname name,md5(pg_get_indexdef(i.indexrelid)) hash FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE i.indrelid='public.staff_referrals'::regclass ORDER BY c.relname",
    )
  ).rows;
  assert.deepEqual(
    indexes,
    platformObserved.indexes
      .filter((c) => c.table === "staff_referrals")
      .map((c) => ({ name: c.name, hash: c.definitionMd5 })),
  );
  assert.deepEqual(
    (await db.query("SELECT 1 FROM public.staff_referrals")).rows,
    [],
    "no-referral frontier staff storage must remain empty",
  );
}
async function signup(
  db,
  { user = id(1), email = "ordinary@example.invalid", metadata = {}, confirmed = null } = {},
) {
  assert.ok(
    email === null || !/@365motorsales\.com$/i.test(email),
    "staff-domain path is outside this fixture",
  );
  assert.ok(
    metadata.referral_code === undefined ||
      metadata.referral_code === null ||
      metadata.referral_code === "",
    "nonempty-referral path is outside this fixture",
  );
  return db.query(
    "INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES($1,$2,$3,$4) RETURNING id",
    [user, email, JSON.stringify(metadata), confirmed],
  );
}
async function attempt(db, run) {
  await db.exec("SAVEPOINT lab_signup_attempt");
  try {
    const result = await run();
    await db.exec("RELEASE SAVEPOINT lab_signup_attempt");
    return result;
  } catch (e) {
    await db.exec("ROLLBACK TO SAVEPOINT lab_signup_attempt;RELEASE SAVEPOINT lab_signup_attempt");
    throw e;
  }
}
async function withBootstrap(run, { commonTier = true, bronze = true, bronzeActive = true } = {}) {
  return withBusiness(async (db) => {
    await db.exec("BEGIN");
    try {
      // Project only the four observed provider Auth field definitions, NOT its schema/ordinals/defaults/provider behavior.
      await db.exec(
        "ALTER TABLE auth.users ADD COLUMN email character varying(255),ADD COLUMN email_confirmed_at timestamp with time zone,ADD COLUMN raw_user_meta_data jsonb",
      );
      await db.exec(platformDDL.staff);
      for (const sql of platformDDL.indexes.filter((s) => s.includes("idx_staff_referrals_")))
        await db.exec(sql);
      await db.exec(
        "ALTER TABLE public.staff_referrals ENABLE ROW LEVEL SECURITY;GRANT ALL ON public.staff_referrals TO anon,authenticated,service_role",
      );
      for (const sql of Object.values(functions)) await db.exec(sql);
      // Exact selected retained later header setting only; no global DO/history replay.
      await db.exec(hardeningMarker.replace("%s", "public.is_internal_365_email(text)"));
      for (const signature of signatures) {
        const saved = bootstrapObserved.functions.find((f) => f.signature === signature),
          entries = saved.acl.slice(1, -1).split(",");
        assert.ok(
          entries.every((e) =>
            /^(?:postgres|anon|authenticated|service_role)?=X\/postgres$/.test(e),
          ),
        );
        if (!entries.includes("=X/postgres"))
          await db.exec("REVOKE ALL ON FUNCTION " + signature + " FROM PUBLIC");
        for (const e of entries) {
          const role = e.split("=")[0];
          if (role && role !== "postgres")
            await db.exec("GRANT EXECUTE ON FUNCTION " + signature + " TO " + role);
        }
      }
      // Explicit synthetic configuration, not historic seed replay or live config proof.
      if (commonTier)
        await db.exec(
          "INSERT INTO public.member_tiers(id,name,min_score,min_tenure_days,color,rank) VALUES('common','Synthetic common tier',0,0,'#000000',0)",
        );
      if (bronze)
        await db.query(
          "INSERT INTO public.subscription_plans(id,name,price_php,active) VALUES($1,'Bronze',0,$2)",
          [planId, bronzeActive],
        );
      for (const sql of attachments) await db.exec(sql);
      await db.exec("SET LOCAL search_path=pg_catalog,pg_temp");
      await assertFunctionEnvelopes(db);
      await assertAttachments(db);
      await assertStaffSupport(db);
      await assertRuntimeStructure(db);
      await db.exec("SET LOCAL search_path=public");
      const result = await run(db);
      await db.exec("SET LOCAL search_path=pg_catalog,pg_temp");
      await assertFunctionEnvelopes(db);
      await assertAttachments(db);
      await assertStaffSupport(db);
      await assertRuntimeStructure(db);
      return result;
    } finally {
      await db.exec("ROLLBACK");
    }
  });
}
export {
  withBootstrap,
  functions,
  selectionPins,
  signatures,
  attachments,
  tables,
  id,
  planId,
  data,
  snapshot,
  labSequenceState,
  assertFunctionEnvelopes,
  assertAttachments,
  signup,
  attempt,
};
