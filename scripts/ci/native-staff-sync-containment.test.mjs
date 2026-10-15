// OFFLINE selected-writer denial, NOT trusted original-human attribution,
// a migration/production mitigation, complete native authority or offboarding.
// Real pinned member/wrapper/attachments and critical CHECKs are retained.
// Platform claims, base business support and instrumentation are synthetic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNativeStaffSyncContainment } from "./native-staff-sync-containment.mjs";
import { buildNativeSelfShiftCandidate } from "./native-self-shift-candidate.mjs";
import {
  functions,
  id,
  options,
  withFixture,
  actor,
  snapshot,
  target,
  membership,
  seedSession,
  hasCode,
} from "./fixtures/native-staff-trigger-fixture.mjs";

const candidate = buildNativeStaffSyncContainment();
const signature = "shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)";
const otherStaff = "30000000-0000-4000-8000-000000000009";
const bodyDenied = (error) =>
  error.code === "42501" && error.message === "Memory-lab native staff sync unavailable";

async function transaction(db, run) {
  await db.exec("BEGIN; SET LOCAL lock_timeout='1000ms'; SET LOCAL statement_timeout='3000ms'");
  try {
    const value = await run();
    await db.exec("COMMIT");
    return value;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
const install = (db) => transaction(db, () => db.exec(candidate.installSql));
const recover = (db) => transaction(db, () => db.exec(candidate.recoverSql));
async function roleQuery(db, role, subject, sql, parameters = []) {
  assert.ok(["postgres", "service_role", "authenticated", "anon"].includes(role));
  return transaction(db, async () => {
    await db.exec(`SET LOCAL ROLE ${role}`);
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [subject ?? ""]);
    return db.query(sql, parameters);
  });
}
async function unchangedFailure(db, operation, check = bodyDenied) {
  const before = await snapshot(db);
  await assert.rejects(operation(), check);
  assert.deepEqual(await snapshot(db), before);
}
function withoutMemberDefinition(value) {
  const result = structuredClone(value);
  for (const record of result.catalog.functions)
    if (record.nspname === "shop_manager" && record.proname === "sync_business_staff_member")
      delete record.definition_md5;
  return result;
}
const directCall = `SELECT shop_manager.sync_business_staff_member($1,$2,$3,$4)`;
const directArgs = [id.businessA, id.actor, true, "manager"];

test(
  "one fixed early denial preserves the complete original header, defaults and tail",
  options,
  () => {
    assert.equal(candidate.originalDefinition, functions.nativeMember);
    assert.ok(Object.isFrozen(candidate));
    assert.match(candidate.candidateDefinition, /_title text DEFAULT NULL/);
    assert.match(candidate.candidateDefinition, /LANGUAGE plpgsql SECURITY DEFINER/);
    assert.match(
      candidate.candidateDefinition,
      /SET search_path = shop_manager, public, auth, pg_temp/,
    );
    const inserted = candidate.candidateDefinition.slice(
      candidate.originalDefinition.indexOf("\nBEGIN\n") + "\nBEGIN\n".length,
      candidate.candidateDefinition.indexOf("  SELECT * INTO v_business"),
    );
    assert.match(inserted, /RAISE EXCEPTION USING ERRCODE='42501'/);
    assert.match(inserted, /MESSAGE='Memory-lab native staff sync unavailable'/);
    assert.doesNotMatch(inserted, /auth\.uid|current_user|session_user|current_setting|IF\b/i);
    assert.equal(candidate.candidateDefinition.replace(inserted, ""), candidate.originalDefinition);
    for (const sql of [candidate.installSql, candidate.recoverSql]) {
      assert.doesNotMatch(sql, /\b(?:COMMIT|ROLLBACK|GRANT|REVOKE|CASCADE|LOCK TABLE)\b/);
      assert.match(sql, /55000/);
    }
  },
);

test(
  "only member definition changes; owner, defaults, raw ACL, attachments and all rows survive exact recovery",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const original = await snapshot(db);
        const identity = (
          await db.query(
            `SELECT oid,pronargdefaults,proacl::text acl FROM pg_proc WHERE oid=$1::regprocedure`,
            [signature],
          )
        ).rows[0];
        assert.equal(identity.pronargdefaults, 1);
        await install(db);
        const installed = await snapshot(db);
        assert.deepEqual(withoutMemberDefinition(installed), withoutMemberDefinition(original));
        assert.notDeepEqual(installed, original);
        assert.deepEqual(
          (
            await db.query(
              `SELECT oid,pronargdefaults,proacl::text acl FROM pg_proc WHERE oid=$1::regprocedure`,
              [signature],
            )
          ).rows[0],
          identity,
        );
        await unchangedFailure(db, () => install(db), hasCode("55000"));
        await recover(db);
        assert.deepEqual(await snapshot(db), original);
        await unchangedFailure(db, () => recover(db), hasCode("55000"));
      },
      { legacy: true, membership: "left" },
    );
  },
);

