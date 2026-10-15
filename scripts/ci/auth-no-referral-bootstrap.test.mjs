import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  withBootstrap,
  functions,
  selectionPins,
  signatures,
  attachments,
  id,
  planId,
  data,
  snapshot,
  labSequenceState,
  signup,
  attempt,
} from "./fixtures/auth-no-referral-bootstrap-fixture.mjs";
const options = { concurrency: false, timeout: 30_000 };
const sha = (s) => createHash("sha256").update(s).digest("hex");
const root = new URL("../../", import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), "utf8").replaceAll("\r\n", "\n");
const commonTierSql =
  "INSERT INTO public.member_tiers(id,name,min_score,min_tenure_days,color,rank) VALUES('common','Synthetic common tier',0,0,'#000000',0)";
async function one(db, table) {
  return (await data(db))["public." + table][0];
}
test("actual selected 21 functions and fifteen attachments are pinned without helper stubs or migration replay", () => {
  assert.equal(signatures.length, 21);
  assert.equal(attachments.length, 15);
  for (const s of signatures) {
    assert.ok(functions[s].startsWith("CREATE OR REPLACE FUNCTION public."));
    assert.ok(selectionPins[s]);
  }
  assert.match(functions["public.attach_signup_referral()"], /s public.staff_referrals%ROWTYPE/);
  assert.match(
    functions["public.set_internal_staff_manager()"],
    /v_admin uuid := public.canonical_365_admin_id\(\)/,
  );
  assert.match(
    functions["public.recompute_signup_intent(uuid,text,text,text,text,text,text)"],
    /EXCEPTION WHEN OTHERS THEN\s+NULL/,
  );
  assert.equal(
    sha(read("scripts/ci/fixtures/bootstrap-business-structure-fixture.mjs")),
    "69087d87fdd7e0a2076360945b2d9422207ab2c89b606307c8748d0e6b236fec",
  );
  assert.equal(
    sha(read("scripts/ci/fixtures/bootstrap-core-structure-fixture.mjs")),
    "e77f375c58c47ca37e4cf7115823877dea47f9cd8d21aec54073b153eb2a5b62",
  );
  assert.equal(
    sha(read("scripts/ci/fixtures/platform-role-forward-fixture.mjs")),
    "e2843eaf7c185eb52a21c342a482a1adb894f34ec1f4d8288a32db15b64da512",
  );
});
test(
  "full structure with exact current functions/ACLs/headers/attachments has no Auth uid or role/partner success substitutes",
  options,
  async () => {
    await withBootstrap(async (db) => {
      const counts = (
        await db.query(
          "SELECT count(*)::int tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'",
        )
      ).rows[0];
      assert.equal(counts.tables, 11);
      const columns = (
        await db.query(
          "SELECT count(*)::int value FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped",
        )
      ).rows[0].value;
      assert.equal(columns, 219);
      const constraints = (
        await db.query(
          "SELECT count(*)::int value FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND k.contype<>'n'",
        )
      ).rows[0].value;
      assert.equal(constraints, 42);
      const indexes = (
        await db.query(
          "SELECT count(*)::int value FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'",
        )
      ).rows[0].value;
      assert.equal(indexes, 52);
      assert.equal(
        (await db.query("SELECT to_regprocedure('auth.uid()') value")).rows[0].value,
        null,
      );
      for (const table of [
        "user_roles",
        "user_referrals",
        "partner_program_partners",
        "partner_program_applications",
      ])
        assert.equal(
          (await db.query("SELECT to_regclass($1) value", ["public." + table])).rows[0].value,
          null,
        );
      assert.equal(
        (await db.query("SELECT count(*)::int value FROM pg_policy")).rows[0].value,
        0,
        "policies omitted, not actual client-policy proof",
      );
    });
  },
);
test(
  "ordinary no-metadata signup runs profile/org/owner/subscription/intent-audit chain through real triggers",
  options,
  async () => {
    await withBootstrap(async (db) => {
      await signup(db);
      const d = await data(db),
        p = d["public.profiles"][0],
        org = d["public.organizations"][0],
        member = d["public.organization_members"][0],
        s = d["public.subscriptions"][0],
        a = d["public.admin_audit_log"][0];
      assert.equal(d["auth.users"].length, 1);
      assert.equal(d["public.staff_referrals"].length, 0);
      assert.equal(d["public.profiles"].length, 1);
      assert.equal(d["public.organizations"].length, 1);
      assert.equal(d["public.organization_members"].length, 1);
      assert.equal(d["public.subscriptions"].length, 1);
      assert.equal(d["public.admin_audit_log"].length, 1);
      assert.deepEqual(
        [
          p.id,
          p.full_name,
          p.seller_type,
          p.signup_intent,
          p.signup_source,
          p.tier_id,
          p.member_number,
          p.is_founding_member,
          p.founding_member_number,
        ],
        [id(1), "ordinary@example.invalid", "private", "buyer", "direct", "common", 1, true, 1],
      );
      assert.deepEqual(
        [p.is_staff_account, p.parent_org_id, p.manager_user_id, p.intent_evaluated_by],
        [false, null, null, null],
      );
      assert.ok(p.intent_evaluated_at);
      assert.deepEqual(
        [org.name, org.kind, org.created_by],
        ["ordinary@example.invalid", "dealership", id(1)],
      );
      assert.equal(org.slug, "ordinary-example-invalid-100000");
      assert.deepEqual(
        [member.user_id, member.organization_id, member.role],
        [id(1), org.id, "owner"],
      );
      assert.deepEqual(
        [
          s.user_id,
          s.plan_id,
          s.status,
          s.complimentary,
          s.environment,
          s.organization_id,
          s.current_period_end,
          s.stripe_customer_id,
          s.stripe_subscription_id,
        ],
        [id(1), planId, "active", true, "sandbox", null, null, null, null],
      );
      assert.deepEqual(
        [
          a.actor_id,
          a.target_user_id,
          a.action,
          a.field,
          a.old_value,
          a.new_value,
          a.entity_type,
          a.entity_id,
        ],
        [id(1), id(1), "intent_recomputed", "signup_intent", null, "buyer", "profile", id(1)],
      );
      assert.deepEqual(a.metadata, {
        source: "auto",
        trigger: "profile_insert",
        changed_field: "seller_type",
        changed_old: null,
        changed_new: "private",
      });
      assert.deepEqual(
        await labSequenceState(db),
        { value: "1", called: true },
        "default nextval is not double-advanced by BEFORE trigger",
      );
    });
  },
);
test(
  "explicit buyer intent stays unchanged with no fabricated audit/evaluation timestamp",
  options,
  async () => {
    await withBootstrap(async (db) => {
      await signup(db, {
        metadata: {
          signup_intent: "buyer",
          first_name: "Synthetic",
          last_name: "Buyer",
          phone: "09000000000",
          signup_source: "QR",
        },
      });
      const p = await one(db, "profiles");
      assert.deepEqual(
        [p.full_name, p.phone_e164, p.signup_source, p.signup_intent, p.intent_evaluated_at],
        ["Synthetic Buyer", "+639000000000", "qr", "buyer", null],
      );
      assert.equal((await data(db))["public.admin_audit_log"].length, 0);
    });
  },
);
test(
  "business signup metadata does not establish actual business ownership; real derive resets intent",
  options,
  async () => {
    await withBootstrap(async (db) => {
      await signup(db, {
        metadata: {
          full_name: "Synthetic Business",
          signup_intent: "business",
          business_name: "Synthetic Shop",
          business_kind: "repair_shop",
        },
      });
      const p = await one(db, "profiles"),
        d = await data(db);
      assert.deepEqual(
        [p.seller_type, p.business_kind, p.signup_intent],
        ["business", "repair_shop", "buyer"],
      );
      assert.equal(d["public.businesses"].length, 0);
      assert.equal(d["public.organizations"][0].name, "Synthetic Shop");
      assert.equal(
        d["public.organizations"][0].kind,
        "dealership",
        "actual auto-org constant is not repaired here",
      );
      assert.deepEqual(
        [d["public.admin_audit_log"][0].old_value, d["public.admin_audit_log"][0].new_value],
        ["business", "buyer"],
      );
    });
  },
);
test(
  "real derive reads a full constrained synthetic preexisting business, not a permissive owner helper",
  options,
  async () => {
    await withBootstrap(async (db) => {
      // Controlled preexisting state only: all ten business writer attachments remain
      // omitted, so these seed INSERTs are NOT accepted business-creation workflows.
      await db.exec(
        "INSERT INTO public.business_types(slug,label) VALUES('synthetic-type','Synthetic Type')",
      );
      await db.query(
        "INSERT INTO public.businesses(owner_id,slug,name,type_slug) VALUES($1,'synthetic-owned','Synthetic Owned','synthetic-type')",
        [id(1)],
      );
      await signup(db, { metadata: { full_name: "Synthetic Owner", signup_intent: "buyer" } });
      const p = await one(db, "profiles"),
        a = await one(db, "admin_audit_log");
      assert.equal(p.signup_intent, "business");
      assert.deepEqual([a.old_value, a.new_value, a.actor_id], ["buyer", "business", id(1)]);
      assert.equal((await data(db))["public.businesses"].length, 1);
    });
  },
);
test(
  "no Bronze configuration is a real no-op subscription branch, not a hidden entitlement seed",
  options,
  async () => {
    await withBootstrap(
      async (db) => {
        await signup(db);
        const d = await data(db);
        assert.equal(d["public.subscription_plans"].length, 0);
        assert.equal(d["public.subscriptions"].length, 0);
        assert.equal(d["public.profiles"][0].is_founding_member, true);
        assert.equal(d["public.organization_members"].length, 1);
      },
      { bronze: false },
    );
  },
);
test(
  "legacy founding grant ignores inactive Bronze flag; characterized, not adopted billing policy",
  options,
  async () => {
    await withBootstrap(
      async (db) => {
        await signup(db);
        const d = await data(db);
        assert.equal(d["public.subscription_plans"][0].active, false);
        assert.equal(d["public.subscriptions"][0].status, "active");
        assert.equal(d["public.subscriptions"][0].complimentary, true);
      },
      { bronzeActive: false },
    );
  },
);
test(
  "matched trial ANY guard grants no trial for actual repair/insurance/dealership signups without Bronze",
  options,
  async () => {
    await withBootstrap(
      async (db) => {
        await db.query(
          "INSERT INTO public.subscription_plans(id,name,price_php) VALUES($1,'Business Trial',0)",
          [id(901)],
        );
        for (const [index, kind] of ["repair_shop", "insurance", "dealership"].entries()) {
          await signup(db, {
            user: id(index + 1),
            email: "trial" + index + "@example.invalid",
            metadata: {
              full_name: "Synthetic Trial " + index,
              signup_intent: "business",
              business_kind: kind,
            },
          });
        }
        const d = await data(db);
        assert.equal(d["public.profiles"].length, 3);
        assert.equal(d["public.subscriptions"].length, 0);
        assert.ok(
          d["public.profiles"].every(
            (p) => p.business_kind !== null && p.signup_intent === "buyer",
          ),
        );
      },
      { bronze: false },
    );
  },
);
test(
  "missing common tier genuinely aborts signup, restores all row state and burns only disposable sequence allocation",
  options,
  async () => {
    await withBootstrap(
      async (db) => {
        const before = await snapshot(db);
        assert.deepEqual(await labSequenceState(db), { value: "1", called: false });
        await assert.rejects(
          () => attempt(db, () => signup(db)),
          (e) => e.code === "23503",
        );
        assert.equal(await snapshot(db), before);
        assert.deepEqual(
          await labSequenceState(db),
          { value: "1", called: true },
          "sequence advance is NOT rolled back with data",
        );
        await db.exec(commonTierSql);
        await signup(db);
        const p = await one(db, "profiles");
        assert.equal(p.member_number, 2);
        assert.equal(p.founding_member_number, 1);
      },
      { commonTier: false },
    );
  },
);
test(
  "late subscription NOT NULL fault rolls back Auth/profile/org/owner/audit and recovers without weakening constraints",
  options,
  async () => {
    await withBootstrap(async (db) => {
      const before = await snapshot(db);
      // Explicit lab fault: current environment default is sandbox. No constraint or
      // actual function is altered; restoring it below is required before recovery.
      await db.exec("ALTER TABLE public.subscriptions ALTER COLUMN environment SET DEFAULT NULL");
      await assert.rejects(
        () => attempt(db, () => signup(db)),
        (e) => e.code === "23502" && /environment/.test(e.message),
      );
      assert.equal(await snapshot(db), before);
      assert.deepEqual(await labSequenceState(db), { value: "1", called: true });
      await db.exec(
        "ALTER TABLE public.subscriptions ALTER COLUMN environment SET DEFAULT 'sandbox'::text",
      );
      await signup(db);
      const d = await data(db);
      assert.equal(d["public.profiles"][0].member_number, 2);
      assert.equal(d["public.profiles"][0].founding_member_number, 1);
      assert.equal(d["public.admin_audit_log"].length, 1);
      assert.equal(d["public.subscriptions"][0].environment, "sandbox");
    });
  },
);
test(
  "real unique org slug collision is late failure, atomically restores all rows and admits distinct retry",
  options,
  async () => {
    await withBootstrap(async (db) => {
      await db.exec(
        "INSERT INTO public.organizations(name,slug) VALUES('Synthetic Existing','synthetic-collision-100000')",
      );
      const before = await snapshot(db);
      await assert.rejects(
        () => attempt(db, () => signup(db, { metadata: { full_name: "Synthetic Collision" } })),
        (e) => e.code === "23505",
      );
      assert.equal(await snapshot(db), before);
      await signup(db, { metadata: { full_name: "Synthetic Recovered" } });
      const d = await data(db);
      assert.equal(d["public.profiles"][0].member_number, 2);
      assert.equal(d["public.organization_members"].length, 1);
      assert.equal(d["public.organizations"].length, 2);
    });
  },
);
test(
  "malformed metadata staff flag blocks real AFTER trigger and atomically recovers",
  options,
  async () => {
    await withBootstrap(async (db) => {
      const before = await snapshot(db);
      await assert.rejects(
        () => attempt(db, () => signup(db, { metadata: { is_staff_account: "not-a-boolean" } })),
        (e) => e.code === "22P02",
      );
      assert.equal(await snapshot(db), before);
      await signup(db);
      assert.equal((await one(db, "profiles")).member_number, 2);
    });
  },
);
test(
  "unknown signup intent CHECK aborts atomically; invalid business-kind cast instead follows actual NULL fallback",
  options,
  async () => {
    await withBootstrap(async (db) => {
      const before = await snapshot(db);
      await assert.rejects(
        () => attempt(db, () => signup(db, { metadata: { signup_intent: "synthetic_invalid" } })),
        (e) => e.code === "23514",
      );
      assert.equal(await snapshot(db), before);
      await signup(db, {
        metadata: { signup_intent: "business", business_kind: "synthetic_invalid" },
      });
      const p = await one(db, "profiles");
      assert.equal(p.business_kind, null);
      assert.equal(p.member_number, 2);
      assert.equal(p.signup_intent, "buyer");
    });
  },
);
test(
  "ordinary editable staff flag can suppress auto-org but never establishes staff/profile/manager authority here",
  options,
  async () => {
    await withBootstrap(async (db) => {
      await signup(db, {
        metadata: {
          is_staff_account: true,
          manager_user_id: id(777),
          signup_intent: "internal_staff",
        },
      });
      const d = await data(db),
        p = d["public.profiles"][0];
      assert.deepEqual(
        [p.is_staff_account, p.parent_org_id, p.manager_user_id, p.signup_intent],
        [false, null, null, "buyer"],
      );
      assert.equal(d["public.organizations"].length, 0);
      assert.equal(d["public.organization_members"].length, 0);
      assert.equal(d["public.subscriptions"].length, 1);
    });
  },
);
test(
  "actual audit failure swallowing permits signup while audit row is absent, not durable actor/audit proof",
  options,
  async () => {
    await withBootstrap(async (db) => {
      await db.exec("ALTER TABLE public.admin_audit_log ALTER COLUMN id SET DEFAULT NULL");
      await signup(db);
      const d = await data(db);
      assert.equal(d["public.profiles"][0].signup_intent, "buyer");
      assert.equal(d["public.admin_audit_log"].length, 0);
      assert.equal(d["public.subscriptions"].length, 1);
      await db.exec(
        "ALTER TABLE public.admin_audit_log ALTER COLUMN id SET DEFAULT gen_random_uuid()",
      );
    });
  },
);
test(
  "duplicate Auth ID is not idempotent success and leaves all rows/sequence state unchanged",
  options,
  async () => {
    await withBootstrap(async (db) => {
      await signup(db);
      const before = await snapshot(db),
        sequence = await labSequenceState(db);
      await assert.rejects(
        () => attempt(db, () => signup(db)),
        (e) => e.code === "23505",
      );
      assert.equal(await snapshot(db), before);
      assert.deepEqual(await labSequenceState(db), sequence);
    });
  },
);
test(
  "sequential distinct signup allocations are characterized, not concurrent MAX+1 or transactional sequence proof",
  options,
  async () => {
    await withBootstrap(async (db) => {
      await signup(db, {
        user: id(1),
        email: "first@example.invalid",
        metadata: { full_name: "Synthetic First" },
      });
      await signup(db, {
        user: id(2),
        email: "second@example.invalid",
        metadata: { full_name: "Synthetic Second" },
      });
      const d = await data(db),
        profiles = d["public.profiles"].sort((a, b) => a.member_number - b.member_number);
      assert.deepEqual(
        profiles.map((p) => [p.member_number, p.founding_member_number]),
        [
          [1, 1],
          [2, 2],
        ],
      );
      assert.equal(d["public.organization_members"].length, 2);
      assert.equal(d["public.subscriptions"].length, 2);
      assert.equal(d["public.admin_audit_log"].length, 2);
      assert.deepEqual(await labSequenceState(db), { value: "2", called: true });
    });
  },
);
test(
  "ordinary confirmed email retains real nonstaff accreditation early return; no partner table substitute",
  options,
  async () => {
    await withBootstrap(async (db) => {
      await signup(db, { confirmed: "2026-10-15T00:00:00Z" });
      assert.equal((await data(db))["public.staff_referrals"].length, 0);
      assert.equal(
        (await db.query("SELECT to_regclass('public.partner_program_partners') value")).rows[0]
          .value,
        null,
      );
    });
  },
);
test(
  "scope guard rejects nonempty referrals and staff-domain paths before fabricated partial success",
  options,
  async () => {
    await withBootstrap(async (db) => {
      const before = await snapshot(db);
      await assert.rejects(
        () => signup(db, { email: "synthetic@365motorsales.com" }),
        /staff-domain path is outside/,
      );
      await assert.rejects(
        () => signup(db, { metadata: { referral_code: "SYNTHETIC-CODE" } }),
        /nonempty-referral path is outside/,
      );
      assert.equal(await snapshot(db), before);
      assert.deepEqual(await labSequenceState(db), { value: "1", called: false });
    });
  },
);
test(
  "runtime guard rejects weakened constraints before outer rollback can conceal them",
  options,
  async () => {
    await assert.rejects(
      () =>
        withBootstrap((db) =>
          db.exec("ALTER TABLE public.profiles DROP CONSTRAINT profiles_tier_id_fkey"),
        ),
      /runtime critical constraints unchanged/,
    );
    await assert.rejects(
      () =>
        withBootstrap((db) =>
          db.exec("ALTER TABLE public.subscriptions ALTER COLUMN environment SET DEFAULT NULL"),
        ),
      /runtime columns unchanged/,
    );
  },
);
test(
  "legacy ON CONFLICT suppression can omit a second founding entitlement under an explicit lab ID collision",
  options,
  async () => {
    await withBootstrap(async (db) => {
      await signup(db, { metadata: { full_name: "Synthetic First" } });
      const first = await one(db, "subscriptions");
      // Lab default fault only, not an observed random UUID collision in production.
      assert.match(first.id, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
      await db.exec(
        "ALTER TABLE public.subscriptions ALTER COLUMN id SET DEFAULT '" + first.id + "'::uuid",
      );
      await signup(db, {
        user: id(2),
        email: "second@example.invalid",
        metadata: { full_name: "Synthetic Second" },
      });
      const d = await data(db);
      assert.equal(d["auth.users"].length, 2);
      assert.equal(d["public.profiles"].length, 2);
      assert.equal(d["public.subscriptions"].length, 1);
      assert.equal(d["public.subscriptions"][0].user_id, id(1));
      assert.equal(d["public.organization_members"].length, 2);
      assert.equal(d["public.admin_audit_log"].length, 2);
      await db.exec(
        "ALTER TABLE public.subscriptions ALTER COLUMN id SET DEFAULT gen_random_uuid()",
      );
    });
  },
);
