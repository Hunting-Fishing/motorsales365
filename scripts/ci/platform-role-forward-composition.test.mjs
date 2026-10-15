// MEMORY-ONLY platform role policy/INSERT-forward characterization.
// Existing synthetic admin/service controls are NOT adopted authority positives.
// GUC subjects are NOT verified JWTs or human attribution. No live calls,
// migrations, full auth/profile/partner closure, approval or release acceptance.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  withFixture,
  actor,
  snapshot,
  catalog,
  data,
  assertObservedSubset,
  id,
  functions,
  sources,
  ddl,
  pins,
  observed,
  signatures,
  policyDrops,
} from "./fixtures/platform-role-forward-fixture.mjs";

const options = { concurrency: false, timeout: 60_000 };
const insertRole = (db, user, role, connection = "authenticated", subject = id.admin) =>
  actor(
    db,
    connection,
    subject,
    "INSERT INTO public.user_roles(user_id,role) VALUES($1,$2::public.app_role) RETURNING id,user_id,role::text",
    [user, role],
  );
const hasCode = (code, constraint) => (error) =>
  error.code === code && (!constraint || error.constraint === constraint);
async function unchangedFailure(db, run, predicate) {
  const before = await snapshot(db);
  await assert.rejects(run, predicate);
  assert.deepEqual(await snapshot(db), before);
}
async function roleRows(db, role, subject) {
  return (
    await actor(
      db,
      role,
      subject,
      "SELECT user_id,role::text FROM public.user_roles ORDER BY user_id,role::text",
    )
  ).rows;
}
async function derived(db, user = id.target) {
  return {
    staff: (
      await db.query("SELECT * FROM public.staff_referrals WHERE staff_user_id=$1 ORDER BY id", [
        user,
      ])
    ).rows,
    sales: (await db.query("SELECT * FROM public.sales_rep_profiles WHERE user_id=$1", [user]))
      .rows,
    territories: (
      await db.query(
        "SELECT * FROM public.sales_rep_territories WHERE rep_user_id=$1 ORDER BY id",
        [user],
      )
    ).rows,
    audit: (await db.query("SELECT * FROM public.staff_referral_audit ORDER BY created_at,id"))
      .rows,
  };
}
async function addReferral(
  db,
  {
    user = null,
    email = "target@example.invalid",
    active = true,
    code = "synthetic-existing",
    name = "Synthetic Existing",
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
async function preserveCatalog(db, before) {
  assert.deepEqual(await catalog(db), before.catalog);
}

test(
  "immutable source selections and dated boundaries are explicit, including old accreditation and supplier enum",
  options,
  async () => {
    assert.equal(Object.keys(sources).length, 18);
    assert.equal(Object.keys(functions).length, 13);
    assert.equal(ddl.policies.length, 15);
    assert.equal(ddl.attachments.length, 9);
    assert.equal(policyDrops.length, 2);
    assert.deepEqual(observed.enums.find((value) => value.name === "app_role").labels, [
      "admin",
      "user",
      "sales",
      "moderator",
      "support",
      "advertising",
      "sales_junior",
      "sales_senior",
      "sales_manager",
    ]);
    assert.deepEqual(observed.enums.find((value) => value.name === "sales_rep_subject").labels, [
      "user",
      "business",
      "supplier",
    ]);
    assert.equal(
      observed.functions.find((value) => value.signature === signatures.accredit).bodyMd5Lf,
      "93f21bd4e7112ea9e8c5257267f9da69",
    );
    assert.doesNotMatch(functions.accredit, /request_jwt_role|pg_trigger_depth/);
    assert.match(
      functions.accredit,
      /v_email IS NULL OR lower\(v_email\) NOT LIKE '%@365motorsales.com'/,
    );
    assert.match(functions.assigned, /active = true[\s\S]*subject_type = 'user'/);
    assert.match(pins.exclusions.partner, /absent, not stubbed/);
    assert.equal(observed.policies.filter((value) => value.table === "staff_referrals").length, 2);
  },
);

test(
  "six actual tables, 15 policies, critical constraints, indexes, 13 functions and nine forward attachments match dated fingerprints",
  options,
  async () => {
    await withFixture(async (db) => {
      await assertObservedSubset(db);
      const roles = (
        await db.query(
          "SELECT rolname,rolsuper,rolbypassrls,rolinherit FROM pg_catalog.pg_roles WHERE rolname IN('anon','authenticated') ORDER BY rolname",
        )
      ).rows;
      assert.deepEqual(roles, [
        { rolname: "anon", rolsuper: false, rolbypassrls: false, rolinherit: false },
        { rolname: "authenticated", rolsuper: false, rolbypassrls: false, rolinherit: false },
      ]);
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int count FROM pg_catalog.pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal",
          )
        ).rows[0].count,
        0,
      );
      assert.equal(
        (await db.query("SELECT pg_catalog.to_regnamespace('shop_manager') value")).rows[0].value,
        null,
      );
      assert.equal(
        (await db.query("SELECT count(*)::int count FROM public.staff_referral_audit")).rows[0]
          .count,
        0,
      );
    });
  },
);

