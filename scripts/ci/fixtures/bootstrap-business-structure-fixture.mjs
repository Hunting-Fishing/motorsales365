// STRUCTURE ONLY: extend the unchanged seven-table fixture with three tables.
// Actual selected retained business-types/audit DDL; current-catalog businesses.
// No policy/helper/trigger attachments or production rows. Not signup/authority.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  withStructure as withCore,
  observed as coreObserved,
} from "./bootstrap-core-structure-fixture.mjs";
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
    "docs/evidence/bootstrap-business-structure-2026-10-15.json",
    "dd826ce1edf75376bd75d4bfcf859e8a7300655c34445a01a0cca13ec43458e8",
    128 * 1024,
  ),
);
const metadata = JSON.parse(
  readPinned(
    "docs/evidence/bootstrap-business-catalog-2026-10-15.json",
    "6a569e142c64f8da81b2afbb3d48bfad87c1b9db21cee03259db961b7c41169a",
    80 * 1024,
  ),
);
const query = readPinned(
  "scripts/ci/bootstrap-business-structure-review.sql",
  "79349e4596c9ed73f438c9246fcb03454b089a37d253d0749585b9689e9684c2",
  32 * 1024,
);
const metadataQuery = readPinned(
  "scripts/ci/bootstrap-business-catalog-review.sql",
  "ad47d258070ffab5ad87a25fb4ef2d124817ddc51b86ed0ec38e58426d674c25",
  16 * 1024,
);
const sources = {
  business: readPinned(
    "supabase/migrations/20260512054457_90aac1ba-c3f0-48ff-a9b4-06739ddd2108.sql",
    "7ab71ad92eec0d9e9647fc8ffa46ef2b35c561c76b85d29ad41f9c32261fde8c",
    512 * 1024,
  ),
  audit: readPinned(
    "supabase/migrations/20260513133043_5dfec6a3-6eca-4a03-8ee7-681496b8458c.sql",
    "8f8c2b3a07d457a053ee30da1bf9bbde227876ef01e4084ddc13fa7bd1a0e773",
    512 * 1024,
  ),
  widen: readPinned(
    "supabase/migrations/20260619174416_890280d2-2b87-48e6-ac17-839a5b02fe50.sql",
    "0c5d4cf72d234d1a7d7f4435ba9f46d88fe68548a7fb79ffaa3fa83f83948bb5",
    512 * 1024,
  ),
};
const selections = {};
function select(key, source, marker) {
  const raw = sources[source];
  assert.equal(raw.split(marker).length, 2, "unique selected statement");
  const first = raw.indexOf(marker),
    last = raw.indexOf(";", first) + 1;
  assert.ok(last > first);
  const value = raw.slice(first, last);
  assert.ok(Buffer.byteLength(value) < 16 * 1024);
  selections[key] = {
    source,
    marker,
    firstLine: raw.slice(0, first).split("\n").length,
    sha256Lf: sha(value),
    bytes: Buffer.byteLength(value),
  };
  return value;
}
const ddl = {
  types: select("types", "business", "CREATE TABLE public.business_types ("),
  audit: select("audit", "audit", "CREATE TABLE public.admin_audit_log ("),
  widen: select("widen", "widen", "ALTER TABLE public.admin_audit_log\n  ADD COLUMN"),
  targetNullable: select(
    "targetNullable",
    "widen",
    "ALTER TABLE public.admin_audit_log ALTER COLUMN target_user_id DROP NOT NULL",
  ),
  fieldNullable: select(
    "fieldNullable",
    "widen",
    "ALTER TABLE public.admin_audit_log ALTER COLUMN field DROP NOT NULL",
  ),
};
const auditIndexes = [
  select("auditTarget", "audit", "CREATE INDEX idx_admin_audit_target"),
  select("auditActor", "audit", "CREATE INDEX idx_admin_audit_actor"),
  select("auditCreated", "audit", "CREATE INDEX idx_admin_audit_created"),
  select("auditAction", "widen", "CREATE INDEX IF NOT EXISTS idx_admin_audit_action"),
  select("auditEntity", "widen", "CREATE INDEX IF NOT EXISTS idx_admin_audit_entity"),
];
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
const allowedTypes = new Set([
  "uuid",
  "text",
  "timestamp with time zone",
  "jsonb",
  "integer",
  "numeric",
  "public.business_status",
  "boolean",
  "public.business_tier",
]);
function businessesDDL() {
  const lines = observed.columns
    .filter((c) => c.table === "businesses")
    .sort((a, b) => a.position - b.position)
    .map((c) => {
      assert.ok(allowedTypes.has(c.type), c.type);
      assert.equal(c.identity, "");
      assert.equal(c.generated, "");
      assert.equal(c.acl, null);
      const value = piece("businesses", "column", c.name);
      assert.equal(md5(value), c.defaultMd5);
      return (
        ident(c.name) +
        " " +
        c.type +
        (value === null ? "" : " DEFAULT " + value) +
        (c.notNull ? " NOT NULL" : "")
      );
    });
  for (const c of observed.constraints.filter((c) => c.table === "businesses")) {
    assert.equal(c.validated, true);
    assert.equal(c.deferrable, false);
    assert.equal(c.deferred, false);
    lines.push("CONSTRAINT " + ident(c.name) + " " + piece(c.table, "constraint", c.name));
  }
  return "CREATE TABLE public.businesses (\n" + lines.join(",\n") + "\n);";
}
ddl.businesses = businessesDDL();
const tables = ["admin_audit_log", "business_types", "businesses"];
async function catalog(db, sql = query) {
  const result = await db.exec(sql),
    rows = result.flatMap((r) => r.rows).filter((r) => r.catalog);
  assert.equal(rows.length, 1);
  const { observedAtUtc, ...c } = rows[0].catalog;
  return c;
}
async function assertStructure(db) {
  const actual = await catalog(db);
  for (const key of ["tables", "columns", "indexes", "enums"])
    assert.deepEqual(actual[key], observed[key], key + ": exact business/audit structure");
  const nn = (
    await db.query(
      "SELECT k.conname name,cardinality(k.conkey) size,k.convalidated valid,EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=k.conrelid AND a.attnum=k.conkey[1] AND a.attnotnull AND NOT a.attisdropped) backed FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND k.contype='n' ORDER BY k.conname",
      [tables],
    )
  ).rows;
  assert.equal(nn.length, actual.constraints.filter((k) => k.type === "n").length);
  for (const n of nn) assert.deepEqual([n.size, n.valid, n.backed], [1, true, true]);
  assert.deepEqual(
    actual.constraints.filter((k) => k.type !== "n"),
    observed.constraints,
    "all actual critical business/audit constraints",
  );
  for (const key of ["policies", "triggers", "functions"])
    assert.deepEqual(actual[key], [], "not installed; no row-authority/workflow acceptance");
}
async function withStructure(run) {
  return withCore(async (db) => {
    for (const e of observed.enums) {
      const existing = coreObserved.enums.find((c) => c.name === e.name);
      if (existing) {
        assert.deepEqual(e, existing);
        continue;
      }
      assert.equal(e.schema, "public");
      await db.exec(
        "CREATE TYPE public." +
          ident(e.name) +
          " AS ENUM (" +
          e.labels.map(literal).join(",") +
          ");",
      );
    }
    for (const statement of Object.values(ddl)) await db.exec(statement);
    for (const i of observed.indexes) {
      if (
        i.table === "admin_audit_log" ||
        observed.constraints.some(
          (c) => c.table === i.table && c.name === i.name && ["p", "u"].includes(c.type),
        )
      )
        continue;
      await db.exec(piece(i.table, "index", i.name));
    }
    for (const statement of auditIndexes) await db.exec(statement);
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
        "ALTER TABLE public." +
          ident(t.table) +
          " ENABLE ROW LEVEL SECURITY;GRANT ALL ON TABLE public." +
          ident(t.table) +
          " TO anon,authenticated,service_role;",
      );
    }
    const empty = async () => {
      for (const table of tables)
        assert.deepEqual(
          (await db.query("SELECT 1 FROM public." + ident(table) + " LIMIT 1")).rows,
          [],
          "business/audit structure-only fixture must stay empty",
        );
    };
    await assertStructure(db);
    await empty();
    const result = await run(db);
    await assertStructure(db);
    await empty();
    return result;
  });
}
export {
  observed,
  metadata,
  query,
  metadataQuery,
  ddl,
  auditIndexes,
  selections,
  piece,
  tables,
  catalog,
  assertStructure,
  withStructure,
};
