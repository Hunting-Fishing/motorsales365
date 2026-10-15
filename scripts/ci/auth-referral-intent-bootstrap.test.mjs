// Full-schema disposable nonstaff Auth referral/partner intent characterization.
// Not provider API/JWT, staff provisioning, trusted actor, money policy or release.
import test from "node:test";
import assert from "node:assert/strict";
import {
  withReferrals,
  assertStructure,
  data,
  snapshot,
  attempt,
  signup,
  seedReferrer,
  id,
  planId,
  labSequenceState,
  pins,
  functions,
  signatures,
  attachments,
  expectedAttachments,
  tables,
} from "./fixtures/auth-referral-intent-bootstrap-fixture.mjs";
const options = { concurrency: false, timeout: 30_000 };
const get = async (db, table, user = id(1)) =>
  (
    await db.query(
      "SELECT * FROM public." +
        table +
        " WHERE " +
        (table === "profiles" ? "id" : "user_id") +
        "=$1",
      [user],
    )
  ).rows;
const rows = async (db, table) =>
  (await db.query("SELECT * FROM public." + table + " t ORDER BY to_jsonb(t)::text")).rows;
const targetSignup = (db, extra = {}) =>
  signup(db, { metadata: { referral_code: "synthetic-referral" }, ...extra });
