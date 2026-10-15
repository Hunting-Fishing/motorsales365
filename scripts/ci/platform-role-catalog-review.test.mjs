// Offline contracts for a fingerprint-only dated observation, not live authority.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
const hash = (algorithm, raw) => createHash(algorithm).update(raw).digest("hex");
const artifacts = [
  [
    "scripts/ci/platform-role-catalog-review.sql",
    9977,
    "c8163fdf9419afbe6bf27157cd53f366b42731f575a2fb78478962ae4a5690a0",
  ],
  [
    "docs/evidence/platform-role-catalog-2026-10-15.json",
    61446,
    "78586245e5426261006a7381724c68315a4dd11b5729b0635a26aad4b953fcda",
  ],
];
const sql = read(artifacts[0][0]);
const observed = JSON.parse(read(artifacts[1][0]));
const fn = (signature) => {
  const matches = observed.functions.filter((f) => f.signature === signature);
  assert.equal(matches.length, 1, signature);
  return matches[0];
};

test("reviewed query and immutable observation retain exact LF pins", () => {
  for (const [path, bytes, sha] of artifacts) {
    const raw = read(path);
    assert.equal(Buffer.byteLength(raw), bytes, path);
    assert.equal(hash("sha256", raw), sha, path);
  }
});

test("query is time-bounded, trusted-path READ ONLY and catalog-only", () => {
  assert.match(sql, /BEGIN READ ONLY;/);
  assert.match(sql, /SET LOCAL statement_timeout='5000ms';/);
  assert.match(sql, /SET LOCAL lock_timeout='1000ms';/);
  assert.match(sql, /SET LOCAL search_path=pg_catalog,pg_temp;/);
  assert.match(sql, /ROLLBACK;\s*$/);
  // Static tripwires, not a SQL parser or permission substitute.
  const surface = sql.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
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
  "fingerprint query parses offline and leaves no transaction or fixture mutation",
  { timeout: 30_000 },
  async () => {
    const db = new PGlite();
    try {
      await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;");
      const results = await db.exec(sql);
      assert.equal(results.length, 6);
      const record = results.find((r) => r.rows[0]?.catalog)?.rows[0].catalog;
      assert.equal(record.mode, "read-only-catalog-fingerprints");
      for (const key of [
        "tables",
        "columns",
        "constraints",
        "indexes",
        "policies",
        "functions",
        "triggers",
        "enums",
      ])
        assert.deepEqual(record[key], []);
      assert.equal(
        (await db.query("SELECT current_setting('transaction_read_only') value")).rows[0].value,
        "off",
      );
    } finally {
      await db.close();
    }
  },
);

test("dated fingerprint surface is bounded metadata, not row data or raw unknown definitions", () => {
  assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(observed.observedAtUtc, "2026-10-15T05:15:07.018072");
  assert.equal(observed.serverVersion, "17.6");
  assert.equal(observed.mode, "read-only-catalog-fingerprints");
  assert.deepEqual(
    observed.tables.map((r) => r.table),
    [
      "sales_rep_assignments",
      "sales_rep_profiles",
      "sales_rep_territories",
      "staff_referral_audit",
      "staff_referrals",
      "user_roles",
    ],
  );
  assert.deepEqual(
    [
      observed.columns.length,
      observed.constraints.length,
      observed.indexes.length,
      observed.policies.length,
      observed.triggers.length,
      observed.functions.length,
      observed.enums.length,
    ],
    [60, 16, 17, 15, 11, 18, 3],
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
  assert.match(
    observed.limits,
    /Auth bootstrap and staff-domain partner effects require separate composition/,
  );
});

test("platform role metadata is distinct from native catalogs and non-row grants remain visible", () => {
  assert.deepEqual(observed.enums.find((r) => r.name === "app_role").labels, [
    "admin",
    "user",
    "sales",
    "moderator",
    "support",
    "advertising",
    "sales_junior",
    "sales_senior",
    "sales_manager",
  ]);
  assert.equal(observed.columns.filter((r) => r.table === "user_roles").length, 4);
  assert.equal(observed.policies.filter((r) => r.table === "user_roles").length, 3);
  const roles = observed.tables.find((r) => r.table === "user_roles");
  assert.equal(roles.rls, true);
  assert.equal(roles.forceRls, false);
  assert.equal(roles.owner, "postgres");
  for (const role of ["anon", "authenticated"]) {
    const rights = roles.rights.find((r) => r.role === role);
    assert.equal(rights.truncate, true);
    assert.equal(rights.trigger, true);
    assert.equal(rights.references, true);
    // MAINTAIN is present in raw ACL m; this query does not evaluate that right.
    assert.ok(!Object.hasOwn(rights, "maintain"));
  }
  assert.match(roles.acl, /authenticated=arwdDxtm\/postgres/);
  assert.ok(!observed.tables.some((r) => r.table.includes("shop_manager")));
});

test("fresh accreditation selects older actual body, not later retained security rewrite", () => {
  const current = fn("public.accredit_staff_partner(uuid)");
  assert.equal(current.bodyMd5Lf, "93f21bd4e7112ea9e8c5257267f9da69");
  assert.notEqual(current.bodyMd5Lf, "350b4c4c4f6e365c196737c0ca014295");
  assert.equal(current.authenticatedExecute, false);
  assert.equal(current.anonExecute, false);
  assert.equal(current.serviceExecute, true);
  assert.equal(current.acl, "{postgres=X/postgres,service_role=X/postgres}");
  assert.ok(!observed.functions.some((f) => f.signature.startsWith("public.request_jwt_role(")));
  assert.equal(
    fn("public.has_role(uuid,public.app_role)").bodyMd5Lf,
    "dae5cfc5a8d92461a428f6702e4e65af",
  );
  assert.equal(
    fn("public.is_sales_assigned_user(uuid,uuid)").bodyMd5Lf,
    "0f339e67db4b0fb50334774376f1fcf4",
  );
  // Correspondence identifies what to rehearse, not applied version provenance.
});

test("auth bootstrap is fingerprint-mapped without silently including its forward chain", () => {
  const path = "supabase/migrations/20260707070949_d718892b-ccd8-45c4-a81b-058bb9b75211.sql";
  const raw = read(path);
  assert.equal(
    hash("sha256", raw),
    "9073196a2c1c29302ff19ed28a699dfbf836b4efd9391e7154405125ad6b45f8",
  );
  for (const [name, expected] of [
    ["handle_new_user", "9bb9dde968ced3998403b7c78330d836"],
    ["canonical_365_org_id", "e41ac334c9e1600deb34d425f7094bda"],
    ["is_internal_365_email", "ea0befcf7465299834312bed02346c25"],
  ]) {
    const marker = `CREATE OR REPLACE FUNCTION public.${name}(`;
    assert.equal(raw.split(marker).length, 2);
    const first = raw.indexOf(marker);
    const delimiter = name === "handle_new_user" ? "$function$" : "$$";
    const opening = `AS ${delimiter}`;
    const start = raw.indexOf(opening, first) + opening.length;
    const end = raw.indexOf(`${delimiter};`, start);
    assert.ok(start > first && end > start);
    assert.equal(hash("md5", raw.slice(start, end)), expected, name);
    const f = observed.functions.find((r) => r.signature.startsWith(`public.${name}(`));
    assert.ok(f, name);
    assert.equal(f.bodyMd5Lf, expected);
  }
  assert.deepEqual(
    observed.triggers.filter((r) => r.table === "auth.users").map((r) => r.name),
    ["on_auth_user_confirmed_accredit_staff", "on_auth_user_created"],
  );
  for (const r of observed.triggers) {
    assert.equal(r.argumentCount, 0);
    assert.equal(r.whenTreeMd5, null);
    assert.equal(r.enabled, "O");
  }
  assert.match(raw, /public\.internal_org_settings/);
  assert.match(raw, /public\.organization_members/);
  // No bootstrap function executes here; identity/org/profile INSERT closure is open.
});
