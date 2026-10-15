// OFFLINE characterization, NOT an adopted guard, production incident/exploit,
// live-row assertion, trusted ownership/delegation or API/concurrency proof.
// Actual selected DDL/helpers/policies and the bounded unchanged policy sweep
// run in disposable fixtures. auth/roles are synthetic platform support; no
// shops/businesses/incoming-FK/indirect-writer closure is invented or replayed.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pins,
  sources,
  ddl,
  functions,
  policies,
  observed,
  ids,
  withFixture,
  actor,
  catalog,
  data,
  state,
  hasCode,
  sha,
  pin,
  fn,
} from "./fixtures/native-profile-role-policy-fixture.mjs";

const options = { concurrency: false, timeout: 30_000 };
const missingAuth = "99999999-9999-4999-8999-999999999999";
const constraint = (code, name) => (error) => error.code === code && error.constraint === name;
const profile = async (db, id) =>
  (await db.query("SELECT * FROM shop_manager.profiles WHERE id=$1", [id])).rows[0];
const assignments = async (db) =>
  (await db.query("SELECT id,user_id,role_id,created_at FROM shop_manager.user_roles ORDER BY id"))
    .rows;
const currentShop = async (db, subject) =>
  (await actor(db, subject, "SELECT shop_manager.get_current_user_shop_id() id")).rows[0].id;
async function unchangedFailure(db, operation, check = hasCode("42501")) {
  const before = await state(db);
  await assert.rejects(operation(), check);
  assert.deepEqual(await state(db), before);
}
async function unchangedZero(db, operation) {
  const before = await state(db);
  const result = await operation();
  assert.equal(result.affectedRows, 0);
  assert.deepEqual(result.rows, []);
  assert.deepEqual(await state(db), before);
}
async function sameMetadata(db, before) {
  const after = await state(db);
  assert.deepEqual(after.catalog, before.catalog);
  assert.deepEqual(after.platform, before.platform);
  assert.deepEqual(after.data["auth.users"], before.data["auth.users"]);
  return after;
}
async function rolledBackActor(db, subject, run) {
  const before = await state(db);
  await db.exec("BEGIN; SET LOCAL ROLE authenticated");
  try {
    await db.query("SELECT pg_catalog.set_config('request.jwt.claim.sub',$1,true)", [
      subject ?? "",
    ]);
    return await run();
  } finally {
    await db.exec("ROLLBACK");
    assert.deepEqual(await state(db), before);
  }
}
async function inspectAssignments(db) {
  // Explicit privileged fixture inspection, not an application bypass or an
  // original-human authority inference from SET ROLE/current_user/session GUCs.
  await db.exec("SET LOCAL ROLE postgres");
  try {
    return await assignments(db);
  } finally {
    await db.exec("SET LOCAL ROLE authenticated");
  }
}

test(
  "whole/section/definition/evidence pins fail closed and exclude historical writers",
  options,
  () => {
    assert.equal(Object.keys(pins.sources).length, 11);
    assert.equal(Object.keys(pins.segments).length, 14);
    assert.equal(Object.keys(functions).length, 3);
    assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
    assert.match(observed.scope, /No application rows\/counts, function invocation or writes/);
    assert.equal(
      pins.observation[1],
      "d92af49531821c95fe9173bc3184b77060c22ffdaac30d7e7b70311e60f2712a",
    );
    assert.equal(
      pins.catalogQuery[1],
      "ea8597272733c8579651e6f9c47cb0e600a2cfa5addaf6b03ea91d7706ce880d",
    );
    assert.throws(() => pin(sources.roles + "\n", sha(sources.roles), "tamper"), /LF source drift/);
    assert.equal(sha(sources.roles.replaceAll("\n", "\r\n")), sha(sources.roles));
    assert.throws(
      () =>
        fn(
          functions.currentShop + "\n" + functions.currentShop,
          "shop_manager.get_current_user_shop_id",
          sha(functions.currentShop),
          "",
        ),
      /one complete definition/,
    );
    assert.doesNotMatch(
      Object.values(ddl).join("\n") + Object.values(functions).join("\n"),
      /ensure_profile_for|CREATE TABLE (?:public\.businesses|shop_manager\.shops)|CREATE TRIGGER/,
    );
    assert.match(policies.originalRoles, /FOR SELECT TO authenticated USING \(true\)/);
    assert.match(policies.sweep, /FOR ALL TO authenticated USING %s WITH CHECK %s/);
  },
);

