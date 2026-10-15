// MEMORY-ONLY partial owner-intent extension of the unchanged PR45 claim proof.
// No original-human authority, accepted management matrix, hosted API/JWT,
// native sync, complete profile/business/partner writer closure or live incident.
// Added client-deny policies and fault/cancel hooks are explicitly synthetic.
// Source functions, actual enum labels and critical CHECK/FK/NOT NULL stay intact.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  withOwnerIntentFixture as withFixture,
  ownerIntentSnapshot as snapshot,
  ownerIntentCatalog as catalog,
  assertOwnerIntentObservedSubset,
  ownerIntentFunctions as functions,
  ownerIntentSources as sources,
  ownerIntentPins as pins,
  ownerIntentObserved as observed,
  ownerIntentEnums as enums,
  actor,
  id,
} from "./fixtures/native-owner-intent-fixture.mjs";

const options = { concurrency: false, timeout: 30_000 };
const contextualSignature = "public.recompute_signup_intent(uuid,text,text,text,text,text,text)";
const contextualSql = `SELECT public.recompute_signup_intent(
  $1::pg_catalog.uuid,$2::pg_catalog.text,$3::pg_catalog.text,$4::pg_catalog.text,
  $5::pg_catalog.text,$6::pg_catalog.text,$7::pg_catalog.text) acknowledgement`;
const context = [
  "synthetic_context",
  "synthetic_field",
  "before",
  "after",
  "business",
  id.business,
];
async function profile(db, user = id.claimant) {
  return (
    await db.query(
      `SELECT id,seller_type::pg_catalog.text seller_type,signup_intent,
      intent_evaluated_at,intent_evaluated_by,updated_at FROM public.profiles WHERE id=$1`,
      [user],
    )
  ).rows[0];
}
async function audits(db, user) {
  return (
    await db.query(
      `SELECT actor_id,target_user_id,action,field,old_value,new_value,note,
      entity_type,entity_id,metadata FROM public.admin_audit_log
      WHERE ($1::pg_catalog.uuid IS NULL OR target_user_id=$1) ORDER BY created_at,id`,
      [user ?? null],
    )
  ).rows;
}
async function owner(db, business = id.business) {
  return (await db.query("SELECT owner_id FROM public.businesses WHERE id=$1", [business])).rows[0]
    ?.owner_id;
}
async function claimStatus(db) {
  return (
    await db.query("SELECT status FROM public.business_claim_requests WHERE id=$1", [id.claim])
  ).rows[0].status;
}
const approve = (db) =>
  actor(
    db,
    "service_role",
    null,
    "SELECT public.approve_business_claim($1::pg_catalog.uuid,false) acknowledgement",
    [id.claim],
  );
const recompute = (db, user = id.claimant, subject = null, values = context) =>
  actor(db, "service_role", subject, contextualSql, [user, ...values]);
const hasCode = (code, constraint) => (error) =>
  error.code === code && (!constraint || error.constraint === constraint);
async function unchangedFailure(db, run, check) {
  const before = await snapshot(db);
  await assert.rejects(run(), check);
  assert.deepEqual(await snapshot(db), before);
}
async function preservedCatalogAndRoles(db, before) {
  const after = await snapshot(db);
  assert.ok(before.catalog && after.catalog && before.base.catalog && after.base.catalog);
  assert.deepEqual(after.catalog, before.catalog);
  assert.deepEqual(after.base.catalog, before.base.catalog);
  assert.deepEqual(after.base.data.publicRoles, before.base.data.publicRoles);
  assert.deepEqual(after.base.data.authUsers, before.base.data.authUsers);
}
const transferOptions = {
  owner: id.previousOwner,
  kind: "transfer",
  profileOverrides: [{ id: id.previousOwner, signup_intent: "business" }],
};