test(
  "client EXECUTE denial remains distinct from unconditional owner/service body denial, including NULL inputs",
  options,
  async () => {
    await withFixture(async (db) => {
      await install(db);
      for (const role of ["anon", "authenticated"])
        await unchangedFailure(
          db,
          () => roleQuery(db, role, id.actor, directCall, directArgs),
          (error) =>
            error.code === "42501" && error.message !== "Memory-lab native staff sync unavailable",
        );
      for (const role of ["postgres", "service_role"])
        for (const subject of [id.actor, id.ownerA, id.stranger, null]) {
          await unchangedFailure(db, () => roleQuery(db, role, subject, directCall, directArgs));
          await unchangedFailure(db, () =>
            roleQuery(
              db,
              role,
              subject,
              `SELECT shop_manager.sync_business_staff_member(NULL,NULL,NULL,NULL,NULL)`,
            ),
          );
        }
    });
  },
);

test(
  "real latest wrapper reaches body denial for no-op privileged targets and mixed self mutations",
  options,
  async () => {
    await withFixture(
      async (db, { user }) => {
        await install(db);
        for (const sql of [
          "UPDATE public.business_staff SET role=role WHERE id=$1 RETURNING id",
          "UPDATE public.business_staff SET title=title WHERE id=$1",
          "UPDATE public.business_staff SET active=active WHERE id=$1",
          "UPDATE public.business_staff SET on_shift=true,role='manager' WHERE id=$1 RETURNING role",
          "UPDATE public.business_staff SET business_id=$2,title=title WHERE id=$1",
        ])
          await unchangedFailure(db, () =>
            actor(db, user, sql, sql.includes("$2") ? [id.staffA, id.businessB] : [id.staffA]),
          );
      },
      { legacy: true, membership: "left", nativeShop: id.shopB },
    );
  },
);

test(
  "actual owner INSERT, conflict upsert and redundant-owner DELETE all fail closed without a special owner branch",
  options,
  async () => {
    await withFixture(
      async (db, { user }) => {
        await install(db);
        for (const sql of [
          `INSERT INTO public.business_staff(id,business_id,user_id,role) VALUES('${otherStaff}','${id.businessA}','${id.stranger}','driver')`,
          `INSERT INTO public.business_staff(id,business_id,user_id,role) VALUES('${id.staffA}','${id.businessA}','${user}','owner') ON CONFLICT(business_id,user_id) DO UPDATE SET role=EXCLUDED.role`,
          `DELETE FROM public.business_staff WHERE id='${id.staffA}' RETURNING id`,
        ])
          await unchangedFailure(db, () => actor(db, user, sql));
      },
      { owner: true },
    );
  },
);

test(
  "service and SQL-owner roster writes cannot bypass the endpoint through NULL subjects or execution roles",
  options,
  async () => {
    await withFixture(async (db) => {
      // Synthetic service table grant supplies physical reachability, not a trusted
      // platform grant or accepted service authority. Existing source functions stay exact.
      await db.exec("GRANT SELECT,INSERT,UPDATE,DELETE ON public.business_staff TO service_role");
      await install(db);
      for (const role of ["postgres", "service_role"])
        await unchangedFailure(db, () =>
          roleQuery(db, role, null, "UPDATE public.business_staff SET title=title WHERE id=$1", [
            id.staffA,
          ]),
        );
    });
  },
);

