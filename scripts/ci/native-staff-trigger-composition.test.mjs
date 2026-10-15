// OFFLINE unchanged nine-case characterization; shared fixture remains memory-only.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sources,
  ddl,
  functions,
  observed,
  id,
  options,
  withFixture,
  actor,
  catalog,
  data,
  snapshot,
  target,
  binding,
  roles,
  membership,
  seedSession,
  hasCode,
  pin,
  sha,
  fn,
} from "./fixtures/native-staff-trigger-fixture.mjs";

test(
  "whole sources, unique complete selections and dated evidence stay fail-closed",
  options,
  () => {
    assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
    assert.equal(observed.mode, "read-only-catalog");
    assert.match(
      observed.scope,
      /Four selected staff\/chat\/shift table catalog records plus five selected function/,
    );
    assert.equal(observed.tables.length, 4);
    assert.equal(observed.functions.length, 5);
    assert.equal(Object.keys(sources).length, 14);
    for (const sql of Object.values(functions)) assert.match(sql, /^CREATE OR REPLACE FUNCTION /);
    assert.throws(
      () => pin(`${sources.roster}\n`, sha(sources.roster), "tamper"),
      /LF source drift/,
    );
    assert.throws(
      () =>
        fn(
          functions.ensure + "\n" + functions.ensure,
          "public.ensure_business_team_thread",
          sha(functions.ensure),
        ),
      /one complete definition/,
    );
    assert.throws(
      () => fn("", "public.ensure_business_team_thread", sha(functions.ensure)),
      /one complete definition/,
    );
    assert.equal(sha(sources.team.replaceAll("\n", "\r\n")), sha(sources.team));
    assert.match(ddl.shifts, /'completed','manager_closed'/);
    assert.doesNotMatch(ddl.shifts, /'clocked_out'/);
    assert.match(ddl.chat, /'invited','active','left'/);
    assert.doesNotMatch(ddl.chat, /'inactive'/);
    assert.match(functions.chat, /SET status = 'inactive'/);
    assert.match(functions.nativeMember, /SET status='clocked_out'/);
    assert.doesNotMatch(ddl.profiles, /REFERENCES/);
    assert.match(functions.ensure, /IF _thread_id IS NOT NULL THEN RETURN _thread_id; END IF/);
  },
);

