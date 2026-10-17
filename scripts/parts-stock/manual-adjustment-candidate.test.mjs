// CLOSED sequential PGlite mechanics only. Owner/Auth-id/test.user/manager
// positives are synthetic, NOT real Auth/native roles, tenant or API authority.
// No hosted target, native independent session, global stock/deadlock/phantom,
// durable operation/idempotency/unknown-outcome/recovery or app adoption proof.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  buildMixedReservationOrderSource,
  ORDER_SIGNATURE,
} from "./mixed-reservation-order-source.mjs";
import { actor, snapshot as originalSnapshot } from "./mixed-reservation-fixture.mjs";

const source = buildMixedReservationOrderSource();
const { ids } = source;
const signature = "manual_stock_candidate.adjust(uuid,uuid,uuid,uuid,numeric,numeric,text)";
const read = (path) =>
  fs.readFileSync(new URL(path, import.meta.url), "utf8").replaceAll("\r\n", "\n");
const sql = read("./manual-adjustment-candidate.sql");
const candidateSha = "6b2899e15dc75ecffe943760604651aca9c63c22f4a7bc1bd4ca94bc8274b250";
const hash = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(hash(sql), candidateSha, "Frozen private candidate LF bytes checked before any SQL");
const options = { timeout: 30000, concurrency: false };
const roles = ["anon", "authenticated", "service_role"];
const oldTime = "2001-01-01T00:00:00+00:00";
const fresh = Object.freeze({
  item: "31000000-0000-4000-8000-000000000101",
  inquiry: "41000000-0000-4000-8000-000000000101",
  order: "51000000-0000-4000-8000-000000000101",
  line: "61000000-0000-4000-8000-000000000101",
  movement: "81000000-0000-4000-8000-000000000101",
  secondMovement: "81000000-0000-4000-8000-000000000102",
  thirdMovement: "81000000-0000-4000-8000-000000000103",
  fourthMovement: "81000000-0000-4000-8000-000000000104",
});
const one = async (db, query, parameters = []) => (await db.query(query, parameters)).rows[0];
const request = (overrides = {}) => ({
  account: ids.actor,
  business: ids.business,
  item: fresh.item,
  movement: fresh.movement,
  expected: "10",
  delta: "2",
  reason: null,
  ...overrides,
});
const parameters = (value) => [
  value.account,
  value.business,
  value.item,
  value.movement,
  value.expected,
  value.delta,
  value.reason,
];
const query =
  "SELECT manual_stock_candidate.adjust($1,$2,$3,$4,$5::numeric,$6::numeric,$7) ack,pg_catalog.to_jsonb(pg_catalog.now()) transaction_at";
