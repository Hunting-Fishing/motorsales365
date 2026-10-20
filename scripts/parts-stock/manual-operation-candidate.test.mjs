// Real SQL on selected retained tables in disposable PGlite. Positive authority
// is synthetic owner/test.user, NOT a hosted JWT/session/staff or HTTP test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { buildMixedReservationOrderSource } from "./mixed-reservation-order-source.mjs";
import { actor, snapshot } from "./mixed-reservation-fixture.mjs";

const source = buildMixedReservationOrderSource();
const { ids } = source;
const read = (name) =>
  readFileSync(new URL(name, import.meta.url), "utf8").replaceAll("\r\n", "\n");
const base = read("./manual-adjustment-candidate.sql");
assert.equal(
  createHash("sha256").update(base).digest("hex"),
  "6b2899e15dc75ecffe943760604651aca9c63c22f4a7bc1bd4ca94bc8274b250",
);
const sql = read("./manual-operation-candidate.sql");
const schema = "manual_stock_operations_candidate";
const operation = "81000000-0000-4000-8000-000000000201";
const secondOperation = "81000000-0000-4000-8000-000000000202";
const item = "31000000-0000-4000-8000-000000000201";
const options = { timeout: 30000, concurrency: false };
const defaults = {
  account: ids.actor,
  business: ids.business,
  item,
  operation,
  expected: "10",
  delta: "2",
  reason: "Cycle count",
};
const parameters = (overrides = {}) => {
  const v = { ...defaults, ...overrides };
  return [v.account, v.business, v.item, v.operation, v.expected, v.delta, v.reason];
};
const applySql = `SELECT ${schema}.apply($1,$2,$3,$4,$5::numeric,$6::numeric,$7) result`;
async function apply(db, overrides = {}, subject = ids.actor) {
  return (await actor(db, applySql, parameters(overrides), subject)).rows[0].result;
}
async function inspect(
  db,
  { account = ids.actor, business = ids.business, op = operation, subject = account } = {},
) {
  return (
    await actor(db, `SELECT ${schema}.inspect($1,$2,$3) result`, [account, business, op], subject)
  ).rows[0].result;
}
async function state(db) {
  return {
    stock: await snapshot(db),
    events: (await db.query("SELECT to_jsonb(t) row FROM public.parts_order_events t ORDER BY id"))
      .rows,
    operations: (
      await db.query(
        `SELECT to_jsonb(t) row FROM ${schema}.outcomes t ORDER BY account_id,operation_id`,
      )
    ).rows,
  };
}
async function rejected(db, action, code) {
  const before = await state(db);
  await assert.rejects(action, (error) => {
    assert.equal(error.code, code);
    assert.equal(error.message, "Stock operation failed.");
    assert.ok(!error.detail && !error.hint);
    return true;
  });
  assert.deepEqual(await state(db), before);
}
async function fixture(run, install = true) {
  const db = new PGlite();
  try {
    for (const statement of source.setupStatements) await db.exec(statement);
    await db.exec(source.candidateSQL);
    await db.exec(base);
    await db.query(
      "INSERT INTO public.business_inventory_items(id,business_id,name,qty_on_hand,updated_at) VALUES($1,$2,'Synthetic operation item',10,'2001-01-01')",
      [item, ids.business],
    );
    if (install) await db.exec(sql);
    await run(db);
  } finally {
    await db.close();
  }
}
async function hand(db, id = item) {
  return (
    await db.query("SELECT qty_on_hand::text n FROM public.business_inventory_items WHERE id=$1", [
      id,
    ])
  ).rows[0].n;
}
async function movements(db) {
  return (
    await db.query(
      "SELECT id,item_id,business_id,delta::text,reason,actor_id,created_at::text FROM public.business_inventory_movements ORDER BY id",
    )
  ).rows;
}

// Replaying the same request returns its original outcome even when later
// operations have changed current stock. It never pretends that old stock is live.
test("commit, lost-reply recovery and identical replay create exactly one movement", options, () =>
  fixture(async (db) => {
    assert.deepEqual(await inspect(db), {
      version: 1,
      status: "not_observed",
      operationId: operation,
    });
    const first = await apply(db);
    assert.equal(first.version, 1);
    assert.equal(first.status, "completed");
    assert.equal(first.operationId, operation);
    assert.equal(first.result.accountId, ids.actor);
    assert.equal(first.result.businessId, ids.business);
    assert.equal(first.result.itemId, item);
    assert.equal(first.result.quantityBefore, "10.00");
    assert.equal(first.result.quantityAfter, "12.00");
    assert.equal(first.result.delta, "2.00");
    assert.equal(await hand(db), "12.00");
    assert.equal((await movements(db)).length, 1);
    const committed = await state(db);
    for (let i = 0; i < 3; i++) {
      assert.deepEqual(await apply(db), first);
      assert.deepEqual(await inspect(db), first);
      assert.deepEqual(await state(db), committed);
    }
    await apply(db, { operation: secondOperation, expected: "12", delta: "3" });
    const later = await state(db);
    assert.deepEqual(await apply(db), first);
    assert.equal(await hand(db), "15.00");
    assert.equal((await movements(db)).length, 2);
    assert.deepEqual(await state(db), later);
  }),
);