test(
  "ordinary authenticated actor sees own roles but not another user's roles through actual policy helpers",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await snapshot(db);
      assert.deepEqual(await roleRows(db, "authenticated", id.ordinary), [
        { user_id: id.ordinary, role: "user" },
      ]);
      assert.deepEqual(
        (
          await actor(
            db,
            "authenticated",
            id.ordinary,
            "SELECT id FROM public.user_roles WHERE user_id=$1",
            [id.target],
          )
        ).rows,
        [],
      );
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "ordinary authenticated self/foreign role INSERT is 42501 despite effective table INSERT grant",
  options,
  async () => {
    await withFixture(async (db) => {
      assert.equal(
        observed.tables
          .find((value) => value.table === "user_roles")
          .rights.find((value) => value.role === "authenticated").insert,
        true,
      );
      for (const user of [id.ordinary, id.target])
        await unchangedFailure(
          db,
          () => insertRole(db, user, "admin", "authenticated", id.ordinary),
          hasCode("42501"),
        );
    });
  },
);

test(
  "SELECT-visible own role UPDATE and DELETE return zero rows, not permission errors or confirmed writes",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await snapshot(db);
      assert.equal((await roleRows(db, "authenticated", id.ordinary)).length, 1);
      for (const sql of [
        "UPDATE public.user_roles SET role='admin' WHERE id=$1 RETURNING id",
        "DELETE FROM public.user_roles WHERE id=$1 RETURNING id",
      ]) {
        const result = await actor(db, "authenticated", id.ordinary, sql, [id.roleOrdinary]);
        assert.equal(result.affectedRows, 0);
        assert.deepEqual(result.rows, []);
      }
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "anon NULL subject and authenticated NULL/nonexistent subject have separate deny controls",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await snapshot(db);
      for (const [role, subject] of [
        ["anon", null],
        ["authenticated", null],
        ["authenticated", id.missing],
      ]) {
        assert.deepEqual(await roleRows(db, role, subject), []);
        await unchangedFailure(
          db,
          () => insertRole(db, id.target, "support", role, subject),
          hasCode("42501"),
        );
        const result = await actor(
          db,
          role,
          subject,
          "DELETE FROM public.user_roles WHERE id=$1 RETURNING id",
          [id.roleTarget],
        );
        assert.equal(result.affectedRows, 0);
      }
      assert.deepEqual(await snapshot(db), before);
      // The PUBLIC policy also applies to anon; arbitrary anon+UID GUC combinations
      // are not asserted to model real hosted tokens or a universal anon denial.
    });
  },
);

test(
  "moderator can_moderate true is distinct from admin-only platform role mutation",
  options,
  async () => {
    await withFixture(async (db) => {
      const row = (
        await actor(
          db,
          "authenticated",
          id.moderator,
          "SELECT public.can_moderate(auth.uid()) moderate,public.has_role(auth.uid(),'admin') admin",
        )
      ).rows[0];
      assert.deepEqual(row, { moderate: true, admin: false });
      await unchangedFailure(
        db,
        () => insertRole(db, id.target, "support", "authenticated", id.moderator),
        hasCode("42501"),
      );
    });
  },
);

