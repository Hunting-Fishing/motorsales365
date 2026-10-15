// MEMORY-ONLY research: this candidate is not adopted authority, a migration,
// an operator installer/recovery, full app compatibility or production safety.
// The shared fixture pins actual selected declarations/critical constraints and
// all three existing staff attachments, with explicit synthetic platform support.
// It deliberately omits chat policies: this does NOT close raw chat reentry,
// native/bootstrap/ownership writers, multi-roster policy, JWT/API or concurrency.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildNativeSelfShiftCandidate } from "./native-self-shift-candidate.mjs";
import {
  functions,
  observed,
  id,
  options,
  withFixture,
  actor,
  catalog,
  snapshot,
  target,
  binding,
  roles,
  membership,
  seedSession,
  hasCode,
  pin,
} from "./fixtures/native-staff-trigger-fixture.mjs";

const candidate = buildNativeSelfShiftCandidate();
const otherStaff = "30000000-0000-4000-8000-000000000009";
const appSource = pin(
  fs.readFileSync(new URL("../../src/lib/business-staff.functions.ts", import.meta.url), "utf8"),
  "428a12f41e73b43c64e5631f71fed3e06dd5d341222fea5ad6c45f92919ec1c9",
  "current staff adapter (not database/API acceptance)",
);

// Both install AND recovery require an explicit transaction. A failing suffix
// below is an honest transaction-wrapper fault control, not a fabricated writer.
async function sqlTransaction(db, sql) {
  await db.exec("BEGIN");
  try {
    await db.exec(sql);
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
const install = (db) => sqlTransaction(db, candidate.installSql);
const recover = (db) => sqlTransaction(db, candidate.recoverSql);

async function roleTransaction(db, role, subject, run) {
  assert.ok(["authenticated", "service_role"].includes(role));
  await db.exec(`BEGIN; SET LOCAL ROLE ${role}`);
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [subject ?? ""]);
    const result = await run();
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

// The source harness intentionally reports SELECTED catalog/permission facets,
// not global ACL closure. Extend it with the candidate's private objects, ACLs
// and default ACL metadata so installation/refusal/recovery cannot hide them.
async function privateCatalog(db) {
  const out = {};
  for (const [key, sql] of Object.entries({
    schemas: `SELECT nspname,pg_get_userbyid(nspowner) owner,nspacl::text acl,
      has_schema_privilege('anon',oid,'USAGE') anon_usage,
      has_schema_privilege('authenticated',oid,'USAGE') authenticated_usage,
      has_schema_privilege('service_role',oid,'USAGE') service_usage
      FROM pg_namespace WHERE nspname='companion_candidate' ORDER BY 1`,
    functions: `SELECT p.proname,pg_get_userbyid(p.proowner) owner,p.prosecdef,
      p.proconfig,p.proacl::text acl,md5(pg_get_functiondef(p.oid)) definition_md5,
      has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
      has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
      has_function_privilege('service_role',p.oid,'EXECUTE') service_execute
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='companion_candidate' ORDER BY 1`,
    relations: `SELECT c.relname,c.relkind,pg_get_userbyid(c.relowner) owner,
      c.relacl::text acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='companion_candidate' ORDER BY 1`,
    defaultAcl: `SELECT pg_get_userbyid(d.defaclrole) owner,
      COALESCE(n.nspname,'') schema,d.defaclobjtype,d.defaclacl::text acl
      FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
      ORDER BY 1,2,3`,
  }))
    out[key] = (await db.query(sql)).rows;
  // This exact table exists only in the recovery dependency-refusal negative.
  out.dependencyRows = (await db.query("SELECT to_regclass('companion_candidate.extra') id"))
    .rows[0].id
    ? (await db.query("SELECT id FROM companion_candidate.extra ORDER BY id")).rows
    : [];
  return out;
}
async function completeSnapshot(db) {
  return { selected: await snapshot(db), private: await privateCatalog(db) };
}
function withoutShiftAndDerivedTimestamp(value) {
  const result = structuredClone(value);
  for (const item of result.selected.data["public.business_staff"])
    if (item.row.id === id.staffA) {
      delete item.row.on_shift;
      delete item.row.updated_at;
    }
  return result;
}
async function unchangedAfterFailure(db, operation, code = "42501") {
  const before = await completeSnapshot(db);
  await assert.rejects(operation(), hasCode(code));
  assert.deepEqual(await completeSnapshot(db), before);
}
async function selfShift(db, user, value) {
  return actor(
    db,
    user,
    "UPDATE public.business_staff SET on_shift=$1 WHERE id=$2 RETURNING id,on_shift",
    [value, id.staffA],
  );
}

test(
  "builder pins the unchanged source and changes only the candidate chat prefix",
  options,
  () => {
    assert.deepEqual(buildNativeSelfShiftCandidate(), candidate);
    assert.throws(
      () => buildNativeSelfShiftCandidate({ chatSource: functions.chat + "\n" }),
      /LF source drift/,
    );
    assert.throws(() => buildNativeSelfShiftCandidate({ chatSource: "" }), /bounded input/);
    assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
    assert.match(candidate.chatDefinition, /IF TG_OP='UPDATE' THEN/);
    assert.ok(
      candidate.chatDefinition.indexOf("RETURN NEW;") <
        candidate.chatDefinition.indexOf("public.ensure_business_team_thread(NEW.business_id)"),
    );
    const inserted = candidate.chatDefinition.slice(
      candidate.chatDefinition.indexOf("-- Candidate-only"),
      candidate.chatDefinition.indexOf("  IF (TG_OP = 'DELETE')"),
    );
    for (const field of [
      "id",
      "business_id",
      "user_id",
      "created_at",
      "role",
      "title",
      "duties",
      "active",
      "invited_by",
    ])
      assert.ok(inserted.includes(`NEW.${field} IS NOT DISTINCT FROM OLD.${field}`));
    assert.doesNotMatch(inserted, /NEW\.(?:on_shift|updated_at)/);
    assert.ok(
      candidate.chatDefinition.endsWith(
        functions.chat.slice(functions.chat.indexOf("  IF (TG_OP = 'DELETE')")),
      ),
    );
    for (const sql of [candidate.installSql, candidate.recoverSql]) {
      assert.doesNotMatch(sql, /^\s*(?:BEGIN|COMMIT|ROLLBACK)\s*;/m);
      assert.doesNotMatch(sql, /\bCASCADE\b|ALTER TABLE .*DISABLE|CREATE POLICY|GRANT EXECUTE/i);
    }
  },
);

test(
  "install retains all three original attachments and private denial ACLs; exact recovery restores state",
  options,
  async () => {
    await withFixture(async (db) => {
      const original = await completeSnapshot(db);
      const originalTriggers = (await catalog(db)).triggers;
      await install(db);
      const installed = await completeSnapshot(db);
      assert.deepEqual(installed.selected.data, original.selected.data);
      assert.equal(installed.private.schemas.length, 1);
      assert.deepEqual(installed.private.schemas[0], {
        nspname: "companion_candidate",
        owner: "postgres",
        acl: "{postgres=UC/postgres}",
        anon_usage: false,
        authenticated_usage: false,
        service_usage: false,
      });
      assert.deepEqual(
        installed.private.functions.map((f) => f.proname),
        ["deny_other_commands", "guard_self_shift", "reject_privileged_target"],
      );
      for (const f of installed.private.functions) {
        assert.equal(f.owner, "postgres");
        assert.equal(f.prosecdef, f.proname === "guard_self_shift");
        assert.deepEqual(f.proconfig, ['search_path=""']);
        assert.equal(f.acl, "{postgres=X/postgres}");
        assert.equal(f.anon_execute, false);
        assert.equal(f.authenticated_execute, false);
        assert.equal(f.service_execute, false);
        await assert.rejects(
          actor(db, id.actor, `SELECT companion_candidate.${f.proname}()`),
          hasCode("42501"),
        );
      }
      assert.deepEqual(
        installed.selected.catalog.triggers.filter((t) => !t.tgname.startsWith("companion_")),
        originalTriggers,
      );
      assert.equal(
        installed.selected.catalog.triggers.filter((t) => t.relname === "business_staff").length,
        6,
      );
      assert.deepEqual(
        installed.selected.catalog.functions.filter(
          (f) => f.proname !== "trg_staff_sync_team_thread",
        ),
        original.selected.catalog.functions.filter(
          (f) => f.proname !== "trg_staff_sync_team_thread",
        ),
      );
      await unchangedAfterFailure(db, () => install(db), "55000");
      await recover(db);
      assert.deepEqual(await completeSnapshot(db), original);
      await unchangedAfterFailure(db, () => recover(db), "55000");
    });
  },
);

test(
  "original body, ACL, attachment and preexisting private-schema drift refuse installation atomically",
  options,
  async () => {
    for (const drift of [
      async (db) => {
        const modified = functions.chat.replace(
          "DECLARE _thread_id uuid;",
          "DECLARE _thread_id uuid;\n-- fixture body drift",
        );
        assert.notEqual(modified, functions.chat);
        await db.exec(modified);
      },
      (db) =>
        db.exec("GRANT EXECUTE ON FUNCTION public.trg_staff_sync_team_thread() TO authenticated"),
      (db) =>
        db.exec(
          "ALTER TABLE public.business_staff DISABLE TRIGGER business_staff_team_thread_sync",
        ),
      (db) => db.exec("CREATE SCHEMA companion_candidate"),
    ])
      await withFixture(async (db) => {
        await drift(db);
        await unchangedAfterFailure(db, () => install(db), "55000");
      });
  },
);

test(
  "explicit transaction rollback undoes a fault after installation or after recovery DDL",
  options,
  async () => {
    await withFixture(async (db) => {
      const original = await completeSnapshot(db);
      await unchangedAfterFailure(
        db,
        () => sqlTransaction(db, candidate.installSql + "\nSELECT 1/0;"),
        "22012",
      );
      assert.deepEqual(await completeSnapshot(db), original);
      await install(db);
      await unchangedAfterFailure(
        db,
        () => sqlTransaction(db, candidate.recoverSql + "\nSELECT 1/0;"),
        "22012",
      );
      await recover(db);
      assert.deepEqual(await completeSnapshot(db), original);
    });
  },
);

test(
  "recovery refuses candidate body/config/ACL/attachment drift and preserves unexpected dependencies",
  options,
  async () => {
    for (const [drift, code] of [
      [
        async (db) => {
          const modified = candidate.chatDefinition.replace(
            "DECLARE _thread_id uuid;",
            "DECLARE _thread_id uuid;\n-- candidate body drift",
          );
          assert.notEqual(modified, candidate.chatDefinition);
          await db.exec(modified);
        },
        "55000",
      ],
      [(db) => db.exec("ALTER FUNCTION public.trg_staff_sync_team_thread() STABLE"), "55000"],
      [
        (db) =>
          db.exec("ALTER FUNCTION companion_candidate.guard_self_shift() SET search_path=public"),
        "55000",
      ],
      [
        (db) =>
          db.exec(
            "GRANT EXECUTE ON FUNCTION companion_candidate.reject_privileged_target() TO authenticated",
          ),
        "55000",
      ],
      [
        (db) =>
          db.exec(
            "ALTER TABLE public.business_staff DISABLE TRIGGER companion_b_privileged_target",
          ),
        "55000",
      ],
      [
        (db) =>
          db.exec(
            "CREATE TABLE companion_candidate.extra(id integer PRIMARY KEY); INSERT INTO companion_candidate.extra VALUES(7)",
          ),
        "2BP01",
      ],
    ])
      await withFixture(async (db) => {
        await install(db);
        await drift(db);
        await unchangedAfterFailure(db, () => recover(db), code);
      });
  },
);

for (const state of ["active", "invited", "left", "absent", "missing team"])
  test(
    `active self shift/no-op preserves ${state} chat and every unrelated selected row`,
    options,
    async () => {
      await withFixture(
        async (db, { user }) => {
          if (state === "missing team")
            await db.query("DELETE FROM public.chat_threads WHERE id=$1", [id.threadA]);
          await install(db);
          const before = await completeSnapshot(db);
          const old = await target(db);
          for (const value of [true, true, false, false]) {
            const result = await selfShift(db, user, value);
            assert.equal(result.affectedRows, 1);
            assert.deepEqual(result.rows, [{ id: id.staffA, on_shift: value }]);
            assert.equal((await target(db)).on_shift, value);
            assert.ok((await target(db)).updated_at > old.updated_at);
            assert.deepEqual(
              withoutShiftAndDerivedTimestamp(await completeSnapshot(db)),
              withoutShiftAndDerivedTimestamp(before),
            );
          }
          // Raw constant UPDATE has no WHERE, RHS column read or RETURNING.
          // A rows=[] result still represents one verified stored self mutation.
          const raw = await actor(db, user, "UPDATE public.business_staff SET on_shift=true");
          assert.equal(raw.affectedRows, 1);
          assert.deepEqual(raw.rows, []);
          assert.equal((await target(db)).on_shift, true);
          assert.deepEqual(
            withoutShiftAndDerivedTimestamp(await completeSnapshot(db)),
            withoutShiftAndDerivedTimestamp(before),
          );
          assert.deepEqual(
            await membership(db, id.threadA, user),
            ["absent", "missing team"].includes(state) ? [] : [state],
          );
        },
        { membership: state === "absent" ? null : state === "missing team" ? "left" : state },
      );
    },
  );

test(
  "self shift preserves a legitimate legacy profile and real open shift/register state",
  options,
  async () => {
    await withFixture(
      async (db, { user, profile }) => {
        assert.notEqual(profile, user);
        const session = await seedSession(db, user, profile, id.shopA);
        await install(db);
        const before = await completeSnapshot(db);
        const oldRoles = await roles(db, user);
        await selfShift(db, user, true);
        assert.equal((await target(db)).on_shift, true);
        assert.deepEqual(await binding(db, user), [
          { id: profile, user_id: user, shop_id: id.shopA },
        ]);
        assert.deepEqual(await roles(db, user), oldRoles);
        assert.deepEqual(
          (
            await db.query(
              "SELECT status,closed_at FROM shop_manager.register_sessions WHERE id=$1",
              [session.session],
            )
          ).rows,
          [{ status: "open", closed_at: null }],
        );
        assert.deepEqual(
          withoutShiftAndDerivedTimestamp(await completeSnapshot(db)),
          withoutShiftAndDerivedTimestamp(before),
        );
      },
      { legacy: true, membership: "left" },
    );
  },
);

test(
  "unchanged identity targets pass self shift; physically valid changed identities do not",
  options,
  async () => {
    await withFixture(
      async (db, { user }) => {
        await install(db);
        const before = await completeSnapshot(db);
        const result = await actor(
          db,
          user,
          "UPDATE public.business_staff SET id=id,business_id=business_id,user_id=user_id,created_at=created_at,on_shift=true WHERE id=$1 RETURNING id",
          [id.staffA],
        );
        assert.equal(result.affectedRows, 1);
        assert.deepEqual(result.rows, [{ id: id.staffA }]);
        assert.equal((await target(db)).on_shift, true);
        assert.deepEqual(
          withoutShiftAndDerivedTimestamp(await completeSnapshot(db)),
          withoutShiftAndDerivedTimestamp(before),
        );
        for (const [assignment, value] of [
          ["id=$1", otherStaff],
          ["business_id=$1", id.businessB],
          ["user_id=$1", id.stranger],
          ["created_at=$1::timestamptz", "2001-01-01Z"],
        ])
          await unchangedAfterFailure(db, () =>
            actor(
              db,
              user,
              `UPDATE public.business_staff SET ${assignment} WHERE id=$2 RETURNING id`,
              [value, id.staffA],
            ),
          );
      },
      { legacy: true },
    );
  },
);

test(
  "each privileged no-op target, raw constant shape, mixed SET and client timestamp are denied",
  options,
  async () => {
    await withFixture(async (db, { user }) => {
      await install(db);
      for (const assignment of [
        "role=role",
        "title=title",
        "duties=duties",
        "active=active",
        "invited_by=invited_by",
        "updated_at=updated_at",
        "on_shift=true,role=role",
      ])
        await unchangedAfterFailure(db, () =>
          actor(
            db,
            user,
            `UPDATE public.business_staff SET ${assignment} WHERE id=$1 RETURNING id`,
            [id.staffA],
          ),
        );
      await unchangedAfterFailure(db, () =>
        actor(db, user, "UPDATE public.business_staff SET role='driver'"),
      );
      await unchangedAfterFailure(db, () =>
        actor(db, user, "UPDATE public.business_staff SET updated_at='2001-01-01Z' WHERE id=$1", [
          id.staffA,
        ]),
      );
    });
    await withFixture(
      async (db, { user }) => {
        // Actual ownership is not adopted as privileged UPDATE delegation here.
        assert.equal(user, id.ownerA);
        await install(db);
        await unchangedAfterFailure(db, () =>
          actor(db, user, "UPDATE public.business_staff SET role=role WHERE id=$1 RETURNING id", [
            id.staffA,
          ]),
        );
      },
      { owner: true, legacy: true },
    );
  },
);

test(
  "inactive/other/NULL subjects have no self-shift recovery; service NULL cannot bypass",
  options,
  async () => {
    await withFixture(async (db, { user }) => {
      await install(db);
      for (const subject of [id.stranger, null]) {
        const before = await completeSnapshot(db);
        const result = await selfShift(db, subject, true);
        assert.equal(result.affectedRows, 0);
        assert.deepEqual(result.rows, []);
        assert.deepEqual(await completeSnapshot(db), before);
      }
      // Actual owner can see this source-policy row, but research permits only self.
      await unchangedAfterFailure(db, () => selfShift(db, id.ownerA, true));
      await unchangedAfterFailure(db, () =>
        roleTransaction(db, "service_role", null, () =>
          db.query("UPDATE public.business_staff SET on_shift=true WHERE id=$1", [id.staffA]),
        ),
      );
      assert.equal(user, id.actor);
    });
    await withFixture(
      async (db, { user }) => {
        // Fixture setup uses real retained inactive writers with no member/open shift,
        // then restores only a valid binding to isolate the OLD.active denial.
        await db.query("DELETE FROM public.chat_thread_members WHERE thread_id=$1 AND user_id=$2", [
          id.threadA,
          user,
        ]);
        await db.query("UPDATE public.business_staff SET active=false WHERE id=$1", [id.staffA]);
        await db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE user_id=$2", [
          id.shopA,
          user,
        ]);
        await install(db);
        await unchangedAfterFailure(db, () => selfShift(db, user, true));
      },
      { legacy: true },
    );
  },
);

