// MEMORY-ONLY nonempty user_referrals forward rehearsal on immutable PR54.
// Full actual referral/staff/partner/assignment and financial DDL; parent Auth/
// profile projections and auth.uid GUC shim remain explicitly synthetic.
// NOT Auth bootstrap, trusted actor, settled money, production/history or release.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  withPartnerFixture,
  catalog as parentCatalog,
  snapshot as parentSnapshot,
  observed as parentObserved,
} from "./staff-partner-empty-referrals-fixture.mjs";
const root = new URL("../../../", import.meta.url);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const md5 = (s) => (s === null ? null : createHash("md5").update(s).digest("hex"));
function pinned(path, hash, max = 128 * 1024) {
  const raw = fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
  assert.ok(Buffer.byteLength(raw) > 0 && Buffer.byteLength(raw) < max);
  assert.equal(sha(raw), hash, path);
  return raw;
}
pinned(
  "scripts/ci/fixtures/staff-partner-empty-referrals-fixture.mjs",
  "1d2c94fcf0bae4443dff0f5dbfdb42f767a365e24b57ab6e665daa7d8bbb329a",
);
pinned(
  "scripts/ci/staff-partner-empty-referrals.test.mjs",
  "a843d616c868e2f6adcd38a458cbc94248249d60f7071f809a848e5323141d1c",
);
const metadata = JSON.parse(
  pinned(
    "docs/evidence/referral-financial-catalog-2026-10-15.json",
    "deba693bf365e7811c20b520116a9f4f84d0eb6622f1b3e597dbb70dd4f09763",
  ),
);
const observed = JSON.parse(
  pinned(
    "docs/evidence/referral-financial-structure-2026-10-15.json",
    "97fbec8e9b7fb432a8758aec144023378cd5b066eac1dd116cedd2a3b26baa8b",
  ),
);
const metadataQuery = pinned(
  "scripts/ci/referral-financial-catalog-review.sql",
  "33781cdb706136454762c4647f4a29aff88b7c695b826a3cd013b734720c8655",
);
const query = pinned(
  "scripts/ci/referral-financial-structure-review.sql",
  "8d9ea5db4f0d4eda0448276a9325f27ac5ad5a8213819e438cfd6ad0efe133d3",
);
const sourcePins = {
  partner: [
    "20260701072731_9871982b-7cfc-4c7c-b27a-a88cfce0a6f5",
    "01264f38fa8dd524c9915580061368bfd5e2ec59b131102b60b7cc83617231d7",
  ],
  payout: [
    "20260701073345_120230cf-82bf-44f2-9a3f-845373a6c87c",
    "0046473fdadd5d878df3c8a7dd2d075557663a281cbaf80a970fdc21f8dd548c",
  ],
  bounty: [
    "20260728125715_52a60fda-14fe-4758-bf19-22284e3e7468",
    "283c8f951a31de8c9d24c0c46ecf2a545b6a0510d2ab30e3de0130cad32c3856",
  ],
  assignment: [
    "20260605050625_ab3ca880-2df9-4ae9-865f-cd1ca5c84255",
    "c6d06a6f89cf3900eb765387e0e518993331430c80fd708f2fe91df78e29765f",
  ],
};
const sources = Object.fromEntries(
  Object.entries(sourcePins).map(([k, [p, h]]) => [
    k,
    pinned("supabase/migrations/" + p + ".sql", h),
  ]),
);
const selections = {};
function select(key, source, marker, end = ";") {
  const raw = sources[source];
  assert.equal(raw.split(marker).length, 2);
  const first = raw.indexOf(marker),
    last = raw.indexOf(end, first + marker.length);
  assert.ok(last >= first);
  const text = raw.slice(first, last + end.length);
  selections[key] = {
    source,
    firstLine: raw.slice(0, first).split("\n").length,
    bytes: Buffer.byteLength(text),
    sha256Lf: sha(text),
  };
  return text;
}
const ddl = [
  select("events", "partner", "CREATE TABLE public.partner_program_commission_events ("),
  select("payouts", "payout", "CREATE TABLE public.partner_program_payouts ("),
  select("eventPayout", "payout", "ALTER TABLE public.partner_program_commission_events"),
  select(
    "dropEventType",
    "bounty",
    "ALTER TABLE public.partner_program_commission_events\n  DROP CONSTRAINT",
  ),
  select(
    "eventType",
    "bounty",
    "ALTER TABLE public.partner_program_commission_events\n  ADD CONSTRAINT",
  ),
  ...["pp_events_partner_idx"].map((n) => select(n, "partner", "CREATE INDEX " + n)),
  ...["pp_events_payout_idx", "pp_payouts_partner_idx"].map((n) =>
    select(n, "payout", "CREATE INDEX " + n),
  ),
  select(
    "idempotency",
    "bounty",
    "CREATE UNIQUE INDEX IF NOT EXISTS pp_commission_events_source_uniq",
  ),
];
const functions = {
  "public.pp_award_bounty(text,text,text)": select(
    "award",
    "bounty",
    "CREATE OR REPLACE FUNCTION public.pp_award_bounty(",
    "$$;",
  ),
  "public.pp_user_signup_bounty()": select(
    "signupBounty",
    "bounty",
    "CREATE OR REPLACE FUNCTION public.pp_user_signup_bounty()",
    "$$;",
  ),
  "public.tg_auto_assign_sales_rep()": select(
    "assignment",
    "assignment",
    "CREATE OR REPLACE FUNCTION public.tg_auto_assign_sales_rep()",
    "$$;",
  ),
  "public.pp_recompute_payout_total(uuid)": select(
    "recompute",
    "payout",
    "CREATE OR REPLACE FUNCTION public.pp_recompute_payout_total(",
    "$$;",
  ),
};
const attachments = [
  select("bountyAttachment", "bounty", "CREATE TRIGGER trg_pp_user_signup_bounty"),
  select("assignmentAttachment", "assignment", "CREATE TRIGGER trg_user_referrals_auto_assign_rep"),
  select("payoutAttachment", "payout", "CREATE TRIGGER pp_payouts_updated"),
];
const policies = [
  ...["partner_or_admin_read_events", "admin_write_events"].map((n) =>
    select(n, "partner", 'CREATE POLICY "' + n + '"'),
  ),
  ...["partner_or_admin_read_payouts", "admin_write_payouts"].map((n) =>
    select(n, "payout", 'CREATE POLICY "' + n + '"'),
  ),
];
const tables = observed.tables.map((t) => t.table);
for (const [sig, text] of Object.entries(functions)) {
  assert.equal(text.split("$$").length, 3);
  assert.equal(
    md5(text.split("$$")[1]),
    metadata.functions.find((f) => f.signature === sig).bodyMd5Lf,
  );
}
function piece(table, category, name) {
  const p = observed.pieces.filter(
    (p) => p.table === table && p.category === category && p.name === name,
  );
  assert.equal(p.length, 1);
  assert.equal(p[0].permitted, true);
  assert.equal(md5(p[0].definition), p[0].expectedMd5);
  return p[0].definition;
}
const fragment = (q) =>
  q.slice(q.indexOf("WITH selected_relations AS ("), q.indexOf(") catalog;") + ") catalog;".length);