test(
  "selected current metadata matches with only PG18 NOT NULL/OID-header normalization",
  options,
  async (t) => {
    await withFixture(async (db) => {
      const version = (await db.query("SHOW server_version")).rows[0].server_version;
      t.diagnostic(
        `Memory PostgreSQL ${version}; only NOT NULL catalog representation and OID-dependent header hash are normalized.`,
      );
      assert.match(version, /^18\./);
      const actual = await catalog(db);
      assert.deepEqual(
        actual.tables.map((r) => r.table),
        ["profiles", "roles", "user_roles"],
      );
      const expected = {
        tables: structuredClone(observed.tables),
        functions: structuredClone(observed.functions),
      };
      // Every column's nullability/default/type/ACL is compared BEFORE excluding
      // PG18's redundant contype=n records. All other constraints stay exact.
      for (const table of actual.tables) {
        const saved = expected.tables.find((r) => r.table === table.table);
        assert.deepEqual(table.columns, saved.columns);
        assert.deepEqual(table.user_triggers, []);
        table.constraints = table.constraints.filter((r) => r.type !== "n");
      }
      for (const record of [...actual.functions, ...expected.functions]) {
        // This hash includes owner/language/type OIDs, which are not portable
        // object identity. All readable API/security/config/body/definition fields
        // remain exact comparisons; do not normalize bodies or permission results.
        delete record.selected_header_md5;
      }
      assert.deepEqual(actual, expected);
      const before = await state(db);
      for (const table of actual.tables) {
        const auth = table.effective_acl.find((r) => r.role === "authenticated");
        for (const permission of ["select", "insert", "update", "delete"])
          assert.equal(auth[permission], true);
        for (const permission of ["truncate", "references", "trigger"])
          assert.equal(auth[permission], false);
        assert.ok(table.columns.every((c) => c.acl === null));
      }
      assert.deepEqual(
        (
          await actor(
            db,
            ids.actor,
            "SELECT current_user name,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
          )
        ).rows,
        [{ name: "authenticated", rolsuper: false, rolbypassrls: false }],
      );
      assert.deepEqual(await state(db), before);
    });
  },
);

test(
  "self/same-shop/other/NULL/no-profile visibility and public helper booleans differ from table ACL",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await state(db);
      assert.deepEqual(
        (await actor(db, ids.actor, "SELECT id FROM shop_manager.profiles ORDER BY id")).rows.map(
          (r) => r.id,
        ),
        [ids.actor, ids.admin, ids.target, ids.independentOwner],
      );
      assert.deepEqual(
        (await actor(db, ids.actor, "SELECT id FROM shop_manager.user_roles ORDER BY id")).rows,
        [{ id: ids.actorRole }],
      );
      assert.equal(
        (await actor(db, ids.actor, "SELECT id FROM shop_manager.roles")).rows.length,
        31,
      );
      for (const subject of [null, ids.noProfile])
        for (const table of ["profiles", "roles", "user_roles"])
          assert.deepEqual(
            (await actor(db, subject, `SELECT id FROM shop_manager.${table}`)).rows,
            [],
          );
      for (const table of ["profiles", "roles", "user_roles"])
        await assert.rejects(
          actor(db, null, `SELECT id FROM shop_manager.${table}`, [], "anon"),
          hasCode("42501"),
        );
      assert.deepEqual(
        (
          await actor(
            db,
            null,
            "SELECT shop_manager.is_owner_or_admin($1) privileged,shop_manager.user_belongs_to_shop($2,$3) member",
            [ids.admin, ids.target, ids.shopA],
            "anon",
          )
        ).rows,
        [{ privileged: true, member: true }],
      );
      await assert.rejects(actor(db, ids.actor, "TRUNCATE shop_manager.roles"), hasCode("42501"));
      assert.deepEqual(await state(db), before);
    });
  },
);

