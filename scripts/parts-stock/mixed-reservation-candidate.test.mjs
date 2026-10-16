// Actual selected SQL in closed sequential memory fixtures. Synthetic owner,
// uid/GUC and manager positives are NOT real Auth/native authority acceptance.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  actor,
  ids,
  limitations,
  readCandidate,
  selectedSources,
  SIGNATURE,
  snapshot,
  tables,
  withMixedReservationFixture,
} from "./mixed-reservation-fixture.mjs";

const sql = readCandidate();
const sqlSha = "80dfd6a15e15ca404ece0cb77402d3fa3280da767d5f19a1cca9e3b16436332f";
const hash = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(hash(sql), sqlSha, "candidate LF bytes must match before any SQL fixture runs");
const one = async (db, query, parameters = []) => (await db.query(query, parameters)).rows[0];
const request = (overrides = {}) => ({
  account: ids.actor,
  business: ids.business,
  inquiry: ids.inquiry,
  item: ids.item,
  quantity: "2",
  hours: 24,
  note: null,
  ...overrides,
});
async function reserve(db, overrides = {}, subject = ids.actor) {
  const value = request(overrides);
  const result = await actor(
    db,
    "SELECT mixed_reservation_candidate.reserve_inquiry($1,$2,$3,$4,$5::numeric,$6::integer,$7) AS ack",
    [
      value.account,
      value.business,
      value.inquiry,
      value.item,
      value.quantity,
      value.hours,
      value.note,
    ],
    subject,
  );
  return result.rows[0].ack;
}
async function fixture(run, options) {
  return withMixedReservationFixture(async (db) => {
    await db.exec(sql);
    return run(db);
  }, options);
}
const failure = (code) => (error) => {
  assert.equal(error.code, code);
  assert.equal(error.message, "Stock reservation failed.");
  assert.ok(!error.detail && !error.hint);
  return true;
};
async function unchangedRejection(db, overrides, code, subject = ids.actor) {
  const before = await snapshot(db);
  await assert.rejects(reserve(db, overrides, subject), failure(code));
  assert.deepEqual(await snapshot(db), before);
}

test("pinned selected retained definitions preserve every whole source/selection and explicit partial-authority limits", () => {
  assert.equal(hash(sql), sqlSha);
  assert.equal(new Set(selectedSources.map((source) => source.path)).size, 12);
  assert.equal(selectedSources.length, 41);
  assert.equal(tables.length, 13);
  for (const selection of selectedSources) {
    const source = fs
      .readFileSync(new URL(`../../${selection.path}`, import.meta.url), "utf8")
      .replace(/\r\n/g, "\n");
    assert.equal(hash(source), selection.wholeSha256);
    assert.equal(
      source
        .split("\n")
        .slice(selection.start - 1, selection.end)
        .join("\n"),
      selection.sql,
    );
    assert.equal(hash(selection.sql), selection.sha256);
    assert.ok(selection.sql.endsWith(";"));
  }
  assert.ok(
    limitations.some((value) => value.includes("NOT original-human/JWT/session/native authority")),
  );
  assert.ok(limitations.some((value) => value.includes("NOT current catalog")));
  assert.ok(limitations.some((value) => value.includes("durable outcome/idempotency/retry")));
});

