import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import {
  install,
  ids,
  claims,
  asUser,
  request,
  readQuote,
  call,
  state,
} from "./quote-workflow-fixture.mjs";
const options = { timeout: 30000, concurrency: false };
async function fixture(fn) {
  const db = new PGlite();
  try {
    await install(db);
    await fn(db);
  } finally {
    await db.close();
  }
}
const freshOp = (n) => `82000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function denied(db, fn, code = "42501") {
  const before = await state(db);
  await assert.rejects(fn, (e) => {
    assert.equal(e.code, code);
    return true;
  });
  assert.deepEqual(await state(db), before);
}

test(
  "approved quote converts all lines into one correctly bound work order; exact retry and recovery do not duplicate",
  options,
  () =>
    fixture(async (db) => {
      const view = await readQuote(db);
      assert.equal(view.total, "392.00");
      assert.equal(view.items.length, 2);
      assert.equal(view.issue, null);
      const r = request(view);
      assert.equal((await call(db, r, true)).status, "not_observed");
      const result = await call(db, r);
      assert.equal(result.status, "completed");
      assert.equal(result.quoteStatus, "converted");
      const s = await state(db);
      assert.equal(s["shop_manager.work_orders"].length, 1);
      assert.equal(s["shop_manager.work_order_parts"].length, 1);
      assert.equal(s["shop_manager.work_order_job_lines"].length, 1);
      assert.equal(s["shop_manager.employee_operational_events"].length, 1);
      const wo = s["shop_manager.work_orders"][0].row;
      assert.equal(wo.shop_id, ids.shop);
      assert.equal(wo.customer_id, ids.customer);
      assert.equal(wo.vehicle_id, ids.vehicle);
      assert.equal(wo.total_cost, 350);
      assert.equal(wo.authorization_limit, 392);
      assert.equal(wo.description, "Approved repair");
      assert.match(wo.work_order_number, /^WO-/);
      const part = s["shop_manager.work_order_parts"][0].row;
      assert.equal(part.part_type, "non-inventory");
      assert.equal(part.quantity, 2);
      assert.equal(part.customer_price, 100);
      assert.equal(part.inventory_item_id, null);
      assert.equal(part.is_stock_item, false);
      const job = s["shop_manager.work_order_job_lines"][0].row;
      assert.equal(job.estimated_hours, 1.5);
      assert.equal(job.total_amount, 150);
      assert.equal(job.labor_rate, 100);
      for (let i = 0; i < 3; i++) {
        assert.deepEqual(await call(db, r), result);
        assert.deepEqual(await call(db, r, true), result);
        assert.deepEqual(await state(db), s);
      }
      assert.equal(
        (
          await db.query("SELECT quantity FROM shop_manager.inventory_items WHERE id=$1", [
            ids.nativeItem,
          ])
        ).rows[0].quantity,
        10,
        "quote conversion does not consume unallocated stock",
      );
    }),
);

test("draft approval and conversion are separate recorded actions with fresh review", options, () =>
  fixture(async (db) => {
    await db.query("UPDATE shop_manager.quotes SET status='draft',approved_at=NULL WHERE id=$1", [
      ids.quote,
    ]);
    const r = request(await readQuote(db), {
      action: "approve",
      reason: "Customer approved by telephone",
    });
    const approved = await call(db, r);
    assert.equal(approved.status, "completed");
    assert.equal(approved.quoteStatus, "approved");
    assert.equal(approved.workOrderId, null);
    assert.equal((await state(db))["shop_manager.work_orders"].length, 0);
    const current = await readQuote(db);
    assert.notEqual(current.fingerprint, r.expectedFingerprint);
    const converted = await call(db, request(current, { operationId: freshOp(1) }));
    assert.equal(converted.status, "completed");
    assert.equal(converted.quoteStatus, "converted");
    assert.deepEqual(
      await call(db, r),
      approved,
      "approval replay is historical, not another status change",
    );
    assert.equal((await readQuote(db)).quoteStatus, "converted");
  }),
);

test(
  "wrong business, spoofed actor, non-management and non-authenticated roles cannot read or convert",
  options,
  () =>
    fixture(async (db) => {
      const r = request(await readQuote(db));
      for (const actor of [ids.outsider, ids.clerk]) {
        await denied(db, () => readQuote(db, actor));
        await denied(db, () => call(db, { ...r, expectedAccountId: actor }, false, claims(actor)));
      }
      await denied(db, () => call(db, r, false, claims(ids.outsider)));
      await denied(db, () => call(db, { ...r, shopId: ids.otherShop }));
      for (const role of ["anon", "service_role"]) {
        await denied(db, () => readQuote(db, ids.actor, ids.quote, claims(), role));
        await denied(db, () => call(db, r, false, claims(), role));
      }
      const managerView = await readQuote(db, ids.manager);
      assert.equal(managerView.shopId, ids.shop);
      assert.equal(managerView.accountId, ids.manager);
    }),
);

test(
  "expired, revoked, anonymous, banned or deleted identities are denied without outcome writes",
  options,
  () =>
    fixture(async (db) => {
      const r = request(await readQuote(db));
      await denied(db, () => call(db, r, false, claims(ids.actor, { exp: 1 })));
      await denied(db, () => call(db, r, false, claims(ids.actor, { session_id: freshOp(9) })));
      for (const change of [
        "banned_until=now()+interval '1 day'",
        "deleted_at=now()",
        "is_anonymous=true",
      ]) {
        await db.exec(`UPDATE auth.users SET ${change} WHERE id='${ids.actor}'`);
        await denied(db, () => call(db, r));
        await db.exec(
          `UPDATE auth.users SET banned_until=NULL,deleted_at=NULL,is_anonymous=false WHERE id='${ids.actor}'`,
        );
      }
      await db.exec(
        `UPDATE auth.sessions SET not_after=now()-interval '1 second' WHERE id='${ids.session}'`,
      );
      await denied(db, () => call(db, r));
    }),
);

test(
  "unchanged header timestamp does not hide a changed quote line, profile, or customer relationship",
  options,
  () =>
    fixture(async (db) => {
      const r = request(await readQuote(db));
      await db.query("UPDATE shop_manager.quote_items SET name=$1 WHERE id=$2", [
        "Changed part",
        ids.part,
      ]);
      const out = await call(db, r);
      assert.equal(out.status, "rejected");
      assert.equal(out.reason, "stale_quote");
      assert.deepEqual(await call(db, r), out);
      const r2 = request(await readQuote(db), { operationId: freshOp(2) });
      await db.query("UPDATE shop_manager.profiles SET updated_at=now() WHERE id=$1", [ids.actor]);
      assert.equal((await call(db, r2)).reason, "stale_quote");
      const r3 = request(await readQuote(db), { operationId: freshOp(3) });
      await db.query("UPDATE shop_manager.vehicles SET customer_id=$1 WHERE id=$2", [
        ids.otherCustomer,
        ids.vehicle,
      ]);
      await denied(db, () => call(db, r3));
      assert.equal((await state(db))["shop_manager.work_orders"].length, 0);
    }),
);

test("same ID with changed action, reason, shop or source cannot be reused", options, () =>
  fixture(async (db) => {
    const r = request(await readQuote(db));
    await call(db, r);
    for (const patch of [
      { reason: "New reason" },
      { action: "approve" },
      { expectedFingerprint: "a".repeat(64) },
      { quoteId: freshOp(4) },
    ])
      await denied(db, () => call(db, { ...r, ...patch }), "22023");
    await denied(db, () => call(db, { ...r, shopId: ids.otherShop }));
  }),
);

test(
  "fractional parts, broken prices, empty quotes, expiry and wrong status reject without partial conversion",
  options,
  () =>
    fixture(async (db) => {
      const cases = [
        [
          "UPDATE shop_manager.quote_items SET quantity=1.5,total_price=150 WHERE item_type='part'; UPDATE shop_manager.quotes SET subtotal=300,tax_amount=36,total_amount=336",
          "fractional_part_quantity",
        ],
        [
          "UPDATE shop_manager.quote_items SET quantity=2,total_price=200 WHERE item_type='part'; UPDATE shop_manager.quotes SET subtotal=350,tax_amount=42,total_amount=999",
          "inconsistent_totals",
        ],
        [
          "UPDATE shop_manager.quotes SET total_amount=392,expiry_date=CURRENT_DATE-1",
          "expired_quote",
        ],
        ["UPDATE shop_manager.quotes SET expiry_date=CURRENT_DATE+1,status='sent'", "wrong_status"],
        [
          "UPDATE shop_manager.quotes SET status='approved'; DELETE FROM shop_manager.quote_items",
          "empty_quote",
        ],
      ];
      let index = 10;
      for (const [sql, reason] of cases) {
        await db.exec(sql);
        const r = request(await readQuote(db), { operationId: freshOp(index++) });
        const out = await call(db, r);
        assert.equal(out.status, "rejected");
        assert.equal(out.reason, reason);
        assert.equal((await state(db))["shop_manager.work_orders"].length, 0);
        assert.deepEqual(await call(db, r), out);
      }
    }),
);

test(
  "source quotes and items freeze after conversion and the legacy public bypass is revoked",
  options,
  () =>
    fixture(async (db) => {
      const r = request(await readQuote(db));
      await call(db, r);
      for (const sql of [
        `UPDATE shop_manager.quotes SET notes='changed' WHERE id='${ids.quote}'`,
        `DELETE FROM shop_manager.quotes WHERE id='${ids.quote}'`,
        `UPDATE shop_manager.quote_items SET name='changed' WHERE quote_id='${ids.quote}'`,
        `DELETE FROM shop_manager.quote_items WHERE quote_id='${ids.quote}'`,
        `INSERT INTO shop_manager.quote_items(quote_id,name,item_type) VALUES('${ids.quote}','Late phantom','service')`,
      ])
        await denied(db, () => db.exec(sql), "55000");
      const rights = (
        await db.query(
          "SELECT has_function_privilege('authenticated','shop_manager.convert_quote_to_work_order(uuid)','EXECUTE') legacy,has_table_privilege('authenticated','quote_workflow_v1.outcomes','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') ledger,has_function_privilege('anon','public.quote_workflow_change_v1(jsonb,boolean)','EXECUTE') anonymous",
        )
      ).rows[0];
      assert.deepEqual(rights, { legacy: false, ledger: false, anonymous: false });
    }),
);

test(
  "late conversion-history failure rolls back the quote, copied lines, work order, audit and outcome",
  options,
  () =>
    fixture(async (db) => {
      const r = request(await readQuote(db));
      await db.exec(
        `CREATE FUNCTION public.quote_late_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF (SELECT count(*) FROM shop_manager.work_orders)<>1 THEN RAISE EXCEPTION 'Invalid fault setup'; END IF; RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Synthetic late fault'; END $$; REVOKE ALL ON FUNCTION public.quote_late_fault() FROM PUBLIC,authenticated,anon,service_role; CREATE TRIGGER quote_late_fault BEFORE INSERT ON quote_workflow_v1.conversions FOR EACH ROW EXECUTE FUNCTION public.quote_late_fault()`,
      );
      await denied(db, () => call(db, r), "23514");
      assert.equal((await call(db, r, true)).status, "not_observed");
      await db.exec("DROP TRIGGER quote_late_fault ON quote_workflow_v1.conversions");
      assert.equal((await call(db, r)).status, "completed");
    }),
);

