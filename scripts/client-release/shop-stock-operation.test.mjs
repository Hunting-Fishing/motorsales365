import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import {
  install,
  ids,
  request,
  claims,
  call,
  readItem,
  state,
  setupStatements,
  sql,
} from "./shop-stock-fixture.mjs";
const options = { concurrency: false, timeout: 30000 };
async function fixture(fn) {
  const db = new PGlite();
  try {
    await install(db);
    await fn(db);
  } finally {
    await db.close();
  }
}
async function deny(db, fn, code = "42501") {
  const before = await state(db);
  await assert.rejects(fn, (e) => {
    assert.equal(e.code, code);
    return true;
  });
  assert.deepEqual(await state(db), before);
}
const again = "81000000-0000-4000-8000-000000000002";
test(
  "owner reads one bound shop item, records integer adjustment, recovers without duplicate",
  options,
  () =>
    fixture(async (db) => {
      const view = await readItem(db);
      assert.equal(view.shopId, ids.shop);
      assert.equal(view.item.id, ids.nativeItem);
      assert.equal(view.canAdjust, true);
      assert.equal(view.costRestricted, false);
      assert.equal(view.item.supplier, "Private Supplier A");
      assert.deepEqual(view.transactions, []);
      const missing = await call(db, request(), true);
      assert.equal(missing.status, "not_observed");
      const result = await call(db);
      assert.equal(result.status, "completed");
      assert.equal(result.quantityBefore, "10");
      assert.equal(result.quantityAfter, "12");
      const after = await state(db);
      for (let i = 0; i < 3; i++) {
        assert.deepEqual(await call(db), result);
        assert.deepEqual(await call(db, request(), true), result);
        assert.deepEqual(await state(db), after);
      }
      const tx = (await readItem(db)).transactions;
      assert.equal(tx.length, 1);
      assert.equal(tx[0].transaction_type, "adjustment");
      assert.equal(tx[0].quantity, 2);
      assert.equal(tx[0].reference_id, ids.operation);
      assert.equal(
        (await db.query("SELECT performed_by FROM shop_manager.inventory_transactions")).rows[0]
          .performed_by,
        ids.actor,
      );
    }),
);
test("clerk can read without costs but cannot mutate; manager can mutate", options, () =>
  fixture(async (db) => {
    const v = await readItem(db, ids.clerk);
    assert.equal(v.canAdjust, false);
    assert.equal(v.costRestricted, true);
    for (const k of ["supplier", "cost_per_unit", "margin_markup"])
      assert.ok(!Object.hasOwn(v.item, k));
    await deny(db, () =>
      call(db, request({ expectedAccountId: ids.clerk }), false, claims(ids.clerk)),
    );
    assert.equal(
      (await call(db, request({ expectedAccountId: ids.manager }), false, claims(ids.manager)))
        .status,
      "completed",
    );
  }),
);
test("different shops keep the same SKU, quantities and operation UUID independent", options, () =>
  fixture(async (db) => {
    const a = await call(db);
    const b = await call(
      db,
      request({
        expectedAccountId: ids.outsider,
        shopId: ids.otherShop,
        itemId: ids.otherNativeItem,
        expectedQuantity: "20",
      }),
      false,
      claims(ids.outsider),
    );
    assert.equal(a.quantityAfter, "12");
    assert.equal(b.quantityAfter, "22");
    assert.notEqual(a.transactionId, b.transactionId);
    await deny(db, () => readItem(db, ids.actor, ids.otherNativeItem));
    await deny(db, () =>
      call(db, request({ shopId: ids.otherShop, itemId: ids.otherNativeItem, operationId: again })),
    );
    await deny(db, () => call(db, request({ itemId: ids.otherNativeItem, operationId: again })));
    await deny(db, () => readItem(db, ids.actor, ids.nativeItem, claims(ids.outsider)));
  }),
);
test(
  "anonymous, service, expired, missing, deleted and banned sessions cannot read or write",
  options,
  () =>
    fixture(async (db) => {
      for (const c of [
        claims(ids.actor, { role: "service_role" }),
        claims(ids.actor, { exp: 1 }),
        claims(ids.actor, { session_id: ids.otherSession }),
        claims(ids.actor, { session_id: undefined }),
      ]) {
        await deny(db, () => call(db, request(), false, c));
        await deny(db, () => readItem(db, ids.actor, ids.nativeItem, c));
      }
      for (const role of ["anon", "service_role"])
        await deny(db, () => call(db, request(), false, claims(), role));
      for (const field of [
        "is_anonymous=true",
        "deleted_at=now()",
        "banned_until=now()+interval '1 day'",
      ]) {
        await db.exec(`UPDATE auth.users SET ${field} WHERE id='${ids.actor}'`);
        await deny(db, () => call(db));
        await db.exec(
          `UPDATE auth.users SET is_anonymous=false,deleted_at=NULL,banned_until=NULL WHERE id='${ids.actor}'`,
        );
      }
      await db.exec(
        `UPDATE auth.sessions SET not_after=now()-interval '1 minute' WHERE id='${ids.session}'`,
      );
      await deny(db, () => call(db));
    }),
);
test(
  "stale quantity/version and reservation floor reject permanently without a stock log",
  options,
  () =>
    fixture(async (db) => {
      for (const patch of [
        { expectedQuantity: "9" },
        { expectedUpdatedAt: "2026-01-01T00:00:00.123457Z" },
      ]) {
        const r = request({ ...patch, operationId: crypto.randomUUID() });
        const v = await call(db, r);
        assert.equal(v.status, "rejected");
        assert.equal(v.code, "conflict");
        assert.deepEqual(await call(db, r), v);
      }
      await db.exec(
        `UPDATE shop_manager.inventory_items SET on_hold=8 WHERE id='${ids.nativeItem}'`,
      );
      const r = request({ delta: "-3" }),
        rejected = await call(db, r);
      assert.equal(rejected.code, "reserved_stock");
      assert.equal(
        (await call(db, request({ delta: "-2", operationId: again }))).quantityAfter,
        "8",
      );
      const rows = (await db.query("SELECT * FROM shop_manager.inventory_transactions")).rows;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].quantity, -2);
    }),
);
test(
  "zero-stock result is allowed while mismatched quantity aliases and overflow are refused",
  options,
  () =>
    fixture(async (db) => {
      assert.equal((await call(db, request({ delta: "-10" }))).quantityAfter, "0");
      await db.exec(
        `UPDATE shop_manager.inventory_items SET quantity=10,quantity_in_stock=9,updated_at='2026-01-01T00:00:00.123456Z' WHERE id='${ids.nativeItem}'`,
      );
      assert.equal((await call(db, request({ operationId: again }))).code, "invalid_stock");
      await db.exec(
        `UPDATE shop_manager.inventory_items SET quantity=2147483647,quantity_in_stock=2147483647 WHERE id='${ids.nativeItem}'`,
      );
      assert.equal(
        (
          await call(
            db,
            request({ expectedQuantity: "2147483647", operationId: crypto.randomUUID() }),
          )
        ).code,
        "invalid_stock",
      );
    }),
);
test(
  "same operation refuses changed intent; revoked membership denies outcome recovery",
  options,
  () =>
    fixture(async (db) => {
      const r = request({ expectedAccountId: ids.manager });
      await call(db, r, false, claims(ids.manager));
      for (const p of [{ delta: "3" }, { reason: "Other reason" }, { expectedQuantity: "12" }])
        await deny(db, () => call(db, { ...r, ...p }, false, claims(ids.manager)), "22023");
      // Authorized owner deactivates existing staff through the actual boundary.
      await db.exec(
        `BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claims','${JSON.stringify(claims())}',true); UPDATE public.business_staff SET active=false WHERE business_id='${ids.business}' AND user_id='${ids.manager}'; COMMIT;`,
      );
      await deny(db, () => call(db, r, true, claims(ids.manager)));
    }),
);
test(
  "late transaction and ledger failure roll back quantities, audit and outcome together",
  options,
  () =>
    fixture(async (db) => {
      await db.exec(`CREATE FUNCTION shop_stock_operations_v1.fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION USING ERRCODE='23514'; END $$;
 REVOKE ALL ON FUNCTION shop_stock_operations_v1.fault() FROM PUBLIC,anon,authenticated,service_role;
 CREATE TRIGGER fault BEFORE INSERT ON shop_manager.inventory_transactions FOR EACH ROW EXECUTE FUNCTION shop_stock_operations_v1.fault();`);
      await deny(db, () => call(db), "23514");
      await db.exec("DROP TRIGGER fault ON shop_manager.inventory_transactions");
      await db.exec(
        "CREATE TRIGGER fault BEFORE INSERT ON shop_stock_operations_v1.outcomes FOR EACH ROW EXECUTE FUNCTION shop_stock_operations_v1.fault()",
      );
      await deny(db, () => call(db), "23514");
      await db.exec("DROP TRIGGER fault ON shop_stock_operations_v1.outcomes");
      assert.equal((await call(db)).status, "completed");
    }),
);
test("suppressed and rewritten audit acknowledgments cannot produce success", options, () =>
  fixture(async (db) => {
    await db.exec(`CREATE FUNCTION shop_stock_operations_v1.fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
 REVOKE ALL ON FUNCTION shop_stock_operations_v1.fault() FROM PUBLIC,anon,authenticated,service_role;
 CREATE TRIGGER fault BEFORE INSERT ON shop_manager.inventory_transactions FOR EACH ROW EXECUTE FUNCTION shop_stock_operations_v1.fault();`);
    await deny(db, () => call(db), "55000");
    await db.exec(
      `CREATE OR REPLACE FUNCTION shop_stock_operations_v1.fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.inventory_item_id='${ids.otherNativeItem}';RETURN NEW; END $$;`,
    );
    await deny(db, () => call(db), "55000");
  }),
);
test("outcomes are immutable and transaction evidence is rechecked during recovery", options, () =>
  fixture(async (db) => {
    const result = await call(db);
    for (const q of [
      "UPDATE shop_stock_operations_v1.outcomes SET result='{}'",
      "DELETE FROM shop_stock_operations_v1.outcomes",
      "TRUNCATE shop_stock_operations_v1.outcomes",
    ])
      await deny(db, () => db.exec(q));
    await db.query(
      "UPDATE shop_manager.inventory_transactions SET notes='synthetic corruption' WHERE id=$1",
      [result.transactionId],
    );
    await deny(db, () => call(db, request(), true), "55000");
    for (const role of ["anon", "authenticated", "service_role"]) {
      const v = (
        await db.query(
          "SELECT has_table_privilege($1,'shop_stock_operations_v1.outcomes','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') ok",
          [role],
        )
      ).rows[0];
      assert.equal(v.ok, false);
    }
  }),
);
test(
  "native stock_in/out labels reproduce the old CHECK failure, without relaxing it",
  options,
  () =>
    fixture(async (db) => {
      for (const type of ["stock_in", "stock_out"])
        await assert.rejects(
          db.query(
            "INSERT INTO shop_manager.inventory_transactions(inventory_item_id,transaction_type,quantity) VALUES($1,$2,1)",
            [ids.nativeItem, type],
          ),
          (e) => e.code === "23514",
        );
      assert.equal((await call(db)).status, "completed");
    }),
);
test(
  "outer rollback and missing staff prerequisites cannot leave partial publication or data",
  options,
  async () => {
    await fixture(async (db) => {
      const before = await state(db);
      await db.exec(`BEGIN; SET LOCAL ROLE authenticated;`);
      await db.query("SELECT set_config('request.jwt.claims',$1,true)", [JSON.stringify(claims())]);
      assert.equal(
        (
          await db.query("SELECT public.shop_stock_operation_v1($1,false) result", [
            JSON.stringify(request()),
          ])
        ).rows[0].result.status,
        "completed",
      );
      await db.exec("ROLLBACK");
      assert.deepEqual(await state(db), before);
    });
    const db = new PGlite();
    try {
      for (const s of setupStatements) await db.exec(s);
      await assert.rejects(db.exec(sql), (e) => e.code === "55000");
      await db.exec("ROLLBACK");
      assert.equal(
        (await db.query("SELECT to_regnamespace('shop_stock_operations_v1') n")).rows[0].n,
        null,
      );
    } finally {
      await db.close();
    }
  },
);

