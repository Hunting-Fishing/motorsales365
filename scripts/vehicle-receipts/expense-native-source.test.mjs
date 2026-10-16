// Root-only offline/memory parity execution. The source builder itself imports
// Node builtins ONLY and cannot construct a database, process or connection.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  buildExpenseNativeSource,
  ids,
  metadata,
  selectedSources,
  setupStatements,
} from "./expense-native-source.mjs";
import {
  ids as fixtureIds,
  limitations as fixtureLimitations,
  pins as fixturePins,
  selectedSources as fixtureSelections,
  snapshot,
  withExpensePostingFixture,
} from "./expense-posting-fixture.mjs";

const root = new URL("../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8").replace(/\r\n/g, "\n");
const hash = (value) => createHash("sha256").update(value).digest("hex");
function comparable(state) {
  const result = structuredClone(state);
  // Only unavoidable independent-seed clock instants differ. Both receipt
  // defaults must be present/equal; their actual definitions remain in the full
  // selected catalog comparison. No data/value/constraint/ACL is discarded.
  for (const name of ["created_at", "updated_at"]) {
    const column = result.catalog.columns.find(
      (value) => value.relname === "vehicle_receipts" && value.attname === name,
    );
    assert.equal(column.type, "timestamp with time zone");
    assert.equal(column.attnotnull, true);
    assert.equal(column.default_expression, "now()");
  }
  for (const row of result.data["public.vehicle_receipts"]) {
    assert.equal(typeof row.created_at, "string");
    assert.equal(row.created_at, row.updated_at);
    row.created_at = "<independent seed clock>";
    row.updated_at = "<independent seed clock>";
  }
  return result;
}
async function checkedSnapshot(db) {
  const clocks = (
    await db.query(`SELECT count(*)::int AS n,bool_and(created_at IS NOT NULL AND updated_at IS NOT NULL
    AND isfinite(created_at) AND isfinite(updated_at) AND created_at=updated_at) AS valid FROM public.vehicle_receipts`)
  ).rows[0];
  assert.deepEqual(clocks, { n: 1, valid: true });
  return comparable(await snapshot(db));
}
async function compareMemory(options) {
  // Databases are created sequentially, never kept open together; all close in
  // finally. This is selected source parity, not native PG17/API/authority proof.
  const expected = await withExpensePostingFixture(async (db) => checkedSnapshot(db), options);
  const built = buildExpenseNativeSource(options);
  const db = new PGlite();
  try {
    for (const statement of built.setupStatements) await db.exec(statement);
    assert.deepEqual(await checkedSnapshot(db), expected);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM auth.users")).rows[0].n, 2);
  } finally {
    await db.close();
  }
}

test("builtins-only module has no PGlite/fixture/process/network/connection import or runtime SQL path", () => {
  const source = read("scripts/vehicle-receipts/expense-native-source.mjs");
  const imports = [...source.matchAll(/^import[\s\S]*?from "([^"]+)";/gm)].map((match) => match[1]);
  assert.deepEqual(imports, ["node:assert/strict", "node:fs", "node:crypto", "node:buffer"]);
  assert.doesNotMatch(
    source,
    /\b(?:new PGlite|execFile|spawn|fetch|createConnection|process\.env|db\.exec|db\.query)\b/,
  );
  assert.equal(hash(read(metadata.fixturePath)), metadata.fixtureSha256);
  assert.equal(hash(read(metadata.candidatePath)), metadata.candidateSha256);
});

test("all seven whole-source pins/22 complete source selections, IDs and limits exactly equal the unchanged fixture", () => {
  assert.equal(new Set(selectedSources.map((source) => source.path)).size, 7);
  assert.equal(selectedSources.length, 22);
  assert.deepEqual(selectedSources, fixtureSelections);
  assert.deepEqual(ids, fixtureIds);
  assert.deepEqual(metadata.limitations, fixtureLimitations);
  assert.deepEqual(
    selectedSources.map(({ sql: _sql, ...pin }) => pin),
    fixturePins,
  );
  for (const source of selectedSources) assert.equal(hash(source.sql), source.sha256);
});