test(
  "a separately labelled midpoint witness proves prior chat reactivation then full business-state rollback",
  options,
  async () => {
    await withFixture(
      async (db, { user }) => {
        await install(db);
        // This disposable nontransactional sequence is ONLY a witness outside the
        // 14 business relations. It intentionally advances despite actor rollback.
        // No historical helper is edited, and no live/catalog-parity claim is made.
        await db.exec(`CREATE SEQUENCE public.sync_midpoint_witness;
      CREATE FUNCTION public.sync_midpoint_probe() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
      BEGIN
        IF current_user<>'postgres' OR auth.uid() IS DISTINCT FROM '${user}'::uuid
           OR NOT EXISTS(SELECT 1 FROM public.chat_thread_members WHERE thread_id='${id.threadA}' AND user_id=NEW.user_id AND status='active') THEN
          RAISE EXCEPTION 'Synthetic midpoint prerequisites not reached';
        END IF;
        PERFORM nextval('public.sync_midpoint_witness'); RETURN NEW;
      END; $$;
      CREATE TRIGGER business_staff_zz_midpoint AFTER UPDATE ON public.business_staff FOR EACH ROW EXECUTE FUNCTION public.sync_midpoint_probe()`);
        await unchangedFailure(db, () =>
          actor(db, user, "UPDATE public.business_staff SET role=role WHERE id=$1", [id.staffA]),
        );
        assert.deepEqual(
          (await db.query("SELECT last_value,is_called FROM public.sync_midpoint_witness")).rows,
          [{ last_value: 1, is_called: true }],
        );
        assert.deepEqual(await membership(db, id.threadA, user), ["left"]);
        await unchangedFailure(db, () => recover(db), hasCode("55000"));
        await db.exec(
          "DROP TRIGGER business_staff_zz_midpoint ON public.business_staff; DROP FUNCTION public.sync_midpoint_probe(); DROP SEQUENCE public.sync_midpoint_witness",
        );
        await recover(db);
      },
      { membership: "left" },
    );
  },
);

test(
  "provisioned team and membership effects roll back when the real wrapper reaches denial",
  options,
  async () => {
    await withFixture(async (db, { user }) => {
      await db.exec(
        `DELETE FROM public.chat_thread_members WHERE thread_id='${id.threadA}'; DELETE FROM public.chat_threads WHERE id='${id.threadA}'`,
      );
      await install(db);
      await unchangedFailure(db, () =>
        actor(db, user, "UPDATE public.business_staff SET title=title WHERE id=$1", [id.staffA]),
      );
    });
  },
);

test(
  "real earlier CHECK failure is not relabelled as endpoint denial or repaired",
  options,
  async () => {
    await withFixture(async (db, { user }) => {
      await install(db);
      await unchangedFailure(
        db,
        () =>
          actor(db, user, "UPDATE public.business_staff SET active=false WHERE id=$1", [id.staffA]),
        hasCode("23514", "chat_thread_members_status_check"),
      );
    });
    await withFixture(
      async (db, { user, profile }) => {
        await seedSession(db, user, profile, id.shopA);
        await install(db);
        await unchangedFailure(db, () =>
          actor(db, user, "UPDATE public.business_staff SET active=false WHERE id=$1", [id.staffA]),
        );
      },
      { membership: null },
    );
  },
);

test(
  "shift-only and identity-only writes bypass this attachment: residual chat effects remain explicit",
  options,
  async () => {
    await withFixture(
      async (db, { user }) => {
        await install(db);
        const before = await snapshot(db);
        const response = await actor(
          db,
          user,
          "UPDATE public.business_staff SET on_shift=true WHERE id=$1 RETURNING id,on_shift",
          [id.staffA],
        );
        assert.deepEqual(response.rows, [{ id: id.staffA, on_shift: true }]);
        assert.deepEqual(await membership(db, id.threadA, user), ["active"]);
        const after = await snapshot(db);
        assert.deepEqual(after.catalog, before.catalog);
        assert.deepEqual(after.data["shop_manager.profiles"], before.data["shop_manager.profiles"]);
        assert.deepEqual(
          after.data["shop_manager.user_roles"],
          before.data["shop_manager.user_roles"],
        );
      },
      { membership: "left" },
    );
    await withFixture(async (db, { user }) => {
      await install(db);
      const before = await snapshot(db);
      await actor(db, user, "UPDATE public.business_staff SET business_id=$1 WHERE id=$2", [
        id.businessB,
        id.staffA,
      ]);
      assert.equal((await target(db)).business_id, id.businessB);
      assert.deepEqual(await membership(db, id.threadB, user), ["active"]);
      const after = await snapshot(db);
      assert.deepEqual(after.catalog, before.catalog);
      assert.deepEqual(after.data["shop_manager.profiles"], before.data["shop_manager.profiles"]);
      assert.deepEqual(
        after.data["shop_manager.user_roles"],
        before.data["shop_manager.user_roles"],
      );
    });
  },
);

