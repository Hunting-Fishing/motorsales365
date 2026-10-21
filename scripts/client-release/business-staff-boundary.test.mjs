// Actual retained roster RLS and chat/native triggers in a disposable database.
// Auth subjects are test settings, not signed JWT/session or hosted acceptance.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  withFixture,
  actor,
  id,
  snapshot,
  catalog,
} from "../ci/fixtures/native-staff-trigger-fixture.mjs";

const sql = fs.readFileSync(new URL("./business-staff-boundary.sql", import.meta.url), "utf8");
const options = { timeout: 30_000, concurrency: false };
const extra = "30000000-0000-4000-8000-000000000003";
const absent = "00000000-0000-4000-8000-000000000099";
const install = (db) => db.exec(sql);
const rows = async (db) => (await db.query("SELECT * FROM public.business_staff ORDER BY id")).rows;
async function denied(db, user, query, parameters = []) {
  const before = await snapshot(db);
  await assert.rejects(actor(db, user, query, parameters), (error) => {
    assert.equal(error.code, "42501");
    assert.equal(error.message, "Business staff change denied.");
    return true;
  });
  assert.deepEqual(await snapshot(db), before);
}
async function invite(db, owner, business, user, role = "clerk", staff = extra) {
  return actor(
    db,
    owner,
    "INSERT INTO public.business_staff(id,business_id,user_id,role,invited_by) VALUES($1,$2,$3,$4,$5) RETURNING id,role",
    [staff, business, user, role, owner],
  );
}

test(
  "retained self-promotion is reproduced before the boundary, not relabelled as secure",
  options,
  async () => {
    await withFixture(async (db) => {
      const result = await actor(
        db,
        id.actor,
        "UPDATE public.business_staff SET role='manager' WHERE id=$1 RETURNING role",
        [id.staffA],
      );
      assert.equal(result.rows[0].role, "manager");
    });
  },
);

test(
  "self-promotion and same-value native-bridge triggers are denied without side effects",
  options,
  async () => {
    await withFixture(async (db) => {
      await install(db);
      for (const set of [
        "role='manager'",
        "role='owner'",
        "role=role",
        "title=title",
        "active=active",
      ])
        await denied(db, id.actor, `UPDATE public.business_staff SET ${set} WHERE id=$1`, [
          id.staffA,
        ]);
    });
  },
);

test(
  "roster identity, business, invitation attribution and creation time are immutable",
  options,
  async () => {
    await withFixture(async (db) => {
      await install(db);
      for (const [field, value] of [
        ["id", extra],
        ["business_id", id.businessB],
        ["user_id", id.stranger],
        ["invited_by", id.ownerB],
        ["created_at", "2000-01-01Z"],
      ]) {
        await denied(db, id.actor, `UPDATE public.business_staff SET ${field}=$1 WHERE id=$2`, [
          value,
          id.staffA,
        ]);
        await denied(db, id.ownerA, `UPDATE public.business_staff SET ${field}=$1 WHERE id=$2`, [
          value,
          id.staffA,
        ]);
      }
    });
  },
);

test("an active employee retains only their own shift toggle", options, async () => {
  await withFixture(async (db) => {
    await install(db);
    const before = await rows(db);
    const result = await actor(
      db,
      id.actor,
      "UPDATE public.business_staff SET on_shift=true WHERE id=$1 RETURNING on_shift",
      [id.staffA],
    );
    assert.equal(result.rows[0].on_shift, true);
    const after = await rows(db);
    for (const field of [
      "business_id",
      "user_id",
      "role",
      "active",
      "title",
      "duties",
      "invited_by",
      "created_at",
    ])
      assert.deepEqual(after[0][field], before[0][field]);
    await denied(
      db,
      id.actor,
      "UPDATE public.business_staff SET duties=ARRAY['management'] WHERE id=$1",
      [id.staffA],
    );
    await denied(
      db,
      id.actor,
      "UPDATE public.business_staff SET on_shift=false,role=role WHERE id=$1",
      [id.staffA],
    );
  });
});

