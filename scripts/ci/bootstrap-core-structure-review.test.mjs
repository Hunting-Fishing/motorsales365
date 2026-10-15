import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  observed,
  prior,
  orgObserved,
  ddl,
  tables,
  query,
  sequenceCatalog,
  withStructure,
} from "./fixtures/bootstrap-core-structure-fixture.mjs";
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
test("bounded READ ONLY structural query never invokes application helpers or sequence/default expressions", () => {
  assert.match(query, /BEGIN READ ONLY;/);
  assert.match(query, /SET LOCAL statement_timeout='5000ms';/);
  assert.match(query, /SET LOCAL lock_timeout='1000ms';/);
  assert.match(query, /SET LOCAL search_path=pg_catalog,pg_temp;/);
  assert.match(query, /ROLLBACK;\s*$/);
  const surface = query.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
  assert.doesNotMatch(
    surface,
    /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|EXECUTE|COPY|CALL|COMMIT)\b/i,
  );
  assert.doesNotMatch(surface, /\b(?:FROM|JOIN)\s+(?:public|auth|shop_manager)\./i);
  assert.doesNotMatch(surface, /\b(?:public|auth|shop_manager)\.[a-z_]+\s*\(/i);
  assert.doesNotMatch(
    query,
    /pg_read_file|pg_ls_dir|lo_import|query_to_xml|dblink|nextval|currval|setval|last_value|is_called/,
  );
  assert.match(
    query,
    /\('profiles','internal_org_settings','subscription_plans','subscriptions'\)/,
  );
  assert.match(query, /CASE WHEN s.permitted THEN s.definition ELSE NULL END/);
  assert.match(query, /pg_catalog.md5\(r.definition\) IS NOT DISTINCT FROM e.hash/);
  assert.match(query, /pg_catalog.octet_length\(r.definition\)<2048/);
});
test(
  "empty-catalog parse restores transaction settings and returns no rows or bodies",
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
test("all 165 expected piece fingerprints come from the immutable prior catalog, not fresh unreviewed SQL", () => {
  const names = observed.tables.map((t) => t.table);
  const expected = [
    ...prior.columns
      .filter((c) => names.includes(c.table))
      .map((c) => ["column", c.table, c.name, c.defaultMd5]),
    ...prior.constraints
      .filter((c) => names.includes(c.table))
      .map((c) => ["constraint", c.table, c.name, c.definitionMd5]),
    ...prior.indexes
      .filter((c) => names.includes(c.table))
      .map((c) => ["index", c.table, c.name, c.definitionMd5]),
    ...prior.policies
      .filter((c) => names.includes(c.table))
      .flatMap((c) => [
        ["policyUsing", c.table, c.name, c.usingMd5],
        ["policyCheck", c.table, c.name, c.checkMd5],
      ]),
    ...prior.triggers
      .filter((c) => names.includes(c.table.replace("public.", "")))
      .map((c) => ["trigger", c.table.replace("public.", ""), c.name, c.definitionMd5]),
  ];
  assert.equal(expected.length, 165);
  const quote = (v) => (v === null ? "NULL" : "'" + v.replaceAll("'", "''") + "'");
  for (const row of expected)
    assert.equal(query.split(" (" + row.map(quote).join(",") + ")").length, 2);
});
test(
  "changed known default remains withheld even when the new literal would otherwise be safe",
  options,
  async () => {
    await withDb(async (db) => {
      await db.exec("CREATE TABLE public.profiles(tier_id text DEFAULT 'buyer')");
      const c = await execute(db),
        p = c.pieces.find((p) => p.category === "column" && p.name === "tier_id");
      assert.equal(p.permitted, false);
      assert.equal(p.definition, null);
    });
  },
);
test(
  "privacy check independently denies an unknown literal after a local diagnostic expected-hash substitution",
  options,
  async () => {
    await withDb(async (db) => {
      await db.exec("CREATE TABLE public.profiles(tier_id text DEFAULT 'SYNTHETIC_DISALLOWED')");
      const hash = (
        await db.query(
          "SELECT md5(pg_get_expr(d.adbin,d.adrelid)) hash FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum WHERE a.attrelid='public.profiles'::regclass AND a.attname='tier_id'",
        )
      ).rows[0].hash;
      const marker = "('column','profiles','tier_id','d1a6b664ca83e0a4a84c3cadb28d9614')";
      assert.equal(query.split(marker).length, 2);
      const sql = query.replace(marker, () => "('column','profiles','tier_id','" + hash + "')");
      const c = await execute(db, sql),
        p = c.pieces.find((p) => p.category === "column" && p.name === "tier_id");
      assert.equal(p.permitted, false);
      assert.equal(p.definition, null);
    });
  },
);
test(
  "unknown CHECK dependency is a metadata frontier, never an executed or retained helper body",
  options,
  async () => {
    await withDb(async (db) => {
      await db.exec(
        "CREATE FUNCTION public.lab_core_probe(text) RETURNS boolean LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'must not execute';END;$$;CREATE TABLE public.profiles(tier_id text,CONSTRAINT lab_unknown_check CHECK(public.lab_core_probe(tier_id)));",
      );
      const c = await execute(db),
        p = c.pieces.find((p) => p.name === "lab_unknown_check");
      assert.equal(p.permitted, false);
      assert.equal(p.definition, null);
      assert.equal(c.functions.length, 1);
      assert.equal(c.functions[0].signature, "public.lab_core_probe(text)");
      assert.doesNotMatch(JSON.stringify(c), /must not execute|RAISE EXCEPTION/);
    });
  },
);
const raw = read("docs/evidence/bootstrap-core-structure-2026-10-15.json");
test("dated reviewed capture and query are exact canonical pinned evidence, separate from parent snapshots", () => {
  assert.equal(Buffer.byteLength(query), 25310);
  assert.equal(sha(query), "b16bece8c3307271a1cb3e6c61d681c124dd00aea9888c89b8e5b5cf5fa47b75");
  assert.equal(Buffer.byteLength(raw), 124321);
  assert.equal(sha(raw), "ffc1546bcf876cc302aad0c1f704bbf4195fadeb95f8b303c823d252457bc0db");
  assert.equal(raw, JSON.stringify(observed, null, 2) + "\n");
  assert.equal(
    sha(read("docs/evidence/auth-bootstrap-catalog-2026-10-15.json")),
    "e3ed0e24c8e00d018370360b0b8abb8dc0a80fee0232148756857d6a41f7df9b",
  );
  assert.equal(
    sha(read("docs/evidence/org-tier-structure-2026-10-15.json")),
    "803f200878ae9f5fbe4586583ecea394890cb7e55bb64310481413ab36db42e1",
  );
  assert.equal(observed.observedAtUtc, "2026-10-15T08:23:01.783433");
  assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
  assert.equal(observed.serverVersion, "17.6");
});
test("all 165 gated pieces passed privacy/hash review without data, settings, function bodies or live sequence values", () => {
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
    [4, 90, 17, 16, 16, 10, 29, 5, 165],
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
  assert.ok(observed.functions.every((f) => !("definition" in f) && !("body" in f)));
  assert.match(observed.limits, /original-source\/history adoption/);
  assert.equal("sequences" in observed, false, "no repeated live sequence read");
});
test("complete four-table facets and selected function/enum fingerprints remain unchanged from PR55", () => {
  const names = observed.tables.map((t) => t.table);
  for (const key of ["tables", "columns", "constraints", "indexes", "policies"])
    assert.deepEqual(
      observed[key],
      prior[key].filter((c) => names.includes(c.table)),
    );
  assert.deepEqual(
    observed.triggers,
    prior.triggers.filter((c) => names.includes(c.table.replace("public.", ""))),
  );
  assert.deepEqual(observed.functions, prior.functions);
  for (const e of observed.enums)
    assert.deepEqual(
      e,
      prior.enums.find((p) => p.name === e.name),
    );
});
test(
  "seven-table empty structure reproduces 129 columns/27 critical constraints/24 indexes and exact sequence metadata",
  options,
  async () => {
    await withStructure(async (db) => {
      assert.equal(tables.length, 7);
      assert.equal(observed.columns.length + orgObserved.columns.length, 129);
      assert.equal(observed.constraints.length + orgObserved.constraints.length, 27);
      assert.equal(observed.indexes.length + orgObserved.indexes.length, 24);
      const s = await sequenceCatalog(db);
      assert.deepEqual(s, prior.sequences);
      assert.equal(typeof s[0].maximum, "string");
      assert.equal(s[0].maximum, "9223372036854775807");
      assert.doesNotMatch(
        sequenceCatalog.toString(),
        /nextval|currval|setval|last_value|is_called/,
      );
      assert.match(
        ddl.profiles,
        /"seller_type" public.seller_type DEFAULT 'private'::public.seller_type NOT NULL/,
      );
      assert.match(ddl.profiles, /"tier_id" text DEFAULT 'common'::text/);
      assert.match(ddl.subscriptions, /"environment" text DEFAULT 'sandbox'::text NOT NULL/);
    });
  },
);
test(
  "structure-only invariant rejects persisted public or synthetic Auth data",
  options,
  async () => {
    for (const statement of [
      "INSERT INTO public.subscription_plans(name,price_php) VALUES('Synthetic Probe',0)",
      "INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-000000000061')",
    ])
      await assert.rejects(
        () => withStructure((db) => db.exec(statement)),
        /structure-only fixture must stay empty/,
      );
  },
);
test(
  "critical constraint changes cannot silently pass the structural invariant",
  options,
  async () => {
    await assert.rejects(
      () =>
        withStructure((db) =>
          db.exec("ALTER TABLE public.profiles DROP CONSTRAINT profiles_tier_id_fkey"),
        ),
      /all actual critical constraints/,
    );
  },
);
test(
  "rolled-back synthetic constraint probes retain seller NOT NULL, common tier FK, intent CHECK and member-number unique index",
  options,
  async () => {
    await withStructure(async (db) => {
      const subject = "00000000-0000-4000-8000-000000000061";
      const failure = async (statement, code) => {
        await db.exec("BEGIN;INSERT INTO auth.users(id) VALUES('" + subject + "')");
        try {
          await assert.rejects(
            () => db.exec(statement),
            (e) => e.code === code,
          );
        } finally {
          await db.exec("ROLLBACK;");
        }
      };
      // No signup helpers or triggers exist. Explicit member numbers never advance the sequence.
      await failure(
        "INSERT INTO public.profiles(id,seller_type,member_number,tier_id) VALUES('" +
          subject +
          "',NULL,61,NULL)",
        "23502",
      );
      await failure(
        "INSERT INTO public.profiles(id,member_number) VALUES('" + subject + "',61)",
        "23503",
      );
      await failure(
        "INSERT INTO public.profiles(id,member_number,tier_id,signup_intent) VALUES('" +
          subject +
          "',61,NULL,'SYNTHETIC_DISALLOWED')",
        "23514",
      );
      await db.exec(
        "BEGIN;INSERT INTO auth.users(id) VALUES('" +
          subject +
          "'),('00000000-0000-4000-8000-000000000062');INSERT INTO public.profiles(id,member_number,tier_id) VALUES('" +
          subject +
          "',61,NULL)",
      );
      try {
        await assert.rejects(
          () =>
            db.exec(
              "INSERT INTO public.profiles(id,member_number,tier_id) VALUES('00000000-0000-4000-8000-000000000062',61,NULL)",
            ),
          (e) => e.code === "23505",
        );
      } finally {
        await db.exec("ROLLBACK;");
      }
    });
  },
);