test(
  "selected source, overloads, enum and critical catalog remain narrowly pinned, not full profile parity",
  options,
  async () => {
    assert.equal(typeof pins, "object");
    assert.equal(typeof sources, "object");
    assert.match(functions.derive, /SELECT seller_type INTO _seller_type FROM public\.profiles/);
    assert.match(
      functions.derive,
      /EXISTS \(SELECT 1 FROM public\.businesses WHERE owner_id = _user_id\)/,
    );
    assert.doesNotMatch(
      functions.derive,
      /public\.(?:user_roles|user_referrals|partner_program_partners)/,
    );
    for (const source of [functions.recompute, functions.contextRecompute]) {
      assert.match(source, /EXCEPTION WHEN OTHERS THEN/);
      assert.match(source, /_user_id, _user_id, 'intent_recomputed'/);
      assert.doesNotMatch(source, /GET DIAGNOSTICS|ROW_COUNT|RETURNING|auth\.uid\(/i);
    }
    assert.match(functions.profileIntent, /NEW\.seller_type::text/);
    assert.match(functions.contextRecompute, /_trigger_entity_id text DEFAULT NULL/);
    const savedEnum = enums.enums.find((value) => value.type === "seller_type");
    assert.deepEqual(savedEnum.labels, ["private", "business", "staff"]);
    await withFixture(async (db) => {
      await assertOwnerIntentObservedSubset(db);
      const current = await catalog(db);
      assert.ok(current.functions && current.triggers && current.constraints);
      assert.equal(
        observed.functions.filter((fn) =>
          fn.signature.startsWith("public.recompute_signup_intent("),
        ).length,
        2,
      );
      const auditShape = (
        await db.query(`SELECT a.attname name,a.attnotnull not_null
      FROM pg_catalog.pg_attribute a WHERE a.attrelid='public.admin_audit_log'::pg_catalog.regclass
      AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`)
      ).rows;
      assert.equal(auditShape.length, 12);
      assert.equal(auditShape.find((value) => value.name === "actor_id").not_null, true);
      assert.equal(
        (
          await db.query(`SELECT count(*)::pg_catalog.int4 count FROM pg_catalog.pg_constraint
      WHERE conrelid='public.admin_audit_log'::pg_catalog.regclass AND contype IN('c','f')`)
        ).rows[0].count,
        0,
      );
      assert.equal(
        (
          await db.query(`SELECT count(*)::pg_catalog.int4 count FROM pg_catalog.pg_trigger
      WHERE tgrelid='public.admin_audit_log'::pg_catalog.regclass AND NOT tgisinternal`)
        ).rows[0].count,
        0,
      );
    });
  },
);

test(
  "claim approval reaches owner-intent profile update and contextual target-as-actor audit",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await snapshot(db);
      const initial = await profile(db);
      await approve(db);
      assert.equal(await owner(db), id.claimant);
      assert.equal(await claimStatus(db), "approved");
      const current = await profile(db);
      assert.equal(current.signup_intent, "business");
      assert.equal(current.intent_evaluated_by, null);
      assert.notDeepEqual(current.intent_evaluated_at, initial.intent_evaluated_at);
      assert.notDeepEqual(current.updated_at, initial.updated_at);
      const rows = await audits(db);
      assert.equal(rows.length, 1);
      assert.deepEqual(rows[0], {
        actor_id: id.claimant,
        target_user_id: id.claimant,
        action: "intent_recomputed",
        field: "signup_intent",
        old_value: "buyer",
        new_value: "business",
        note: "Automatic re-evaluation via database trigger (business_owner_changed)",
        entity_type: "business",
        entity_id: id.business,
        metadata: {
          source: "auto",
          trigger: "business_owner_changed",
          changed_field: "owns_business",
          changed_old: "false",
          changed_new: "true",
        },
      });
      await preservedCatalogAndRoles(db, before);
    });
  },
);

test(
  "transfer recomputes both old and new owners, not the executing service subject",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await snapshot(db);
      await approve(db);
      assert.equal((await profile(db, id.previousOwner)).signup_intent, "buyer");
      assert.equal((await profile(db)).signup_intent, "business");
      const rows = await audits(db);
      assert.equal(rows.length, 2);
      for (const user of [id.previousOwner, id.claimant]) {
        const entry = rows.find((row) => row.target_user_id === user);
        assert.equal(entry.actor_id, user);
        assert.equal(entry.entity_id, id.business);
        assert.equal(entry.metadata.trigger, "business_owner_changed");
      }
      assert.equal(rows.find((row) => row.target_user_id === id.previousOwner).new_value, "buyer");
      assert.equal(rows.find((row) => row.target_user_id === id.claimant).new_value, "business");
      await preservedCatalogAndRoles(db, before);
    }, transferOptions);
  },
);

test(
  "an old owner retaining another business stays business; row-event metadata is not global ownership repair",
  options,
  async () => {
    await withFixture(async (db) => {
      await actor(db, "postgres", null, "UPDATE public.businesses SET owner_id=$1 WHERE id=$2", [
        id.previousOwner,
        id.otherBusiness,
      ]);
      const old = await profile(db, id.previousOwner);
      const before = await snapshot(db);
      await approve(db);
      assert.equal(await owner(db, id.otherBusiness), id.previousOwner);
      assert.deepEqual(await profile(db, id.previousOwner), old);
      assert.equal((await audits(db, id.previousOwner)).length, 0);
      assert.equal((await profile(db)).signup_intent, "business");
      assert.equal((await audits(db)).length, 1);
      await preservedCatalogAndRoles(db, before);
    }, transferOptions);
  },
);