test(
  "original versus swept roles policy distinguishes command admission from unchanged CRUD grants",
  options,
  async () => {
    for (const policyVariant of ["original", "swept"])
      await withFixture(
        async (db) => {
          const meta = await catalog(db);
          const roleTable = meta.tables.find((r) => r.table === "roles");
          assert.equal(
            roleTable.effective_acl.find((r) => r.role === "authenticated").update,
            true,
          );
          assert.equal(roleTable.policies[0].command, policyVariant === "original" ? "r" : "*");
          assert.equal(
            (await actor(db, ids.noProfile, "SELECT id FROM shop_manager.roles")).rows.length,
            policyVariant === "original" ? 31 : 0,
          );
          if (policyVariant === "original") {
            await unchangedZero(db, () =>
              actor(
                db,
                ids.actor,
                "UPDATE shop_manager.roles SET created_at='2001-01-01Z' WHERE id=$1 RETURNING id",
                [ids.roleOwner],
              ),
            );
            await unchangedZero(db, () =>
              actor(db, ids.actor, "DELETE FROM shop_manager.roles WHERE id=$1 RETURNING id", [
                ids.roleOwner,
              ]),
            );
          } else {
            const before = await state(db);
            const changed = await actor(
              db,
              ids.actor,
              "UPDATE shop_manager.roles SET created_at='2001-01-01Z' WHERE id=$1 RETURNING id",
              [ids.roleOwner],
            );
            assert.equal(changed.affectedRows, 1);
            assert.deepEqual(changed.rows, [{ id: ids.roleOwner }]);
            assert.equal(
              (
                await db.query("SELECT created_at FROM shop_manager.roles WHERE id=$1", [
                  ids.roleOwner,
                ])
              ).rows[0].created_at.toISOString(),
              "2001-01-01T00:00:00.000Z",
            );
            await sameMetadata(db, before);
          }
          await unchangedFailure(db, () =>
            actor(db, ids.noProfile, "INSERT INTO shop_manager.roles(name) VALUES('owner')"),
          );
        },
        { policyVariant },
      );
  },
);

test(
  "self shop writes change next-statement scope and an unresolved non-NULL UUID opens the roles policy",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await state(db);
      const oldAssignments = await assignments(db);
      const moved = await actor(
        db,
        ids.actor,
        "UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2 RETURNING id,shop_id",
        [ids.shopB, ids.actor],
      );
      assert.equal(moved.affectedRows, 1);
      assert.deepEqual(moved.rows, [{ id: ids.actor, shop_id: ids.shopB }]);
      assert.equal((await profile(db, ids.actor)).shop_id, ids.shopB);
      assert.equal(await currentShop(db, ids.actor), ids.shopB);
      assert.deepEqual(
        (await actor(db, ids.actor, "SELECT id FROM shop_manager.profiles ORDER BY id")).rows.map(
          (r) => r.id,
        ),
        [ids.actor, ids.other],
      );
      // No shops table/existence assertion is supplied. Actual lack of a shop FK
      // permits this otherwise unrepresented UUID; non-NULL alone gates roles ALL.
      await actor(db, ids.actor, "UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2", [
        ids.shopC,
        ids.actor,
      ]);
      assert.equal(await currentShop(db, ids.actor), ids.shopC);
      assert.equal(
        (await actor(db, ids.actor, "SELECT id FROM shop_manager.roles")).rows.length,
        31,
      );
      const catalogWrite = await actor(
        db,
        ids.actor,
        "UPDATE shop_manager.roles SET created_at='2002-01-01Z' WHERE id=$1 RETURNING id",
        [ids.roleOther],
      );
      assert.equal(catalogWrite.affectedRows, 1);
      assert.equal(
        (
          await db.query("SELECT created_at FROM shop_manager.roles WHERE id=$1", [ids.roleOther])
        ).rows[0].created_at.toISOString(),
        "2002-01-01T00:00:00.000Z",
      );
      assert.deepEqual(await assignments(db), oldAssignments);
      await sameMetadata(db, before);
    });
  },
);