test(
  "sales SELECT admits only active user assignments for the actor, not business/supplier/inactive/wrong-rep targets",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const [rep, user, type, active] of [
        [id.sales, id.target, "user", true],
        [id.sales, id.ordinary, "user", false],
        [id.sales, id.other, "business", true],
        [id.other, id.moderator, "user", true],
        [id.sales, id.nullEmail, "supplier", true],
      ])
        await actor(
          db,
          "postgres",
          null,
          "INSERT INTO public.sales_rep_assignments(rep_user_id,subject_id,subject_type,active) VALUES($1,$2,$3::public.sales_rep_subject,$4)",
          [rep, user, type, active],
        );
      const before = await snapshot(db);
      assert.deepEqual(await roleRows(db, "authenticated", id.sales), [
        { user_id: id.sales, role: "sales" },
        { user_id: id.target, role: "user" },
      ]);
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "sales level enum names alone do not satisfy plain sales policy or create sales rep/territory rows",
  options,
  async () => {
    for (const role of ["sales_junior", "sales_senior", "sales_manager"])
      await withFixture(async (db) => {
        await insertRole(db, id.target, role);
        await actor(
          db,
          "postgres",
          null,
          "INSERT INTO public.sales_rep_assignments(rep_user_id,subject_id,subject_type) VALUES($1,$2,'user')",
          [id.target, id.other],
        );
        assert.equal(
          (
            await actor(
              db,
              "authenticated",
              id.target,
              "SELECT public.has_role(auth.uid(),'sales') value",
            )
          ).rows[0].value,
          false,
        );
        assert.deepEqual(
          (
            await actor(
              db,
              "authenticated",
              id.target,
              "SELECT id FROM public.user_roles WHERE user_id=$1",
              [id.other],
            )
          ).rows,
          [],
        );
        const rows = await derived(db);
        assert.equal(rows.staff.length, 1);
        assert.equal(rows.sales.length, 0);
        assert.equal(rows.territories.length, 0);
      });
  },
);

test(
  "existing synthetic global admin can assign and read roles; this is behavior, not accepted owner/delegation authority",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await snapshot(db);
      const result = await insertRole(db, id.target, "admin");
      assert.equal(result.rows.length, 1);
      assert.equal(
        (
          await actor(
            db,
            "authenticated",
            id.target,
            "SELECT public.has_role(auth.uid(),'admin') value",
          )
        ).rows[0].value,
        true,
      );
      assert.equal((await roleRows(db, "authenticated", id.admin)).length, 9);
      await preserveCatalog(db, before);
    });
  },
);

test(
  "role user has no staff/sales fanout while nonuser role branches create real referral/audit rows",
  options,
  async () => {
    await withFixture(async (db) => {
      await actor(db, "postgres", null, "DELETE FROM public.user_roles WHERE user_id=$1", [
        id.target,
      ]);
      await insertRole(db, id.target, "user");
      assert.deepEqual(await derived(db), { staff: [], sales: [], territories: [], audit: [] });
    });
    for (const role of ["admin", "moderator", "support", "advertising"])
      await withFixture(async (db) => {
        await insertRole(db, id.target, role);
        const rows = await derived(db);
        assert.equal(rows.staff.length, 1);
        assert.equal(rows.audit.length, 1);
        assert.equal(rows.sales.length, 0);
        assert.equal(rows.territories.length, 0);
      });
  },
);

test(
  "plain sales INSERT runs real territory, staff-referral, audit and rep-profile forward chain under admin GUC subject",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await snapshot(db);
      await insertRole(db, id.target, "sales");
      const rows = await derived(db);
      assert.equal(rows.staff.length, 1);
      assert.equal(rows.sales.length, 1);
      assert.equal(rows.territories.length, 1);
      assert.equal(rows.audit.length, 1);
      assert.equal(rows.staff[0].email, "target@example.invalid");
      assert.equal(rows.staff[0].full_name, "Synthetic target");
      assert.match(rows.staff[0].referral_code, /^synthetictar\d{3}$/);
      assert.deepEqual(
        [rows.territories[0].region, rows.territories[0].city, rows.territories[0].is_primary],
        ["Synthetic Region", "Synthetic City", true],
      );
      assert.equal(rows.sales[0].active, true);
      assert.equal(rows.sales[0].accepting_new_clients, true);
      assert.equal(rows.audit[0].actor_id, id.admin);
      assert.notEqual(rows.audit[0].actor_id, id.target);
      assert.equal(rows.audit[0].action, "created");
      assert.equal(rows.audit[0].staff_referral_id, rows.staff[0].id);
      assert.equal(rows.audit[0].details.referral_code, rows.staff[0].referral_code);
      await preserveCatalog(db, before);
    });
  },
);

