// Sequential selected SQL only, in always-closed private PGlite databases.
// Real retained B2B bodies are NOT real Auth/native authority or native waits.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { buildMixedReservationNativeSource } from "./mixed-reservation-native-source.mjs";
import {
  buildMixedReservationOrderSource,
  ORDER_SIGNATURE,
} from "./mixed-reservation-order-source.mjs";
import { actor, snapshot as originalSnapshot } from "./mixed-reservation-fixture.mjs";

const source = buildMixedReservationOrderSource();
const { ids } = source;
const options = { timeout: 30000, concurrency: false };
const sha = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) =>
  fs.readFileSync(new URL(path, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const one = async (db, sql, values = []) => (await db.query(sql, values)).rows[0];
const code = (expected) => (error) => {
  assert.equal(error.code, expected);
  return true;
};
const fresh = Object.freeze({
  item: "31000000-0000-4000-8000-000000000001",
  inquiry: "41000000-0000-4000-8000-000000000001",
  order: "51000000-0000-4000-8000-000000000001",
  line: "61000000-0000-4000-8000-000000000001",
});
const oldTime = "2001-01-01T00:00:00+00:00";
async function withFixture(run) {
  const db = new PGlite(); // No datadir, URL, connector, process or shared state.
  try {
    await db.exec("SET statement_timeout='3s'; SET lock_timeout='1s';");
    for (const statement of source.setupStatements) await db.exec(statement);
    await db.exec(source.candidateSQL);
    return await run(db);
  } finally {
    await db.close();
  }
}
async function graph(db) {
  // The unchanged snapshot covers all thirteen base tables (including Auth),
  // NUMERIC-as-text, selected catalog/ACL/settings and order sequence state.
  // Add every row of the one extra table, not just the expected new event.
  return {
    base: await originalSnapshot(db),
    events: (
      await db.query("SELECT to_jsonb(t) AS row FROM public.parts_order_events t ORDER BY id")
    ).rows.map(({ row }) => row),
  };
}
async function seedFresh(db) {
  // Synthetic fixture arrangement only. These are new rows, not an assertion
  // that create_parts_network_order or any real customer/actor accepted them.
  await db.query(
    "INSERT INTO public.business_inventory_items(id,business_id,name,qty_on_hand,updated_at) VALUES($1,$2,'Fresh synthetic item',10,$3::timestamptz)",
    [fresh.item, ids.business, oldTime],
  );
  await db.query(
    "INSERT INTO public.network_part_inquiries(id,business_id,item_id,part_name,contact_name,contact_email) VALUES($1,$2,$3,'Fresh synthetic inquiry','Fixture','fresh@example.invalid')",
    [fresh.inquiry, ids.business, fresh.item],
  );
  await db.query(
    "INSERT INTO public.parts_orders(id,requester_business_id,supplier_business_id,created_by,status,updated_at) VALUES($1,$2,$3,$4,'submitted',$5::timestamptz)",
    [fresh.order, ids.otherBusiness, ids.business, ids.actor, oldTime],
  );
  await db.query(
    "INSERT INTO public.parts_order_lines(id,order_id,inventory_item_id,name_snapshot,requested_quantity,accepted_quantity,unit_price,line_total,updated_at) VALUES($1,$2,$3,'Fresh synthetic B2B line',8,0,0,0,$4::timestamptz)",
    [fresh.line, fresh.order, fresh.item, oldTime],
  );
}
async function transition(db, status = "accepted", subject = ids.actor, order = fresh.order) {
  const result = await actor(
    db,
    "SELECT public.transition_parts_network_order($1,$2,$3,$4) ack",
    [order, status, "Synthetic transition note", 72],
    subject,
  );
  return result.rows[0].ack;
}
async function inquiry(db, quantity, target = fresh) {
  const result = await actor(
    db,
    "SELECT mixed_reservation_candidate.reserve_inquiry($1,$2,$3,$4,$5::numeric,$6,$7) ack",
    [ids.actor, ids.business, target.inquiry, target.item, quantity, 24, "Synthetic inquiry note"],
  );
  return result.rows[0].ack;
}
function row(value, table, id) {
  const rows = value.base.data[`public.${table}`].filter((entry) => entry.id === id);
  assert.equal(rows.length, 1);
  return rows[0];
}
function restoreFields(value, before, table, id, fields) {
  const target = row(value, table, id);
  const original = row(before, table, id);
  for (const field of fields) target[field] = original[field];
}
function assertInquiryOnly(before, after, target, quantity) {
  const current = row(after, "network_part_inquiries", target.inquiry);
  const previous = row(before, "network_part_inquiries", target.inquiry);
  assert.equal(current.status, "accepted");
  assert.equal(current.reserved_item_id, target.item);
  assert.equal(current.reserved_quantity, quantity);
  assert.equal(current.responded_by, ids.actor);
  assert.equal(current.response_note, "Synthetic inquiry note");
  assert.equal(typeof current.reserved_until, "string");
  assert.equal(typeof current.responded_at, "string");
  assert.equal(previous.responded_at, null);
  assert.ok(Date.parse(current.reserved_until) > Date.parse(current.responded_at));
  const normalized = structuredClone(after);
  restoreFields(normalized, before, "network_part_inquiries", target.inquiry, [
    "status",
    "reserved_item_id",
    "reserved_quantity",
    "reserved_until",
    "response_note",
    "responded_at",
    "responded_by",
  ]);
  assert.deepEqual(
    normalized,
    before,
    "Only seven declared inquiry fields may change anywhere in selected graph",
  );
}
function assertAcceptanceOnly(before, after) {
  const order = row(after, "parts_orders", fresh.order);
  const line = row(after, "parts_order_lines", fresh.line);
  const item = row(after, "business_inventory_items", fresh.item);
  assert.equal(order.status, "accepted");
  assert.equal(order.supplier_note, "Synthetic transition note");
  assert.equal(typeof order.accepted_at, "string");
  assert.equal(line.accepted_quantity, "8.00");
  assert.equal(line.requested_quantity, "8.00");
  assert.equal(item.qty_on_hand, "10.00");
  assert.equal(item.qty_on_hold, "8.00");
  for (const changed of [order, line, item]) {
    assert.equal(typeof changed.updated_at, "string");
    assert.ok(Date.parse(changed.updated_at) > Date.parse(oldTime));
  }
  const newReservations = after.base.data["public.parts_reservations"].filter(
    (entry) =>
      !before.base.data["public.parts_reservations"].some((prior) => prior.id === entry.id),
  );
  assert.equal(newReservations.length, 1);
  const reservation = newReservations[0];
  assert.match(reservation.id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(
    Object.keys(reservation).sort(),
    [
      "id",
      "order_id",
      "order_line_id",
      "inventory_item_id",
      "supplier_business_id",
      "quantity",
      "expires_at",
      "released_at",
      "fulfilled_at",
      "created_by",
      "created_at",
    ].sort(),
  );
  assert.equal(reservation.order_id, fresh.order);
  assert.equal(reservation.order_line_id, fresh.line);
  assert.equal(reservation.inventory_item_id, fresh.item);
  assert.equal(reservation.supplier_business_id, ids.business);
  assert.equal(reservation.quantity, "8.00");
  assert.equal(reservation.created_by, ids.actor);
  assert.equal(reservation.released_at, null);
  assert.equal(reservation.fulfilled_at, null);
  assert.equal(
    Date.parse(reservation.expires_at) - Date.parse(reservation.created_at),
    72 * 60 * 60 * 1000,
  );
  const events = after.events.filter(
    (entry) => !before.events.some((prior) => prior.id === entry.id),
  );
  assert.equal(events.length, 1);
  const event = events[0];
  assert.deepEqual(
    Object.keys(event).sort(),
    [
      "id",
      "order_id",
      "actor_id",
      "event_type",
      "from_status",
      "to_status",
      "note",
      "metadata",
      "created_at",
    ].sort(),
  );
  assert.equal(event.order_id, fresh.order);
  assert.equal(event.actor_id, ids.actor);
  assert.equal(event.event_type, "accepted");
  assert.equal(event.from_status, "submitted");
  assert.equal(event.to_status, "accepted");
  assert.equal(event.note, "Synthetic transition note");
  assert.deepEqual(event.metadata, {});
  assert.equal(typeof event.created_at, "string");
  const normalized = structuredClone(after);
  normalized.base.data["public.parts_reservations"] = normalized.base.data[
    "public.parts_reservations"
  ].filter((entry) => entry.id !== reservation.id);
  normalized.events = normalized.events.filter((entry) => entry.id !== event.id);
  restoreFields(normalized, before, "parts_orders", fresh.order, [
    "status",
    "supplier_note",
    "accepted_at",
    "updated_at",
  ]);
  restoreFields(normalized, before, "parts_order_lines", fresh.line, [
    "accepted_quantity",
    "updated_at",
  ]);
  restoreFields(normalized, before, "business_inventory_items", fresh.item, [
    "qty_on_hold",
    "updated_at",
  ]);
  assert.deepEqual(
    normalized,
    before,
    "Actual acceptance changes only explicit fields and exactly one reservation/event",
  );
}

test("fixed extension preserves core bytes and declares all eight extra spans without runtime options", () => {
  const base = buildMixedReservationNativeSource();
  assert.equal(
    sha(read("./mixed-reservation-native-source.mjs")),
    "02daec7bfa4ac89e24f7ae0c95820e869758f3c6b61fb6cb53e5617e527bf606",
  );
  assert.equal(
    sha(source.candidateSQL),
    "80dfd6a15e15ca404ece0cb77402d3fa3280da767d5f19a1cca9e3b16436332f",
  );
  assert.deepEqual(source.setupStatements.slice(0, 66), base.setupStatements);
  assert.deepEqual(source.selectedSources.slice(0, 41), base.selectedSources);
  assert.equal(source.extraSelectedSources.length, 8);
  assert.equal(source.selectedSources.length, 49);
  assert.equal(new Set(source.selectedSources.map((entry) => entry.path)).size, 12);
  assert.equal(source.tables.length, 14);
  assert.equal(source.setupStatements.length, 75);
  assert.equal(source.metadata.spanCount, 49);
  assert.equal(source.metadata.tableCount, 14);
  assert.equal(source.metadata.setupStatementCount, 75);
  assert.deepEqual(source.baseSourceMetadata, base.metadata);
  assert.ok(Object.isFrozen(source.baseSourceMetadata));
  assert.equal(source.baseSourceMetadata.spanCount, 41);
  assert.equal(source.baseSourceMetadata.tableCount, 13);
  assert.equal(source.baseSourceMetadata.setupStatementCount, 66);
  for (const selection of source.extraSelectedSources) {
    const original = read(`../../${selection.path}`);
    assert.equal(sha(original), selection.wholeSha256);
    assert.equal(
      original
        .split("\n")
        .slice(selection.start - 1, selection.end)
        .join("\n"),
      selection.sql,
    );
    assert.equal(sha(selection.sql), selection.sha256);
  }
  assert.equal(source.transitionSignature, ORDER_SIGNATURE);
  assert.equal(source.metadata.orderExtension.sourceAuthenticatedTransitionGrantAdopted, false);
  assert.equal(source.metadata.orderExtension.nativeIndependentSessionsVerified, false);
  assert.equal(source.metadata.orderExtension.realAuthorityVerified, false);
  assert.equal(source.metadata.orderExtension.currentCatalogParityVerified, false);
  assert.equal(source.metadata.orderExtension.releaseAcceptance, false);
  assert.ok(source.limitations.some((value) => value.includes("commissions/payment/delivery")));
  assert.ok(
    source.limitations.some((value) => value.includes("global stock-writer/phantom/deadlock")),
  );
  assert.ok(Object.isFrozen(source) && Object.isFrozen(source.extraSelectedSources[0]));
  assert.throws(() => source.setupStatements.push("SELECT 1;"), TypeError);
  let reads = 0;
  assert.throws(
    () =>
      buildMixedReservationOrderSource({
        get seed() {
          reads++;
        },
      }),
    /takes no options/,
  );
  assert.equal(reads, 0);
  const module = read("./mixed-reservation-order-source.mjs");
  assert.doesNotMatch(
    module,
    /@electric-sql|child_process|createClient|\bfetch\s*\(|process\.env|\.query\s*\(|\.exec\s*\(/,
  );
});

test(
  "unchanged actual transition header/body, defaults, event FKs and three timestamp attachments are retained",
  options,
  async () => {
    await withFixture(async (db) => {
      const metadata = await one(
        db,
        `SELECT p.prosecdef,p.provolatile,p.pronargdefaults,p.prosrc,p.proconfig,
      pg_get_userbyid(p.proowner) owner FROM pg_proc p WHERE p.oid=$1::regprocedure`,
        [ORDER_SIGNATURE],
      );
      assert.equal(metadata.prosrc, source.transitionDefinition.split("AS $$")[1].split("$$;")[0]);
      assert.equal(metadata.prosecdef, true);
      assert.equal(metadata.provolatile, "v");
      assert.equal(metadata.pronargdefaults, 2);
      assert.equal(metadata.owner, "postgres");
      assert.deepEqual(metadata.proconfig, ["search_path=public, shop_manager, pg_temp"]);
      const attachments = (
        await db.query(`SELECT c.relname,t.tgname,p.proname,t.tgenabled FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid
      WHERE NOT t.tgisinternal AND p.proname='set_updated_at' ORDER BY c.relname`)
      ).rows;
      assert.deepEqual(attachments, [
        {
          relname: "business_inventory_items",
          tgname: "trg_business_inv_updated",
          proname: "set_updated_at",
          tgenabled: "O",
        },
        {
          relname: "parts_order_lines",
          tgname: "parts_order_lines_updated_at",
          proname: "set_updated_at",
          tgenabled: "O",
        },
        {
          relname: "parts_orders",
          tgname: "parts_orders_updated_at",
          proname: "set_updated_at",
          tgenabled: "O",
        },
      ]);
      const fks = (
        await db.query(`SELECT confrelid::regclass::text target,confdeltype,convalidated,condeferrable
      FROM pg_constraint WHERE conrelid='public.parts_order_events'::regclass AND contype='f' ORDER BY target`)
      ).rows;
      assert.deepEqual(fks, [
        { target: "auth.users", confdeltype: "n", convalidated: true, condeferrable: false },
        { target: "parts_orders", confdeltype: "c", convalidated: true, condeferrable: false },
      ]);
      assert.equal(
        (
          await one(
            db,
            "SELECT relrowsecurity FROM pg_class WHERE oid='public.parts_order_events'::regclass",
          )
        ).relrowsecurity,
        true,
      );
      assert.equal(
        (
          await one(
            db,
            "SELECT count(*)::integer n FROM pg_indexes WHERE indexname='parts_order_events_order_idx'",
          )
        ).n,
        1,
      );
      assert.equal(
        (
          await one(
            db,
            "SELECT count(*)::integer n FROM pg_constraint WHERE contype='f' AND connamespace IN('public'::regnamespace,'auth'::regnamespace,'shop_manager'::regnamespace)",
          )
        ).n,
        30,
      );
      assert.equal(
        (
          await one(
            db,
            "SELECT bool_and(convalidated AND NOT condeferrable AND NOT condeferred) valid FROM pg_constraint WHERE contype='f' AND connamespace IN('public'::regnamespace,'auth'::regnamespace,'shop_manager'::regnamespace)",
          )
        ).valid,
        true,
      );
    });
  },
);

test(
  "fixture-only owner execution grants no ordinary or service writer path and denied calls preserve every selected row",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await graph(db);
      for (const role of ["anon", "authenticated", "service_role"]) {
        assert.equal(
          (
            await one(db, "SELECT has_function_privilege($1,$2,'EXECUTE') allowed", [
              role,
              ORDER_SIGNATURE,
            ])
          ).allowed,
          false,
        );
        for (const sql of [
          "SELECT public.transition_parts_network_order('51000000-0000-4000-8000-000000000001','accepted',NULL,72)",
          "SELECT mixed_reservation_candidate.reserve_inquiry(NULL,NULL,NULL,NULL,2,24,NULL)",
        ]) {
          await db.exec(`BEGIN; SET LOCAL ROLE ${role};`);
          await assert.rejects(db.exec(sql), code("42501"));
          await db.exec("ROLLBACK;");
          assert.deepEqual(await graph(db), before);
        }
      }
    });
  },
);

test(
  "original seeded hold8 still rejects inquiry5 and allows2 without reconciling its deliberately synthetic counter0",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await graph(db);
      assert.equal(row(before, "business_inventory_items", ids.item).qty_on_hold, "0");
      const target = { item: ids.item, inquiry: ids.inquiry };
      await assert.rejects(inquiry(db, "5", target), code("22023"));
      assert.deepEqual(await graph(db), before);
      const ack = await inquiry(db, "2", target);
      assert.equal(ack.orderHolds, "8.00");
      assert.equal(ack.availableAfter, "0.00");
      assertInquiryOnly(before, await graph(db), target, "2.00");
    });
  },
);