test(
  "selected-shop and shift audit witnesses cannot substitute for business authority",
  options,
  () =>
    fixture(async (db) => {
      // Actual owner of A is also legitimate manager of B. Read B is authorized,
      // but a fresh adjustment must not use the audit writer's A selection.
      await db.exec("BEGIN; SET LOCAL ROLE authenticated;");
      await db.query("SELECT set_config('request.jwt.claims',$1,true)", [
        JSON.stringify(claims(ids.outsider)),
      ]);
      await db.query(
        "INSERT INTO public.business_staff(business_id,user_id,role,invited_by) VALUES($1,$2,'manager',$3)",
        [ids.otherBusiness, ids.actor, ids.outsider],
      );
      await db.exec("COMMIT");
      const foreign = request({
        shopId: ids.otherShop,
        itemId: ids.otherNativeItem,
        expectedQuantity: "20",
      });
      const view = await readItem(db, ids.actor, ids.otherNativeItem);
      assert.equal(view.canAdjust, false);
      assert.equal(view.costRestricted, false);
      await deny(db, () => call(db, foreign));
      await db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2", [
        ids.otherShop,
        ids.actor,
      ]);
      const recorded = await call(db, foreign);
      const event = (
        await db.query(
          "SELECT * FROM shop_manager.employee_operational_events WHERE entity_id=$1",
          [recorded.transactionId],
        )
      ).rows[0];
      assert.equal(event.shop_id, ids.otherShop);
      assert.equal(event.profile_id, ids.actor);
      assert.equal(event.actor_user_id, ids.actor);
      assert.equal(event.shift_id, null);
      assert.equal(Number(event.quantity), 2);
      // Later switching does not prevent recovery or re-post the already recorded event.
      await db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2", [
        ids.shop,
        ids.actor,
      ]);
      assert.deepEqual(await call(db, foreign, true), recorded);
      assert.deepEqual(await call(db, foreign), recorded);
      assert.equal(
        (await db.query("SELECT count(*)::integer n FROM shop_manager.employee_operational_events"))
          .rows[0].n,
        1,
      );
      // A different employee cannot gain B authority by choosing B in their profile.
      await db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2", [
        ids.otherShop,
        ids.manager,
      ]);
      await deny(db, () =>
        call(db, { ...foreign, expectedAccountId: ids.manager }, false, claims(ids.manager)),
      );
    }),
);