test(
  "service NULL subject provisioning is permitted in synthetic bypass context and audit actor remains NULL",
  options,
  async () => {
    await withFixture(async (db) => {
      await insertRole(db, id.target, "sales", "service_role", null);
      const rows = await derived(db);
      assert.deepEqual(
        [rows.staff.length, rows.sales.length, rows.territories.length, rows.audit.length],
        [1, 1, 1, 1],
      );
      assert.equal(rows.audit[0].actor_id, null);
      for (const signature of [signatures.code, signatures.territory, signatures.accredit])
        assert.equal(
          observed.functions.find((value) => value.signature === signature).authenticatedExecute,
          false,
        );
      await unchangedFailure(
        db,
        () => actor(db, "authenticated", id.admin, "SELECT public.gen_referral_code('Synthetic')"),
        hasCode("42501"),
      );
      // Direct EXECUTE denial does not prevent the retained real row triggers.
    });
  },
);

test(
  "territory helper preserves existing rows and uses space-trimmed business fallback, not all whitespace normalization",
  options,
  async () => {
    await withFixture(async (db) => {
      await actor(
        db,
        "postgres",
        null,
        "INSERT INTO public.sales_rep_territories(rep_user_id,region,is_primary) VALUES($1,'Existing',false)",
        [id.target],
      );
      const initial = (await derived(db)).territories;
      await insertRole(db, id.target, "sales");
      assert.deepEqual((await derived(db)).territories, initial);
      assert.equal(
        (
          await actor(
            db,
            "service_role",
            null,
            "SELECT * FROM public.auto_setup_sales_rep_territory($1)",
            [id.target],
          )
        ).rows[0].reason,
        "already_has_territories",
      );
    });
    await withFixture(
      async (db) => {
        await insertRole(db, id.target, "sales");
        const row = (await derived(db)).territories[0];
        assert.equal(row.region, "Business Region");
        // SQL TRIM's default removes spaces, not the entire JS whitespace set.
        assert.equal(row.city, "\t");
      },
      {
        profileOverrides: [
          {
            id: id.target,
            signup_region: " ",
            signup_city: "\t",
            business_region: "  Business Region ",
            business_city: " Business City  ",
          },
        ],
      },
    );
    await withFixture(
      async (db) => {
        await insertRole(db, id.target, "sales");
        const row = (await derived(db)).territories[0];
        assert.equal(row.region, "Business Region");
        assert.equal(row.city, "Business City");
      },
      {
        profileOverrides: [
          {
            id: id.target,
            signup_region: " ",
            signup_city: " ",
            business_region: "  Business Region ",
            business_city: " Business City  ",
          },
        ],
      },
    );
  },
);

test(
  "missing projected profile yields email-name referral and rep but no territory; no profile is fabricated",
  options,
  async () => {
    await withFixture(
      async (db) => {
        await insertRole(db, id.target, "sales");
        const rows = await derived(db);
        assert.equal(rows.staff[0].full_name, "target@example.invalid");
        assert.equal(rows.sales.length, 1);
        assert.equal(rows.territories.length, 0);
        assert.equal(
          (await db.query("SELECT id FROM public.profiles WHERE id=$1", [id.target])).rows.length,
          0,
        );
        assert.equal(
          (
            await actor(
              db,
              "service_role",
              null,
              "SELECT * FROM public.auto_setup_sales_rep_territory($1)",
              [id.target],
            )
          ).rows[0].reason,
          "no_signup_area",
        );
      },
      { omitProfiles: [id.target] },
    );
  },
);

test(
  "NULL email skips real referral path without blocking other sales provisioning",
  options,
  async () => {
    await withFixture(async (db) => {
      await insertRole(db, id.nullEmail, "sales");
      const rows = await derived(db, id.nullEmail);
      assert.deepEqual(
        [rows.staff.length, rows.audit.length, rows.sales.length, rows.territories.length],
        [0, 0, 1, 1],
      );
    });
  },
);

