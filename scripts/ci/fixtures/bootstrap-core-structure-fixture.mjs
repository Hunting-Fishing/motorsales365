// STRUCTURE ONLY: pinned current-catalog reproduction, NOT original migrations.
// All seven public tables stay empty. No policies/functions/attachments installed.
// Synthetic auth.users(id PK) is solely an FK target, not provider/Auth authority.
// Sequence configuration comes from PR55 metadata, not a fresh live sequence read.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  observed as orgObserved,
  ddl as orgDDL,
  piece as orgPiece,
} from "./org-tier-structure-fixture.mjs";
const root = new URL("../../../", import.meta.url);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const md5 = (s) => (s === null ? null : createHash("md5").update(s).digest("hex"));
function readPinned(path, hash, max) {
  const raw = fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
  assert.ok(Buffer.byteLength(raw) > 0 && Buffer.byteLength(raw) < max);
  assert.equal(sha(raw), hash, path);
  return raw;
}
const observed = JSON.parse(
  readPinned(
    "docs/evidence/bootstrap-core-structure-2026-10-15.json",
    "ffc1546bcf876cc302aad0c1f704bbf4195fadeb95f8b303c823d252457bc0db",
    128 * 1024,
  ),
);
const query = readPinned(
  "scripts/ci/bootstrap-core-structure-review.sql",
  "b16bece8c3307271a1cb3e6c61d681c124dd00aea9888c89b8e5b5cf5fa47b75",
  32 * 1024,
);
const prior = JSON.parse(
  readPinned(
    "docs/evidence/auth-bootstrap-catalog-2026-10-15.json",
    "e3ed0e24c8e00d018370360b0b8abb8dc0a80fee0232148756857d6a41f7df9b",
    128 * 1024,
  ),
);
const orgQuery = readPinned(
  "scripts/ci/org-tier-structure-review.sql",
  "fd07f10c8da9824667aeda0615a99ebc6673eed135e80c917dc9a57483fa2701",
  32 * 1024,
);
const coreTables = ["profiles", "internal_org_settings", "subscription_plans", "subscriptions"];
const tables = [...coreTables, ...orgObserved.tables.map((t) => t.table)].sort();
assert.equal(new Set(tables).size, 7);
const allowedTypes = new Set([
  "text",
  "uuid",
  "timestamp with time zone",
  "public.seller_type",
  "numeric",
  "jsonb",
  "public.verification_status",
  "public.business_kind",
  "public.account_status",
  "boolean",
  "integer",
  "numeric(3,2)",
  "bigint",
  "numeric(10,2)",
]);
const ident = (s) => {
  assert.match(s, /^[a-z_][a-z0-9_]*$/);
  return '"' + s + '"';
};
const literal = (s) => "'" + s.replaceAll("'", "''") + "'";
function piece(table, category, name) {
  const values = observed.pieces.filter(
    (p) => p.table === table && p.category === category && p.name === name,
  );
  assert.equal(values.length, 1);
  const p = values[0];
  assert.equal(p.permitted, true);
  assert.equal(md5(p.definition), p.definitionMd5);
  assert.equal(p.definitionMd5, p.expectedMd5);
  return p.definition;
}
function tableDDL(table) {
  assert.ok(coreTables.includes(table));
  const columns = observed.columns
    .filter((c) => c.table === table)
    .sort((a, b) => a.position - b.position);
  const lines = columns.map((c) => {
    assert.ok(allowedTypes.has(c.type), c.type);
    assert.equal(c.identity, "");
    assert.equal(c.generated, "");
    assert.equal(c.acl, null);
    const value = piece(table, "column", c.name);
    assert.equal(md5(value), c.defaultMd5);
    return (
      ident(c.name) +
      " " +
      c.type +
      (value === null ? "" : " DEFAULT " + value) +
      (c.notNull ? " NOT NULL" : "")
    );
  });
  for (const c of observed.constraints.filter((c) => c.table === table)) {
    assert.equal(c.validated, true);
    assert.equal(c.deferrable, false);
    assert.equal(c.deferred, false);
    lines.push("CONSTRAINT " + ident(c.name) + " " + piece(table, "constraint", c.name));
  }
  return "CREATE TABLE public." + ident(table) + " (\n" + lines.join(",\n") + "\n);";
}
const ddl = Object.fromEntries(coreTables.map((t) => [t, tableDDL(t)]));
async function catalog(db, sql = query) {
  const result = await db.exec(sql);
  const rows = result.flatMap((r) => r.rows).filter((r) => r.catalog);
  assert.equal(rows.length, 1);
  const { observedAtUtc, ...c } = rows[0].catalog;
  return c;
}
async function assertCatalog(db, sql, expected, selectedTables) {
  const actual = await catalog(db, sql);
  for (const key of ["tables", "columns", "enums", "indexes"])
    assert.deepEqual(actual[key], expected[key], key + ": exact structural metadata");
  const nn = (
    await db.query(
      "SELECT k.conname name,cardinality(k.conkey) size,k.convalidated valid,EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=k.conrelid AND a.attnum=k.conkey[1] AND a.attnotnull AND NOT a.attisdropped) backed FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND k.contype='n' ORDER BY k.conname",
      [selectedTables],
    )
  ).rows;
  assert.equal(nn.length, actual.constraints.filter((c) => c.type === "n").length);
  for (const n of nn)
    assert.deepEqual(
      [n.size, n.valid, n.backed],
      [1, true, true],
      "only backed PG18 NOT NULL normalization",
    );
  assert.deepEqual(
    actual.constraints.filter((c) => c.type !== "n"),
    expected.constraints,
    "all actual critical constraints, none suppressed",
  );
  for (const key of ["policies", "triggers", "functions"])
    assert.deepEqual(
      actual[key],
      [],
      "deliberately NOT installed; not workflow/row-authority acceptance",
    );
  return actual;
}
async function sequenceCatalog(db) {
  // Configuration/ownership/ACL only: never read sequence relation/current values.
  return (
    await db.query(
      "SELECT n.nspname schema,c.relname name,pg_catalog.pg_get_userbyid(c.relowner) owner,c.relacl::text acl,pg_catalog.format_type(s.seqtypid,NULL) type,s.seqstart::text start,s.seqincrement::text increment,s.seqmin::text minimum,s.seqmax::text maximum,s.seqcache::text cache,s.seqcycle cycle,ARRAY(SELECT ns.nspname||'.'||t.relname||'.'||a.attname FROM pg_catalog.pg_depend d JOIN pg_catalog.pg_class t ON t.oid=d.refobjid JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attnum=d.refobjsubid WHERE d.classid='pg_catalog.pg_class'::regclass AND d.objid=c.oid AND d.refclassid='pg_catalog.pg_class'::regclass AND d.deptype IN ('a','i') ORDER BY ns.nspname,t.relname,a.attnum) AS \"ownedBy\",(SELECT jsonb_agg(jsonb_build_object('role',v.role,'usage',has_sequence_privilege(v.role,c.oid,'USAGE'),'select',has_sequence_privilege(v.role,c.oid,'SELECT'),'update',has_sequence_privilege(v.role,c.oid,'UPDATE')) ORDER BY v.role) FROM (VALUES('anon'),('authenticated'),('postgres'),('service_role'))v(role)) rights FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_sequence s ON s.seqrelid=c.oid WHERE n.nspname='public' AND c.relname='profiles_member_number_seq'",
    )
  ).rows;
}
async function assertStructure(db) {
  await assertCatalog(db, query, observed, coreTables);
  await assertCatalog(
    db,
    orgQuery,
    orgObserved,
    orgObserved.tables.map((t) => t.table),
  );
  assert.deepEqual(await sequenceCatalog(db), prior.sequences);
}
async function withStructure(run) {
  const db = new PGlite();
  try {
    await db.exec(
      "CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;CREATE ROLE service_role NOLOGIN NOSUPERUSER BYPASSRLS NOINHERIT;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);",
    );
    const enums = [
      ...new Map([...observed.enums, ...orgObserved.enums].map((e) => [e.name, e])).values(),
    ];
    for (const e of enums) {
      assert.equal(e.schema, "public");
      await db.exec(
        "CREATE TYPE public." +
          ident(e.name) +
          " AS ENUM (" +
          e.labels.map(literal).join(",") +
          ");",
      );
    }
    assert.equal(prior.sequences.length, 1);
    const s = prior.sequences[0];
    assert.deepEqual(
      [
        s.schema,
        s.name,
        s.owner,
        s.type,
        s.start,
        s.increment,
        s.minimum,
        s.maximum,
        s.cache,
        s.cycle,
        s.ownedBy,
      ],
      [
        "public",
        "profiles_member_number_seq",
        "postgres",
        "bigint",
        "1",
        "1",
        "1",
        "9223372036854775807",
        "1",
        false,
        ["public.profiles.member_number"],
      ],
    );
    await db.exec(
      "CREATE SEQUENCE public.profiles_member_number_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1 NO CYCLE;",
    );
    for (const statement of [
      orgDDL.organizations,
      orgDDL.tiers,
      ddl.profiles,
      ddl.internal_org_settings,
      orgDDL.members,
      ddl.subscription_plans,
      ddl.subscriptions,
    ])
      await db.exec(statement);
    await db.exec(
      "ALTER SEQUENCE public.profiles_member_number_seq OWNED BY public.profiles.member_number;GRANT ALL ON SEQUENCE public.profiles_member_number_seq TO anon,authenticated,service_role;",
    );
    for (const metadata of [observed, orgObserved]) {
      const getPiece = metadata === observed ? piece : orgPiece;
      for (const i of metadata.indexes) {
        if (
          metadata.constraints.some(
            (c) => c.table === i.table && c.name === i.name && ["p", "u"].includes(c.type),
          )
        )
          continue;
        await db.exec(getPiece(i.table, "index", i.name));
      }
      for (const t of metadata.tables) {
        assert.ok(tables.includes(t.table));
        assert.equal(t.owner, "postgres");
        assert.equal(t.rls, true);
        assert.equal(t.forceRls, false);
        assert.equal(
          t.acl,
          "{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}",
        );
        await db.exec(
          "ALTER TABLE public." +
            ident(t.table) +
            " ENABLE ROW LEVEL SECURITY;GRANT ALL ON TABLE public." +
            ident(t.table) +
            " TO anon,authenticated,service_role;",
        );
      }
    }
    const empty = async () => {
      for (const table of ["auth.users", ...tables.map((t) => "public." + ident(t))]) {
        assert.deepEqual(
          (await db.query("SELECT 1 FROM " + table + " LIMIT 1")).rows,
          [],
          "structure-only fixture must stay empty; no workflow acceptance",
        );
      }
    };
    await assertStructure(db);
    await empty();
    const result = await run(db);
    await assertStructure(db);
    await empty();
    return result;
  } finally {
    await db.close();
  }
}
export {
  observed,
  prior,
  orgObserved,
  ddl,
  piece,
  tables,
  query,
  catalog,
  sequenceCatalog,
  assertStructure,
  withStructure,
};