test("same operation identity rejects changed intent without posting again", options, () =>
  fixture(async (db) => {
    await apply(db);
    for (const overrides of [
      { expected: "12" },
      { delta: "1" },
      { reason: "Different reason" },
      { reason: null },
      { reason: "" },
      { item: ids.item },
    ])
      await rejected(db, () => apply(db, overrides), "22023");
    // This is explicitly a synthetic owner reassignment, not a live business edit.
    await db.query("UPDATE public.businesses SET owner_id=$1 WHERE id=$2", [
      ids.actor,
      ids.otherBusiness,
    ]);
    await rejected(db, () => apply(db, { business: ids.otherBusiness }), "22023");
  }),
);

test("different accounts may reuse a UUID without sharing outcomes or quantities", options, () =>
  fixture(async (db) => {
    const a = await apply(db);
    const b = await apply(
      db,
      { account: ids.outsider, business: ids.otherBusiness, item: ids.otherItem, delta: "4" },
      ids.outsider,
    );
    assert.equal(b.result.quantityAfter, "14.00");
    assert.notEqual(a.result.movementId, b.result.movementId);
    assert.equal(await hand(db), "12.00");
    assert.equal(await hand(db, ids.otherItem), "14.00");
    assert.deepEqual(await inspect(db), a);
    assert.deepEqual(await inspect(db, { account: ids.outsider, business: ids.otherBusiness }), b);
    await rejected(
      db,
      () => inspect(db, { account: ids.actor, business: ids.business, subject: ids.outsider }),
      "42501",
    );
    await rejected(db, () => apply(db, { business: ids.otherBusiness }), "42501");
    await rejected(
      db,
      () => apply(db, { item: ids.otherItem, operation: secondOperation, expected: "14" }),
      "42501",
    );
  }),
);

test("revoked synthetic authority denies replay and outcome lookup", options, () =>
  fixture(async (db) => {
    await apply(db);
    await db.query("UPDATE public.businesses SET owner_id=$1 WHERE id=$2", [
      ids.outsider,
      ids.business,
    ]);
    await rejected(db, () => apply(db), "42501");
    await rejected(db, () => inspect(db), "42501");
  }),
);

test(
  "exact decimals normalize equivalent numbers but never round unsupported precision",
  options,
  () =>
    fixture(async (db) => {
      const first = await apply(db, { delta: "0.25" });
      assert.equal(first.result.quantityAfter, "10.25");
      assert.deepEqual(await apply(db, { expected: "1e1", delta: "0.2500" }), first);
      for (const overrides of [
        { expected: null },
        { delta: null },
        { expected: "NaN" },
        { delta: "Infinity" },
        { delta: "-Infinity" },
        { expected: "10.001" },
        { delta: "0.001" },
        { delta: "0" },
        { delta: "-11" },
        { expected: "10000000000" },
        { delta: "9999999999.99" },
        { reason: "x".repeat(2001) },
        { item: null },
      ])
        await rejected(db, () => apply(db, { ...overrides, operation: secondOperation }), "22023");
    }),
);

test("stale compare-and-set and reserved stock rejection leave no operation record", options, () =>
  fixture(async (db) => {
    await rejected(db, () => apply(db, { expected: "9" }), "40001");
    await rejected(db, () => apply(db, { item: ids.item, delta: "-3" }), "22023");
    assert.deepEqual(await inspect(db), {
      version: 1,
      status: "not_observed",
      operationId: operation,
    });
    const allowed = await apply(db, { item: ids.item, delta: "-2" });
    assert.equal(allowed.result.quantityAfter, "8.00");
    assert.equal(allowed.result.orderHolds, "8.00");
    assert.equal(allowed.result.availableAfter, "0.00");
  }),
);

test("outer rollback removes stock, movement and outcome together", options, () =>
  fixture(async (db) => {
    const before = await state(db);
    await db.exec("BEGIN");
    await db.query("SELECT set_config('test.user',$1,true)", [ids.actor]);
    const tentative = (await db.query(applySql, parameters())).rows[0].result;
    assert.equal(tentative.result.quantityAfter, "12.00");
    assert.equal(await hand(db), "12.00");
    await db.exec("ROLLBACK");
    assert.deepEqual(await state(db), before);
    const next = await apply(db);
    assert.equal(next.result.quantityAfter, "12.00");
    assert.equal((await movements(db)).length, 1);
  }),
);

test("late ledger insertion fault rolls back an already executed quantity change", options, () =>
  fixture(async (db) => {
    await db.exec(`CREATE FUNCTION ${schema}.fault() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF (SELECT qty_on_hand FROM public.business_inventory_items WHERE id=NEW.item_id) <> 12 THEN
        RAISE EXCEPTION 'Invalid fault setup';
      END IF;
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Synthetic late ledger failure';
    END $$;
    REVOKE ALL ON FUNCTION ${schema}.fault() FROM PUBLIC,anon,authenticated,service_role;
    CREATE TRIGGER fault BEFORE INSERT ON ${schema}.outcomes FOR EACH ROW EXECUTE FUNCTION ${schema}.fault();`);
    await rejected(db, () => apply(db), "23514");
    assert.equal(await hand(db), "10.00");
    assert.equal((await movements(db)).length, 0);
    await db.exec(`DROP TRIGGER fault ON ${schema}.outcomes`);
    assert.equal((await apply(db)).result.quantityAfter, "12.00");
  }),
);

