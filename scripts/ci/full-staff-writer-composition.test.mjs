// Characterization of retained writers, not an adopted provisioning policy.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  withStaff,
  functions,
  signatures,
  attachments,
  tables,
  pins,
  data,
  snapshot,
  asSettings,
  staffSignup,
  managerAndOrg,
  signup,
  attempt,
  id,
  labSequenceState,
} from "./fixtures/full-staff-writer-fixture.mjs";
const options = { concurrency: false, timeout: 30_000 };
const rows = async (db, t) =>
  (await db.query("SELECT * FROM public." + t + " t ORDER BY to_jsonb(t)::text")).rows;
const profile = async (db, user = id(1)) =>
  (await db.query("SELECT * FROM public.profiles WHERE id=$1", [user])).rows[0];
const role = (db, user = id(1), name = "sales") =>
  db.query("INSERT INTO public.user_roles(user_id,role) VALUES($1,$2::public.app_role)", [
    user,
    name,
  ]);
async function staff(db, overrides = {}) {
  await managerAndOrg(db);
  await staffSignup(db, {
    metadata: { full_name: "Synthetic Staff", signup_region: " NCR ", signup_city: " Makati " },
    ...overrides,
  });
}
async function provision(db) {
  await staff(db);
  await role(db);
  return (await rows(db, "staff_referrals"))[0];
}
async function consumer(db, code, user = id(2)) {
  return signup(db, {
    user,
    email: "consumer-" + user.slice(-4) + "@example.invalid",
    metadata: { signup_intent: "buyer", referral_code: code },
  });
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
    "all 21 public tables and four-field Auth rows restored",
  );
}

test("immutable source/fixture/test pins and complete writer composition counts", () => {
  const root = new URL("../../", import.meta.url);
  for (const [p, h] of Object.entries(pins)) {
    const text = fs.readFileSync(new URL(p, root), "utf8").replaceAll("\r\n", "\n");
    assert.equal(createHash("sha256").update(text).digest("hex"), h, p);
  }
  assert.deepEqual(
    [tables.length, signatures.length, Object.keys(functions).length, attachments.length],
    [21, 37, 11, 8],
  );
});

test(
  "all full table columns/critical constraints/indexes and actual provider uid pass pre/post guards",
  options,
  async () => {
    await withStaff(async (db, guard) => {
      const actual = (
        await db.query(
          "SELECT (SELECT count(*)::int FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped) columns,(SELECT count(*)::int FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND k.contype<>'n') constraints,(SELECT count(*)::int FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') indexes",
        )
      ).rows[0];
      assert.deepEqual(actual, { columns: 347, constraints: 78, indexes: 81 });
      assert.equal(Object.keys(await data(db)).length, 22);
      await guard();
    });
  },
);

test(
  "confirmed Auth signup alone is not platform role/staff/sales/partner provisioning",
  options,
  async () => {
    await withStaff(async (db) => {
      const { manager, org } = await managerAndOrg(db);
      await staffSignup(db, { confirmed: "2026-01-01" });
      const p = await profile(db);
      assert.deepEqual(
        [p.manager_user_id, p.parent_org_id, p.is_staff_account, p.signup_intent, p.seller_type],
        [manager, org, true, "buyer", "private"],
      );
      for (const t of [
        "user_roles",
        "staff_referrals",
        "staff_referral_audit",
        "sales_rep_profiles",
        "sales_rep_territories",
        "partner_program_applications",
        "partner_program_partners",
      ])
        assert.equal((await rows(db, t)).length, 0);
      assert.equal(
        (await rows(db, "organization_members")).find((m) => m.user_id === id(1)).role,
        "member",
      );
    });
  },
);

