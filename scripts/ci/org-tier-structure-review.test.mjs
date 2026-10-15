// OFFLINE structure-recovery contracts; no bootstrap/authority adoption.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { ddl, policy, expectedPieces } from "./fixtures/member-tier-source.mjs";
import {
  withStructure,
  observed as retained,
  ddl as currentDDL,
} from "./fixtures/org-tier-structure-fixture.mjs";
const root = new URL("../../", import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), "utf8").replaceAll("\r\n", "\n");
const sql = read("scripts/ci/org-tier-structure-review.sql");
const sha = (s) => createHash("sha256").update(s).digest("hex");
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
async function execute(db, query = sql) {
  const get = async () =>
    (
      await db.query(
        "SELECT current_setting('search_path') path,current_setting('statement_timeout') timeout,current_setting('lock_timeout') lock,current_setting('transaction_read_only') readonly",
      )
    ).rows[0];
  const before = await get();
  const r = await db.exec(query);
  assert.equal(r.length, 6);
  assert.deepEqual(await get(), before);
  return r.find((x) => x.rows[0]?.catalog).rows[0].catalog;
}

test("query is bounded READ ONLY catalog inspection with fail-closed hash/privacy gates", () => {
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
    /pg_read_file|pg_ls_dir|lo_import|query_to_xml|dblink|nextval|currval|setval|last_value|is_called/,
  );
  assert.match(sql, /\('organizations','organization_members','member_tiers'\)/);
  assert.match(sql, /CASE WHEN s.permitted THEN s.definition ELSE NULL END/);
  assert.match(sql, /pg_catalog.md5\(r.definition\) IS NOT DISTINCT FROM e.hash/);
  assert.match(sql, /pg_catalog.octet_length\(r.definition\)<2048/);
});

test(
  "empty catalog query parses and rolls back settings with no rows or raw function bodies",
  options,
  async () => {
    await withDb(async (db) => {
      const c = await execute(db);
      for (const key of [
        "tables",
        "columns",
        "enums",
        "constraints",
        "indexes",
        "policies",
        "triggers",
        "functions",
        "pieces",
      ])
        assert.deepEqual(c[key], []);
    });
  },
);

test(
  "actual selected retained tier DDL yields exactly sixteen known structural-piece pins, without seeds",
  options,
  async () => {
    const pieces = await expectedPieces();
    assert.equal(pieces.length, 16);
    for (const p of pieces) {
      const quote = (v) => (v === null ? "NULL" : "'" + v.replaceAll("'", "''") + "'");
      const row = " (" + [p.category, p.table_name, p.name, p.hash].map(quote).join(",") + ")";
      assert.equal(sql.split(row).length, 2, row);
    }
    assert.match(ddl, /CREATE TABLE public.member_tiers/);
    assert.match(ddl, /rank int NOT NULL UNIQUE/);
    assert.doesNotMatch(ddl, /INSERT|UPDATE|DROP|ALTER/);
  },
);

test(
  "actual tier structure recovers known pieces, retaining genuine NOT NULL metadata rather than weakening constraints",
  options,
  async () => {
    await withDb(async (db) => {
      await db.exec(ddl);
      await db.exec(policy);
      const c = await execute(db);
      assert.equal(c.tables.length, 1);
      assert.equal(c.columns.length, 10);
      assert.equal(c.pieces.filter((p) => p.permitted).length, 16);
      assert.equal(c.constraints.filter((k) => k.type !== "n").length, 2);
      assert.ok(
        c.pieces
          .filter((p) => !p.permitted)
          .every(
            (p) =>
              p.category === "constraint" &&
              c.constraints.some((k) => k.name === p.name && k.type === "n"),
          ),
      );
      assert.ok(c.columns.every((a) => a.notNull));
      const count = (await db.query("SELECT count(*)::integer value FROM public.member_tiers"))
        .rows[0].value;
      assert.equal(
        count,
        0,
        "local-only row assertion: historical configuration seeds not replayed",
      );
    });
  },
);

test(
  "changed actual tier default is denied rather than accepted from an unknown expression",
  options,
  async () => {
    await withDb(async (db) => {
      await db.exec(ddl);
      await db.exec(policy);
      await db.exec(
        "ALTER TABLE public.member_tiers ALTER COLUMN name SET DEFAULT 'SYNTHETIC_DISALLOWED'",
      );
      const c = await execute(db),
        p = c.pieces.find((p) => p.category === "column" && p.name === "name");
      assert.equal(p.permitted, false);
      assert.equal(p.definition, null);
    });
  },
);

test(
  "privacy gate independently denies an unexpected literal even after local diagnostic fingerprint substitution",
  options,
  async () => {
    await withDb(async (db) => {
      await db.exec(ddl);
      await db.exec(policy);
      await db.exec(
        "ALTER TABLE public.member_tiers ALTER COLUMN name SET DEFAULT 'SYNTHETIC_DISALLOWED'",
      );
      const hash = (
        await db.query(
          "SELECT md5(pg_get_expr(d.adbin,d.adrelid)) hash FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum WHERE a.attrelid='public.member_tiers'::regclass AND a.attname='name'",
        )
      ).rows[0].hash;
      const marker = "('column','member_tiers','name',NULL)";
      assert.equal(sql.split(marker).length, 2);
      const query = sql.replace(marker, () => `('column','member_tiers','name','${hash}')`);
      const c = await execute(db, query),
        p = c.pieces.find((p) => p.category === "column" && p.name === "name");
      assert.equal(p.permitted, false);
      assert.equal(p.definition, null);
    });
  },
);