test("suppressed and retargeted ledger inserts cannot acknowledge partial writes", options, () =>
  fixture(async (db) => {
    await db.exec(`CREATE FUNCTION ${schema}.fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
    REVOKE ALL ON FUNCTION ${schema}.fault() FROM PUBLIC,anon,authenticated,service_role;
    CREATE TRIGGER fault BEFORE INSERT ON ${schema}.outcomes FOR EACH ROW EXECUTE FUNCTION ${schema}.fault();`);
    await rejected(db, () => apply(db), "55000");
    await db.exec(
      `CREATE OR REPLACE FUNCTION ${schema}.fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.request='{}'::jsonb; RETURN NEW; END $$;`,
    );
    await rejected(db, () => apply(db), "55000");
    await db.exec(
      `CREATE OR REPLACE FUNCTION ${schema}.fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.movement_id='99999999-0000-4000-8000-000000000001'; RETURN NEW; END $$;`,
    );
    await rejected(db, () => apply(db), "23503");
  }),
);

test(
  "immutable outcomes reject update, delete and truncate and retain referenced stock history",
  options,
  () =>
    fixture(async (db) => {
      await apply(db);
      const before = await state(db);
      for (const command of [
        `UPDATE ${schema}.outcomes SET request='{}'`,
        `DELETE FROM ${schema}.outcomes`,
        `TRUNCATE ${schema}.outcomes`,
      ]) {
        await assert.rejects(db.exec(command), (error) => error.code === "42501");
        assert.deepEqual(await state(db), before);
      }
      await assert.rejects(
        db.query("DELETE FROM public.business_inventory_items WHERE id=$1", [item]),
        (error) => error.code === "23503",
      );
      assert.deepEqual(await state(db), before);
    }),
);

test(
  "recovery refuses changed movement evidence instead of returning a false success",
  options,
  () =>
    fixture(async (db) => {
      const first = await apply(db);
      await db.query(
        "UPDATE public.business_inventory_movements SET reason='corrupted by synthetic owner' WHERE id=$1",
        [first.result.movementId],
      );
      await rejected(db, () => inspect(db), "55000");
      await rejected(db, () => apply(db), "55000");
    }),
);

test(
  "ordinary and service roles receive no candidate execution, table or schema access",
  options,
  () =>
    fixture(async (db) => {
      for (const role of ["anon", "authenticated", "service_role"]) {
        const rights = (
          await db.query(
            `SELECT has_schema_privilege($1,$2,'USAGE') usage,
      has_table_privilege($1,'${schema}.outcomes','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') table_access,
      has_function_privilege($1,'${schema}.apply(uuid,uuid,uuid,uuid,numeric,numeric,text)','EXECUTE') execute`,
            [role, schema],
          )
        ).rows[0];
        assert.deepEqual(rights, { usage: false, table_access: false, execute: false });
        await db.exec(`SET ROLE ${role}`);
        try {
          await assert.rejects(db.query(applySql, parameters()), (error) => error.code === "42501");
        } finally {
          await db.exec("RESET ROLE");
        }
      }
      const row = (
        await db.query(
          `SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='${schema}.outcomes'::regclass`,
        )
      ).rows[0];
      assert.deepEqual(row, { relrowsecurity: true, relforcerowsecurity: true });
    }),
);

test("unexpected default grants reject installation transactionally", options, () =>
  fixture(async (db) => {
    await db.exec(
      "CREATE ROLE unexpected NOLOGIN; ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO unexpected;",
    );
    await assert.rejects(db.exec(sql), (error) => error.code === "55000");
    await db.exec("ROLLBACK");
    assert.equal(
      (await db.query("SELECT to_regnamespace($1)::text name", [schema])).rows[0].name,
      null,
    );
    assert.equal(await hand(db), "10.00");
  }, false),
);

test("committed outcome survives a local database close and reopen", options, async () => {
  const directory = mkdtempSync(join(tmpdir(), "365-stock-outcome-"));
  let db;
  try {
    db = new PGlite(directory);
    for (const statement of source.setupStatements) await db.exec(statement);
    await db.exec(source.candidateSQL);
    await db.exec(base);
    await db.query(
      "INSERT INTO public.business_inventory_items(id,business_id,name,qty_on_hand) VALUES($1,$2,'Synthetic persisted item',10)",
      [item, ids.business],
    );
    await db.exec(sql);
    const original = await apply(db);
    const committed = await state(db);
    await db.close();
    db = new PGlite(directory);
    assert.deepEqual(await inspect(db), original);
    assert.deepEqual(await apply(db), original);
    assert.equal(await hand(db), "12.00");
    assert.equal((await movements(db)).length, 1);
    assert.deepEqual(await state(db), committed);
  } finally {
    if (db && !db.closed) await db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
