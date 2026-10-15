// OFFLINE catalog contracts, not signup behavior or migration adoption.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  sources,
  sourcePins,
  mappings,
  manifest,
  body,
  missing,
} from "./fixtures/auth-bootstrap-source-correspondence.mjs";
const root = new URL("../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const sql = read("scripts/ci/auth-bootstrap-catalog-review.sql");
const observationRaw = read("docs/evidence/auth-bootstrap-catalog-2026-10-15.json");
const observed = JSON.parse(observationRaw);
const priorRaw = read("docs/evidence/staff-partner-catalog-2026-10-15.json");
const prior = JSON.parse(priorRaw);
const fields = [
  "tables",
  "columns",
  "constraints",
  "indexes",
  "policies",
  "triggers",
  "functions",
  "enums",
  "sequences",
];
const options = { concurrency: false, timeout: 30_000 };
async function withDb(run) {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;");
    return await run(db);
  } finally {
    await db.close();
  }
}
const settings = async (db) =>
  (
    await db.query(
      "SELECT current_setting('search_path') path,current_setting('statement_timeout') statement_timeout,current_setting('lock_timeout') lock_timeout,current_setting('transaction_read_only') readonly",
    )
  ).rows[0];
async function execute(db) {
  const before = await settings(db);
  const result = await db.exec(sql);
  assert.equal(result.length, 6);
  assert.deepEqual(await settings(db), before, "rollback restores all local settings");
  const captures = result.flatMap((r) => r.rows).filter((r) => r.catalog);
  assert.equal(captures.length, 1);
  return captures[0].catalog;
}

test("read-only trusted catalog query has no row/helper/dynamic execution or raw definition projection", () => {
  assert.match(sql, /^-- READ-ONLY bounded auth\/profile\/org bootstrap/);
  assert.match(sql, /BEGIN READ ONLY;/);
  assert.match(sql, /SET LOCAL statement_timeout='5000ms';/);
  assert.match(sql, /SET LOCAL lock_timeout='1000ms';/);
  assert.match(sql, /SET LOCAL search_path=pg_catalog,pg_temp;/);
  assert.match(sql, /ROLLBACK;\s*$/);
  const surface = sql.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
  assert.doesNotMatch(
    surface,
    /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|EXECUTE|COPY|CALL|COMMIT)\b/i,
  );
  assert.doesNotMatch(surface, /\b(?:FROM|JOIN)\s+(?:public|auth|shop_manager)\./i);
  assert.doesNotMatch(surface, /\b(?:public|auth|shop_manager)\.[a-z_]+\s*\(/i);
  assert.doesNotMatch(
    sql,
    /pg_read_file|pg_ls_dir|lo_import|query_to_xml|dblink|nextval|currval|setval|last_value|is_called/i,
  );
  assert.doesNotMatch(sql, /'(?:definition|body|arguments|config|default|using|check)'\s*,/);
});

test("six public relations/four auth support columns/one sequence are explicitly bounded", () => {
  assert.match(
    sql,
    /\('profiles','organizations','organization_members','internal_org_settings',\s*'subscriptions','subscription_plans'\)/,
  );
  assert.match(sql, /a.attname IN \('id','email','raw_user_meta_data','email_confirmed_at'\)/);
  assert.match(sql, /c.relname='profiles_member_number_seq'/);
  assert.match(
    sql,
    /n.nspname IN \('public','auth'\) AND p.oid IN \(SELECT refobjid FROM expression_functions\)/,
  );
  assert.match(
    sql,
    /Direct catalog dependencies do not enumerate PL\/pgSQL dynamic\/transitive calls/,
  );
});

test(
  "query parses on a disposable empty catalog with all arrays empty and settings restored",
  options,
  async () => {
    await withDb(async (db) => {
      const result = await execute(db);
      for (const field of fields) assert.deepEqual(result[field], []);
      assert.equal(result.projectRef, "wjxaajgvddtrxxtocxen");
      assert.equal(result.mode, "read-only-catalog-fingerprints");
    });
  },
);

