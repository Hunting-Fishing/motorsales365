// DISPOSABLE full Auth/staff + selected claim/evidence/owner UPDATE composition.
// Not storage-byte/API/JWT/original-human/native-team/concurrent/release proof.
// Seven non-owner business INSERT/status/domain attachments stay explicitly
// excluded; no permissive substitutes or original-history adoption.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  withStaff,
  tables as baseTables,
  signatures as baseSignatures,
  expectedAttachments as baseAttachments,
  data as baseData,
  attempt,
  asSettings,
  signup,
  id,
  labSequenceState,
} from "./full-staff-writer-fixture.mjs";
import { ddl as claimDDL, functions as claimFunctions } from "./native-ownership-claim-fixture.mjs";
import { ownerIntentDdl, ownerIntentFunctions } from "./native-owner-intent-fixture.mjs";
import { metadata as businessMetadata } from "./bootstrap-business-structure-fixture.mjs";
import { sequenceCatalog } from "./bootstrap-core-structure-fixture.mjs";
const root = new URL("../../../", import.meta.url);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const md5 = (s) => createHash("md5").update(s).digest("hex");
const pins = {
  "scripts/ci/fixtures/full-staff-writer-fixture.mjs":
    "06977f1bb407a2afe8bfce2843ad02dde4e5f0a698dd5303b03a5637b74859f0",
  "scripts/ci/full-staff-writer-composition.test.mjs":
    "72ee3cf22c68034329c5af58da11008ac4514a7135b82b59750b2ae95fc2e58e",
  "scripts/ci/fixtures/native-ownership-claim-fixture.mjs":
    "a630a01680897609ef6347ac9dbd9c109f40af08d5ff71e46534bb60daf70215",
  "scripts/ci/fixtures/native-owner-intent-fixture.mjs":
    "bc05ec41b20abd048663f1f1be30e3f61b0bc4b7028a974ff254372dbd0e80fb",
  "supabase/migrations/20260606130250_6d6b8df8-037d-43a6-88d4-a9541634eb7e.sql":
    "00187ddc9d1b3723e1d026d624809c708daad6a57540be32ee72ea5e80f3800d",
  "supabase/migrations/20260606130908_794768e3-771f-42ed-b904-e5f51aa1f509.sql":
    "48507fe468b991dd2c6ea4189b50115bb20c355c6e7a0484ac717f4c33ca83b1",
  "scripts/ci/claim-evidence-catalog-review.sql":
    "004f50413eaeee3dca1ca655c94aebef6a4893dca6693e80075bbdfe18c9bfec",
  "docs/evidence/claim-evidence-catalog-2026-10-15.json":
    "3f70143d79d46daf52b5de222d367ba0bd40a9136c910301953deb24c7a90616",
};
function read(path) {
  const s = fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
  assert.ok(Buffer.byteLength(s) > 0 && Buffer.byteLength(s) < 128 * 1024);
  assert.equal(sha(s), pins[path], path);
  return s;
}
for (const p of Object.keys(pins)) read(p);
const query = read("scripts/ci/claim-evidence-catalog-review.sql");
const raw = read("docs/evidence/claim-evidence-catalog-2026-10-15.json");
const observed = JSON.parse(raw);
assert.equal(raw, JSON.stringify(observed, null, 2) + "\n", "canonical reviewed metadata capture");
assert.equal(observed.observedAtUtc, "2026-10-15T11:41:19.388797");
assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
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
  [3, 31, 11, 10, 8, 4, 8],
);
const addedTables = observed.tables.map((t) => t.table);
const tables = [...baseTables, ...addedTables].sort();
const sources = {
  evidence: read("supabase/migrations/20260606130250_6d6b8df8-037d-43a6-88d4-a9541634eb7e.sql"),
  audit: read("supabase/migrations/20260606130908_794768e3-771f-42ed-b904-e5f51aa1f509.sql"),
};
const selections = {};
function select(key, source, marker, end = ";") {
  const s = sources[source];
  assert.equal(s.split(marker).length, 2, key + " unique start");
  const first = s.indexOf(marker),
    last = s.indexOf(end, first + marker.length) + end.length;
  assert.ok(last > first);
  const value = s.slice(first, last);
  selections[key] = {
    source,
    marker,
    firstLine: s.slice(0, first).split("\n").length,
    bytes: Buffer.byteLength(value),
    sha256Lf: sha(value),
  };
  return value;
}
const functions = {
  "public.approve_business_claim(uuid,boolean)": claimFunctions.approve,
  "public.guard_business_owner_update()": claimFunctions.guard,
  "public.touch_updated_at()": claimFunctions.touch,
  "public.tg_claim_audit_status()": claimFunctions.audit,
  "public.trg_businesses_recompute_intent()": ownerIntentFunctions.businessIntent,
  "public.tg_claim_audit_evidence()": select(
    "evidenceAudit",
    "audit",
    "CREATE OR REPLACE FUNCTION public.tg_claim_audit_evidence(",
    "$$;",
  ),
};
for (const [sig, s] of Object.entries(functions)) {
  const cap = observed.functions.find((f) => f.signature === sig);
  assert.ok(cap, sig);
  const delimiter = s.includes("$function$") ? "$function$" : "$$";
  assert.equal(s.split(delimiter).length, 3);
  assert.equal(md5(s.split(delimiter)[1]), cap.bodyMd5Lf, sig + " current source body");
}
const ddl = [
  claimDDL.claims,
  claimDDL.kindColumn,
  claimDDL.kindCheck,
  claimDDL.audit,
  select("evidenceTable", "evidence", "CREATE TABLE public.business_claim_evidence ("),
  claimDDL.kindIndex,
  claimDDL.claimBusinessIndex,
  claimDDL.claimClaimantIndex,
  claimDDL.claimStatusIndex,
  claimDDL.auditIndex,
  select("evidenceClaimIndex", "evidence", "CREATE INDEX idx_bce_claim"),
  select("evidenceUploaderIndex", "evidence", "CREATE INDEX idx_bce_uploader"),
];
const attachments = [
  claimDDL.guardAttachment,
  claimDDL.businessTimestampAttachment,
  claimDDL.touchAttachment,
  claimDDL.auditAttachment,
  ownerIntentDdl.businessIntentAttachment,
  select("evidenceInsert", "audit", "CREATE TRIGGER trg_claim_audit_evidence_ins"),
  select("evidenceDelete", "audit", "CREATE TRIGGER trg_claim_audit_evidence_del"),
];
const businessNames = [
  "trg_guard_business_owner_update",
  "set_businesses_updated_at",
  "businesses_recompute_intent",
];
const expectedAttachments = [
  ...baseAttachments,
  ...observed.triggers,
  ...businessMetadata.triggers.filter((t) => businessNames.includes(t.name)),
].sort((a, b) => (a.table + "\0" + a.name < b.table + "\0" + b.name ? -1 : 1));
assert.equal(expectedAttachments.length, 37);
const excludedBusinessAttachments = businessMetadata.triggers
  .filter((t) => !businessNames.includes(t.name))
  .map((t) => t.name);