test("documented frozen native-consumer API preserves setup order and exact unapplied candidate bytes", () => {
  const first = buildExpenseNativeSource();
  const second = buildExpenseNativeSource();
  assert.deepEqual(first, second);
  assert.equal(first.setupStatements.length, 29);
  assert.ok(first.setupStatements.every((statement) => statement.trimEnd().endsWith(";")));
  assert.deepEqual(
    first.setupStatements.slice(0, 22),
    fixtureSelections.map((source) => source.sql),
  );
  assert.equal(first.candidateSQL, read(metadata.candidatePath));
  assert.equal(
    first.candidateSha256,
    "ddea3f2c59cc8ec385c6273d700ea4a8ee2a010eeac14c3f6475cd3f7b3c1368",
  );
  assert.equal(first.signature, "receipt_expense_candidate.create_operation(jsonb,text)");
  assert.ok(
    Object.isFrozen(first) &&
      Object.isFrozen(first.setupStatements) &&
      Object.isFrozen(first.metadata) &&
      Object.isFrozen(first.ids),
  );
  assert.deepEqual(setupStatements(), first.setupStatements);
});

test("options are bounded own-data strings/null only, no raw identifiers/getters or arbitrary extra setup", () => {
  for (const options of [
    null,
    [],
    1,
    "x",
    { sql: "DROP TABLE auth.users" },
    { vendor: undefined },
    { vendor: 1 },
    { vendor: "x".repeat(4097) },
    { vendor: "x\0y" },
    { vendor: "\ud800" },
    { vendor: "\udc00" },
    Object.assign(Object.create({ vendor: "inherited" }), { total: "1" }),
  ]) {
    assert.throws(() => setupStatements(options), /Invalid synthetic seed options/);
  }
  let readCount = 0;
  const getter = {};
  Object.defineProperty(getter, "vendor", {
    enumerable: true,
    get() {
      readCount++;
      return "private";
    },
  });
  assert.throws(() => setupStatements(getter), /Invalid synthetic seed options/);
  assert.equal(readCount, 0);
  const hidden = {};
  Object.defineProperty(hidden, "vendor", { value: "private", enumerable: false });
  assert.throws(() => setupStatements(hidden), /Invalid synthetic seed options/);
  assert.throws(
    () => setupStatements({ [Symbol("private")]: "x" }),
    /Invalid synthetic seed options/,
  );
  assert.deepEqual(
    setupStatements(Object.assign(Object.create(null), { vendor: null })),
    setupStatements({ vendor: null }),
  );
});

test("controlled text is deterministically hex-encoded as DATA, independent of quotes/backslashes/SQL-looking strings", () => {
  const vendor = "x'); DROP TABLE auth.users; -- \\ 🧾\n\t";
  const statements = setupStatements({ vendor });
  const last = statements.at(-1);
  assert.ok(!last.includes(vendor));
  assert.match(last, /pg_catalog\.convert_from\(pg_catalog\.decode\('[0-9a-f]*','hex'\),'UTF8'\)/);
  assert.equal(last.includes(Buffer.from(vendor, "utf8").toString("hex")), true);
  assert.deepEqual(statements.slice(0, -1), setupStatements().slice(0, -1));
  assert.match(
    setupStatements({ vendor: null, total: null, purchasedOn: null }).at(-1),
    /NULL,NULL::date/,
  );
});

test("default composed source/seeds have full selected data/catalog/settings parity with frozen fixture", async () => {
  await compareMemory();
});

test("unscaled numeric, native date and escaped Unicode/control seed values preserve frozen fixture parity", async () => {
  await compareMemory({
    total: "12.345",
    purchasedOn: "2000-02-29",
    vendor: "x'); DROP TABLE auth.users; -- \\ 🧾\n\t",
  });
});

test("nullable draft seed cohort preserves frozen fixture semantics without inventing completeness or policy", async () => {
  await compareMemory({ total: null, purchasedOn: null, vendor: null, status: "draft" });
});