test(
  "selected catalog correspondence, real actor and denied direct EXECUTE coexist with enabled triggers",
  options,
  async (t) => {
    await withFixture(async (db) => {
      const version = (await db.query("SHOW server_version")).rows[0].server_version;
      t.diagnostic(
        `Memory engine PostgreSQL ${version}; NOT NULL catalog representation is version-specific.`,
      );
      assert.match(version, /^18\./);
      for (const record of observed.functions) {
        const signature = record.signature.includes(".")
          ? record.signature
          : `public.${record.signature}`;
        const actual = (
          await db.query(
            `SELECT pg_get_userbyid(p.proowner) owner,l.lanname language,p.prosecdef security_definer,p.provolatile volatility,p.proconfig config,p.proacl::text acl,md5(pg_get_functiondef(p.oid)) definition_md5,md5(replace(p.prosrc,chr(13),'')) body_md5_lf,has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,has_function_privilege('service_role',p.oid,'EXECUTE') service_execute FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=$1::regprocedure`,
            [signature],
          )
        ).rows[0];
        const { observed_at_utc, signature: savedSignature, ...expected } = record;
        assert.match(observed_at_utc, /^2026-10-14 22:28:36\./);
        assert.ok(savedSignature);
        assert.deepEqual(actual, expected);
      }
      const before = await snapshot(db);
      for (const expression of [
        "public.ensure_business_team_thread(NULL::uuid)",
        "public.set_updated_at()",
        "public.trg_staff_sync_team_thread()",
        "shop_manager.sync_business_staff_trigger()",
        "shop_manager.sync_business_staff_member(NULL::uuid,NULL::uuid,false,''::text,NULL::text)",
      ]) {
        await assert.rejects(actor(db, id.actor, `SELECT ${expression}`), hasCode("42501"));
      }
      await assert.rejects(
        actor(db, id.actor, "UPDATE shop_manager.profiles SET shop_id=NULL"),
        hasCode("42501"),
      );
      const role = (
        await actor(
          db,
          id.actor,
          "SELECT current_user name,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
        )
      ).rows[0];
      assert.deepEqual(role, { name: "authenticated", rolsuper: false, rolbypassrls: false });
      assert.deepEqual(await snapshot(db), before);
      const current = await catalog(db);
      const staffTriggers = current.triggers
        .filter((r) => r.relname === "business_staff")
        .map(({ tgname, tgenabled, definition }) => ({
          name: tgname,
          enabled: tgenabled,
          definition,
        }));
      const expectedTriggers = observed.tables
        .find((r) => r.table === "business_staff")
        .triggers.filter((r) => !r.internal)
        .map(({ name, enabled, definition }) => ({ name, enabled, definition }));
      assert.deepEqual(staffTriggers, expectedTriggers);
      // PG18 emits contype=n for NOT NULL in addition to attnotnull. Exclude ONLY
      // this version representation after separately checking every selected NN
      // column; all other selected PK/unique/CHECK/FK definitions compare exactly.
      const notNull = {
        business_staff: [
          "id",
          "business_id",
          "user_id",
          "role",
          "duties",
          "active",
          "on_shift",
          "created_at",
          "updated_at",
        ],
        chat_threads: ["id", "title", "created_by", "created_at", "updated_at", "kind"],
        chat_thread_members: ["thread_id", "user_id", "status", "joined_at"],
        employee_shifts: [
          "id",
          "shop_id",
          "profile_id",
          "user_id",
          "status",
          "clocked_in_at",
          "created_at",
          "updated_at",
        ],
      };
      for (const record of observed.tables) {
        const actualTable = current.tables.find(
          (r) => r.nspname === record.schema && r.relname === record.table,
        );
        assert.equal(actualTable.owner, record.owner);
        assert.equal(actualTable.relrowsecurity, record.rls);
        assert.equal(actualTable.relforcerowsecurity, record.force_rls);
        assert.deepEqual(
          current.columns
            .filter(
              (r) => r.nspname === record.schema && r.relname === record.table && r.attnotnull,
            )
            .map((r) => r.attname)
            .sort(),
          notNull[record.table].sort(),
        );
        const constraints = current.constraints
          .filter(
            (r) => r.nspname === record.schema && r.relname === record.table && r.contype !== "n",
          )
          .map(({ conname, contype, convalidated, definition }) => ({
            name: conname,
            type: contype,
            validated: convalidated,
            definition,
          }));
        assert.deepEqual(constraints, record.constraints);
      }
      const profileFks = current.constraints.filter(
        (r) => r.nspname === "shop_manager" && r.relname === "profiles" && r.contype === "f",
      );
      assert.deepEqual(
        profileFks.map((r) => r.conname),
        ["profiles_user_id_fkey"],
      );
      assert.ok(profileFks.every((r) => r.convalidated));
      assert.ok(
        current.constraints.some((r) => r.conname === "user_roles_user_id_fkey" && r.convalidated),
      );
      assert.equal(current.policies.filter((r) => r.tablename === "business_staff").length, 4);
      assert.equal(
        current.policies.filter((r) => r.tablename.startsWith("chat_")).length,
        0,
        "no invented/current chat-policy reachability proof",
      );
      assert.equal(
        (await db.query("SELECT count(*)::integer n FROM shop_manager.employee_work_locations"))
          .rows[0].n,
        2,
        "actual shops INSERT writer ran; attachment is retained-source-only, not captured live",
      );
    });
  },
);

