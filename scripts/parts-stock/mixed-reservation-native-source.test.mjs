// Root-serialized offline/memory parity only. The builder itself has no engine,
// process, network, connection or SQL runtime. No native/authority claim here.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { PGlite } from "@electric-sql/pglite";
import {
  buildMixedReservationNativeSource,
  candidateSQL,
  candidateSha256,
  ids,
  limitations,
  metadata,
  selectedSources,
  setupStatements,
  signature,
  tables,
} from "./mixed-reservation-native-source.mjs";
import {
  ids as fixtureIds,
  limitations as fixtureLimitations,
  selectedSources as fixtureSelections,
  tables as fixtureTables,
  SIGNATURE,
  snapshot,
  withMixedReservationFixture,
} from "./mixed-reservation-fixture.mjs";

const root = new URL("../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8").replace(/\r\n/g, "\n");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const terminated = (sql) => (sql.trimEnd().endsWith(";") ? sql.trimEnd() : sql.trimEnd() + ";");

// Independent test rendering of actual captured fixture query DATA. Keep the
// entire SQL template/whitespace and each parameter position; no SQL parsing,
// row replacement or caller-controlled expressions hide setup differences.
function renderCaptured({ sql, parameters }) {
  const used = new Set();
  const rendered = sql.replace(/\$([1-9][0-9]*)\b/g, (_match, digits) => {
    const index = Number(digits) - 1;
    assert.ok(index < parameters.length);
    const value = parameters[index];
    assert.equal(typeof value, "string");
    used.add(index);
    const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value);
    assert.ok(uuid || value === "10" || value === "8");
    return (
      "pg_catalog.convert_from(pg_catalog.decode('" +
      Buffer.from(value, "utf8").toString("hex") +
      "','hex'),'UTF8')" +
      (uuid ? "::uuid" : "")
    );
  });
  assert.equal(used.size, parameters.length);
  assert.doesNotMatch(rendered, /\$[0-9]/);
  return terminated(rendered);
}

// One test-only scoped interception observes the EXISTING fixture's actual
// public exec/query calls, still executing every original SQL statement in
// PGlite. Internal engine calls are not a second setup action. Restore method
// descriptors before the callback and in finally; this is not builder DI.
async function captureOriginalFixture(run) {
  const calls = [];
  let recording = false;
  let depth = 0;
  const originalDescriptors = new Map();
  for (const method of ["exec", "query"]) {
    originalDescriptors.set(method, Object.getOwnPropertyDescriptor(PGlite.prototype, method));
    const original = PGlite.prototype[method];
    assert.equal(typeof original, "function");
    Object.defineProperty(PGlite.prototype, method, {
      configurable: true,
      writable: true,
      value: async function (sql, parameters, ...rest) {
        const outer = depth === 0;
        if (outer && sql.startsWith("\nCREATE ROLE anon ")) recording = true;
        if (outer && recording)
          calls.push({ method, sql, parameters: parameters === undefined ? [] : [...parameters] });
        depth++;
        try {
          return await original.call(this, sql, parameters, ...rest);
        } finally {
          depth--;
        }
      },
    });
  }
  const restore = () => {
    recording = false;
    for (const [method, descriptor] of originalDescriptors) {
      if (descriptor) Object.defineProperty(PGlite.prototype, method, descriptor);
      else delete PGlite.prototype[method];
    }
  };
  try {
    return await withMixedReservationFixture(async (db) => {
      restore();
      assert.equal(calls.length, 66, "All setup calls, including context reset, are retained");
      assert.equal(calls.filter((call) => call.method === "query").length, 9);
      assert.equal(calls.filter((call) => call.sql.startsWith("INSERT INTO ")).length, 8);
      assert.deepEqual(calls.map(renderCaptured), setupStatements.map(terminated));
      return run(db);
    });
  } finally {
    restore();
  }
}