test(
  "conservative all-roster, competing identity, missing/mismatched profile and link gates fail closed",
  options,
  async () => {
    for (const setup of [
      async (db) => {
        await db.query(
          "INSERT INTO public.business_staff(id,business_id,user_id,role) VALUES($1,$2,$3,'driver')",
          [id.staffB, id.businessB, id.actor],
        );
        await db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE user_id=$2", [
          id.shopA,
          id.actor,
        ]);
      },
      (db) =>
        db.query(
          "INSERT INTO shop_manager.profiles(id,email,shop_id,first_name,last_name) VALUES($1,'null-shadow@example.test',$2,'Null','Shadow')",
          [id.actor, id.shopB],
        ),
      (db) =>
        db.query(
          "INSERT INTO shop_manager.profiles(id,user_id,email,shop_id,first_name,last_name) VALUES($1,$2,'false-shadow@example.test',$3,'False','Shadow')",
          [id.actor, id.stranger, id.shopB],
        ),
      (db) => db.query("DELETE FROM shop_manager.profiles WHERE user_id=$1", [id.actor]),
      (db) =>
        db.query("UPDATE shop_manager.profiles SET shop_id=$1 WHERE user_id=$2", [
          id.shopB,
          id.actor,
        ]),
      (db) =>
        db.query("UPDATE shop_manager.profiles SET shop_id=NULL WHERE user_id=$1", [id.actor]),
      (db) => db.query("UPDATE shop_manager.shops SET business_id=NULL WHERE id=$1", [id.shopA]),
    ])
      await withFixture(
        async (db, { user }) => {
          await setup(db);
          await install(db);
          await unchangedAfterFailure(db, () => selfShift(db, user, true));
        },
        { legacy: true },
      );
  },
);

