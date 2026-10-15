// Actual staff-domain Auth prerequisites on immutable full PR62 structures.
// NO role/staff writer provisioning or provider API/JWT/native authority proof.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  withReferrals,
  assertStructure,
  signup,
  snapshot,
  data,
  attempt,
  id,
  labSequenceState,
} from "./fixtures/auth-referral-intent-bootstrap-fixture.mjs";
const root = new URL("../../", import.meta.url),
  options = { concurrency: false, timeout: 30_000 };
const canonicalId = async (db) =>
  (await db.query("SELECT public.canonical_365_admin_id() value")).rows[0].value;
const rows = async (db, t) =>
  (await db.query("SELECT * FROM public." + t + " t ORDER BY to_jsonb(t)::text")).rows;
const profile = async (db, user = id(1)) =>
  (await db.query("SELECT * FROM public.profiles WHERE id=$1", [user])).rows[0];
async function staffSignup(
  db,
  { user = id(1), email = "synthetic@365motorsales.com", metadata = {}, confirmed = null } = {},
) {
  // Deliberate direct SQL reaches the actual branch; not the old fixture's
  // nonstaff helper guard. This db is always discarded by withReferrals.
  return db.query(
    "INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES($1,$2,$3,$4) RETURNING id",
    [user, email, JSON.stringify(metadata), confirmed],
  );
}
async function manager(db, user) {
  const chosen = user ?? (await canonicalId(db));
  await signup(db, {
    user: chosen,
    email: "manager-" + chosen.slice(-4) + "@example.invalid",
    metadata: { signup_intent: "buyer" },
  });
  return chosen;
}
async function configuredOrg(db, user) {
  const org = (await db.query("SELECT id FROM public.organizations WHERE created_by=$1", [user]))
    .rows[0];
  assert.ok(org);
  await db.query(
    "INSERT INTO public.internal_org_settings(key,org_id) VALUES('canonical_365',$1)",
    [org.id],
  );
  return org.id;
}
async function unchangedFailure(db, run, code, constraint) {
  const before = await snapshot(db);
  await assert.rejects(
    () => attempt(db, run),
    (e) => e.code === code && (!constraint || e.constraint === constraint),
  );
  assert.equal(
    await snapshot(db),
    before,
    "all eighteen full public tables and Auth rows unchanged",
  );
  await assertStructure(db);
}
test("full PR62 fixture/test pins remain unchanged; this is prerequisite characterization, not provisioning acceptance", () => {
  for (const [p, hash] of [
    [
      "scripts/ci/fixtures/auth-referral-intent-bootstrap-fixture.mjs",
      "08c4a71a4e97d2f22ebd2a191eaa8ac322d71afae997ac1f0bfe17027ce7e12f",
    ],
    [
      "scripts/ci/auth-referral-intent-bootstrap.test.mjs",
      "4a8ef753c1aded123ab0f0ef0082cfb6c23ded7c39b0b18e2ba067329957688e",
    ],
  ]) {
    const raw = fs.readFileSync(new URL(p, root), "utf8").replaceAll("\r\n", "\n");
    assert.equal(createHash("sha256").update(raw).digest("hex"), hash);
  }
});
test(
  "actual unconfirmed/confirmed staff Auth INSERT fails genuine manager FK when static manager row is missing",
  options,
  async () => {
    for (const confirmed of [null, "2026-01-01"]) {
      await withReferrals(async (db) => {
        const before = await labSequenceState(db);
        await unchangedFailure(
          db,
          () => staffSignup(db, { confirmed }),
          "23503",
          "profiles_manager_user_id_fkey",
        );
        const after = await labSequenceState(db);
        assert.equal(after.value, String(BigInt(before.value)));
        assert.equal(
          after.called,
          true,
          "sequence value 1 is consumed even though all rows roll back",
        );
      });
    }
  },
);
test(
  "existing canonical UUID manager permits actual unconfirmed staff signup but defaults to private/buyer/founding Bronze",
  options,
  async () => {
    await withReferrals(async (db) => {
      const owner = await manager(db);
      await staffSignup(db);
      const p = await profile(db);
      assert.equal(p.is_staff_account, true);
      assert.equal(p.manager_user_id, owner);
      assert.equal(p.parent_org_id, null);
      assert.equal(p.seller_type, "private");
      assert.equal(p.signup_intent, "buyer");
      assert.equal(p.is_founding_member, true);
      assert.equal(p.member_number, 2);
      const s = (await db.query("SELECT * FROM public.subscriptions WHERE user_id=$1", [id(1)]))
        .rows[0];
      assert.equal(s.complimentary, true);
      assert.equal(s.environment, "sandbox");
      assert.equal(s.status, "active");
      assert.equal(
        (await rows(db, "organizations")).filter((o) => o.created_by === id(1)).length,
        0,
      );
      const target = (
        await db.query("SELECT email_confirmed_at FROM auth.users WHERE id=$1", [id(1)])
      ).rows[0];
      assert.equal(
        target.email_confirmed_at,
        null,
        "staff profile flag is not confirmation-gated in this source",
      );
    });
  },
);
test(
  "confirmed staff Auth without preexisting active staff referral does not provision roles/referrals/partner state",
  options,
  async () => {
    await withReferrals(async (db) => {
      await manager(db);
      await staffSignup(db, { confirmed: "2026-01-01" });
      for (const t of [
        "user_roles",
        "staff_referrals",
        "partner_program_applications",
        "partner_program_partners",
        "sales_rep_assignments",
      ])
        assert.equal((await rows(db, t)).length, 0);
      assert.equal((await profile(db)).is_staff_account, true);
    });
  },
);
test(
  "genuine configured canonical-org FK adds member linkage, not native shop-role or manager authority",
  options,
  async () => {
    await withReferrals(async (db) => {
      const owner = await manager(db),
        org = await configuredOrg(db, owner);
      await staffSignup(db, {
        metadata: { signup_intent: "business", business_name: "Synthetic Ignored Business" },
      });
      const p = await profile(db);
      assert.equal(p.parent_org_id, org);
      assert.equal(p.manager_user_id, owner);
      assert.equal(p.business_name, null);
      assert.equal(p.signup_intent, "buyer");
      assert.equal(p.seller_type, "private");
      const [m] = (
        await db.query("SELECT * FROM public.organization_members WHERE user_id=$1", [id(1)])
      ).rows;
      assert.equal(m.organization_id, org);
      assert.equal(m.role, "member");
      assert.equal(
        (await rows(db, "organizations")).length,
        1,
        "configured lab org is existing, not staff-created",
      );
    });
  },
);
test(
  "existing ordinary UUID supplied as manager metadata overrides static manager without any admin/staff role proof",
  options,
  async () => {
    await withReferrals(async (db) => {
      const chosen = await manager(db, id(502));
      assert.equal(chosen === (await canonicalId(db)), false);
      await staffSignup(db, { metadata: { manager_user_id: chosen } });
      assert.equal((await profile(db)).manager_user_id, chosen);
      assert.equal(
        (await rows(db, "user_roles")).length,
        0,
        "FK existence is not verified role or human authority",
      );
    });
  },
);
test("malformed manager metadata falls back to static manager if present", options, async () => {
  await withReferrals(async (db) => {
    const owner = await manager(db);
    await staffSignup(db, { metadata: { manager_user_id: "synthetic-invalid-uuid" } });
    assert.equal((await profile(db)).manager_user_id, owner);
  });
});
test(
  "valid missing metadata manager fails FK despite real fallback row; corrected metadata recovers with sequence gap",
  options,
  async () => {
    await withReferrals(async (db) => {
      const owner = await manager(db),
        before = await labSequenceState(db);
      await unchangedFailure(
        db,
        () => staffSignup(db, { metadata: { manager_user_id: id(999) } }),
        "23503",
        "profiles_manager_user_id_fkey",
      );
      assert.equal((await labSequenceState(db)).value, String(BigInt(before.value) + 1n));
      await staffSignup(db, { metadata: { manager_user_id: owner } });
      assert.equal((await profile(db)).member_number, 3);
      assert.equal((await profile(db)).founding_member_number, 2);
    });
  },
);
test(
  "static canonical UUID self-case bypasses manager fallback but does not create a platform admin role",
  options,
  async () => {
    await withReferrals(async (db) => {
      const user = await canonicalId(db);
      await staffSignup(db, { user });
      const p = await profile(db, user);
      assert.equal(p.is_staff_account, true);
      assert.equal(p.manager_user_id, null);
      assert.equal(p.parent_org_id, null);
      assert.equal((await rows(db, "user_roles")).length, 0);
    });
  },
);
test(
  "canonical configuration cannot reference a missing org; metadata remains synthetic existing input",
  options,
  async () => {
    await withReferrals(async (db) => {
      await manager(db);
      await unchangedFailure(
        db,
        () =>
          db.query(
            "INSERT INTO public.internal_org_settings(key,org_id) VALUES('canonical_365',$1)",
            [id(999)],
          ),
        "23503",
      );
      assert.equal((await rows(db, "internal_org_settings")).length, 0);
    });
  },
);
test(
  "late staff subscription NOT NULL fault restores complete rows including configured-org inputs, then original default recovers",
  options,
  async () => {
    await withReferrals(async (db) => {
      const owner = await manager(db);
      await configuredOrg(db, owner);
      const before = await snapshot(db),
        sequence = await labSequenceState(db);
      await db.exec("ALTER TABLE public.subscriptions ALTER COLUMN environment SET DEFAULT NULL");
      try {
        await assert.rejects(
          () => attempt(db, () => staffSignup(db)),
          (e) => e.code === "23502" && e.table === "subscriptions",
        );
        assert.equal(await snapshot(db), before);
        assert.equal((await labSequenceState(db)).value, String(BigInt(sequence.value) + 1n));
      } finally {
        await db.exec(
          "ALTER TABLE public.subscriptions ALTER COLUMN environment SET DEFAULT 'sandbox'",
        );
      }
      await assertStructure(db);
      await staffSignup(db);
      assert.equal((await profile(db)).member_number, 3);
      assert.equal((await profile(db)).founding_member_number, 2);
    });
  },
);
test(
  "genuine missing-manager failure can recover after actual ordinary manager creation without stripping the FK",
  options,
  async () => {
    await withReferrals(async (db) => {
      await unchangedFailure(db, () => staffSignup(db), "23503", "profiles_manager_user_id_fkey");
      await manager(db);
      await staffSignup(db);
      assert.equal((await profile(db)).member_number, 3);
      assert.equal((await profile(db)).founding_member_number, 2);
    });
  },
);
test(
  "actual current staff Auth branch still excludes role/staff audit writers; no absent dependency is stubbed or called complete",
  options,
  async () => {
    await withReferrals(async (db) => {
      await manager(db);
      await staffSignup(db);
      const d = await data(db);
      assert.equal(d["public.staff_referrals"].length, 0);
      for (const t of ["staff_referral_audit", "sales_rep_profiles", "sales_rep_territories"])
        assert.equal(
          (await db.query("SELECT to_regclass($1) value", ["public." + t])).rows[0].value,
          null,
        );
      assert.equal(
        (await db.query("SELECT to_regprocedure('auth.uid()') value")).rows[0].value,
        null,
      );
    });
  },
);