const clocks = Object.freeze([
  ["public", "businesses", 2, true],
  ["public", "business_inventory_items", 2, true],
  ["public", "network_part_inquiries", 2, true],
  ["public", "parts_orders", 1, true],
  ["public", "parts_order_lines", 1, true],
  ["public", "parts_reservations", 1, false],
]);
async function checkedSnapshot(db) {
  const state = await snapshot(db);
  assert.deepEqual(
    Object.keys(state.data),
    tables.map(([schema, table]) => `${schema}.${table}`),
  );
  // Independently seeded now() instants alone may differ. Require the exact
  // timestamp types/defaults/nullability and actual finite/equal pair values
  // BEFORE replacing these named clock fields. All other fields stay intact.
  for (const [schema, table, count, pair] of clocks) {
    const rows = state.data[`${schema}.${table}`];
    assert.equal(rows.length, count);
    const names = pair ? ["created_at", "updated_at"] : ["created_at"];
    for (const name of names) {
      const column = state.catalog.columns.find(
        (value) => value.nspname === schema && value.relname === table && value.attname === name,
      );
      assert.equal(column.type, "timestamp with time zone");
      assert.equal(column.attnotnull, true);
      assert.equal(column.default_expression, "now()");
    }
    const finite = (
      await db.query(
        `SELECT count(*)::int n,bool_and(isfinite(created_at)${pair ? " AND isfinite(updated_at) AND created_at=updated_at" : ""}) valid FROM ${schema}.${table}`,
      )
    ).rows[0];
    assert.deepEqual(finite, { n: count, valid: true });
    for (const row of rows) {
      for (const name of names) assert.equal(typeof row[name], "string");
      if (pair) assert.equal(row.created_at, row.updated_at);
      for (const name of names) row[name] = "<validated independent seed clock>";
    }
  }
  const expires = state.catalog.columns.find(
    (value) =>
      value.nspname === "public" &&
      value.relname === "parts_reservations" &&
      value.attname === "expires_at",
  );
  assert.equal(expires.type, "timestamp with time zone");
  assert.equal(expires.attnotnull, true);
  assert.equal(expires.default_expression, null);
  assert.deepEqual(
    (
      await db.query(
        "SELECT count(*)::int n,bool_and(isfinite(expires_at) AND expires_at-created_at=interval '1 day' AND released_at IS NULL AND fulfilled_at IS NULL) valid FROM public.parts_reservations",
      )
    ).rows[0],
    { n: 1, valid: true },
  );
  assert.equal(typeof state.data["public.parts_reservations"][0].expires_at, "string");
  state.data["public.parts_reservations"][0].expires_at =
    "<validated seed clock plus exactly one day>";
  // Do NOT normalize the native generated order number, sequence, IDs, money,
  // notes/status or any other TEXT/numeric field. Every NUMERIC is kept as text.
  assert.deepEqual(state.sequence, { last_value: "1000", is_called: true });
  assert.deepEqual(
    (
      await db.query(
        "SELECT count(*)::int n,bool_and(order_number='PN-'||to_char(created_at::date,'YYMM')||'-001000') valid FROM public.parts_orders",
      )
    ).rows[0],
    { n: 1, valid: true },
  );
  for (const column of state.catalog.columns.filter((value) =>
    /^numeric(?:\(|$)/.test(value.type),
  )) {
    for (const row of state.data[`${column.nspname}.${column.relname}`] ?? []) {
      assert.ok(row[column.attname] === null || typeof row[column.attname] === "string");
    }
  }
  assert.equal(state.catalog.constraints.filter((value) => value.contype === "f").length, 28);
  assert.ok(
    state.catalog.constraints.every(
      (value) => value.convalidated && !value.condeferrable && !value.condeferred,
    ),
  );
  assert.equal(state.catalog.policies.length, 0);
  assert.ok(
    state.catalog.tables
      .filter((value) => value.relkind === "r")
      .every((value) => value.relrowsecurity),
  );
  const privileges = (
    await db.query(
      "SELECT role,has_function_privilege(role,$1,'EXECUTE') allowed FROM unnest(ARRAY['anon','authenticated','service_role']) role ORDER BY role",
      [signature],
    )
  ).rows;
  assert.deepEqual(privileges, [
    { role: "anon", allowed: false },
    { role: "authenticated", allowed: false },
    { role: "service_role", allowed: false },
  ]);
  return state;
}

test("builder imports builtins only, reads pinned local sources and has no engine/process/network/SQL execution", () => {
  const source = read("scripts/parts-stock/mixed-reservation-native-source.mjs");
  const imports = [...source.matchAll(/^import[\s\S]*?from "([^"]+)";/gm)].map((match) => match[1]);
  assert.deepEqual(imports, ["node:assert/strict", "node:fs", "node:crypto", "node:buffer"]);
  assert.doesNotMatch(
    source,
    /\b(?:new PGlite|execFile|spawn|fetch|createConnection|process\.env|db\.exec|db\.query|eval)\b/,
  );
  assert.doesNotMatch(source, /import\s*\(/);
  assert.equal(hash(read(metadata.fixturePath)), metadata.fixtureSha256);
  assert.equal(hash(read(metadata.candidatePath)), metadata.candidateSha256);
  assert.equal(hash(read(metadata.fixtureTestPath)), metadata.fixtureTestSha256);
});

test("exact twelve whole pins/41 ordered complete spans and all thirteen identities match frozen fixture", () => {
  assert.equal(selectedSources.length, 41);
  assert.equal(new Set(selectedSources.map((source) => source.path)).size, 12);
  assert.deepEqual(selectedSources, fixtureSelections);
  assert.deepEqual(ids, fixtureIds);
  assert.deepEqual(tables, fixtureTables);
  assert.equal(tables.length, 13);
  assert.deepEqual(limitations, fixtureLimitations);
  assert.equal(signature, SIGNATURE);
  for (const section of selectedSources) {
    const whole = read(section.path);
    assert.equal(hash(whole), section.wholeSha256);
    assert.equal(hash(section.sql), section.sha256);
    assert.equal(
      whole
        .split("\n")
        .slice(section.start - 1, section.end)
        .join("\n"),
      section.sql,
    );
    assert.ok(section.sql.endsWith(";"));
  }
});

test("fixed frozen API exposes complete setup and exact unapplied candidate, never activates it", () => {
  const first = buildMixedReservationNativeSource();
  assert.deepEqual(first, buildMixedReservationNativeSource());
  assert.equal(first.setupStatements, setupStatements);
  assert.equal(first.candidateSQL, candidateSQL);
  assert.equal(first.candidateSha256, candidateSha256);
  assert.equal(candidateSQL, read(metadata.candidatePath));
  assert.equal(candidateSha256, "80dfd6a15e15ca404ece0cb77402d3fa3280da767d5f19a1cca9e3b16436332f");
  assert.equal(first.metadata, metadata);
  assert.equal(first.ids, ids);
  assert.equal(first.signature, signature);
  for (const value of [
    first,
    setupStatements,
    selectedSources,
    metadata,
    metadata.fixedSeeds,
    ids,
    tables,
    limitations,
  ])
    assert.ok(Object.isFrozen(value));
  assert.ok(tables.every(Object.isFrozen));
  assert.ok(selectedSources.every(Object.isFrozen));
  assert.equal(setupStatements.length, 66);
  assert.ok(setupStatements.every((sql) => sql.trimEnd().endsWith(";")));
  assert.equal(setupStatements.filter((sql) => sql.startsWith("INSERT INTO ")).length, 8);
  assert.equal(
    setupStatements.filter((sql) => sql.includes("CREATE SCHEMA mixed_reservation_candidate"))
      .length,
    0,
  );
});

test("synthetic support/manager placement, exact RLS and withheld execution retain frozen order without happy-role grants", () => {
  assert.match(
    setupStatements[0],
    /^\nCREATE ROLE anon NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;/,
  );
  assert.match(setupStatements[0], /CREATE TABLE auth\.users\(id uuid PRIMARY KEY\)/);
  assert.equal(setupStatements[0].includes("current_setting('test.user',true)"), true);
  assert.deepEqual(
    setupStatements.slice(1, 6),
    fixtureSelections.slice(0, 5).map((section) => section.sql),
  );
  assert.match(setupStatements[6], /SYNTHETIC owner lookup ONLY/);
  assert.match(setupStatements[6], /SELECT _role='manager' AND EXISTS/);
  assert.deepEqual(
    setupStatements.slice(7, 43),
    fixtureSelections.slice(5).map((section) => section.sql),
  );
  assert.deepEqual(
    setupStatements.slice(43, 56),
    tables.map(([schema, table]) => `ALTER TABLE ${schema}.${table} ENABLE ROW LEVEL SECURITY;`),
  );
  assert.equal(
    setupStatements[56],
    "REVOKE ALL ON FUNCTION public.reserve_network_inquiry(uuid,uuid,numeric,integer,text),\n      public.active_reservation_qty(uuid), public.has_business_role(uuid,uuid,public.business_staff_role), auth.uid()\n      FROM PUBLIC,anon,authenticated,service_role;",
  );
  assert.equal(setupStatements[57], "SELECT set_config('test.user','',false);");
  assert.doesNotMatch(setupStatements.join("\n"), /\bGRANT\b|CREATE POLICY/i);
});

test("fixed default seeds are typed literal DATA; all supplied options are refused without inspecting getters/proxies", () => {
  let traps = 0;
  const getter = Object.defineProperty({}, "stock", {
    enumerable: true,
    get() {
      traps++;
      return "1);DROP TABLE auth.users";
    },
  });
  const proxy = new Proxy(
    {},
    {
      ownKeys() {
        traps++;
        throw new Error("private");
      },
      get() {
        traps++;
        throw new Error("private");
      },
    },
  );
  for (const value of [
    undefined,
    null,
    {},
    { stock: "10", b2bHold: "8" },
    { stock: "NaN" },
    { sql: "DROP TABLE auth.users" },
    Object.create({ stock: "10" }),
    getter,
    proxy,
  ])
    assert.throws(
      () => buildMixedReservationNativeSource(value),
      /^Error: Fixed synthetic source takes no options\.$/,
    );
  assert.equal(traps, 0);
  assert.deepEqual(metadata.fixedSeeds, { stock: "10", b2bHold: "8" });
  for (const statement of setupStatements.slice(-8)) {
    assert.doesNotMatch(statement, /\$[0-9]/);
    assert.ok(statement.startsWith("INSERT INTO "));
  }
  assert.ok(setupStatements.at(-1).includes("now()+interval '1 day'"));
  assert.ok(setupStatements.at(-1).includes("'38','hex'),'UTF8')::numeric"));
  assert.ok(setupStatements.at(-5).includes("'3130','hex'),'UTF8')::numeric"));
});

test(
  "memory-only full executed setup transcript, selected data/catalog/ACL/constraints/functions/settings/sequence equal frozen fixture",
  { concurrency: false },
  async () => {
    // Engines are sequential and always closed. Candidate installation is only
    // private owner DDL in these memory fixtures; no ordinary grant is added.
    const expected = await captureOriginalFixture(async (db) => {
      await db.exec(candidateSQL);
      return checkedSnapshot(db);
    });
    const db = new PGlite();
    try {
      for (const statement of buildMixedReservationNativeSource().setupStatements)
        await db.exec(statement);
      await db.exec(candidateSQL);
      const actual = await checkedSnapshot(db);
      assert.deepEqual(actual, expected);
      assert.deepEqual(actual.settings, expected.settings);
      assert.deepEqual(actual.sequence, expected.sequence);
      assert.equal(actual.data["public.parts_reservations"][0].quantity, "8.00");
      assert.equal(actual.data["public.parts_orders"][0].status, "accepted");
      assert.equal(actual.data["public.network_part_inquiries"].length, 2);
    } finally {
      await db.close();
    }
  },
);
