// MEMORY-LAB ONLY: selected direct-role-catalog I/U/D restriction, not production
// approval, a migration, trusted delegation, writer closure or incident evidence.
// The fixture keeps actual selected policies/constraints/helpers unchanged and
// labels synthetic auth/roles. Profiles, native role assignments, existing
// poisoning, privileged writers, SET ROLE closure and concurrency remain open.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildNativeRoleCatalogContainment } from "./native-role-catalog-containment.mjs";
import {
  ids,
  functions,
  observed,
  withFixture,
  actor,
  catalog,
  state,
  hasCode,
  pin,
  sha,
} from "./fixtures/native-profile-role-policy-fixture.mjs";

const options = { concurrency: false, timeout: 30_000 };
const lab = buildNativeRoleCatalogContainment();
const recoveryForPureChecks = lab.recoverSql(
  lab.recordRestrictionApplication({
    before: lab.expectedBefore,
    after: lab.expectedAfter,
  }),
);
const moduleSource = pin(
  fs.readFileSync(new URL("./native-role-catalog-containment.mjs", import.meta.url), "utf8"),
  "a4f6e13835064ad44c377978680455aefeb2ee00ba0f128c0878f588bdf069a4",
  "reviewed memory-lab module",
);

async function transactionSql(db, sql) {
  await db.exec("BEGIN");
  try {
    await db.exec(sql);
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
async function roleRecord(db) {
  const record = (await catalog(db)).tables.find((r) => r.table === "roles");
  assert.ok(record, "ordinary selected roles table exists");
  const saved = observed.tables.find((r) => r.table === "roles");
  // Validate all actual NN column flags first; exclude only PG18's redundant NN
  // constraint representation, never PK/unique/FK/policy/default/body drift.
  assert.deepEqual(
    record.columns.map((c) => [c.name, c.not_null]),
    saved.columns.map((c) => [c.name, c.not_null]),
  );
  record.constraints = record.constraints.filter((c) => c.type !== "n");
  return record;
}
async function completeState(db) {
  const out = { selected: await state(db) };
  out.membershipOptions = (
    await db.query(`SELECT roleid::regrole::text role,
    member::regrole::text member,grantor::regrole::text grantor,admin_option,
    inherit_option,set_option FROM pg_auth_members ORDER BY 1,2,3`)
  ).rows;
  out.labRoles = (
    await db.query(`SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolbypassrls
      FROM pg_roles WHERE rolname LIKE 'lab_%' ORDER BY rolname`)
  ).rows;
  out.extraRelations = (
    await db.query(`SELECT c.relname,c.relkind,
    pg_get_userbyid(c.relowner) owner,c.relacl::text acl,
    CASE WHEN c.relkind='v' THEN pg_get_viewdef(c.oid,true) END view_definition
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='shop_manager' AND c.relkind IN ('r','p','v')
    AND (c.relname NOT IN ('profiles','roles','user_roles') OR c.relkind<>'r') ORDER BY 1`)
  ).rows;
  out.events = (
    await db.query(`SELECT e.evtname,e.evtevent,e.evtenabled,e.evttags,
    e.evtfoid::regprocedure::text function,pg_get_userbyid(e.evtowner) owner,
    md5(pg_get_functiondef(e.evtfoid)) definition_md5,p.proacl::text acl
    FROM pg_event_trigger e JOIN pg_proc p ON p.oid=e.evtfoid
    WHERE e.evtname='lab_acl_fault' ORDER BY 1`)
  ).rows;
  const fault = (await db.query("SELECT to_regclass('public.lab_acl_faults') id")).rows[0].id;
  out.faultRows = fault
    ? (await db.query("SELECT tag FROM public.lab_acl_faults ORDER BY tag")).rows
    : [];
  out.path = (await db.query("SHOW search_path")).rows[0].search_path;
  return out;
}
async function unchangedFailure(db, run, check = hasCode("55000")) {
  const before = await completeState(db);
  await assert.rejects(run(), check);
  assert.deepEqual(await completeState(db), before);
}
async function restrict(db, builder = lab) {
  const before = await roleRecord(db);
  await transactionSql(db, builder.restrictSql);
  const after = await roleRecord(db);
  return { before, after, receipt: builder.recordRestrictionApplication({ before, after }) };
}
async function rollbackActor(db, subject, run, role = "authenticated") {
  assert.ok(["authenticated", "postgres", "service_role"].includes(role));
  const before = await completeState(db);
  await db.exec(`BEGIN; SET LOCAL ROLE ${role}`);
  try {
    await db.query("SELECT pg_catalog.set_config('request.jwt.claim.sub',$1,true)", [
      subject ?? "",
    ]);
    return await run();
  } finally {
    await db.exec("ROLLBACK");
    assert.deepEqual(await completeState(db), before);
  }
}
function withoutTargetRoles(value) {
  const out = structuredClone(value);
  out.selected.catalog.tables = out.selected.catalog.tables.filter((t) => t.table !== "roles");
  return out;
}
async function helperValues(db) {
  return (
    await actor(
      db,
      ids.actor,
      `SELECT shop_manager.get_current_user_shop_id() shop,
    shop_manager.is_owner_or_admin($1) admin,shop_manager.is_owner_or_admin($2) ordinary,
    shop_manager.user_belongs_to_shop($3,$4) target`,
      [ids.admin, ids.actor, ids.target, ids.shopA],
    )
  ).rows;
}
async function addFault(db, tag, statements) {
  assert.ok(["REVOKE", "GRANT"].includes(tag));
  // Explicit disposable fault instrumentation: never a production proposal,
  // permissive business writer or historical attachment/seed replay.
  await db.exec(`CREATE TABLE public.lab_acl_faults(tag text NOT NULL);
    CREATE FUNCTION public.lab_acl_fault() RETURNS event_trigger LANGUAGE plpgsql AS $fault$
    BEGIN INSERT INTO public.lab_acl_faults VALUES(tg_tag); ${statements} END $fault$;
    CREATE EVENT TRIGGER lab_acl_fault ON ddl_command_end WHEN TAG IN ('${tag}')
      EXECUTE FUNCTION public.lab_acl_fault()`);
}
const dropFault = (db) =>
  db.exec(
    "DROP EVENT TRIGGER lab_acl_fault; DROP FUNCTION public.lab_acl_fault(); DROP TABLE public.lab_acl_faults",
  );

test(
  "reviewed pure builder pins exact source/SQL and only proposes the three target privilege changes",
  options,
  () => {
    assert.ok(moduleSource.includes("PURE MEMORY-LAB SQL BUILDER"));
    assert.equal(
      sha(lab.restrictSql),
      "223181861424492b93176153cfb2850015d98ac37b8174257de300169117e64d",
    );
    assert.equal(
      sha(recoveryForPureChecks),
      "038d4cf77bafabfa00ca5ff004ae2e4394872dd67264bd83fa8f2bf63dde95a8",
    );
    assert.deepEqual(
      lab.expectedBefore,
      observed.tables.find((r) => r.table === "roles"),
    );
    assert.deepEqual(buildNativeRoleCatalogContainment().expectedAfter, lab.expectedAfter);
    assert.ok(Object.isFrozen(lab) && Object.isFrozen(lab.expectedBefore.columns[0]));
    assert.equal(lab.provenance.projectRef, "wjxaajgvddtrxxtocxen");
    assert.match(
      lab.restrictSql,
      /REVOKE INSERT, UPDATE, DELETE ON TABLE shop_manager\.roles FROM authenticated RESTRICT;/,
    );
    assert.match(
      recoveryForPureChecks,
      /GRANT INSERT, UPDATE, DELETE ON TABLE shop_manager\.roles TO authenticated;/,
    );
    for (const sql of [lab.restrictSql, recoveryForPureChecks]) {
      assert.match(sql, /LOCK TABLE ONLY shop_manager\.roles IN ACCESS EXCLUSIVE MODE/);
      assert.doesNotMatch(
        sql,
        /\bCASCADE\b|CREATE POLICY|ALTER DEFAULT PRIVILEGES|CREATE FUNCTION|^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/m,
      );
      assert.ok(sql.indexOf("Lab role catalog topology mismatch") < sql.indexOf("LOCK TABLE ONLY"));
    }
  },
);

test(
  "receipt is a bounded caller-fabricable process seam, not SQL execution or durable approval proof",
  options,
  () => {
    const builder = buildNativeRoleCatalogContainment();
    const inputs = () => ({
      before: structuredClone(builder.expectedBefore),
      after: structuredClone(builder.expectedAfter),
    });
    // No database exists here: a caller can fabricate matching observations.
    const receipt = builder.recordRestrictionApplication(inputs());
    assert.ok(Object.isFrozen(receipt));
    assert.equal(
      builder.recoverSql(receipt),
      builder.recoverSql(receipt),
      "receipts deliberately are not consumed by SQL generation",
    );
    for (const bad of [
      undefined,
      null,
      {},
      structuredClone(receipt),
      JSON.parse(JSON.stringify(receipt)),
    ])
      assert.throws(() => builder.recoverSql(bad), /receipt issued by this lab builder/);
    assert.throws(() => buildNativeRoleCatalogContainment().recoverSql(receipt), /receipt/);
    for (const malformed of [
      null,
      { before: builder.expectedBefore },
      { before: builder.expectedAfter, after: builder.expectedBefore },
      { ...inputs(), extra: true },
    ])
      assert.throws(
        () => builder.recordRestrictionApplication(malformed),
        /observations do not match/,
      );
    let calls = 0;
    for (const mutate of [
      (v) =>
        Object.defineProperty(v.before, "owner", {
          enumerable: true,
          get() {
            calls++;
            return "postgres";
          },
        }),
      (v) =>
        Object.defineProperty(v.before.columns, "0", {
          enumerable: true,
          get() {
            calls++;
            return builder.expectedBefore.columns[0];
          },
        }),
      (v) => Object.defineProperty(v.before, "hidden", { value: true }),
      (v) => Object.defineProperty(v.before.columns, "hidden", { value: true }),
      (v) => {
        v.before[Symbol("unknown")] = true;
      },
      (v) => {
        v.before.columns[Symbol("unknown")] = true;
      },
      (v) => {
        v.before.owner = "x".repeat(16385);
      },
      (v) => {
        v.before["x".repeat(16385)] = true;
      },
      (v) => {
        v.before.columns.length = 1025;
      },
      (v) => {
        v.before.columns[0].not_null = Number.NaN;
      },
    ]) {
      const value = inputs();
      mutate(value);
      assert.throws(() => builder.recordRestrictionApplication(value), /observations do not match/);
    }
    assert.equal(calls, 0, "neither object nor array getters execute");
  },
);

test(
  "restriction changes only roles IUD and guarded recovery restores exact unsafe original; repeats refuse",
  options,
  async () => {
    for (const seed of [true, false])
      await withFixture(
        async (db) => {
          const original = await completeState(db);
          const result = await restrict(db);
          assert.deepEqual(result.before, lab.expectedBefore);
          assert.deepEqual(result.after, lab.expectedAfter);
          const restricted = await completeState(db);
          assert.deepEqual(withoutTargetRoles(restricted), withoutTargetRoles(original));
          assert.deepEqual(restricted.selected.data, original.selected.data);
          await unchangedFailure(db, () => transactionSql(db, lab.restrictSql));
          await transactionSql(db, lab.recoverSql(result.receipt));
          assert.deepEqual(await completeState(db), original);
          await unchangedFailure(db, () => transactionSql(db, lab.recoverSql(result.receipt)));
        },
        { seed },
      );
  },
);

test(
  "all authenticated IUD shapes and the earlier delete-owner/rename path now deny with42501",
  options,
  async () => {
    await withFixture(async (db) => {
      await restrict(db);
      for (const [sql, params] of [
        ["UPDATE shop_manager.roles SET created_at='2001-01-01Z'", []],
        ["UPDATE shop_manager.roles SET name=name WHERE id=$1", [ids.roleTechnician]],
        [
          "UPDATE shop_manager.roles SET name='owner' WHERE id=$1 RETURNING id",
          [ids.roleTechnician],
        ],
        ["UPDATE shop_manager.roles SET created_at=created_at WHERE false RETURNING id", []],
        ["DELETE FROM shop_manager.roles WHERE id=$1", [ids.roleOwner]],
        ["DELETE FROM shop_manager.roles RETURNING id", []],
        ["DELETE FROM shop_manager.roles WHERE false RETURNING id", []],
        [
          "INSERT INTO shop_manager.roles(id,name) VALUES($1,'owner') RETURNING id",
          [ids.roleOwner],
        ],
        [
          "INSERT INTO shop_manager.roles(id,name) VALUES($1,'owner') ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name RETURNING id",
          [ids.roleOwner],
        ],
        [
          "INSERT INTO shop_manager.roles(id,name) VALUES($1,'owner') ON CONFLICT(name) DO NOTHING",
          [ids.roleOwner],
        ],
      ])
        await unchangedFailure(db, () => actor(db, ids.actor, sql, params), hasCode("42501"));
      // ACL denial occurs before the old UNIQUE failure or any owner deletion;
      // no new fake CHECK/trigger is substituted for the actual restrictions.
      assert.equal(
        (await db.query("SELECT name FROM shop_manager.roles WHERE id=$1", [ids.roleOwner])).rows[0]
          .name,
        "owner",
      );
      assert.equal((await helperValues(db))[0].ordinary, false);
    });
  },
);

test(
  "SELECT/helpers are unchanged but authenticated SELECT FOR UPDATE loses its required write privilege",
  options,
  async () => {
    await withFixture(async (db) => {
      // Preserving roles SELECT preserves this selected read dependency; the
      // actual full business-staff synchronization writer is NOT invoked here.
      const beforeValues = await helperValues(db);
      const beforeRows = (
        await actor(db, ids.actor, "SELECT id,name FROM shop_manager.roles ORDER BY id")
      ).rows;
      assert.equal(
        (
          await actor(db, ids.actor, "SELECT id FROM shop_manager.roles WHERE id=$1 FOR UPDATE", [
            ids.roleOwner,
          ])
        ).rows.length,
        1,
      );
      await restrict(db);
      const before = await completeState(db);
      assert.deepEqual(
        (await actor(db, ids.actor, "SELECT id,name FROM shop_manager.roles ORDER BY id")).rows,
        beforeRows,
      );
      assert.deepEqual(await helperValues(db), beforeValues);
      for (const subject of [null, ids.noProfile])
        assert.deepEqual((await actor(db, subject, "SELECT id FROM shop_manager.roles")).rows, []);
      await assert.rejects(
        actor(db, null, "SELECT id FROM shop_manager.roles", [], "anon"),
        hasCode("42501"),
      );
      await assert.rejects(
        actor(db, ids.actor, "SELECT id FROM shop_manager.roles WHERE id=$1 FOR UPDATE", [
          ids.roleOwner,
        ]),
        hasCode("42501"),
      );
      assert.deepEqual(await completeState(db), before);
    });
  },
);

test(
  "owner/service table writes survive, but synthetic privileged roles are not installer/operator approval",
  options,
  async () => {
    await withFixture(async (db) => {
      const result = await restrict(db);
      for (const role of ["postgres", "service_role"])
        await rollbackActor(
          db,
          null,
          async () => {
            assert.equal(
              (
                await db.query("SELECT id FROM shop_manager.roles WHERE id=$1 FOR UPDATE", [
                  ids.roleOwner,
                ])
              ).rows.length,
              1,
            );
            const changed = await db.query(
              "UPDATE shop_manager.roles SET created_at='2003-01-01Z' WHERE id=$1 RETURNING id,created_at",
              [ids.roleOwner],
            );
            assert.equal(changed.affectedRows, 1);
            assert.equal(changed.rows[0].created_at.toISOString(), "2003-01-01T00:00:00.000Z");
            assert.equal(
              (
                await db.query("DELETE FROM shop_manager.roles WHERE id=$1 RETURNING id", [
                  ids.roleOwner,
                ])
              ).affectedRows,
              1,
            );
            assert.equal(
              (
                await db.query(
                  "INSERT INTO shop_manager.roles(id,name,created_at) VALUES($1,'owner','2000-01-01Z') RETURNING id",
                  [ids.roleOwner],
                )
              ).affectedRows,
              1,
            );
          },
          role,
        );
      for (const role of ["authenticated", "service_role"]) {
        await unchangedFailure(
          db,
          () => actor(db, ids.admin, lab.restrictSql, [], role),
          hasCode("42501"),
        );
        await unchangedFailure(
          db,
          () => actor(db, ids.admin, lab.recoverSql(result.receipt), [], role),
          hasCode("42501"),
        );
      }
    });
  },
);

test(
  "real earlier profile/admin-assignment writes roll back when a later catalog command is denied",
  options,
  async () => {
    await withFixture(async (db) => {
      await restrict(db);
      await assert.rejects(
        rollbackActor(db, ids.actor, async () => {
          const earlier = await db.query(
            "UPDATE shop_manager.profiles SET phone='Earlier success' WHERE id=$1 RETURNING phone",
            [ids.actor],
          );
          assert.deepEqual(earlier.rows, [{ phone: "Earlier success" }]);
          return db.query("DELETE FROM shop_manager.roles WHERE id=$1 RETURNING id", [
            ids.roleOwner,
          ]);
        }),
        hasCode("42501"),
      );
      await assert.rejects(
        rollbackActor(db, ids.admin, async () => {
          const earlier = await db.query(
            "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3) RETURNING id,role_id",
            [ids.newRoleAssignment, ids.target, ids.roleOwner],
          );
          assert.deepEqual(earlier.rows, [{ id: ids.newRoleAssignment, role_id: ids.roleOwner }]);
          return db.query("UPDATE shop_manager.roles SET name='owner' WHERE id=$1 RETURNING id", [
            ids.roleTechnician,
          ]);
        }),
        hasCode("42501"),
      );
    });
  },
);

test(
  "profile rebinding/native admin assignments remain separate writable risks, not falsely repaired",
  options,
  async () => {
    await withFixture(async (db) => {
      await restrict(db);
      const before = await completeState(db);
      const moved = await actor(
        db,
        ids.actor,
        "UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2 RETURNING shop_id",
        [ids.shopB, ids.actor],
      );
      assert.deepEqual(moved.rows, [{ shop_id: ids.shopB }]);
      assert.deepEqual(
        (await db.query("SELECT shop_id FROM shop_manager.profiles WHERE id=$1", [ids.actor])).rows,
        [{ shop_id: ids.shopB }],
      );
      const granted = await actor(
        db,
        ids.admin,
        "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3) RETURNING id",
        [ids.newRoleAssignment, ids.target, ids.roleOwner],
      );
      assert.equal(granted.affectedRows, 1);
      assert.equal(
        (
          await actor(db, ids.actor, "SELECT shop_manager.is_owner_or_admin($1) value", [
            ids.target,
          ])
        ).rows[0].value,
        true,
      );
      const after = await completeState(db);
      assert.deepEqual(after.selected.catalog, before.selected.catalog);
      assert.deepEqual(after.selected.platform, before.selected.platform);
      assert.deepEqual(
        after.selected.data["shop_manager.roles"],
        before.selected.data["shop_manager.roles"],
      );
      await unchangedFailure(
        db,
        () => actor(db, ids.admin, "UPDATE shop_manager.roles SET name=name"),
        hasCode("42501"),
      );
    });
  },
);

test(
  "helper body/header/ACL/config/owner and service-rights precondition drift refuse without mutation",
  options,
  async () => {
    for (const drift of [
      (db) =>
        db.exec(
          functions.currentShop.replace(
            "SELECT shop_id",
            "SELECT /* deliberate lab drift */ shop_id",
          ),
        ),
      (db) => db.exec("ALTER FUNCTION shop_manager.get_current_user_shop_id() VOLATILE"),
      (db) =>
        db.exec("REVOKE EXECUTE ON FUNCTION shop_manager.is_owner_or_admin(uuid) FROM PUBLIC"),
      (db) =>
        db.exec(
          "ALTER FUNCTION shop_manager.user_belongs_to_shop(uuid,uuid) SET search_path=public",
        ),
      (db) => db.exec("ALTER TABLE shop_manager.roles OWNER TO service_role"),
      (db) => db.exec("ALTER FUNCTION shop_manager.is_owner_or_admin(uuid) OWNER TO service_role"),
      (db) => db.exec("REVOKE UPDATE ON shop_manager.roles FROM service_role"),
    ])
      await withFixture(async (db) => {
        await drift(db);
        await unchangedFailure(db, () => transactionSql(db, lab.restrictSql));
      });
  },
);

test(
  "column/policy/attachment/inheritance and deterministic VIEW replacement drift refuse before changes",
  options,
  async () => {
    for (const drift of [
      (db) => db.exec("ALTER TABLE shop_manager.roles ADD COLUMN lab_extra text"),
      (db) => db.exec("GRANT UPDATE(name) ON shop_manager.roles TO authenticated"),
      (db) =>
        db.exec(
          'ALTER POLICY "shop scoped access roles_select_all" ON shop_manager.roles USING(true) WITH CHECK(true)',
        ),
      (db) =>
        db.exec(
          "CREATE TRIGGER lab_added BEFORE UPDATE ON shop_manager.roles FOR EACH ROW EXECUTE FUNCTION pg_catalog.suppress_redundant_updates_trigger()",
        ),
      (db) => db.exec("CREATE TABLE shop_manager.lab_roles_child() INHERITS(shop_manager.roles)"),
      (db) =>
        db.exec(
          "ALTER TABLE shop_manager.roles RENAME TO lab_original_roles; CREATE VIEW shop_manager.roles AS SELECT * FROM shop_manager.lab_original_roles",
        ),
    ])
      await withFixture(async (db) => {
        await drift(db);
        await unchangedFailure(db, () => transactionSql(db, lab.restrictSql));
      });
    await withFixture(
      async (db) => {
        await unchangedFailure(db, () => transactionSql(db, lab.restrictSql));
      },
      { policyVariant: "original" },
    );
  },
);

test(
  "PUBLIC and already-effective inherited access are honest precondition refusals, not postcheck evidence",
  options,
  async () => {
    for (const drift of [
      "GRANT UPDATE ON shop_manager.roles TO PUBLIC",
      "ALTER ROLE authenticated INHERIT; GRANT service_role TO authenticated WITH INHERIT TRUE",
      `CREATE ROLE lab_grantor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS;
       GRANT authenticated TO lab_grantor WITH INHERIT TRUE;
       GRANT UPDATE ON shop_manager.roles TO lab_grantor WITH GRANT OPTION;
       SET ROLE lab_grantor; GRANT UPDATE ON shop_manager.roles TO authenticated; RESET ROLE`,
    ])
      await withFixture(async (db) => {
        await db.exec(drift);
        await unchangedFailure(db, () => transactionSql(db, lab.restrictSql));
      });
  },
);

test(
  "recovery refuses exact restricted-state/helper/column/policy/PUBLIC/inherited drift",
  options,
  async () => {
    for (const drift of [
      "GRANT UPDATE ON shop_manager.roles TO authenticated",
      "GRANT UPDATE(name) ON shop_manager.roles TO authenticated",
      "GRANT UPDATE ON shop_manager.roles TO PUBLIC",
      "ALTER ROLE authenticated INHERIT; GRANT service_role TO authenticated WITH INHERIT TRUE",
      "ALTER FUNCTION shop_manager.is_owner_or_admin(uuid) SECURITY INVOKER",
      'ALTER POLICY "shop scoped access roles_select_all" ON shop_manager.roles USING(true) WITH CHECK(true)',
    ])
      await withFixture(async (db) => {
        const result = await restrict(db);
        await db.exec(drift);
        await unchangedFailure(db, () => transactionSql(db, lab.recoverSql(result.receipt)));
      });
  },
);

test(
  "genuine post-REVOKE inherited-access fault fails the postguard and rolls back source and fault rows",
  options,
  async () => {
    await withFixture(async (db) => {
      await addFault(
        db,
        "REVOKE",
        "ALTER ROLE authenticated INHERIT; GRANT service_role TO authenticated WITH INHERIT TRUE;",
      );
      assert.deepEqual(await roleRecord(db), lab.expectedBefore);
      await unchangedFailure(
        db,
        () => transactionSql(db, lab.restrictSql),
        (error) => error.code === "55000" && /role catalog state mismatch/.test(error.message),
      );
      assert.deepEqual((await db.query("SELECT tag FROM public.lab_acl_faults")).rows, []);
      assert.equal(
        (await db.query("SELECT rolinherit FROM pg_roles WHERE rolname='authenticated'")).rows[0]
          .rolinherit,
        false,
      );
      await dropFault(db);
      await restrict(db); // Identical reviewed SQL succeeds without the fault.
    });
  },
);

test(
  "genuine post-recovery-GRANT shape fault fails the postguard and preserves restriction on rollback",
  options,
  async () => {
    await withFixture(async (db) => {
      const result = await restrict(db);
      await addFault(db, "GRANT", "ALTER TABLE shop_manager.roles ADD COLUMN lab_fault text;");
      assert.deepEqual(await roleRecord(db), lab.expectedAfter);
      await unchangedFailure(
        db,
        () => transactionSql(db, lab.recoverSql(result.receipt)),
        (error) => error.code === "55000" && /role catalog state mismatch/.test(error.message),
      );
      assert.deepEqual((await db.query("SELECT tag FROM public.lab_acl_faults")).rows, []);
      assert.deepEqual(await roleRecord(db), lab.expectedAfter);
      await dropFault(db);
      await transactionSql(db, lab.recoverSql(result.receipt));
      assert.deepEqual(await roleRecord(db), lab.expectedBefore);
    });
  },
);

test(
  "transaction-level faults after successful DO roll back and cannot create matching observed application inputs",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await roleRecord(db);
      await unchangedFailure(
        db,
        () => transactionSql(db, lab.restrictSql + "\nSELECT 1/0;"),
        hasCode("22012"),
      );
      assert.throws(
        () => lab.recordRestrictionApplication({ before, after: before }),
        /observations do not match/,
      );
      const result = await restrict(db);
      await unchangedFailure(
        db,
        () => transactionSql(db, lab.recoverSql(result.receipt) + "\nSELECT 1/0;"),
        hasCode("22012"),
      );
      assert.deepEqual(await roleRecord(db), lab.expectedAfter);
    });
  },
);

