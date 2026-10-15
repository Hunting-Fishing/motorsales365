// STRUCTURE-ONLY current-catalog reproduction, NOT historical migration source.
// No policies, functions or trigger attachments are installed/executed here.
// Synthetic auth.users(id PK) is only the declared FK target/read support.
// Not signup/organization workflow, authority, owner adoption or release proof.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { ddl as tierDDL } from "./member-tier-source.mjs";
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
    "docs/evidence/org-tier-structure-2026-10-15.json",
    "803f200878ae9f5fbe4586583ecea394890cb7e55bb64310481413ab36db42e1",
    96 * 1024,
  ),
);
const sql = readPinned(
  "scripts/ci/org-tier-structure-review.sql",
  "fd07f10c8da9824667aeda0615a99ebc6673eed135e80c917dc9a57483fa2701",
  32 * 1024,
);
const tables = ["organizations", "organization_members", "member_tiers"];
const allowedTypes = new Set([
  "uuid",
  "text",
  "numeric",
  "integer",
  "timestamp with time zone",
  "public.org_role",
  "public.business_kind",
  "public.verification_status",
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
  assert.ok(["organizations", "organization_members"].includes(table));
  const columns = observed.columns
    .filter((c) => c.table === table)
    .sort((a, b) => a.position - b.position);
  const lines = columns.map((c) => {
    assert.ok(allowedTypes.has(c.type), c.type);
    assert.equal(c.identity, "");
    assert.equal(c.generated, "");
    const value = piece(table, "column", c.name);
    assert.equal(md5(value), c.defaultMd5);
    return `${ident(c.name)} ${c.type}${value === null ? "" : " DEFAULT " + value}${c.notNull ? " NOT NULL" : ""}`;
  });
  for (const c of observed.constraints.filter((c) => c.table === table))
    lines.push(`CONSTRAINT ${ident(c.name)} ${piece(table, "constraint", c.name)}`);
  return `CREATE TABLE public.${ident(table)} (\n${lines.join(",\n")}\n);`;
}
const ddl = {
  organizations: tableDDL("organizations"),
  members: tableDDL("organization_members"),
  tiers: tierDDL,
};
async function catalog(db) {
  const r = await db.exec(sql);
  const values = r.flatMap((x) => x.rows).filter((x) => x.catalog);
  assert.equal(values.length, 1);
  const { observedAtUtc, ...c } = values[0].catalog;
  return c;
}
async function assertStructure(db) {
  const actual = await catalog(db);
  for (const key of ["tables", "columns", "enums", "indexes"])
    assert.deepEqual(actual[key], observed[key], `${key}: exact current structural metadata`);
  const nn = (
    await db.query(
      `SELECT k.conname name,pg_catalog.cardinality(k.conkey) size,k.convalidated valid,
    EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=k.conrelid AND a.attnum=k.conkey[1] AND a.attnotnull AND NOT a.attisdropped) backed
    FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND k.contype='n' ORDER BY k.conname`,
      [tables],
    )
  ).rows;
  assert.equal(nn.length, actual.constraints.filter((c) => c.type === "n").length);
  for (const n of nn) assert.deepEqual([n.size, n.valid, n.backed], [1, true, true]);
  assert.deepEqual(
    actual.constraints.filter((c) => c.type !== "n"),
    observed.constraints,
    "all ten actual critical constraints, no FK/UNIQUE/CHECK suppression",
  );
  assert.deepEqual(
    actual.policies,
    [],
    "policies deliberately NOT installed; no row-authority proof",
  );
  assert.deepEqual(
    actual.triggers,
    [],
    "attachments deliberately NOT installed; no workflow proof",
  );
  assert.deepEqual(actual.functions, [], "no permissive helper substitutions");
  return actual;
}
async function withStructure(run) {
  const db = new PGlite();
  try {
    await db.exec(
      "CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;CREATE ROLE service_role NOLOGIN NOSUPERUSER BYPASSRLS NOINHERIT;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);",
    );
    for (const e of observed.enums) {
      assert.equal(e.schema, "public");
      await db.exec(
        `CREATE TYPE public.${ident(e.name)} AS ENUM (${e.labels.map(literal).join(",")});`,
      );
    }
    for (const statement of Object.values(ddl)) await db.exec(statement);
    for (const i of observed.indexes) {
      if (
        observed.constraints.some(
          (c) => c.table === i.table && c.name === i.name && ["p", "u"].includes(c.type),
        )
      )
        continue;
      await db.exec(piece(i.table, "index", i.name));
    }
    for (const t of observed.tables) {
      assert.ok(tables.includes(t.table));
      assert.equal(t.owner, "postgres");
      assert.equal(t.rls, true);
      assert.equal(t.forceRls, false);
      assert.equal(
        t.acl,
        "{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}",
      );
      await db.exec(
        `ALTER TABLE public.${ident(t.table)} ENABLE ROW LEVEL SECURITY;GRANT ALL ON TABLE public.${ident(t.table)} TO anon,authenticated,service_role;`,
      );
    }
    const empty = async () => {
      for (const table of tables)
        assert.deepEqual(
          (await db.query(`SELECT id FROM public.${ident(table)} LIMIT 1`)).rows,
          [],
          "structure-only fixture must stay empty; no workflow acceptance",
        );
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
export { observed, ddl, piece, catalog, assertStructure, withStructure };
