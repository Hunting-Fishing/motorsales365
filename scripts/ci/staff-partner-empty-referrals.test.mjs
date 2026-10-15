// MEMORY-ONLY dated staff-domain characterization, not adopted platform authority.
// No live calls, auth bootstrap, nonempty-referral intent, full history or release.
import { test } from "node:test";
import assert from "node:assert/strict";
import { actor, id } from "./fixtures/platform-role-forward-fixture.mjs";
import {
  withPartnerFixture,
  snapshot,
  catalog,
  sources,
  functions,
  ddl,
  signatures,
  pins,
  observed,
} from "./fixtures/staff-partner-empty-referrals-fixture.mjs";

const options = { concurrency: false, timeout: 60_000 };
const codeError = (code, constraint) => (error) =>
  error.code === code && (!constraint || error.constraint === constraint);
const rows = async (db, table) =>
  (await db.query(`SELECT t.* FROM public.${table} t ORDER BY to_jsonb(t)::text`)).rows;
async function unchangedFailure(db, run, predicate) {
  const before = await snapshot(db);
  await assert.rejects(run, predicate);
  assert.deepEqual(
    await snapshot(db),
    before,
    "all nine table data, auth/profile supports, full catalog and caller settings unchanged",
  );
}
const grantRole = (db, role = "sales", connection = "authenticated", subject = id.admin) =>
  actor(
    db,
    connection,
    subject,
    "INSERT INTO public.user_roles(user_id,role) VALUES($1,$2::public.app_role) RETURNING user_id,role::text",
    [id.staffDomain, role],
  );
async function addStaff(
  db,
  {
    user = id.staffDomain,
    email = "synthetic@365motorsales.com",
    code = "synthetic-staff",
    active = true,
    name = "Synthetic Referral",
  } = {},
) {
  return (
    await actor(
      db,
      "postgres",
      null,
      `INSERT INTO public.staff_referrals(staff_user_id,email,full_name,referral_code,active,updated_at)
    VALUES($1,$2,$3,$4,$5,'2000-01-01') RETURNING *`,
      [user, email, name, code, active],
    )
  ).rows[0];
}
async function addPartner(
  db,
  { user = id.staffDomain, code = "synthetic-staff", active = false } = {},
) {
  return (
    await actor(
      db,
      "postgres",
      null,
      `INSERT INTO public.partner_program_partners(user_id,referral_code,display_name,active,updated_at)
    VALUES($1,$2,'Synthetic Existing Partner',$3,'2000-01-01') RETURNING *`,
      [user, code, active],
    )
  ).rows[0];
}
async function addApplication(
  db,
  {
    user = id.staffDomain,
    status = "pending",
    agreedAt = null,
    reviewedAt = null,
    notes = null,
    channel = "internal_staff",
  } = {},
) {
  return (
    await actor(
      db,
      "postgres",
      null,
      `INSERT INTO public.partner_program_applications(user_id,full_name,email,channel_type,status,agreed_terms_at,reviewed_at,admin_notes,updated_at)
    VALUES($1,'Synthetic Existing Applicant','applicant@example.invalid',$2,$3,$4,$5,$6,'2000-01-01') RETURNING *`,
      [user, channel, status, agreedAt, reviewedAt, notes],
    )
  ).rows[0];
}
const accredit = (db, user = id.staffDomain) =>
  actor(db, "service_role", null, "SELECT public.accredit_staff_partner($1)", [user]);