test(
  "zero-row UPDATE and DO NOTHING can acknowledge without invoking the endpoint; neither proves a mutation",
  options,
  async () => {
    await withFixture(async (db, { user }) => {
      await install(db);
      const before = await snapshot(db);
      assert.deepEqual(
        (
          await actor(
            db,
            user,
            "UPDATE public.business_staff SET role=role WHERE id=$1 RETURNING id",
            [otherStaff],
          )
        ).rows,
        [],
      );
      assert.deepEqual(
        (
          await actor(
            db,
            id.ownerA,
            `INSERT INTO public.business_staff(id,business_id,user_id,role) VALUES('${id.staffA}','${id.businessA}','${user}','driver') ON CONFLICT DO NOTHING RETURNING id`,
          )
        ).rows,
        [],
      );
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "self-shift companion composes only in explicit order, retains legacy identity and unchanged chat membership",
  options,
  async () => {
    await withFixture(
      async (db, { user }) => {
        const companion = buildNativeSelfShiftCandidate();
        const original = await snapshot(db);
        await install(db);
        await transaction(db, () => db.exec(companion.installSql));
        const installed = await snapshot(db);
        for (const value of [true, true, false]) {
          const response = await actor(
            db,
            user,
            "UPDATE public.business_staff SET on_shift=$1 WHERE id=$2 RETURNING id",
            [value, id.staffA],
          );
          assert.deepEqual(response.rows, [{ id: id.staffA }]);
          assert.equal((await target(db)).on_shift, value);
          assert.deepEqual(await membership(db, id.threadA, user), ["left"]);
          const after = await snapshot(db);
          const normalize = (input) => {
            const result = structuredClone(input);
            for (const item of result.data["public.business_staff"])
              if (item.row.id === id.staffA) {
                delete item.row.on_shift;
                delete item.row.updated_at;
              }
            return result;
          };
          assert.deepEqual(normalize(after), normalize(installed));
        }
        await unchangedFailure(db, () => recover(db), hasCode("55000"));
        await transaction(db, () => db.exec(companion.recoverSql));
        await recover(db);
        const final = await snapshot(db);
        assert.deepEqual(final.catalog, original.catalog);
        assert.deepEqual(
          final.data["shop_manager.profiles"],
          original.data["shop_manager.profiles"],
        );
      },
      { legacy: true, membership: "left" },
    );
  },
);

test(
  "member body/default/security/ACL drift and latest-wrapper drift refuse without hiding drift",
  options,
  async () => {
    for (const sql of [
      functions.nativeMember.replace(
        "  SELECT * INTO v_business",
        "  PERFORM 1;\n  SELECT * INTO v_business",
      ),
      functions.nativeMember.replace("_title text DEFAULT NULL", "_title text DEFAULT 'Drift'"),
      `ALTER FUNCTION ${signature} SECURITY INVOKER`,
      `GRANT EXECUTE ON FUNCTION ${signature} TO authenticated`,
      functions.nativeTrigger.replace(
        "  IF TG_OP='DELETE' THEN",
        "  PERFORM 1;\n  IF TG_OP='DELETE' THEN",
      ),
    ])
      await withFixture(async (db) => {
        await db.exec(sql);
        await unchangedFailure(db, () => install(db), hasCode("55000"));
      });
  },
);

test(
  "missing/disabled/extra staff attachments and inherited roster topology refuse before replacement",
  options,
  async () => {
    for (const sql of [
      "DROP TRIGGER sync_business_staff_to_shop_manager ON public.business_staff",
      "ALTER TABLE public.business_staff DISABLE TRIGGER business_staff_team_thread_sync",
      "CREATE TRIGGER extra_staff_attachment BEFORE UPDATE ON public.business_staff FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()",
      "CREATE TABLE public.roster_child() INHERITS(public.business_staff)",
    ])
      await withFixture(async (db) => {
        await db.exec(sql);
        await unchangedFailure(db, () => install(db), hasCode("55000"));
      });
  },
);

test(
  "only SQL-owner lab installation is accepted; service role is not human release authority",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const role of ["authenticated", "service_role"])
        await unchangedFailure(
          db,
          () =>
            transaction(db, async () => {
              await db.exec(`SET LOCAL ROLE ${role}`);
              await db.exec(candidate.installSql);
            }),
          hasCode("42501"),
        );
      await install(db);
      await unchangedFailure(
        db,
        () =>
          transaction(db, async () => {
            await db.exec("SET LOCAL ROLE service_role");
            await db.exec(candidate.recoverSql);
          }),
        hasCode("42501"),
      );
    });
  },
);