test(
  "separate sales-role INSERT provisions full chain even with unconfirmed staff Auth; automatic consent not accepted",
  options,
  async () => {
    await withStaff(async (db) => {
      await staff(db);
      await role(db);
      assert.equal(
        (await db.query("SELECT email_confirmed_at FROM auth.users WHERE id=$1", [id(1)])).rows[0]
          .email_confirmed_at,
        null,
      );
      const [sr] = await rows(db, "staff_referrals"),
        [audit] = await rows(db, "staff_referral_audit"),
        [sales] = await rows(db, "sales_rep_profiles"),
        [territory] = await rows(db, "sales_rep_territories"),
        [app] = await rows(db, "partner_program_applications"),
        [partner] = await rows(db, "partner_program_partners");
      assert.equal(sr.staff_user_id, id(1));
      assert.match(sr.referral_code, /^syntheticsta\d{3}$/);
      assert.deepEqual(
        [audit.action, audit.actor_id, audit.staff_referral_id],
        ["created", null, sr.id],
      );
      assert.deepEqual(
        [sales.user_id, sales.active, sales.accepting_new_clients, sales.commission_rate_override],
        [id(1), true, true, null],
      );
      assert.deepEqual(
        [
          territory.rep_user_id,
          territory.region,
          territory.city,
          territory.province,
          territory.is_primary,
        ],
        [id(1), "NCR", "Makati", null, true],
      );
      assert.deepEqual(
        [app.status, app.agreed_terms, app.channel_type, app.reviewer_id],
        ["approved", true, "internal_staff", null],
      );
      assert.deepEqual(
        [
          partner.user_id,
          partner.referral_code,
          partner.application_id,
          partner.active,
          partner.agreed_terms_version,
        ],
        [id(1), sr.referral_code, app.id, true, "internal-staff-v1"],
      );
      assert.deepEqual(
        [(await profile(db)).signup_intent, (await profile(db)).seller_type],
        ["buyer", "private"],
      );
    });
  },
);

test(
  "ordinary Auth plus sales role creates staff referral/profile/territory but actual domain gate skips accreditation",
  options,
  async () => {
    await withStaff(async (db) => {
      await signup(db, {
        metadata: { full_name: "Synthetic Ordinary", signup_region: "NCR", signup_city: "Pasig" },
      });
      await role(db);
      for (const t of [
        "staff_referrals",
        "staff_referral_audit",
        "sales_rep_profiles",
        "sales_rep_territories",
      ])
        assert.equal((await rows(db, t)).length, 1);
      for (const t of ["partner_program_applications", "partner_program_partners"])
        assert.equal((await rows(db, t)).length, 0);
      assert.equal((await profile(db)).is_staff_account, false);
    });
  },
);

test(
  "every actual non-user role creates staff referral, but only exact sales creates sales profile/territory",
  options,
  async () => {
    await withStaff(async (db) => {
      await staff(db);
      await role(db, id(1), "user");
      assert.equal((await rows(db, "staff_referrals")).length, 0);
      for (const name of [
        "admin",
        "moderator",
        "support",
        "advertising",
        "sales_junior",
        "sales_senior",
        "sales_manager",
      ])
        await role(db, id(1), name);
      assert.equal((await rows(db, "staff_referrals")).length, 1);
      assert.equal((await rows(db, "staff_referral_audit")).length, 1);
      assert.equal((await rows(db, "partner_program_partners")).length, 1);
      assert.equal((await rows(db, "sales_rep_profiles")).length, 0);
      assert.equal((await rows(db, "sales_rep_territories")).length, 0);
      await role(db);
      assert.equal((await rows(db, "sales_rep_profiles")).length, 1);
      assert.equal((await rows(db, "sales_rep_territories")).length, 1);
      await unchangedFailure(db, () => role(db), "23505", "user_roles_user_id_role_key");
    });
  },
);

test(
  "actual generated staff code reaches nonempty full Auth referral/bounty/sales assignment",
  options,
  async () => {
    await withStaff(async (db) => {
      const sr = await provision(db);
      await consumer(db, sr.referral_code);
      const [ref] = await rows(db, "user_referrals"),
        [event] = await rows(db, "partner_program_commission_events"),
        [assignment] = await rows(db, "sales_rep_assignments"),
        [partner] = await rows(db, "partner_program_partners");
      assert.equal(ref.user_id, id(2));
      assert.equal(ref.credited_referral_code, sr.referral_code);
      assert.deepEqual(
        [
          event.partner_id,
          String(event.amount_php),
          Number(event.commission_php),
          event.source_ref,
        ],
        [partner.id, "0.00", 2, "signup:" + id(2)],
      );
      assert.deepEqual(
        [assignment.rep_user_id, assignment.subject_id, assignment.active],
        [id(1), id(2), true],
      );
      assert.deepEqual(
        [(await profile(db, id(2))).signup_intent, (await profile(db, id(2))).member_number],
        ["buyer", 3],
      );
    });
  },
);