assert.equal(excludedBusinessAttachments.length, 7);
const signatures = [...baseSignatures, ...Object.keys(functions), "auth.uid()"].sort();
const fragment = query.slice(
  query.indexOf("WITH selected_relations"),
  query.indexOf(") catalog;") + ") catalog;".length,
);
assert.equal(query.split("WITH selected_relations").length, 2);
let fullFragment = fragment.replace(
  "('business_claim_requests','business_claim_audit','business_claim_evidence')",
  () => "(" + tables.map((t) => "'" + t + "'").join(",") + ")",
);
assert.equal(fullFragment.split("t.tgrelid IN (SELECT oid FROM selected_relations)").length, 2);
fullFragment = fullFragment.replace(
  "t.tgrelid IN (SELECT oid FROM selected_relations)",
  "(t.tgrelid IN (SELECT oid FROM selected_relations) OR t.tgrelid='auth.users'::regclass)",
);
const fnStart = fullFragment.indexOf("), selected_functions AS ("),
  fnEnd = fullFragment.indexOf("\nSELECT pg_catalog.jsonb_build_object(", fnStart);
assert.ok(fnStart > 0 && fnEnd > fnStart);
fullFragment =
  fullFragment.slice(0, fnStart) +
  "), selected_functions AS (\n SELECT p.* FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth')\n)" +
  fullFragment.slice(fnEnd);