test(
  "identity OR branches permit user NULL/reassignment and legacy id changes, not both-branch loss",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await state(db);
      await actor(
        db,
        ids.actor,
        "UPDATE shop_manager.profiles SET user_id=NULL WHERE id=$1 RETURNING id",
        [ids.actor],
      );
      assert.equal((await profile(db, ids.actor)).user_id, null);
      assert.equal(await currentShop(db, ids.actor), ids.shopA);
      await actor(
        db,
        ids.actor,
        "UPDATE shop_manager.profiles SET user_id=$1 WHERE id=$2 RETURNING id",
        [ids.noProfile, ids.actor],
      );
      assert.equal((await profile(db, ids.actor)).user_id, ids.noProfile);
      assert.equal(
        (
          await actor(db, ids.noProfile, "SELECT id FROM shop_manager.profiles WHERE id=$1", [
            ids.actor,
          ])
        ).rows.length,
        1,
      );
      await unchangedFailure(db, () =>
        actor(
          db,
          ids.actor,
          "UPDATE shop_manager.profiles SET id=$1,user_id=NULL WHERE id=$2 RETURNING id",
          [ids.newProfile, ids.actor],
        ),
      );
      await sameMetadata(db, before);
    });
    await withFixture(async (db) => {
      const before = await state(db);
      await actor(
        db,
        ids.actor,
        "UPDATE shop_manager.profiles SET id=$1 WHERE id=$2 RETURNING id,user_id",
        [ids.legacy, ids.actor],
      );
      assert.equal((await profile(db, ids.legacy)).user_id, ids.actor);
      assert.equal(await profile(db, ids.actor), undefined);
      assert.equal(await currentShop(db, ids.actor), null);
      assert.deepEqual((await actor(db, ids.actor, "SELECT id FROM shop_manager.profiles")).rows, [
        { id: ids.legacy },
      ]);
      await actor(
        db,
        ids.actor,
        "UPDATE shop_manager.profiles SET id=$1 WHERE id=$2 RETURNING id",
        [ids.actor, ids.legacy],
      );
      assert.equal(await currentShop(db, ids.actor), ids.shopA);
      // This characterizes an allowed source write; it is not a recommended ID repair.
      await sameMetadata(db, before);
    });
  },
);

test(
  "legacy self can insert a NULL/false identity shadow; own insert needs only one OR branch",
  options,
  async () => {
    for (const shadowUser of [null, ids.noProfile])
      await withFixture(async (db) => {
        await db.query("UPDATE shop_manager.profiles SET id=$1 WHERE id=$2", [
          ids.legacy,
          ids.actor,
        ]);
        const before = await state(db);
        const inserted = await actor(
          db,
          ids.actor,
          "INSERT INTO shop_manager.profiles(id,user_id,email,shop_id) VALUES($1,$2,'shadow@example.test',$3) RETURNING id,user_id,shop_id",
          [ids.actor, shadowUser, ids.shopB],
        );
        assert.equal(inserted.affectedRows, 1);
        assert.deepEqual(inserted.rows, [
          { id: ids.actor, user_id: shadowUser, shop_id: ids.shopB },
        ]);
        assert.equal((await profile(db, ids.legacy)).user_id, ids.actor);
        assert.equal(await currentShop(db, ids.actor), ids.shopB);
        assert.deepEqual(
          (await actor(db, ids.actor, "SELECT id FROM shop_manager.profiles ORDER BY id")).rows.map(
            (r) => r.id,
          ),
          [ids.actor, ids.other, ids.legacy],
        );
        await sameMetadata(db, before);
      });
    await withFixture(async (db) => {
      const result = await actor(
        db,
        ids.noProfile,
        "INSERT INTO shop_manager.profiles(id,user_id,email,shop_id) VALUES($1,$2,'new-legacy@example.test',$3) RETURNING id",
        [ids.newProfile, ids.noProfile, ids.shopA],
      );
      assert.equal(result.affectedRows, 1);
      assert.equal((await profile(db, ids.newProfile)).user_id, ids.noProfile);
      assert.equal(await currentShop(db, ids.noProfile), null);
    });
  },
);

