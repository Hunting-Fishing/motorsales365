import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(fs.readFileSync(new URL("./test-fixture.sql", import.meta.url), "utf8"));
const sql = fs.readFileSync(
  new URL(
    "../../supabase/migrations/20261014043336_vehicle_receipts_shared_history.sql",
    import.meta.url,
  ),
  "utf8",
);
try {
  await db.exec(sql);
} catch (e) {
  console.error("MIGRATION:", e.message, e.cause);
  process.exit(1);
}
console.log("Migration applies successfully");
const owner = "00000000-0000-4000-8000-000000000001",
  stranger = "00000000-0000-4000-8000-000000000002",
  staff = "00000000-0000-4000-8000-000000000003";
const vehicle = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002",
  ride = "20000000-0000-4000-8000-000000000001",
  shop = "30000000-0000-4000-8000-000000000001",
  customer = "40000000-0000-4000-8000-000000000001",
  unit = "50000000-0000-4000-8000-000000000001";
await db.query("insert into auth.users values ($1),($2),($3)", [owner, stranger, staff]);
await db.query("insert into vehicles(id,owner_user_id,vin) values($1,$2,'BIKE1'),($3,$4,'BIKE2')", [
  vehicle,
  owner,
  other,
  stranger,
]);
await db.query("insert into rides values($1,$2,'draft',null)", [ride, owner]);
await db.query("insert into shop_manager.shops values($1,'Test shop',null)", [shop]);
await db.query("insert into shop_manager.customers values($1,$2)", [customer, shop]);
await db.query("insert into shop_manager.vehicles values($1,$2,'BIKE1')", [unit, customer]);
await db.query("insert into shop_manager.profiles values($1,$1,$2)", [staff, shop]);
async function as(user) {
  await db.exec("RESET ROLE");
  await db.query("select set_config('test.user',$1,false)", [user]);
  await db.exec("SET ROLE authenticated");
}
async function rejects(sql, args, pattern) {
  await assert.rejects(db.query(sql, args), pattern);
}
await as(stranger);
await rejects(
  "select public.start_vehicle_receipt($1,null,null,null)",
  [vehicle],
  /access required/,
);
await as(owner);
await rejects("select public.link_ride_vehicle($1,$2)", [ride, other], /Vehicle owner required/);
await db.query("select public.link_ride_vehicle($1,$2)", [ride, vehicle]);
const receipt = (
  await db.query("select public.start_vehicle_receipt($1,null,null,null) as r", [vehicle])
).rows[0].r.id;
const line = {
  description: "Brake pads",
  category: "brakes",
  brand: null,
  part_number: "BP1",
  quantity: 1,
  total: 250,
  confidence: 0.5,
  reviewed: false,
};
await db.query("select public.save_vehicle_receipt($1,$2,$3,$4,$5,$6,false)", [
  receipt,
  "Parts store",
  "2026-10-01",
  "PHP",
  250,
  JSON.stringify([line]),
]);
assert.equal((await db.query("select count(*)::int as n from vehicle_receipt_items")).rows[0].n, 1);
await rejects(
  "select public.save_vehicle_receipt($1,$2,$3,$4,$5,$6,true)",
  [receipt, "Parts store", "2026-10-01", "PHP", 250, JSON.stringify([line])],
  /Review every item/,
);
line.reviewed = true;
await db.query("select public.save_vehicle_receipt($1,$2,$3,$4,$5,$6,true)", [
  receipt,
  "Parts store",
  "2026-10-01",
  "PHP",
  250,
  JSON.stringify([line]),
]);
const item = (await db.query("select id from vehicle_receipt_items where receipt_id=$1", [receipt]))
  .rows[0].id;
