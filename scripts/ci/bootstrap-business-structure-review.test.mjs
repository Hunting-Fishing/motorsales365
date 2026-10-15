import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  observed,
  metadata,
  query,
  metadataQuery,
  ddl,
  auditIndexes,
  selections,
  tables,
  withStructure,
} from "./fixtures/bootstrap-business-structure-fixture.mjs";
const root = new URL("../../", import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), "utf8").replaceAll("\r\n", "\n");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const md5 = (s) => (s === null ? null : createHash("md5").update(s).digest("hex"));
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
async function execute(db, sql = query) {
  const settings = async () =>
    (
      await db.query(
        "SELECT current_setting('search_path') path,current_setting('statement_timeout') timeout,current_setting('lock_timeout') lock,current_setting('transaction_read_only') readonly",
      )
    ).rows[0];
  const before = await settings(),
    r = await db.exec(sql);
  assert.equal(r.length, 6);
  assert.deepEqual(await settings(), before);
  return r.find((x) => x.rows[0]?.catalog).rows[0].catalog;
}
test("both diagnostic queries are bounded READ ONLY catalog access, never app/helper/sequence operations", () => {
  for (const sql of [query, metadataQuery]) {
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
    assert.match(sql, /\('businesses','business_types','admin_audit_log'\)/);
  }
  assert.doesNotMatch(
    metadataQuery,
    /'definition'\s*,|'body'\s*,|'config'\s*,|'default'\s*,|'using'\s*,|'check'\s*,/,
  );
  assert.match(query, /CASE WHEN s.permitted THEN s.definition ELSE NULL END/);
  assert.match(query, /pg_catalog.md5\(r.definition\) IS NOT DISTINCT FROM e.hash/);
});
test("both empty-catalog parses restore settings without rows or bodies", options, async () => {
  await withDb(async (db) => {
    for (const sql of [metadataQuery, query]) {
      const c = await execute(db, sql);
      for (const key of [
        "tables",
        "columns",
        "enums",
        "constraints",
        "indexes",
        "policies",
        "triggers",
        "functions",
      ])
        assert.deepEqual(c[key], []);
      if (sql === query) assert.deepEqual(c.pieces, []);
    }
  });
});
test("all 147 expected structural hashes come exactly from the preceding pinned metadata-only capture", () => {
  const expected = [
    ...metadata.columns.map((c) => ["column", c.table, c.name, c.defaultMd5]),
    ...metadata.constraints.map((c) => ["constraint", c.table, c.name, c.definitionMd5]),
    ...metadata.indexes.map((c) => ["index", c.table, c.name, c.definitionMd5]),
    ...metadata.policies.flatMap((c) => [
      ["policyUsing", c.table, c.name, c.usingMd5],
      ["policyCheck", c.table, c.name, c.checkMd5],
    ]),
    ...metadata.triggers.map((c) => [
      "trigger",
      c.table.replace("public.", ""),
      c.name,
      c.definitionMd5,
    ]),
  ];
  assert.equal(expected.length, 147);
  const quote = (v) => (v === null ? "NULL" : "'" + v.replaceAll("'", "''") + "'");
  for (const row of expected)
    assert.equal(query.split(" (" + row.map(quote).join(",") + ")").length, 2);
});
test(
  "changed safe default fails fingerprint rather than being adopted from live text",
  options,
  async () => {
    await withDb(async (db) => {
      await db.exec("CREATE TABLE public.businesses(source text DEFAULT 'pending')");
      const c = await execute(db),
        p = c.pieces.find((p) => p.category === "column" && p.name === "source");
      assert.equal(p.permitted, false);
      assert.equal(p.definition, null);
    });
  },
);
test(
  "privacy gate independently withholds unknown literal despite local diagnostic hash substitution",
  options,
  async () => {
    await withDb(async (db) => {
      await db.exec("CREATE TABLE public.businesses(source text DEFAULT 'SYNTHETIC_DISALLOWED')");
      const hash = (
        await db.query(
          "SELECT md5(pg_get_expr(d.adbin,d.adrelid)) hash FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum WHERE a.attrelid='public.businesses'::regclass AND a.attname='source'",
        )
      ).rows[0].hash;
      const marker = "('column','businesses','source','1c86fb6219cabad38570bf1d10fc4e27')";
      assert.equal(query.split(marker).length, 2);
      const c = await execute(
        db,
        query.replace(marker, () => "('column','businesses','source','" + hash + "')"),
      );
      const p = c.pieces.find((p) => p.category === "column" && p.name === "source");
      assert.equal(p.permitted, false);
      assert.equal(p.definition, null);
    });
  },
);
test(
  "unknown default dependency remains a fingerprint frontier and is never invoked",
  options,
  async () => {
    await withDb(async (db) => {
      await db.exec(
        "CREATE FUNCTION public.lab_business_probe() RETURNS text LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'must not execute';END;$$;CREATE TABLE public.businesses(source text DEFAULT public.lab_business_probe());",
      );
      const c = await execute(db),
        p = c.pieces.find((p) => p.category === "column" && p.name === "source");
      assert.equal(p.permitted, false);
      assert.equal(p.definition, null);
      assert.equal(c.functions.length, 1);
      assert.equal(c.functions[0].signature, "public.lab_business_probe()");
      assert.doesNotMatch(JSON.stringify(c), /must not execute|RAISE EXCEPTION/);
    });
  },
);
test("both reviewed snapshots and diagnostic queries are canonical separately pinned evidence", () => {
  const pins = [
    [
      "scripts/ci/bootstrap-business-catalog-review.sql",
      9833,
      "ad47d258070ffab5ad87a25fb4ef2d124817ddc51b86ed0ec38e58426d674c25",
    ],
    [
      "docs/evidence/bootstrap-business-catalog-2026-10-15.json",
      60005,
      "6a569e142c64f8da81b2afbb3d48bfad87c1b9db21cee03259db961b7c41169a",
    ],
    [
      "scripts/ci/bootstrap-business-structure-review.sql",
      23305,
      "79349e4596c9ed73f438c9246fcb03454b089a37d253d0749585b9689e9684c2",
    ],
    [
      "docs/evidence/bootstrap-business-structure-2026-10-15.json",
      101981,
      "dd826ce1edf75376bd75d4bfcf859e8a7300655c34445a01a0cca13ec43458e8",
    ],
  ];
  for (const [path, bytes, hash] of pins) {
    const raw = read(path);
    assert.equal(Buffer.byteLength(raw), bytes);
    assert.equal(sha(raw), hash);
    if (path.endsWith(".json")) assert.equal(raw, JSON.stringify(JSON.parse(raw), null, 2) + "\n");
  }
  assert.equal(metadata.observedAtUtc, "2026-10-15T08:40:15.535109");
  assert.equal(observed.observedAtUtc, "2026-10-15T08:42:08.249322");
  for (const c of [metadata, observed]) {
    assert.equal(c.projectRef, "wjxaajgvddtrxxtocxen");
    assert.equal(c.serverVersion, "17.6");
  }
});
test("all 147 pieces passed both hash and privacy review; no raw function bodies/config/customer data", () => {
  assert.deepEqual(
    [
      "tables",
      "columns",
      "constraints",
      "indexes",
      "policies",
      "triggers",
      "functions",
      "enums",
      "pieces",
    ].map((k) => observed[k].length),
    [3, 79, 11, 23, 12, 10, 18, 3, 147],
  );
  for (const p of observed.pieces) {
    assert.equal(p.permitted, true);
    assert.equal(md5(p.definition), p.definitionMd5);
    assert.equal(p.definitionMd5, p.expectedMd5);
    if (p.definition !== null) {
      assert.ok(Buffer.byteLength(p.definition) < 2048);
      assert.doesNotMatch(
        p.definition,
        /(password|secret|token|api[_ -]?key|https?:\/\/|sk[-_]|@[a-z0-9])|\$[a-zA-Z0-9_]*\$/i,
      );
    }
  }
  assert.ok(
    observed.functions.every((f) => !("definition" in f) && !("body" in f) && !("config" in f)),
  );
  assert.equal("sequences" in observed, false);
});
test("all metadata facets unchanged between fingerprint preflight and gated structural recovery", () => {
  for (const k of [
    "tables",
    "columns",
    "constraints",
    "indexes",
    "policies",
    "triggers",
    "functions",
    "enums",
  ])
    assert.deepEqual(observed[k], metadata[k]);
});
test("prior business/audit critical constraints and selected columns remain unchanged, without promoting old projections", () => {
  for (const path of [
    "docs/evidence/native-ownership-claim-catalog-2026-10-15.json",
    "docs/evidence/native-owner-intent-catalog-2026-10-15.json",
  ]) {
    const prior = JSON.parse(read(path));
    for (const k of prior.constraints.filter((c) =>
      ["businesses", "admin_audit_log"].includes(c.table),
    )) {
      const current = metadata.constraints.find((c) => c.table === k.table && c.name === k.name);
      assert.ok(current);
      assert.equal(current.definitionMd5, md5(k.definition));
      assert.equal(current.validated, k.validated);
      assert.equal(current.type, k.type);
    }
    for (const c of prior.columns.filter((c) =>
      ["businesses", "admin_audit_log"].includes(c.table),
    )) {
      const current = metadata.columns.find((k) => k.table === c.table && k.name === c.name);
      assert.ok(current);
      assert.equal(current.type, c.type);
      assert.equal(current.notNull, c.notNull);
    }
  }
  assert.equal(metadata.columns.filter((c) => c.table === "businesses").length, 63);
  assert.equal(metadata.columns.filter((c) => c.table === "admin_audit_log").length, 12);
  assert.equal(metadata.triggers.length, 10);
  assert.ok(metadata.triggers.every((t) => t.table === "public.businesses"));
});
test("retained business-types/audit statements are narrowly selected unchanged, with no historical rows or backfills", () => {
  assert.match(ddl.types, /CREATE TABLE public.business_types/);
  assert.match(ddl.audit, /CREATE TABLE public.admin_audit_log/);
  for (const statement of [
    ddl.types,
    ddl.audit,
    ddl.widen,
    ddl.targetNullable,
    ddl.fieldNullable,
    ...auditIndexes,
  ])
    assert.doesNotMatch(statement, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|COPY|EXECUTE)\b/);
  for (const s of Object.values(selections)) {
    assert.match(s.sha256Lf, /^[a-f0-9]{64}$/);
    assert.ok(s.firstLine > 0);
    assert.ok(s.bytes > 0);
  }
  assert.equal(auditIndexes.length, 5);
});
test(
  "ten-table disposable structure retains 208 columns, 38 critical constraints, 47 indexes and genuine core/sequence facets",
  options,
  async () => {
    await withStructure(async (db) => {
      const c = (
        await db.query(
          "SELECT count(*)::integer value FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'",
        )
      ).rows[0].value;
      assert.equal(c, 10);
      assert.equal(tables.length, 3);
      const core = JSON.parse(read("docs/evidence/bootstrap-core-structure-2026-10-15.json")),
        org = JSON.parse(read("docs/evidence/org-tier-structure-2026-10-15.json"));
      assert.equal(core.columns.length + org.columns.length + observed.columns.length, 208);
      assert.equal(
        core.constraints.length + org.constraints.length + observed.constraints.length,
        38,
      );
      assert.equal(core.indexes.length + org.indexes.length + observed.indexes.length, 47);
    });
  },
);
test(
  "persistent business/audit/type rows cannot masquerade as structure-only acceptance",
  options,
  async () => {
    for (const statement of [
      "INSERT INTO public.business_types(slug,label) VALUES('synthetic-probe','Synthetic Probe')",
      "INSERT INTO public.admin_audit_log(actor_id,action) VALUES('00000000-0000-4000-8000-000000000071','synthetic_probe')",
    ])
      await assert.rejects(
        () => withStructure((db) => db.exec(statement)),
        /business\/audit structure-only fixture must stay empty/,
      );
  },
);
test(
  "business-type FK removal cannot silently pass the exact structure invariant",
  options,
  async () => {
    await assert.rejects(
      () =>
        withStructure((db) =>
          db.exec("ALTER TABLE public.businesses DROP CONSTRAINT businesses_type_slug_fkey"),
        ),
      /all actual critical business\/audit constraints/,
    );
  },
);
test(
  "rolled-back diagnostics preserve business-type FK, vanity/network CHECKs and audit actor NOT NULL",
  options,
  async () => {
    await withStructure(async (db) => {
      const failure = async (statement, code) => {
        await db.exec("BEGIN");
        try {
          await assert.rejects(
            () => db.exec(statement),
            (e) => e.code === code,
          );
        } finally {
          await db.exec("ROLLBACK");
        }
      };
      await failure(
        "INSERT INTO public.businesses(slug,name,type_slug) VALUES('synthetic-missing','Synthetic Probe','synthetic-missing')",
        "23503",
      );
      await failure(
        "INSERT INTO public.admin_audit_log(actor_id,action) VALUES(NULL,'synthetic_probe')",
        "23502",
      );
      for (const change of ["vanity_slug='x'", "network_exposure_status='synthetic_unknown'"]) {
        await db.exec(
          "BEGIN;INSERT INTO public.business_types(slug,label) VALUES('synthetic-probe','Synthetic Probe');INSERT INTO public.businesses(slug,name,type_slug) VALUES('synthetic-probe','Synthetic Probe','synthetic-probe')",
        );
        try {
          await assert.rejects(
            () => db.exec("UPDATE public.businesses SET " + change),
            (e) => e.code === "23514",
          );
        } finally {
          await db.exec("ROLLBACK");
        }
      }
    });
  },
);
test(
  "owner and audit actor UUID storage are not Auth FK or trusted-identity proof",
  options,
  async () => {
    await withStructure(async (db) => {
      assert.equal(
        observed.constraints.some(
          (c) => c.table === "businesses" && c.columns.includes("owner_id") && c.type === "f",
        ),
        false,
      );
      assert.equal(observed.constraints.filter((c) => c.table === "admin_audit_log").length, 1);
      await db.exec(
        "BEGIN;INSERT INTO public.business_types(slug,label) VALUES('synthetic-probe','Synthetic Probe');INSERT INTO public.businesses(slug,name,type_slug,owner_id) VALUES('synthetic-probe','Synthetic Probe','synthetic-probe','00000000-0000-4000-8000-000000000071');INSERT INTO public.admin_audit_log(actor_id,action) VALUES('00000000-0000-4000-8000-000000000072','synthetic_probe')",
      );
      try {
        assert.equal(
          (await db.query("SELECT count(*)::integer value FROM auth.users")).rows[0].value,
          0,
        );
        assert.equal(
          (await db.query("SELECT count(*)::integer value FROM public.businesses")).rows[0].value,
          1,
        );
        assert.equal(
          (await db.query("SELECT count(*)::integer value FROM public.admin_audit_log")).rows[0]
            .value,
          1,
        );
      } finally {
        await db.exec("ROLLBACK");
      }
    });
  },
);
