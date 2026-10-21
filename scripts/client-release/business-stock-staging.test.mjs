// Execute the complete deployment package with BOTH retained staff and stock graphs.
// Auth/session support and public business support remain synthetic, not hosted JWT acceptance.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildBusinessStockRelease } from "./build-business-stock-release.mjs";
import { buildBusinessStockStagingRelease } from "./build-business-stock-staging-release.mjs";
import { buildMixedReservationOrderSource } from "../parts-stock/mixed-reservation-order-source.mjs";
import {
  withFixture,
  actor,
  id,
  seedSession,
  membership,
  binding,
  roles,
  catalog,
} from "../ci/fixtures/native-staff-trigger-fixture.mjs";

const sql = buildBusinessStockStagingRelease();
const suspend = fs.readFileSync(
  new URL("../../supabase/releases/business-stock-suspend-v1.sql", import.meta.url),
  "utf8",
);
const opts = { timeout: 30000, concurrency: false };
const item = "32000000-0000-4000-8000-000000000001";
const session = "72000000-0000-4000-8000-000000000001";
const operation = "82000000-0000-4000-8000-000000000001";
const retained = buildMixedReservationOrderSource();
async function prepare(db) {
  for (const name of [
    "catalog",
    "inventory",
    "movements",
    "networkInventory",
    "inquiries",
    "statusConstraintDrop",
    "statusDefaultConstraint",
    "holdColumns",
    "inventoryExtensions",
    "locations",
    "inventoryLocationColumns",
    "workOrders",
    "orderSequence",
    "orders",
    "orderLines",
    "reservations",
    "inventoryTimestamp",
  ]) {
    const source = retained.selectedSources.find((s) => s.name === name);
    assert.ok(source, `Required original stock source ${name}`);
    await db.exec(source.sql);
  }
  // Test-only Auth support; do not alter production Auth in a release package.
  await db.exec(`ALTER TABLE auth.users ADD COLUMN deleted_at timestamptz,
    ADD COLUMN banned_until timestamptz, ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;
    CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id),not_after timestamptz);
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;`);
  await db.query("INSERT INTO auth.sessions(id,user_id) VALUES($1,$2)", [session, id.ownerA]);
  await db.query(
    "INSERT INTO public.business_inventory_items(id,business_id,name,qty_on_hand) VALUES($1,$2,'Synthetic staging part',10)",
    [item, id.businessA],
  );
}
async function draft(db) {
  const row = (
    await db.query(
      `SELECT qty_on_hand::text quantity,
    to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.USTZH:TZM') stamp
    FROM public.business_inventory_items WHERE id=$1`,
      [item],
    )
  ).rows[0];
  return {
    version: 1,
    operationId: operation,
    expectedAccountId: id.ownerA,
    businessId: id.businessA,
    itemId: item,
    expectedUpdatedAt: row.stamp,
    expectedQuantity: row.quantity,
    delta: "2.00",
    reason: "Staging count",
  };
}
async function call(db, request, inspect = false) {
  await db.exec("BEGIN; SET LOCAL ROLE authenticated");
  try {
    await db.query(
      "SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
      [
        id.ownerA,
        JSON.stringify({
          sub: id.ownerA,
          role: "authenticated",
          session_id: session,
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ],
    );
    const r = await db.query("SELECT public.business_stock_operation_v1($1::jsonb,$2) result", [
      JSON.stringify(request),
      inspect,
    ]);
    await db.exec("COMMIT");
    return r.rows[0].result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
async function receipts(db) {
  return (
    await db.query(`SELECT jsonb_build_object(
    'outcomes',(SELECT jsonb_agg(to_jsonb(o) ORDER BY operation_id) FROM business_stock_operations_v1.outcomes o),
    'movements',(SELECT jsonb_agg(to_jsonb(m) ORDER BY id) FROM public.business_inventory_movements m),
    'stock',(SELECT qty_on_hand::text FROM public.business_inventory_items WHERE id='${item}')
  ) state`)
  ).rows[0].state;
}

test("complete package retains one outer transaction and includes both lifecycle replacements", () => {
  assert.equal((sql.match(/^BEGIN;$/gm) || []).length, 1);
  assert.equal((sql.match(/^COMMIT;$/gm) || []).length, 1);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.trg_staff_sync_team_thread/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION shop_manager\.sync_business_staff_member/);
  assert.match(sql, /Retained staff lifecycle source differs/);
  assert.throws(() => buildBusinessStockStagingRelease({}), /No staging package options/);
});

test(
  "previous package reproduces failed deactivation under retained status constraints",
  opts,
  () =>
    withFixture(async (db) => {
      await prepare(db);
      await db.exec(buildBusinessStockRelease());
      await assert.rejects(
        actor(db, id.ownerA, "UPDATE public.business_staff SET active=false WHERE id=$1", [
          id.staffA,
        ]),
        (e) => e.code === "23514",
      );
      assert.deepEqual(await membership(db, id.threadA, id.actor), ["active"]);
    }),
);

test(
  "full package permits stock adjustment AND deactivation without inventing cash counts",
  opts,
  () =>
    withFixture(async (db, { user, profile }) => {
      await prepare(db);
      const till = await seedSession(db, user, profile, id.shopA);
      const before = await catalog(db);
      await db.exec(sql);
      const request = await draft(db),
        result = await call(db, request);
      assert.equal(result.status, "completed");
      assert.equal(result.quantityAfter, "12.00");
      await actor(db, id.ownerA, "UPDATE public.business_staff SET active=false WHERE id=$1", [
        id.staffA,
      ]);
      assert.deepEqual(await membership(db, id.threadA, user), ["left"]);
      assert.equal((await binding(db, user))[0].shop_id, null);
      assert.deepEqual(await roles(db, user), []);
      const row = (
        await db.query(
          "SELECT status,counted_cash,variance FROM shop_manager.register_sessions WHERE id=$1",
          [till.session],
        )
      ).rows[0];
      assert.deepEqual(row, { status: "manager_closed", counted_cash: null, variance: null });
      assert.equal(
        (
          await db.query("SELECT status FROM shop_manager.employee_shifts WHERE id=$1", [
            till.shift,
          ])
        ).rows[0].status,
        "manager_closed",
      );
      const after = await catalog(db);
      assert.deepEqual(after.constraints, before.constraints);
      assert.deepEqual(after.policies, before.policies);
      assert.deepEqual(await call(db, request, true), result);
    }),
);

test("full package preserves selected Shop B identity during Store A role maintenance", opts, () =>
  withFixture(
    async (db, { user }) => {
      await prepare(db);
      await db.exec(sql);
      const before = [await binding(db, user), await roles(db, user)];
      await actor(db, id.ownerA, "UPDATE public.business_staff SET role='manager' WHERE id=$1", [
        id.staffA,
      ]);
      assert.deepEqual([await binding(db, user), await roles(db, user)], before);
      await actor(db, id.ownerA, "UPDATE public.business_staff SET active=false WHERE id=$1", [
        id.staffA,
      ]);
      assert.deepEqual([await binding(db, user), await roles(db, user)], before);
    },
    { secondRoster: true, nativeShop: id.shopB },
  ),
);

test(
  "unexpected lifecycle source rolls back the entire package including grants and stock API",
  opts,
  () =>
    withFixture(async (db) => {
      await prepare(db);
      await db.exec(
        `CREATE OR REPLACE FUNCTION public.trg_staff_sync_team_thread() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;`,
      );
      const before = await catalog(db);
      await assert.rejects(db.exec(sql), (e) => e.code === "55000");
      await db.exec("ROLLBACK");
      assert.deepEqual(await catalog(db), before);
      const r = (
        await db.query(
          "SELECT to_regnamespace('business_stock_operations_v1') stock,to_regnamespace('client_business_access_candidate') staff,to_regprocedure('public.business_stock_operation_v1(jsonb,boolean)') api",
        )
      ).rows[0];
      assert.deepEqual(r, { stock: null, staff: null, api: null });
    }),
);

test(
  "suspension blocks both callable paths but preserves receipts for same-ID recovery",
  opts,
  () =>
    withFixture(async (db) => {
      await prepare(db);
      await db.exec(sql);
      const request = await draft(db),
        result = await call(db, request),
        before = await receipts(db);
      await db.exec(suspend);
      const privileges = (
        await db.query(`SELECT has_function_privilege('authenticated','public.business_stock_operation_v1(jsonb,boolean)','EXECUTE') api,
    has_function_privilege('authenticated','business_stock_operations_v1.execute(jsonb,boolean)','EXECUTE') direct`)
      ).rows[0];
      assert.deepEqual(privileges, { api: false, direct: false });
      await assert.rejects(call(db, request), (e) => e.code === "42501");
      assert.deepEqual(await receipts(db), before);
      // Test-only exact privilege restoration after simulated operator review.
      await db.exec(`GRANT EXECUTE ON FUNCTION public.business_stock_operation_v1(jsonb,boolean),
    business_stock_operations_v1.execute(jsonb,boolean) TO authenticated`);
      assert.deepEqual(await call(db, request, true), result);
      assert.deepEqual(await call(db, request), result);
      assert.deepEqual(await receipts(db), before);
    }),
);