async function catalog(db, sql = fragment) {
  const path = (await db.query("SELECT current_setting('search_path') path")).rows[0].path;
  await db.exec("SET LOCAL search_path=pg_catalog,pg_temp");
  try {
    return (await db.query(sql)).rows[0].catalog;
  } finally {
    await db.query("SELECT set_config('search_path',$1,true)", [path]);
  }
}
const facets = [
  "tables",
  "columns",
  "constraints",
  "indexes",
  "policies",
  "enums",
  "functions",
  "triggers",
];
const critical = (c) => ({ ...c, constraints: c.constraints.filter((v) => v.type !== "n") });
function structural(c) {
  return Object.fromEntries(facets.map((k) => [k, c[k]]));
}
async function controls(db) {
  const path = (await db.query("SELECT current_setting('search_path') path")).rows[0].path;
  await db.exec("SET LOCAL search_path=pg_catalog,pg_temp");
  try {
    return {
      sequence: await sequenceCatalog(db),
      authColumns: (
        await db.query(
          'SELECT a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull AS "notNull",md5(pg_get_expr(d.adbin,d.adrelid)) AS "defaultMd5" FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=\'auth.users\'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attname',
        )
      ).rows,
    };
  } finally {
    await db.query("SELECT set_config('search_path',$1,true)", [path]);
  }
}
async function assertStructure(db, base, baseControls) {
  assert.deepEqual(
    await controls(db),
    baseControls,
    "full Auth fields and member sequence configuration/ownership/ACL unchanged",
  );
  const c = critical(await catalog(db, fullFragment));
  const baseFn = new Set(base.functions.map((f) => f.signature)),
    baseTrig = new Set(base.triggers.map((t) => t.table + "\0" + t.name));
  const retained = Object.fromEntries(
    facets.map((k) => [
      k,
      k === "functions"
        ? c[k].filter((f) => baseFn.has(f.signature))
        : k === "triggers"
          ? c[k].filter((t) => baseTrig.has(t.table + "\0" + t.name))
          : ["enums"].includes(k)
            ? c[k]
            : c[k].filter((v) => baseTables.includes(v.table)),
    ]),
  );
  assert.deepEqual(
    retained,
    base,
    "all full parent tables/FKs/defaults/indexes/enums/current function/provider envelopes/ACLs/attachments preserved",
  );
  const selected = critical(await catalog(db));
  // auth.uid's catalog expression edge comes from live client policies, which
  // are excluded locally. Check the real installed provider envelope from the
  // complete catalog, not a stub or a newly installed permissive policy.
  selected.functions = c.functions.filter((f) =>
    observed.functions.some((e) => e.signature === f.signature),
  );
  for (const k of facets)
    if (k !== "policies")
      assert.deepEqual(selected[k], observed[k], "complete actual three-table claim/evidence " + k);
  assert.deepEqual(
    selected.policies,
    [],
    "legacy client policies excluded, not accepted authority",
  );
  assert.deepEqual(
    c.functions.map((f) => f.signature).sort(),
    signatures,
    "exact public/Auth function allowlist; no new identity shim",
  );
  assert.deepEqual(c.triggers, expectedAttachments, "all 37 selected actual attachments");
  assert.deepEqual(
    c.tables.map((t) => t.table),
    tables,
    "all 24 complete tables",
  );
  assert.equal((await db.query("SELECT count(*)::int n FROM pg_policy")).rows[0].n, 0);
  const installed = (
    await db.query(
      "SELECT c.relname name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname",
    )
  ).rows.map((v) => v.name);
  assert.deepEqual(installed, tables, "no extra reduced support tables");
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
}
async function data(db) {
  const d = await baseData(db);
  for (const t of addedTables)
    d["public." + t] = (
      await db.query("SELECT to_jsonb(t) row FROM public." + t + " t ORDER BY to_jsonb(t)::text")
    ).rows.map((v) => v.row);
  return d;
}
const snapshot = async (db) => JSON.stringify(await data(db));
async function withClaims(run) {
  return withStaff(async (db, baseGuard) => {
    await baseGuard();
    const base = structural(critical(await catalog(db, fullFragment))),
      baseControls = await controls(db);
    await db.exec("SAVEPOINT full_claim_evidence");
    try {
      for (const s of ddl) await db.exec(s);
      for (const t of addedTables) {
        assert.equal(
          observed.tables.find((v) => v.table === t).acl,
          "{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}",
        );
        await db.exec(
          "ALTER TABLE public." +
            t +
            " ENABLE ROW LEVEL SECURITY;GRANT ALL ON TABLE public." +
            t +
            " TO anon,authenticated,service_role",
        );
      }
      for (const [sig, s] of Object.entries(functions)) {
        assert.equal(
          observed.functions.find((f) => f.signature === sig).acl,
          "{postgres=X/postgres,service_role=X/postgres}",
        );
        await db.exec(s);
        await db.exec(
          "REVOKE ALL ON FUNCTION " +
            sig +
            " FROM PUBLIC;GRANT EXECUTE ON FUNCTION " +
            sig +
            " TO service_role",
        );
      }
      for (const s of attachments) await db.exec(s);
      const guard = () => assertStructure(db, base, baseControls);
      await guard();
      const result = await run(db, guard);
      await guard();
      return result;
    } finally {
      await db.exec(
        "ROLLBACK TO SAVEPOINT full_claim_evidence;RELEASE SAVEPOINT full_claim_evidence",
      );
    }
  });
}
export {
  withClaims,
  observed,
  query,
  functions,
  ddl,
  attachments,
  expectedAttachments,
  excludedBusinessAttachments,
  tables,
  signatures,
  pins,
  selections,
  catalog,
  data,
  snapshot,
  attempt,
  asSettings,
  signup,
  id,
  labSequenceState,
};
