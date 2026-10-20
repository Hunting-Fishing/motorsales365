// Selected actual roster/native/chat SQL; synthetic platform Auth, not live release.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildStaffLifecycleRepair } from "./business-staff-lifecycle.mjs";
import {
  withFixture,
  actor,
  id,
  snapshot,
  catalog,
  seedSession,
  membership,
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
const deactivate = (db) =>
  actor(
    db,
    id.ownerA,
    "UPDATE public.business_staff SET active=false WHERE id=$1 RETURNING active",
    [id.staffA],
  );
const one = async (db, sql, values) => (await db.query(sql, values)).rows[0];

test(
  "employee deactivation commits with retained CHECK constraints and removes selected access",
  options,
  async () => {
    await withFixture(async (db, { user, profile }) => {
      const seeded = await seedSession(db, user, profile, id.shopA);
      const beforeCatalog = await catalog(db);
      await install(db);
      assert.deepEqual((await deactivate(db)).rows, [{ active: false }]);
      assert.deepEqual(await membership(db, id.threadA, user), ["left"]);
      assert.equal((await binding(db, user))[0].shop_id, null);
      assert.deepEqual(await roles(db, user), []);
      const shift = await one(
        db,
        "SELECT status,closed_by,clocked_out_at FROM shop_manager.employee_shifts WHERE id=$1",
        [seeded.shift],
      );
      assert.equal(shift.status, "manager_closed");
      assert.equal(shift.closed_by, id.ownerA);
      assert.ok(shift.clocked_out_at);
      const afterCatalog = await catalog(db);
      assert.deepEqual(afterCatalog.constraints, beforeCatalog.constraints);
      assert.deepEqual(afterCatalog.policies, beforeCatalog.policies);
    });
  },
);

test("deactivation does not invent a counted cash amount or zero variance", options, async () => {
  await withFixture(async (db, { user, profile }) => {
    const seeded = await seedSession(db, user, profile, id.shopA);
    await install(db);
    await deactivate(db);
    const session = await one(
      db,
      `SELECT status,expected_cash::text,counted_cash::text,variance::text,closed_by,closing_note
      FROM shop_manager.register_sessions WHERE id=$1`,
      [seeded.session],
    );
    assert.deepEqual(session, {
      status: "manager_closed",
      expected_cash: "12.50",
      counted_cash: null,
      variance: null,
      closed_by: id.ownerA,
      closing_note: "Employee access deactivated; cash reconciliation required",
    });
  });
});

test(
  "a previously recorded count and variance are preserved rather than overwritten",
  options,
  async () => {
    await withFixture(async (db, { user, profile }) => {
      const seeded = await seedSession(db, user, profile, id.shopA);
      await db.query(
        "UPDATE shop_manager.register_sessions SET counted_cash=11.25,variance=-1.25 WHERE id=$1",
        [seeded.session],
      );
      await install(db);
      await deactivate(db);
      assert.deepEqual(
        await one(
          db,
          "SELECT counted_cash::text,variance::text FROM shop_manager.register_sessions WHERE id=$1",
          [seeded.session],
        ),
        { counted_cash: "11.25", variance: "-1.25" },
      );
    });
  },
);

test(
  "removing business A access leaves business B shifts, tills, profile and roles intact",
  options,
  async () => {
    await withFixture(
      async (db, { user, profile }) => {
        const a = await seedSession(db, user, profile, id.shopA, "completed");
        const b = await seedSession(db, user, profile, id.shopB);
        const beforeB = await one(
          db,
          "SELECT to_jsonb(s) value FROM shop_manager.register_sessions s WHERE id=$1",
          [b.session],
        );
        const beforeShift = await one(
          db,
          "SELECT to_jsonb(s) value FROM shop_manager.employee_shifts s WHERE id=$1",
          [b.shift],
        );
        const oldBinding = await binding(db, user);
        const oldRoles = await roles(db, user);
        await install(db);
        await deactivate(db);
        assert.deepEqual(
          await one(
            db,
            "SELECT to_jsonb(s) value FROM shop_manager.register_sessions s WHERE id=$1",
            [b.session],
          ),
          beforeB,
        );
        assert.deepEqual(
          await one(
            db,
            "SELECT to_jsonb(s) value FROM shop_manager.employee_shifts s WHERE id=$1",
            [b.shift],
          ),
          beforeShift,
        );
        assert.deepEqual(await binding(db, user), oldBinding);
        assert.deepEqual(await roles(db, user), oldRoles);
        assert.equal(
          (
            await one(db, "SELECT status FROM shop_manager.register_sessions WHERE id=$1", [
              a.session,
            ])
          ).status,
          "manager_closed",
        );
      },
      { secondRoster: true, nativeShop: id.shopB },
    );
  },
);

test(
  "shift toggles and same-value owner metadata updates cannot silently rejoin a left chat",
  options,
  async () => {
    await withFixture(
      async (db) => {
        await install(db);
        await actor(db, id.actor, "UPDATE public.business_staff SET on_shift=true WHERE id=$1", [
          id.staffA,
        ]);
        assert.deepEqual(await membership(db, id.threadA, id.actor), ["left"]);
        await actor(db, id.ownerA, "UPDATE public.business_staff SET title=title WHERE id=$1", [
          id.staffA,
        ]);
        assert.deepEqual(await membership(db, id.threadA, id.actor), ["left"]);
      },
      { membership: "left" },
    );
  },
);

test(
  "explicit owner reactivation restores membership; the employee cannot reactivate themself",
  options,
  async () => {
    await withFixture(async (db) => {
      await install(db);
      await deactivate(db);
      const before = await snapshot(db);
      await assert.rejects(
        actor(db, id.actor, "UPDATE public.business_staff SET active=true WHERE id=$1", [
          id.staffA,
        ]),
        (e) => e.code === "42501",
      );
      await assert.rejects(
        actor(db, id.actor, "UPDATE public.business_staff SET on_shift=true WHERE id=$1", [
          id.staffA,
        ]),
        (e) => e.code === "42501",
      );
      assert.deepEqual(await snapshot(db), before);
      await actor(db, id.ownerA, "UPDATE public.business_staff SET active=true WHERE id=$1", [
        id.staffA,
      ]);
      assert.deepEqual(await membership(db, id.threadA, id.actor), ["active"]);
      assert.equal((await binding(db, id.actor))[0].shop_id, id.shopA);
    });
  },
);

test(
  "owner deletion retains historical shifts and money records while closing access",
  options,
  async () => {
    await withFixture(async (db, { user, profile }) => {
      const seeded = await seedSession(db, user, profile, id.shopA);
      await install(db);
      await actor(db, id.ownerA, "DELETE FROM public.business_staff WHERE id=$1", [id.staffA]);
      assert.deepEqual(await membership(db, id.threadA, user), []);
      assert.equal(
        (
          await one(db, "SELECT status FROM shop_manager.employee_shifts WHERE id=$1", [
            seeded.shift,
          ])
        ).status,
        "manager_closed",
      );
      assert.equal(
        (
          await one(
            db,
            "SELECT counted_cash::text FROM shop_manager.register_sessions WHERE id=$1",
            [seeded.session],
          )
        ).counted_cash,
        null,
      );
      assert.equal((await binding(db, user))[0].shop_id, null);
    });
  },
);

test(
  "a genuine late shift CHECK failure rolls back roster, chat, till and role changes",
  options,
  async () => {
    await withFixture(async (db, { user, profile }) => {
      const seeded = await seedSession(db, user, profile, id.shopA);
      await db.query(
        "UPDATE shop_manager.employee_shifts SET clocked_in_at='2999-01-01Z' WHERE id=$1",
        [seeded.shift],
      );
      await install(db);
      const before = await snapshot(db);
      await assert.rejects(deactivate(db), (e) => e.code === "23514");
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "replacement keeps original function execution ACLs and all original trigger attachments",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec(boundary);
      const before = await catalog(db);
      const acl = async () =>
        (
          await db.query(`SELECT p.oid::regprocedure::text signature,p.proacl::text acl FROM pg_proc p
      WHERE p.oid IN ('public.trg_staff_sync_team_thread()'::regprocedure,
      'shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)'::regprocedure) ORDER BY signature`)
        ).rows;
      const old = await acl();
      await db.exec(repair.installSql);
      assert.deepEqual(await acl(), old);
      const after = await catalog(db);
      assert.deepEqual(after.triggers, before.triggers);
    });
  },
);

test(
  "unexpected current function bodies stop installation instead of overwriting another change",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec(boundary);
      await db.exec(`CREATE OR REPLACE FUNCTION public.trg_staff_sync_team_thread() RETURNS trigger
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN NEW; END $$;`);
      const before = await snapshot(db);
      await assert.rejects(db.exec(repair.installSql), (e) => e.code === "55000");
      await db.exec("ROLLBACK");
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

for (const target of ["register_sessions", "employee_shifts", "profiles", "user_roles"]) {
  test(
    `suppressed ${target} changes cannot acknowledge a partial deactivation`,
    options,
    async () => {
      await withFixture(async (db, { user, profile }) => {
        await seedSession(db, user, profile, id.shopA);
        await install(db);
        // Synthetic failure only; existing constraints and real trigger bodies remain.
        await db.exec(`CREATE FUNCTION shop_manager.client_test_suppress() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
        REVOKE ALL ON FUNCTION shop_manager.client_test_suppress() FROM PUBLIC,anon,authenticated,service_role;
        CREATE TRIGGER client_test_suppress BEFORE ${target === "user_roles" ? "DELETE" : "UPDATE"}
          ON shop_manager.${target} FOR EACH ROW EXECUTE FUNCTION shop_manager.client_test_suppress();`);
        const before = await snapshot(db);
        await assert.rejects(deactivate(db), (error) => error.code === "55000");
        assert.deepEqual(await snapshot(db), before);
      });
    },
  );
}