async function adjust(db, overrides = {}, subject = ids.actor) {
  return (await actor(db, query, parameters(request(overrides)), subject)).rows[0];
}
const failure = (expected) => (error) => {
  assert.equal(error.code, expected);
  assert.equal(error.message, "Stock adjustment failed.");
  assert.ok(!error.detail && !error.hint);
  return true;
};
async function graph(db) {
  const extra = {};
  const schemas =
    "('auth','public','shop_manager','mixed_reservation_candidate','manual_stock_candidate')";
  const queries = {
    candidateNamespace:
      "SELECT n.nspname,r.rolname owner,n.nspacl::text FROM pg_namespace n JOIN pg_roles r ON r.oid=n.nspowner WHERE n.nspname='manual_stock_candidate' ORDER BY 1",
    candidateRelations:
      "SELECT c.relname,c.relkind,r.rolname owner,c.relacl::text,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner WHERE n.nspname='manual_stock_candidate' ORDER BY 1",
    candidateFunctions:
      "SELECT p.proname,pg_get_function_identity_arguments(p.oid) args,r.rolname owner,p.prosecdef,p.provolatile,p.proconfig,p.proacl::text,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname='manual_stock_candidate' ORDER BY 1,2",
    types: `SELECT n.nspname,t.typname,t.typtype,t.typcategory,r.rolname owner,t.typacl::text,t.typbasetype::regtype::text base,t.typtypmod,t.typnotnull,t.typdefault,COALESCE((SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid=t.oid),'[]'::jsonb) labels FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_roles r ON r.oid=t.typowner WHERE n.nspname IN ${schemas} ORDER BY 1,2`,
    defaultAcl:
      "SELECT r.rolname owner,COALESCE(n.nspname,'GLOBAL') scope,d.defaclobjtype,d.defaclacl::text FROM pg_default_acl d JOIN pg_roles r ON r.oid=d.defaclrole LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace ORDER BY 1,2,3",
    roles:
      "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolconfig FROM pg_roles ORDER BY rolname",
    memberships:
      "SELECT r.rolname role,m.rolname member,g.rolname grantor,a.admin_option,a.inherit_option,a.set_option FROM pg_auth_members a JOIN pg_roles r ON r.oid=a.roleid JOIN pg_roles m ON m.oid=a.member JOIN pg_roles g ON g.oid=a.grantor ORDER BY 1,2,3",
    settings:
      "SELECT current_setting('statement_timeout') statement_timeout,current_setting('lock_timeout') lock_timeout,current_setting('TimeZone') timezone,current_setting('row_security') row_security",
  };
  for (const [name, statement] of Object.entries(queries))
    extra[name] = (await db.query(statement)).rows;
  return {
    base: await originalSnapshot(db),
    events: (
      await db.query("SELECT to_jsonb(t) row FROM public.parts_order_events t ORDER BY id")
    ).rows.map(({ row }) => row),
    extra,
  };
}
function equalGraph(after, before) {
  assert.equal(
    hash(JSON.stringify(after)),
    hash(JSON.stringify(before)),
    "Complete selected graph SHA256 equality",
  );
  assert.deepEqual(after, before);
}
async function rejected(db, overrides, state, subject = ids.actor) {
  const before = await graph(db);
  await assert.rejects(adjust(db, overrides, subject), failure(state));
  equalGraph(await graph(db), before);
}
async function withFixture(run) {
  const db = new PGlite(); // Fresh private memory only; no URL/datadir/process.
  try {
    await db.exec("SET statement_timeout='3s'; SET lock_timeout='1s';");
    for (const statement of source.setupStatements) await db.exec(statement);
    await db.exec(source.candidateSQL);
    await db.exec(sql);
    await db.query(
      "INSERT INTO public.business_inventory_items(id,business_id,name,qty_on_hand,updated_at) VALUES($1,$2,'Fresh synthetic adjustment item',10,$3::timestamptz)",
      [fresh.item, ids.business, oldTime],
    );
    await db.query(
      "INSERT INTO public.network_part_inquiries(id,business_id,item_id,part_name,contact_name,contact_email) VALUES($1,$2,$3,'Synthetic adjustment inquiry','Fixture','adjust@example.invalid')",
      [fresh.inquiry, ids.business, fresh.item],
    );
    return await run(db);
  } finally {
    await db.close();
  }
}
function row(state, table, id) {
  const matches = state.base.data[`public.${table}`].filter((value) => value.id === id);
  assert.equal(matches.length, 1);
  return matches[0];
}
function assertPair(before, after, result, overrides = {}, expected = {}) {
  const value = request(overrides);
  const previous = row(before, "business_inventory_items", value.item);
  const current = row(after, "business_inventory_items", value.item);
  assert.equal(current.qty_on_hand, expected.after ?? "12.00");
  assert.equal(current.updated_at, result.transaction_at);
  assert.notEqual(current.updated_at, previous.updated_at);
  assert.ok(Number.isFinite(Date.parse(current.updated_at)));
  assert.deepEqual(result.ack, {
    accountId: value.account,
    businessId: value.business,
    itemId: value.item,
    movementId: value.movement,
    quantityBefore: previous.qty_on_hand,
    delta: expected.delta ?? "2.00",
    quantityAfter: expected.after ?? "12.00",
    inquiryHolds: expected.inquiries ?? "0",
    orderHolds: expected.orders ?? "0",
    counterHolds: previous.qty_on_hold,
    protectedFloor: expected.floor ?? "0",
    mixedReservationAvailabilityAfter:
      expected.mixedAvailable ?? expected.available ?? expected.after ?? "12.00",
    availableAfter: expected.available ?? expected.after ?? "12.00",
  });
  const movements = after.base.data["public.business_inventory_movements"].filter(
    (movement) =>
      !before.base.data["public.business_inventory_movements"].some(
        (old) => old.id === movement.id,
      ),
  );
  assert.equal(movements.length, 1);
  assert.deepEqual(movements[0], {
    id: value.movement,
    item_id: value.item,
    business_id: value.business,
    delta: expected.delta ?? "2.00",
    reason: value.reason,
    tow_request_id: null,
    actor_id: value.account,
    created_at: result.transaction_at,
  });
  assert.deepEqual(
    Object.keys(movements[0]).sort(),
    [
      "id",
      "item_id",
      "business_id",
      "delta",
      "reason",
      "tow_request_id",
      "actor_id",
      "created_at",
    ].sort(),
  );
  const normalized = structuredClone(after);
  const target = row(normalized, "business_inventory_items", value.item);
  target.qty_on_hand = previous.qty_on_hand;
  target.updated_at = previous.updated_at;
  normalized.base.data["public.business_inventory_movements"] = normalized.base.data[
    "public.business_inventory_movements"
  ].filter((movement) => movement.id !== value.movement);
  equalGraph(normalized, before); // Never mask the whole inventory/movement row.
}
async function acceptedB2B(db) {
  await db.query(
    "INSERT INTO public.parts_orders(id,requester_business_id,supplier_business_id,created_by,status,updated_at) VALUES($1,$2,$3,$4,'submitted',$5::timestamptz)",
    [fresh.order, ids.otherBusiness, ids.business, ids.actor, oldTime],
  );
  await db.query(
    "INSERT INTO public.parts_order_lines(id,order_id,inventory_item_id,name_snapshot,requested_quantity,accepted_quantity,unit_price,line_total,updated_at) VALUES($1,$2,$3,'Fresh synthetic submitted line',8,0,0,0,$4::timestamptz)",
    [fresh.line, fresh.order, fresh.item, oldTime],
  );
  assert.equal(
    (
      await one(db, "SELECT count(*)::integer n FROM public.parts_reservations WHERE order_id=$1", [
        fresh.order,
      ])
    ).n,
    0,
  );
  assert.deepEqual(
    (
      await actor(db, "SELECT public.transition_parts_network_order($1,'accepted',NULL,72) ack", [
        fresh.order,
      ])
    ).rows[0].ack,
    { id: fresh.order, status: "accepted" },
  );
  assert.deepEqual(
    await one(
      db,
      "SELECT qty_on_hand::text stock,qty_on_hold::text held FROM public.business_inventory_items WHERE id=$1",
      [fresh.item],
    ),
    { stock: "10.00", held: "8.00" },
  );
  assert.deepEqual(
    await one(
      db,
      "SELECT quantity::text quantity,inventory_item_id,order_line_id,supplier_business_id FROM public.parts_reservations WHERE order_id=$1",
      [fresh.order],
    ),
    {
      quantity: "8.00",
      inventory_item_id: fresh.item,
      order_line_id: fresh.line,
      supplier_business_id: ids.business,
    },
  );
  const events = (
    await db.query(
      "SELECT actor_id,event_type,from_status,to_status FROM public.parts_order_events WHERE order_id=$1",
      [fresh.order],
    )
  ).rows;
  assert.deepEqual(events, [
    {
      actor_id: ids.actor,
      event_type: "accepted",
      from_status: "submitted",
      to_status: "accepted",
    },
  ]);
}
async function holdInquiry(db, quantity) {
  return (
    await actor(
      db,
      "SELECT mixed_reservation_candidate.reserve_inquiry($1,$2,$3,$4,$5::numeric,24,NULL) ack",
      [ids.actor, ids.business, fresh.inquiry, fresh.item, quantity],
    )
  ).rows[0].ack;
}
async function fault(db, table, timing, event, body, run) {
  // Every helper is explicitly synthetic/private to this DB. Establish the
  // full graph baseline AFTER installation and ordinary EXECUTE revocation.
  const functionName = "public.lab_manual_fault";
  await db.exec(`CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${body} END $$;
    REVOKE ALL ON FUNCTION ${functionName}() FROM PUBLIC,anon,authenticated,service_role;
    CREATE TRIGGER lab_manual_fault ${timing} ${event} ON public.${table} FOR EACH ROW EXECUTE FUNCTION ${functionName}();`);
  try {
    for (const role of roles)
      assert.equal(
        (
          await one(
            db,
            "SELECT has_function_privilege($1,'public.lab_manual_fault()','EXECUTE') allowed",
            [role],
          )
        ).allowed,
        false,
      );
    await run();
  } finally {
    await db.exec(
      `DROP TRIGGER lab_manual_fault ON public.${table}; DROP FUNCTION ${functionName}();`,
    );
  }
}

