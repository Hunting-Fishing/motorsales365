// Offline source/SQL-model checks, NOT real PG17 sessions or authority.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  DRAFT_LINE_STAGES,
  DRAFT_LINE_PASSES,
  invokeDraftLineSQL,
  DRAFT_SNAPSHOT_SQL,
} from "./native-draft-line-postgres.mjs";
import { withDraftLineEditFixture, ids } from "../vehicle-receipts/draft-line-edit-fixture.mjs";
import { buildDraftLineNativeSource } from "../vehicle-receipts/draft-line-native-source.mjs";

const moduleURL = new URL("./native-draft-line-postgres.mjs", import.meta.url);
const source = fs.readFileSync(moduleURL, "utf8");
const driver = fs.readFileSync(new URL("./native-expense-postgres.mjs", import.meta.url), "utf8");
const runner = fs.readFileSync(
  new URL("./run-native-expense-postgres.sh", import.meta.url),
  "utf8",
);
const value = {
  account: ids.manager,
  receipt: ids.receipt,
  item: "60000000-0000-4000-8000-000000000101",
  vehicle: null,
  shopVehicle: ids.vehicle,
  shop: ids.shop,
  expectedReceipt: { total: "250.00000", vendor: "Synthetic ' quote🧾" },
  expectedItem: { quantity: "1.23456789012345678900", confidence: "0.123456789012345678900" },
  changes: {
    description: "  日本語 ' ; --  ",
    category: "brakes",
    brand: null,
    part_number: null,
    quantity: "2.0000000000000001",
    total: "0.125000",
    reviewed: true,
  },
};
test("three full JSON witnesses are hex DATA and six bound UUID arguments never SQL fragments", () => {
  const sql = invokeDraftLineSQL(value);
  const decoded = [...sql.matchAll(/decode\('([0-9a-f]+)','hex'\)/g)].map((m) =>
    JSON.parse(Buffer.from(m[1], "hex").toString("utf8")),
  );
  assert.deepEqual(decoded, [value.expectedReceipt, value.expectedItem, value.changes]);
  assert.match(sql, /^SELECT receipt_line_candidate\.edit_draft_line\(/);
  assert.equal((sql.match(/::uuid/g) ?? []).length, 6);
  assert.doesNotMatch(sql, /日本語|Synthetic|; --/);
  assert.ok(sql.endsWith(");"));
});
test("native invocation rejects bad identifiers and oversized JSON without dispatch", () => {
  for (const field of ["account", "receipt", "item", "vehicle", "shopVehicle", "shop"])
    assert.throws(() => invokeDraftLineSQL({ ...value, [field]: "');SELECT PRIVATE;--" }));
  assert.throws(() =>
    invokeDraftLineSQL({ ...value, changes: { description: "x".repeat(65536) } }),
  );
  assert.throws(() => invokeDraftLineSQL({ ...value, expectedItem: undefined }));
});
test("additive rehearsal is inside admitted lifecycle with narrow closures and no optional skip", () => {
  assert.ok(
    driver.indexOf("await rehearseDraftLine({") > driver.indexOf('stage = "financial-wait"'),
  );
  assert.ok(driver.indexOf("await rehearseDraftLine({") < driver.indexOf('stage = "complete"'));
  assert.match(driver, /withSessions\(context, \[null\], async \(draftObserver\)/);
  assert.match(driver, /withSessions: \(subjects, run\) => withSessions\(context, subjects, run\)/);
  assert.doesNotMatch(
    source,
    /node:child_process|new PsqlSession|\bfetch\(|process\.env|process\.argv|withDraftLineEditFixture|new PGlite|DROP SCHEMA|TRUNCATE|GRANT\s+(?:EXECUTE|USAGE|UPDATE)/,
  );
  assert.match(source, /source\.additionalStatements/);
  assert.doesNotMatch(source, /source\.setupStatements|source\.setupSQL/);
});
test("exact ordered draft markers and stages remain mandatory in native transcript", () => {
  assert.equal(DRAFT_LINE_STAGES.length, 9);
  assert.equal(DRAFT_LINE_PASSES.length, 8);
  for (const stage of DRAFT_LINE_STAGES) assert.ok(runner.includes(stage));
  for (const message of DRAFT_LINE_PASSES) assert.ok(runner.includes("'" + message + "'"));
  for (let i = 0; i < 8; i++) assert.ok(source.includes(`pass(DRAFT_LINE_PASSES[${i}])`));
  assert.match(driver, /\.\.\.DRAFT_LINE_STAGES/);
});
test("both target modes, observed barrier, CAS/role/native CHECK errors and exact sibling preservation stay explicit", () => {
  assert.match(source, /for \(const publicTarget of \[false, true\]\)/);
  assert.match(source, /await observedBlock\(observer, owner, locker\)/);
  assert.match(source, /await observedBlock\(observer, second, first\)/);
  assert.match(source, /await observedBlock\(observer, competitor, owner\)/);
  assert.match(source, /"42501"/);
  assert.match(source, /"40001"/);
  assert.match(source, /"23514"/);
  assert.match(source, /"55000"/);
  assert.match(source, /generate_series\(1,150\)/);
  assert.match(source, /assert\.equal\(untouched\.count, "150"\)/);
  assert.match(source, /assert\.deepEqual\(await siblings\(value\), untouched/);
  assert.match(source, /committedDrift/);
  assert.match(source, /otherCustomer/);
});
test("success witnesses do not adopt accidental financial/header mutations", () => {
  assert.match(source, /saved\.slice\(0,\s*64\),\s*before\.slice\(0,\s*64\)/);
  assert.match(source, /saved\.slice\(0,\s*64\),\s*financialBefore/);
  assert.match(source, /assert\.equal\(await snapshot\(\), before, "ack is not outer commit"\)/);
  assert.match(source, /await owner\.command\("ROLLBACK;"\)/);
  assert.match(source, /for \(const target of \["item", "header"\]\)/);
  assert.match(source, /pg_trigger_depth\(\)=1/);
});
test("snapshot uses retained link primary key and actual SQL-model metadata without raw row output", async () => {
  assert.match(DRAFT_SNAPSHOT_SQL, /to_jsonb\(t\) ORDER BY t\.shop_vehicle_id/);
  assert.match(DRAFT_SNAPSHOT_SQL, /encode\(sha256\(convert_to/);
  for (const field of ["quantity", "total", "confidence", "odometer_km", "sort_order"])
    assert.ok(DRAFT_SNAPSHOT_SQL.includes(`.${field}::text`));
  await withDraftLineEditFixture(async (db) => {
    await db.exec(buildDraftLineNativeSource().candidateSQL);
    const first = Object.values((await db.query(DRAFT_SNAPSHOT_SQL)).rows[0])[0];
    assert.match(first, /^[0-9a-f]{64}$/);
    await db.exec(
      `INSERT INTO public.vehicle_receipt_items(id,receipt_id,description,category,quantity,total) VALUES('${value.item}','${ids.receipt}','Synthetic model','misc',1.0000000000000001,0.125000);`,
    );
    const second = Object.values((await db.query(DRAFT_SNAPSHOT_SQL)).rows[0])[0];
    assert.match(second, /^[0-9a-f]{64}$/);
    assert.notEqual(second, first);
  });
});
test("module import is inert even with all child process APIs disabled", () => {
  const code = `import cp from 'node:child_process';import{syncBuiltinESMExports}from'node:module';for(const k of['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])cp[k]=()=>{throw Error('UNEXPECTED CHILD')};syncBuiltinESMExports();await import(${JSON.stringify(moduleURL.href)});process.stdout.write('inert');`;
  const output = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    env: {
      PATH: process.env.PATH ?? "",
      SystemRoot: process.env.SystemRoot ?? "",
      GITHUB_ACTIONS: "false",
      DATABASE_URL: "UNUSED-PRIVATE-SENTINEL",
    },
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: 8192,
  });
  assert.equal(output.error, undefined);
  assert.equal(output.status, 0, output.stderr);
  assert.equal(output.stdout, "inert");
});
