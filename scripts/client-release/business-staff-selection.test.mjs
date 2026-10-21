// Actual selected staff/profile/role SQL with synthetic Auth subjects, not live access.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildStaffLifecycleRepair } from "./business-staff-lifecycle.mjs";
import {
  withFixture,
  actor,
  id,
  snapshot,
  binding,
  roles,
} from "../ci/fixtures/native-staff-trigger-fixture.mjs";
const boundary = fs.readFileSync(new URL("./business-staff-boundary.sql", import.meta.url), "utf8");
const repair = buildStaffLifecycleRepair();
const options = { timeout: 30_000, concurrency: false };
async function install(db) {
  await db.exec(boundary);
  await db.exec(repair.installSql);
}
const one = async (db, sql, values) => (await db.query(sql, values)).rows[0];

test(
  "role changes in A do not switch or promote the selected Shop B identity",
  options,
  async () => {
    await withFixture(
      async (db, { user }) => {
        await install(db);
        const profileBefore = await binding(db, user);
        const rolesBefore = await roles(db, user);
        await actor(
          db,
          id.ownerA,
          "UPDATE public.business_staff SET role='manager',title='Manager A' WHERE id=$1",
          [id.staffA],
        );
        assert.deepEqual(await binding(db, user), profileBefore);
        assert.deepEqual(await roles(db, user), rolesBefore);
        assert.equal(
          (
            await one(db, "SELECT role::text role FROM public.business_staff WHERE id=$1", [
              id.staffA,
            ])
          ).role,
          "manager",
        );
      },
      { secondRoster: true, nativeShop: id.shopB },
    );
  },
);

test("selected-shop role changes still synchronize to the native role", options, async () => {
  await withFixture(async (db, { user }) => {
    await install(db);
    await actor(db, id.ownerA, "UPDATE public.business_staff SET role='manager' WHERE id=$1", [
      id.staffA,
    ]);
    assert.equal((await binding(db, user))[0].shop_id, id.shopA);
    assert.deepEqual(await roles(db, user), ["manager"]);
  });
});

for (const [table, operation] of [
  ["profiles", "UPDATE"],
  ["user_roles", "INSERT"],
  ["user_roles", "DELETE"],
]) {
  test(`suppressed active ${table} ${operation} rolls the role change back`, options, async () => {
    await withFixture(async (db) => {
      await install(db);
      await db.exec(`CREATE FUNCTION shop_manager.client_test_suppress_active() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
        REVOKE ALL ON FUNCTION shop_manager.client_test_suppress_active() FROM PUBLIC,anon,authenticated,service_role;
        CREATE TRIGGER client_test_suppress_active BEFORE ${operation}
        ON shop_manager.${table} FOR EACH ROW EXECUTE FUNCTION shop_manager.client_test_suppress_active();`);
      const before = await snapshot(db);
      await assert.rejects(
        actor(db, id.ownerA, "UPDATE public.business_staff SET role='manager' WHERE id=$1", [
          id.staffA,
        ]),
        (error) => error.code === "55000",
      );
      assert.deepEqual(await snapshot(db), before);
    });
  });
}