test(
  "missing profiles and NULL targets do not bootstrap a profile or a global role",
  options,
  async () => {
    for (const omitted of [[id.claimant], [id.previousOwner], [id.previousOwner, id.claimant]])
      await withFixture(
        async (db) => {
          const before = await snapshot(db);
          await approve(db);
          assert.equal(await owner(db), id.claimant);
          assert.equal(await claimStatus(db), "approved");
          for (const user of omitted) {
            assert.equal(await profile(db, user), undefined);
            assert.deepEqual(await audits(db, user), []);
          }
          await preservedCatalogAndRoles(db, before);
        },
        {
          ...transferOptions,
          omitProfiles: omitted,
          profileOverrides: transferOptions.profileOverrides.filter(
            (value) => !omitted.includes(value.id),
          ),
        },
      );
    await withFixture(async (db) => {
      const before = await snapshot(db);
      await recompute(db, null);
      await recompute(db, id.missing);
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "redundant owner/seller-type targets and unchanged derived values preserve evaluator metadata and avoid audit",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const original = await profile(db);
        await actor(
          db,
          "postgres",
          null,
          "UPDATE public.businesses SET owner_id=owner_id WHERE id=$1 RETURNING id",
          [id.business],
        );
        await actor(
          db,
          "service_role",
          null,
          "UPDATE public.profiles SET seller_type=seller_type WHERE id=$1 RETURNING id",
          [id.claimant],
        );
        const before = await snapshot(db);
        const current = await profile(db);
        assert.equal(current.signup_intent, original.signup_intent);
        assert.deepEqual(current.intent_evaluated_at, original.intent_evaluated_at);
        assert.equal(current.intent_evaluated_by, id.moderator);
        assert.deepEqual(await audits(db), []);
        await recompute(db);
        assert.deepEqual(await snapshot(db), before);
      },
      { profileOverrides: [{ id: id.claimant, intent_evaluated_by: id.moderator }] },
    );
  },
);

test(
  "actual seller enum excludes repair/dealer branches; business and staff labels without ownership derive buyer",
  options,
  async () => {
    for (const seller of ["private", "business", "staff"])
      await withFixture(
        async (db) => {
          const result = await actor(
            db,
            "authenticated",
            id.stranger,
            "SELECT public.derive_signup_intent($1::pg_catalog.uuid) intent",
            [id.claimant],
          );
          assert.deepEqual(result.rows, [{ intent: "buyer" }]);
          await recompute(db);
          assert.equal((await profile(db)).signup_intent, "buyer");
          assert.equal((await profile(db)).intent_evaluated_by, null);
          for (const unreachable of ["dealer", "insurance", "repair_shop"])
            await unchangedFailure(
              db,
              () =>
                actor(
                  db,
                  "service_role",
                  null,
                  "UPDATE public.profiles SET seller_type=$1::public.seller_type WHERE id=$2",
                  [unreachable, id.claimant],
                ),
              hasCode("22P02"),
            );
        },
        {
          profileOverrides: [
            {
              id: id.claimant,
              seller_type: seller,
              signup_intent: seller === "staff" ? "internal_staff" : "private_seller",
              intent_evaluated_by: id.moderator,
            },
          ],
        },
      );
  },
);

test(
  "dated EXECUTE and synthetic deny-client policies separate definer classification from native or human authority",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const saved = observed.functions.find(
          (fn) => fn.signature === "public.derive_signup_intent(uuid)",
        );
        assert.equal(saved.authenticatedExecute, true);
        assert.equal(saved.anonExecute, false);
        const direct = await actor(
          db,
          "authenticated",
          id.stranger,
          "SELECT id FROM public.profiles WHERE id=$1",
          [id.previousOwner],
        );
        assert.deepEqual(
          direct.rows,
          [],
          "synthetic deny-client profile policy only, not actual profile visibility",
        );
        assert.deepEqual(
          (
            await actor(
              db,
              "authenticated",
              id.stranger,
              "SELECT public.derive_signup_intent($1::pg_catalog.uuid) intent",
              [id.previousOwner],
            )
          ).rows,
          [{ intent: "business" }],
        );
        for (const role of ["anon", "authenticated"])
          await unchangedFailure(
            db,
            () => actor(db, role, id.stranger, contextualSql, [id.claimant, ...context]),
            hasCode("42501"),
          );
        await unchangedFailure(
          db,
          () =>
            actor(db, "anon", null, "SELECT public.derive_signup_intent($1::pg_catalog.uuid)", [
              id.claimant,
            ]),
          hasCode("42501"),
        );
      },
      { owner: id.previousOwner },
    );
  },
);

