import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import {
  install,
  call,
  draft,
  claims,
  ids,
  state,
  stockSql,
  setupStatements,
  boundary,
} from "./business-stock-fixture.mjs";
const opts = { timeout: 30000, concurrency: false };
async function fixture(run) {
  const db = new PGlite();
  try {
    await install(db);
    await run(db);
  } finally {
    await db.close();
  }
}
const op = (n) => `81000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const fail = (code) => (e) => {
  assert.equal(e.code, code);
  assert.equal(e.message, "Stock request could not be confirmed.");
  return true;
};
async function denied(db, r, c = claims(), role = "authenticated") {
  const before = await state(db);
  await assert.rejects(call(db, r, false, c, role), (e) => {
    assert.equal(e.code, "42501");
    return true;
  });
  assert.deepEqual(await state(db), before);
}
async function asUser(db, user, sql, params = []) {
  await db.exec("BEGIN; SET LOCAL ROLE authenticated");
  try {
    await db.query("SELECT set_config('request.jwt.claims',$1,true)", [
      JSON.stringify(claims(user)),
    ]);
    const result = await db.query(sql, params);
    await db.exec("COMMIT");
    return result;
  } catch (e) {
    await db.exec("ROLLBACK");
    throw e;
  }
}
test(
  "authenticated owner apply, duplicate replay, lookup and later stock preserve one result",
  opts,
  () =>
    fixture(async (db) => {
      const r = await draft(db);
      assert.equal((await call(db, r, true)).status, "not_observed");
      const first = await call(db, r);
      assert.equal(first.status, "completed");
      assert.equal(first.quantityBefore, "10.00");
      assert.equal(first.quantityAfter, "12.00");
      const committed = await state(db);
      assert.equal(committed["public.business_inventory_movements"].length, 1);
      for (let n = 0; n < 3; n++) {
        assert.deepEqual(await call(db, r), first);
        assert.deepEqual(await call(db, r, true), first);
        assert.deepEqual(await state(db), committed);
      }
      await call(db, await draft(db, { operationId: op(2), delta: "0.25" }));
      assert.deepEqual(await call(db, r), first);
      assert.equal(
        (
          await db.query(
            "SELECT qty_on_hand::text n FROM public.business_inventory_items WHERE id=$1",
            [ids.item],
          )
        ).rows[0].n,
        "12.25",
      );
    }),
);
test(
  "stale versions create an immutable rejected outcome; reusing intent never reapplies",
  opts,
  () =>
    fixture(async (db) => {
      const r = await draft(db);
      await db.query("UPDATE public.business_inventory_items SET qty_on_hand=15 WHERE id=$1", [
        ids.item,
      ]);
      const before = await state(db),
        result = await call(db, r);
      assert.equal(result.status, "rejected");
      assert.equal(result.code, "conflict");
      assert.deepEqual(
        (await state(db))["public.business_inventory_items"],
        before["public.business_inventory_items"],
      );
      assert.equal((await state(db))["public.business_inventory_movements"].length, 0);
      assert.deepEqual(await call(db, r), result);
      await assert.rejects(call(db, { ...r, reason: "Changed intent" }), fail("22023"));
      assert.equal((await call(db, await draft(db, { operationId: op(2) }))).status, "completed");
    }),
);
test(
  "combined inquiry and B2B reservations are protected without double-counting counters",
  opts,
  () =>
    fixture(async (db) => {
      await db.query(
        "UPDATE public.network_part_inquiries SET status='accepted',reserved_item_id=$1,reserved_quantity=1,reserved_until=now()+interval '1 day' WHERE id=$2",
        [ids.item, ids.inquiry],
      );
      const refused = await call(db, await draft(db, { delta: "-2.00" }));
      assert.equal(refused.code, "reserved_stock");
      const allowed = await call(db, await draft(db, { operationId: op(2), delta: "-1.00" }));
      assert.equal(allowed.status, "completed");
      assert.equal(allowed.quantityAfter, "9.00");
    }),
);
test(
  "only the owning business or active management can adjust, and roster escalation is blocked",
  opts,
  () =>
    fixture(async (db) => {
      const r = await draft(db);
      await denied(db, { ...r, businessId: ids.otherBusiness });
      await denied(db, { ...r, itemId: ids.otherItem });
      await denied(
        db,
        { ...r, expectedAccountId: ids.clerk },
        claims(ids.clerk, { user_metadata: { role: "manager", business_id: ids.business } }),
      );
      await assert.rejects(
        asUser(db, ids.clerk, "UPDATE public.business_staff SET role='manager' WHERE user_id=$1", [
          ids.clerk,
        ]),
        (e) => e.code === "42501",
      );
      const manager = await call(
        db,
        { ...r, expectedAccountId: ids.manager },
        false,
        claims(ids.manager),
      );
      assert.equal(manager.status, "completed");
      await asUser(
        db,
        ids.actor,
        "UPDATE public.business_staff SET active=false WHERE user_id=$1",
        [ids.manager],
      );
      await denied(db, { ...r, expectedAccountId: ids.manager }, claims(ids.manager));
    }),
);
test(
  "deleted, banned, anonymous, revoked, expired and wrong-subject sessions cannot write",
  opts,
  () =>
    fixture(async (db) => {
      const r = await draft(db);
      for (const c of [
        claims(ids.outsider),
        claims(ids.actor, { session_id: ids.otherSession }),
        claims(ids.actor, { exp: 0 }),
        claims(ids.actor, { session_id: null }),
        claims(ids.actor, { role: "service_role" }),
      ])
        await denied(db, r, c);
      for (const [field, value] of [
        ["deleted_at", "now()"],
        ["banned_until", "now()+interval '1 day'"],
        ["is_anonymous", "true"],
      ]) {
        await db.exec(`UPDATE auth.users SET ${field}=${value} WHERE id='${ids.actor}'`);
        await denied(db, r);
        await db.exec(
          `UPDATE auth.users SET ${field}=${field === "is_anonymous" ? "false" : "NULL"} WHERE id='${ids.actor}'`,
        );
      }
      await db.query("DELETE FROM auth.sessions WHERE id=$1", [ids.session]);
      await denied(db, r);
    }),
);
test("anonymous/service execution and direct outcome edits are denied", opts, () =>
  fixture(async (db) => {
    const r = await draft(db);
    await denied(db, r, claims(), "anon");
    await denied(db, r, claims(), "service_role");
    await call(db, r);
    for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"])
      assert.equal(
        (
          await db.query(
            "SELECT has_table_privilege('authenticated','business_stock_operations_v1.outcomes',$1) p",
            [privilege],
          )
        ).rows[0].p,
        false,
      );
    for (const sql of [
      "DELETE FROM business_stock_operations_v1.outcomes",
      "UPDATE business_stock_operations_v1.outcomes SET result='{}'",
      "TRUNCATE business_stock_operations_v1.outcomes",
    ])
      await assert.rejects(db.exec(sql), (e) => e.code === "42501");
    await assert.rejects(
      asUser(db, ids.actor, "SELECT * FROM auth.users"),
      (e) => e.code === "42501",
    );
  }),
);
test(
  "late or suppressed stock, movement and outcome writes roll back all three records",
  opts,
  () =>
    fixture(async (db) => {
      for (const [table, timing, event, body] of [
        ["public.business_inventory_items", "BEFORE", "UPDATE", "RETURN NULL;"],
        ["public.business_inventory_movements", "BEFORE", "INSERT", "RETURN NULL;"],
        ["business_stock_operations_v1.outcomes", "BEFORE", "INSERT", "RETURN NULL;"],
        [
          "business_stock_operations_v1.outcomes",
          "BEFORE",
          "INSERT",
          "RAISE EXCEPTION USING ERRCODE='23514';",
        ],
        [
          "business_stock_operations_v1.outcomes",
          "BEFORE",
          "INSERT",
          "NEW.request='{}'; RETURN NEW;",
        ],
      ]) {
        await db.exec(
          `CREATE OR REPLACE FUNCTION business_stock_operations_v1.fixture_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${body} END $$;CREATE TRIGGER fixture_fault ${timing} ${event} ON ${table} FOR EACH ROW EXECUTE FUNCTION business_stock_operations_v1.fixture_fault();`,
        );
        const before = await state(db);
        await assert.rejects(call(db, await draft(db)), (e) => ["55000", "23514"].includes(e.code));
        assert.deepEqual(await state(db), before);
        await db.exec(`DROP TRIGGER fixture_fault ON ${table};`);
      }
      assert.equal((await call(db, await draft(db))).status, "completed");
    }),
);
test("wrong decimal precision, shape, reason and special timestamp are never accepted", opts, () =>
  fixture(async (db) => {
    const r = await draft(db);
    for (const patch of [
      { version: 2 },
      { extra: true },
      { expectedQuantity: 10 },
      { delta: "0.001" },
      { delta: "0.00" },
      { delta: "NaN" },
      { expectedUpdatedAt: "infinity" },
      { reason: "" },
      { reason: "\nprivate" },
      { delta: "10000000000.00" },
    ]) {
      const before = await state(db);
      await assert.rejects(call(db, { ...r, ...patch }), (e) => e.code.startsWith("22"));
      assert.deepEqual(await state(db), before);
    }
  }),
);
test(
  "two independent business owners can reuse an operation UUID without crossing records",
  opts,
  () =>
    fixture(async (db) => {
      const first = await call(db, await draft(db));
      const second = await call(
        db,
        await draft(db, {
          expectedAccountId: ids.outsider,
          businessId: ids.otherBusiness,
          itemId: ids.otherItem,
          delta: "4.00",
        }),
        false,
        claims(ids.outsider),
      );
      assert.equal(second.quantityAfter, "14.00");
      assert.notEqual(first.movementId, second.movementId);
      assert.equal((await state(db))["business_stock_operations_v1.outcomes"].length, 2);
    }),
);
test("API installation refuses an unprotected staff roster", opts, async () => {
  const db = new PGlite();
  try {
    for (const statement of setupStatements) await db.exec(statement);
    await assert.rejects(db.exec(stockSql), /staff authority boundary/);
    await db.exec("ROLLBACK");
    assert.equal(
      (await db.query("SELECT to_regnamespace('business_stock_operations_v1') n")).rows[0].n,
      null,
    );
  } finally {
    await db.close();
  }
});

test(
  "combined forward release is a single transaction and does not alter historical migrations",
  opts,
  async () => {
    const { buildBusinessStockRelease } = await import("./build-business-stock-release.mjs");
    const db = new PGlite();
    try {
      for (const statement of setupStatements) await db.exec(statement);
      await db.exec(buildBusinessStockRelease());
      assert.equal((await call(db, await draft(db))).status, "completed");
    } finally {
      await db.close();
    }
  },
);

test(
  "unexpected default table grants abort publication without partial objects",
  opts,
  async () => {
    const db = new PGlite();
    try {
      for (const statement of setupStatements) await db.exec(statement);
      await db.exec(boundary);
      await db.exec(
        "CREATE ROLE unexpected_reader NOLOGIN; ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO unexpected_reader",
      );
      await assert.rejects(db.exec(stockSql), (error) => error.code === "55000");
      await db.exec("ROLLBACK");
      assert.equal(
        (await db.query("SELECT to_regnamespace('business_stock_operations_v1') n")).rows[0].n,
        null,
      );
      assert.equal(
        (
          await db.query(
            "SELECT to_regprocedure('public.business_stock_operation_v1(jsonb,boolean)') p",
          )
        ).rows[0].p,
        null,
      );
    } finally {
      await db.close();
    }
  },
);