test("candidate is private INVOKER with owner-only publication and exact local lock/accounting order, never stock/money/order writes", () => {
  assert.match(sql, /BEGIN;[\s\S]*CREATE SCHEMA mixed_reservation_candidate;/);
  assert.match(sql, /COMMIT;\s*$/);
  assert.match(sql, /LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp/);
  assert.doesNotMatch(sql, /SECURITY DEFINER|CREATE OR REPLACE|\bGRANT\b/i);
  assert.match(sql, /FROM PUBLIC,anon,authenticated,service_role/);
  assert.match(
    sql,
    /q\.id=p_inquiry_id FOR UPDATE;[\s\S]*i\.id=p_item_id FOR UPDATE;[\s\S]*SELECT q\.\* INTO v_current/,
  );
  assert.match(
    sql,
    /q\.id<>p_inquiry_id[\s\S]*FROM public\.parts_reservations r JOIN public\.parts_orders o/,
  );
  assert.match(sql, /r\.released_at IS NULL AND r\.fulfilled_at IS NULL/);
  assert.match(sql, /r\.expires_at>now\(\) OR o\.status IN\('picking','ready'\)/);
  assert.match(sql, /v_quantity IS DISTINCT FROM p_quantity/);
  assert.doesNotMatch(
    sql,
    /\b(?:INSERT INTO|DELETE FROM|UPDATE) public\.(?:business_inventory_items|business_inventory_movements|parts_orders|parts_order_lines|parts_reservations)/,
  );
  assert.equal((sql.match(/UPDATE public\.network_part_inquiries SET/g) ?? []).length, 1);
  assert.doesNotMatch(sql, /SET qty_on_hold|SET qty_on_hand|v_available := GREATEST|round\(/i);
});

test("complete selected physical constraints/FKs/numeric types and native stamp trigger actually install without happy-role grants", async () => {
  await fixture(async (db) => {
    const state = await snapshot(db);
    const foreign = state.catalog.constraints.filter((row) => row.contype === "f");
    assert.equal(foreign.length, 28);
    assert.ok(foreign.every((row) => row.convalidated && !row.condeferrable));
    for (const [table, column] of [
      ["business_inventory_items", "qty_on_hand"],
      ["network_part_inquiries", "reserved_quantity"],
      ["parts_reservations", "quantity"],
    ]) {
      const field = state.catalog.columns.find(
        (row) => row.relname === table && row.attname === column,
      );
      assert.equal(field.type, "numeric(12,2)");
    }
    assert.equal(
      state.catalog.columns.find(
        (row) => row.relname === "business_inventory_items" && row.attname === "qty_on_hold",
      ).type,
      "numeric",
    );
    assert.ok(
      state.catalog.triggers.some(
        (row) =>
          row.relname === "network_part_inquiries" &&
          row.tgname === "trg_npi_stamp_response" &&
          row.tgenabled === "O",
      ),
    );
    assert.ok(
      state.catalog.constraints.some(
        (row) => row.conname === "network_part_inquiries_status_check",
      ),
    );
    assert.ok(
      state.catalog.constraints.some(
        (row) => row.conname === "parts_reservations_order_line_id_key",
      ),
    );
    assert.deepEqual(
      await one(db, "SELECT public.active_reservation_qty($1)::text AS total", [ids.item]),
      { total: "8.00" },
    );
  });
});

test("ordinary anon/authenticated/service candidate calls deny, owner-only positive is not an authority bridge", async () => {
  await fixture(async (db) => {
    const before = await snapshot(db);
    for (const role of ["anon", "authenticated", "service_role"]) {
      assert.deepEqual(
        await one(
          db,
          "SELECT has_schema_privilege($1,'mixed_reservation_candidate','USAGE') AS usage,has_function_privilege($1,$2,'EXECUTE') AS execute",
          [role, SIGNATURE],
        ),
        { usage: false, execute: false },
      );
      await db.exec("BEGIN");
      try {
        await db.exec(`SET LOCAL ROLE ${role}`);
        await assert.rejects(
          db.query("SELECT mixed_reservation_candidate.reserve_inquiry($1,$2,$3,$4,2,24,NULL)", [
            ids.actor,
            ids.business,
            ids.inquiry,
            ids.item,
          ]),
          (error) => error.code === "42501",
        );
      } finally {
        await db.exec("ROLLBACK");
      }
      assert.deepEqual(await snapshot(db), before);
    }
    const definition = (await snapshot(db)).catalog.functions.filter(
      (row) => row.nspname === "mixed_reservation_candidate",
    );
    assert.equal(definition.length, 1);
    assert.equal(definition[0].prosecdef, false);
    assert.ok(definition[0].proconfig.includes("search_path=pg_catalog, pg_temp"));
  });
});

test("legacy inquiry path admits5 despite stock10/B2B8, proving the actual mixed-family over-admission without fixing live source", async () => {
  await withMixedReservationFixture(async (db) => {
    const before = await snapshot(db);
    const result = await actor(
      db,
      "SELECT public.reserve_network_inquiry($1,$2,5,24,NULL) AS ack",
      [ids.inquiry, ids.business],
    );
    assert.equal(result.rows[0].ack.reserved_quantity, 5);
    assert.deepEqual(
      await one(db, "SELECT public.active_reservation_qty($1)::text AS total", [ids.item]),
      { total: "13.00" },
    );
    const after = await snapshot(db);
    assert.deepEqual(
      after.data["public.parts_reservations"],
      before.data["public.parts_reservations"],
    );
    assert.deepEqual(
      after.data["public.business_inventory_items"],
      before.data["public.business_inventory_items"],
    );
  });
});

test("candidate rejects5/permits2 against stock10/B2B8, changing only the matching inquiry with exact received acknowledgment", async () => {
  await fixture(async (db) => {
    await unchangedRejection(db, { quantity: "5" }, "22023");
    const before = await snapshot(db);
    const ack = await reserve(db, { note: "Synthetic hold" });
    assert.deepEqual(
      Object.keys(ack).sort(),
      [
        "accountId",
        "availableAfter",
        "availableBefore",
        "businessId",
        "inquiryId",
        "itemId",
        "orderHolds",
        "otherInquiryHolds",
        "quantity",
        "reservedUntil",
      ].sort(),
    );
    assert.equal(ack.accountId, ids.actor);
    assert.equal(ack.businessId, ids.business);
    assert.equal(ack.inquiryId, ids.inquiry);
    assert.equal(ack.itemId, ids.item);
    assert.equal(ack.quantity, "2.00");
    assert.equal(ack.orderHolds, "8.00");
    assert.equal(ack.otherInquiryHolds, "0");
    assert.equal(ack.availableBefore, "2.00");
    assert.equal(ack.availableAfter, "0.00");
    const after = await snapshot(db);
    const row = after.data["public.network_part_inquiries"].find(
      (value) => value.id === ids.inquiry,
    );
    assert.equal(row.reserved_until, ack.reservedUntil);
    assert.equal(row.reserved_quantity, ack.quantity);
    assert.equal(row.responded_by, ids.actor);
    assert.equal(typeof row.responded_at, "string");
    assert.ok(row.responded_at.length > 0);
    assert.equal(row.status, "accepted");
    assert.equal(row.response_note, "Synthetic hold");
    assert.deepEqual(
      await one(db, "SELECT public.active_reservation_qty($1)::text AS total", [ids.item]),
      { total: "10.00" },
    );
    // Only the intended native response/hold fields may differ in this fixture.
    const normalized = structuredClone(after);
    const previousRow = before.data["public.network_part_inquiries"].find(
      (value) => value.id === ids.inquiry,
    );
    const normalizedRow = normalized.data["public.network_part_inquiries"].find(
      (value) => value.id === ids.inquiry,
    );
    assert.equal(previousRow.responded_at, null);
    for (const field of [
      "status",
      "reserved_item_id",
      "reserved_quantity",
      "reserved_until",
      "response_note",
      "responded_at",
      "responded_by",
    ])
      normalizedRow[field] = previousRow[field];
    assert.deepEqual(normalized, before);
  });
});

test("self replacement excludes only current inquiry, still counts another same-business inquiry and never double-counts qty_on_hold", async () => {
  await fixture(async (db) => {
    await db.query(
      "UPDATE public.network_part_inquiries SET status='accepted',reserved_item_id=$1,reserved_quantity=1,reserved_until=now()+interval '1 day' WHERE id=$2",
      [ids.item, ids.inquiry],
    );
    await db.query(
      "UPDATE public.network_part_inquiries SET status='accepted',reserved_item_id=$1,reserved_quantity=0.50,reserved_until=now()+interval '1 day' WHERE id=$2",
      [ids.item, ids.otherInquiry],
    );
    await db.query(
      "UPDATE public.business_inventory_items SET qty_on_hold=9999.123456 WHERE id=$1",
      [ids.item],
    );
    await unchangedRejection(db, { quantity: "2" }, "22023");
    const ack = await reserve(db, { quantity: "1.50" });
    assert.equal(ack.otherInquiryHolds, "0.50");
    assert.equal(ack.orderHolds, "8.00");
    assert.equal(ack.availableAfter, "0.00");
    assert.deepEqual(
      await one(
        db,
        "SELECT qty_on_hold::text AS counter FROM public.business_inventory_items WHERE id=$1",
        [ids.item],
      ),
      { counter: "9999.123456" },
    );
    assert.deepEqual(
      await one(db, "SELECT public.active_reservation_qty($1)::text AS total", [ids.item]),
      { total: "10.00" },
    );
  });
});

test("actual B2B released/fulfilled/expiry and picking-ready predicates are preserved; current inquiry exclusion is not a lifecycle reset", async () => {
  await fixture(async (db) => {
    for (const [status, expiry, released, fulfilled, expected] of [
      ["accepted", "future", false, false, "8.00"],
      ["accepted", "past", false, false, "0"],
      ["picking", "past", false, false, "8.00"],
      ["ready", "past", false, false, "8.00"],
      ["shipped", "past", false, false, "0"],
      ["cancelled", "future", false, false, "8.00"],
      ["received", "future", false, false, "8.00"],
      ["ready", "past", true, false, "0"],
      ["picking", "future", false, true, "0"],
    ]) {
      await db.exec("BEGIN");
      try {
        await db.query("SELECT set_config('test.user',$1,true)", [ids.actor]);
        await db.query("UPDATE public.parts_orders SET status=$1 WHERE id=$2", [status, ids.order]);
        // Keep actual expires_at>created_at CHECK intact in expired cohorts.
        await db.query(
          "UPDATE public.parts_reservations SET created_at=now()-interval '2 days',expires_at=CASE WHEN $1='past' THEN now()-interval '1 day' ELSE now()+interval '1 day' END,released_at=CASE WHEN $2 THEN now() END,fulfilled_at=CASE WHEN $3 THEN now() END WHERE id=$4",
          [expiry, released, fulfilled, ids.reservation],
        );
        const ack = (
          await one(
            db,
            "SELECT mixed_reservation_candidate.reserve_inquiry($1,$2,$3,$4,2,24,NULL) AS ack",
            [ids.actor, ids.business, ids.inquiry, ids.item],
          )
        ).ack;
        assert.equal(ack.orderHolds, expected, `${status}/${expiry}/${released}/${fulfilled}`);
      } finally {
        await db.exec("ROLLBACK");
      }
    }
  });
});

test("inquiry accepted/unexpired predicates preserve other statuses, expired/null expiry and unrelated item holds", async () => {
  await fixture(async (db) => {
    for (const [status, expiry, target, quantity, expected] of [
      ["accepted", "future", ids.item, "0.50", "0.50"],
      ["accepted", "past", ids.item, "8", "0"],
      ["accepted", null, ids.item, "8", "0"],
      ["pending", "future", ids.item, "8", "0"],
      ["fulfilled", "future", ids.item, "8", "0"],
      ["closed", "future", ids.item, "8", "0"],
      ["accepted", "future", ids.otherItem, "8", "0"],
    ]) {
      await db.exec("BEGIN");
      try {
        await db.query("SELECT set_config('test.user',$1,true)", [ids.actor]);
        await db.query(
          "UPDATE public.network_part_inquiries SET status=$1,reserved_item_id=$2,reserved_quantity=$3::numeric,reserved_until=CASE WHEN $4='future' THEN now()+interval '1 day' WHEN $4='past' THEN now()-interval '1 day' END WHERE id=$5",
          [status, target, quantity, expiry, ids.otherInquiry],
        );
        const ack = (
          await one(
            db,
            "SELECT mixed_reservation_candidate.reserve_inquiry($1,$2,$3,$4,1.50,24,NULL) AS ack",
            [ids.actor, ids.business, ids.inquiry, ids.item],
          )
        ).ack;
        assert.equal(ack.otherInquiryHolds, expected, `${status}/${expiry}/${target}`);
      } finally {
        await db.exec("ROLLBACK");
      }
    }
  });
});

test("exact NUMERIC decimals/scientific notation admit without JS/SQL rounding, while unsupported precision/nonfinite/range refuse", async () => {
  await fixture(async (db) => {
    for (const quantity of [
      null,
      "0",
      "-1",
      "NaN",
      "Infinity",
      "-Infinity",
      "0.001",
      "1.999",
      "10000000000",
    ]) {
      await unchangedRejection(db, { quantity }, "22023");
    }
    const ack = await reserve(db, { quantity: "2.0000" });
    assert.equal(ack.quantity, "2.00");
  });
  await fixture(
    async (db) => {
      const ack = await reserve(db, { quantity: "2e-2" });
      assert.equal(ack.quantity, "0.02");
      assert.equal(ack.availableAfter, "0.00");
    },
    { stock: "0.03", b2bHold: "0.01" },
  );
  await fixture(
    async (db) => {
      const ack = await reserve(db, { quantity: "9999999999.98" });
      assert.equal(ack.quantity, "9999999999.98");
      assert.equal(ack.availableAfter, "0.00");
    },
    { stock: "9999999999.99", b2bHold: "0.01" },
  );
});

test("negative/nonfinite stock or inconsistent active hold totals are refused rather than clamped", async () => {
  await fixture(async (db) => {
    for (const stock of ["-1", "NaN", "7.99"]) {
      await db.query(
        "UPDATE public.business_inventory_items SET qty_on_hand=$1::numeric WHERE id=$2",
        [stock, ids.item],
      );
      await unchangedRejection(db, {}, "55000");
    }
  });
});

test("malformed active holds cannot reduce/mask combined stock requirements; inactive source cohorts remain excluded", async () => {
  await fixture(async (db) => {
    for (const quantity of [null, "NaN", "-1", "0"]) {
      await db.query(
        "UPDATE public.network_part_inquiries SET status='accepted',reserved_item_id=$1,reserved_quantity=$2::numeric,reserved_until=now()+interval '1 day' WHERE id=$3",
        [ids.item, quantity, ids.otherInquiry],
      );
      await unchangedRejection(db, {}, "55000");
    }
    await db.query("UPDATE public.network_part_inquiries SET status='closed' WHERE id=$1", [
      ids.otherInquiry,
    ]);
    await db.query("UPDATE public.parts_reservations SET quantity='NaN'::numeric WHERE id=$1", [
      ids.reservation,
    ]);
    await unchangedRejection(db, {}, "55000");
    await db.query("UPDATE public.parts_reservations SET released_at=now() WHERE id=$1", [
      ids.reservation,
    ]);
    assert.equal((await reserve(db)).availableAfter, "8.00");
  });
});

test("exact actor/business/inquiry/item binding and original hold-hour limits fail closed with whole state preserved", async () => {
  await fixture(async (db) => {
    for (const overrides of [
      { account: ids.outsider },
      { business: ids.otherBusiness },
      { inquiry: ids.absent },
      { item: ids.otherItem },
      { item: ids.absent },
    ])
      await unchangedRejection(db, overrides, "42501");
    await unchangedRejection(db, {}, "42501", ids.outsider);
    await unchangedRejection(db, {}, "42501", null);
    for (const hours of [null, 0, -1, 169]) await unchangedRejection(db, { hours }, "22023");
    await db.query("UPDATE public.business_inventory_items SET business_id=$1 WHERE id=$2", [
      ids.otherBusiness,
      ids.item,
    ]);
    await unchangedRejection(db, {}, "42501");
  });
});

test("real late movement FK23503 after inquiry UPDATE rolls all selected data/catalog back with generic diagnostics", async () => {
  await fixture(async (db) => {
    await db.exec(`CREATE FUNCTION public.lab_mixed_late_fk() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.status='accepted' THEN
        IF NOT EXISTS(SELECT 1 FROM public.network_part_inquiries WHERE id=NEW.id AND reserved_quantity=2)
          THEN RAISE EXCEPTION 'Synthetic late precondition'; END IF;
        INSERT INTO public.business_inventory_movements(item_id,business_id,delta,reason)
        VALUES('${ids.absent}',NEW.business_id,1,'Synthetic late fault');
      END IF; RETURN NEW; END $$;
      CREATE TRIGGER lab_mixed_late_fk AFTER UPDATE ON public.network_part_inquiries FOR EACH ROW EXECUTE FUNCTION public.lab_mixed_late_fk();`);
    await unchangedRejection(db, {}, "23503");
    assert.equal((await snapshot(db)).data["public.business_inventory_movements"].length, 0);
  });
});

test("synthetic suppressed/rewritten acknowledgment and inventory side effects cannot falsely succeed", async () => {
  await fixture(async (db) => {
    for (const body of ["RETURN NULL;", "NEW.reserved_quantity:=1; RETURN NEW;"]) {
      await db.exec(`CREATE FUNCTION public.lab_mixed_before() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${body} END $$;
        CREATE TRIGGER lab_mixed_before BEFORE UPDATE ON public.network_part_inquiries FOR EACH ROW EXECUTE FUNCTION public.lab_mixed_before();`);
      await unchangedRejection(db, {}, "55000");
      await db.exec(
        "DROP TRIGGER lab_mixed_before ON public.network_part_inquiries; DROP FUNCTION public.lab_mixed_before()",
      );
    }
    await db.exec(`CREATE FUNCTION public.lab_mixed_after() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      UPDATE public.business_inventory_items SET qty_on_hand=qty_on_hand-1 WHERE id=NEW.item_id;
      RETURN NEW; END $$;
      CREATE TRIGGER lab_mixed_after AFTER UPDATE ON public.network_part_inquiries FOR EACH ROW EXECUTE FUNCTION public.lab_mixed_after();`);
    await unchangedRejection(db, {}, "55000");
  });
});

test("outer ROLLBACK restores the whole selected graph after successful statement; result is not durable retry/COMMIT proof", async () => {
  await fixture(async (db) => {
    const before = await snapshot(db);
    await db.exec("BEGIN");
    try {
      await db.query("SELECT set_config('test.user',$1,true)", [ids.actor]);
      const ack = (
        await one(
          db,
          "SELECT mixed_reservation_candidate.reserve_inquiry($1,$2,$3,$4,2,24,NULL) AS ack",
          [ids.actor, ids.business, ids.inquiry, ids.item],
        )
      ).ack;
      assert.equal(ack.quantity, "2.00");
      assert.deepEqual(
        await one(db, "SELECT public.active_reservation_qty($1)::text AS total", [ids.item]),
        { total: "10.00" },
      );
    } finally {
      await db.exec("ROLLBACK");
    }
    assert.deepEqual(await snapshot(db), before);
  });
});