for (const [name, settings, expected] of [
  ["unset", {}, null],
  ["legacy", { subject: id(701) }, id(701)],
  ["JSON fallback", { claims: JSON.stringify({ sub: id(702) }) }, id(702)],
  ["legacy wins", { subject: id(701), claims: JSON.stringify({ sub: id(702) }) }, id(701)],
  ["valid legacy short circuits invalid JSON", { subject: id(701), claims: "not-json" }, id(701)],
])
  test(
    "real provider uid audit attribution reads " +
      name +
      " synthetic request settings, not a verified actor",
    options,
    async () => {
      await withStaff(async (db) => {
        await staff(db);
        const before = await snapshot(db);
        await asSettings(db, settings, async () => {
          await role(db);
          const [audit] = await rows(db, "staff_referral_audit");
          assert.equal(audit.actor_id, expected);
          if (expected)
            assert.equal(
              (await db.query("SELECT count(*)::int n FROM auth.users WHERE id=$1", [expected]))
                .rows[0].n,
              0,
              "unbound synthetic UUID is not a human/Auth identity proof",
            );
        });
        assert.equal(
          await snapshot(db),
          before,
          "caller scope rolls back all test writes/settings",
        );
      });
    },
  );

test(
  "invalid JSON fallback aborts actual staff audit/writer chain atomically instead of hiding identity parsing failure",
  options,
  async () => {
    await withStaff(async (db) => {
      await staff(db);
      await asSettings(db, { claims: "not-json" }, async () => {
        await unchangedFailure(db, () => role(db), "22P02");
      });
      await asSettings(db, { claims: JSON.stringify({ sub: id(701) }) }, async () => {
        await role(db);
        assert.equal((await rows(db, "staff_referral_audit"))[0].actor_id, id(701));
      });
    });
  },
);

test(
  "late actual sales-profile NOT NULL failure restores earlier territory/staff/audit/accreditation and combined Auth rows; sequence gap survives",
  options,
  async () => {
    await withStaff(async (db, guard) => {
      await managerAndOrg(db);
      await db.exec(
        "SAVEPOINT sales_default_fault;ALTER TABLE public.sales_rep_profiles ALTER COLUMN active DROP DEFAULT",
      );
      await unchangedFailure(
        db,
        async () => {
          await staffSignup(db, {
            metadata: { full_name: "Synthetic Failed", signup_region: "NCR" },
          });
          await role(db);
        },
        "23502",
      );
      assert.deepEqual(await labSequenceState(db), { value: "2", called: true });
      await db.exec(
        "ROLLBACK TO SAVEPOINT sales_default_fault;RELEASE SAVEPOINT sales_default_fault",
      );
      await guard();
      await staffSignup(db, {
        metadata: { full_name: "Synthetic Recovery", signup_region: "NCR" },
      });
      await role(db);
      assert.deepEqual(
        [(await profile(db)).member_number, (await profile(db)).founding_member_number],
        [3, 2],
      );
      for (const t of [
        "staff_referrals",
        "staff_referral_audit",
        "sales_rep_profiles",
        "sales_rep_territories",
        "partner_program_applications",
        "partner_program_partners",
      ])
        assert.equal((await rows(db, t)).length, 1, "genuine default recovery " + t);
    });
  },
);

test(
  "genuine staff-audit CHECK failure rolls back the role plus earlier territory and recovers after fault removal",
  options,
  async () => {
    await withStaff(async (db, guard) => {
      await staff(db);
      await db.exec(
        "SAVEPOINT audit_fault;ALTER TABLE public.staff_referral_audit ADD CONSTRAINT lab_reject_created CHECK(action <> 'created')",
      );
      await unchangedFailure(db, () => role(db), "23514", "lab_reject_created");
      await db.exec("ROLLBACK TO SAVEPOINT audit_fault;RELEASE SAVEPOINT audit_fault");
      await guard();
      await role(db);
      assert.equal((await rows(db, "staff_referral_audit")).length, 1);
    });
  },
);