test(
  "fresh actual B2B acceptance creates coherent8 hold/counter/event then rejects5 and permits inquiry2",
  options,
  async () => {
    await withFixture(async (db) => {
      await seedFresh(db);
      const before = await graph(db);
      assert.equal(before.events.length, 0);
      assert.equal(
        before.base.data["public.parts_reservations"].filter(
          (entry) => entry.order_id === fresh.order,
        ).length,
        0,
      );
      assert.deepEqual(await transition(db), { id: fresh.order, status: "accepted" });
      const accepted = await graph(db);
      assertAcceptanceOnly(before, accepted);
      await assert.rejects(inquiry(db, "5"), code("22023"));
      assert.deepEqual(await graph(db), accepted);
      const ack = await inquiry(db, "2");
      assert.equal(ack.orderHolds, "8.00");
      assert.equal(ack.availableAfter, "0.00");
      assertInquiryOnly(accepted, await graph(db), fresh, "2.00");
      assert.equal(
        (await one(db, "SELECT public.active_reservation_qty($1)::text total", [fresh.item])).total,
        "10.00",
      );
    });
  },
);

test(
  "inquiry5 before actual acceptance8 rejects B2B without partial event, counter, reservation or timestamp writes",
  options,
  async () => {
    await withFixture(async (db) => {
      await seedFresh(db);
      const before = await graph(db);
      await inquiry(db, "5");
      const held = await graph(db);
      assertInquiryOnly(before, held, fresh, "5.00");
      await assert.rejects(transition(db), code("P0001"));
      assert.deepEqual(await graph(db), held);
      assert.equal(held.events.length, 0);
      assert.equal(row(held, "parts_orders", fresh.order).status, "submitted");
      assert.equal(row(held, "business_inventory_items", fresh.item).qty_on_hold, "0");
    });
  },
);