test(
  "unknown CHECK/helper fingerprint is visible as a frontier but no helper or default is executed",
  options,
  async () => {
    await withDb(async (db) => {
      await db.exec(ddl);
      await db.exec(policy);
      await db.exec(
        "CREATE FUNCTION public.lab_structure_probe(text) RETURNS boolean LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'must not execute';END;$$;ALTER TABLE public.member_tiers ADD CONSTRAINT lab_unknown_check CHECK(public.lab_structure_probe(name));",
      );
      const c = await execute(db),
        p = c.pieces.find((p) => p.name === "lab_unknown_check");
      assert.equal(p.permitted, false);
      assert.equal(p.definition, null);
      assert.equal(c.functions.length, 1);
      assert.equal(c.functions[0].signature, "public.lab_structure_probe(text)");
      assert.doesNotMatch(JSON.stringify(c), /must not execute|RAISE EXCEPTION/);
    });
  },
);
const raw = read("docs/evidence/org-tier-structure-2026-10-15.json");
const priorRaw = read("docs/evidence/auth-bootstrap-catalog-2026-10-15.json");
const prior = JSON.parse(priorRaw);
const md5 = (s) => (s === null ? null : createHash("md5").update(s).digest("hex"));

test("final structural query, dated capture and parent catalog are separately pinned canonical evidence", () => {
  assert.equal(Buffer.byteLength(sql), 18347);
  assert.equal(sha(sql), "fd07f10c8da9824667aeda0615a99ebc6673eed135e80c917dc9a57483fa2701");
  assert.equal(Buffer.byteLength(raw), 56447);
  assert.equal(sha(raw), "803f200878ae9f5fbe4586583ecea394890cb7e55bb64310481413ab36db42e1");
  assert.equal(raw, JSON.stringify(retained, null, 2) + "\n");
  assert.equal(sha(priorRaw), "e3ed0e24c8e00d018370360b0b8abb8dc0a80fee0232148756857d6a41f7df9b");
  assert.equal(retained.observedAtUtc, "2026-10-15T07:59:37.940729");
  assert.equal(retained.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(retained.serverVersion, "17.6");
});

test("all 78 recovered pieces passed pinned hashes/privacy review; no customer/secret values or function bodies", () => {
  assert.deepEqual(
    [
      retained.tables.length,
      retained.columns.length,
      retained.constraints.length,
      retained.indexes.length,
      retained.policies.length,
      retained.triggers.length,
      retained.functions.length,
      retained.enums.length,
      retained.pieces.length,
    ],
    [3, 39, 10, 8, 9, 3, 9, 4, 78],
  );
  for (const p of retained.pieces) {
    assert.equal(p.permitted, true);
    assert.equal(md5(p.definition), p.definitionMd5);
    assert.equal(p.definitionMd5, p.expectedMd5);
    if (p.definition !== null) {
      assert.doesNotMatch(
        p.definition,
        /(password|secret|token|api[_ -]?key|https?:\/\/|sk[-_]|@[a-z0-9])/i,
      );
      assert.ok(Buffer.byteLength(p.definition) < 2048);
    }
  }
  assert.ok(retained.functions.every((f) => !("definition" in f) && !("body" in f)));
  assert.match(retained.limits, /original-source\/history adoption/);
});

test("all existing org/member facets and selected functions/enums remain unchanged from prior fingerprint-only recovery", () => {
  const names = ["organizations", "organization_members"];
  for (const key of ["tables", "columns", "constraints", "indexes", "policies"]) {
    assert.deepEqual(
      retained[key].filter((v) => names.includes(v.table)),
      prior[key].filter((v) => names.includes(v.table)),
    );
  }
  assert.deepEqual(
    retained.triggers,
    prior.triggers.filter((v) => names.includes(v.table.replace("public.", ""))),
  );
  for (const f of retained.functions)
    assert.deepEqual(
      f,
      prior.functions.find((p) => p.signature === f.signature),
    );
  for (const e of retained.enums)
    assert.deepEqual(
      e,
      prior.enums.find((p) => p.name === e.name),
    );
});

test(
  "current-catalog org/member and actual retained tier DDL reproduce 39 columns/ten critical constraints/eight indexes exactly",
  options,
  async () => {
    await withStructure(async (db) => {
      for (const table of ["organizations", "organization_members", "member_tiers"])
        assert.equal(
          (await db.query(`SELECT count(*)::integer value FROM public.${table}`)).rows[0].value,
          0,
        );
      assert.match(currentDDL.organizations, /ON DELETE RESTRICT/);
      assert.match(currentDDL.members, /DEFAULT 'member'::public.org_role NOT NULL/);
      assert.match(currentDDL.members, /UNIQUE \(organization_id, user_id\)/);
    });
  },
);

test(
  "structure-only reproduction cannot silently accept data writes with policies/functions/attachments omitted",
  options,
  async () => {
    await assert.rejects(
      () =>
        withStructure(async (db) => {
          // Diagnostic invariant probe only, not a valid org/bootstrap workflow.
          await db.exec(
            "INSERT INTO public.organizations(name,slug) VALUES('Synthetic Probe','synthetic-probe')",
          );
        }),
      /structure-only fixture must stay empty/,
    );
  },
);