test(
  "preexisting inactive staff link returns unchanged instead of reactivating or generating another creation audit",
  options,
  async () => {
    await withFixture(async (db) => {
      await addReferral(db, { user: id.target, active: false });
      const initial = await derived(db);
      await insertRole(db, id.target, "support");
      assert.deepEqual(await derived(db), initial);
    });
  },
);

test(
  "same email links only NULL staff_user_id and does not take over occupied email; link-only UPDATE lacks semantic audit",
  options,
  async () => {
    for (const occupied of [false, true])
      await withFixture(async (db) => {
        const initial = await addReferral(db, {
          user: occupied ? id.other : null,
          email: "TARGET@EXAMPLE.INVALID",
        });
        const auditBefore = (await derived(db)).audit;
        await insertRole(db, id.target, "moderator");
        const current = (
          await db.query("SELECT * FROM public.staff_referrals WHERE id=$1", [initial.id])
        ).rows[0];
        assert.equal(current.staff_user_id, occupied ? id.other : id.target);
        if (!occupied) assert.notDeepEqual(current.updated_at, initial.updated_at);
        assert.deepEqual((await derived(db)).audit, auditBefore);
        assert.equal((await derived(db)).staff.length, occupied ? 0 : 1);
      });
  },
);

test(
  "case-distinct unique emails can both link to one staff user because real staff_user_id index is not unique",
  options,
  async () => {
    await withFixture(async (db) => {
      await addReferral(db, { email: "TARGET@EXAMPLE.INVALID", code: "synthetic-upper" });
      await addReferral(db, { email: "target@example.invalid", code: "synthetic-lower" });
      const audits = (await derived(db)).audit;
      await insertRole(db, id.target, "support");
      assert.equal((await derived(db)).staff.length, 2);
      assert.deepEqual((await derived(db)).audit, audits);
      // Synthetic physically valid state, not a claim about production rows.
    });
  },
);

test(
  "INSERT-only attachments do not provision on role UPDATE or clean up derived rows on DELETE",
  options,
  async () => {
    await withFixture(async (db) => {
      const changed = await actor(
        db,
        "authenticated",
        id.admin,
        "UPDATE public.user_roles SET role='sales' WHERE id=$1 RETURNING id,user_id,role::text",
        [id.roleTarget],
      );
      assert.equal(changed.affectedRows, 1);
      assert.deepEqual(changed.rows, [{ id: id.roleTarget, user_id: id.target, role: "sales" }]);
      assert.equal(
        (await db.query("SELECT role::text FROM public.user_roles WHERE id=$1", [id.roleTarget]))
          .rows[0].role,
        "sales",
      );
      assert.deepEqual(await derived(db), { staff: [], sales: [], territories: [], audit: [] });
    });
    await withFixture(async (db) => {
      await insertRole(db, id.target, "sales");
      const before = await derived(db);
      const result = await actor(
        db,
        "authenticated",
        id.admin,
        "DELETE FROM public.user_roles WHERE user_id=$1 AND role='sales' RETURNING id",
        [id.target],
      );
      assert.equal(result.affectedRows, 1);
      assert.deepEqual(await derived(db), before);
    });
  },
);

test(
  "real enum, NOT NULL, auth FK, role uniqueness and commission CHECK remain enforced with atomic selected rollback",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const [sql, args, code, constraint] of [
        [
          "INSERT INTO public.user_roles(user_id,role) VALUES($1,'owner')",
          [id.target],
          "22P02",
          null,
        ],
        ["INSERT INTO public.user_roles(user_id,role) VALUES($1,NULL)", [id.target], "23502", null],
        [
          "INSERT INTO public.user_roles(user_id,role) VALUES($1,'support')",
          [id.missing],
          "23503",
          "user_roles_user_id_fkey",
        ],
        [
          "INSERT INTO public.user_roles(user_id,role) VALUES($1,'user')",
          [id.target],
          "23505",
          "user_roles_user_id_role_key",
        ],
        [
          "INSERT INTO public.sales_rep_profiles(user_id,commission_rate_override) VALUES($1,1.1)",
          [id.target],
          "23514",
          "sales_rep_profiles_commission_rate_override_check",
        ],
      ])
        await unchangedFailure(
          db,
          () => actor(db, "postgres", null, sql, args),
          hasCode(code, constraint),
        );
    });
  },
);