test(
  "immutable PR50, ten whole-source pins, twelve policies and explicit empty-loop boundary",
  options,
  () => {
    assert.equal(Object.keys(sources).length, 10);
    assert.equal(ddl.tables.length, 3);
    assert.equal(ddl.deltas.length, 2);
    assert.equal(ddl.policies.length, 12);
    assert.equal(ddl.indexes.length, 6);
    assert.equal(ddl.attachments.length, 3);
    assert.equal(pins.selections.wrapper.bodyMd5Lf, "5df9fb3bd7a12cba1689f4bb9eb983ab");
    assert.equal(pins.selections.timestamp.bodyMd5Lf, "5b733ab523bad442e4b10f836de9e4ba");
    assert.match(
      functions.wrapper,
      /FOR _uid IN[\s\S]*SELECT user_id FROM public.user_referrals[\s\S]*PERFORM public.recompute_signup_intent/,
    );
    assert.doesNotMatch(
      Object.values(functions).join("\n"),
      /CREATE OR REPLACE FUNCTION public.(?:derive|recompute)_signup_intent/,
    );
    assert.match(pins.exclusions.referrals, /EMPTY.*two writer fanouts omitted/);
    assert.match(pins.exclusions.authority, /never adopted/);
    assert.equal(
      observed.functions.find((v) => v.signature === "public.accredit_staff_partner(uuid)")
        .bodyMd5Lf,
      "93f21bd4e7112ea9e8c5257267f9da69",
    );
  },
);

test(
  "nine actual tables, 117 columns, 28 constraints, 28 indexes, 27 policies, 15 functions and 12 selected attachments match dated catalog",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      const c = await catalog(db);
      assert.deepEqual(
        [
          c.tables.length,
          c.columns.length,
          c.constraints.filter((v) => v.type !== "n").length,
          c.indexes.length,
          c.policies.length,
          c.functions.length,
          c.triggers.length,
        ],
        [9, 117, 28, 28, 27, 15, 12],
      );
      assert.deepEqual(
        (
          await db.query(
            "SELECT to_regprocedure('public.recompute_signup_intent(uuid)') short,to_regprocedure('public.recompute_signup_intent(uuid,text,text,text,text,text,text)') full",
          )
        ).rows,
        [{ short: null, full: null }],
      );
      assert.equal(
        c.triggers.some((v) => v.table === "public.user_referrals" || v.table === "auth.users"),
        false,
      );
      for (const signature of Object.values(signatures)) {
        assert.deepEqual(
          (
            await db.query(
              "SELECT has_function_privilege('anon',$1,'EXECUTE') anon,has_function_privilege('authenticated',$1,'EXECUTE') authenticated,has_function_privilege('service_role',$1,'EXECUTE') service",
              [signature],
            )
          ).rows,
          [{ anon: false, authenticated: false, service: true }],
        );
      }
    });
  },
);

test(
  "synthetic admin role INSERT composes sales/referral/audit/application/partner with actual empty-loop wrapper",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      const before = await snapshot(db);
      assert.equal((await grantRole(db)).affectedRows, 1);
      const staff = await rows(db, "staff_referrals"),
        apps = await rows(db, "partner_program_applications"),
        partners = await rows(db, "partner_program_partners");
      assert.equal(staff.length, 1);
      assert.equal(apps.length, 1);
      assert.equal(partners.length, 1);
      const [s] = staff,
        [a] = apps,
        [p] = partners;
      assert.equal(s.staff_user_id, id.staffDomain);
      assert.match(s.referral_code, /^syntheticsta\w*\d{3}$/);
      assert.equal(a.user_id, id.staffDomain);
      assert.equal(a.email, "synthetic@365motorsales.com");
      assert.equal(a.full_name, "Synthetic staffDomain");
      assert.equal(a.channel_type, "internal_staff");
      assert.deepEqual(a.platforms, ["internal"]);
      assert.equal(a.status, "approved");
      assert.equal(a.agreed_terms, true);
      assert.ok(a.agreed_terms_at && a.reviewed_at);
      assert.equal(a.reviewer_id, null);
      assert.equal(p.user_id, id.staffDomain);
      assert.equal(p.application_id, a.id);
      assert.equal(p.referral_code, s.referral_code);
      assert.equal(p.display_name, a.full_name);
      assert.equal(p.active, true);
      assert.equal(p.agreed_terms_version, "internal-staff-v1");
      assert.equal(p.shop_manager_access, false);
      assert.deepEqual(p.payout_details, {});
      const sales = await rows(db, "sales_rep_profiles"),
        territories = await rows(db, "sales_rep_territories"),
        audit = await rows(db, "staff_referral_audit");
      assert.equal(sales.length, 1);
      assert.equal(sales[0].user_id, id.staffDomain);
      assert.equal(territories.length, 1);
      assert.equal(audit.length, 1);
      assert.equal(audit[0].action, "created");
      assert.equal(audit[0].actor_id, id.admin);
      assert.deepEqual((await snapshot(db)).catalog, before.catalog);
    });
  },
);