test(
  "inquiry2 before actual acceptance8 succeeds with combined10 and retains all other inquiry/core state",
  options,
  async () => {
    await withFixture(async (db) => {
      await seedFresh(db);
      await inquiry(db, "2");
      const before = await graph(db);
      assert.deepEqual(await transition(db), { id: fresh.order, status: "accepted" });
      assertAcceptanceOnly(before, await graph(db));
      assert.equal(
        (await one(db, "SELECT public.active_reservation_qty($1)::text total", [fresh.item])).total,
        "10.00",
      );
    });
  },
);

test(
  "actual cancellation releases its coherent hold/counter and appends event; inquiry can use freed stock without shipment claims",
  options,
  async () => {
    await withFixture(async (db) => {
      await seedFresh(db);
      await transition(db);
      const before = await graph(db);
      assert.deepEqual(await transition(db, "cancelled"), { id: fresh.order, status: "cancelled" });
      const cancelled = await graph(db);
      const order = row(cancelled, "parts_orders", fresh.order);
      assert.equal(order.status, "cancelled");
      assert.equal(typeof order.completed_at, "string");
      assert.equal(row(cancelled, "business_inventory_items", fresh.item).qty_on_hold, "0.00");
      const reservation = cancelled.base.data["public.parts_reservations"].find(
        (entry) => entry.order_id === fresh.order,
      );
      assert.equal(typeof reservation.released_at, "string");
      assert.equal(reservation.fulfilled_at, null);
      const newEvents = cancelled.events.filter(
        (event) => !before.events.some((prior) => prior.id === event.id),
      );
      assert.equal(newEvents.length, 1);
      assert.equal(newEvents[0].from_status, "accepted");
      assert.equal(newEvents[0].to_status, "cancelled");
      assert.equal(newEvents[0].actor_id, ids.actor);
      assert.equal(newEvents[0].order_id, fresh.order);
      assert.equal(newEvents[0].event_type, "cancelled");
      assert.equal(newEvents[0].note, "Synthetic transition note");
      assert.deepEqual(newEvents[0].metadata, {});
      assert.equal(typeof newEvents[0].created_at, "string");
      assert.deepEqual(
        Object.keys(newEvents[0]).sort(),
        [
          "id",
          "order_id",
          "actor_id",
          "event_type",
          "from_status",
          "to_status",
          "note",
          "metadata",
          "created_at",
        ].sort(),
      );
      const normalized = structuredClone(cancelled);
      restoreFields(normalized, before, "parts_orders", fresh.order, [
        "status",
        "completed_at",
        "updated_at",
      ]);
      restoreFields(normalized, before, "business_inventory_items", fresh.item, [
        "qty_on_hold",
        "updated_at",
      ]);
      normalized.base.data["public.parts_reservations"].find(
        (entry) => entry.id === reservation.id,
      ).released_at = null;
      normalized.events = normalized.events.filter((event) => event.id !== newEvents[0].id);
      assert.deepEqual(normalized, before);
      assert.equal(
        (await one(db, "SELECT public.active_reservation_qty($1)::text total", [fresh.item])).total,
        "0",
      );
      await inquiry(db, "10");
      assertInquiryOnly(cancelled, await graph(db), fresh, "10.00");
    });
  },
);

