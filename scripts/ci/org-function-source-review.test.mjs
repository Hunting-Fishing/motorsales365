// Diagnostic query-guard tests only, not org/bootstrap behavioral fixtures.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const root = new URL("../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
const sql = read("scripts/ci/org-function-source-review.sql");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const options = { concurrency: false, timeout: 30_000 };
async function withDb(run) {
  const db = new PGlite();
  try {
    return await run(db);
  } finally {
    await db.close();
  }
}
async function execute(db, query = sql) {
  const get = async () =>
    (
      await db.query(
        "SELECT current_setting('search_path') path,current_setting('transaction_read_only') readonly,current_setting('statement_timeout') timeout,current_setting('lock_timeout') lock",
      )
    ).rows[0];
  const before = await get();
  const result = await db.exec(query);
  assert.equal(result.length, 6);
  assert.deepEqual(await get(), before);
  return result.find((r) => r.rows[0]?.source).rows[0].source;
}
async function diagnostic(db, body) {
  // Deliberately fake catalog row under one selected signature. Never used as a
  // bootstrap support or claimed to implement current can_manage_org semantics.
  await db.exec(
    `CREATE FUNCTION public.can_manage_org(_user_id uuid,_org_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $probe$${body}$probe$`,
  );
  const meta = (
    await db.query(
      "SELECT md5(prosrc) body,md5(pg_get_functiondef(oid)) definition,octet_length(pg_get_functiondef(oid)) bytes FROM pg_proc WHERE oid='public.can_manage_org(uuid,uuid)'::regprocedure",
    )
  ).rows[0];
  const original = "'4b54f3895e3fab6350dea558838bdd05','935d3e6f96bf9ff0bef97b72bb8d0960',369";
  assert.equal(sql.split(original).length, 2);
  return sql.replace(original, `'${meta.body}','${meta.definition}',${meta.bytes}`);
}

test("read-only source recovery is bounded to three pinned signatures, no row/helper/dynamic execution", () => {
  assert.match(sql, /BEGIN READ ONLY;/);
  assert.match(sql, /SET LOCAL search_path=pg_catalog,pg_temp;/);
  assert.match(sql, /SET LOCAL statement_timeout='5000ms';/);
  assert.match(sql, /SET LOCAL lock_timeout='1000ms';/);
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
    /pg_read_file|pg_ls_dir|lo_import|dblink|query_to_xml|nextval|currval|setval/,
  );
  assert.match(sql, /CASE WHEN s.permitted THEN s.full_definition ELSE NULL END/);
  assert.match(sql, /s.actual_body_md5=s.body_md5/);
  assert.match(sql, /pg_catalog.md5\(s.full_definition\)=s.definition_md5/);
});
test("query parses empty catalog and rolls back local settings", options, async () => {
  await withDb(async (db) => {
    assert.deepEqual((await execute(db)).functions, []);
  });
});
test(
  "changed body/hash returns no definition even if fake source otherwise qualifies",
  options,
  async () => {
    await withDb(async (db) => {
      await diagnostic(db, "BEGIN RAISE EXCEPTION 'owner';END;");
      const result = await execute(db);
      assert.equal(result.functions.length, 1);
      assert.equal(result.functions[0].permitted, false);
      assert.equal(result.functions[0].definition, null);
    });
  },
);
test(
  "diagnostic matching fingerprints with allowlisted literal capture source without executing its exception",
  options,
  async () => {
    await withDb(async (db) => {
      const query = await diagnostic(db, "BEGIN RAISE EXCEPTION 'owner';END;");
      const result = await execute(db, query);
      assert.equal(result.functions[0].permitted, true);
      assert.match(result.functions[0].definition, /RAISE EXCEPTION 'owner'/);
    });
  },
);
for (const [label, body] of [
  ["unexpected literal", "BEGIN RAISE EXCEPTION 'SYNTHETIC_DISALLOWED';END;"],
  [
    "sensitive marker",
    "BEGIN /* synthetic api_key marker, no actual key */ RAISE EXCEPTION 'owner';END;",
  ],
  ["nested dollar quote", "BEGIN RAISE EXCEPTION $inner$owner$inner$;END;"],
])
  test(
    `privacy gate denies ${label} even after diagnostic fingerprint match`,
    options,
    async () => {
      await withDb(async (db) => {
        const query = await diagnostic(db, body);
        const result = await execute(db, query);
        assert.equal(result.functions[0].permitted, false);
        assert.equal(result.functions[0].definition, null);
      });
    },
  );