test(
  "real accreditation early returns for null, missing, nonstaff email, no referral and inactive referral",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      for (const user of [null, id.missing, id.target, id.nullEmail, id.staffDomain]) {
        const before = await snapshot(db);
        await accredit(db, user);
        assert.deepEqual(await snapshot(db), before);
      }
      await addStaff(db, { active: false });
      const before = await snapshot(db);
      await accredit(db);
      assert.deepEqual(await snapshot(db), before);
      assert.equal((await rows(db, "partner_program_partners")).length, 0);
    });
  },
);

test(
  "existing referral-code partner reactivates but preserves mismatched binding and skips application repair",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      const seeded = await addPartner(db, { user: id.other });
      await addStaff(db);
      const [partner] = await rows(db, "partner_program_partners");
      assert.equal(partner.id, seeded.id);
      assert.equal(partner.active, true);
      assert.notDeepEqual(partner.updated_at, seeded.updated_at);
      assert.equal(partner.user_id, id.other);
      assert.equal(partner.application_id, null);
      assert.equal((await rows(db, "partner_program_applications")).length, 0);
      const before = await snapshot(db);
      await accredit(db);
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "OR user/code match reactivates every matching row, without inventing unique user binding",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      const byUser = await addPartner(db, { code: "synthetic-other-code" });
      const byCode = await addPartner(db, { user: id.other });
      await addStaff(db);
      const partners = await rows(db, "partner_program_partners");
      assert.equal(partners.length, 2);
      assert.ok(partners.every((p) => p.active));
      assert.equal(partners.find((p) => p.id === byUser.id).referral_code, "synthetic-other-code");
      assert.equal(partners.find((p) => p.id === byCode.id).user_id, id.other);
      assert.equal((await rows(db, "partner_program_applications")).length, 0);
    });
  },
);

for (const preserve of [false, true])
  test(
    `existing internal application is approved; prior timestamps/notes ${preserve ? "preserved" : "filled"}`,
    options,
    async () => {
      await withPartnerFixture(async (db) => {
        const old = await addApplication(db, {
          status: "rejected",
          agreedAt: preserve ? "2001-01-01" : null,
          reviewedAt: preserve ? "2002-01-01" : null,
          notes: preserve ? "Synthetic retained note" : null,
        });
        await addStaff(db);
        const [app] = await rows(db, "partner_program_applications"),
          [partner] = await rows(db, "partner_program_partners");
        assert.equal(app.id, old.id);
        assert.equal(app.status, "approved");
        assert.equal(app.agreed_terms, true);
        assert.equal(app.full_name, old.full_name);
        assert.equal(app.email, old.email);
        assert.deepEqual(app.platforms, []);
        assert.notDeepEqual(app.updated_at, old.updated_at);
        assert.ok(app.agreed_terms_at && app.reviewed_at);
        if (preserve) {
          assert.deepEqual(app.agreed_terms_at, old.agreed_terms_at);
          assert.deepEqual(app.reviewed_at, old.reviewed_at);
          assert.equal(app.admin_notes, old.admin_notes);
        } else assert.equal(app.admin_notes, "Auto-accredited: 365 Motorsales internal staff");
        assert.equal(partner.application_id, old.id);
        assert.equal(partner.display_name, "Synthetic staffDomain");
      });
    },
  );

test("unrelated channel application is not selected or approved", options, async () => {
  await withPartnerFixture(async (db) => {
    const old = await addApplication(db, { channel: "synthetic_external", status: "rejected" });
    await addStaff(db);
    const apps = await rows(db, "partner_program_applications");
    assert.equal(apps.length, 2);
    assert.deepEqual(
      apps.find((a) => a.id === old.id),
      old,
    );
    assert.equal(apps.find((a) => a.id !== old.id).status, "approved");
  });
});