test(
  "critical unchanged CHECK, FK, team uniqueness and open-session/open-shift constraints are enforced",
  options,
  async () => {
    await withFixture(async (db, { user, profile }) => {
      const seeded = await seedSession(db, user, profile, id.shopA);
      const before = await snapshot(db);
      const failures = [
        [
          "UPDATE public.chat_thread_members SET status='inactive' WHERE user_id=$1",
          [user],
          "23514",
          "chat_thread_members_status_check",
        ],
        [
          "UPDATE shop_manager.employee_shifts SET status='clocked_out' WHERE id=$1",
          [seeded.shift],
          "23514",
          "employee_shifts_status_check",
        ],
        [
          "UPDATE shop_manager.employee_shifts SET clocked_out_at='1999-01-01Z' WHERE id=$1",
          [seeded.shift],
          "23514",
          "employee_shifts_check",
        ],
        [
          "INSERT INTO shop_manager.employee_shifts(shop_id,profile_id,user_id) VALUES($1,$2,$3)",
          [id.shopB, profile, user],
          "23505",
          "employee_shifts_one_open_per_user",
        ],
        [
          "INSERT INTO shop_manager.register_sessions(register_id,shop_id,shift_id,opened_by_profile_id,opened_by_user_id) VALUES($1,$2,$3,$4,$5)",
          [seeded.register, id.shopA, seeded.shift, profile, user],
          "23505",
          "register_one_open",
        ],
        [
          "UPDATE shop_manager.register_sessions SET status='inactive' WHERE id=$1",
          [seeded.session],
          "23514",
          "register_sessions_status_check",
        ],
        [
          "UPDATE shop_manager.register_sessions SET shift_id=$1 WHERE id=$2",
          [id.stranger, seeded.session],
          "23503",
          "register_sessions_shift_id_fkey",
        ],
        [
          "UPDATE shop_manager.employee_shifts SET profile_id=$1 WHERE id=$2",
          [id.stranger, seeded.shift],
          "23503",
          "employee_shifts_profile_id_fkey",
        ],
        [
          "INSERT INTO public.chat_threads(title,created_by,business_id,kind) VALUES('duplicate',$1,$2,'team')",
          [id.ownerA, id.businessA],
          "23505",
          "chat_threads_business_team_unique",
        ],
        [
          "UPDATE shop_manager.profiles SET user_id=$1 WHERE id=$2",
          [id.legacy, profile],
          "23503",
          "profiles_user_id_fkey",
        ],
      ];
      for (const [sql, params, code, constraint] of failures)
        await assert.rejects(db.query(sql, params), hasCode(code, constraint));
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "self on_shift and no-op UPDATE reactivate left membership without native remapping; targeted role no-op does remap",
  options,
  async () => {
    await withFixture(
      async (db, { user }) => {
        const originalCatalog = await catalog(db);
        const originalBinding = await binding(db, user);
        const originalRoles = await roles(db, user);
        const old = await target(db);
        const result = await actor(
          db,
          user,
          "UPDATE public.business_staff SET on_shift=on_shift WHERE id=$1 RETURNING id,on_shift",
          [id.staffA],
        );
        assert.equal(result.rows.length, 1);
        assert.equal(result.rows[0].on_shift, false);
        assert.deepEqual(await membership(db, id.threadA, user), ["active"]);
        assert.ok((await target(db)).updated_at > old.updated_at);
        assert.deepEqual(await binding(db, user), originalBinding);
        assert.deepEqual(await roles(db, user), originalRoles);
        await actor(
          db,
          user,
          "UPDATE public.business_staff SET on_shift=true WHERE id=$1 RETURNING id",
          [id.staffA],
        );
        assert.equal((await target(db)).on_shift, true);
        assert.deepEqual(await binding(db, user), originalBinding);
        // Privileged setup creates a deliberately different single native binding.
        // The subsequent real actor's role-targeted no-op invokes UPDATE OF bridge.
        await db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE user_id=$2", [
          id.shopB,
          user,
        ]);
        await actor(
          db,
          user,
          "UPDATE public.business_staff SET role=role WHERE id=$1 RETURNING id",
          [id.staffA],
        );
        assert.equal((await binding(db, user))[0].shop_id, id.shopA);
        assert.deepEqual(await roles(db, user), ["truck_driver"]);
        assert.deepEqual(await catalog(db), originalCatalog);
      },
      { membership: "left", legacy: true },
    );
  },
);

test(
  "self business_id-only retarget leaves old chat/native state; unrelated actor affects zero rows",
  options,
  async () => {
    await withFixture(
      async (db, { user }) => {
        const before = await snapshot(db);
        const denied = await actor(
          db,
          id.stranger,
          "UPDATE public.business_staff SET business_id=$1 WHERE id=$2 RETURNING id",
          [id.businessB, id.staffA],
        );
        assert.deepEqual(denied.rows, []);
        assert.deepEqual(await snapshot(db), before);
        const originalBinding = await binding(db, user);
        const originalRoles = await roles(db, user);
        const result = await actor(
          db,
          user,
          "UPDATE public.business_staff SET business_id=$1 WHERE id=$2 RETURNING business_id",
          [id.businessB, id.staffA],
        );
        assert.deepEqual(result.rows, [{ business_id: id.businessB }]);
        assert.deepEqual(await membership(db, id.threadA, user), ["active"]);
        assert.deepEqual(await membership(db, id.threadB, user), ["active"]);
        assert.deepEqual(await binding(db, user), originalBinding);
        assert.deepEqual(await roles(db, user), originalRoles);
        assert.deepEqual(await catalog(db), before.catalog);
      },
      { legacy: true },
    );
  },
);

test(
  "existing member deactivation rejects actual chat CHECK and explicitly rolls back all rows, timestamp and ACLs",
  options,
  async () => {
    await withFixture(
      async (db, { user, profile }) => {
        await seedSession(db, user, profile, id.shopA);
        const before = await snapshot(db);
        await assert.rejects(
          actor(
            db,
            id.ownerA,
            "UPDATE public.business_staff SET active=false WHERE id=$1 RETURNING id",
            [id.staffA],
          ),
          hasCode("23514", "chat_thread_members_status_check"),
        );
        assert.deepEqual(
          await snapshot(db),
          before,
          "explicit ROLLBACK restores roster/timestamp and preexisting affected state; both AFTER attachments retained",
        );
        assert.equal((await target(db)).active, true);
      },
      { legacy: true },
    );
  },
);

test(
  "absent chat member reaches open-shift CHECK failure and rolls back earlier register cleanup",
  options,
  async () => {
    await withFixture(
      async (db, { user, profile }) => {
        const seeded = await seedSession(db, user, profile, id.shopA);
        assert.deepEqual(await membership(db, id.threadA, user), []);
        const before = await snapshot(db);
        await assert.rejects(
          actor(
            db,
            id.ownerA,
            "UPDATE public.business_staff SET active=false WHERE id=$1 RETURNING id",
            [id.staffA],
          ),
          hasCode("23514", "employee_shifts_status_check"),
        );
        assert.deepEqual(await snapshot(db), before);
        assert.deepEqual(
          (
            await db.query(
              "SELECT status,closed_at,counted_cash,closing_note FROM shop_manager.register_sessions WHERE id=$1",
              [seeded.session],
            )
          ).rows,
          [{ status: "open", closed_at: null, counted_cash: null, closing_note: null }],
        );
        assert.equal((await target(db)).active, true);
      },
      { membership: null, legacy: true },
    );
  },
);

test(
  "actual owner DELETE removes chat member while native owner provisioning preserves legacy profile and role",
  options,
  async () => {
    await withFixture(
      async (db, { user, profile }) => {
        const beforeCatalog = await catalog(db);
        assert.deepEqual(await membership(db, id.threadA, user), ["active"]);
        const result = await actor(
          db,
          user,
          "DELETE FROM public.business_staff WHERE id=$1 RETURNING id",
          [id.staffA],
        );
        assert.deepEqual(result.rows, [{ id: id.staffA }]);
        assert.equal(await target(db), undefined);
        assert.deepEqual(await membership(db, id.threadA, user), []);
        assert.deepEqual(await binding(db, user), [
          { id: profile, user_id: user, shop_id: id.shopA },
        ]);
        assert.notEqual(profile, user);
        assert.deepEqual(await roles(db, user), ["owner"]);
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::integer n FROM shop_manager.cash_registers WHERE shop_id=$1",
              [id.shopA],
            )
          ).rows[0].n,
          1,
        );
        assert.deepEqual(await catalog(db), beforeCatalog);
      },
      { owner: true, legacy: true },
    );
  },
);