test(
  "actual audit action NOT NULL failure rolls back earlier territory and staff INSERT without swallowing the error",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec(`CREATE FUNCTION public.lab_staff_audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NOT EXISTS(SELECT 1 FROM public.sales_rep_territories WHERE rep_user_id='${id.target}') OR
         NOT EXISTS(SELECT 1 FROM public.staff_referrals WHERE id=NEW.staff_referral_id) THEN
        RAISE EXCEPTION 'Synthetic prior territory/referral phase absent'; END IF;
      NEW.action:=NULL;RETURN NEW;END $$;
      CREATE TRIGGER lab_staff_audit_fault BEFORE INSERT ON public.staff_referral_audit FOR EACH ROW EXECUTE FUNCTION public.lab_staff_audit_fault()`);
      await unchangedFailure(
        db,
        () => insertRole(db, id.target, "sales"),
        (error) => error.code === "23502" && error.column === "action",
      );
      assert.deepEqual(await derived(db), { staff: [], sales: [], territories: [], audit: [] });
    });
  },
);

test(
  "late real rep auth FK failure follows real territory/referral/audit and rolls the selected statement back",
  options,
  async () => {
    await withFixture(async (db) => {
      await db.exec(`CREATE FUNCTION public.lab_late_sales_fk_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NOT EXISTS(SELECT 1 FROM public.sales_rep_territories WHERE rep_user_id=NEW.user_id) OR
         NOT EXISTS(SELECT 1 FROM public.staff_referrals WHERE staff_user_id=NEW.user_id) OR
         NOT EXISTS(SELECT 1 FROM public.staff_referral_audit WHERE actor_id='${id.admin}' AND action='created') THEN
        RAISE EXCEPTION 'Synthetic earlier real fanout absent'; END IF;
      NEW.user_id:='${id.missing}';RETURN NEW;END $$;
      CREATE TRIGGER lab_late_sales_fk_fault BEFORE INSERT ON public.sales_rep_profiles FOR EACH ROW EXECUTE FUNCTION public.lab_late_sales_fk_fault()`);
      await unchangedFailure(
        db,
        () => insertRole(db, id.target, "sales"),
        hasCode("23503", "sales_rep_profiles_user_id_fkey"),
      );
      assert.deepEqual(await derived(db), { staff: [], sales: [], territories: [], audit: [] });
    });
  },
);

test(
  "staff-domain real accreditation reaches absent partner table, marking an uncomposed boundary rather than a stubbed success",
  options,
  async () => {
    await withFixture(async (db) => {
      await unchangedFailure(
        db,
        () => insertRole(db, id.staffDomain, "moderator"),
        (error) => error.code === "42P01" && /partner_program_partners/.test(error.message),
      );
      assert.deepEqual(await derived(db, id.staffDomain), {
        staff: [],
        sales: [],
        territories: [],
        audit: [],
      });
      assert.equal(
        (await db.query("SELECT pg_catalog.to_regclass('public.partner_program_partners') value"))
          .rows[0].value,
        null,
      );
    });
  },
);

test(
  "nonrow effective grants are recorded separately from row-policy DML denials, without TRUNCATE or trigger experiments",
  options,
  async () => {
    const roleTable = observed.tables.find((value) => value.table === "user_roles");
    for (const role of ["anon", "authenticated"]) {
      const rights = roleTable.rights.find((value) => value.role === role);
      assert.deepEqual([rights.truncate, rights.references, rights.trigger], [true, true, true]);
    }
    assert.match(roleTable.acl, /authenticated=arwdDxtm\/postgres/);
    assert.match(pins.exclusions.nonRow, /effective MAINTAIN absent/);
    // Metadata only: no assertion of hosted reachability, incoming-FK closure,
    // successful TRUNCATE, or client trigger-creation prerequisites. RLS row
    // policies do not turn these recorded grants into SELECT-only privileges.
  },
);