test(
  "consumer late assignment NOT NULL failure restores full Auth/org/Bronze/referral/bounty after real staff provisioning",
  options,
  async () => {
    await withStaff(async (db, guard) => {
      const sr = await provision(db);
      await db.exec(
        "SAVEPOINT assignment_fault;ALTER TABLE public.sales_rep_assignments ALTER COLUMN id SET DEFAULT NULL",
      );
      await unchangedFailure(db, () => consumer(db, sr.referral_code), "23502");
      assert.deepEqual(await labSequenceState(db), { value: "3", called: true });
      await db.exec("ROLLBACK TO SAVEPOINT assignment_fault;RELEASE SAVEPOINT assignment_fault");
      await guard();
      await consumer(db, sr.referral_code);
      assert.deepEqual(
        [
          (await profile(db, id(2))).member_number,
          (await profile(db, id(2))).founding_member_number,
        ],
        [4, 3],
      );
      assert.equal((await rows(db, "partner_program_commission_events")).length, 1);
      assert.equal((await rows(db, "sales_rep_assignments")).length, 1);
    });
  },
);

test(
  "full-profile no-area/trimmed fallback and existing-territory helper behavior is genuine, not a profile projection",
  options,
  async () => {
    await withStaff(async (db) => {
      await signup(db);
      await role(db);
      assert.equal((await rows(db, "sales_rep_territories")).length, 0);
      assert.equal(
        (await db.query("SELECT * FROM public.auto_setup_sales_rep_territory($1)", [id(1)])).rows[0]
          .reason,
        "no_signup_area",
      );
      await db.query(
        "UPDATE public.profiles SET signup_region=' ',signup_city='',business_region=' NCR ',business_city=' Pasig ' WHERE id=$1",
        [id(1)],
      );
      const inserted = (
        await db.query("SELECT * FROM public.auto_setup_sales_rep_territory($1)", [id(1)])
      ).rows[0];
      assert.deepEqual(inserted, {
        added: true,
        region: "NCR",
        province: null,
        city: "Pasig",
        reason: "inserted",
      });
      await db.query(
        "UPDATE public.profiles SET signup_region='Other',signup_city='Other' WHERE id=$1",
        [id(1)],
      );
      assert.equal(
        (await db.query("SELECT * FROM public.auto_setup_sales_rep_territory($1)", [id(1)])).rows[0]
          .reason,
        "already_has_territories",
      );
      assert.deepEqual(
        (await rows(db, "sales_rep_territories")).map((t) => [t.region, t.city]),
        [["NCR", "Pasig"]],
      );
    });
  },
);

test(
  "nonempty partner reactivation invokes real full intent/audit callback but wrongly attributes target, not synthetic original caller",
  options,
  async () => {
    await withStaff(async (db) => {
      const sr = await provision(db);
      await consumer(db, sr.referral_code);
      await db.exec("UPDATE public.partner_program_partners SET active=false");
      await asSettings(db, { subject: id(701) }, async () => {
        await db.query("UPDATE public.profiles SET signup_intent='business' WHERE id=$1", [id(2)]);
        await db.exec("UPDATE public.staff_referrals SET active=true");
        assert.equal((await rows(db, "partner_program_partners"))[0].active, true);
        const audits = (await rows(db, "admin_audit_log")).filter(
          (a) =>
            a.target_user_id === id(2) &&
            a.metadata?.trigger === "partner_updated" &&
            a.old_value === "business",
        );
        assert.ok(audits.length > 0);
        assert.equal(
          audits.at(-1).actor_id,
          id(2),
          "retained callback substitutes target UUID, not uid original caller",
        );
        assert.notEqual(audits.at(-1).actor_id, id(701));
      });
    });
  },
);

test(
  "staff deactivation audits uid but does not revoke accredited partner or existing sales assignment",
  options,
  async () => {
    await withStaff(async (db) => {
      const sr = await provision(db);
      await consumer(db, sr.referral_code);
      await asSettings(db, { subject: id(701) }, async () => {
        await db.exec(
          "UPDATE public.staff_referrals SET active=false,qr_storage_path='lab/synthetic-qr.png'",
        );
        const audits = await rows(db, "staff_referral_audit");
        assert.deepEqual(
          audits
            .filter((a) => a.action !== "created")
            .map((a) => [a.action, a.actor_id])
            .sort(),
          [
            ["deactivated", id(701)],
            ["qr_generated", id(701)],
          ],
        );
        assert.equal((await rows(db, "partner_program_partners"))[0].active, true);
        assert.equal((await rows(db, "sales_rep_assignments"))[0].active, true);
        await consumer(db, sr.referral_code, id(3));
        assert.equal(
          (await rows(db, "partner_program_commission_events")).length,
          1,
          "inactive staff prevents new Auth referral attachment; accredited partner remains active",
        );
        assert.equal(
          (await rows(db, "sales_rep_assignments")).length,
          1,
          "new assignment checks active staff",
        );
      });
    });
  },
);