test(
  "explicit contextual recompute attributes the target and clears a prior evaluator only when its value changes",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const before = await snapshot(db);
        await recompute(db, id.claimant, id.moderator);
        const current = await profile(db);
        assert.equal(current.signup_intent, "buyer");
        assert.equal(current.intent_evaluated_by, null);
        const entries = await audits(db);
        assert.equal(entries.length, 1);
        assert.equal(entries[0].actor_id, id.claimant);
        assert.notEqual(entries[0].actor_id, id.moderator);
        assert.deepEqual(entries[0].metadata, {
          source: "auto",
          trigger: "synthetic_context",
          changed_field: "synthetic_field",
          changed_old: "before",
          changed_new: "after",
        });
        assert.equal(entries[0].entity_type, "business");
        assert.equal(entries[0].entity_id, id.business);
        await preservedCatalogAndRoles(db, before);
      },
      {
        profileOverrides: [
          { id: id.claimant, signup_intent: "business", intent_evaluated_by: id.moderator },
        ],
      },
    );
  },
);

test(
  "one-argument typed/unknown/named dispatch is tested with both overloads; explicit contextual arity stays separate",
  options,
  async () => {
    await withFixture(
      async (db) => {
        for (const [sql, args] of [
          ["SELECT public.recompute_signup_intent($1::pg_catalog.uuid)", [id.claimant]],
          [`SELECT public.recompute_signup_intent('${id.claimant}')`, []],
          ["SELECT public.recompute_signup_intent(_user_id=>$1::pg_catalog.uuid)", [id.claimant]],
        ])
          await unchangedFailure(
            db,
            () => actor(db, "service_role", null, sql, args),
            hasCode("42725"),
          );
        await recompute(db);
        assert.equal((await profile(db)).signup_intent, "buyer");
        assert.equal((await audits(db))[0].metadata.trigger, "synthetic_context");
      },
      { profileOverrides: [{ id: id.claimant, signup_intent: "business" }] },
    );
  },
);

test(
  "isolated one-argument-only memory variant preserves its unchanged body, not current overload parity",
  options,
  async () => {
    await withFixture(
      async (db) => {
        // Intentional fixture-only dispatch variant AFTER default parity validation.
        // Seven-argument callers are not exercised in this altered catalog; no live
        // recovery, migration, default removal or current-state adoption is implied.
        await db.exec(`DROP FUNCTION ${contextualSignature} RESTRICT`);
        const before = await snapshot(db);
        await actor(
          db,
          "service_role",
          id.moderator,
          "SELECT public.recompute_signup_intent($1::pg_catalog.uuid) acknowledgement",
          [id.claimant],
        );
        assert.equal((await profile(db)).signup_intent, "buyer");
        const rows = await audits(db);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].actor_id, id.claimant);
        assert.deepEqual(rows[0].metadata, { source: "auto" });
        assert.equal(rows[0].entity_type, null);
        assert.equal(rows[0].entity_id, null);
        await preservedCatalogAndRoles(db, before);
      },
      { profileOverrides: [{ id: id.claimant, signup_intent: "business" }] },
    );
  },
);

test(
  "an actual audit NOT NULL failure is swallowed while selected owner/profile/claim changes commit",
  options,
  async () => {
    await withFixture(async (db) => {
      await unchangedFailure(
        db,
        () =>
          actor(
            db,
            "service_role",
            null,
            "INSERT INTO public.admin_audit_log(actor_id,action) VALUES(NULL,'synthetic_probe')",
          ),
        (error) => error.code === "23502" && error.column === "actor_id",
      );
      await db.exec(`CREATE FUNCTION public.lab_intent_audit_null_actor() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.action='intent_recomputed' THEN
          IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=NEW.target_user_id AND signup_intent=NEW.new_value) THEN
            RAISE EXCEPTION 'Synthetic audit phase not reached';
          END IF;
          NEW.actor_id:=NULL;
        END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER lab_intent_audit_null_actor BEFORE INSERT ON public.admin_audit_log
        FOR EACH ROW EXECUTE FUNCTION public.lab_intent_audit_null_actor()`);
      const before = await snapshot(db);
      await approve(db);
      assert.equal(await owner(db), id.claimant);
      assert.equal(await claimStatus(db), "approved");
      assert.equal((await profile(db)).signup_intent, "business");
      assert.deepEqual(await audits(db), []);
      await preservedCatalogAndRoles(db, before);
      // Outside the source's catch, the same hook must reach the actual NOT NULL
      // constraint, not its synthetic phase prerequisite. A swallowed RAISE alone
      // would not prove which error the original audit attempt encountered.
      await unchangedFailure(
        db,
        () =>
          actor(
            db,
            "service_role",
            null,
            `INSERT INTO public.admin_audit_log(actor_id,target_user_id,action,new_value)
       VALUES($1,$1,'intent_recomputed','business')`,
            [id.claimant],
          ),
        (error) => error.code === "23502" && error.column === "actor_id",
      );
    });
  },
);

