// MEMORY-ONLY owner-session characterization; no native authority adoption.
import test from "node:test";
import assert from "node:assert/strict";
import {
  withBridge,
  catalog,
  data,
  snapshot,
  isolated,
  asSettings,
  attempt,
  id,
  ddl,
  functions,
  signatures,
  relations,
  addedAttachments,
  limitations,
  pins,
  verifyPins,
  labSequenceState,
} from "./fixtures/full-native-staff-bridge-fixture.mjs";

const options = { concurrency: false, timeout: 30_000 };
const roster = async (db) =>
  (await db.query("SELECT * FROM public.business_staff WHERE id=$1", [id.staffA])).rows[0];
const binding = async (db) =>
  (
    await db.query("SELECT id,user_id,shop_id FROM shop_manager.profiles WHERE user_id=$1", [
      id.actor,
    ])
  ).rows;
const roleNames = async (db) =>
  (
    await db.query(
      "SELECT r.name::text name FROM shop_manager.user_roles u JOIN shop_manager.roles r ON r.id=u.role_id WHERE u.user_id=$1 ORDER BY r.name",
      [id.actor],
    )
  ).rows.map((row) => row.name);
const membership = async (db) =>
  (
    await db.query(
      "SELECT status FROM public.chat_thread_members WHERE thread_id=$1 AND user_id=$2",
      [id.threadA, id.actor],
    )
  ).rows;
async function ownerWithSubject(db, run) {
  return asSettings(
    db,
    { role: "postgres", claims: JSON.stringify({ sub: id.stranger }) },
    async () => {
      assert.deepEqual(
        (await db.query("SELECT current_user AS actor,auth.uid() AS subject")).rows,
        [{ actor: "postgres", subject: id.stranger }],
      );
      assert.notEqual(
        id.stranger,
        id.actor,
        "synthetic invoking uid differs from affected employee",
      );
      return run();
    },
  );
}

test("immutable parent/native sources and narrow composition declarations stay explicit", () => {
  verifyPins();
  assert.equal(Object.keys(pins).length, 4);
  assert.deepEqual([relations.length, signatures.length, addedAttachments.length], [36, 53, 4]);
  assert.equal(new Set(relations).size, relations.length);
  assert.equal(new Set(signatures).size, signatures.length);
  assert.match(limitations.join("\n"), /before native effects/);
  assert.match(limitations.join("\n"), /No client row policies/);
  assert.match(ddl.nativeAttach, /UPDATE OF role,title,active/);
  assert.match(ddl.chatAttach, /AFTER INSERT OR UPDATE OR DELETE/);
  assert.match(functions.nativeMember, /ON CONFLICT \(user_id\) WHERE user_id IS NOT NULL/);
  assert.doesNotMatch(ddl.profiles, /FOREIGN KEY \(shop_id\)/);
  assert.doesNotMatch(ddl.userRoles, /FOREIGN KEY \(role_id\)/);
});