test(
  "diagnostic-only sentinel proves direct expression fingerprint capture does not call helper or read sequence value",
  options,
  async () => {
    await withDb(async (db) => {
      // Intentionally synthetic CATALOG probe, never a bootstrap behavioral support.
      await db.exec(`CREATE SEQUENCE public.profiles_member_number_seq;
      CREATE FUNCTION public.lab_catalog_probe(text) RETURNS boolean LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'MUST NOT EXECUTE';END;$$;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY,kind text CHECK(public.lab_catalog_probe(kind)),member_number bigint DEFAULT nextval('public.profiles_member_number_seq'));
      ALTER SEQUENCE public.profiles_member_number_seq OWNED BY public.profiles.member_number;
      GRANT USAGE ON public.profiles_member_number_seq TO authenticated;
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      CREATE POLICY lab_probe ON public.profiles TO authenticated USING(public.lab_catalog_probe(kind));`);
      const before = (
        await db.query("SELECT last_value,is_called FROM public.profiles_member_number_seq")
      ).rows;
      const result = await execute(db);
      assert.equal(result.tables.length, 1);
      assert.equal(result.functions.length, 1);
      assert.equal(result.functions[0].signature, "public.lab_catalog_probe(text)");
      assert.match(result.functions[0].bodyMd5Lf, /^[a-f0-9]{32}$/);
      assert.equal(result.sequences.length, 1);
      assert.equal(
        result.sequences[0].maximum,
        "9223372036854775807",
        "bigint metadata is exact text, never rounded JSON number",
      );
      assert.equal(result.sequences[0].start, "1");
      assert.deepEqual(result.sequences[0].ownedBy, ["public.profiles.member_number"]);
      assert.deepEqual(
        (await db.query("SELECT last_value,is_called FROM public.profiles_member_number_seq")).rows,
        before,
      );
      assert.equal(result.sequences[0].rights.find((r) => r.role === "authenticated").usage, true);
      const serialized = JSON.stringify(result);
      assert.doesNotMatch(serialized, /MUST NOT EXECUTE|last_value|is_called|RAISE EXCEPTION/);
    });
  },
);

test("final query and exact-text sequence observation are independently LF-pinned", () => {
  assert.equal(Buffer.byteLength(sql), 12725);
  assert.equal(hash(sql), "5ddc90c84163cb86340294175e4dd877aae28b2a54edd7d0bad5d92c03d27d6f");
  assert.equal(Buffer.byteLength(observationRaw), 98885);
  assert.equal(
    hash(observationRaw),
    "e3ed0e24c8e00d018370360b0b8abb8dc0a80fee0232148756857d6a41f7df9b",
  );
  assert.equal(observed.observedAtUtc, "2026-10-15T07:22:41.479679");
  assert.equal(observed.serverVersion, "17.6");
  assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(hash(priorRaw), "6851d471d2d5293c6db8a95d89caa5f65335783b5183ce4edb943dad964825f4");
});

test("dated capture preserves all nine facets and contains no raw definitions, rows or current sequence values", () => {
  assert.deepEqual(
    fields.map((k) => observed[k].length),
    [6, 123, 25, 22, 24, 15, 29, 6, 1],
  );
  const forbidden = new Set([
    "rows",
    "rowCounts",
    "definition",
    "body",
    "default",
    "config",
    "using",
    "check",
    "arguments",
    "last_value",
    "is_called",
    "currentValue",
    "appliedHistory",
    "acceptedBaseline",
    "releaseReady",
  ]);
  function inspect(value) {
    if (!value || typeof value !== "object") return;
    for (const [k, v] of Object.entries(value)) {
      assert.ok(!forbidden.has(k), k);
      inspect(v);
    }
  }
  inspect(observed);
  const s = observed.sequences[0];
  assert.equal(s.maximum, "9223372036854775807");
  for (const key of ["start", "increment", "minimum", "maximum", "cache"])
    assert.match(s[key], /^-?\d+$/);
  assert.deepEqual(s.ownedBy, ["public.profiles.member_number"]);
  assert.equal(s.type, "bigint");
  for (const role of ["anon", "authenticated", "postgres", "service_role"])
    assert.deepEqual(
      s.rights.find((r) => r.role === role),
      { role, usage: true, select: true, update: true },
    );
  assert.match(observed.limits, /Effective MAINTAIN is not evaluated/);
});

test("overlapping prior function, auth attachment, support column and app-role metadata stay unchanged", () => {
  const overlaps = prior.functions.filter((f) =>
    observed.functions.some((n) => n.signature === f.signature),
  );
  assert.ok(overlaps.length >= 12);
  for (const f of overlaps)
    assert.deepEqual(
      observed.functions.find((n) => n.signature === f.signature),
      f,
    );
  const columns = prior.columns.filter((c) =>
    observed.columns.some((n) => n.schema === c.schema && n.table === c.table && n.name === c.name),
  );
  assert.equal(columns.length, 8);
  for (const c of columns)
    assert.deepEqual(
      observed.columns.find(
        (n) => n.schema === c.schema && n.table === c.table && n.name === c.name,
      ),
      c,
    );
  const attachments = prior.triggers.filter((t) => t.table === "auth.users");
  assert.equal(attachments.length, 2);
  assert.deepEqual(
    observed.triggers.filter((t) => t.table === "auth.users"),
    attachments,
  );
  assert.deepEqual(
    observed.enums.find((e) => e.name === "app_role"),
    prior.enums.find((e) => e.name === "app_role"),
  );
});