test(
  "a real late event Auth FK fails after actual acceptance work and rolls every selected row/catalog back",
  options,
  async () => {
    await withFixture(async (db) => {
      await seedFresh(db);
      await db.exec(`CREATE FUNCTION public.lab_order_event_fk_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NOT EXISTS(SELECT 1 FROM public.parts_orders WHERE id=NEW.order_id AND status='accepted')
        OR NOT EXISTS(SELECT 1 FROM public.parts_order_lines WHERE order_id=NEW.order_id AND accepted_quantity=8)
        OR NOT EXISTS(SELECT 1 FROM public.parts_reservations WHERE order_id=NEW.order_id AND quantity=8)
        OR NOT EXISTS(SELECT 1 FROM public.business_inventory_items WHERE id='${fresh.item}' AND qty_on_hold=8)
      THEN RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Fixture work witness absent'; END IF;
      NEW.actor_id:='${ids.absent}'; RETURN NEW; END $$;
      CREATE TRIGGER lab_order_event_fk BEFORE INSERT ON public.parts_order_events
      FOR EACH ROW EXECUTE FUNCTION public.lab_order_event_fk_fault();`);
      const before = await graph(db);
      await assert.rejects(transition(db), code("23503"));
      assert.deepEqual(await graph(db), before);
    });
  },
);