await rejects(
  "select public.install_vehicle_receipt_item($1,$2,null)",
  [item, "2026-09-30"],
  /Installation date/,
);
await db.query("select public.install_vehicle_receipt_item($1,$2,1000)", [item, "2026-10-02"]);
await rejects(
  "select public.install_vehicle_receipt_item($1,$2,null)",
  [item, "2026-10-03"],
  /already recorded/,
);
await rejects(
  "select public.save_vehicle_receipt($1,$2,$3,$4,$5,$6,true)",
  [receipt, "Changed", "2026-10-01", "PHP", 250, JSON.stringify([line])],
  /immutable/,
);
await as(stranger);
assert.equal((await db.query("select count(*)::int as n from vehicle_receipts")).rows[0].n, 0);
assert.equal((await db.query("select count(*)::int as n from vehicle_receipt_items")).rows[0].n, 0);
await rejects("select public.set_vehicle_receipt_sharing($1,true,true)", [receipt], /owner access/);
await rejects(
  "select public.install_vehicle_receipt_item($1,$2,null)",
  [item, "2026-10-03"],
  /write access/,
);
await as(staff);
const code = (await db.query("select public.request_shop_vehicle_link($1) as c", [unit])).rows[0].c;
await as(owner);
await db.query("select public.approve_shop_vehicle_link($1,$2)", [vehicle, code]);
await as(staff);
assert.equal((await db.query("select count(*)::int as n from vehicle_receipts")).rows[0].n, 0);
await as(owner);
await db.query("select public.set_vehicle_receipt_sharing($1,true,true)", [receipt]);
await as(staff);
assert.equal((await db.query("select count(*)::int as n from vehicle_receipts")).rows[0].n, 1);
await rejects(
  "select public.install_vehicle_receipt_item($1,$2,null)",
  [item, "2026-10-03"],
  /write access/,
);
const shopReceipt = (
  await db.query("select public.start_vehicle_receipt(null,$1,null,null) as r", [unit])
).rows[0].r.id;
await db.query("select public.save_vehicle_receipt($1,$2,$3,$4,$5,$6,true)", [
  shopReceipt,
  "Workshop supplier",
  "2026-10-01",
  "PHP",
  250,
  JSON.stringify([line]),
]);
const expense = (
  await db.query("select public.record_vehicle_receipt_expense($1) as id", [shopReceipt])
).rows[0].id;
assert.equal(
  (await db.query("select public.record_vehicle_receipt_expense($1) as id", [shopReceipt])).rows[0]
    .id,
  expense,
);
await as(owner);
assert.equal((await db.query("select count(*)::int as n from vehicle_receipts")).rows[0].n, 2);
await db.query("select public.revoke_shop_vehicle_link($1,$2)", [vehicle, unit]);
await as(staff);
assert.equal((await db.query("select count(*)::int as n from vehicle_receipts")).rows[0].n, 1);
await db.exec("RESET ROLE");
assert.equal(
  (
    await db.query("select count(*)::int as n from vehicle_history_events where source_id=$1", [
      item,
    ])
  ).rows[0].n,
  2,
);
assert.equal((await db.query("select count(*)::int as n from shop_manager.expenses")).rows[0].n, 1);
const draft = (
  await db.query(
    "select public.start_vehicle_receipt(null,$1,'receipt.pdf','application/pdf') as r",
    [unit],
  )
).rows[0].r;
await as(staff);
await db.query("insert into storage.objects(bucket_id,name) values('vehicle-receipts',$1)", [
  draft.file_path,
]);
await as(stranger);
assert.equal((await db.query("select count(*)::int as n from storage.objects")).rows[0].n, 0);
await rejects(
  "insert into storage.objects(bucket_id,name) values('vehicle-receipts',$1)",
  [draft.file_path + "-other"],
  /row-level security/,
);
await db.exec("SET ROLE anon");
await rejects(
  "select public.start_vehicle_receipt($1,null,null,null)",
  [vehicle],
  /permission denied/,
);
await rejects("select count(*)::int as n from storage.objects", [], /permission denied/);
await db.exec("RESET ROLE");
await db.query("select set_config('test.user',$1,false)", [owner]);
const serviceId = "60000000-0000-4000-8000-000000000001";
await db.query(
  "insert into vehicle_service_records(id,vehicle_id,performed_at,mileage_km,title,service_type,created_by) values($1,$2,'2026-10-01',1000,'Brake adjustment','brake_service',$3)",
  [serviceId, vehicle, owner],
);
assert.equal(
  (
    await db.query(
      "select count(*)::int as n from vehicle_history_events where source_table='vehicle_service_records' and source_id=$1",
      [serviceId],
    )
  ).rows[0].n,
  1,
);
await rejects(
  "update shop_manager.expenses set shop_id='70000000-0000-4000-8000-000000000001' where id=$1",
  [expense],
  /Expense vehicle must belong/,
);
const procedures = await db.query(
  "select proname,prosecdef from pg_proc where pronamespace='public'::regnamespace and proname in ('start_vehicle_receipt','save_vehicle_receipt','approve_shop_vehicle_link','record_vehicle_receipt_expense')",
);
assert.equal(procedures.rows.length, 4);
assert.ok(procedures.rows.every((p) => p.prosecdef === false));
const buckets = await db.query(
  "select public from storage.buckets where id in ('vehicle-receipts','vehicle-service-receipts')",
);
assert.ok(buckets.rows.every((b) => b.public === false));

console.log(
  "PASS: ownership, cross-account isolation, human review, immutable confirmation, purchase/install dates, deduplication, explicit sharing/revocation, shop accounting and private storage",
);
await db.close();