test(
  "raw constant self UPDATE mutates one row; other/profile-admin/null/insertion denials remain distinct",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await state(db);
      const raw = await actor(
        db,
        ids.actor,
        "UPDATE shop_manager.profiles SET phone='Fixture changed'",
      );
      assert.equal(raw.affectedRows, 1);
      assert.deepEqual(raw.rows, []);
      assert.equal((await profile(db, ids.actor)).phone, "Fixture changed");
      assert.equal((await profile(db, ids.target)).phone, null);
      for (const subject of [ids.actor, ids.admin, null])
        await unchangedZero(db, () =>
          actor(
            db,
            subject,
            "UPDATE shop_manager.profiles SET phone='Denied' WHERE id=$1 RETURNING id",
            [ids.target],
          ),
        );
      await unchangedZero(db, () =>
        actor(db, ids.actor, "DELETE FROM shop_manager.profiles WHERE id=$1 RETURNING id", [
          ids.actor,
        ]),
      );
      for (const subject of [ids.actor, null])
        await unchangedFailure(db, () =>
          actor(
            db,
            subject,
            "INSERT INTO shop_manager.profiles(id,user_id,email,shop_id) VALUES($1,$2,'not-self@example.test',$3) RETURNING id",
            [ids.newProfile, ids.noProfile, ids.shopA],
          ),
        );
      await sameMetadata(db, before);
    });
  },
);

test(
  "native admin role DML is same-shop/id-keyed; ordinary and independent-owner labels confer no management",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const subject of [ids.actor, ids.independentOwner]) {
        await unchangedFailure(db, () =>
          actor(
            db,
            subject,
            "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3) RETURNING id",
            [ids.newRoleAssignment, ids.target, ids.roleOther],
          ),
        );
        await unchangedZero(db, () =>
          actor(
            db,
            subject,
            "UPDATE shop_manager.user_roles SET role_id=$1 WHERE id=$2 RETURNING id",
            [ids.roleOwner, ids.targetRole],
          ),
        );
        await unchangedZero(db, () =>
          actor(db, subject, "DELETE FROM shop_manager.user_roles WHERE id=$1 RETURNING id", [
            ids.actorRole,
          ]),
        );
      }
      // independentOwner is only a synthetic label: no businesses row or actual
      // business ownership is represented or independently verified by this fixture.
      await unchangedFailure(db, () =>
        actor(
          db,
          ids.admin,
          "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3) RETURNING id",
          [ids.newRoleAssignment, ids.other, ids.roleOwner],
        ),
      );
      await unchangedZero(db, () =>
        actor(db, ids.admin, "DELETE FROM shop_manager.user_roles WHERE id=$1 RETURNING id", [
          ids.otherRole,
        ]),
      );
      const before = await state(db);
      const inserted = await actor(
        db,
        ids.admin,
        "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3) RETURNING id",
        [ids.newRoleAssignment, ids.target, ids.roleOwner],
      );
      assert.equal(inserted.affectedRows, 1);
      assert.ok((await assignments(db)).some((r) => r.id === ids.newRoleAssignment));
      const updated = await actor(
        db,
        ids.admin,
        "UPDATE shop_manager.user_roles SET role_id=$1 WHERE id=$2 RETURNING id,role_id",
        [ids.roleOther, ids.newRoleAssignment],
      );
      assert.deepEqual(updated.rows, [{ id: ids.newRoleAssignment, role_id: ids.roleOther }]);
      await unchangedFailure(db, () =>
        actor(
          db,
          ids.admin,
          "UPDATE shop_manager.user_roles SET user_id=$1 WHERE id=$2 RETURNING id",
          [ids.other, ids.newRoleAssignment],
        ),
      );
      assert.equal(
        (
          await actor(
            db,
            ids.admin,
            "DELETE FROM shop_manager.user_roles WHERE id=$1 RETURNING id",
            [ids.newRoleAssignment],
          )
        ).affectedRows,
        1,
      );
      assert.deepEqual(await state(db), before);
      await db.query("UPDATE shop_manager.profiles SET id=$1 WHERE id=$2", [
        ids.legacy,
        ids.target,
      ]);
      await unchangedFailure(db, () =>
        actor(
          db,
          ids.admin,
          "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3) RETURNING id",
          [ids.newRoleAssignment, ids.target, ids.roleOwner],
        ),
      );
    });
  },
);