test("six actual shapes retain nullable bindings, seller NOT NULL/enum and all 25 critical constraints", () => {
  for (const [table, count] of [
    ["internal_org_settings", 3],
    ["organization_members", 6],
    ["organizations", 23],
    ["profiles", 58],
    ["subscription_plans", 11],
    ["subscriptions", 18],
  ]) {
    assert.equal(observed.columns.filter((c) => c.table === table).length, count);
    const t = observed.tables.find((t) => t.table === table);
    assert.equal(t.owner, "postgres");
    assert.equal(t.rls, true);
    assert.equal(t.inheritanceEdges, 0);
  }
  assert.equal(
    observed.columns.find((c) => c.table === "profiles" && c.name === "seller_type").notNull,
    true,
  );
  assert.deepEqual(observed.enums.find((e) => e.name === "seller_type").labels, [
    "private",
    "business",
    "staff",
  ]);
  assert.deepEqual(observed.enums.find((e) => e.name === "org_role").labels, [
    "owner",
    "admin",
    "manager",
    "member",
    "viewer",
  ]);
  const external = observed.constraints.find(
    (c) => c.table === "profiles" && c.name === "profiles_tier_id_fkey",
  );
  assert.equal(
    external.referenceTable,
    "public.member_tiers",
    "new explicit external critical-table frontier, not removed for a fixture",
  );
  const membership = observed.constraints.find(
    (c) => c.table === "organization_members" && c.type === "u",
  );
  assert.deepEqual(membership.columns, ["organization_id", "user_id"]);
  assert.ok(observed.constraints.every((c) => c.validated && !c.deferrable && !c.deferred));
});

test("nine profile attachments include eight INSERT paths, plus real organization creator and subscription timestamp dependencies", () => {
  const profiles = observed.triggers.filter((t) => t.table === "public.profiles");
  assert.equal(profiles.length, 9);
  assert.equal(profiles.filter((t) => (t.typeBits & 4) !== 0).length, 8);
  assert.deepEqual(
    observed.triggers.filter((t) => t.table === "public.organizations").map((t) => t.name),
    ["org_add_creator_as_owner", "organizations_set_updated_at", "trg_block_internal_staff_org"],
  );
  assert.equal(
    observed.triggers.find((t) => t.name === "org_add_creator_as_owner").function,
    "public.tg_org_add_creator_as_owner()",
  );
  assert.equal(observed.triggers.filter((t) => t.table === "public.subscriptions").length, 1);
  assert.equal(
    observed.functions.find((f) => f.signature === "public.assign_profile_member_number()")
      .securityDefiner,
    false,
  );
  assert.equal(
    observed.functions.find(
      (f) => f.signature === "public.recompute_signup_intent(uuid,text,text,text,text,text,text)",
    ).defaults,
    6,
  );
});

test("25 current public bodies match 19 pinned retained sources; three org definitions and provider auth uid remain unresolved", () => {
  assert.equal(Object.keys(sourcePins).length, 19);
  assert.equal(Object.keys(sources).length, 19);
  assert.equal(Object.keys(mappings).length, 25);
  for (const [signature, m] of Object.entries(manifest)) {
    assert.equal(
      observed.functions.find((f) => f.signature === signature).bodyMd5Lf,
      m.bodyMd5Lf,
      signature,
    );
    assert.ok(m.bodyBytes > 0 && m.firstLine > 0);
    assert.match(m.bodySha256Lf, /^[a-f0-9]{64}$/);
  }
  assert.deepEqual(
    observed.functions
      .filter((f) => f.signature.startsWith("public.") && !mappings[f.signature])
      .map((f) => f.signature),
    missing,
  );
  assert.deepEqual(
    observed.functions.filter((f) => !f.signature.startsWith("public.")).map((f) => f.signature),
    ["auth.uid()"],
  );
});

test("source-reachable bootstrap dependencies and suspicious trial predicate are explicit predictions, not executed fixes", () => {
  assert.match(
    body["public.tg_auto_create_seller_org()"],
    /IF NEW.is_staff_account THEN RETURN NEW/,
  );
  assert.match(
    body["public.tg_auto_create_seller_org()"],
    /v_meta->>'is_staff_account'\)::boolean/,
  );
  assert.match(body["public.tg_auto_create_seller_org()"], /INSERT INTO public.organizations/);
  assert.match(
    body["public.set_internal_staff_manager()"],
    /v_admin uuid := public.canonical_365_admin_id\(\)/,
  );
  assert.match(body["public.attach_signup_referral()"], /s public.staff_referrals%ROWTYPE/);
  assert.match(body["public.grant_founding_bronze()"], /INSERT INTO public.subscriptions/);
  assert.match(
    body["public.assign_profile_member_number()"],
    /nextval\('public.profiles_member_number_seq'\)/,
  );
  assert.match(
    body["public.grant_business_trial()"],
    /business_kinds text\[\] := ARRAY\['dealer','repair_shop','insurance'\]/,
  );
  assert.match(
    body["public.grant_business_trial()"],
    /NEW.business_kind::text <> ANY\(business_kinds\)/,
  );
  assert.match(body["public.handle_new_user()"], /INSERT INTO public.profiles/);
  assert.match(body["public.handle_new_user()"], /INSERT INTO public.organization_members/);
  assert.doesNotMatch(body["public.handle_new_user()"], /INSERT INTO public.user_roles/);
});