test("real owner promotion still executes the unchanged native staff bridge", options, async () => {
  await withFixture(async (db) => {
    const beforeCatalog = await catalog(db);
    await install(db);
    const result = await actor(
      db,
      id.ownerA,
      "UPDATE public.business_staff SET role='manager',title='Parts manager' WHERE id=$1 RETURNING role,title",
      [id.staffA],
    );
    assert.deepEqual(result.rows, [{ role: "manager", title: "Parts manager" }]);
    const native = await db.query(
      `SELECT r.name::text AS role FROM shop_manager.user_roles ur
      JOIN shop_manager.roles r ON r.id=ur.role_id WHERE ur.user_id=$1 ORDER BY r.name`,
      [id.actor],
    );
    assert.deepEqual(native.rows, [{ role: "manager" }]);
    const afterCatalog = await catalog(db);
    assert.deepEqual(afterCatalog.policies, beforeCatalog.policies);
    assert.deepEqual(afterCatalog.constraints, beforeCatalog.constraints);
    assert.deepEqual(
      afterCatalog.triggers.filter((row) => !row.tgname.startsWith("zz")),
      beforeCatalog.triggers,
    );
  });
});

test("owners of two independent businesses manage only their own roster", options, async () => {
  await withFixture(async (db) => {
    await install(db);
    await invite(db, id.ownerB, id.businessB, id.stranger, "mechanic");
    await actor(db, id.ownerA, "UPDATE public.business_staff SET role='manager' WHERE id=$1", [
      id.staffA,
    ]);
    const before = await snapshot(db);
    const result = await actor(
      db,
      id.ownerB,
      "UPDATE public.business_staff SET role='clerk' WHERE id=$1 RETURNING id",
      [id.staffA],
    );
    assert.deepEqual(result.rows, []);
    assert.deepEqual(await snapshot(db), before);
    const roster = await rows(db);
    assert.equal(roster.find((r) => r.id === id.staffA).role, "manager");
    assert.equal(roster.find((r) => r.id === extra).business_id, id.businessB);
  });
});

