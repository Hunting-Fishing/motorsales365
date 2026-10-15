// MEMORY-LAB ONLY: deny-only profiles/user_roles table ACL research, NOT an
// approved production action, native authority contract, migration or writer closure.
// Actual pinned selected fixture DDL/constraints/policies/three helpers are reused.
// auth/users/roles, labelled native owner, legacy/shadow rows and fault event triggers
// are synthetic. No businesses/shops, invented FKs, staff/bootstrap/owner writers,
// real sessions, transport, concurrency, offboarding or live counts are exercised.
// The separate roles catalog remains writable; its earlier candidate is not applied.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildNativeProfileAssignmentContainment } from "./native-profile-assignment-containment.mjs";
import {
  ids,
  functions,
  observed,
  withFixture,
  actor,
  catalog,
  hasCode,
  pin,
  sha,
} from "./fixtures/native-profile-role-policy-fixture.mjs";

const options = { concurrency: false, timeout: 30_000 };
const targets = ["profiles", "user_roles"];
const lab = buildNativeProfileAssignmentContainment();
const recoveryForPureChecks = lab.recoverSql(
  lab.recordRestrictionApplication({
    before: lab.expectedBefore,
    after: lab.expectedAfter,
  }),
);
// Exact author read-stable module and generated SQL; never executed outside memory.
const moduleSource = pin(
  fs.readFileSync(new URL("./native-profile-assignment-containment.mjs", import.meta.url), "utf8"),
  "e8b506043d0efb84b538e09a56bff0809c9f2c9581f160614e65a12293d13cbc",
  "reviewed memory-only two-table builder",
);
const ownerAssignment = "11111111-1111-4111-8111-000000000306";
const quote = (name) => `"${name.replaceAll('"', '""')}"`;

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
async function records(db) {
  const tables = (await catalog(db)).tables;
  return targets.map((name) => {
    const value = tables.find((table) => table.table === name);
    assert.ok(value, `ordinary ${name} exists for receipt observations`);
    const saved = observed.tables.find((table) => table.table === name);
    assert.deepEqual(
      value.columns.map((column) => [column.name, column.not_null]),
      saved.columns.map((column) => [column.name, column.not_null]),
    );
    // Only PG18's redundant NN representation is excluded after column flags
    // match; no PK/unique/FK/default/index/policy/attachment drift is normalized.
    value.constraints = value.constraints.filter((constraint) => constraint.type !== "n");
    return value;
  });
}
async function completeState(db) {
  const selected = await catalog(db);
  const relations = (
    await db.query(`SELECT n.nspname schema,c.relname name,c.relkind kind,
    pg_catalog.pg_get_userbyid(c.relowner) owner,c.relacl::text acl,
    c.relrowsecurity rls,c.relforcerowsecurity force_rls,
    CASE WHEN c.relkind='v' THEN pg_catalog.pg_get_viewdef(c.oid,true) END view_definition
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('auth','shop_manager','public') AND c.relkind IN ('r','p','v')
    ORDER BY n.nspname,c.relname`)
  ).rows;
  const rows = {};
  for (const relation of relations) {
    rows[`${relation.schema}.${relation.name}`] = (
      await db.query(
        `SELECT pg_catalog.to_jsonb(t) row FROM ${quote(relation.schema)}.${quote(relation.name)} t
       ORDER BY pg_catalog.to_jsonb(t)::text`,
      )
    ).rows;
  }
  const platform = {};
  for (const [key, sql] of Object.entries({
    roles: `SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolbypassrls
      FROM pg_catalog.pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role')
      OR rolname LIKE 'lab_%' ORDER BY rolname`,
    schemas: `SELECT nspname,nspacl::text acl,pg_catalog.pg_get_userbyid(nspowner) owner
      FROM pg_catalog.pg_namespace WHERE nspname IN ('public','auth','shop_manager') ORDER BY nspname`,
    memberships: `SELECT roleid::regrole::text role,member::regrole::text member,
      grantor::regrole::text grantor,admin_option,inherit_option,set_option
      FROM pg_catalog.pg_auth_members ORDER BY 1,2,3`,
    defaults: `SELECT pg_catalog.pg_get_userbyid(d.defaclrole) owner,n.nspname,d.defaclobjtype,
      d.defaclacl::text acl FROM pg_catalog.pg_default_acl d
      LEFT JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace ORDER BY 1,2,3`,
    events: `SELECT e.evtname,e.evtevent,e.evtenabled,e.evttags,
      e.evtfoid::regprocedure::text function,pg_catalog.pg_get_userbyid(e.evtowner) owner,
      pg_catalog.md5(pg_catalog.pg_get_functiondef(e.evtfoid)) definition_md5,p.proacl::text acl
      FROM pg_catalog.pg_event_trigger e JOIN pg_catalog.pg_proc p ON p.oid=e.evtfoid
      WHERE e.evtname='lab_assignment_fault' ORDER BY e.evtname`,
    settings: `SELECT pg_catalog.current_setting('role') role,
      pg_catalog.current_setting('search_path') search_path,
      pg_catalog.current_setting('statement_timeout') statement_timeout,
      pg_catalog.current_setting('lock_timeout') lock_timeout,
      pg_catalog.current_setting('request.jwt.claim.sub',true) claim`,
  }))
    platform[key] = (await db.query(sql)).rows;
  return { selected, relations, rows, platform };
}
async function withLab(run, { seed = true } = {}) {
  await withFixture(
    async (db) => {
      // Initialize the synthetic custom-GUC placeholder before preservation checks;
      // no real JWT/session is present and no authorization claim is made from it.
      await db.query("SELECT pg_catalog.set_config('request.jwt.claim.sub','',false)");
      if (seed) {
        await db.query("INSERT INTO auth.users(id,email) VALUES($1,'legacy@example.test')", [
          ids.legacy,
        ]);
        await db.query(
          `INSERT INTO shop_manager.profiles(id,user_id,email,shop_id,first_name)
        VALUES($1,$2,'legacy-profile@example.test',$3,'Legacy'),
          ($2,NULL,'null-shadow@example.test',$4,'Shadow')`,
          [ids.newProfile, ids.legacy, ids.shopA, ids.shopB],
        );
        await db.query("INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3)", [
          ownerAssignment,
          ids.independentOwner,
          ids.roleOwner,
        ]);
      }
      await run(db);
    },
    { seed },
  );
}
async function restrict(db, builder = lab) {
  const before = await records(db);
  await transactionSql(db, builder.restrictSql);
  const after = await records(db);
  return { before, after, receipt: builder.recordRestrictionApplication({ before, after }) };
}
async function unchangedFailure(db, run, check = hasCode("55000")) {
  const before = await completeState(db);
  await assert.rejects(run(), check);
  assert.deepEqual(await completeState(db), before);
}
async function isolatedDrift(db, drift, sql, check = hasCode("55000")) {
  await db.exec("BEGIN");
  try {
    await drift(db);
    const before = await completeState(db);
    await db.exec("SAVEPOINT candidate_attempt");
    await assert.rejects(db.exec(sql), check);
    await db.exec("ROLLBACK TO SAVEPOINT candidate_attempt");
    assert.deepEqual(await completeState(db), before);
  } finally {
    await db.exec("ROLLBACK");
  }
}
async function rollbackActor(db, subject, run, role = "authenticated") {
  assert.ok(["postgres", "authenticated", "service_role"].includes(role));
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
function withoutTargets(snapshot) {
  const out = structuredClone(snapshot);
  out.selected.tables = out.selected.tables.filter((table) => !targets.includes(table.table));
  out.relations = out.relations.filter(
    (relation) => relation.schema !== "shop_manager" || !targets.includes(relation.name),
  );
  return out;
}
async function addFault(db, tag, statements) {
  assert.ok(["REVOKE", "GRANT"].includes(tag));
  await db.exec(`CREATE TABLE public.lab_assignment_fault_rows(tag text NOT NULL);
    CREATE FUNCTION public.lab_assignment_fault() RETURNS event_trigger LANGUAGE plpgsql AS $fault$
    BEGIN ${statements} END $fault$;
    CREATE EVENT TRIGGER lab_assignment_fault ON ddl_command_end WHEN TAG IN ('${tag}')
      EXECUTE FUNCTION public.lab_assignment_fault()`);
}
async function dropFault(db) {
  await db.exec(
    "DROP EVENT TRIGGER lab_assignment_fault; DROP FUNCTION public.lab_assignment_fault(); DROP TABLE public.lab_assignment_fault_rows",
  );
}

test(
  "fixed two-table builder proposes only exact authenticated IUD changes and ordered ONLY locks",
  options,
  () => {
    assert.match(moduleSource, /OFFLINE FIXED-EVIDENCE SQL BUILDER/);
    assert.equal(
      sha(lab.restrictSql),
      "5f513af8dfe6390d0fb5d2880adcfab66e0380d6c73c1ea6f683a2f3054f6c1d",
    );
    assert.equal(
      sha(recoveryForPureChecks),
      "d40934ae878b89072d9520631c888ddc4bbe15119539f2fb2b4179756680ffbb",
    );
    assert.deepEqual(
      lab.expectedBefore,
      targets.map((name) => observed.tables.find((table) => table.table === name)),
    );
    assert.deepEqual(buildNativeProfileAssignmentContainment().expectedAfter, lab.expectedAfter);
    assert.ok(Object.isFrozen(lab) && Object.isFrozen(lab.expectedBefore[0].columns[0]));
    assert.equal(lab.provenance.projectRef, "wjxaajgvddtrxxtocxen");
    for (const table of targets) {
      assert.match(
        lab.restrictSql,
        new RegExp(
          `REVOKE INSERT, UPDATE, DELETE ON TABLE shop_manager\\.${table} FROM authenticated RESTRICT;`,
        ),
      );
      assert.match(
        recoveryForPureChecks,
        new RegExp(
          `GRANT INSERT, UPDATE, DELETE ON TABLE shop_manager\\.${table} TO authenticated;`,
        ),
      );
    }
    for (const sql of [lab.restrictSql, recoveryForPureChecks]) {
      assert.match(sql, /LOCK TABLE ONLY shop_manager\.profiles IN ACCESS EXCLUSIVE MODE/);
      assert.match(sql, /LOCK TABLE ONLY shop_manager\.user_roles IN ACCESS EXCLUSIVE MODE/);
      assert.ok(
        sql.indexOf("LOCK TABLE ONLY shop_manager.profiles") <
          sql.indexOf("LOCK TABLE ONLY shop_manager.user_roles"),
      );
      const code = sql.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
      assert.doesNotMatch(
        code,
        /\bCASCADE\b|GRANT ALL|CREATE POLICY|ALTER DEFAULT PRIVILEGES|CREATE FUNCTION|^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/m,
      );
    }
  },
);

test(
  "fakeable process receipt cannot be copied/cross-builder-issued or confused with approval/execution proof",
  options,
  () => {
    const builder = buildNativeProfileAssignmentContainment();
    const inputs = () => ({
      before: structuredClone(builder.expectedBefore),
      after: structuredClone(builder.expectedAfter),
    });
    const receipt = builder.recordRestrictionApplication(inputs()); // No database exists here.
    assert.ok(Object.isFrozen(receipt));
    assert.equal(builder.recoverSql(receipt), builder.recoverSql(receipt));
    for (const bad of [
      undefined,
      null,
      {},
      structuredClone(receipt),
      JSON.parse(JSON.stringify(receipt)),
    ])
      assert.throws(() => builder.recoverSql(bad), /receipt/);
    assert.throws(() => buildNativeProfileAssignmentContainment().recoverSql(receipt), /receipt/);
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
    let getterCalls = 0;
    const accessor = inputs();
    Object.defineProperty(accessor.before[0], "owner", {
      enumerable: true,
      get() {
        getterCalls++;
        return "postgres";
      },
    });
    assert.throws(
      () => builder.recordRestrictionApplication(accessor),
      /observations do not match/,
    );
    assert.equal(getterCalls, 0);
  },
);

test(
  "restriction/recovery are exact two-table metadata deltas with unchanged legacy rows/helpers/roles/defaults",
  options,
  async () => {
    for (const seed of [true, false])
      await withLab(
        async (db) => {
          const before = await completeState(db);
          const result = await restrict(db);
          assert.deepEqual(result.before, lab.expectedBefore);
          assert.deepEqual(result.after, lab.expectedAfter);
          const after = await completeState(db);
          assert.deepEqual(withoutTargets(after), withoutTargets(before));
          assert.deepEqual(after.rows, before.rows);
          await unchangedFailure(db, () => transactionSql(db, lab.restrictSql));
          await transactionSql(db, lab.recoverSql(result.receipt));
          assert.deepEqual(await completeState(db), before);
          await unchangedFailure(db, () => transactionSql(db, lab.recoverSql(result.receipt)));
        },
        { seed },
      );
  },
);

test(
  "all authenticated profile identity/shop/shadow/contact/IUD/upsert/raw/zero/no-op writes deny without admin/native-owner exceptions",
  options,
  async () => {
    await withLab(async (db) => {
      await restrict(db);
      const before = await completeState(db);
      for (const subject of [ids.actor, ids.admin, ids.independentOwner]) {
        for (const [sql, parameters] of [
          [
            "UPDATE shop_manager.profiles SET id=$1 WHERE id=$2 RETURNING id",
            [ids.shadow, subject],
          ],
          ["UPDATE shop_manager.profiles SET user_id=NULL WHERE id=$1 RETURNING id", [subject]],
          ["UPDATE shop_manager.profiles SET user_id=$1 WHERE id=$2", [ids.other, subject]],
          [
            "UPDATE shop_manager.profiles SET shop_id=$1 WHERE id=$2 RETURNING shop_id",
            [ids.shopB, subject],
          ],
          [
            "UPDATE shop_manager.profiles SET phone='Contact change',first_name='Changed',last_name='Name',email='changed@example.test' WHERE id=$1",
            [subject],
          ],
          ["UPDATE shop_manager.profiles SET phone=phone WHERE id=$1 RETURNING id", [subject]],
          [
            "UPDATE shop_manager.profiles SET created_at='1999-01-01Z',has_auth_account=false WHERE id=$1",
            [subject],
          ],
          [
            "UPDATE shop_manager.profiles SET id=id,user_id=user_id,shop_id=shop_id WHERE false RETURNING id",
            [],
          ],
          ["UPDATE shop_manager.profiles SET phone='Raw all-row attempt'", []],
          ["UPDATE shop_manager.profiles SET user_id=$1 WHERE id=$1 RETURNING id", [ids.legacy]],
          ["DELETE FROM shop_manager.profiles WHERE id=$1 RETURNING id", [subject]],
          ["DELETE FROM shop_manager.profiles WHERE false", []],
          [
            "INSERT INTO shop_manager.profiles(id,user_id,email,shop_id) VALUES($1,$1,'fresh@example.test',$2) RETURNING id",
            [ids.noProfile, ids.shopA],
          ],
          [
            "INSERT INTO shop_manager.profiles(id,user_id,email) VALUES($1,$1,'duplicate@example.test') ON CONFLICT(id) DO NOTHING",
            [subject],
          ],
          [
            "INSERT INTO shop_manager.profiles(id,user_id,email) VALUES($1,$1,'duplicate@example.test') ON CONFLICT(id) DO UPDATE SET phone='Upsert' RETURNING id",
            [subject],
          ],
        ])
          await assert.rejects(actor(db, subject, sql, parameters), hasCode("42501"));
      }
      assert.deepEqual(await completeState(db), before);
    });
  },
);

test(
  "authenticated role-assignment insert/update/delete/upsert/DO NOTHING and raw/RETURNING denial42501 preserves real constraints",
  options,
  async () => {
    await withLab(async (db) => {
      await restrict(db);
      const before = await completeState(db);
      for (const subject of [ids.actor, ids.admin, ids.independentOwner]) {
        for (const [sql, parameters] of [
          [
            "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3) RETURNING id",
            [ids.newRoleAssignment, ids.target, ids.roleOwner],
          ],
          [
            "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET role_id=EXCLUDED.role_id RETURNING id",
            [ids.actorRole, ids.actor, ids.roleOwner],
          ],
          [
            "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3) ON CONFLICT(user_id,role_id) DO NOTHING",
            [ids.actorRole, ids.actor, ids.roleTechnician],
          ],
          [
            "UPDATE shop_manager.user_roles SET role_id=$1 WHERE id=$2 RETURNING role_id",
            [ids.roleOwner, ids.actorRole],
          ],
          [
            "UPDATE shop_manager.user_roles SET user_id=$1,id=$2 WHERE id=$3",
            [ids.other, ids.newRoleAssignment, ids.actorRole],
          ],
          ["UPDATE shop_manager.user_roles SET role_id=role_id WHERE false RETURNING id", []],
          [
            "UPDATE shop_manager.user_roles SET id=id,user_id=user_id,role_id=role_id WHERE id=$1 RETURNING id",
            [ids.actorRole],
          ],
          ["UPDATE shop_manager.user_roles SET created_at='1999-01-01Z'", []],
          ["DELETE FROM shop_manager.user_roles WHERE id=$1 RETURNING id", [ids.adminRole]],
          ["DELETE FROM shop_manager.user_roles WHERE false RETURNING id", []],
          ["DELETE FROM shop_manager.user_roles", []],
        ])
          await assert.rejects(actor(db, subject, sql, parameters), hasCode("42501"));
      }
      assert.deepEqual(await completeState(db), before);
    });
  },
);

test(
  "canonical/legacy/null-shadow SELECT and helper results persist; row locks deny and roles catalog stays separately writable",
  options,
  async () => {
    await withLab(async (db) => {
      const reads = async () => {
        const results = [];
        for (const subject of [
          ids.actor,
          ids.admin,
          ids.independentOwner,
          ids.legacy,
          ids.noProfile,
          null,
        ]) {
          results.push(
            (
              await actor(
                db,
                subject,
                "SELECT id,user_id,shop_id,email FROM shop_manager.profiles ORDER BY id",
              )
            ).rows,
          );
          results.push(
            (
              await actor(
                db,
                subject,
                "SELECT id,user_id,role_id FROM shop_manager.user_roles ORDER BY id",
              )
            ).rows,
          );
          results.push(
            (
              await actor(
                db,
                subject,
                `SELECT shop_manager.get_current_user_shop_id() shop,
          shop_manager.is_owner_or_admin($1) admin,shop_manager.user_belongs_to_shop($2,$3) belongs`,
                [ids.admin, ids.target, ids.shopA],
              )
            ).rows,
          );
        }
        return results;
      };
      const originalReads = await reads();
      assert.ok(
        originalReads[9].some((row) => row.id === ids.newProfile && row.user_id === ids.legacy),
      );
      assert.ok(originalReads[9].some((row) => row.id === ids.legacy && row.user_id === null));
      await restrict(db);
      const before = await completeState(db);
      assert.deepEqual(await reads(), originalReads);
      for (const table of targets) {
        await assert.rejects(
          actor(db, ids.actor, `SELECT id FROM shop_manager.${table} FOR UPDATE`),
          hasCode("42501"),
        );
        await assert.rejects(
          actor(db, null, `SELECT id FROM shop_manager.${table}`, [], "anon"),
          hasCode("42501"),
        );
      }
      await rollbackActor(db, ids.actor, async () => {
        const result = await db.query(
          "UPDATE shop_manager.roles SET created_at='2005-01-01Z' WHERE id=$1 RETURNING id,created_at",
          [ids.roleTechnician],
        );
        assert.equal(result.affectedRows, 1);
        assert.equal(result.rows[0].created_at.toISOString(), "2005-01-01T00:00:00.000Z");
      }); // Residual control only; do not claim native role meanings are contained.
      assert.deepEqual(await completeState(db), before);
    });
  },
);

test(
  "postgres/service data CRUD survives but authenticated admin/native-owner and service cannot install/recover",
  options,
  async () => {
    await withLab(async (db) => {
      const result = await restrict(db);
      // Mutable native-catalog label only, not businesses.owner_id or an
      // adopted human owner/delegation authorization contract.
      assert.equal(
        (
          await actor(
            db,
            ids.independentOwner,
            "SELECT shop_manager.is_owner_or_admin($1) labelled_native_owner",
            [ids.independentOwner],
          )
        ).rows[0].labelled_native_owner,
        true,
      );
      for (const role of ["postgres", "service_role"])
        await rollbackActor(
          db,
          null,
          async () => {
            assert.equal(
              (
                await db.query(
                  "UPDATE shop_manager.profiles SET phone='Privileged retained',shop_id=$1,user_id=NULL WHERE id=$2 RETURNING id,phone",
                  [ids.shopB, ids.actor],
                )
              ).affectedRows,
              1,
            );
            assert.equal(
              (
                await db.query("DELETE FROM shop_manager.profiles WHERE id=$1 RETURNING id", [
                  ids.actor,
                ])
              ).affectedRows,
              1,
            );
            assert.equal(
              (
                await db.query(
                  "INSERT INTO shop_manager.profiles(id,user_id,email,shop_id) VALUES($1,$1,'privileged@example.test',$2) RETURNING id",
                  [ids.actor, ids.shopA],
                )
              ).affectedRows,
              1,
            );
            assert.equal(
              (
                await db.query(
                  "UPDATE shop_manager.user_roles SET role_id=$1 WHERE id=$2 RETURNING id",
                  [ids.roleOwner, ids.actorRole],
                )
              ).affectedRows,
              1,
            );
            assert.equal(
              (
                await db.query("DELETE FROM shop_manager.user_roles WHERE id=$1 RETURNING id", [
                  ids.actorRole,
                ])
              ).affectedRows,
              1,
            );
            assert.equal(
              (
                await db.query(
                  "INSERT INTO shop_manager.user_roles(id,user_id,role_id) VALUES($1,$2,$3) RETURNING id",
                  [ids.actorRole, ids.actor, ids.roleOther],
                )
              ).affectedRows,
              1,
            );
          },
          role,
        );
      for (const subject of [ids.admin, ids.independentOwner])
        for (const role of ["authenticated", "service_role"]) {
          await unchangedFailure(
            db,
            () => actor(db, subject, lab.restrictSql, [], role),
            hasCode("42501"),
          );
          await unchangedFailure(
            db,
            () => actor(db, subject, lab.recoverSql(result.receipt), [], role),
            hasCode("42501"),
          );
        }
    });
  },
);

test(
  "both-table ACL/column/PUBLIC/inherited/other-grantor/service/owner drift refuses before either mutation",
  options,
  async () => {
    await withLab(async (db) => {
      for (const table of targets)
        for (const drift of [
          `GRANT UPDATE(${table === "profiles" ? "phone" : "role_id"}) ON shop_manager.${table} TO authenticated`,
          `GRANT INSERT(${table === "profiles" ? "email" : "role_id"}) ON shop_manager.${table} TO authenticated`,
          `GRANT UPDATE ON shop_manager.${table} TO PUBLIC`,
          `REVOKE UPDATE ON shop_manager.${table} FROM service_role`,
          `ALTER TABLE shop_manager.${table} OWNER TO service_role`,
          `ALTER ROLE authenticated INHERIT; GRANT service_role TO authenticated WITH INHERIT TRUE`,
          `CREATE ROLE lab_assignment_grantor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS;
       GRANT authenticated TO lab_assignment_grantor WITH INHERIT TRUE;
       GRANT UPDATE ON shop_manager.${table} TO lab_assignment_grantor WITH GRANT OPTION;
       SET LOCAL ROLE lab_assignment_grantor; GRANT UPDATE ON shop_manager.${table} TO authenticated; RESET ROLE`,
        ])
          await isolatedDrift(db, (connection) => connection.exec(drift), lab.restrictSql);
    });
  },
);

test(
  "missing/view/partition/inheritance/shape/default/index/policy/trigger and original-policy drift refuse conservatively",
  options,
  async () => {
    await withLab(async (db) => {
      for (const table of targets)
        for (const drift of [
          `ALTER TABLE shop_manager.${table} RENAME TO lab_saved`,
          `ALTER TABLE shop_manager.${table} RENAME TO lab_saved; CREATE VIEW shop_manager.${table} AS SELECT * FROM shop_manager.lab_saved`,
          `ALTER TABLE shop_manager.${table} RENAME TO lab_saved; CREATE TABLE shop_manager.${table}(LIKE shop_manager.lab_saved INCLUDING DEFAULTS) PARTITION BY RANGE(id)`,
          `CREATE TABLE shop_manager.lab_child() INHERITS(shop_manager.${table})`,
          `CREATE TABLE shop_manager.lab_parent(); ALTER TABLE shop_manager.${table} INHERIT shop_manager.lab_parent`,
          `ALTER TABLE shop_manager.${table} ADD COLUMN lab_extra text`,
          `ALTER TABLE shop_manager.${table} ALTER COLUMN created_at SET DEFAULT '2001-01-01Z'::timestamptz`,
          `CREATE INDEX lab_added_index ON shop_manager.${table}(created_at)`,
          `CREATE TRIGGER lab_added BEFORE UPDATE ON shop_manager.${table} FOR EACH ROW EXECUTE FUNCTION pg_catalog.suppress_redundant_updates_trigger()`,
        ])
          await isolatedDrift(db, (connection) => connection.exec(drift), lab.restrictSql);
      await isolatedDrift(
        db,
        (connection) =>
          connection.exec(
            `ALTER POLICY "sm_profiles_select_self" ON shop_manager.profiles USING(true)`,
          ),
        lab.restrictSql,
      );
      await isolatedDrift(
        db,
        (connection) =>
          connection.exec(
            `ALTER POLICY "sm_user_roles_select_self" ON shop_manager.user_roles USING(true)`,
          ),
        lab.restrictSql,
      );
    });
    await withFixture(
      async (db) => {
        await db.query("SELECT pg_catalog.set_config('request.jwt.claim.sub','',false)");
        await unchangedFailure(db, () => transactionSql(db, lab.restrictSql));
      },
      { policyVariant: "original" },
    );
  },
);

test(
  "helper missing/body/owner/header/config/ACL and unadopted roles-catalog state drift refuses",
  options,
  async () => {
    await withLab(async (db) => {
      for (const drift of [
        (connection) =>
          connection.exec(
            "ALTER FUNCTION shop_manager.get_current_user_shop_id() RENAME TO lab_missing_helper",
          ),
        (connection) =>
          connection.exec(
            functions.currentShop.replace(
              "SELECT shop_id",
              "SELECT /* synthetic body drift */ shop_id",
            ),
          ),
        (connection) =>
          connection.exec("ALTER FUNCTION shop_manager.get_current_user_shop_id() VOLATILE"),
        (connection) =>
          connection.exec(
            "ALTER FUNCTION shop_manager.is_owner_or_admin(uuid) OWNER TO service_role",
          ),
        (connection) =>
          connection.exec(
            "ALTER FUNCTION shop_manager.user_belongs_to_shop(uuid,uuid) SET search_path=public",
          ),
        (connection) =>
          connection.exec(
            "REVOKE EXECUTE ON FUNCTION shop_manager.is_owner_or_admin(uuid) FROM PUBLIC",
          ),
        (connection) =>
          connection.exec(
            "REVOKE INSERT,UPDATE,DELETE ON shop_manager.roles FROM authenticated RESTRICT",
          ),
      ])
        await isolatedDrift(db, drift, lab.restrictSql);
    });
  },
);

test(
  "second-table precheck drift reaches no first REVOKE, distinguished by a genuine event-trigger trap",
  options,
  async () => {
    await withLab(async (db) => {
      await addFault(
        db,
        "REVOKE",
        "RAISE EXCEPTION 'unexpected first REVOKE reached' USING ERRCODE='P0001';",
      );
      await db.exec("ALTER TABLE shop_manager.user_roles ADD COLUMN lab_second_table_drift text");
      await unchangedFailure(db, () => transactionSql(db, lab.restrictSql), hasCode("55000"));
      assert.deepEqual(
        (await db.query("SELECT tag FROM public.lab_assignment_fault_rows")).rows,
        [],
      );
    });
  },
);

test(
  "actual first-profile REVOKE completed before injected failure and both ACLs/GUCs/fault rows roll back",
  options,
  async () => {
    await withLab(async (db) => {
      await addFault(
        db,
        "REVOKE",
        `
      IF EXISTS (SELECT 1 FROM pg_catalog.unnest(ARRAY['INSERT','UPDATE','DELETE']::pg_catalog.text[]) r(privilege)
        WHERE pg_catalog.has_table_privilege('authenticated','shop_manager.profiles',r.privilege)
          OR NOT pg_catalog.has_table_privilege('authenticated','shop_manager.user_roles',r.privilege)) THEN
        RAISE EXCEPTION 'incorrect first REVOKE boundary' USING ERRCODE='P0002';
      END IF;
      INSERT INTO public.lab_assignment_fault_rows VALUES(tg_tag);
      RAISE EXCEPTION 'confirmed after first profile REVOKE' USING ERRCODE='P0001';`,
      );
      await unchangedFailure(
        db,
        () => transactionSql(db, lab.restrictSql),
        (error) =>
          error.code === "P0001" && /confirmed after first profile REVOKE/.test(error.message),
      );
      assert.deepEqual(await records(db), lab.expectedBefore);
      assert.deepEqual(
        (await db.query("SELECT tag FROM public.lab_assignment_fault_rows")).rows,
        [],
      );
      await dropFault(db);
      await restrict(db);
    });
  },
);

test(
  "actual first recovery GRANT completed before failure and rollback preserves both restrictions",
  options,
  async () => {
    await withLab(async (db) => {
      const result = await restrict(db);
      await addFault(
        db,
        "GRANT",
        `
      IF EXISTS (SELECT 1 FROM pg_catalog.unnest(ARRAY['INSERT','UPDATE','DELETE']::pg_catalog.text[]) r(privilege)
        WHERE NOT pg_catalog.has_table_privilege('authenticated','shop_manager.profiles',r.privilege)
          OR pg_catalog.has_table_privilege('authenticated','shop_manager.user_roles',r.privilege)) THEN
        RAISE EXCEPTION 'incorrect first recovery boundary' USING ERRCODE='P0002';
      END IF;
      INSERT INTO public.lab_assignment_fault_rows VALUES(tg_tag);
      RAISE EXCEPTION 'confirmed after first profile recovery GRANT' USING ERRCODE='P0001';`,
      );
      await unchangedFailure(
        db,
        () => transactionSql(db, lab.recoverSql(result.receipt)),
        (error) =>
          error.code === "P0001" &&
          /confirmed after first profile recovery GRANT/.test(error.message),
      );
      assert.deepEqual(await records(db), lab.expectedAfter);
      assert.deepEqual(
        (await db.query("SELECT tag FROM public.lab_assignment_fault_rows")).rows,
        [],
      );
      await dropFault(db);
      await transactionSql(db, lab.recoverSql(result.receipt));
      assert.deepEqual(await records(db), lab.expectedBefore);
    });
  },
);

test(
  "genuine after-second-REVOKE PUBLIC regrant reaches the candidate postcheck and rolls back both revokes/grant/fault row",
  options,
  async () => {
    await withLab(async (db) => {
      await addFault(
        db,
        "REVOKE",
        `
        IF NOT EXISTS (SELECT 1 FROM pg_catalog.unnest(ARRAY['INSERT','UPDATE','DELETE']::pg_catalog.text[]) r(privilege)
          WHERE pg_catalog.has_table_privilege('authenticated','shop_manager.profiles',r.privilege)
            OR pg_catalog.has_table_privilege('authenticated','shop_manager.user_roles',r.privilege)) THEN
          GRANT UPDATE ON TABLE shop_manager.user_roles TO PUBLIC;
          INSERT INTO public.lab_assignment_fault_rows VALUES(tg_tag);
        END IF;`,
      );
      await unchangedFailure(
        db,
        () => transactionSql(db, lab.restrictSql),
        (error) =>
          error.code === "55000" && /assignment catalog state mismatch/.test(error.message),
      );
      assert.deepEqual(await records(db), lab.expectedBefore);
      assert.deepEqual(
        (await db.query("SELECT tag FROM public.lab_assignment_fault_rows")).rows,
        [],
      );
      await dropFault(db);
      await restrict(db);
    });
  },
);

test(
  "genuine after-second-recovery-GRANT shape drift reaches the candidate postcheck and rolls back both grants/column/fault row",
  options,
  async () => {
    await withLab(async (db) => {
      const result = await restrict(db);
      await addFault(
        db,
        "GRANT",
        `
        IF NOT EXISTS (SELECT 1 FROM pg_catalog.unnest(ARRAY['INSERT','UPDATE','DELETE']::pg_catalog.text[]) r(privilege)
          WHERE NOT pg_catalog.has_table_privilege('authenticated','shop_manager.profiles',r.privilege)
            OR NOT pg_catalog.has_table_privilege('authenticated','shop_manager.user_roles',r.privilege)) THEN
          ALTER TABLE shop_manager.user_roles ADD COLUMN lab_postgrant text;
          INSERT INTO public.lab_assignment_fault_rows VALUES(tg_tag);
        END IF;`,
      );
      await unchangedFailure(
        db,
        () => transactionSql(db, lab.recoverSql(result.receipt)),
        (error) =>
          error.code === "55000" && /assignment catalog state mismatch/.test(error.message),
      );
      assert.deepEqual(await records(db), lab.expectedAfter);
      assert.deepEqual(
        (await db.query("SELECT tag FROM public.lab_assignment_fault_rows")).rows,
        [],
      );
      await dropFault(db);
      await transactionSql(db, lab.recoverSql(result.receipt));
      assert.deepEqual(await records(db), lab.expectedBefore);
    });
  },
);

test(
  "genuine after-second-REVOKE default ACL drift reaches its independent postcheck and rolls back defaults/both revokes/fault row",
  options,
  async () => {
    await withLab(async (db) => {
      await addFault(
        db,
        "REVOKE",
        `
        IF NOT EXISTS (SELECT 1 FROM pg_catalog.unnest(ARRAY['INSERT','UPDATE','DELETE']::pg_catalog.text[]) r(privilege)
          WHERE pg_catalog.has_table_privilege('authenticated','shop_manager.profiles',r.privilege)
            OR pg_catalog.has_table_privilege('authenticated','shop_manager.user_roles',r.privilege)) THEN
          ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA shop_manager REVOKE INSERT ON TABLES FROM authenticated;
          INSERT INTO public.lab_assignment_fault_rows VALUES(tg_tag);
        END IF;`,
      );
      await unchangedFailure(
        db,
        () => transactionSql(db, lab.restrictSql),
        (error) =>
          error.code === "55000" && /assignment default privileges changed/.test(error.message),
      );
      assert.deepEqual(await records(db), lab.expectedBefore);
      assert.deepEqual(
        (await db.query("SELECT tag FROM public.lab_assignment_fault_rows")).rows,
        [],
      );
      await dropFault(db);
      await restrict(db);
    });
  },
);

test(
  "recovery refuses restricted ACL/column/PUBLIC/inherited/shape/helper drift rather than guessing or GRANT ALL",
  options,
  async () => {
    await withLab(async (db) => {
      const result = await restrict(db);
      for (const table of targets)
        for (const drift of [
          `GRANT UPDATE ON shop_manager.${table} TO authenticated`,
          `GRANT UPDATE(${table === "profiles" ? "phone" : "role_id"}) ON shop_manager.${table} TO authenticated`,
          `GRANT UPDATE ON shop_manager.${table} TO PUBLIC`,
          "ALTER ROLE authenticated INHERIT; GRANT service_role TO authenticated WITH INHERIT TRUE",
          `ALTER TABLE shop_manager.${table} ADD COLUMN lab_extra text`,
          "ALTER FUNCTION shop_manager.is_owner_or_admin(uuid) SECURITY INVOKER",
        ])
          await isolatedDrift(
            db,
            (connection) => connection.exec(drift),
            lab.recoverSql(result.receipt),
          );
    });
  },
);

test(
  "transaction suffix faults roll back restriction/recovery and do not produce matching observed application inputs",
  options,
  async () => {
    await withLab(async (db) => {
      const before = await records(db);
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
      assert.deepEqual(await records(db), lab.expectedAfter);
    });
  },
);

test(
  "recovery restores exact unsafe original ACLs without reverting independent privileged data changes",
  options,
  async () => {
    await withLab(async (db) => {
      const result = await restrict(db);
      await db.query(
        "UPDATE shop_manager.profiles SET phone='Preserved privileged contact change' WHERE id=$1",
        [ids.actor],
      );
      await db.query("UPDATE shop_manager.user_roles SET role_id=$1 WHERE id=$2", [
        ids.roleOther,
        ids.targetRole,
      ]);
      const before = await completeState(db);
      await transactionSql(db, lab.recoverSql(result.receipt));
      const after = await completeState(db);
      assert.deepEqual(withoutTargets(after), withoutTargets(before));
      assert.deepEqual(after.rows, before.rows);
      assert.deepEqual(await records(db), lab.expectedBefore);
      // Original unsafe self-write is restored deliberately, NOT endorsed/adopted.
      await rollbackActor(db, ids.actor, async () => {
        const changed = await db.query(
          "UPDATE shop_manager.profiles SET phone='Unsafe restored self write' WHERE id=$1 RETURNING phone",
          [ids.actor],
        );
        assert.deepEqual(changed.rows, [{ phone: "Unsafe restored self write" }]);
      });
      await unchangedFailure(db, () => transactionSql(db, lab.recoverSql(result.receipt)));
    });
  },
);