test(
  "missing projected profile uses actual referral name fallback, not an invented default profile",
  options,
  async () => {
    await withPartnerFixture(
      async (db) => {
        await addStaff(db, { name: "Synthetic Fallback" });
        assert.equal(
          (await rows(db, "partner_program_applications"))[0].full_name,
          "Synthetic Fallback",
        );
        assert.equal(
          (await rows(db, "partner_program_partners"))[0].display_name,
          "Synthetic Fallback",
        );
        assert.equal(
          (await db.query("SELECT id FROM public.profiles WHERE id=$1", [id.staffDomain])).rows
            .length,
          0,
        );
      },
      { omitProfiles: [id.staffDomain] },
    );
  },
);

test("mixed-case staff-domain email qualifies through real lower check", options, async () => {
  await withPartnerFixture(
    async (db) => {
      await grantRole(db, "support");
      assert.equal(
        (await rows(db, "partner_program_applications"))[0].email,
        "Synthetic@365MotorSales.COM",
      );
      assert.equal((await rows(db, "partner_program_partners")).length, 1);
    },
    { emailOverrides: [{ id: id.staffDomain, email: "Synthetic@365MotorSales.COM" }] },
  );
});

test(
  "role forward rebinds an unbound case-insensitive staff email then accredits through actual UPDATE attachment",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      const old = await addStaff(db, { user: null, email: "SYNTHETIC@365MOTORSALES.COM" });
      assert.equal((await rows(db, "partner_program_partners")).length, 0);
      await grantRole(db, "support");
      const [staff] = await rows(db, "staff_referrals");
      assert.equal(staff.id, old.id);
      assert.equal(staff.staff_user_id, id.staffDomain);
      assert.equal(
        (await rows(db, "partner_program_partners"))[0].referral_code,
        old.referral_code,
      );
      assert.equal(
        (await rows(db, "staff_referral_audit")).length,
        1,
        "binding update is not a recorded activation/QR change",
      );
    });
  },
);

test(
  "role forward does not steal already-bound matching email; no partner effects for requested user",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      const old = await addStaff(db, { user: id.other });
      const before = await snapshot(db);
      await grantRole(db, "support");
      const after = await snapshot(db);
      assert.deepEqual(await rows(db, "staff_referrals"), [old]);
      for (const table of [
        "partner_program_applications",
        "partner_program_partners",
        "staff_referral_audit",
      ])
        assert.deepEqual(after.data[table], before.data[table]);
      assert.equal(after.data.user_roles.length, before.data.user_roles.length + 1);
    });
  },
);

test(
  "ordinary and anonymous direct accreditation calls denied with complete unchanged snapshots",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      for (const [role, subject] of [
        ["anon", null],
        ["authenticated", id.target],
        ["authenticated", id.admin],
      ])
        await unchangedFailure(
          db,
          () =>
            actor(db, role, subject, "SELECT public.accredit_staff_partner($1)", [id.staffDomain]),
          codeError("42501"),
        );
    });
  },
);

test(
  "ordinary partner DML denied/zero-row; synthetic existing admin and service controls still characterize broad grants",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      const p = await addPartner(db, { user: id.target });
      await unchangedFailure(
        db,
        () =>
          actor(
            db,
            "authenticated",
            id.target,
            "INSERT INTO public.partner_program_partners(referral_code,display_name) VALUES('synthetic-denied','Synthetic Denied')",
          ),
        codeError("42501"),
      );
      const before = await snapshot(db);
      assert.equal(
        (
          await actor(
            db,
            "authenticated",
            id.target,
            "UPDATE public.partner_program_partners SET active=true WHERE id=$1",
            [p.id],
          )
        ).affectedRows,
        0,
      );
      assert.equal(
        (
          await actor(
            db,
            "authenticated",
            id.target,
            "DELETE FROM public.partner_program_partners WHERE id=$1",
            [p.id],
          )
        ).affectedRows,
        0,
      );
      assert.deepEqual(await snapshot(db), before);
      assert.equal(
        (
          await actor(
            db,
            "authenticated",
            id.admin,
            "UPDATE public.partner_program_partners SET active=true WHERE id=$1",
            [p.id],
          )
        ).affectedRows,
        1,
      );
      assert.equal(
        (
          await actor(
            db,
            "service_role",
            null,
            "DELETE FROM public.partner_program_partners WHERE id=$1",
            [p.id],
          )
        ).affectedRows,
        1,
      );
    });
  },
);