test(
  "full current privileged app upsert, INSERT and DELETE are denied, not declared compatible",
  options,
  async () => {
    assert.match(appSource, /onConflict: "business_id,user_id"/);
    for (const field of [
      "business_id",
      "user_id",
      "role",
      "title",
      "duties",
      "active",
      "invited_by",
    ])
      assert.ok(appSource.slice(appSource.indexOf(".upsert(")).includes(`${field}:`));
    await withFixture(async (db, { user }) => {
      await install(db);
      // The actual owner's negative does not adopt owner/delegation authority.
      // ON CONFLICT still begins as INSERT and the deny gate must reject it before
      // any existing-key UPDATE branch, even if submitted identity values match.
      await unchangedAfterFailure(db, () =>
        actor(
          db,
          id.ownerA,
          `
      INSERT INTO public.business_staff(business_id,user_id,role,title,duties,active,invited_by)
      VALUES($1,$2,'driver','Fixture title','{}',true,$3)
      ON CONFLICT(business_id,user_id) DO UPDATE SET
        business_id=EXCLUDED.business_id,user_id=EXCLUDED.user_id,role=EXCLUDED.role,
        title=EXCLUDED.title,duties=EXCLUDED.duties,active=EXCLUDED.active,invited_by=EXCLUDED.invited_by
      RETURNING id`,
          [id.businessA, user, id.ownerA],
        ),
      );
      await unchangedAfterFailure(db, () =>
        actor(
          db,
          id.ownerA,
          "INSERT INTO public.business_staff(business_id,user_id,role) VALUES($1,$2,'driver') ON CONFLICT(business_id,user_id) DO NOTHING",
          [id.businessA, user],
        ),
      );
      await unchangedAfterFailure(db, () =>
        actor(
          db,
          id.ownerA,
          "INSERT INTO public.business_staff(business_id,user_id,role) VALUES($1,$2,'driver') RETURNING id",
          [id.businessA, id.stranger],
        ),
      );
      await unchangedAfterFailure(db, () =>
        actor(db, id.ownerA, "DELETE FROM public.business_staff WHERE id=$1 RETURNING id", [
          id.staffA,
        ]),
      );
    });
  },
);