test(
  "guarded recovery restores unsafe original permissions exactly without reverting unrelated successful data changes",
  options,
  async () => {
    await withFixture(async (db) => {
      const result = await restrict(db);
      await actor(
        db,
        ids.actor,
        "UPDATE shop_manager.profiles SET phone='Preserved unrelated change' WHERE id=$1 RETURNING id",
        [ids.actor],
      );
      await actor(
        db,
        ids.admin,
        "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3) RETURNING id",
        [ids.newRoleAssignment, ids.target, ids.roleOther],
      );
      const beforeRecovery = await completeState(db);
      await transactionSql(db, lab.recoverSql(result.receipt));
      const after = await completeState(db);
      assert.deepEqual(withoutTargetRoles(after), withoutTargetRoles(beforeRecovery));
      assert.deepEqual(after.selected.data, beforeRecovery.selected.data);
      assert.deepEqual(await roleRecord(db), lab.expectedBefore);
      // Restored original exposure is intentionally demonstrated, NOT endorsed.
      await rollbackActor(db, ids.actor, async () => {
        const result = await db.query(
          "UPDATE shop_manager.roles SET created_at='2004-01-01Z' WHERE id=$1 RETURNING created_at",
          [ids.roleOther],
        );
        assert.equal(result.affectedRows, 1);
        assert.equal(result.rows[0].created_at.toISOString(), "2004-01-01T00:00:00.000Z");
      });
      await unchangedFailure(db, () => transactionSql(db, lab.recoverSql(result.receipt)));
    });
  },
);