test(
  "actual application INSERT policies allow caller-supplied other-user approved claims; characterization is not authority acceptance",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      for (const [role, subject] of [
        ["anon", null],
        ["authenticated", id.target],
      ]) {
        const result = await actor(
          db,
          role,
          subject,
          `INSERT INTO public.partner_program_applications(user_id,full_name,email,channel_type,status,agreed_terms)
        VALUES($1,'Synthetic Claim','claim@example.invalid','internal_staff','approved',true)`,
          [id.other],
        );
        assert.equal(result.affectedRows, 1);
      }
      assert.equal(
        (await rows(db, "partner_program_partners")).length,
        0,
        "application insert alone is not partner provisioning",
      );
      assert.ok(
        (await rows(db, "partner_program_applications")).every(
          (a) => a.user_id === id.other && a.status === "approved",
        ),
      );
    });
  },
);

test(
  "selected role deletion/staff deactivation leaves partner active; no offboarding repair is inferred",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      await grantRole(db);
      const [partner] = await rows(db, "partner_program_partners");
      assert.equal(
        (
          await actor(
            db,
            "authenticated",
            id.admin,
            "DELETE FROM public.user_roles WHERE user_id=$1 AND role='sales'",
            [id.staffDomain],
          )
        ).affectedRows,
        1,
      );
      assert.deepEqual(await rows(db, "partner_program_partners"), [partner]);
      assert.equal(
        (
          await actor(
            db,
            "authenticated",
            id.admin,
            "UPDATE public.staff_referrals SET active=false WHERE staff_user_id=$1",
            [id.staffDomain],
          )
        ).affectedRows,
        1,
      );
      assert.deepEqual(await rows(db, "partner_program_partners"), [partner]);
      assert.equal(
        (await rows(db, "staff_referral_audit")).filter((a) => a.action === "deactivated").length,
        1,
      );
      assert.equal(
        (await rows(db, "sales_rep_profiles")).length,
        1,
        "selected downstream sales rows also remain",
      );
    });
  },
);

test(
  "actual partner UPDATE of code/active and DELETE execute empty-loop wrapper without intent stub",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      const p = await addPartner(db);
      assert.equal(
        (
          await actor(
            db,
            "service_role",
            null,
            "UPDATE public.partner_program_partners SET referral_code='synthetic-changed',active=true WHERE id=$1",
            [p.id],
          )
        ).affectedRows,
        1,
      );
      const [updated] = await rows(db, "partner_program_partners");
      assert.equal(updated.referral_code, "synthetic-changed");
      assert.equal(updated.active, true);
      assert.notDeepEqual(updated.updated_at, p.updated_at);
      assert.equal(
        (
          await actor(
            db,
            "service_role",
            null,
            "DELETE FROM public.partner_program_partners WHERE id=$1",
            [p.id],
          )
        ).affectedRows,
        1,
      );
      assert.deepEqual(await rows(db, "partner_program_partners"), []);
    });
  },
);