async function catalog(db, sql = query) {
  const path = (await db.query("SELECT current_setting('search_path') path")).rows[0].path;
  await db.query("SELECT set_config('search_path','pg_catalog,pg_temp',true)");
  try {
    const { observedAtUtc, ...c } = (await db.query(fragment(sql))).rows[0].catalog;
    return c;
  } finally {
    await db.query("SELECT set_config('search_path',$1,true)", [path]);
  }
}
async function assertStructure(db, baseline) {
  const c = await catalog(db);
  for (const k of ["tables", "columns", "indexes", "policies", "enums"])
    assert.deepEqual(c[k], observed[k], k + ": exact financial structure");
  const nn = (
    await db.query(
      "SELECT k.conname name,cardinality(k.conkey) size,k.convalidated valid,EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=k.conrelid AND a.attnum=k.conkey[1] AND a.attnotnull AND NOT a.attisdropped) backed FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND k.contype='n' ORDER BY k.conname",
      [tables],
    )
  ).rows;
  assert.equal(nn.length, c.constraints.filter((k) => k.type === "n").length);
  for (const n of nn) assert.deepEqual([n.size, n.valid, n.backed], [1, true, true]);
  assert.deepEqual(
    c.constraints.filter((k) => k.type !== "n"),
    observed.constraints,
    "all 12 critical financial constraints",
  );
  // Provider auth.uid is the unchanged parent's explicitly synthetic GUC shim.
  assert.deepEqual(
    c.functions.find((f) => f.signature === "auth.uid()"),
    baseline.syntheticUid,
    "unchanged synthetic Auth uid envelope, not the provider definition",
  );
  assert.notEqual(
    baseline.syntheticUid.bodyMd5Lf,
    metadata.functions.find((f) => f.signature === "auth.uid()").bodyMd5Lf,
  );
  assert.deepEqual(
    c.functions.filter((f) => f.signature.startsWith("public.")),
    observed.functions.filter((f) => f.signature.startsWith("public.")),
    "six exact public full function envelopes",
  );
  assert.deepEqual(c.triggers, observed.triggers, "actual payout attachment");
  const parent = await parentCatalog(db);
  for (const k of ["tables", "columns", "constraints", "indexes", "policies", "enums"])
    assert.deepEqual(parent[k], baseline[k], "unchanged parent " + k);
  const extra = parentObserved.triggers.filter((t) => t.table === "public.user_referrals");
  assert.equal(extra.length, 2);
  assert.deepEqual(
    parent.triggers,
    [...baseline.triggers, ...extra].sort((a, b) =>
      (a.table + "\0" + a.name).localeCompare(b.table + "\0" + b.name),
    ),
    "all fourteen parent/referral attachments",
  );
  const expected = [
    ...baseline.functions,
    ...extra.map((t) => metadata.functions.find((f) => f.signature === t.function)),
  ].sort((a, b) => a.signature.localeCompare(b.signature));
  assert.deepEqual(
    new Map(parent.functions.map((f) => [f.signature, f])),
    new Map(expected.map((f) => [f.signature, f])),
    "seventeen exact parent public function envelopes",
  );
}
async function snapshot(db) {
  const c = await parentSnapshot(db);
  for (const t of tables)
    c.data[t] = (
      await db.query("SELECT to_jsonb(t) row FROM public." + t + " t ORDER BY to_jsonb(t)::text")
    ).rows.map((x) => x.row);
  return c;
}
async function attempt(db, run) {
  await db.exec("SAVEPOINT referral_attempt");
  try {
    const r = await run();
    await db.exec("RELEASE SAVEPOINT referral_attempt");
    return r;
  } catch (e) {
    await db.exec("ROLLBACK TO SAVEPOINT referral_attempt;RELEASE SAVEPOINT referral_attempt");
    throw e;
  }
}
async function asActor(db, role, subject, sql, args = []) {
  assert.ok(["postgres", "anon", "authenticated", "service_role"].includes(role));
  return attempt(db, async () => {
    const before = (
      await db.query(
        "SELECT current_user role,current_setting('request.jwt.claim.sub',true) subject",
      )
    ).rows[0];
    assert.equal(before.role, "postgres");
    await db.exec("SET LOCAL ROLE " + role);
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [subject ?? ""]);
    const result = await db.query(sql, args);
    await db.exec("SET LOCAL ROLE postgres");
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [before.subject ?? ""]);
    return result;
  });
}
async function withReferrals(run) {
  return withPartnerFixture(async (db) => {
    const baseline = await parentCatalog(db);
    await db.exec("BEGIN");
    try {
      for (const s of ddl) await db.exec(s);
      for (const [sig, text] of Object.entries(functions)) {
        await db.exec(text);
        assert.equal(
          metadata.functions.find((f) => f.signature === sig).acl,
          "{postgres=X/postgres,service_role=X/postgres}",
        );
        await db.exec(
          "REVOKE ALL ON FUNCTION " +
            sig +
            " FROM PUBLIC;GRANT EXECUTE ON FUNCTION " +
            sig +
            " TO service_role",
        );
      }
      for (const t of tables)
        await db.exec(
          "ALTER TABLE public." +
            t +
            " ENABLE ROW LEVEL SECURITY;GRANT ALL ON TABLE public." +
            t +
            " TO anon,authenticated,service_role",
        );
      for (const s of [...policies, ...attachments]) await db.exec(s);
      baseline.syntheticUid = (await catalog(db)).functions.find(
        (f) => f.signature === "auth.uid()",
      );
      assert.equal(baseline.syntheticUid.bodyMd5Lf, "9ef976b33881204375bbe9a82334ec84");
      await assertStructure(db, baseline);
      const result = await run(db);
      await assertStructure(db, baseline);
      return result;
    } finally {
      await db.exec("ROLLBACK");
    }
  });
}
export {
  withReferrals,
  metadata,
  observed,
  query,
  metadataQuery,
  sourcePins,
  sources,
  selections,
  ddl,
  functions,
  attachments,
  policies,
  tables,
  piece,
  catalog,
  assertStructure,
  snapshot,
  attempt,
  asActor,
};
