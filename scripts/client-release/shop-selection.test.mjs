import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import {
  install,
  ids,
  claims,
  asUser,
  request,
  call,
  list,
  state,
} from "./shop-selection-fixture.mjs";
const options = { timeout: 30000, concurrency: false };
async function fixture(fn) {
  const db = new PGlite();
  try {
    await install(db);
    await fn(db);
  } finally {
    await db.close();
  }
}
async function deny(db, fn, code = "42501") {
  const before = await state(db);
  await assert.rejects(fn, (e) => {
    assert.equal(e.code, code);
    return true;
  });
  assert.deepEqual(await state(db), before);
}
async function profile(db) {
  return (await db.query("SELECT * FROM shop_manager.profiles WHERE id=$1", [ids.actor])).rows[0];
}
const newOp = () => crypto.randomUUID();
const selectedRoles = async (db) =>
  (
    await db.query(
      "SELECT r.name FROM shop_manager.user_roles u JOIN shop_manager.roles r ON r.id=u.role_id WHERE u.user_id=$1 ORDER BY r.name",
      [ids.actor],
    )
  ).rows
    .map((x) => x.name)
    .sort();
test(
  "list only current memberships; atomic switch drops old owner rights and preserves per-shop rates",
  options,
  () =>
    fixture(async (db) => {
      const view = await list(db);
      assert.equal(view.shops.length, 2);
      assert.equal(view.selectedShopId, ids.shop);
      assert.equal(view.shops.find((s) => s.shopId === ids.otherShop).role, "clerk");
      assert.equal(view.blocker, null);
      assert.equal((await list(db, ids.manager)).shops.length, 1);
      const completed = await call(db);
      assert.equal(completed.status, "completed");
      assert.equal(completed.nativeRole, "office_admin");
      const p = await profile(db);
      assert.equal(p.shop_id, ids.otherShop);
      assert.equal(p.hourly_rate, null);
      assert.equal(p.cost_rate, null);
      assert.equal(p.department, null);
      assert.deepEqual(await selectedRoles(db), ["office_admin"]);
      const saved = await state(db);
      assert.deepEqual(await call(db), completed);
      assert.deepEqual(await call(db, request(), true), completed);
      assert.deepEqual(await state(db), saved);
      const back = request({
        operationId: newOp(),
        expectedShopId: ids.otherShop,
        expectedUpdatedAt: completed.profileUpdatedAt,
        targetShopId: ids.shop,
      });
      assert.equal((await call(db, back)).nativeRole, "owner");
      const restored = await profile(db);
      assert.equal(restored.hourly_rate, "250.00");
      assert.equal(restored.cost_rate, "150.00");
      assert.equal(restored.department, "A Service");
      const later = await state(db);
      assert.deepEqual(await call(db), completed);
      assert.deepEqual(await state(db), later); // historical receipt must not select B again
    }),
);
test(
  "cross-account, absent membership, inactive shop and fabricated owner labels cannot select",
  options,
  () =>
    fixture(async (db) => {
      await deny(db, () => list(db, ids.actor, claims(ids.manager)));
      await deny(db, () =>
        call(
          db,
          request({ expectedAccountId: ids.manager, profileId: ids.manager }),
          false,
          claims(ids.manager),
        ),
      );
      await db.query("UPDATE shop_manager.shops SET is_active=false WHERE id=$1", [ids.otherShop]);
      await deny(db, () => call(db));
      await db.query("UPDATE shop_manager.shops SET is_active=true WHERE id=$1", [ids.otherShop]);
      await asUser(
        db,
        "WITH d AS (DELETE FROM public.business_staff WHERE business_id=$1 AND user_id=$2 RETURNING id) SELECT to_jsonb(count(*)) result FROM d",
        [ids.otherBusiness, ids.actor],
        claims(ids.outsider),
      );
      assert.equal((await list(db)).shops.length, 1);
      await deny(db, () => call(db));
    }),
);
test(
  "expired/revoked/banned/anonymous sessions and non-authenticated roles fail closed",
  options,
  () =>
    fixture(async (db) => {
      for (const c of [
        claims(ids.actor, { exp: 1 }),
        claims(ids.actor, { session_id: ids.otherSession }),
        claims(ids.actor, { session_id: null }),
        claims(ids.actor, { role: "service_role" }),
      ]) {
        await deny(db, () => list(db, ids.actor, c));
        await deny(db, () => call(db, request(), false, c));
      }
      for (const r of ["anon", "service_role"])
        await deny(db, () => call(db, request(), false, claims(), r));
      for (const field of [
        "banned_until=now()+interval '1 day'",
        "deleted_at=now()",
        "is_anonymous=true",
      ]) {
        await db.exec(`UPDATE auth.users SET ${field} WHERE id='${ids.actor}'`);
        await deny(db, () => call(db));
        await db.exec(
          `UPDATE auth.users SET banned_until=NULL,deleted_at=NULL,is_anonymous=false WHERE id='${ids.actor}'`,
        );
      }
    }),
);
test(
  "original profile version and full operation intent prevent stale/replaced selections",
  options,
  () =>
    fixture(async (db) => {
      assert.equal((await call(db, request(), true)).status, "not_observed");
      const stale = request({ expectedUpdatedAt: "2026-01-02T00:00:00Z" });
      const rejected = await call(db, stale);
      assert.equal(rejected.code, "conflict");
      assert.equal((await profile(db)).shop_id, ids.shop);
      await deny(db, () => call(db, request()), "22023");
      assert.deepEqual(await call(db, stale), rejected);
      for (const patch of [
        { version: 2 },
        { extra: true },
        { expectedShopId: 4 },
        { expectedUpdatedAt: "now" },
        { profileId: ids.manager },
      ])
        await deny(db, () => call(db, request({ ...patch, operationId: newOp() })), "22023");
    }),
);
test("open shifts and registers block without closing or reconciling money", options, () =>
  fixture(async (db) => {
    const shift = newOp(),
      register = newOp(),
      session = newOp();
    await asUser(
      db,
      "WITH i AS (INSERT INTO shop_manager.employee_shifts(id,shop_id,profile_id,user_id) VALUES($1,$2,$3,$3) RETURNING id) SELECT to_jsonb(id) result FROM i",
      [shift, ids.shop, ids.actor],
    );
    assert.equal((await list(db)).blocker, "active_shift");
    assert.equal((await call(db)).code, "active_shift");
    await db.query(
      "INSERT INTO shop_manager.cash_registers(id,shop_id,name) VALUES($1,$2,'Counter')",
      [register, ids.shop],
    );
    await asUser(
      db,
      "WITH i AS (INSERT INTO shop_manager.register_sessions(id,register_id,shop_id,shift_id,opened_by_profile_id,opened_by_user_id,expected_cash) VALUES($1,$2,$3,$4,$5,$5,1200) RETURNING id) SELECT to_jsonb(id) result FROM i",
      [session, register, ids.shop, shift, ids.actor],
    );
    assert.equal((await list(db)).blocker, "open_register");
    assert.equal((await call(db, request({ operationId: newOp() }))).code, "open_register");
    const row = (
      await db.query(
        "SELECT status,expected_cash,counted_cash FROM shop_manager.register_sessions WHERE id=$1",
        [session],
      )
    ).rows[0];
    assert.deepEqual(row, { status: "open", expected_cash: "1200.00", counted_cash: null });
    assert.equal((await profile(db)).shop_id, ids.shop);
  }),
);
test("late shift/register activation cannot target the former selected shop", options, () =>
  fixture(async (db) => {
    await call(db);
    await deny(db, () =>
      asUser(
        db,
        "WITH i AS (INSERT INTO shop_manager.employee_shifts(shop_id,profile_id,user_id) VALUES($1,$2,$2) RETURNING id) SELECT to_jsonb(id) result FROM i",
        [ids.shop, ids.actor],
      ),
    );
    const shift = newOp();
    assert.ok(
      await asUser(
        db,
        "WITH i AS (INSERT INTO shop_manager.employee_shifts(id,shop_id,profile_id,user_id) VALUES($1,$2,$3,$3) RETURNING id) SELECT to_jsonb(id) result FROM i",
        [shift, ids.otherShop, ids.actor],
      ),
    );
  }),
);
test(
  "ordinary direct authority edits denied; personal contact edits remain possible",
  options,
  () =>
    fixture(async (db) => {
      await deny(db, () =>
        asUser(
          db,
          "WITH u AS (UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2 RETURNING id) SELECT to_jsonb(id) result FROM u",
          [ids.otherShop, ids.actor],
        ),
      );
      await deny(db, () =>
        asUser(
          db,
          "WITH u AS (UPDATE shop_manager.roles SET name='admin' WHERE name='owner' RETURNING id) SELECT to_jsonb(id) result FROM u",
          [],
        ),
      );
      await deny(db, () =>
        asUser(
          db,
          "WITH u AS (DELETE FROM shop_manager.user_roles WHERE user_id=$1 RETURNING id) SELECT to_jsonb(id) result FROM u",
          [ids.actor],
        ),
      );
      await asUser(
        db,
        "WITH u AS (UPDATE shop_manager.profiles SET first_name='New name' WHERE id=$1 RETURNING id) SELECT to_jsonb(id) result FROM u",
        [ids.actor],
      );
      assert.equal((await profile(db)).first_name, "New name");
    }),
);
test("unsupported native privileges and duplicate profiles require review", options, () =>
  fixture(async (db) => {
    await db.query(
      "INSERT INTO shop_manager.user_roles(user_id,role_id) SELECT $1,id FROM shop_manager.roles WHERE name='admin'",
      [ids.actor],
    );
    assert.equal((await list(db)).blocker, "role_review");
    assert.equal((await call(db)).code, "role_review");
    assert.deepEqual(await selectedRoles(db), ["owner", "admin"].sort());
    await db.query(
      "INSERT INTO shop_manager.profiles(id,user_id,email,shop_id) VALUES($1,$2,'duplicate@example.invalid',$3)",
      [newOp(), ids.actor, ids.shop],
    );
    await deny(db, () => list(db), "55000");
    await deny(db, () => call(db, request({ operationId: newOp() })), "55000");
  }),
);
test(
  "late outcome failure or suppressed role insert rolls back profile, context and roles",
  options,
  () =>
    fixture(async (db) => {
      await db.exec(`CREATE FUNCTION shop_selection_v1.fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION USING ERRCODE='23514'; END $$;
    REVOKE ALL ON FUNCTION shop_selection_v1.fault() FROM PUBLIC,anon,authenticated,service_role;
    CREATE TRIGGER fault BEFORE INSERT ON shop_selection_v1.outcomes FOR EACH ROW EXECUTE FUNCTION shop_selection_v1.fault();`);
      await deny(db, () => call(db), "23514");
      await db.exec("DROP TRIGGER fault ON shop_selection_v1.outcomes");
      await db.exec(`CREATE OR REPLACE FUNCTION shop_selection_v1.fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
    CREATE TRIGGER fault BEFORE INSERT ON shop_manager.user_roles FOR EACH ROW EXECUTE FUNCTION shop_selection_v1.fault();`);
      await deny(db, () => call(db), "55000");
    }),
);
test(
  "immutable outcomes/private contexts resist direct access and outer rollback remains atomic",
  options,
  () =>
    fixture(async (db) => {
      const before = await state(db);
      await db.exec("BEGIN;SET LOCAL ROLE authenticated;");
      await db.query("SELECT set_config('request.jwt.claims',$1,true)", [JSON.stringify(claims())]);
      assert.equal(
        (
          await db.query("SELECT public.shop_selection_change_v1($1,false) result", [
            JSON.stringify(request()),
          ])
        ).rows[0].result.status,
        "completed",
      );
      await db.exec("ROLLBACK");
      assert.deepEqual(await state(db), before);
      await call(db);
      for (const q of [
        "DELETE FROM shop_selection_v1.outcomes",
        "UPDATE shop_selection_v1.outcomes SET result='{}'",
        "TRUNCATE shop_selection_v1.outcomes",
      ])
        await deny(db, () => db.exec(q));
      for (const role of ["anon", "authenticated", "service_role"])
        for (const table of ["outcomes", "profile_contexts"]) {
          assert.equal(
            (
              await db.query(
                "SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') ok",
                [role, "shop_selection_v1." + table],
              )
            ).rows[0].ok,
            false,
          );
        }
    }),
);

// Own historical receipts remain recoverable after offboarding, without new access.
test(
  "offboarding preserves own switch recovery but denies a fresh destination change",
  options,
  () =>
    fixture(async (db) => {
      const recorded = await call(db);
      await asUser(
        db,
        "WITH d AS (DELETE FROM public.business_staff WHERE business_id=$1 AND user_id=$2 RETURNING id) SELECT to_jsonb(count(*)) result FROM d",
        [ids.otherBusiness, ids.actor],
        claims(ids.outsider),
      );
      const after = await state(db);
      assert.deepEqual(await call(db, request(), true), recorded);
      assert.deepEqual(await call(db), recorded);
      assert.deepEqual(await state(db), after);
      await deny(db, () => call(db, request({ operationId: newOp() })));
    }),
);