const capturedRaw = read("docs/evidence/org-function-source-2026-10-15.json");
const captured = JSON.parse(capturedRaw);
const catalogRaw = read("docs/evidence/auth-bootstrap-catalog-2026-10-15.json");
const catalog = JSON.parse(catalogRaw);
const md5 = (s) => createHash("md5").update(s).digest("hex");

test("dated selected recovery, prior catalog and final query are independently pinned", () => {
  assert.equal(captured.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(captured.observedAtUtc, "2026-10-15T07:38:31.452256");
  assert.equal(captured.serverVersion, "17.6");
  assert.equal(captured.mode, "read-only-selected-source-recovery-not-history");
  assert.equal(sha(catalogRaw), "e3ed0e24c8e00d018370360b0b8abb8dc0a80fee0232148756857d6a41f7df9b");
  assert.equal(capturedRaw, JSON.stringify(captured, null, 2) + "\n");
  assert.equal(Buffer.byteLength(sql), 3227);
  assert.equal(sha(sql), "990178e0bd09eb3c1812655f14b7c51ceb83cb65ba0e0b7dacfe0adab768150c");
  assert.equal(Buffer.byteLength(capturedRaw), 2555);
  assert.equal(
    sha(capturedRaw),
    "a4e4aad2d5fff5ef16b008e04c930a449d578698434101d010fb657e25b18f98",
  );
});

test("three permitted source definitions exactly match prior full/body fingerprints and byte lengths", () => {
  assert.equal(captured.functions.length, 3);
  assert.deepEqual(
    captured.functions.map((f) => f.signature),
    [
      "public.can_manage_org(uuid,uuid)",
      "public.is_org_member(uuid,uuid)",
      "public.tg_org_add_creator_as_owner()",
    ],
  );
  for (const f of captured.functions) {
    assert.equal(f.permitted, true);
    const expected = catalog.functions.find((c) => c.signature === f.signature);
    assert.equal(f.definitionMd5, expected.definitionMd5);
    assert.equal(f.bodyMd5Lf, expected.bodyMd5Lf);
    assert.equal(f.definitionBytes, expected.definitionBytes);
    assert.equal(md5(f.definition), f.definitionMd5);
    assert.equal(Buffer.byteLength(f.definition), f.definitionBytes);
    assert.equal(f.definition.split("$function$").length, 3);
    assert.equal(md5(f.definition.split("$function$")[1]), f.bodyMd5Lf);
  }
});

test("retained source is privacy-reviewed role/structural code only, not user/config data or authority adoption", () => {
  for (const f of captured.functions) {
    assert.doesNotMatch(
      f.definition,
      /(password|secret|token|api[_ -]?key|https?:\/\/|sk[-_]|@[a-z0-9])/i,
    );
    assert.doesNotMatch(
      f.definition,
      /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i,
    );
    const literals = [...f.definition.matchAll(/'((?:''|[^'])*)'/g)].map((m) => m[1]);
    assert.ok(literals.every((l) => ["public", "owner", "admin"].includes(l)));
  }
  assert.match(captured.limits, /not historical provenance, approved baseline/);
  assert.deepEqual(Object.keys(captured).sort(), [
    "functions",
    "limits",
    "mode",
    "observedAtUtc",
    "projectRef",
    "serverVersion",
  ]);
});

test("actual source distinguishes owner/admin management and membership, and creator conflict promotes to owner rather than ignored conflict", () => {
  const definitions = Object.fromEntries(
    captured.functions.map((f) => [f.signature, f.definition]),
  );
  const manage = definitions["public.can_manage_org(uuid,uuid)"];
  assert.match(manage, /m.role IN \('owner','admin'\)/);
  assert.match(manage, /m.user_id = _user_id/);
  assert.doesNotMatch(manage, /auth.uid|manager|has_role/);
  const member = definitions["public.is_org_member(uuid,uuid)"];
  assert.match(member, /m.organization_id = _org_id/);
  assert.match(member, /m.user_id = _user_id/);
  assert.doesNotMatch(member, /m.role/);
  const creator = definitions["public.tg_org_add_creator_as_owner()"];
  assert.match(creator, /IF NEW.created_by IS NOT NULL/);
  assert.match(creator, /ON CONFLICT \(organization_id, user_id\) DO UPDATE SET role = 'owner'/);
  assert.doesNotMatch(creator, /DO NOTHING/);
  // No function is executed for bootstrap/authority behavior in these contracts.
});