test(
  "actual audit trigger binds an active shift; ambiguous or foreign shifts fail without posting",
  options,
  () =>
    fixture(async (db) => {
      const shift = "91000000-0000-4000-8000-000000000001";
      await db.query(
        "INSERT INTO shop_manager.employee_shifts(id,shop_id,profile_id,user_id) VALUES($1,$2,$3,$3)",
        [shift, ids.otherShop, ids.actor],
      );
      await deny(db, () => call(db));
      await db.query("UPDATE shop_manager.employee_shifts SET shop_id=$1 WHERE id=$2", [
        ids.shop,
        shift,
      ]);
      const result = await call(db);
      const event = (
        await db.query(
          "SELECT * FROM shop_manager.employee_operational_events WHERE entity_id=$1",
          [result.transactionId],
        )
      ).rows[0];
      assert.equal(event.shift_id, shift);
      assert.equal(event.shop_id, ids.shop);
      assert.equal(event.action, "insert_inventory_transactions");
      assert.equal(event.event_category, "inventory");
      assert.deepEqual(event.metadata, {
        transaction_type: "adjustment",
        reference_type: "manual_adjustment",
        reference_id: ids.operation,
      });
      // A second matching profile is an ambiguity, not a selection fallback.
      await db.query(
        "INSERT INTO shop_manager.profiles(id,user_id,shop_id,email) VALUES($1,$2,$3,'ambiguous@example.invalid')",
        [again, ids.actor, ids.shop],
      );
      assert.equal((await readItem(db)).canAdjust, false);
      await deny(db, () => call(db, request({ operationId: again })));
    }),
);