test(
  "candidate late event FK fails after its real inquiry write and preserves events plus all base rows/catalog",
  options,
  async () => {
    await withFixture(async (db) => {
      await seedFresh(db);
      await db.exec(`CREATE FUNCTION public.lab_inquiry_event_fk_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.id='${fresh.inquiry}' THEN
        IF NEW.reserved_quantity IS DISTINCT FROM 2 OR NEW.status IS DISTINCT FROM 'accepted'
        THEN RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Fixture inquiry witness absent'; END IF;
        INSERT INTO public.parts_order_events(order_id,actor_id,event_type)
        VALUES('${fresh.order}','${ids.absent}','synthetic late fault');
      END IF; RETURN NEW; END $$;
      CREATE TRIGGER lab_inquiry_event_fk AFTER UPDATE ON public.network_part_inquiries
      FOR EACH ROW EXECUTE FUNCTION public.lab_inquiry_event_fk_fault();`);
      const before = await graph(db);
      await assert.rejects(inquiry(db, "2"), code("23503"));
      assert.deepEqual(await graph(db), before);
    });
  },
);

test(
  "actual retained CHECK/FK/NOT NULL controls stay enforced without constraint relaxation",
  options,
  async () => {
    await withFixture(async (db) => {
      await seedFresh(db);
      for (const [sql, parameters, expected] of [
        [
          "UPDATE public.parts_order_lines SET accepted_quantity=9 WHERE id=$1",
          [fresh.line],
          "23514",
        ],
        [
          "INSERT INTO public.parts_order_events(order_id,event_type) VALUES($1,'synthetic')",
          [ids.absent],
          "23503",
        ],
        [
          "INSERT INTO public.parts_order_events(order_id,event_type) VALUES($1,NULL)",
          [fresh.order],
          "23502",
        ],
      ]) {
        const before = await graph(db);
        await assert.rejects(actor(db, sql, parameters), code(expected));
        assert.deepEqual(await graph(db), before);
      }
    });
  },
);