for (const [label, sql, args, code, constraint] of [
  [
    "application status CHECK",
    "INSERT INTO public.partner_program_applications(full_name,email,channel_type,status) VALUES('Synthetic','x@example.invalid','internal_staff','synthetic-invalid')",
    [],
    "23514",
    "partner_program_applications_status_check",
  ],
  [
    "application user FK",
    "INSERT INTO public.partner_program_applications(user_id,full_name,email,channel_type) VALUES($1,'Synthetic','x@example.invalid','internal_staff')",
    [id.missing],
    "23503",
    "partner_program_applications_user_id_fkey",
  ],
  [
    "application reviewer FK",
    "INSERT INTO public.partner_program_applications(reviewer_id,full_name,email,channel_type) VALUES($1,'Synthetic','x@example.invalid','internal_staff')",
    [id.missing],
    "23503",
    "partner_program_applications_reviewer_id_fkey",
  ],
  [
    "application full name NOT NULL",
    "INSERT INTO public.partner_program_applications(full_name,email,channel_type) VALUES(NULL,'x@example.invalid','internal_staff')",
    [],
    "23502",
    null,
  ],
  [
    "partner application FK",
    "INSERT INTO public.partner_program_partners(application_id,referral_code,display_name) VALUES($1,'synthetic-invalid','Synthetic')",
    [id.missing],
    "23503",
    "partner_program_partners_application_id_fkey",
  ],
  [
    "partner user FK",
    "INSERT INTO public.partner_program_partners(user_id,referral_code,display_name) VALUES($1,'synthetic-invalid','Synthetic')",
    [id.missing],
    "23503",
    "partner_program_partners_user_id_fkey",
  ],
  [
    "referral user FK (rejected before omitted writer fanouts)",
    "INSERT INTO public.user_referrals(user_id) VALUES($1)",
    [id.missing],
    "23503",
    "user_referrals_user_id_fkey",
  ],
  [
    "referral staff FK (rejected before omitted writer fanouts)",
    "INSERT INTO public.user_referrals(user_id,referred_by_staff_id) VALUES($1,$2)",
    [id.target, id.missing],
    "23503",
    "user_referrals_referred_by_staff_id_fkey",
  ],
])
  test(`critical ${label} remains enabled and rolls back`, options, async () => {
    await withPartnerFixture(async (db) => {
      await unchangedFailure(
        db,
        () => actor(db, "service_role", null, sql, args),
        codeError(code, constraint),
      );
    });
  });

test(
  "actual partner referral UNIQUE remains, but user binding is not unique",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      await addPartner(db);
      await unchangedFailure(
        db,
        () => addPartner(db, { user: id.other }),
        codeError("23505", "partner_program_partners_referral_code_key"),
      );
      await addPartner(db, { code: "synthetic-second" });
      assert.equal(
        (await rows(db, "partner_program_partners")).filter((p) => p.user_id === id.staffDomain)
          .length,
        2,
      );
    });
  },
);

test(
  "late real partner NOT NULL failure rolls back role, sales, territory, referral, audit and application; recovery restores exact catalog",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      const initial = await snapshot(db);
      // Lab-only DEFAULT fault, not a replacement function, disabled constraint or trigger.
      await db.exec(
        "ALTER TABLE public.partner_program_partners ALTER COLUMN payout_details SET DEFAULT NULL",
      );
      await unchangedFailure(
        db,
        () => grantRole(db),
        (error) =>
          error.code === "23502" &&
          error.table === "partner_program_partners" &&
          error.column === "payout_details",
      );
      await db.exec(
        "ALTER TABLE public.partner_program_partners ALTER COLUMN payout_details SET DEFAULT '{}'::jsonb",
      );
      assert.deepEqual(await snapshot(db), initial);
      assert.equal(
        (await grantRole(db)).affectedRows,
        1,
        "unmodified actual forward chain succeeds after exact recovery",
      );
      assert.equal((await rows(db, "partner_program_partners")).length, 1);
    });
  },
);

test(
  "late real partner primary-key collision rolls back composed chain without deleting preexisting data",
  options,
  async () => {
    await withPartnerFixture(async (db) => {
      const p = await addPartner(db, { user: id.other, code: "synthetic-preexisting" });
      const initial = await snapshot(db);
      await db.exec(
        `ALTER TABLE public.partner_program_partners ALTER COLUMN id SET DEFAULT '${p.id}'::uuid`,
      );
      await unchangedFailure(
        db,
        () => grantRole(db),
        codeError("23505", "partner_program_partners_pkey"),
      );
      await db.exec(
        "ALTER TABLE public.partner_program_partners ALTER COLUMN id SET DEFAULT gen_random_uuid()",
      );
      assert.deepEqual(await snapshot(db), initial);
      assert.deepEqual(await rows(db, "partner_program_partners"), [p]);
      await grantRole(db);
      assert.equal((await rows(db, "partner_program_partners")).length, 2);
    });
  },
);