test(
  "raw bulk and dependent CTE failures restore earlier self shift despite mutable manager visibility",
  options,
  async () => {
    await withFixture(
      async (db, { user }) => {
        // Privileged pre-install setup retains the actual native/chat writers. A
        // mutable manager row is only a negative source-RLS reachability control.
        await db.query("UPDATE public.business_staff SET role='manager' WHERE id=$1", [id.staffA]);
        await db.query(
          "INSERT INTO public.business_staff(id,business_id,user_id,role) VALUES($1,$2,$3,'driver')",
          [otherStaff, id.businessA, id.stranger],
        );
        await install(db);
        assert.equal(
          (await actor(db, user, "SELECT id FROM public.business_staff ORDER BY id")).rows.length,
          2,
        );
        await unchangedAfterFailure(db, () =>
          actor(db, user, "UPDATE public.business_staff SET role=role WHERE id=$1 RETURNING id", [
            id.staffA,
          ]),
        );
        await unchangedAfterFailure(db, () =>
          actor(db, user, "UPDATE public.business_staff SET on_shift=true"),
        );
        await unchangedAfterFailure(db, () =>
          actor(
            db,
            user,
            `
      WITH shifted AS (
        UPDATE public.business_staff SET on_shift=true WHERE id=$1 RETURNING id
      )
      UPDATE public.business_staff SET on_shift=true
      WHERE id=$2 AND EXISTS(SELECT 1 FROM shifted) RETURNING id`,
            [id.staffA, otherStaff],
          ),
        );
        assert.equal((await target(db)).on_shift, false);
      },
      { legacy: true },
    );
  },
);

test(
  "real on_shift NOT NULL failure rolls back an earlier successful statement and all retained effects",
  options,
  async () => {
    await withFixture(
      async (db, { user, profile }) => {
        await seedSession(db, user, profile, id.shopA);
        await install(db);
        const before = await completeSnapshot(db);
        await assert.rejects(
          roleTransaction(db, "authenticated", user, async () => {
            const first = await db.query(
              "UPDATE public.business_staff SET on_shift=true WHERE id=$1 RETURNING id",
              [id.staffA],
            );
            assert.equal(first.affectedRows, 1);
            assert.deepEqual(first.rows, [{ id: id.staffA }]);
            return db.query(
              "UPDATE public.business_staff SET on_shift=NULL WHERE id=$1 RETURNING id",
              [id.staffA],
            );
          }),
          hasCode("23502"),
        );
        assert.deepEqual(await completeSnapshot(db), before);
        assert.equal((await target(db)).on_shift, false);
      },
      { legacy: true, membership: "left" },
    );
  },
);
