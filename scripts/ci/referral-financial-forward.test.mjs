// Disposable-db legacy behavior, NOT production/Auth bootstrap or adopted money/actor policy.
import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
import { id } from "./fixtures/platform-role-forward-fixture.mjs";
import {
  withReferrals,
  metadata,
  observed,
  query,
  metadataQuery,
  sourcePins,
  selections,
  ddl,
  functions,
  attachments,
  policies,
  piece,
  catalog,
  snapshot,
  attempt,
  asActor,
} from "./fixtures/referral-financial-forward-fixture.mjs";
const options = { concurrency: false, timeout: 30_000 };
const events = "partner_program_commission_events",
  payouts = "partner_program_payouts";
const rows = async (db, t) =>
  (await db.query("SELECT * FROM public." + t + " ORDER BY to_jsonb(" + t + ")::text")).rows;
const errorCode = (code) => (e) => e.code === code;
const md5 = (s) => createHash("md5").update(s).digest("hex");
async function partner(
  db,
  { code = "synthetic-referral", user = id.sales, active = true, signup = 2, business = 10 } = {},
) {
  return (
    await db.query(
      "INSERT INTO public.partner_program_partners(user_id,referral_code,display_name,active,signup_bounty_php,business_bounty_php) VALUES($1,$2,'Synthetic Partner',$3,$4,$5) RETURNING *",
      [user, code, active, signup, business],
    )
  ).rows[0];
}
async function staff(db, { user = id.sales, active = true, code = "synthetic-staff" } = {}) {
  return (
    await db.query(
      "INSERT INTO public.staff_referrals(staff_user_id,email,full_name,referral_code,active) VALUES($1,'sales@example.invalid','Synthetic Staff',$2,$3) RETURNING *",
      [user, code, active],
    )
  ).rows[0];
}
async function referral(
  db,
  { user = id.target, staffId = null, code = "synthetic-referral" } = {},
) {
  return asActor(
    db,
    "postgres",
    null,
    "INSERT INTO public.user_referrals(user_id,referred_by_staff_id,credited_referral_code,first_referral_code,last_referral_code) VALUES($1,$2,$3,$3,$3) RETURNING *",
    [user, staffId, code],
  );
}
async function award(
  db,
  code = "synthetic-referral",
  type = "user_signup",
  source = "synthetic-source",
) {
  return asActor(db, "service_role", null, "SELECT public.pp_award_bounty($1,$2,$3)", [
    code,
    type,
    source,
  ]);
}
async function unchangedFailure(db, run, code) {
  const before = await snapshot(db);
  await assert.rejects(run, errorCode(code));
  assert.deepEqual(
    await snapshot(db),
    before,
    "failed statement restores all eleven table rows/catalog and caller settings",
  );
}
test("both catalog queries are bounded READ ONLY; no app/Auth data, helper invocation, sequence or mutation", () => {
  for (const sql of [query, metadataQuery]) {
    assert.match(sql, /BEGIN READ ONLY;/);
    assert.match(sql, /SET LOCAL statement_timeout='5000ms';/);
    assert.match(sql, /SET LOCAL lock_timeout='1000ms';/);
    assert.match(sql, /SET LOCAL search_path=pg_catalog,pg_temp;/);
    assert.match(sql, /ROLLBACK;\s*$/);
    const surface = sql.replace(/--[^\n]*/g, "").replace(/'(?:''|[^'])*'/g, "''");
    assert.doesNotMatch(
      surface,
      /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|EXECUTE|COPY|CALL|COMMIT)\b/i,
    );
    assert.doesNotMatch(surface, /\b(?:FROM|JOIN)\s+(?:public|auth|shop_manager)\./i);
    assert.doesNotMatch(surface, /\b(?:public|auth|shop_manager)\.[a-z_]+\s*\(/i);
    assert.doesNotMatch(
      sql,
      /pg_read_file|pg_ls_dir|lo_import|query_to_xml|dblink|nextval|currval|setval|last_value|is_called/,
    );
    assert.match(sql, /\('partner_program_commission_events','partner_program_payouts'\)/);
  }
});
test("two reviewed captures agree on every facet and all 57 structural pieces match preceding hashes", () => {
  assert.equal(metadata.observedAtUtc, "2026-10-15T09:44:45.633371");
  assert.equal(observed.observedAtUtc, "2026-10-15T09:45:26.830475");
  assert.equal(observed.serverVersion, "17.6");
  for (const k of [
    "tables",
    "columns",
    "constraints",
    "indexes",
    "policies",
    "triggers",
    "functions",
    "enums",
  ])
    assert.deepEqual(metadata[k], observed[k]);
  assert.equal(metadata.columns.filter((c) => c.table === events).length, 18);
  assert.equal(metadata.columns.filter((c) => c.table === payouts).length, 12);
  assert.equal(metadata.constraints.length, 12);
  assert.equal(metadata.indexes.length, 6);
  assert.equal(metadata.policies.length, 4);
  assert.equal(observed.pieces.length, 57);
  for (const p of observed.pieces) {
    assert.equal(p.permitted, true);
    assert.equal(p.definition, piece(p.table, p.category, p.name));
  }
  assert.equal(metadata.triggers.length, 1);
  assert.equal(metadata.triggers[0].name, "pp_payouts_updated");
});
test("four retained source files are narrowly selected; functions have real bodies and three real attachments", () => {
  assert.equal(Object.keys(sourcePins).length, 4);
  assert.equal(ddl.length, 9);
  assert.equal(Object.keys(functions).length, 4);
  assert.equal(attachments.length, 3);
  assert.equal(policies.length, 4);
  for (const s of selections ? Object.values(selections) : []) {
    assert.ok(s.firstLine > 0);
    assert.match(s.sha256Lf, /^[a-f0-9]{64}$/);
  }
  assert.match(functions["public.pp_award_bounty(text,text,text)"], /ON CONFLICT DO NOTHING/);
  assert.match(functions["public.tg_auto_assign_sales_rep()"], /role::text = 'sales'/);
  assert.doesNotMatch(functions["public.pp_recompute_payout_total(uuid)"], /WHERE[^;]*status\s*=/);
  assert.match(
    piece(events, "index", "pp_commission_events_source_uniq"),
    /WHERE \(source_ref IS NOT NULL\)/,
  );
});
test(
  "queries execute on an empty disposable catalog and restore transaction/settings",
  options,
  async () => {
    const db = new PGlite();
    try {
      await db.exec("CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role");
      const settings = async () =>
        (
          await db.query(
            "SELECT current_setting('search_path') path,current_setting('statement_timeout') timeout,current_setting('transaction_read_only') readonly",
          )
        ).rows[0];
      const before = await settings();
      for (const sql of [query, metadataQuery]) {
        const result = await db.exec(sql);
        assert.equal(result.length, 6);
        const c = result.find((x) => x.rows[0]?.catalog).rows[0].catalog;
        for (const k of [
          "tables",
          "columns",
          "constraints",
          "indexes",
          "policies",
          "triggers",
          "functions",
          "enums",
        ])
          assert.deepEqual(c[k], []);
        assert.deepEqual(await settings(), before);
      }
    } finally {
      await db.close();
    }
  },
);
test(
  "independent fingerprint and privacy gates deny raw definitions even with an updated expected hash",
  options,
  async () => {
    const db = new PGlite();
    try {
      await db.exec(
        "CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE TABLE public.partner_program_commission_events(source_ref text DEFAULT 'secret-hidden')",
      );
      const expression = "'secret-hidden'::text";
      const hash = md5(expression);
      const marker = "('column','partner_program_commission_events','source_ref',NULL)";
      assert.equal(query.split(marker).length, 2);
      const sql = query.replace(
        marker,
        () => "('column','partner_program_commission_events','source_ref','" + hash + "')",
      );
      const result = await db.exec(sql),
        c = result.find((x) => x.rows[0]?.catalog).rows[0].catalog;
      const p = c.pieces.find((p) => p.name === "source_ref");
      assert.equal(p.definitionMd5, hash);
      assert.equal(p.expectedMd5, hash);
      assert.equal(p.permitted, false);
      assert.equal(p.definition, null);
      assert.equal(JSON.stringify(c).includes("secret-hidden"), false);
      await db.exec(
        "ALTER TABLE public.partner_program_commission_events ALTER COLUMN source_ref SET DEFAULT 'pending'",
      );
      const bad = await db.exec(query),
        denied = bad
          .find((x) => x.rows[0]?.catalog)
          .rows[0].catalog.pieces.find((p) => p.name === "source_ref");
      assert.equal(denied.definitionMd5, md5("'pending'::text"));
      assert.equal(denied.expectedMd5, null);
      assert.equal(denied.permitted, false);
      assert.equal(denied.definition, null);
    } finally {
      await db.close();
    }
  },
);
test(
  "eleven actual public tables retain full financial structure, public function envelopes and all fifteen attachments",
  options,
  async () => {
    await withReferrals(async (db) => {
      const c = await catalog(db);
      assert.equal(c.columns.length, 30);
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::integer n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'",
          )
        ).rows[0].n,
        12,
      );
      // Eleven selected actual tables plus the explicitly synthetic profiles support.
      assert.equal(c.functions.filter((f) => f.signature.startsWith("public.")).length, 6);
    });
  },
);
test(
  "nonempty referral INSERT executes both actual fanouts with default pending bounty and exact sales assignment",
  options,
  async () => {
    await withReferrals(async (db) => {
      const p = await partner(db),
        s = await staff(db);
      await referral(db, { staffId: s.id, code: "  SYNTHETIC-REFERRAL  " });
      const [e] = await rows(db, events),
        [a] = await rows(db, "sales_rep_assignments");
      assert.equal(e.partner_id, p.id);
      assert.equal(e.event_type, "user_signup");
      assert.equal(e.amount_php, "0.00");
      assert.equal(e.commission_php, "2.00");
      assert.equal(e.status, "pending");
      assert.equal(e.source_ref, "signup:" + id.target);
      assert.equal(e.notes, "User sign-up bounty");
      assert.equal(e.payout_id, null);
      assert.equal(a.rep_user_id, id.sales);
      assert.equal(a.subject_id, id.target);
      assert.equal(a.subject_type, "user");
      assert.equal(a.source, "referral");
      assert.equal(a.assigned_by, id.sales);
      assert.equal(a.active, true);
      assert.equal((await rows(db, payouts)).length, 0);
    });
  },
);
test(
  "NULL, blank, unknown and inactive partner codes skip money without blocking referral storage",
  options,
  async () => {
    for (const [code, active] of [
      [null, true],
      [" ", true],
      ["unknown", true],
      ["synthetic-referral", false],
    ]) {
      await withReferrals(async (db) => {
        await partner(db, { active });
        await referral(db, { code });
        assert.equal((await rows(db, events)).length, 0);
        assert.equal((await rows(db, "user_referrals")).length, 1);
        assert.equal((await rows(db, "sales_rep_assignments")).length, 0);
      });
    }
  },
);
test(
  "zero and negative configured signup rates skip the bounty; business helper uses its separate rate",
  options,
  async () => {
    for (const signup of [0, -1]) {
      await withReferrals(async (db) => {
        await partner(db, { signup });
        await referral(db);
        assert.equal((await rows(db, events)).length, 0);
      });
    }
    await withReferrals(async (db) => {
      await partner(db, { signup: 3, business: 17 });
      await award(db, "synthetic-referral", "business_signup", "synthetic-business");
      const [e] = await rows(db, events);
      assert.equal(e.commission_php, "17.00");
      assert.equal(e.notes, "Business sign-up bounty");
    });
  },
);
test(
  "same partner/type/source duplicate and same-code referral UPDATE suppress duplicate ledger writes",
  options,
  async () => {
    await withReferrals(async (db) => {
      await partner(db);
      await referral(db);
      await award(db, "SYNTHETIC-REFERRAL", "user_signup", "signup:" + id.target);
      await asActor(
        db,
        "postgres",
        null,
        "UPDATE public.user_referrals SET credited_referral_code=credited_referral_code WHERE user_id=$1",
        [id.target],
      );
      assert.equal((await rows(db, events)).length, 1);
    });
  },
);
test(
  "recrediting to another partner awards twice for one signup; NULL source is outside the unique index",
  options,
  async () => {
    await withReferrals(async (db) => {
      const a = await partner(db),
        b = await partner(db, { code: "synthetic-second", user: id.other });
      await referral(db);
      await asActor(
        db,
        "postgres",
        null,
        "UPDATE public.user_referrals SET credited_referral_code='synthetic-second' WHERE user_id=$1",
        [id.target],
      );
      assert.deepEqual(
        new Set((await rows(db, events)).map((e) => e.partner_id)),
        new Set([a.id, b.id]),
      );
      await award(db, "synthetic-referral", "user_signup", null);
      await award(db, "synthetic-referral", "user_signup", null);
      assert.equal((await rows(db, events)).filter((e) => e.source_ref === null).length, 2);
    });
  },
);
test(
  "case-sensitive partner UNIQUE permits case variants while award lookup lowercases with unordered LIMIT 1",
  options,
  async () => {
    await withReferrals(async (db) => {
      const a = await partner(db, { code: "Synthetic-Case" }),
        b = await partner(db, { code: "synthetic-case", user: id.other });
      await award(db, "SYNTHETIC-CASE");
      const [e] = await rows(db, events);
      assert.ok([a.id, b.id].includes(e.partner_id));
      assert.equal((await rows(db, events)).length, 1);
    });
  },
);
test(
  "assignment requires exact sales role; junior/senior/manager alone do not qualify",
  options,
  async () => {
    for (const role of ["sales_junior", "sales_senior", "sales_manager"]) {
      await withReferrals(async (db) => {
        await asActor(
          db,
          "postgres",
          null,
          "INSERT INTO public.user_roles(user_id,role) VALUES($1,$2::public.app_role)",
          [id.target, role],
        );
        const s = await staff(db, { user: id.target });
        await referral(db, { user: id.other, staffId: s.id, code: null });
        assert.equal((await rows(db, "sales_rep_assignments")).length, 0);
      });
    }
  },
);
test(
  "inactive staff/profile and not accepting clients do not prevent legacy assignment",
  options,
  async () => {
    await withReferrals(async (db) => {
      const s = await staff(db, { active: false });
      await db.query(
        "INSERT INTO public.sales_rep_profiles(user_id,active,accepting_new_clients) VALUES($1,false,false)",
        [id.sales],
      );
      await referral(db, { staffId: s.id, code: null });
      assert.equal((await rows(db, "sales_rep_assignments")).length, 1);
    });
  },
);
test(
  "existing active assignment wins conflict; changing referral staff later does not retarget assignment",
  options,
  async () => {
    await withReferrals(async (db) => {
      const s = await staff(db);
      await db.query(
        "INSERT INTO public.sales_rep_assignments(rep_user_id,subject_type,subject_id) VALUES($1,'user',$2)",
        [id.other, id.target],
      );
      await referral(db, { staffId: s.id, code: null });
      const [a] = await rows(db, "sales_rep_assignments");
      assert.equal(a.rep_user_id, id.other);
      assert.equal(a.source, "manual");
    });
    await withReferrals(async (db) => {
      const s = await staff(db);
      await referral(db, { staffId: null, code: null });
      await asActor(
        db,
        "postgres",
        null,
        "UPDATE public.user_referrals SET referred_by_staff_id=$1 WHERE user_id=$2",
        [s.id, id.target],
      );
      assert.equal((await rows(db, "sales_rep_assignments")).length, 0);
    });
  },
);
test(
  "genuine invalid user/staff FK, duplicate referral user and bounty numeric overflow roll back unchanged",
  options,
  async () => {
    await withReferrals(async (db) => {
      await partner(db);
      await unchangedFailure(db, () => referral(db, { user: id.missing }), "23503");
      await unchangedFailure(db, () => referral(db, { staffId: id.missing }), "23503");
      await referral(db);
      await unchangedFailure(db, () => referral(db), "23505");
    });
    await withReferrals(async (db) => {
      await partner(db, { signup: "10000000000" });
      await unchangedFailure(db, () => referral(db), "22003");
    });
  },
);
test(
  "late assignment NOT NULL fault rolls back earlier bounty and referral; restored default permits recovery",
  options,
  async () => {
    await withReferrals(async (db) => {
      await partner(db);
      const s = await staff(db);
      await db.exec("ALTER TABLE public.sales_rep_assignments ALTER COLUMN id SET DEFAULT NULL");
      try {
        await unchangedFailure(db, () => referral(db, { staffId: s.id }), "23502");
      } finally {
        await db.exec(
          "ALTER TABLE public.sales_rep_assignments ALTER COLUMN id SET DEFAULT gen_random_uuid()",
        );
      }
      assert.equal((await rows(db, events)).length, 0);
      await referral(db, { staffId: s.id });
      assert.equal((await rows(db, events)).length, 1);
      assert.equal((await rows(db, "sales_rep_assignments")).length, 1);
    });
  },
);
test(
  "direct anonymous/authenticated helper invocation and ledger writes denied under reproduced ACL/RLS",
  options,
  async () => {
    await withReferrals(async (db) => {
      const p = await partner(db);
      for (const role of ["anon", "authenticated"]) {
        for (const [sql, args] of [
          [
            "SELECT public.pp_award_bounty($1,$2,$3)",
            ["synthetic-referral", "user_signup", "synthetic-source"],
          ],
          ["SELECT public.pp_recompute_payout_total($1)", [id.missing]],
          [
            "INSERT INTO public.partner_program_commission_events(partner_id,event_type) VALUES($1,'user_signup')",
            [p.id],
          ],
          ["INSERT INTO public.partner_program_payouts(partner_id) VALUES($1)", [p.id]],
        ])
          await unchangedFailure(db, () => asActor(db, role, id.ordinary, sql, args), "42501");
      }
    });
  },
);
test(
  "payout sum includes pending and clawed-back events, and permits cross-partner links/negative ledger amounts",
  options,
  async () => {
    await withReferrals(async (db) => {
      const p = await partner(db),
        other = await partner(db, { user: id.other, code: "synthetic-other" });
      const payout = (
        await db.query(
          "INSERT INTO public.partner_program_payouts(partner_id,updated_at) VALUES($1,'2000-01-01') RETURNING *",
          [p.id],
        )
      ).rows[0];
      for (const [status, amount] of [
        ["pending", 7],
        ["clawed_back", -2],
        ["approved", 11],
        ["paid", 5],
      ])
        await db.query(
          "INSERT INTO public.partner_program_commission_events(partner_id,event_type,commission_php,status,payout_id) VALUES($1,'user_signup',$2,$3,$4)",
          [other.id, amount, status, payout.id],
        );
      await asActor(db, "service_role", null, "SELECT public.pp_recompute_payout_total($1)", [
        payout.id,
      ]);
      const [row] = await rows(db, payouts);
      assert.equal(row.amount_php, "21.00");
      assert.equal(row.status, "pending");
      assert.notEqual(row.updated_at, payout.updated_at);
      assert.equal(row.paid_at, null);
    });
  },
);
test(
  "payout/Auth foreign keys are genuine; deleting lab payout sets event link NULL, not event deletion",
  options,
  async () => {
    await withReferrals(async (db) => {
      const p = await partner(db);
      for (const sql of [
        "INSERT INTO public.partner_program_payouts(partner_id,created_by) VALUES($1,$2)",
        "INSERT INTO public.partner_program_payouts(partner_id,paid_by) VALUES($1,$2)",
        "INSERT INTO public.partner_program_commission_events(partner_id,event_type,payout_id) VALUES($1,'user_signup',$2)",
        "INSERT INTO public.partner_program_commission_events(partner_id,event_type,approved_by) VALUES($1,'user_signup',$2)",
        "INSERT INTO public.partner_program_commission_events(partner_id,event_type,clawed_back_by) VALUES($1,'user_signup',$2)",
      ])
        await unchangedFailure(
          db,
          () => attempt(db, () => db.query(sql, [p.id, id.missing])),
          "23503",
        );
      const payout = (
        await db.query(
          "INSERT INTO public.partner_program_payouts(partner_id) VALUES($1) RETURNING id",
          [p.id],
        )
      ).rows[0];
      await db.query(
        "INSERT INTO public.partner_program_commission_events(partner_id,event_type,payout_id) VALUES($1,'user_signup',$2)",
        [p.id, payout.id],
      );
      await db.query("DELETE FROM public.partner_program_payouts WHERE id=$1", [payout.id]);
      assert.equal((await rows(db, events))[0].payout_id, null);
    });
  },
);
test(
  "partner intent nonempty loop remains a real missing dependency, never stubbed or called successful",
  options,
  async () => {
    await withReferrals(async (db) => {
      const p = await partner(db);
      await referral(db);
      await unchangedFailure(
        db,
        () =>
          asActor(
            db,
            "postgres",
            null,
            "UPDATE public.partner_program_partners SET active=false WHERE id=$1",
            [p.id],
          ),
        "42883",
      );
    });
  },
);
test(
  "postflight rejects financial FK/default/ACL and forward attachment tampering before outer rollback hides drift",
  options,
  async () => {
    for (const [sql, pattern] of [
      [
        "ALTER TABLE public.partner_program_commission_events DROP CONSTRAINT partner_program_commission_events_payout_id_fkey",
        /12 critical financial constraints/,
      ],
      [
        "ALTER TABLE public.partner_program_commission_events ALTER COLUMN commission_php SET DEFAULT 99",
        /exact financial structure/,
      ],
      [
        "GRANT EXECUTE ON FUNCTION public.pp_award_bounty(text,text,text) TO authenticated",
        /six exact public full function envelopes/,
      ],
      [
        "DROP TRIGGER trg_user_referrals_auto_assign_rep ON public.user_referrals",
        /fourteen parent\/referral attachments/,
      ],
      [
        "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$",
        /unchanged synthetic Auth uid envelope/,
      ],
    ])
      await assert.rejects(() => withReferrals((db) => db.exec(sql)), pattern);
  },
);