test(
  "global native admin binding follows a self-mutated current shop, not independently attested ownership",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await state(db);
      const originalAssignments = await assignments(db);
      await actor(
        db,
        ids.admin,
        "UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2 RETURNING id",
        [ids.shopB, ids.admin],
      );
      assert.equal(await currentShop(db, ids.admin), ids.shopB);
      assert.deepEqual(await assignments(db), originalAssignments);
      const granted = await actor(
        db,
        ids.admin,
        "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3) RETURNING id",
        [ids.newRoleAssignment, ids.other, ids.roleOwner],
      );
      assert.equal(granted.affectedRows, 1);
      assert.ok(
        (await assignments(db)).some(
          (r) => r.id === ids.newRoleAssignment && r.user_id === ids.other,
        ),
      );
      await unchangedFailure(db, () =>
        actor(
          db,
          ids.admin,
          "INSERT INTO shop_manager.user_roles(user_id,role_id) VALUES($1,$2) RETURNING id",
          [ids.target, ids.roleOwner],
        ),
      );
      await sameMetadata(db, before);
    });
  },
);

test(
  "roles catalog deletion/rename changes helper authority with assignment rows unchanged and explicit rollback",
  options,
  async () => {
    await withFixture(async (db) => {
      // Privileged synthetic setup creates a genuine binding to the owner catalog
      // row. Its later dangling state is observable, not hidden by an empty owner.
      await db.query(
        "INSERT INTO shop_manager.user_roles(id,user_id,role_id,created_at) VALUES($1,$2,$3,'2000-01-01Z')",
        [ids.newRoleAssignment, ids.independentOwner, ids.roleOwner],
      );
      const originalAssignments = await assignments(db);
      await unchangedFailure(
        db,
        () =>
          actor(
            db,
            ids.actor,
            "UPDATE shop_manager.roles SET name='owner' WHERE id=$1 RETURNING id",
            [ids.roleTechnician],
          ),
        constraint("23505", "roles_name_key"),
      );
      await rolledBackActor(db, ids.actor, async () => {
        assert.deepEqual(
          (
            await db.query(
              "SELECT shop_manager.is_owner_or_admin($1) actor,shop_manager.is_owner_or_admin($2) previous_owner",
              [ids.actor, ids.independentOwner],
            )
          ).rows,
          [{ actor: false, previous_owner: true }],
        );
        const removed = await db.query("DELETE FROM shop_manager.roles WHERE id=$1 RETURNING id", [
          ids.roleOwner,
        ]);
        assert.equal(removed.affectedRows, 1);
        assert.deepEqual(await inspectAssignments(db), originalAssignments);
        assert.equal(
          (
            await db.query("SELECT shop_manager.is_owner_or_admin($1) value", [
              ids.independentOwner,
            ])
          ).rows[0].value,
          false,
        );
        const renamed = await db.query(
          "UPDATE shop_manager.roles SET name='owner' WHERE id=$1 RETURNING id,name",
          [ids.roleTechnician],
        );
        assert.deepEqual(renamed.rows, [{ id: ids.roleTechnician, name: "owner" }]);
        assert.deepEqual(await inspectAssignments(db), originalAssignments);
        assert.equal(
          (await db.query("SELECT shop_manager.is_owner_or_admin($1) value", [ids.actor])).rows[0]
            .value,
          true,
        );
        assert.equal(
          (await db.query("SELECT shop_manager.is_owner_or_admin($1) value", [ids.target])).rows[0]
            .value,
          true,
        );
        // A global role label also changes a bound subject in another shop.
        assert.equal(
          (await db.query("SELECT shop_manager.is_owner_or_admin($1) value", [ids.other])).rows[0]
            .value,
          true,
        );
      });
    });
  },
);