test(
  "suppressed audit, rewritten copied line and suppressed outcome never acknowledge completion",
  options,
  () =>
    fixture(async (db) => {
      const r = request(await readQuote(db));
      await db.exec(
        `CREATE FUNCTION public.quote_suppress() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$; REVOKE ALL ON FUNCTION public.quote_suppress() FROM PUBLIC,authenticated,anon,service_role; CREATE TRIGGER quote_suppress BEFORE INSERT ON shop_manager.employee_operational_events FOR EACH ROW EXECUTE FUNCTION public.quote_suppress()`,
      );
      await denied(db, () => call(db, r), "55000");
      await db.exec("DROP TRIGGER quote_suppress ON shop_manager.employee_operational_events");
      await db.exec(
        `CREATE FUNCTION public.quote_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.description='Changed by fault'; RETURN NEW; END $$; REVOKE ALL ON FUNCTION public.quote_rewrite() FROM PUBLIC,authenticated,anon,service_role; CREATE TRIGGER quote_rewrite BEFORE INSERT ON shop_manager.work_order_job_lines FOR EACH ROW EXECUTE FUNCTION public.quote_rewrite()`,
      );
      await denied(db, () => call(db, r), "55000");
      await db.exec("DROP TRIGGER quote_rewrite ON shop_manager.work_order_job_lines");
      await db.exec(
        "CREATE TRIGGER quote_suppress BEFORE INSERT ON quote_workflow_v1.outcomes FOR EACH ROW EXECUTE FUNCTION public.quote_suppress()",
      );
      await denied(db, () => call(db, r), "55000");
    }),
);