test(
  "full claim foundation composes only retained existing-roster/native writers",
  options,
  async (t) => {
    // One full foundation startup; every subcase rolls back before the next.
    await withBridge(async (db, guard) => {
      await t.test(
        "full tables, provider uid, existing attachments and real critical constraints are retained",
        async () => {
          await guard();
          const current = await catalog(db);
          assert.equal(current.triggers.length, 41);
          assert.equal(
            current.tables.filter(
              (row) => row.nspname === "public" && row.relname !== "profiles_member_number_seq",
            ).length,
            27,
          );
          assert.equal(current.tables.filter((row) => row.nspname === "shop_manager").length, 8);
          assert.equal(Object.keys(await data(db)).length, 36);
          assert.deepEqual(current.policies, []);
          const profileFks = current.constraints.filter(
            (row) =>
              row.nspname === "shop_manager" && row.relname === "profiles" && row.contype === "f",
          );
          assert.deepEqual(
            profileFks.map((row) => row.conname),
            ["profiles_user_id_fkey"],
          );
          assert.ok(profileFks.every((row) => row.convalidated));
          assert.ok(
            current.constraints.some(
              (row) => row.conname === "user_roles_user_id_fkey" && row.convalidated,
            ),
          );
          assert.ok(!current.constraints.some((row) => row.conname === "user_roles_role_id_fkey"));
          assert.equal(
            (await db.query("SELECT count(*)::int n FROM shop_manager.employee_work_locations"))
              .rows[0].n,
            2,
            "actual retained shops INSERT attachment executes only for seeded native shops",
          );
          assert.equal(
            (await db.query("SELECT count(*)::int n FROM public.business_claim_evidence")).rows[0]
              .n,
            1,
            "full nonempty claim/evidence parent is not a reduced support",
          );
        },
      );

      await t.test(
        "owner-session on_shift no-op reaches chat/timestamp but not UPDATE-OF native remapping",
        async () => {
          await isolated(db, async () => {
            const beforeBinding = await binding(db),
              beforeRoles = await roleNames(db),
              before = await roster(db);
            assert.deepEqual(await membership(db), [{ status: "left" }]);
            await ownerWithSubject(db, async () => {
              const response = await db.query(
                "UPDATE public.business_staff SET on_shift=on_shift WHERE id=$1 RETURNING id,on_shift",
                [id.staffA],
              );
              assert.deepEqual(response.rows, [{ id: id.staffA, on_shift: false }]);
              assert.deepEqual(await membership(db), [{ status: "active" }]);
              assert.ok((await roster(db)).updated_at > before.updated_at);
              assert.deepEqual(await binding(db), beforeBinding);
              assert.deepEqual(await roleNames(db), beforeRoles);
            });
          });
          await guard();
        },
      );

      await t.test(
        "role-targeted no-op preserves roster/profile IDs but retains native role-row churn",
        async () => {
          await isolated(db, async () => {
            assert.deepEqual(await binding(db), [
              { id: id.legacy, user_id: id.actor, shop_id: id.shopB },
            ]);
            const oldRole = (
              await db.query(
                "SELECT id,user_id,role_id FROM shop_manager.user_roles WHERE user_id=$1",
                [id.actor],
              )
            ).rows[0];
            const seq = await labSequenceState(db);
            await ownerWithSubject(db, async () => {
              const response = await db.query(
                "UPDATE public.business_staff SET role=role WHERE id=$1 RETURNING id,user_id,business_id,role",
                [id.staffA],
              );
              assert.deepEqual(response.rows, [
                { id: id.staffA, user_id: id.actor, business_id: id.businessA, role: "driver" },
              ]);
              assert.deepEqual(await binding(db), [
                { id: id.legacy, user_id: id.actor, shop_id: id.shopA },
              ]);
              assert.notEqual(id.legacy, id.actor);
              assert.deepEqual(await roleNames(db), ["truck_driver"]);
              const newRole = (
                await db.query(
                  "SELECT id,user_id,role_id FROM shop_manager.user_roles WHERE user_id=$1",
                  [id.actor],
                )
              ).rows[0];
              assert.notEqual(
                newRole.id,
                oldRole.id,
                "retained DELETE/INSERT is not an idempotent no-op",
              );
              assert.deepEqual(
                { user_id: newRole.user_id, role_id: newRole.role_id },
                { user_id: oldRole.user_id, role_id: oldRole.role_id },
              );
              assert.deepEqual(await membership(db), [{ status: "active" }]);
              assert.deepEqual(await labSequenceState(db), seq);
            });
          });
          await guard();
        },
      );

      await t.test(
        "existing nonowner roster roles use the unchanged native mapping, not a new permission decision",
        async () => {
          for (const [businessRole, nativeRole] of [
            ["driver", "truck_driver"],
            ["mechanic", "technician"],
            ["clerk", "office_admin"],
            ["dispatcher", "dispatch"],
            ["manager", "manager"],
          ]) {
            await isolated(db, async () => {
              await ownerWithSubject(db, async () => {
                await db.query(
                  "UPDATE public.business_staff SET role=$1::public.business_staff_role WHERE id=$2",
                  [businessRole, id.staffA],
                );
                assert.deepEqual(await roleNames(db), [nativeRole]);
                assert.deepEqual(await binding(db), [
                  { id: id.legacy, user_id: id.actor, shop_id: id.shopA },
                ]);
              });
            });
          }
          await guard();
        },
      );

      await t.test(
        "natural missing inviter reaches real chat FK23503 and rolls earlier roster/timestamp back BEFORE native",
        async () => {
          await isolated(db, async () => {
            await db.query(
              "DELETE FROM public.chat_thread_members WHERE thread_id=$1 AND user_id=$2",
              [id.threadA, id.actor],
            );
            const before = await snapshot(db);
            await assert.rejects(
              () =>
                attempt(db, () =>
                  db.query(
                    "UPDATE public.business_staff SET role=role,on_shift=true,invited_by=$1 WHERE id=$2 RETURNING id",
                    [id.legacy, id.staffA],
                  ),
                ),
              (error) =>
                error.code === "23503" &&
                error.constraint === "chat_thread_members_invited_by_fkey",
            );
            assert.deepEqual(await snapshot(db), before);
            assert.deepEqual(await binding(db), [
              { id: id.legacy, user_id: id.actor, shop_id: id.shopB },
            ]);
            assert.equal((await roster(db)).on_shift, false);
            // The alphabetically earlier chat AFTER trigger failed. This does not
            // claim that a later native profile/role side effect was exercised.
            assert.ok("business_staff_team_thread_sync" < "sync_business_staff_to_shop_manager");
          });
          await guard();
        },
      );

      await t.test(
        "retained missing-mapped-role guard rolls earlier native/public effects back without an invented FK",
        async () => {
          await isolated(db, async () => {
            await ownerWithSubject(db, async () => {
              const before = await snapshot(db);
              await assert.rejects(
                () =>
                  attempt(db, async () => {
                    // Explicit missing reference data, not a new constraint or
                    // fault trigger. Delete and UPDATE share this savepoint.
                    await db.exec("DELETE FROM shop_manager.roles WHERE name='manager'");
                    await db.query(
                      "UPDATE public.business_staff SET role='manager' WHERE id=$1 RETURNING id",
                      [id.staffA],
                    );
                  }),
                (error) =>
                  error.code === "P0001" &&
                  error.message === "Mapped Shop Manager role not found: manager",
              );
              assert.deepEqual(
                await snapshot(db),
                before,
                "late source guard restores role reference data, chat/roster/timestamp, native shop/profile/register/roles and all parent state",
              );
              assert.deepEqual(await binding(db), [
                { id: id.legacy, user_id: id.actor, shop_id: id.shopB },
              ]);
              assert.deepEqual(await roleNames(db), ["truck_driver"]);
              assert.deepEqual(await membership(db), [{ status: "left" }]);
            });
          });
          await guard();
        },
      );

      await t.test(
        "ordinary roles get no writer positive from owner seeds or new native schema access",
        async () => {
          const before = await snapshot(db);
          for (const role of ["anon", "authenticated"]) {
            await asSettings(db, { role, subject: id.actor }, async () => {
              if (role === "authenticated") {
                assert.deepEqual(
                  (
                    await db.query(
                      "UPDATE public.business_staff SET role=role WHERE id=$1 RETURNING id",
                      [id.staffA],
                    )
                  ).rows,
                  [],
                  "retained table grant plus no row policy does not grant update authority",
                );
              } else {
                await assert.rejects(
                  () =>
                    attempt(db, () =>
                      db.query("UPDATE public.business_staff SET role=role WHERE id=$1", [
                        id.staffA,
                      ]),
                    ),
                  (error) => error.code === "42501",
                );
              }
              await assert.rejects(
                () =>
                  attempt(db, () =>
                    db.query(
                      "SELECT shop_manager.sync_business_staff_member($1,$2,true,'driver',NULL)",
                      [id.businessA, id.actor],
                    ),
                  ),
                (error) => error.code === "42501",
              );
            });
          }
          assert.deepEqual(await snapshot(db), before);
          await guard();
        },
      );

      await t.test(
        "child and full-parent drift is rejected before rollback can hide it",
        async () => {
          const faults = [
            "DROP FUNCTION public.ensure_business_team_thread(uuid)",
            "CREATE FUNCTION public.lab_bridge_extra() RETURNS boolean LANGUAGE sql AS 'SELECT true'",
            "CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at='2000-01-01Z';RETURN NEW;END; $$",
            "ALTER TABLE shop_manager.profiles DROP CONSTRAINT profiles_user_id_fkey",
            "ALTER TABLE public.business_staff ADD CONSTRAINT lab_extra_constraint CHECK(true)",
            "GRANT SELECT ON shop_manager.profiles TO authenticated",
            "GRANT EXECUTE ON FUNCTION public.ensure_business_team_thread(uuid) TO authenticated",
            "ALTER TABLE public.business_staff DISABLE TRIGGER sync_business_staff_to_shop_manager",
            "ALTER TABLE public.business_staff DISABLE TRIGGER business_staff_team_thread_sync",
            "ALTER TABLE public.business_staff DISABLE TRIGGER trg_business_staff_updated",
            "ALTER TABLE shop_manager.shops DISABLE TRIGGER shops_create_employee_work_location",
            "CREATE POLICY lab_bridge_allow ON public.business_staff USING(true)",
            "ALTER TABLE public.profiles ALTER COLUMN phone SET DEFAULT 'lab-drift'",
            "ALTER TABLE auth.users ALTER COLUMN email SET NOT NULL",
            "ALTER TABLE public.business_claim_evidence DROP CONSTRAINT business_claim_evidence_evidence_type_check",
            "ALTER SEQUENCE public.profiles_member_number_seq CACHE 2",
            "REVOKE EXECUTE ON FUNCTION auth.uid() FROM PUBLIC",
            "CREATE FUNCTION auth.lab_bridge_identity() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid'",
            "CREATE TABLE public.lab_bridge_support(id uuid)",
            "GRANT SELECT(phone) ON public.profiles TO authenticated",
            "SET LOCAL lock_timeout='42ms'",
          ];
          const baseline = await snapshot(db);
          for (const sql of faults) {
            await isolated(db, async () => {
              await db.exec(sql);
              await assert.rejects(() => guard(), { code: "ERR_ASSERTION" }, sql);
            });
            await guard();
            assert.deepEqual(
              await snapshot(db),
              baseline,
              "fault rollback retains all full parent and native rows/settings/catalog",
            );
          }
        },
      );
    });
  },
);