test(
  "frozen selected sources/private INVOKER/ACLs preserve 14 tables and actual timestamp without app adoption",
  options,
  async () => {
    assert.equal(hash(sql), candidateSha);
    assert.equal(source.tables.length, 14);
    assert.equal(source.setupStatements.length, 75);
    assert.equal(source.selectedSources.length, 49);
    assert.equal(
      hash(read("./mixed-reservation-order-source.mjs")),
      "4cc3686000aed8e9fc4143af7035b24439616837ba52ed4ae43a43d5f381d106",
    );
    assert.equal(
      hash(read("./mixed-reservation-native-source.mjs")),
      "02daec7bfa4ac89e24f7ae0c95820e869758f3c6b61fb6cb53e5617e527bf606",
    );
    assert.equal(
      hash(source.candidateSQL),
      "80dfd6a15e15ca404ece0cb77402d3fa3280da767d5f19a1cca9e3b16436332f",
    );
    assert.match(sql, /CREATE SCHEMA manual_stock_candidate;/);
    assert.match(sql, /LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp/);
    assert.match(
      sql,
      /REVOKE ALL ON SCHEMA manual_stock_candidate FROM PUBLIC, anon, authenticated, service_role/,
    );
    assert.match(
      sql,
      /REVOKE ALL ON ALL FUNCTIONS IN SCHEMA manual_stock_candidate FROM PUBLIC, anon, authenticated, service_role/,
    );
    const executable = sql.replace(/--[^\n]*/g, "");
    assert.doesNotMatch(
      executable,
      /SECURITY DEFINER|CREATE OR REPLACE|CREATE TABLE|ALTER TABLE|\bGRANT\b|DROP\s+/i,
    );
    assert.equal((sql.match(/UPDATE public\.business_inventory_items/g) ?? []).length, 1);
    assert.equal((sql.match(/INSERT INTO public\.business_inventory_movements/g) ?? []).length, 1);
    assert.doesNotMatch(
      executable,
      /UPDATE auth\.|INSERT INTO auth\.|DELETE FROM|round\(|GREATEST\(/i,
    );
    assert.match(sql, /v_before\.qty_on_hold > v_before\.qty_on_hand/);
    assert.match(
      sql,
      /v_protected_floor := CASE WHEN v_before\.qty_on_hold > v_combined\s+THEN v_before\.qty_on_hold ELSE v_combined END/,
    );
    assert.doesNotMatch(
      executable,
      /v_combined\s*\+\s*v_before\.qty_on_hold|v_before\.qty_on_hold\s*\+\s*v_combined/,
    );
    assert.ok(sql.includes("A movement UUID is NOT a retry ledger"));
    assert.ok(sql.includes("NOT real Auth"));
    assert.ok(sql.includes("NOT current-schema parity"));
    await withFixture(async (db) => {
      const state = await graph(db);
      assert.equal(Object.keys(state.base.data).length + 1, 14);
      assert.equal(state.extra.candidateRelations.length, 0);
      assert.equal(state.extra.candidateFunctions.length, 1);
      assert.equal(state.extra.candidateFunctions[0].prosecdef, false);
      assert.deepEqual(state.extra.candidateFunctions[0].proconfig, [
        "search_path=pg_catalog, pg_temp",
      ]);
      assert.ok(
        state.base.catalog.triggers.some(
          (trigger) =>
            trigger.relname === "business_inventory_items" &&
            trigger.tgname === "trg_business_inv_updated" &&
            trigger.tgenabled === "O",
        ),
      );
      for (const field of ["qty_on_hand", "delta"])
        assert.ok(
          state.base.catalog.columns.some(
            (column) => column.attname === field && column.type === "numeric(12,2)",
          ),
        );
      assert.equal(
        state.base.catalog.constraints.filter((constraint) => constraint.contype === "f").length,
        30,
      );
    });
  },
);
test(
  "ordinary and service writer execution is denied without happy-role grants or graph changes",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await graph(db);
      for (const role of roles) {
        assert.deepEqual(
          await one(
            db,
            "SELECT has_schema_privilege($1,'manual_stock_candidate','USAGE') usage,has_function_privilege($1,$2,'EXECUTE') execute",
            [role, signature],
          ),
          { usage: false, execute: false },
        );
        assert.deepEqual(
          await one(
            db,
            "SELECT has_table_privilege($1,'auth.users','SELECT') auth_read,has_table_privilege($1,'auth.users','UPDATE') auth_write,has_function_privilege($1,$2,'EXECUTE') retained_execute",
            [role, ORDER_SIGNATURE],
          ),
          { auth_read: false, auth_write: false, retained_execute: false },
        );
        await db.exec(`BEGIN; SET LOCAL ROLE ${role};`);
        try {
          await assert.rejects(
            db.query(query, parameters(request())),
            (error) => error.code === "42501",
          );
        } finally {
          await db.exec("ROLLBACK;");
        }
        equalGraph(await graph(db), before);
      }
    });
  },
);
test(
  "exact pair/reason/precision/zero quantity and conservative PRIVATE counter quarantine, not production semantics",
  options,
  async () => {
    await withFixture(async (db) => {
      // Incoming/on-order inventory can legitimately exceed current on-hand.
      // It is preserved, not capped to stock or added to an independent hold.
      await db.query("UPDATE public.business_inventory_items SET qty_on_order=100 WHERE id=$1", [
        fresh.item,
      ]);
      let before = await graph(db);
      assert.equal(row(before, "business_inventory_items", fresh.item).qty_on_order, "100");
      const firstResult = await adjust(db);
      assertPair(before, await graph(db), firstResult);
      before = await graph(db);
      const second = {
        expected: "12.0000",
        delta: "2e-2",
        movement: fresh.secondMovement,
        reason: "  Synthetic café repair  ",
      };
      const result = await adjust(db, second);
      assertPair(before, await graph(db), result, second, { after: "12.02", delta: "0.02" });
      await db.query(
        "UPDATE public.business_inventory_items SET qty_on_hand=0,updated_at=$2::timestamptz WHERE id=$1",
        [fresh.item, oldTime],
      );
      before = await graph(db);
      const zero = { expected: "0", delta: "1", movement: fresh.thirdMovement, reason: "" };
      const zeroResult = await adjust(db, zero);
      assertPair(before, await graph(db), zeroResult, zero, { after: "1.00", delta: "1.00" });
      // Explicitly synthetic opaque-counter arrangement for the PRIVATE MAX
      // quarantine rule. This is not approved production counter semantics or a
      // repair/reconciliation path. The two-unit inquiry uses its actual writer.
      await db.query(
        "UPDATE public.business_inventory_items SET qty_on_hand=10,qty_on_hold=8 WHERE id=$1",
        [fresh.item],
      );
      await holdInquiry(db, "2");
      await rejected(db, { delta: "-3", movement: fresh.fourthMovement }, "22023");
      before = await graph(db);
      const guarded = { delta: "-2", movement: fresh.fourthMovement };
      const guardedResult = await adjust(db, guarded);
      assertPair(before, await graph(db), guardedResult, guarded, {
        after: "8.00",
        delta: "-2.00",
        inquiries: "2.00",
        floor: "8",
        available: "0.00",
        mixedAvailable: "6.00",
      });
    });
  },
);
test(
  "nonfinite, precision, zero delta and exact NUMERIC overflow fail without rounding or partial movement",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const expected of [null, "-1", "NaN", "Infinity", "-Infinity", "10.001", "10000000000"])
        await rejected(db, { expected }, "22023");
      for (const delta of [
        null,
        "0",
        "NaN",
        "Infinity",
        "-Infinity",
        "0.001",
        "10000000000",
        "-11",
      ])
        await rejected(db, { delta }, "22023");
      await db.query(
        "UPDATE public.business_inventory_items SET qty_on_hand=9999999999.99 WHERE id=$1",
        [fresh.item],
      );
      await rejected(db, { expected: "9999999999.99", delta: "0.01" }, "22023");
    });
  },
);
test(
  "exact account/business/item/CAS bindings and missing Auth row fail closed with unchanged whole graph",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const override of [
        { account: null },
        { business: null },
        { item: null },
        { movement: null },
        { reason: "x".repeat(2001) },
      ])
        await rejected(db, override, "22023");
      for (const override of [
        { account: ids.outsider },
        { business: ids.otherBusiness },
        { item: ids.otherItem },
        { item: ids.absent },
      ])
        await rejected(db, override, "42501");
      await rejected(db, {}, "42501", null);
      await rejected(db, {}, "42501", ids.outsider);
      await rejected(db, { expected: "9" }, "40001");
      await db.query("UPDATE public.businesses SET owner_id=$1 WHERE id=$2", [
        ids.absent,
        ids.business,
      ]);
      await rejected(db, { account: ids.absent }, "42501", ids.absent); // Manager stub can match, actual id-only Auth row is absent.
    });
  },
);
test(
  "actual retained B2B acceptance8 on fresh stock10 rejects manual-3 and permits exactly-2",
  options,
  async () => {
    await withFixture(async (db) => {
      await acceptedB2B(db);
      const before = await graph(db);
      await rejected(db, { delta: "-3" }, "22023");
      const result = await adjust(db, { delta: "-2" });
      assertPair(
        before,
        await graph(db),
        result,
        { delta: "-2" },
        { after: "8.00", delta: "-2.00", orders: "8.00", floor: "8.00", available: "0.00" },
      );
    });
  },
);
test(
  "actual inquiry+B2B hold families set one mixed floor without qty_on_hold double counting",
  options,
  async () => {
    await withFixture(async (db) => {
      await holdInquiry(db, "1.50");
      await acceptedB2B(db);
      assert.equal(
        (await one(db, "SELECT public.active_reservation_qty($1)::text held", [fresh.item])).held,
        "9.50",
      );
      const before = await graph(db);
      await rejected(db, { delta: "-0.51" }, "22023");
      const result = await adjust(db, { delta: "-0.50" });
      assertPair(
        before,
        await graph(db),
        result,
        { delta: "-0.50" },
        {
          after: "9.50",
          delta: "-0.50",
          inquiries: "1.50",
          orders: "8.00",
          floor: "9.50",
          available: "0.00",
        },
      );
    });
  },
);
test(
  "individual malformed active holds, bindings, finite stock and counters cannot be repaired or hidden",
  options,
  async () => {
    await withFixture(async (db) => {
      await acceptedB2B(db);
      for (const assignment of [
        "qty_on_hand='NaN'::numeric",
        "qty_on_hand=-1",
        "qty_on_hold='NaN'::numeric",
        "qty_on_hold=-1",
        "qty_on_hold=11",
        "qty_on_order='Infinity'::numeric",
        "qty_on_order=-1",
      ]) {
        await db.exec(
          `UPDATE public.business_inventory_items SET ${assignment} WHERE id='${fresh.item}';`,
        );
        await rejected(db, {}, "55000");
        await db.query(
          "UPDATE public.business_inventory_items SET qty_on_hand=10,qty_on_hold=8,qty_on_order=0 WHERE id=$1",
          [fresh.item],
        );
      }
      await db.query(
        "UPDATE public.business_inventory_items SET qty_on_hand=7,qty_on_hold=0 WHERE id=$1",
        [fresh.item],
      );
      await rejected(db, { expected: "7", delta: "5" }, "55000");
      await db.query(
        "UPDATE public.business_inventory_items SET qty_on_hand=10,qty_on_hold=8 WHERE id=$1",
        [fresh.item],
      );
      for (const quantity of [null, "NaN", "0", "-1"]) {
        await db.query(
          "UPDATE public.network_part_inquiries SET status='accepted',reserved_item_id=$1,reserved_quantity=$2::numeric,reserved_until=now()+interval '1 day' WHERE id=$3",
          [fresh.item, quantity, fresh.inquiry],
        );
        await rejected(db, {}, "55000");
      }
      await db.query(
        "UPDATE public.network_part_inquiries SET reserved_quantity=1,business_id=$1 WHERE id=$2",
        [ids.otherBusiness, fresh.inquiry],
      );
      await rejected(db, {}, "55000");
      await db.query(
        "UPDATE public.network_part_inquiries SET business_id=$1,item_id=$2 WHERE id=$3",
        [ids.business, ids.otherItem, fresh.inquiry],
      );
      await rejected(db, {}, "55000");
      await db.query(
        "UPDATE public.network_part_inquiries SET status='closed',item_id=$1 WHERE id=$2",
        [fresh.item, fresh.inquiry],
      );
      for (const assignment of [
        "quantity='NaN'::numeric",
        `supplier_business_id='${ids.otherBusiness}'::uuid`,
        `order_id='${ids.order}'::uuid`,
      ]) {
        await db.exec(
          `UPDATE public.parts_reservations SET ${assignment} WHERE order_id='${fresh.order}' OR inventory_item_id='${fresh.item}';`,
        );
        await rejected(db, {}, "55000");
        await db.query(
          "UPDATE public.parts_reservations SET quantity=8,supplier_business_id=$1,order_id=$2 WHERE inventory_item_id=$3",
          [ids.business, fresh.order, fresh.item],
        );
      }
      await db.query("UPDATE public.parts_order_lines SET inventory_item_id=$1 WHERE id=$2", [
        ids.otherItem,
        fresh.line,
      ]);
      await rejected(db, {}, "55000");
    });
  },
);
test(
  "movement UUID collision23505 is not replay; successful outer statement then ROLLBACK restores every selected row/catalog",
  options,
  async () => {
    await withFixture(async (db) => {
      await adjust(db);
      await rejected(db, { expected: "12" }, "23505");
      const before = await graph(db);
      await db.exec("BEGIN;");
      try {
        await db.query("SELECT set_config('test.user',$1,true)", [ids.actor]);
        const result = await one(
          db,
          query,
          parameters(request({ expected: "12", movement: fresh.secondMovement })),
        );
        const local = await graph(db);
        // The sole local test.user setting is declared transaction context, not a
        // business/catalog mutation and not a second observer/COMMIT witness.
        const comparableBefore = structuredClone(before);
        comparableBefore.base.settings.subject = ids.actor;
        assertPair(
          comparableBefore,
          local,
          result,
          { expected: "12", movement: fresh.secondMovement },
          { after: "14.00" },
        );
      } finally {
        await db.exec("ROLLBACK;");
      }
      equalGraph(await graph(db), before);
    });
  },
);
test(
  "suppressed and rewritten inventory UPDATE results fail55000 and roll back the complete graph",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const body of [
        "RETURN NULL;",
        "NEW.qty_on_hand:=NEW.qty_on_hand+1; RETURN NEW;",
        "NEW.notes:='Synthetic rewrite'; RETURN NEW;",
      ]) {
        await fault(db, "business_inventory_items", "BEFORE", "UPDATE", body, () =>
          rejected(db, {}, "55000"),
        );
      }
      await fault(
        db,
        "business_inventory_items",
        "AFTER",
        "UPDATE",
        `IF pg_trigger_depth()=1 THEN UPDATE public.business_inventory_items SET notes='Synthetic persisted rewrite' WHERE id=NEW.id; END IF; RETURN NEW;`,
        () => rejected(db, {}, "55000"),
      );
    });
  },
);
test(
  "suppressed, rewritten or missing persisted movement INSERT results fail55000 with inventory rollback",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const body of [
        "RETURN NULL;",
        "NEW.delta:=NEW.delta+1; RETURN NEW;",
        "NEW.reason:='Synthetic rewrite'; RETURN NEW;",
      ]) {
        await fault(db, "business_inventory_movements", "BEFORE", "INSERT", body, () =>
          rejected(db, {}, "55000"),
        );
      }
      await fault(
        db,
        "business_inventory_movements",
        "AFTER",
        "INSERT",
        "DELETE FROM public.business_inventory_movements WHERE id=NEW.id; RETURN NEW;",
        () => rejected(db, {}, "55000"),
      );
    });
  },
);
test(
  "real late movement item/business FK23503 after witnessed inventory UPDATE rolls back, no invented actor FK",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const field of ["item_id", "business_id"]) {
        const body = `IF NEW.id IS DISTINCT FROM '${fresh.movement}'::uuid OR NEW.item_id IS DISTINCT FROM '${fresh.item}'::uuid OR NEW.business_id IS DISTINCT FROM '${ids.business}'::uuid OR NEW.delta IS DISTINCT FROM 2 OR NOT EXISTS(SELECT 1 FROM public.business_inventory_items WHERE id='${fresh.item}' AND qty_on_hand=12) THEN RAISE EXCEPTION USING ERRCODE='XX000',MESSAGE='Synthetic late-work witness missing'; END IF; NEW.${field}:='${ids.absent}'; RETURN NEW;`;
        await fault(db, "business_inventory_movements", "BEFORE", "INSERT", body, () =>
          rejected(db, {}, "23503"),
        );
      }
    });
  },
);