test(
  "outer ROLLBACK after successful real acceptance and inquiry restores the entire selected graph, not durable outcomes",
  options,
  async () => {
    await withFixture(async (db) => {
      await seedFresh(db);
      const before = await graph(db);
      await db.exec("BEGIN;");
      try {
        await db.query("SELECT set_config('test.user',$1,true)", [ids.actor]);
        const ack = await one(
          db,
          "SELECT public.transition_parts_network_order($1,'accepted',NULL,72) ack",
          [fresh.order],
        );
        assert.deepEqual(ack.ack, { id: fresh.order, status: "accepted" });
        await db.query(
          "SELECT mixed_reservation_candidate.reserve_inquiry($1,$2,$3,$4,2,24,NULL)",
          [ids.actor, ids.business, fresh.inquiry, fresh.item],
        );
        assert.equal(
          (
            await one(
              db,
              "SELECT count(*)::integer n FROM public.parts_order_events WHERE order_id=$1",
              [fresh.order],
            )
          ).n,
          1,
        );
        assert.equal(
          (await one(db, "SELECT public.active_reservation_qty($1)::text total", [fresh.item]))
            .total,
          "10.00",
        );
      } finally {
        await db.exec("ROLLBACK;");
      }
      assert.deepEqual(await graph(db), before);
    });
  },
);

test(
  "null/other actor and invalid transition reject with unchanged graph, not verified membership or API policy",
  options,
  async () => {
    await withFixture(async (db) => {
      await seedFresh(db);
      for (const [status, subject] of [
        ["accepted", null],
        ["accepted", ids.outsider],
        ["shipped", ids.actor],
      ]) {
        const before = await graph(db);
        await assert.rejects(transition(db, status, subject), code("P0001"));
        assert.deepEqual(await graph(db), before);
      }
    });
  },
);