test(
  "actual profile NOT NULL/auth FK/email/partial-user uniqueness failures preserve state",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const [sql, params, check] of [
        [
          "UPDATE shop_manager.profiles SET email=NULL WHERE id=$1",
          [ids.actor],
          constraint("23502", undefined),
        ],
        [
          "UPDATE shop_manager.profiles SET user_id=$1 WHERE id=$2",
          [missingAuth, ids.actor],
          constraint("23503", "profiles_user_id_fkey"),
        ],
        [
          "UPDATE shop_manager.profiles SET email='target@example.test' WHERE id=$1",
          [ids.actor],
          constraint("23505", "profiles_email_key"),
        ],
        [
          "INSERT INTO shop_manager.profiles(id,user_id,email) VALUES($1,$2,'duplicate-user@example.test')",
          [ids.newProfile, ids.actor],
          constraint("23505", "profiles_one_per_auth_user"),
        ],
      ])
        await unchangedFailure(db, () => actor(db, ids.actor, sql, params), check);
    });
  },
);

test(
  "actual role-assignment constraints reject invalid rows while orphan role_id has no invented FK",
  options,
  async () => {
    await withFixture(async (db) => {
      // A physically permitted NULL-user profile makes the id-keyed RLS predicate
      // pass for an auth-missing target, isolating the actual auth FK failure.
      await db.query(
        "INSERT INTO shop_manager.profiles(id,user_id,email,shop_id) VALUES($1,NULL,'auth-missing@example.test',$2)",
        [ids.shadow, ids.shopA],
      );
      for (const [sql, params, check] of [
        [
          "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,NULL)",
          [ids.newRoleAssignment, ids.target],
          constraint("23502", undefined),
        ],
        [
          "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3)",
          [ids.newRoleAssignment, ids.shadow, ids.roleOwner],
          constraint("23503", "user_roles_user_id_fkey"),
        ],
        [
          "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3)",
          [ids.newRoleAssignment, ids.target, ids.roleTechnician],
          constraint("23505", "user_roles_user_id_role_id_key"),
        ],
        [
          "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3)",
          [ids.targetRole, ids.target, ids.roleOther],
          constraint("23505", "user_roles_pkey"),
        ],
      ])
        await unchangedFailure(db, () => actor(db, ids.admin, sql, params), check);
      const before = await state(db);
      const inserted = await actor(
        db,
        ids.admin,
        "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3) RETURNING id,role_id",
        [ids.newRoleAssignment, ids.target, ids.orphanRole],
      );
      assert.deepEqual(inserted.rows, [{ id: ids.newRoleAssignment, role_id: ids.orphanRole }]);
      assert.ok(
        (await assignments(db)).some(
          (r) => r.id === ids.newRoleAssignment && r.role_id === ids.orphanRole,
        ),
      );
      assert.deepEqual(
        (await db.query("SELECT id FROM shop_manager.roles WHERE id=$1", [ids.orphanRole])).rows,
        [],
      );
      await sameMetadata(db, before);
    });
  },
);

test(
  "later real constraint failure explicitly rolls back prior profile/catalog mutations and permissions",
  options,
  async () => {
    await withFixture(async (db) => {
      await assert.rejects(
        rolledBackActor(db, ids.actor, async () => {
          const first = await db.query(
            "UPDATE shop_manager.profiles SET phone='Earlier change' WHERE id=$1 RETURNING id,phone",
            [ids.actor],
          );
          assert.deepEqual(first.rows, [{ id: ids.actor, phone: "Earlier change" }]);
          const second = await db.query(
            "UPDATE shop_manager.roles SET created_at='2005-01-01Z' WHERE id=$1 RETURNING id",
            [ids.roleOwner],
          );
          assert.equal(second.affectedRows, 1);
          return db.query("UPDATE shop_manager.profiles SET email=NULL WHERE id=$1", [ids.actor]);
        }),
        hasCode("23502"),
      );
    });
  },
);