test(
  "installation/recovery suffix faults roll back replacement; recovery drift is refused",
  options,
  async () => {
    await withFixture(async (db) => {
      await unchangedFailure(
        db,
        () => transaction(db, () => db.exec(candidate.installSql + "\nSELECT 1/0")),
        hasCode("22012"),
      );
      await install(db);
      await unchangedFailure(
        db,
        () => transaction(db, () => db.exec(candidate.recoverSql + "\nSELECT 1/0")),
        hasCode("22012"),
      );
      await db.exec(`ALTER FUNCTION ${signature} SET search_path=public`);
      await unchangedFailure(db, () => recover(db), hasCode("55000"));
    });
  },
);

test(
  "explicit unsafe recovery restores source writer but does not undo unrelated committed state",
  options,
  async () => {
    await withFixture(async (db, { user }) => {
      await install(db);
      await db.exec(
        `UPDATE public.profiles SET first_name='Unrelated retained' WHERE id='${id.stranger}'`,
      );
      const retained = await snapshot(db);
      await recover(db);
      assert.deepEqual((await snapshot(db)).data, retained.data);
      await actor(db, user, "UPDATE public.business_staff SET role='manager' WHERE id=$1", [
        id.staffA,
      ]);
      assert.deepEqual(
        (
          await db.query(
            "SELECT r.name::text name FROM shop_manager.user_roles ur JOIN shop_manager.roles r ON r.id=ur.role_id WHERE ur.user_id=$1",
            [user],
          )
        ).rows,
        [{ name: "manager" }],
      );
      assert.equal(
        (await db.query("SELECT first_name FROM public.profiles WHERE id=$1", [id.stranger]))
          .rows[0].first_name,
        "Unrelated retained",
      );
    });
  },
);

test(
  "real post-DDL metadata fault reaches own postguard and rolls back installation and recovery",
  options,
  async () => {
    for (const recovering of [false, true])
      await withFixture(async (db) => {
        if (recovering) await install(db);
        // CREATE FUNCTION (including OR REPLACE) fires this synthetic event hook.
        // Its ALTER FUNCTION action has a different tag: no recursive event loop.
        // The action returns, so the operation's OWN second-stage55000 guard must
        // reject the altered security mode, rather than a fabricated raised fault.
        await db.exec(`CREATE FUNCTION public.sync_ddl_fault() RETURNS event_trigger
      LANGUAGE plpgsql AS $$ BEGIN
        ALTER FUNCTION shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text) SECURITY INVOKER;
      END; $$;
      CREATE EVENT TRIGGER sync_ddl_fault ON ddl_command_end
      WHEN TAG IN ('CREATE FUNCTION') EXECUTE FUNCTION public.sync_ddl_fault()`);
        await unchangedFailure(
          db,
          () => (recovering ? recover(db) : install(db)),
          (error) =>
            error.code === "55000" &&
            error.message === "Memory-lab selected staff function mismatch",
        );
      });
  },
);

test(
  "trusted operation path resists temporary type shadows and restores the caller path",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec(`CREATE TEMP TABLE sync_type_marker(id pg_catalog.int4);
      CREATE DOMAIN pg_temp.uuid AS pg_catalog.text;
      CREATE DOMAIN pg_temp.text AS pg_catalog.text;
      CREATE DOMAIN pg_temp.boolean AS pg_catalog.text;
      CREATE TYPE pg_temp.void AS ENUM('synthetic');
      SET search_path=pg_temp,public`);
      const qualified =
        "shop_manager.sync_business_staff_member(pg_catalog.uuid,pg_catalog.uuid,pg_catalog.bool,pg_catalog.text,pg_catalog.text)";
      const original = await snapshot(db);
      const identity = (
        await db.query(
          `SELECT p.oid,p.proargtypes::pg_catalog.text types,p.prorettype, p.proacl::pg_catalog.text acl
      FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure($1)`,
          [qualified],
        )
      ).rows[0];
      const callerPath = (await db.query("SHOW search_path")).rows[0].search_path;
      assert.equal(callerPath, "pg_temp, public");
      for (const operation of [install, recover]) {
        await operation(db);
        assert.equal((await db.query("SHOW search_path")).rows[0].search_path, callerPath);
        assert.deepEqual(
          (
            await db.query(
              `SELECT p.oid,p.proargtypes::pg_catalog.text types,p.prorettype, p.proacl::pg_catalog.text acl
        FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure($1)`,
              [qualified],
            )
          ).rows[0],
          identity,
        );
        assert.equal(
          (
            await db.query(`SELECT count(*)::pg_catalog.int4 count FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='shop_manager' AND p.proname='sync_business_staff_member'`)
          ).rows[0].count,
          1,
        );
      }
      assert.deepEqual(await snapshot(db), original);
    });
  },
);
