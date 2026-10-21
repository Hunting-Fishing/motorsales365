// Independent authenticated database-role races; claims are synthetic, not hosted JWTs.
import assert from "node:assert/strict";
import { withNativeDatabase, literal as q } from "./native-client-harness.mjs";
import { setupStatements, boundary, sql as stockSql } from "./shop-stock-fixture.mjs";
import { setup, sql as quoteSql, ids, claims, request } from "./quote-workflow-fixture.mjs";
await withNativeDatabase(async ({ sql, json, query, sleeping, blocked }) => {
  for (const s of setupStatements) sql(s);
  sql(boundary);
  sql(stockSql);
  for (const s of setup) sql(s);
  sql(quoteSql);
  const session = (body, c = claims()) =>
    `BEGIN;SET LOCAL ROLE authenticated;SET LOCAL "request.jwt.claims"=${q(JSON.stringify(c))};${body}`;
  const invoke = (r, inspect = false) =>
    `SELECT public.quote_workflow_change_v1(${q(JSON.stringify(r))}::jsonb,${inspect});`;
  let seq = 0;
  function seed() {
    const quote = `52000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
    sql(`INSERT INTO shop_manager.quotes(id,customer_id,vehicle_id,status,subtotal,tax_rate,tax_amount,total_amount,created_by,expiry_date,updated_at)
      VALUES('${quote}','${ids.customer}','${ids.vehicle}','approved',350,0.12,42,392,'${ids.actor}',CURRENT_DATE+7,'2026-01-01T00:00:00.123456Z');
      INSERT INTO shop_manager.quote_items(quote_id,name,quantity,unit_price,total_price,item_type,display_order)
      VALUES('${quote}','Labor',1.50,100,150,'labor',1),('${quote}','Parts',2,100,200,'part',2);`);
    const view = json(
      session(`SELECT public.quote_workflow_read_v1('${ids.actor}','${quote}');COMMIT;`),
    );
    return request(view, {
      operationId: `83000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    });
  }
  function final(r, expected = 1) {
    const v =
      json(`SELECT json_build_object('links',(SELECT count(*) FROM quote_workflow_v1.conversions WHERE quote_id='${r.quoteId}'),
      'workOrders',(SELECT count(*) FROM shop_manager.work_orders w JOIN quote_workflow_v1.conversions c ON c.work_order_id=w.id WHERE c.quote_id='${r.quoteId}' AND w.shop_id='${ids.shop}'),
      'outcomes',(SELECT count(*) FROM quote_workflow_v1.outcomes WHERE operation_id='${r.operationId}'),
      'audit',(SELECT count(*) FROM shop_manager.employee_operational_events e JOIN quote_workflow_v1.conversions c ON e.id=c.audit_id WHERE c.quote_id='${r.quoteId}'))`);
    assert.deepEqual(v, {
      links: expected,
      workOrders: expected,
      outcomes: expected,
      audit: expected,
    });
  }
  for (const mode of ["commit", "rollback", "intent_conflict", "stale"]) {
    const r = seed(),
      aName = `quote_a_${seq}`,
      bName = `quote_b_${seq}`;
    const a = query(
      session(invoke(r) + `SELECT pg_sleep(2);${mode === "rollback" ? "ROLLBACK" : "COMMIT"};`),
      aName,
    );
    await sleeping(aName);
    const other = {
      ...r,
      ...(mode === "intent_conflict" ? { reason: "Changed intent" } : {}),
      ...(mode === "stale"
        ? { operationId: `84000000-0000-4000-8000-${String(seq).padStart(12, "0")}` }
        : {}),
    };
    const b = query(session(invoke(other) + "COMMIT;"), bName);
    await blocked(bName, aName);
    const first = await a,
      second = await b;
    assert.equal(first.code, 0, first.err);
    if (mode === "intent_conflict") {
      assert.notEqual(second.code, 0);
      assert.match(second.err, /22023/);
    } else {
      assert.equal(second.code, 0, second.err);
      const result = JSON.parse(second.out.trim());
      assert.equal(result.status, mode === "stale" ? "rejected" : "completed");
      if (mode === "stale") assert.equal(result.reason, "stale_quote");
    }
    final(r);
    const recovered = await query(session(invoke(r, true) + "COMMIT;"), `quote_recover_${seq}`);
    assert.equal(recovered.code, 0, recovered.err);
    assert.equal(JSON.parse(recovered.out.trim()).status, "completed");
    final(r);
    console.log(`PASS quote ${mode}: observed lock, one work order/audit, reconnect recovery`);
  }
  // An item update first acquires the parent; a pending conversion must not use an old snapshot.
  let r = seed();
  const editor = query(
    `BEGIN;UPDATE shop_manager.quote_items SET name='Changed before conversion' WHERE quote_id='${r.quoteId}' AND item_type='part';SELECT pg_sleep(2);COMMIT;`,
    "quote_edit_first",
  );
  await sleeping("quote_edit_first");
  const convert = query(session(invoke(r) + "COMMIT;"), "quote_convert_late");
  await blocked("quote_convert_late", "quote_edit_first");
  assert.equal((await editor).code, 0);
  const stale = await convert;
  assert.equal(stale.code, 0, stale.err);
  assert.equal(JSON.parse(stale.out.trim()).reason, "stale_quote");
  assert.equal(
    json(`SELECT count(*) FROM quote_workflow_v1.conversions WHERE quote_id='${r.quoteId}'`),
    0,
  );
  console.log(
    "PASS quote item edit first invalidates the reviewed content without a partial conversion",
  );
  // If conversion wins, a child edit waits for the parent then refuses the frozen source.
  r = seed();
  const held = query(session(invoke(r) + "SELECT pg_sleep(2);COMMIT;"), "quote_convert_first");
  await sleeping("quote_convert_first");
  const late = query(
    `BEGIN;UPDATE shop_manager.quote_items SET name='Too late' WHERE quote_id='${r.quoteId}' AND item_type='part';COMMIT;`,
    "quote_edit_late",
  );
  await blocked("quote_edit_late", "quote_convert_first");
  assert.equal((await held).code, 0);
  const refused = await late;
  assert.notEqual(refused.code, 0);
  assert.match(refused.err, /55000/);
  final(r);
  console.log("PASS converted quote source refuses a waiting item edit");
  // Live expiry is rechecked after duplicate operation lock waits.
  r = seed();
  const first = query(session(invoke(r) + "SELECT pg_sleep(3);COMMIT;"), "quote_expiry_a");
  await sleeping("quote_expiry_a");
  const expiry = json("SELECT floor(extract(epoch FROM clock_timestamp()))::bigint+2");
  const waiting = query(
    session(invoke(r) + "COMMIT;", claims(ids.actor, { exp: expiry })),
    "quote_expiry_b",
  );
  await blocked("quote_expiry_b", "quote_expiry_a");
  assert.equal((await first).code, 0);
  const expired = await waiting;
  assert.notEqual(expired.code, 0);
  assert.match(expired.err, /42501/);
  final(r);
  console.log("PASS quote session expiry after a lock wait is denied");
});