test(
  "multi-roster no-open-shift success closes user-wide sessions but keeps other-shop legacy binding and other_staff",
  options,
  async () => {
    await withFixture(
      async (db, { user, profile }) => {
        // Deliberately stale but physically permitted: open sessions reference
        // completed shifts in distinct registers/shops. No dual open shifts exist.
        const a = await seedSession(db, user, profile, id.shopA, "completed");
        const b = await seedSession(db, user, profile, id.shopB, "completed");
        await db.query(
          "INSERT INTO shop_manager.user_roles(user_id,role_id) SELECT $1,id FROM shop_manager.roles WHERE name='other_staff'",
          [user],
        );
        assert.deepEqual(await membership(db, id.threadA, user), []);
        const before = await snapshot(db);
        const result = await actor(
          db,
          id.ownerA,
          "UPDATE public.business_staff SET active=false WHERE id=$1 RETURNING active",
          [id.staffA],
        );
        assert.deepEqual(result.rows, [{ active: false }]);
        assert.deepEqual(await binding(db, user), [
          { id: profile, user_id: user, shop_id: id.shopB },
        ]);
        assert.notEqual(profile, user);
        assert.deepEqual(
          await roles(db, user),
          ["other_staff"],
          "inactive role list omits other_staff while active remapping includes it",
        );
        assert.deepEqual(
          (await db.query("SELECT active FROM public.business_staff WHERE id=$1", [id.staffB]))
            .rows,
          [{ active: true }],
        );
        assert.deepEqual(await membership(db, id.threadA, user), []);
        const sessions = (
          await db.query(
            "SELECT id,shop_id,status,counted_cash,expected_cash,variance,closing_note,closed_at IS NOT NULL closed FROM shop_manager.register_sessions ORDER BY shop_id",
          )
        ).rows;
        assert.deepEqual(sessions.map((r) => r.id).sort(), [a.session, b.session].sort());
        for (const row of sessions) {
          assert.equal(row.status, "manager_closed");
          assert.equal(row.counted_cash, row.expected_cash);
          assert.equal(Number(row.variance), 0);
          assert.equal(row.closing_note, "Employee access deactivated");
          assert.equal(row.closed, true);
        }
        assert.deepEqual(
          (await data(db))["shop_manager.employee_shifts"],
          before.data["shop_manager.employee_shifts"],
        );
        assert.deepEqual(await catalog(db), before.catalog);
      },
      { membership: null, legacy: true, secondRoster: true, nativeShop: id.shopB },
    );
  },
);