test(
  "sales-role DELETE leaves staff/partner/sales/territory/prior assignment active; new referral still credits but no assignment",
  options,
  async () => {
    await withStaff(async (db) => {
      const sr = await provision(db);
      await consumer(db, sr.referral_code);
      await db.query("DELETE FROM public.user_roles WHERE user_id=$1 AND role='sales'", [id(1)]);
      for (const t of [
        "staff_referrals",
        "partner_program_partners",
        "sales_rep_profiles",
        "sales_rep_assignments",
      ])
        assert.equal((await rows(db, t))[0].active, true, "no offboarding fanout for " + t);
      assert.equal((await rows(db, "sales_rep_territories")).length, 1);
      await consumer(db, sr.referral_code, id(3));
      assert.equal((await rows(db, "partner_program_commission_events")).length, 2);
      assert.equal((await rows(db, "sales_rep_assignments")).length, 1);
    });
  },
);

test(
  "full client DML fails closed without adopting legacy policies; owner/service settings are not native authority proof",
  options,
  async () => {
    await withStaff(async (db) => {
      await staff(db);
      const before = await snapshot(db);
      for (const client of ["anon", "authenticated"])
        await asSettings(db, { role: client, subject: id(1) }, async () => {
          await assert.rejects(
            () => attempt(db, () => role(db)),
            (e) => e.code === "42501",
          );
          await assert.rejects(
            () =>
              attempt(db, () =>
                db.query("SELECT public.auto_setup_sales_rep_territory($1)", [id(1)]),
              ),
            (e) => e.code === "42501",
          );
          assert.equal(
            (await db.query("SELECT count(*)::int n FROM public.user_roles")).rows[0].n,
            0,
          );
        });
      assert.equal(
        await snapshot(db),
        before,
        "client denials restore all rows without granting synthetic Auth access",
      );
      await asSettings(db, { role: "service_role", subject: id(701) }, async () => {
        await role(db);
        // BYPASSRLS is an explicit lab input, NOT permission to ship this path.
        assert.equal((await rows(db, "staff_referral_audit"))[0].actor_id, id(701));
      });
      assert.equal((await rows(db, "user_roles")).length, 0);
    });
  },
);

test(
  "all full-parent/new-structure/provider ACL/definition/attachment/extra shim drifts are detected before rollback",
  options,
  async () => {
    await withStaff(async (db, guard) => {
      for (const sql of [
        "ALTER TABLE public.profiles ALTER COLUMN phone SET DEFAULT 'lab-drift'",
        "ALTER TABLE auth.users ALTER COLUMN email SET NOT NULL",
        "ALTER TABLE public.sales_rep_profiles ALTER COLUMN active DROP DEFAULT",
        "ALTER TABLE public.sales_rep_profiles DROP CONSTRAINT sales_rep_profiles_commission_rate_override_check",
        "GRANT ALL ON TABLE public.sales_rep_profiles TO anon",
        "GRANT EXECUTE ON FUNCTION public.tg_create_staff_referral() TO anon",
        "REVOKE EXECUTE ON FUNCTION auth.uid() FROM PUBLIC",
        "ALTER TABLE public.staff_referrals DISABLE TRIGGER staff_referral_audit_insert_trg",
        "CREATE FUNCTION auth.synthetic_identity() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid'",
        "CREATE TABLE public.synthetic_support(id uuid)",
        "CREATE POLICY lab_allow ON public.user_roles USING(true)",
      ]) {
        await db.exec("SAVEPOINT drift");
        try {
          await db.exec(sql);
          await assert.rejects(() => guard(), { code: "ERR_ASSERTION" }, sql);
        } finally {
          await db.exec("ROLLBACK TO SAVEPOINT drift;RELEASE SAVEPOINT drift");
        }
        await guard();
      }
    });
  },
);

test(
  "automatic child postflight detects modified writer even though immutable parent would later roll it back",
  options,
  async () => {
    await assert.rejects(
      () =>
        withStaff(async (db) => {
          await db.exec("GRANT EXECUTE ON FUNCTION public.tg_create_staff_referral() TO anon");
        }),
      { code: "ERR_ASSERTION" },
    );
  },
);