test(
  "managers can manage lower staff but cannot create, change or self-assign privileged roles",
  options,
  async () => {
    await withFixture(async (db) => {
      await actor(db, id.ownerA, "UPDATE public.business_staff SET role='manager' WHERE id=$1", [
        id.staffA,
      ]);
      await invite(db, id.ownerA, id.businessA, id.stranger);
      await install(db);
      const result = await actor(
        db,
        id.actor,
        "UPDATE public.business_staff SET role='mechanic',title='Technician' WHERE id=$1 RETURNING role",
        [extra],
      );
      assert.deepEqual(result.rows, [{ role: "mechanic" }]);
      for (const role of ["manager", "assistant_manager", "owner"])
        await denied(db, id.actor, "UPDATE public.business_staff SET role=$1 WHERE id=$2", [
          role,
          extra,
        ]);
      await denied(
        db,
        id.actor,
        "UPDATE public.business_staff SET title='Self admin' WHERE id=$1",
        [id.staffA],
      );
      const before = await snapshot(db);
      assert.deepEqual(
        (
          await actor(db, id.actor, "DELETE FROM public.business_staff WHERE id=$1 RETURNING id", [
            extra,
          ])
        ).rows,
        [],
      );
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "a privileged target cannot be demoted or overwritten by another manager",
  options,
  async () => {
    await withFixture(async (db) => {
      await actor(db, id.ownerA, "UPDATE public.business_staff SET role='manager' WHERE id=$1", [
        id.staffA,
      ]);
      await invite(db, id.ownerA, id.businessA, id.stranger, "assistant_manager");
      await install(db);
      await denied(db, id.actor, "UPDATE public.business_staff SET role='clerk' WHERE id=$1", [
        extra,
      ]);
      await denied(
        db,
        id.actor,
        "UPDATE public.business_staff SET duties=ARRAY['new'] WHERE id=$1",
        [extra],
      );
      await actor(db, id.ownerA, "UPDATE public.business_staff SET role='clerk' WHERE id=$1", [
        extra,
      ]);
      assert.equal((await rows(db)).find((row) => row.id === extra).role, "clerk");
    });
  },
);

test(
  "forged roster-owner labels are not accepted as authoritative business ownership",
  options,
  async () => {
    await withFixture(async (db) => {
      await actor(db, id.ownerA, "UPDATE public.business_staff SET role='owner' WHERE id=$1", [
        id.staffA,
      ]);
      await invite(db, id.ownerA, id.businessA, id.stranger);
      await install(db);
      await denied(db, id.actor, "UPDATE public.business_staff SET role='manager' WHERE id=$1", [
        extra,
      ]);
      await denied(db, id.actor, "UPDATE public.business_staff SET on_shift=true WHERE id=$1", [
        id.staffA,
      ]);
      await actor(db, id.ownerA, "UPDATE public.business_staff SET role='driver' WHERE id=$1", [
        id.staffA,
      ]);
      assert.equal((await rows(db)).find((row) => row.id === id.staffA).role, "driver");
    });
  },
);

test(
  "new staff require a real target account and authentic inviter; owner labels remain forbidden",
  options,
  async () => {
    await withFixture(async (db) => {
      await install(db);
      for (const [target, role, inviter] of [
        [absent, "clerk", id.ownerA],
        [id.stranger, "owner", id.ownerA],
        [id.stranger, "clerk", id.ownerB],
        [id.ownerA, "clerk", id.ownerA],
      ]) {
        await denied(
          db,
          id.ownerA,
          "INSERT INTO public.business_staff(id,business_id,user_id,role,invited_by) VALUES($1,$2,$3,$4,$5)",
          [extra, id.businessA, target, role, inviter],
        );
      }
      await invite(db, id.ownerA, id.businessA, id.stranger);
      assert.equal((await rows(db)).find((row) => row.id === extra).invited_by, id.ownerA);
    });
  },
);

test(
  "private helpers are not exposed and service-role impersonation has no bypass",
  options,
  async () => {
    await withFixture(async (db) => {
      await install(db);
      const grants = await db.query(`SELECT p.proname, p.prosecdef,
      has_function_privilege('anon',p.oid,'EXECUTE') anon,
      has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated,
      has_function_privilege('service_role',p.oid,'EXECUTE') service
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='client_business_access_candidate' ORDER BY p.proname`);
      assert.equal(grants.rows.length, 2);
      for (const row of grants.rows) {
        assert.equal(row.prosecdef, true);
        assert.equal(row.anon, false);
        assert.equal(row.authenticated, false);
        assert.equal(row.service, false);
      }
      const before = await snapshot(db);
      await db.exec("BEGIN; SET LOCAL ROLE service_role");
      try {
        await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [id.ownerA]);
        await assert.rejects(
          db.query("UPDATE public.business_staff SET role='manager' WHERE id=$1", [id.staffA]),
          (error) => error.code === "42501",
        );
      } finally {
        await db.exec("ROLLBACK");
      }
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "existing native offboarding failure still rolls back; constraints are not weakened",
  options,
  async () => {
    await withFixture(async (db) => {
      await install(db);
      const before = await snapshot(db);
      // The retained chat writer uses 'inactive', while the retained CHECK excludes it.
      // Report the incompatibility rather than silently enabling an invalid status.
      await assert.rejects(
        actor(db, id.ownerA, "UPDATE public.business_staff SET active=false WHERE id=$1", [
          id.staffA,
        ]),
        (error) => error.code === "23514",
      );
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "schema collision fails publication without changing the retained application graph",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec("CREATE SCHEMA client_business_access_candidate");
      const before = await snapshot(db);
      await assert.rejects(install(db), (error) => error.code === "42P06");
      await db.exec("ROLLBACK");
      assert.deepEqual(await snapshot(db), before);
      const functions = await db.query(`SELECT count(*)::integer n FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='client_business_access_candidate'`);
      assert.equal(functions.rows[0].n, 0);
    });
  },
);
