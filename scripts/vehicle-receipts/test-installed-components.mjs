import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite();
const migrations = new URL("../../supabase/migrations/", import.meta.url);
try {
  await db.exec(fs.readFileSync(new URL("./test-fixture.sql", import.meta.url), "utf8"));
  await db.exec(
    fs.readFileSync(
      new URL("20261014043336_vehicle_receipts_shared_history.sql", migrations),
      "utf8",
    ),
  );
  await db.exec(
    "ALTER TABLE public.installed_components ADD CHECK (shop_manager_vehicle_id IS NOT NULL OR public_vehicle_id IS NOT NULL)",
  );
  const owner = "00000000-0000-4000-8000-000000000001";
  const vehicle = "10000000-0000-4000-8000-000000000001";
  const other = "10000000-0000-4000-8000-000000000002";
  const shop = "30000000-0000-4000-8000-000000000001";
  const customer = "40000000-0000-4000-8000-000000000001";
  const unit = "50000000-0000-4000-8000-000000000001";
  await db.query("insert into auth.users values ($1)", [owner]);
  await db.query(
    "insert into vehicles(id,owner_user_id,vin) values($1,$2,'BIKE1'),($3,$2,'BIKE2')",
    [vehicle, owner, other],
  );
  await db.query("insert into shop_manager.shops values($1,'Test shop',null)", [shop]);
  await db.query("insert into shop_manager.customers values($1,$2)", [customer, shop]);
  await db.query("insert into shop_manager.vehicles values($1,$2,'BIKE1')", [unit, customer]);

  const insert = (shopVehicle, publicVehicle) =>
    db.query(
      "insert into installed_components(shop_manager_vehicle_id,public_vehicle_id,name_snapshot,installer_user_id,installed_at) values($1,$2,'Brake pad',$3,now()) returning id,public_vehicle_id",
      [shopVehicle, publicVehicle, owner],
    );
  // Reproduce the bug against the already-published original migration.
  await assert.rejects(insert(null, vehicle), /violates check constraint/);
  const fix = fs
    .readdirSync(migrations)
    .find((name) => name.endsWith("_preserve_direct_installed_vehicle.sql"));
  assert.ok(fix, "follow-up migration must be present");
  await db.exec(fs.readFileSync(new URL(fix, migrations), "utf8"));
  await db.exec(fs.readFileSync(new URL(fix, migrations), "utf8")); // retry safe

  const direct = (await insert(null, vehicle)).rows[0];
  assert.equal(direct.public_vehicle_id, vehicle);
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from vehicle_history_events where source_id=$1 and vehicle_id=$2",
        [direct.id, vehicle],
      )
    ).rows[0].n,
    1,
  );

  await db.query(
    "insert into vehicle_shop_links(shop_vehicle_id,vehicle_id,shop_id,approved_by) values($1,$2,$3,$4)",
    [unit, vehicle, shop, owner],
  );
  assert.equal((await insert(unit, null)).rows[0].public_vehicle_id, vehicle);
  assert.equal((await insert(unit, other)).rows[0].public_vehicle_id, vehicle);
  await db.query("update vehicle_shop_links set active=false where shop_vehicle_id=$1", [unit]);
  assert.equal((await insert(unit, other)).rows[0].public_vehicle_id, null);
  await assert.rejects(insert(null, null), /violates check constraint/);
  const permissions = await db.query(
    "select has_function_privilege('anon','vehicle_receipts_private.link_installed_component()','execute') as anon,has_function_privilege('authenticated','vehicle_receipts_private.link_installed_component()','execute') as authenticated",
  );
  assert.equal(permissions.rows[0].anon, false);
  assert.equal(permissions.rows[0].authenticated, false);
  console.log(
    "PASS: original trigger regression reproduced; direct vehicle, approved shop link, revoked link, history event, required vehicle and private execution verified",
  );
} finally {
  await db.close();
}
