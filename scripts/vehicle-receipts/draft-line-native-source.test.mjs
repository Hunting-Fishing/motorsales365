// Root-serialized offline/memory parity only. PGlite is test-only, never imported
// by the source builder. No native independent session or authority acceptance.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  additionalStatements,
  buildDraftLineNativeSource,
  builderLimitations,
  candidateSQL,
  candidateSha256,
  ids,
  limitations,
  limits,
  metadata,
  parentLimitations,
  parentPins,
  parentSelectedSources,
  pins,
  selectedSources,
  signature,
  sourcePins,
} from "./draft-line-native-source.mjs";
import { buildExpenseNativeSource } from "./expense-native-source.mjs";
import {
  ids as fixtureIds,
  limitations as fixtureLimitations,
  parentLimitations as fixtureParentLimitations,
  parentPins as fixtureParentPins,
  pins as fixturePins,
  selectedSources as fixtureSelections,
  snapshot,
  sourcePins as fixtureSourcePins,
  withDraftLineEditFixture,
} from "./draft-line-edit-fixture.mjs";
import {
  snapshot as expenseSnapshot,
  withExpensePostingFixture,
} from "./expense-posting-fixture.mjs";

const root = new URL("../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const builderPath = "scripts/vehicle-receipts/draft-line-native-source.mjs";
const imports = (source) =>
  [...source.matchAll(/^import[\s\S]*?from "([^"]+)";/gm)].map((match) => match[1]);

function comparable(state) {
  const result = structuredClone(state);
  for (const name of ["created_at", "updated_at"]) {
    for (const columns of [result.catalog.columns, result.catalog.receiptGraph.columns]) {
      const column = columns.find(
        (value) => value.relname === "vehicle_receipts" && value.attname === name,
      );
      assert.equal(column.type, "timestamp with time zone");
      assert.equal(column.attnotnull, true);
      assert.equal(column.default_expression, "now()");
    }
  }
  for (const row of result.data["public.vehicle_receipts"]) {
    assert.equal(typeof row.created_at, "string");
    assert.equal(row.created_at, row.updated_at);
    // Only independent-seed clock values differ, not any catalog/default, numeric,
    // row identity, relationship, status, policy, permission or other field.
    row.created_at = "<independent seed clock>";
    row.updated_at = "<independent seed clock>";
  }
  return result;
}
async function checkedSnapshot(db) {
  assert.deepEqual(
    (
      await db.query(`SELECT count(*)::int AS n,bool_and(created_at IS NOT NULL AND updated_at IS NOT NULL
        AND isfinite(created_at) AND isfinite(updated_at) AND created_at=updated_at) AS valid
        FROM public.vehicle_receipts`)
    ).rows[0],
    { n: 1, valid: true },
  );
  return comparable(await snapshot(db));
}
async function compareMemory(seed = async () => {}) {
  const expected = await withDraftLineEditFixture(async (db) => {
    await seed(db);
    return checkedSnapshot(db);
  });
  // Sequential databases, always closed. Exact selected snapshot parity is not
  // PG17 independent-session, real JWT/client, all-writer or recovery acceptance.
  const db = new PGlite();
  try {
    const built = buildDraftLineNativeSource();
    for (const statement of built.setupStatements) await db.exec(statement);
    await seed(db);
    assert.deepEqual(await checkedSnapshot(db), expected);
  } finally {
    await db.close();
  }
}

test("source adapter imports only builtins and the builtins-only parent, with no execution path", () => {
  const source = read(builderPath);
  assert.deepEqual(imports(source), [
    "node:assert/strict",
    "node:fs",
    "node:crypto",
    "node:buffer",
    "./expense-native-source.mjs",
  ]);
  assert.ok(
    imports(read("scripts/vehicle-receipts/expense-native-source.mjs")).every((name) =>
      name.startsWith("node:"),
    ),
  );
  assert.doesNotMatch(
    source,
    /\b(?:new PGlite|execFile|spawn|fetch|createConnection|process\.env|db\.exec|db\.query|writeFile|mkdir|unlink)\b/,
  );
  assert.doesNotMatch(source, /import\s*\(/);
});

test("whole child fixture/candidate pins and all seven original child spans remain exact", () => {
  for (const pin of Object.values(sourcePins)) assert.equal(hash(read(pin.path)), pin.sha256);
  assert.deepEqual(sourcePins.parentFixture, fixtureSourcePins.parentFixture);
  assert.deepEqual(sourcePins.receiptMigration, fixtureSourcePins.receiptMigration);
  assert.equal(candidateSha256, "78c9eff2bfc62c2897be0e22a510d9a552dc1fa48a19cfb0822d610be3ca609b");
  assert.equal(candidateSQL, read(sourcePins.candidate.path));
  assert.deepEqual(selectedSources, fixtureSelections);
  assert.deepEqual(pins, fixturePins);
  assert.equal(selectedSources.length, 7);
  for (const section of selectedSources) assert.equal(hash(section.sql), section.sha256);
});

test("parent IDs/pins/limits are unchanged and every child limitation is retained separately", () => {
  const parent = buildExpenseNativeSource({ status: "draft" });
  assert.deepEqual(ids, fixtureIds);
  assert.deepEqual(parentPins, fixtureParentPins);
  assert.deepEqual(parentLimitations, fixtureParentLimitations);
  assert.deepEqual(parentSelectedSources, parent.selectedSources);
  assert.deepEqual(metadata.parentMetadata, parent.metadata);
  assert.deepEqual(limitations, fixtureLimitations);
  assert.deepEqual(limits, [...parentLimitations, ...limitations, ...builderLimitations]);
  assert.match(builderLimitations.join(" "), /not reset\/reseed/);
  assert.match(builderLimitations.join(" "), /not included/);
});

test("native additive API has seven complete spans only; fresh parity setup is parent draft plus child", () => {
  const built = buildDraftLineNativeSource();
  assert.deepEqual(built, buildDraftLineNativeSource());
  const parent = buildExpenseNativeSource({ status: "draft" });
  assert.deepEqual(
    additionalStatements,
    fixtureSelections.map(({ sql }) => sql),
  );
  assert.equal(additionalStatements.length, 7);
  assert.equal(built.setupStatements.length, 36);
  assert.deepEqual(built.setupStatements, [...parent.setupStatements, ...additionalStatements]);
  assert.equal(built.setupSQL, built.setupStatements.join("\n\n"));
  assert.ok(built.setupStatements.every((statement) => statement.trimEnd().endsWith(";")));
  assert.equal(
    signature,
    "receipt_line_candidate.edit_draft_line(uuid,uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb)",
  );
  assert.equal(built.signature, signature);
  assert.equal(built.candidateSQL, candidateSQL);
  assert.ok(!built.setupSQL.includes("CREATE SCHEMA receipt_line_candidate"));
  assert.ok(!built.setupSQL.includes("CREATE SCHEMA receipt_expense_candidate"));
  assert.ok(
    !additionalStatements.some((sql) => /INSERT INTO|UPDATE\s|DELETE FROM|TRUNCATE\s/i.test(sql)),
  );
  for (const value of [
    built,
    built.setupStatements,
    additionalStatements,
    metadata,
    sourcePins,
    pins,
    selectedSources,
    limits,
    ids,
  ]) {
    assert.ok(Object.isFrozen(value));
  }
  for (const pin of Object.values(sourcePins)) assert.ok(Object.isFrozen(pin));
  for (const selection of selectedSources) assert.ok(Object.isFrozen(selection));
});

test("build rechecks unchanged fixture/migration/candidate bytes and refuses local source drift", () => {
  const original = fs.readFileSync;
  for (const pin of [sourcePins.fixture, sourcePins.receiptMigration, sourcePins.candidate]) {
    let changedReads = 0;
    fs.readFileSync = function (path, ...args) {
      const result = original.call(this, path, ...args);
      if (path instanceof URL && path.href === new URL(pin.path, root).href) {
        changedReads++;
        return result + "\n-- changed local source\n";
      }
      return result;
    };
    try {
      assert.throws(() => buildDraftLineNativeSource(), /source (?:required|changed)/);
      assert.equal(changedReads, 1);
    } finally {
      fs.readFileSync = original;
    }
  }
  assert.equal(buildDraftLineNativeSource().candidateSQL, candidateSQL);
});

test("fresh composed setup has full selected data/catalog/settings parity with unchanged draft fixture", async () => {
  await compareMemory();
});

test("full selected parity preserves precise child numeric text, nullable values and retained provenance", async () => {
  await compareMemory(async (db) => {
    await db.query(
      `INSERT INTO public.vehicle_receipt_items
      (id,receipt_id,description,quantity,total,confidence,reviewed,installed_on,installed_by,
       installation_origin,odometer_km,public_summary_allowed,sort_order)
      VALUES ('60000000-0000-4000-8000-000000000001',$1,'  Synthetic exact line  ',
        1.23456789012345678900,0.00000000000012300000,0.123456789012345678900,false,
        DATE '2026-10-02',$2,'customer_entered',102,true,-5)`,
      [ids.receipt, ids.manager],
    );
    const item = (await snapshot(db)).data["public.vehicle_receipt_items"][0];
    assert.equal(item.quantity, "1.23456789012345678900");
    assert.equal(item.total, "0.00000000000012300000");
    assert.equal(item.confidence, "0.123456789012345678900");
    assert.equal(item.odometer_km, "102");
    assert.equal(item.sort_order, "-5");
    assert.equal(item.category, null);
    assert.equal(item.installed_by, ids.manager);
    assert.equal(item.public_summary_allowed, true);
  });
});

test("additive native path preserves an existing confirmed expense graph and installs only locked draft candidate", async () => {
  await withExpensePostingFixture(async (db) => {
    const before = await expenseSnapshot(db);
    for (const statement of additionalStatements) await db.exec(statement);
    await db.exec(candidateSQL);
    const after = await expenseSnapshot(db);
    assert.deepEqual(after.data, before.data);
    assert.deepEqual(after.settings, before.settings);
    const { functions: beforeFunctions, ...beforeCatalog } = before.catalog;
    const { functions: afterFunctions, ...afterCatalog } = after.catalog;
    assert.deepEqual(afterCatalog, beforeCatalog);
    assert.deepEqual(
      afterFunctions.filter((fn) => !["owns_vehicle", "receipt_access"].includes(fn.proname)),
      beforeFunctions,
    );
    assert.equal(after.data["public.vehicle_receipts"][0].status, "confirmed");
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM public.vehicle_receipt_items")).rows[0].n,
      0,
    );
    assert.deepEqual(
      (
        await db.query(
          `SELECT p.prosecdef,
        has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
        has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
        has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
        FROM pg_proc p WHERE p.oid=$1::regprocedure`,
          [signature],
        )
      ).rows,
      [
        {
          prosecdef: false,
          anon_execute: false,
          authenticated_execute: false,
          service_execute: false,
        },
      ],
    );
  });
});