test(
  "fatal real profile CHECK outside the audit catch rolls back the earlier old-owner profile/audit cascade",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec(`CREATE FUNCTION public.lab_intent_profile_check_fault() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.id='${id.claimant}' AND NEW.signup_intent='business' THEN
          IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id='${id.previousOwner}' AND signup_intent='buyer')
            OR NOT EXISTS(SELECT 1 FROM public.admin_audit_log WHERE target_user_id='${id.previousOwner}' AND new_value='buyer') THEN
            RAISE EXCEPTION 'Synthetic earlier owner cascade not reached';
          END IF;
          NEW.signup_intent:='synthetic_invalid_intent';
        END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER lab_intent_profile_check_fault BEFORE UPDATE ON public.profiles
        FOR EACH ROW EXECUTE FUNCTION public.lab_intent_profile_check_fault()`);
      await unchangedFailure(
        db,
        () => approve(db),
        hasCode("23514", "profiles_signup_intent_check"),
      );
      assert.equal(await owner(db), id.previousOwner);
      assert.equal((await profile(db, id.previousOwner)).signup_intent, "business");
      assert.equal((await profile(db)).signup_intent, "buyer");
      assert.deepEqual(await audits(db), []);
      await db.exec(
        "DROP TRIGGER lab_intent_profile_check_fault ON public.profiles; DROP FUNCTION public.lab_intent_profile_check_fault()",
      );
      await approve(db);
      assert.equal((await audits(db)).length, 2);
    }, transferOptions);
  },
);

test(
  "later actual claim-audit CHECK failure also rolls back the added owner-intent and admin-audit effects",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec(`CREATE FUNCTION public.lab_intent_late_claim_fault() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.notes='Ownership transfer approved' THEN
          IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id='${id.previousOwner}' AND signup_intent='buyer')
            OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id='${id.claimant}' AND signup_intent='business')
            OR (SELECT count(*) FROM public.admin_audit_log WHERE target_user_id IN('${id.previousOwner}','${id.claimant}'))<>2 THEN
            RAISE EXCEPTION 'Synthetic added owner-intent effects not reached';
          END IF;
          NEW.action:='synthetic_invalid_action';
        END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER lab_intent_late_claim_fault BEFORE INSERT ON public.business_claim_audit
        FOR EACH ROW EXECUTE FUNCTION public.lab_intent_late_claim_fault()`);
      await unchangedFailure(
        db,
        () => approve(db),
        hasCode("23514", "business_claim_audit_action_check"),
      );
      assert.deepEqual(await audits(db), []);
      assert.equal(await owner(db), id.previousOwner);
      assert.equal(await claimStatus(db), "pending");
    }, transferOptions);
  },
);

test(
  "synthetic cancelled profile UPDATE exposes missing row-count confirmation without weakening any constraint",
  options,
  async () => {
    await withFixture(async (db) => {
      const initial = await profile(db);
      await db.exec(`CREATE FUNCTION public.lab_intent_cancel_profile_update() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.id='${id.claimant}' AND NEW.signup_intent='business' THEN RETURN NULL; END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER lab_intent_cancel_profile_update BEFORE UPDATE ON public.profiles
        FOR EACH ROW EXECUTE FUNCTION public.lab_intent_cancel_profile_update()`);
      const before = await snapshot(db);
      await approve(db);
      assert.equal(await owner(db), id.claimant);
      assert.equal(await claimStatus(db), "approved");
      assert.deepEqual(
        await profile(db),
        initial,
        "no stored profile change despite void acknowledgement",
      );
      const rows = await audits(db);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].old_value, "buyer");
      assert.equal(rows[0].new_value, "business");
      assert.equal(rows[0].actor_id, id.claimant);
      await preservedCatalogAndRoles(db, before);
    });
  },
);
