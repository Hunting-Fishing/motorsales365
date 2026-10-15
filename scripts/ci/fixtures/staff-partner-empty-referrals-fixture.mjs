// MEMORY-ONLY extension of immutable PR50, never a production/baseline migration.
// The actual partner wrapper SELECT runs against an actual EMPTY user_referrals.
// No intent helper stub: a nonempty loop is intentionally NOT composed here.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  withFixture,
  snapshot as baseSnapshot,
  assertObservedSubset as assertBase,
  signatures as baseSignatures,
  sha,
} from "./platform-role-forward-fixture.mjs";

const root = new URL("../../../", import.meta.url);
const md5 = (s) => createHash("md5").update(s).digest("hex");
function readPinned(path, hash, max = 512 * 1024) {
  const bytes = fs.readFileSync(new URL(path, root));
  assert.ok(bytes.length > 0 && bytes.length <= max, `${path}: bounded bytes`);
  const raw = bytes.toString("utf8");
  assert.ok(Buffer.from(raw, "utf8").equals(bytes), `${path}: exact UTF8`);
  const text = raw.replace(/\r\n/g, "\n");
  assert.equal(sha(text), hash, `${path}: LF pin`);
  return text;
}
const immutable = {
  fixture: [
    "scripts/ci/fixtures/platform-role-forward-fixture.mjs",
    "e2843eaf7c185eb52a21c342a482a1adb894f34ec1f4d8288a32db15b64da512",
  ],
  tests: [
    "scripts/ci/platform-role-forward-composition.test.mjs",
    "55438e113952621868b15509e3926dd3a9307426df21df29cca8b082e951464b",
  ],
};
for (const [path, hash] of Object.values(immutable)) readPinned(path, hash);
const sourcePins = {
  partner: [
    "20260701072731_9871982b-7cfc-4c7c-b27a-a88cfce0a6f5",
    "01264f38fa8dd524c9915580061368bfd5e2ec59b131102b60b7cc83617231d7",
  ],
  deltas: [
    "20260728125715_52a60fda-14fe-4758-bf19-22284e3e7468",
    "283c8f951a31de8c9d24c0c46ecf2a545b6a0510d2ab30e3de0130cad32c3856",
  ],
  wrapper: [
    "20260706045715_97c676ff-485d-46a0-a0e6-cc08a8da583d",
    "90863c60422c966f01821532924ea46025ce5eecf2e71aa67b548a4ba762f493",
  ],
  attachment: [
    "20260706045048_1725132d-d311-46a4-8ce9-cffcca83cb5d",
    "0078df2357ddae0393eda7cb23a4287db197cc5d9eb1fb3b28f2c830c50208e8",
  ],
  timestamp: [
    "20260626070030_62255aec-1325-404a-a557-670626029309",
    "e6c6c4956837d4861698eb95aa7709962fc0783440cc0df513ea2d86afe463fa",
  ],
  referrals: [
    "20260512034115_20d8dec1-5c0e-44b9-b23b-bf899ef89f48",
    "4ebb50a031d04e6f96aaa529d9ea9585dcbd8a3b428104ad257ebff530076f15",
  ],
  own: [
    "20260526140147_f6f966b7-0fc5-46c2-b4d8-118c389b2900",
    "02a6b409f4d2bd25b82c1037439578881572039ef7229786f10e1fa9e5184fc1",
  ],
  sales: [
    "20260703041725_735e3af3-b71d-420f-a48c-9f9418f9fd03",
    "1ded299434914f92a21d9b4311928136bd6f865b4d86575b4a92be2c82ba88df",
  ],
  advertising: [
    "20260626025547_fd987b1e-420b-4682-a7f0-21cc28a6eb9b",
    "81b78b3629affd218770ab98490ad22608d74dffe6ab30c20b295a8803ff88e2",
  ],
  indexes: [
    "20260706060958_d3327508-28b4-441c-8c04-04a1ae4ec6a3",
    "59b91e47b16f6c3e55f2f3021e1046a14fc5f4af9b3830ed5439bc562f8a1878",
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
  assert.equal(raw.split(marker).length, 2, `${key}: unique marker`);
  const first = raw.indexOf(marker),
    last = raw.indexOf(end, first + marker.length);
  assert.ok(last >= first, `${key}: complete statement`);
  const text = raw.slice(first, last + end.length);
  selections[key] = {
    source,
    marker,
    end,
    firstLine: raw.slice(0, first).split("\n").length,
    lastLine: raw.slice(0, last + end.length).split("\n").length,
    sha256Lf: sha(text),
    bytes: Buffer.byteLength(text),
  };
  return text;
}
const functions = {
  timestamp: select(
    "timestamp",
    "timestamp",
    "CREATE OR REPLACE FUNCTION public.update_updated_at_column()",
    "$$ LANGUAGE plpgsql SET search_path = public;",
  ),
  wrapper: select(
    "wrapper",
    "wrapper",
    "CREATE OR REPLACE FUNCTION public.trg_partners_recompute_intent()",
    "$function$;",
  ),
};
const signatures = {
  timestamp: "public.update_updated_at_column()",
  wrapper: "public.trg_partners_recompute_intent()",
};
const ddl = {
  tables: [
    select("applications", "partner", "CREATE TABLE public.partner_program_applications ("),
    select("partners", "partner", "CREATE TABLE public.partner_program_partners ("),
    select("referrals", "referrals", "CREATE TABLE public.user_referrals ("),
  ],
  deltas: [
    select("applicationsDelta", "deltas", "ALTER TABLE public.partner_program_applications"),
    select("partnersDelta", "deltas", "ALTER TABLE public.partner_program_partners"),
  ],
  policies: [
    ...[
      "anon_insert_apps",
      "auth_insert_apps",
      "self_read_apps",
      "admin_update_apps",
      "self_or_admin_read_partners",
      "admin_write_partners",
    ].map((name) => select(name, "partner", `CREATE POLICY "${name}"`)),
    select("applicantOwn", "deltas", 'CREATE POLICY "Applicants read own partner application"'),
    ...["Admins manage user_referrals", "User reads own referral row"].map((name) =>
      select(name, "referrals", `CREATE POLICY "${name}"`),
    ),
    select("staffOwn", "own", 'CREATE POLICY "Staff read own credited signups"'),
    select("salesOwn", "sales", 'CREATE POLICY "Sales read user_referrals"'),
    select("advertising", "advertising", 'CREATE POLICY "Advertising read user_referrals"'),
  ],
  indexes: [
    ...["pp_apps_status_idx", "pp_partners_user_idx"].map((name) =>
      select(name, "partner", `CREATE INDEX ${name}`),
    ),
    ...["idx_user_referrals_staff", "idx_user_referrals_credit"].map((name) =>
      select(name, "referrals", `CREATE INDEX ${name}`),
    ),
    ...["idx_user_referrals_signup_date", "idx_user_referrals_first_code"].map((name) =>
      select(name, "indexes", `CREATE INDEX IF NOT EXISTS ${name}`),
    ),
  ],
  attachments: [
    select("appsTimestamp", "partner", "CREATE TRIGGER pp_apps_updated"),
    select("partnersTimestamp", "partner", "CREATE TRIGGER pp_partners_updated"),
    select("intentAttachment", "attachment", "CREATE TRIGGER partners_recompute_intent"),
  ],
};
const observation = {
  path: "docs/evidence/staff-partner-catalog-2026-10-15.json",
  sha256Lf: "6851d471d2d5293c6db8a95d89caa5f65335783b5183ce4edb943dad964825f4",
};
const observed = JSON.parse(readPinned(observation.path, observation.sha256Lf, 128 * 1024));
assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
assert.equal(observed.observedAtUtc, "2026-10-15T06:17:10.912953");
assert.equal(observed.serverVersion, "17.6");
const catalogQuery = {
  path: "scripts/ci/staff-partner-catalog-review.sql",
  sha256Lf: "cbd77aca937487d1e514ac66999bf110787596594c73b5eb013c18d80b76044a",
};
const querySource = readPinned(catalogQuery.path, catalogQuery.sha256Lf, 16 * 1024);
assert.equal(querySource.split("WITH selected_relations AS (").length, 2);
assert.equal(querySource.split(") catalog;").length, 2);
const catalogSql = querySource.slice(
  querySource.indexOf("WITH selected_relations AS ("),
  querySource.indexOf(") catalog;") + ") catalog;".length,
);
for (const [key, text] of Object.entries(functions)) {
  const delimiter = key === "wrapper" ? "$function$" : "$$";
  assert.equal(text.split(delimiter).length, 3);
  selections[key].bodyMd5Lf = md5(text.split(delimiter)[1]);
  assert.equal(
    selections[key].bodyMd5Lf,
    observed.functions.find((value) => value.signature === signatures[key]).bodyMd5Lf,
  );
}
const newTables = ["partner_program_applications", "partner_program_partners", "user_referrals"];
const loadedSignatures = [...Object.values(baseSignatures), ...Object.values(signatures)];
const excludedAttachments = ["auth.users", "public.user_referrals"];
const pins = {
  immutable,
  sources: sourcePins,
  selections,
  observation,
  catalogQuery,
  exclusions: {
    referrals:
      "Actual table is EMPTY: no user_referrals INSERT/UPDATE/DELETE success, two writer fanouts omitted, no helper stub and no nonempty-loop coverage",
    intent:
      "Actual partner wrapper/attachment retained; recompute_signup_intent overloads, derive/profile/admin-audit effects absent, not stubbed",
    auth: "PR50 synthetic auth/profile read projections remain; no auth bootstrap, original actor, session/offboarding/concurrency or production proof",
    authority:
      "Existing synthetic platform admins and broad table grants reproduced, never adopted as professional application authority; not native shop roles",
  },
};
async function emptyReferrals(db) {
  assert.deepEqual(
    (await db.query("SELECT id FROM public.user_referrals")).rows,
    [],
    "bounded empty-referrals branch only",
  );
}
async function catalog(db) {
  const path = (await db.query("SELECT current_setting('search_path') value")).rows[0].value;
  await db.query("SELECT set_config('search_path','pg_catalog,pg_temp',false)");
  try {
    const { observedAtUtc, ...result } = (await db.query(catalogSql)).rows[0].catalog;
    return result;
  } finally {
    await db.query("SELECT set_config('search_path',$1,false)", [path]);
  }
}
async function assertObservedSubset(db) {
  await assertBase(db);
  const actual = await catalog(db);
  for (const facet of ["tables", "enums", "policies", "indexes"])
    assert.deepEqual(actual[facet], observed[facet], `${facet}: exact nine-table metadata`);
  const shape = (values) =>
    values.map(({ position, ...value }) =>
      ["profiles", "users"].includes(value.table) ? value : { ...value, position },
    );
  assert.deepEqual(
    shape(actual.columns),
    shape(observed.columns),
    "all 117 column fingerprints, except synthetic support positions",
  );
  const nn = (
    await db.query(
      `SELECT k.conname name,cardinality(k.conkey) size,k.convalidated valid,
    EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=k.conrelid AND a.attnum=k.conkey[1] AND a.attnotnull AND NOT a.attisdropped) backed
    FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND k.contype='n' ORDER BY k.conname`,
      [observed.tables.map((v) => v.table)],
    )
  ).rows;
  assert.equal(nn.length, actual.constraints.filter((v) => v.type === "n").length);
  for (const entry of nn)
    assert.deepEqual([entry.size, entry.valid, entry.backed], [1, true, true]);
  assert.deepEqual(
    actual.constraints.filter((v) => v.type !== "n"),
    observed.constraints,
    "28 critical constraints; only backed PG18 NOT NULL entries normalized",
  );
  assert.equal(actual.functions.length, 15);
  assert.equal(new Set(actual.functions.map((v) => v.signature)).size, 15);
  assert.deepEqual(
    new Map(actual.functions.map((v) => [v.signature, v])),
    new Map(
      observed.functions
        .filter((v) => loadedSignatures.includes(v.signature))
        .map((v) => [v.signature, v]),
    ),
    "15 exact full function metadata envelopes",
  );
  assert.deepEqual(
    actual.triggers,
    observed.triggers.filter((v) => !excludedAttachments.includes(v.table)),
    "12 actual selected forward attachments; auth and user-referral writers excluded",
  );
  return actual;
}
async function snapshot(db) {
  const base = await baseSnapshot(db);
  for (const table of newTables)
    base.data[table] = (
      await db.query(`SELECT to_jsonb(t) row FROM public.${table} t ORDER BY to_jsonb(t)::text`)
    ).rows.map((v) => v.row);
  base.catalog = await catalog(db);
  return base;
}
async function withPartnerFixture(run, options) {
  return withFixture(async (db) => {
    for (const sql of [...ddl.tables, ...ddl.deltas, ...ddl.indexes]) await db.exec(sql);
    for (const [key, sql] of Object.entries(functions)) {
      await db.exec(sql);
      const signature = signatures[key];
      assert.equal(
        observed.functions.find((v) => v.signature === signature).acl,
        "{postgres=X/postgres,service_role=X/postgres}",
      );
      await db.exec(
        `REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC;GRANT EXECUTE ON FUNCTION ${signature} TO service_role`,
      );
    }
    for (const table of newTables) {
      assert.equal(
        observed.tables.find((v) => v.table === table).acl,
        "{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}",
      );
      await db.exec(
        `GRANT ALL ON public.${table} TO anon,authenticated,service_role;ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
    }
    for (const sql of [...ddl.policies, ...ddl.attachments]) await db.exec(sql);
    await assertObservedSubset(db);
    await emptyReferrals(db);
    const result = await run(db);
    await emptyReferrals(db);
    await assertObservedSubset(db);
    return result;
  }, options);
}
export {
  withPartnerFixture,
  snapshot,
  catalog,
  assertObservedSubset,
  emptyReferrals,
  sources,
  functions,
  ddl,
  signatures,
  pins,
  observed,
};