test(
  "outer rollback undoes a successful statement and the same request remains recoverable",
  options,
  () =>
    fixture(async (db) => {
      const r = request(await readQuote(db)),
        before = await state(db);
      await db.exec("BEGIN; SET LOCAL ROLE authenticated");
      await db.query("SELECT set_config('request.jwt.claims',$1,true)", [JSON.stringify(claims())]);
      assert.equal(
        (
          await db.query("SELECT public.quote_workflow_change_v1($1::jsonb,false) result", [
            JSON.stringify(r),
          ])
        ).rows[0].result.status,
        "completed",
      );
      await db.exec("ROLLBACK");
      assert.deepEqual(await state(db), before);
      assert.equal((await call(db, r, true)).status, "not_observed");
      assert.equal((await call(db, r)).status, "completed");
    }),
);

test(
  "ordinary source item edits must authorize the correct shop; snapshots retain only public DTO fields",
  options,
  () =>
    fixture(async (db) => {
      const v = await readQuote(db);
      assert.ok(!JSON.stringify(v).includes("Private Supplier"));
      assert.ok(!Object.hasOwn(v, "audit"));
      assert.ok(!Object.hasOwn(v, "customer"));
      await denied(db, () =>
        asUser(
          db,
          "WITH changed AS (UPDATE shop_manager.quote_items SET name='Wrong business' WHERE id=$1 RETURNING id) SELECT to_jsonb(id) result FROM changed",
          [ids.part],
          claims(ids.outsider),
        ),
      );
      await denied(
        db,
        () =>
          asUser(
            db,
            "WITH changed AS (UPDATE shop_manager.quotes SET status='converted',converted_to_work_order_id=$1 WHERE id=$2 RETURNING id) SELECT to_jsonb(id) result FROM changed",
            [freshOp(90), ids.quote],
          ),
        "42501",
      );
    }),
);
