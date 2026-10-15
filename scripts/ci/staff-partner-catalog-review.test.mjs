// Fingerprint-only offline contracts. No application rows or live SQL execution.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const root = new URL("../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const artifacts = [
  [
    "scripts/ci/staff-partner-catalog-review.sql",
    10296,
    "cbd77aca937487d1e514ac66999bf110787596594c73b5eb013c18d80b76044a",
  ],
  [
    "docs/evidence/staff-partner-catalog-2026-10-15.json",
    101373,
    "6851d471d2d5293c6db8a95d89caa5f65335783b5183ce4edb943dad964825f4",
  ],
];
const sql = read(artifacts[0][0]);
const observed = JSON.parse(read(artifacts[1][0]));
const priorRaw = read("docs/evidence/platform-role-catalog-2026-10-15.json");
assert.equal(hash(priorRaw), "78586245e5426261006a7381724c68315a4dd11b5729b0635a26aad4b953fcda");
const prior = JSON.parse(priorRaw);
const fn = (signature) => {
  const matches = observed.functions.filter((f) => f.signature === signature);
  assert.equal(matches.length, 1, signature);
  return matches[0];
};

test("new fingerprint query and dated observation are LF-pinned independently of the prior capture", () => {
  for (const [path, bytes, sha] of artifacts) {
    const raw = read(path);
    assert.equal(Buffer.byteLength(raw), bytes, path);
    assert.equal(hash(raw), sha, path);
  }
  assert.equal(observed.observedAtUtc, "2026-10-15T06:17:10.912953");
  assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(observed.serverVersion, "17.6");
  assert.notEqual(observed.observedAtUtc, prior.observedAtUtc);
});

test("query retains bounded READ ONLY catalog controls and omits raw unknown definitions", () => {
  assert.match(sql, /BEGIN READ ONLY;/);
  assert.match(sql, /SET LOCAL statement_timeout='5000ms';/);
  assert.match(sql, /SET LOCAL lock_timeout='1000ms';/);
  assert.match(sql, /SET LOCAL search_path=pg_catalog,pg_temp;/);
  assert.match(sql, /ROLLBACK;\s*$/);
  const surface = sql.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
  // Static tripwires, not a parser or substitute for READ ONLY execution.
  assert.doesNotMatch(
    surface,
    /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|EXECUTE|COPY|CALL|COMMIT)\b/i,
  );
  assert.doesNotMatch(surface, /\b(?:FROM|JOIN)\s+(?:public|auth|shop_manager)\./i);
  assert.doesNotMatch(surface, /\b(?:public|auth|shop_manager)\.[a-z_]+\s*\(/i);
  assert.doesNotMatch(sql, /pg_read_file|pg_ls_dir|lo_import|COPY.*PROGRAM/i);
  assert.doesNotMatch(sql, /'(?:definition|body|arguments|config|default|using|check)'\s*,/);
});

test(
  "catalog query parses in a disposable empty database and rolls back its local settings",
  { timeout: 30_000 },
  async () => {
    const db = new PGlite();
    try {
      await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;");
      const results = await db.exec(sql);
      assert.equal(results.length, 6);
      const result = results.find((r) => r.rows[0]?.catalog)?.rows[0].catalog;
      for (const field of [
        "tables",
        "columns",
        "constraints",
        "indexes",
        "policies",
        "triggers",
        "functions",
        "enums",
      ])
        assert.deepEqual(result[field], []);
      assert.equal(
        (await db.query("SELECT current_setting('transaction_read_only') value")).rows[0].value,
        "off",
      );
    } finally {
      await db.close();
    }
  },
);

test("all eight prior metadata facets are unchanged subsets, not inferred cross-snapshot authority", () => {
  for (const field of [
    "tables",
    "columns",
    "constraints",
    "indexes",
    "policies",
    "triggers",
    "functions",
    "enums",
  ])
    for (const entry of prior[field])
      assert.ok(
        observed[field].some((candidate) => JSON.stringify(candidate) === JSON.stringify(entry)),
        `${field}: ${entry.signature ?? entry.name ?? entry.table}`,
      );
  assert.deepEqual(
    [
      observed.tables.length,
      observed.columns.length,
      observed.constraints.length,
      observed.indexes.length,
      observed.policies.length,
      observed.triggers.length,
      observed.functions.length,
      observed.enums.length,
    ],
    [9, 117, 28, 28, 27, 16, 25, 3],
  );
  const forbidden = new Set([
    "rows",
    "rowCounts",
    "appliedHistory",
    "acceptedBaseline",
    "releaseReady",
    "definition",
    "body",
    "default",
    "config",
    "using",
    "check",
    "arguments",
  ]);
  function inspect(value) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!forbidden.has(key), key);
      inspect(child);
    }
  }
  inspect(observed);
});

test("new relation shapes retain actual constraints and nullable user/application bindings", () => {
  for (const [table, count] of [
    ["partner_program_applications", 33],
    ["partner_program_partners", 17],
    ["user_referrals", 7],
  ]) {
    assert.equal(observed.columns.filter((c) => c.table === table).length, count);
    assert.equal(observed.constraints.filter((c) => c.table === table).length, 4);
    const metadata = observed.tables.find((c) => c.table === table);
    assert.equal(metadata.owner, "postgres");
    assert.equal(metadata.rls, true);
    assert.equal(metadata.forceRls, false);
    assert.equal(metadata.inheritanceEdges, 0);
  }
  assert.equal(
    observed.columns.find((c) => c.table === "partner_program_partners" && c.name === "user_id")
      .notNull,
    false,
  );
  assert.equal(
    observed.columns.find(
      (c) => c.table === "partner_program_partners" && c.name === "application_id",
    ).notNull,
    false,
  );
  assert.ok(
    !observed.constraints.some(
      (c) =>
        c.table === "partner_program_partners" && c.type === "u" && c.columns.includes("user_id"),
    ),
  );
  assert.match(observed.limits, /Effective MAINTAIN is not evaluated/);
});

test("partner and referral attachment frontier is explicit, not silently replaced with no-op helpers", () => {
  assert.deepEqual(
    observed.triggers
      .filter((t) => t.table === "public.partner_program_partners")
      .map((t) => t.name),
    ["partners_recompute_intent", "pp_partners_updated"],
  );
  assert.deepEqual(
    observed.triggers.filter((t) => t.table === "public.user_referrals").map((t) => t.name),
    ["trg_pp_user_signup_bounty", "trg_user_referrals_auto_assign_rep"],
  );
  assert.equal(
    fn("public.accredit_staff_partner(uuid)").bodyMd5Lf,
    "93f21bd4e7112ea9e8c5257267f9da69",
  );
  assert.equal(
    fn("public.trg_partners_recompute_intent()").bodyMd5Lf,
    "5df9fb3bd7a12cba1689f4bb9eb983ab",
  );
  assert.equal(fn("public.pp_user_signup_bounty()").bodyMd5Lf, "53c2dbdd0884625f0bffa04689d12cb9");
  assert.equal(
    fn("public.tg_auto_assign_sales_rep()").bodyMd5Lf,
    "df58e18372301426b6dcd49a95f27de9",
  );
  assert.equal(
    fn("public.recompute_signup_intent(uuid,text,text,text,text,text,text)").defaults,
    6,
  );
  assert.equal(fn("public.recompute_signup_intent(uuid)").defaults, 0);
  assert.match(observed.limits, /nonempty referred-user intent/);
  // None of these functions executes in this catalog test. Full signup/partner
  // behavior, source provenance, incoming writer/offboarding and consent remain open.
});