const codeError = (code) => (e) => e.code === code;
async function unchangedFailure(db, run, code) {
  const before = await snapshot(db);
  await assert.rejects(() => attempt(db, run), codeError(code));
  assert.equal(
    await snapshot(db),
    before,
    "all eighteen full public tables and synthetic Auth rows restored",
  );
  await assertStructure(db);
}
async function targetAudit(db) {
  return (
    await db.query(
      "SELECT * FROM public.admin_audit_log WHERE target_user_id=$1 ORDER BY created_at,id",
      [id(1)],
    )
  ).rows;
}
test("immutable full-bootstrap/referral proofs are reused without source substitution or old projected Auth success", () => {
  assert.equal(Object.keys(pins).length, 5);
  assert.equal(Object.keys(functions).length, 5);
  assert.equal(signatures.length, 26);
  assert.equal(tables.length, 18);
  assert.equal(attachments.length, 7);
  assert.equal(expectedAttachments.length, 22);
  assert.ok(!signatures.includes("public.has_role(uuid,public.app_role)"));
  assert.ok(!signatures.includes("public.pp_recompute_payout_total(uuid)"));
  assert.ok(
    !expectedAttachments.some((t) =>
      ["public.staff_referrals", "public.user_roles", "public.businesses"].includes(t.table),
    ),
  );
  assert.match(
    functions["public.trg_partners_recompute_intent()"],
    /PERFORM public.recompute_signup_intent/,
  );
});
test(
  "full eighteen-table composition retains 322 columns, 72 critical constraints, 74 indexes and no Auth uid/policy shim",
  options,
  async () => {
    await withReferrals(async (db) => {
      const c = (
        await db.query(
          "SELECT (SELECT count(*)::int FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped) columns,(SELECT count(*)::int FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND k.contype<>'n') constraints,(SELECT count(*)::int FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') indexes",
        )
      ).rows[0];
      assert.deepEqual(c, { columns: 322, constraints: 72, indexes: 74 });
      assert.equal((await db.query("SELECT count(*)::int n FROM pg_enum")).rows[0].n > 0, true);
      assert.equal(
        (await db.query("SELECT to_regprocedure('auth.uid()') value")).rows[0].value,
        null,
      );
      assert.equal((await db.query("SELECT count(*)::int n FROM pg_policy")).rows[0].n, 0);
    });
  },
);
test(
  "one real Auth INSERT composes complete profile/org/owner/Bronze/intent/referral/bounty/assignment",
  options,
  async () => {
    await withReferrals(async (db) => {
      const seed = await seedReferrer(db);
      await targetSignup(db);
      const [p] = await get(db, "profiles"),
        [r] = await get(db, "user_referrals"),
        [s] = await get(db, "subscriptions"),
        d = await data(db);
      assert.equal(p.member_number, 2);
      assert.equal(p.founding_member_number, 2);
      assert.equal(p.tier_id, "common");
      assert.equal(p.seller_type, "private");
      assert.equal(p.signup_source, "link");
      assert.equal(p.signup_intent, "buyer");
      assert.equal(p.is_staff_account, false);
      assert.equal(p.parent_org_id, null);
      const org = d["public.organizations"].find((o) => o.created_by === id(1));
      assert.ok(org);
      assert.equal(d["public.organization_members"].find((m) => m.user_id === id(1)).role, "owner");
      assert.equal(
        d["public.organization_members"].find((m) => m.user_id === id(1)).organization_id,
        org.id,
      );
      assert.equal(s.plan_id, planId);
      assert.equal(s.environment, "sandbox");
      assert.equal(s.status, "active");
      assert.equal(s.complimentary, true);
      assert.equal(s.stripe_subscription_id, null);
      assert.equal(r.referred_by_staff_id, seed.staff.id);
      assert.equal(r.first_referral_code, seed.code);
      assert.equal(r.credited_referral_code, seed.code);
      const [e] = d["public.partner_program_commission_events"],
        [a] = d["public.sales_rep_assignments"];
      assert.equal(e.partner_id, seed.partner.id);
      assert.equal(e.commission_php, 2);
      assert.equal(e.status, "pending");
      assert.equal(e.source_ref, "signup:" + id(1));
      assert.equal(a.rep_user_id, seed.user);
      assert.equal(a.subject_id, id(1));
      assert.equal(d["public.partner_program_payouts"].length, 0);
      const [audit] = await targetAudit(db);
      assert.equal(audit.actor_id, id(1));
      assert.equal(audit.new_value, "buyer");
    });
  },
);
test(
  "explicit buyer avoids synthetic audit success; editable org suppression leaves actual referral fanouts intact",
  options,
  async () => {
    await withReferrals(async (db) => {
      await seedReferrer(db);
      await signup(db, {
        metadata: {
          signup_intent: "buyer",
          referral_code: "synthetic-referral",
          is_staff_account: true,
        },
      });
      const [p] = await get(db, "profiles");
      assert.equal(p.is_staff_account, false);
      assert.equal(p.signup_intent, "buyer");
      assert.equal(
        (await rows(db, "organizations")).filter((o) => o.created_by === id(1)).length,
        0,
      );
      assert.equal((await get(db, "user_referrals")).length, 1);
      assert.equal((await rows(db, "partner_program_commission_events")).length, 1);
      assert.equal((await rows(db, "sales_rep_assignments")).length, 1);
      assert.equal((await targetAudit(db)).length, 0);
    });
  },
);
test(
  "metadata source labels remain separate from real attribution; qr/direct overrides do not stop referral credit",
  options,
  async () => {
    for (const source of ["qr", "direct", "unknown"]) {
      await withReferrals(async (db) => {
        await seedReferrer(db);
        await signup(db, {
          metadata: {
            signup_intent: "buyer",
            referral_code: "synthetic-referral",
            signup_source: source,
          },
        });
        assert.equal(
          (await get(db, "profiles"))[0].signup_source,
          source === "unknown" ? "link" : source,
        );
        assert.equal((await get(db, "user_referrals")).length, 1);
        assert.equal((await rows(db, "partner_program_commission_events")).length, 1);
      });
    }
  },
);
test(
  "unknown, case-variant and padded referral metadata do not match exact active staff lookup, despite link profile label",
  options,
  async () => {
    for (const code of ["unknown", "SYNTHETIC-REFERRAL", " synthetic-referral "]) {
      await withReferrals(async (db) => {
        await seedReferrer(db);
        await signup(db, { metadata: { referral_code: code } });
        assert.equal((await get(db, "profiles"))[0].signup_source, "link");
        for (const t of [
          "user_referrals",
          "partner_program_commission_events",
          "sales_rep_assignments",
        ])
          assert.equal((await rows(db, t)).length, 0);
      });
    }
  },
);
test(
  "inactive/missing accredited partner still stores staff referral and assigns sales, without monetary credit",
  options,
  async () => {
    for (const seedOptions of [{ partnerActive: false }, { withPartner: false }]) {
      await withReferrals(async (db) => {
        const seed = await seedReferrer(db, seedOptions);
        await targetSignup(db);
        const [r] = await get(db, "user_referrals");
        assert.equal(r.referred_by_staff_id, seed.staff.id);
        assert.equal(r.first_referral_code, seed.code);
        assert.equal(r.credited_referral_code, null);
        assert.equal((await rows(db, "partner_program_commission_events")).length, 0);
        assert.equal((await rows(db, "sales_rep_assignments")).length, 1);
      });
    }
  },
);
test(
  "inactive staff prevents attachment; sales-junior alone permits bounty but not assignment",
  options,
  async () => {
    await withReferrals(async (db) => {
      await seedReferrer(db, { staffActive: false });
      await targetSignup(db);
      assert.equal((await get(db, "user_referrals")).length, 0);
      assert.equal((await rows(db, "partner_program_commission_events")).length, 0);
    });
    await withReferrals(async (db) => {
      await seedReferrer(db, { role: "sales_junior" });
      await targetSignup(db);
      assert.equal((await get(db, "user_referrals")).length, 1);
      assert.equal((await rows(db, "partner_program_commission_events")).length, 1);
      assert.equal((await rows(db, "sales_rep_assignments")).length, 0);
    });
  },
);
test(
  "credit gate does not bind accredited partner user to staff owner; NULL partner user can receive ledger credit",
  options,
  async () => {
    await withReferrals(async (db) => {
      const seed = await seedReferrer(db, { partnerUser: null });
      await targetSignup(db);
      assert.equal(seed.partner.user_id, null);
      assert.equal(
        (await rows(db, "partner_program_commission_events"))[0].partner_id,
        seed.partner.id,
      );
      assert.equal((await rows(db, "sales_rep_assignments"))[0].rep_user_id, seed.user);
    });
  },
);
test(
  "nonstaff confirmation and later Auth metadata changes do not reattach or recredit an existing profile",
  options,
  async () => {
    await withReferrals(async (db) => {
      await seedReferrer(db);
      await signup(db, { metadata: { signup_intent: "buyer" } });
      await attempt(db, () =>
        db.query(
          "UPDATE auth.users SET raw_user_meta_data=$1,email_confirmed_at=now() WHERE id=$2",
          [JSON.stringify({ referral_code: "synthetic-referral" }), id(1)],
        ),
      );
      assert.equal((await get(db, "profiles"))[0].signup_source, "direct");
      for (const t of [
        "user_referrals",
        "partner_program_commission_events",
        "sales_rep_assignments",
      ])
        assert.equal((await rows(db, t)).length, 0);
    });
    await withReferrals(async (db) => {
      await seedReferrer(db);
      await targetSignup(db, { confirmed: "2026-01-01" });
      const before = await data(db);
      await attempt(db, () =>
        db.query("UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1", [id(1)]),
      );
      const after = await data(db);
      delete before["auth.users"];
      delete after["auth.users"];
      assert.deepEqual(after, before);
    });
  },
);
test(
  "duplicate Auth ID fails atomically without extra allocation, not a claimed idempotent signup API",
  options,
  async () => {
    await withReferrals(async (db) => {
      await seedReferrer(db);
      await targetSignup(db);
      const before = await labSequenceState(db);
      await unchangedFailure(db, () => targetSignup(db), "23505");
      assert.deepEqual(await labSequenceState(db), before);
    });
  },
);
test(
  "real partner active UPDATE reaches full intent helper/profile/audit with target-as-actor and referral-code-labelled metadata",
  options,
  async () => {
    await withReferrals(async (db) => {
      const seed = await seedReferrer(db);
      await targetSignup(db, { metadata: { signup_intent: "buyer", referral_code: seed.code } });
      await db.query("UPDATE public.profiles SET signup_intent='business' WHERE id=$1", [id(1)]);
      await attempt(db, () =>
        db.query("UPDATE public.partner_program_partners SET active=false WHERE id=$1", [
          seed.partner.id,
        ]),
      );
      assert.equal((await get(db, "profiles"))[0].signup_intent, "buyer");
      const [a] = await targetAudit(db);
      assert.equal(a.actor_id, id(1));
      assert.equal(a.target_user_id, id(1));
      assert.equal(a.old_value, "business");
      assert.equal(a.new_value, "buyer");
      assert.equal(a.entity_type, "partner_program_partner");
      assert.equal(a.entity_id, seed.partner.id);
      assert.deepEqual(a.metadata, {
        source: "auto",
        trigger: "partner_updated",
        changed_field: "referral_code",
        changed_old: seed.code,
        changed_new: seed.code,
      });
      assert.equal((await get(db, "user_referrals"))[0].credited_referral_code, seed.code);
      assert.equal((await rows(db, "partner_program_commission_events")).length, 1);
      assert.equal((await rows(db, "sales_rep_assignments"))[0].active, true);
    });
  },
);
test(
  "partner rename only scans new code, leaving old-code intent stale and existing referral/ledger unchanged",
  options,
  async () => {
    await withReferrals(async (db) => {
      const seed = await seedReferrer(db);
      await targetSignup(db, { metadata: { signup_intent: "buyer", referral_code: seed.code } });
      await db.query("UPDATE public.profiles SET signup_intent='business' WHERE id=$1", [id(1)]);
      await attempt(db, () =>
        db.query(
          "UPDATE public.partner_program_partners SET referral_code='synthetic-renamed' WHERE id=$1",
          [seed.partner.id],
        ),
      );
      assert.equal((await get(db, "profiles"))[0].signup_intent, "business");
      assert.equal(
        (await db.query("SELECT public.derive_signup_intent($1) value", [id(1)])).rows[0].value,
        "buyer",
      );
      assert.equal((await targetAudit(db)).length, 0);
      assert.equal((await get(db, "user_referrals"))[0].credited_referral_code, seed.code);
      assert.equal((await rows(db, "partner_program_commission_events")).length, 1);
    });
  },
);
test(
  "deleting lab partner reaches real nonempty intent callback but cascades ledger rows and leaves assignment/referral",
  options,
  async () => {
    await withReferrals(async (db) => {
      const seed = await seedReferrer(db);
      await targetSignup(db, { metadata: { signup_intent: "buyer", referral_code: seed.code } });
      await db.query("UPDATE public.profiles SET signup_intent='business' WHERE id=$1", [id(1)]);
      await attempt(db, () =>
        db.query("DELETE FROM public.partner_program_partners WHERE id=$1", [seed.partner.id]),
      );
      assert.equal((await get(db, "profiles"))[0].signup_intent, "buyer");
      assert.equal((await targetAudit(db))[0].metadata.trigger, "partner_removed");
      assert.equal((await rows(db, "partner_program_commission_events")).length, 0);
      assert.equal((await get(db, "user_referrals")).length, 1);
      assert.equal((await rows(db, "sales_rep_assignments")).length, 1);
    });
  },
);
test(
  "late numeric bounty failure rolls back entire Auth/profile/org/subscription/referral chain; local sequence gap survives recovery",
  options,
  async () => {
    await withReferrals(async (db) => {
      const seed = await seedReferrer(db, { signupBounty: "10000000000" }),
        before = await labSequenceState(db);
      await unchangedFailure(db, () => targetSignup(db), "22003");
      assert.equal((await labSequenceState(db)).value, String(BigInt(before.value) + 1n));
      assert.equal((await get(db, "profiles")).length, 0);
      await db.query("UPDATE public.partner_program_partners SET signup_bounty_php=2 WHERE id=$1", [
        seed.partner.id,
      ]);
      await targetSignup(db);
      const [p] = await get(db, "profiles");
      assert.equal(p.member_number, 3);
      assert.equal(p.founding_member_number, 2);
      assert.equal((await get(db, "subscriptions")).length, 1);
      assert.equal((await get(db, "user_referrals")).length, 1);
      assert.equal((await rows(db, "partner_program_commission_events")).length, 1);
    });
  },
);
test(
  "later assignment NOT NULL fault restores complete row snapshots after bounty write; genuine original default recovers",
  options,
  async () => {
    await withReferrals(async (db) => {
      await seedReferrer(db);
      const before = await snapshot(db),
        sequence = await labSequenceState(db);
      await db.exec("ALTER TABLE public.sales_rep_assignments ALTER COLUMN id SET DEFAULT NULL");
      try {
        await assert.rejects(
          () => attempt(db, () => targetSignup(db)),
          (e) => e.code === "23502" && e.table === "sales_rep_assignments",
        );
        assert.equal(await snapshot(db), before);
        assert.equal((await labSequenceState(db)).value, String(BigInt(sequence.value) + 1n));
      } finally {
        await db.exec(
          "ALTER TABLE public.sales_rep_assignments ALTER COLUMN id SET DEFAULT gen_random_uuid()",
        );
      }
      await assertStructure(db);
      await targetSignup(db);
      assert.equal((await get(db, "profiles"))[0].member_number, 3);
      assert.equal((await rows(db, "partner_program_commission_events")).length, 1);
      assert.equal((await rows(db, "sales_rep_assignments")).length, 1);
    });
  },
);
test(
  "partner intent audit insert failure is swallowed in actual full chain, not promoted to complete attribution",
  options,
  async () => {
    await withReferrals(async (db) => {
      const seed = await seedReferrer(db);
      await targetSignup(db, { metadata: { signup_intent: "buyer", referral_code: seed.code } });
      await db.query("UPDATE public.profiles SET signup_intent='business' WHERE id=$1", [id(1)]);
      await db.exec("ALTER TABLE public.admin_audit_log ALTER COLUMN id SET DEFAULT NULL");
      try {
        await attempt(db, () =>
          db.query("UPDATE public.partner_program_partners SET active=false WHERE id=$1", [
            seed.partner.id,
          ]),
        );
        assert.equal((await get(db, "profiles"))[0].signup_intent, "buyer");
        assert.equal((await targetAudit(db)).length, 0);
      } finally {
        await db.exec(
          "ALTER TABLE public.admin_audit_log ALTER COLUMN id SET DEFAULT gen_random_uuid()",
        );
      }
    });
  },
);
test(
  "actual credit source partial index suppresses same-code updates; recredit still awards another partner in full account context",
  options,
  async () => {
    await withReferrals(async (db) => {
      await seedReferrer(db);
      await targetSignup(db);
      await attempt(db, () =>
        db.query(
          "UPDATE public.user_referrals SET credited_referral_code=credited_referral_code WHERE user_id=$1",
          [id(1)],
        ),
      );
      assert.equal((await rows(db, "partner_program_commission_events")).length, 1);
      await db.query(
        "INSERT INTO public.partner_program_partners(referral_code,display_name) VALUES('synthetic-second','Synthetic Second Partner')",
      );
      await attempt(db, () =>
        db.query(
          "UPDATE public.user_referrals SET credited_referral_code='synthetic-second' WHERE user_id=$1",
          [id(1)],
        ),
      );
      assert.equal((await rows(db, "partner_program_commission_events")).length, 2);
      assert.equal((await rows(db, "sales_rep_assignments")).length, 1);
    });
  },
);
test(
  "full scope refuses staff-domain success and accepts no provider/role/function substitution",
  options,
  async () => {
    await withReferrals(async (db) => {
      const before = await snapshot(db);
      await assert.rejects(
        () => signup(db, { email: "synthetic@365motorsales.com" }),
        /separate frontier/,
      );
      assert.equal(await snapshot(db), before);
    });
  },
);
test(
  "postflight rejects full-profile/Auth/FK/sequence/attachment/helper/policy drift before savepoint rollback hides it",
  options,
  async () => {
    for (const [sql, pattern] of [
      [
        "ALTER TABLE public.profiles ALTER COLUMN phone_e164 TYPE varchar(60)",
        /full bootstrap columns/,
      ],
      [
        "ALTER TABLE auth.users ADD COLUMN synthetic_unauthorized text",
        /four observed synthetic provider field definitions/,
      ],
      [
        "ALTER TABLE public.user_referrals DROP CONSTRAINT user_referrals_user_id_fkey",
        /critical constraints/,
      ],
      [
        "ALTER TABLE public.partner_program_commission_events DROP CONSTRAINT partner_program_commission_events_payout_id_fkey",
        /12 critical financial constraints/,
      ],
      [
        "ALTER SEQUENCE public.profiles_member_number_seq CACHE 2",
        /exact member sequence configuration/,
      ],
      [
        "DROP TRIGGER partners_recompute_intent ON public.partner_program_partners",
        /22 actual selected attachments/,
      ],
      [
        "GRANT EXECUTE ON FUNCTION public.pp_award_bounty(text,text,text) TO authenticated",
        /five exact new function envelopes/,
      ],
      [
        "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT NULL::uuid$$",
        /no provider Auth uid\/JWT shim/,
      ],
      [
        "CREATE POLICY synthetic_allow ON public.user_referrals USING(true)",
        /no legacy client-authority adoption/,
      ],
    ])
      await assert.rejects(() => withReferrals((db) => db.exec(sql)), pattern);
  },
);