test("suppressed or wrong-shop operational audit events roll back stock and history", options, () =>
  fixture(async (db) => {
    await db.exec(`CREATE FUNCTION shop_stock_operations_v1.audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
      REVOKE ALL ON FUNCTION shop_stock_operations_v1.audit_fault() FROM PUBLIC,anon,authenticated,service_role;
      CREATE TRIGGER fault BEFORE INSERT ON shop_manager.employee_operational_events FOR EACH ROW EXECUTE FUNCTION shop_stock_operations_v1.audit_fault();`);
    await deny(db, () => call(db), "55000");
    await db.exec(
      `CREATE OR REPLACE FUNCTION shop_stock_operations_v1.audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.shop_id='${ids.otherShop}';RETURN NEW; END $$;`,
    );
    await deny(db, () => call(db), "55000");
    await db.exec("DROP TRIGGER fault ON shop_manager.employee_operational_events");
    const result = await call(db);
    await db.query(
      "UPDATE shop_manager.employee_operational_events SET shop_id=$1 WHERE entity_id=$2",
      [ids.otherShop, result.transactionId],
    );
    await deny(db, () => call(db, request(), true), "55000");
  }),
);

test(
  "installation refuses a missing or replaced employee audit without partial publication",
  options,
  async () => {
    for (const patch of [
      "DROP TRIGGER employee_operation_audit ON shop_manager.inventory_transactions",
      "CREATE OR REPLACE FUNCTION shop_manager.current_employee_profile() RETURNS shop_manager.profiles LANGUAGE sql STABLE SECURITY DEFINER SET search_path=shop_manager,public,pg_temp AS $$ SELECT p FROM shop_manager.profiles p LIMIT 1 $$",
    ]) {
      const db = new PGlite();
      try {
        for (const s of setupStatements) await db.exec(s);
        const { boundary } = await import("./shop-stock-fixture.mjs");
        await db.exec(boundary);
        await db.exec(patch);
        await assert.rejects(db.exec(sql), (e) => e.code === "55000");
        await db.exec("ROLLBACK");
        assert.equal(
          (await db.query("SELECT to_regnamespace('shop_stock_operations_v1') n")).rows[0].n,
          null,
        );
      } finally {
        await db.close();
      }
    }
  },
);
