// DISPOSABLE UNCHANGED-SOURCE CHARACTERIZATION, not adopted owner/delegation
// authority, production incidents, a guard/fix or live API/JWT acceptance.
// Actual selected claim/audit DDL, constraints, helpers and attachments are
// fixture-pinned. Reduced businesses/auth/roles and session settings are synthetic.
// There is no native-shop/staff bridge in this fixture and no native sync claim.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  withFixture,
  actor,
  snapshot,
  id,
  functions,
  sources,
  observed,
} from "./fixtures/native-ownership-claim-fixture.mjs";

const options = { concurrency: false, timeout: 30_000 };
const signature = "public.approve_business_claim(uuid,boolean)";
const claimSql = "SELECT public.approve_business_claim($1,$2) acknowledgement";
const sourceRoot = new URL("../../", import.meta.url);
const sha = (value) => createHash("sha256").update(value).digest("hex");
function pinnedCaller(path, hash) {
  const text = fs.readFileSync(new URL(path, sourceRoot), "utf8").replaceAll("\r\n", "\n");
  assert.equal(sha(text), hash, `${path}: LF-only source pin`);
  return text;
}
const reviewCaller = pinnedCaller(
  "src/lib/business-claims.functions.ts",
  "cc0960e0d7eb1ee065d405f112a9d3a2e7f5d03a57ee80e9908f0901735b52d6",
);
function sourceFunction(name) {
  const found = Object.values(functions).filter(
    (value) => typeof value === "string" && value.includes(`FUNCTION public.${name}(`),
  );
  assert.equal(found.length, 1, `one selected actual ${name} declaration`);
  return found[0];
}
function hasCode(code, constraint) {
  return (error) => error.code === code && (!constraint || error.constraint === constraint);
}
async function unchangedFailure(db, run, check) {
  const before = await snapshot(db);
  await assert.rejects(run(), check);
  assert.deepEqual(await snapshot(db), before);
}
async function business(db, targetId = id.business) {
  return (
    await db.query("SELECT id,owner_id,claim_state,name FROM public.businesses WHERE id=$1", [
      targetId,
    ])
  ).rows[0];
}
async function claim(db, targetId = id.claim) {
  return (
    await db.query(
      `SELECT id,business_id,claimant_user_id,kind,status,reviewer_user_id,reviewer_notes,
        decided_at,created_at,updated_at FROM public.business_claim_requests WHERE id=$1`,
      [targetId],
    )
  ).rows[0];
}
async function audit(db, targetId = id.claim) {
  return (
    await db.query(
      `SELECT actor_user_id,action,notes,details FROM public.business_claim_audit
        WHERE claim_id=$1 ORDER BY created_at,id`,
      [targetId],
    )
  ).rows;
}
async function approve(
  db,
  { role = "service_role", subject = null, auto = false, targetId = id.claim } = {},
) {
  return actor(db, role, subject, claimSql, [targetId, auto]);
}
async function catalogBefore(db) {
  const value = await snapshot(db);
  assert.ok(value.catalog && typeof value.catalog === "object", "fixture exposes selected catalog");
  return value.catalog;
}
async function preservedCatalog(db, before) {
  assert.deepEqual(await catalogBefore(db), before);
}
function approvalRows(rows) {
  return rows.filter((row) => row.action === "approved" || row.action === "auto_approved");
}

test(
  "actual source and unchanged server caller distinguish void approval, missing affected-row checks and separate reviewer stamping",
  options,
  () => {
    const source = sourceFunction("approve_business_claim");
    assert.match(source, /RETURNS void/);
    assert.match(source, /WHERE id = v_bid AND owner_id IS NULL/);
    assert.match(source, /IF v_kind = 'transfer' THEN/);
    assert.match(source, /VALUES \(_claim_id, NULL, 'approved'/);
    assert.doesNotMatch(
      source,
      /GET DIAGNOSTICS|ROW_COUNT|auth\.uid\(|can_moderate\(|current_user/i,
    );
    assert.match(
      sourceFunction("tg_claim_audit_status"),
      /COALESCE\(NEW\.reviewer_user_id, auth\.uid\(\)\)/,
    );
    const review = reviewCaller.slice(reviewCaller.indexOf("export const reviewBusinessClaim"));
    const rpc = review.indexOf('supabaseAdmin.rpc("approve_business_claim"');
    const stamp = review.indexOf(
      ".update({ reviewer_user_id: userId, reviewer_notes: data.notes ?? null })",
    );
    assert.ok(rpc >= 0 && stamp > rpc, "manual reviewer update is a later awaited request");
    assert.match(review.slice(rpc, stamp), /if \(error\) throw/);
    assert.match(review.slice(stamp, stamp + 145), /\.eq\("id", data\.id\)/);
  },
);

test(
  "dated direct EXECUTE ACL is distinct from source-only grants and original human authorization",
  options,
  async () => {
    const historicalAcl = Object.values(sources).filter(
      (value) =>
        typeof value === "string" &&
        value.includes("REVOKE ALL ON FUNCTION public.approve_business_claim(uuid, boolean)"),
    );
    assert.equal(historicalAcl.length, 1, "one pinned original source grant section");
    assert.match(historicalAcl[0], /FROM PUBLIC, anon, authenticated/);
    assert.match(
      historicalAcl[0],
      /GRANT EXECUTE ON FUNCTION public\.approve_business_claim\(uuid, boolean\) TO service_role/,
    );
    await withFixture(async (db) => {
      const saved = observed.functions.find((value) => value.signature === signature);
      assert.ok(saved, "exact dated approve signature exists");
      assert.equal(saved.authenticatedExecute, false);
      assert.equal(saved.anonExecute, false);
      assert.equal(saved.serviceExecute, true);
      assert.equal(saved.postgresExecute, true);
      const selected = (
        await db.query(
          `SELECT r.role_name,
      pg_catalog.has_function_privilege(r.role_name::pg_catalog.name,$1,'EXECUTE') allowed
      FROM pg_catalog.unnest(ARRAY['anon','authenticated','postgres','service_role']) r(role_name)
      ORDER BY r.role_name`,
          [signature],
        )
      ).rows;
      assert.deepEqual(selected, [
        { role_name: "anon", allowed: false },
        { role_name: "authenticated", allowed: false },
        { role_name: "postgres", allowed: true },
        { role_name: "service_role", allowed: true },
      ]);
      for (const role of ["anon", "authenticated"])
        for (const subject of [id.claimant, id.moderator, null])
          await unchangedFailure(db, () => approve(db, { role, subject }), hasCode("42501"));
      const roleFlags = (
        await db.query(`SELECT rolname,rolsuper,rolbypassrls
      FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated') ORDER BY rolname`)
      ).rows;
      assert.deepEqual(roleFlags, [
        { rolname: "anon", rolsuper: false, rolbypassrls: false },
        { rolname: "authenticated", rolsuper: false, rolbypassrls: false },
      ]);
    });
  },
);

test(
  "ordinary service/SQL-owner approval changes stored ownership and status, not a trusted-human contract",
  options,
  async () => {
    for (const role of ["service_role", "postgres"])
      await withFixture(async (db) => {
        const before = await catalogBefore(db);
        assert.deepEqual(await audit(db), [], "seed occurs before source audit attachments");
        const response = await approve(db, { role });
        assert.equal(response.rows.length, 1, "SQL void result is not row-change confirmation");
        assert.equal((await business(db)).owner_id, id.claimant);
        assert.equal((await business(db)).claim_state, "owned");
        const current = await claim(db);
        assert.equal(current.status, "approved");
        assert.notEqual(current.decided_at, null);
        assert.equal(current.reviewer_user_id, null);
        assert.deepEqual(await audit(db), [
          {
            actor_user_id: null,
            action: "approved",
            notes: null,
            details: { from: "pending", to: "approved" },
          },
        ]);
        await preservedCatalog(db, before);
      });
  },
);

test(
  "auto flag changes the status/audit label but performs no contact verification inside SQL",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await catalogBefore(db);
      await approve(db, { auto: true });
      assert.equal((await business(db)).owner_id, id.claimant);
      assert.equal((await claim(db)).status, "auto_approved");
      assert.deepEqual(await audit(db), [
        {
          actor_user_id: null,
          action: "auto_approved",
          notes: null,
          details: { from: "pending", to: "auto_approved" },
        },
      ]);
      await preservedCatalog(db, before);
    });
  },
);

test(
  "owned ordinary claim marks approved and rejects siblings even when the ownership UPDATE changes zero rows",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const before = await catalogBefore(db);
        const original = await business(db);
        await approve(db, { subject: id.claimant });
        assert.deepEqual(
          await business(db),
          original,
          "owner guard is not called for zero matching rows",
        );
        assert.equal((await claim(db)).status, "approved");
        assert.equal((await claim(db, id.sibling)).status, "rejected");
        assert.deepEqual(await audit(db), [
          {
            actor_user_id: id.claimant,
            action: "approved",
            notes: null,
            details: { from: "pending", to: "approved" },
          },
        ]);
        await preservedCatalog(db, before);
        const decidedState = await snapshot(db);
        const zeroTransfer = await actor(
          db,
          "postgres",
          null,
          "UPDATE public.businesses SET owner_id=$1 WHERE id=$2 RETURNING id",
          [id.claimant, id.missing],
        );
        assert.deepEqual(zeroTransfer.rows, []);
        assert.equal(zeroTransfer.affectedRows, 0);
        assert.deepEqual(await snapshot(db), decidedState);
        // SQL-only zero-row control; no browser request or native sync is exercised.
      },
      { owner: id.previousOwner },
    );
  },
);

test(
  "transfer overwrites prior ownership and records both status audit and an explicit NULL-actor transfer entry",
  options,
  async () => {
    await withFixture(
      async (db) => {
        const before = await catalogBefore(db);
        await approve(db);
        assert.equal((await business(db)).owner_id, id.claimant);
        assert.equal((await claim(db)).status, "approved");
        const rows = await audit(db);
        assert.equal(rows.length, 2);
        assert.ok(
          rows.some(
            (row) =>
              row.actor_user_id === null &&
              row.notes === null &&
              row.details.from === "pending" &&
              row.details.to === "approved",
          ),
        );
        assert.ok(
          rows.some(
            (row) =>
              row.actor_user_id === null &&
              row.notes === "Ownership transfer approved" &&
              row.details.previous_owner_id === id.previousOwner &&
              row.details.new_owner_id === id.claimant,
          ),
        );
        await preservedCatalog(db, before);
      },
      { owner: id.previousOwner, kind: "transfer" },
    );
  },
);

test(
  "rejected and already-decided claims are not an approval precondition; repeated transfers add explicit audit entries",
  options,
  async () => {
    await withFixture(
      async (db) => {
        await approve(db);
        assert.equal((await business(db)).owner_id, id.claimant);
        assert.equal((await claim(db)).status, "approved");
        assert.deepEqual(
          (await audit(db)).map((row) => row.details),
          [{ from: "rejected", to: "approved" }],
        );
        const decided = await claim(db);
        await approve(db);
        assert.equal(
          (await audit(db)).length,
          1,
          "no second status-transition audit for unchanged approved status",
        );
        assert.equal((await claim(db)).status, decided.status);
      },
      { status: "rejected" },
    );
    await withFixture(
      async (db) => {
        await approve(db);
        assert.equal((await audit(db)).length, 2);
        await approve(db);
        const rows = await audit(db);
        assert.equal(rows.length, 3, "explicit transfer audit is not idempotent");
        assert.equal(rows.filter((row) => row.details.from !== undefined).length, 1);
        assert.equal(rows.filter((row) => row.notes === "Ownership transfer approved").length, 2);
      },
      { owner: id.previousOwner, kind: "transfer" },
    );
  },
);

test(
  "only pending same-business siblings are rejected and noted; another business claim is untouched",
  options,
  async () => {
    await withFixture(async (db) => {
      const otherBefore = await claim(db, id.otherClaim);
      await approve(db);
      const sibling = await claim(db, id.sibling);
      assert.equal(sibling.status, "rejected");
      assert.match(sibling.reviewer_notes, /Auto-rejected: another claim approved\./);
      assert.notEqual(sibling.decided_at, null);
      assert.deepEqual(await audit(db, id.sibling), [
        {
          actor_user_id: null,
          action: "rejected",
          notes: sibling.reviewer_notes,
          details: { from: "pending", to: "rejected" },
        },
      ]);
      assert.deepEqual(await claim(db, id.otherClaim), otherBefore);
      assert.deepEqual(await audit(db, id.otherClaim), []);
    });
  },
);

test(
  "stored reviewer wins over the session setting, while unstamped approval records NULL under the server-style call",
  options,
  async () => {
    await withFixture(
      async (db) => {
        await approve(db, { subject: id.moderator });
        const rows = approvalRows(await audit(db));
        assert.equal(rows.length, 1);
        assert.equal(rows[0].actor_user_id, id.stranger);
        assert.equal((await claim(db)).reviewer_user_id, id.stranger);
      },
      { reviewer: id.stranger },
    );
    await withFixture(async (db) => {
      await approve(db);
      assert.equal(approvalRows(await audit(db))[0].actor_user_id, null);
      assert.equal((await claim(db)).reviewer_user_id, null);
    });
  },
);

test(
  "manual reviewer stamping is a separate committed statement and cannot retroactively attribute the approval audit",
  options,
  async () => {
    await withFixture(async (db) => {
      await approve(db);
      const approval = structuredClone(approvalRows(await audit(db)));
      await actor(
        db,
        "service_role",
        null,
        "UPDATE public.business_claim_requests SET reviewer_user_id=$1,reviewer_notes=$2 WHERE id=$3 RETURNING id",
        [id.moderator, "Reviewed later", id.claim],
      );
      assert.equal((await claim(db)).reviewer_user_id, id.moderator);
      assert.deepEqual(approvalRows(await audit(db)), approval);
      assert.deepEqual(
        (await audit(db)).filter((row) => row.action === "reviewer_note"),
        [
          {
            actor_user_id: id.moderator,
            action: "reviewer_note",
            notes: "Reviewed later",
            details: {},
          },
        ],
      );
      // This is a source-pinned two-request SQL analogue, NOT execution of the handler.
    });
  },
);

test(
  "an unsuccessful later reviewer request leaves the earlier owner/status/audit decision committed",
  options,
  async () => {
    await withFixture(async (db) => {
      await approve(db);
      const decided = await snapshot(db);
      await unchangedFailure(
        db,
        () =>
          actor(
            db,
            "service_role",
            null,
            "UPDATE public.business_claim_requests SET reviewer_user_id=$1,status='invalid' WHERE id=$2",
            [id.moderator, id.claim],
          ),
        hasCode("23514", "business_claim_requests_status_check"),
      );
      assert.deepEqual(await snapshot(db), decided);
      assert.equal((await business(db)).owner_id, id.claimant);
      assert.equal((await claim(db)).reviewer_user_id, null);
      assert.equal(approvalRows(await audit(db))[0].actor_user_id, null);
    });
  },
);

test(
  "the actual direct protected-field guard distinguishes nonmoderator subjects from NULL/moderator bypass",
  options,
  async () => {
    await withFixture(async (db) => {
      await unchangedFailure(
        db,
        () =>
          actor(
            db,
            "postgres",
            id.claimant,
            "UPDATE public.businesses SET owner_id=$1 WHERE id=$2",
            [id.claimant, id.business],
          ),
        (error) =>
          error.code === "P0001" && error.message === "Cannot modify protected business fields",
      );
      await unchangedFailure(
        db,
        () => approve(db, { subject: id.claimant }),
        (error) =>
          error.code === "P0001" && error.message === "Cannot modify protected business fields",
      );
      for (const [subject, newOwner] of [
        [null, id.claimant],
        [id.moderator, id.previousOwner],
      ]) {
        const result = await actor(
          db,
          "postgres",
          subject,
          "UPDATE public.businesses SET owner_id=$1 WHERE id=$2 RETURNING id",
          [newOwner, id.business],
        );
        assert.deepEqual(result.rows, [{ id: id.business }]);
        assert.equal((await business(db)).owner_id, newOwner);
      }
      // SQL-owner controls isolate the unchanged guard, not complete businesses RLS.
    });
  },
);

test(
  "missing claims and actual claim/audit CHECK/FK failures roll back without altering selected state",
  options,
  async () => {
    await withFixture(async (db) => {
      await unchangedFailure(
        db,
        () => approve(db, { targetId: id.missing }),
        (error) => error.code === "P0001" && error.message === "Claim not found",
      );
      for (const [sql, args, code, constraint] of [
        [
          "UPDATE public.business_claim_requests SET kind='unknown' WHERE id=$1",
          [id.claim],
          "23514",
          "business_claim_requests_kind_check",
        ],
        [
          "UPDATE public.business_claim_requests SET contact_method='unknown' WHERE id=$1",
          [id.claim],
          "23514",
          "business_claim_requests_contact_method_check",
        ],
        [
          "UPDATE public.business_claim_requests SET business_id=$1 WHERE id=$2",
          [id.missing, id.claim],
          "23503",
          "business_claim_requests_business_id_fkey",
        ],
        [
          "INSERT INTO public.business_claim_audit(claim_id,action) VALUES($1,'invalid')",
          [id.claim],
          "23514",
          "business_claim_audit_action_check",
        ],
        [
          "INSERT INTO public.business_claim_audit(claim_id,action) VALUES($1,'approved')",
          [id.missing],
          "23503",
          "business_claim_audit_claim_id_fkey",
        ],
      ])
        await unchangedFailure(
          db,
          () => actor(db, "service_role", null, sql, args),
          hasCode(code, constraint),
        );
    });
  },
);

test(
  "a genuine late explicit-transfer audit CHECK failure rolls back earlier ownership/status/status-audit writes",
  options,
  async () => {
    await withFixture(
      async (db) => {
        // Synthetic instrumentation selects only the later explicit transfer entry;
        // the actual selected action CHECK remains intact and supplies the failure.
        await db.exec(`CREATE FUNCTION public.lab_late_transfer_audit_fault() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.notes='Ownership transfer approved' THEN
          IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id='${id.business}' AND owner_id='${id.claimant}')
            OR NOT EXISTS(SELECT 1 FROM public.business_claim_requests WHERE id='${id.claim}' AND status='approved')
            OR NOT EXISTS(SELECT 1 FROM public.business_claim_audit WHERE claim_id='${id.claim}' AND action='approved' AND details->>'to'='approved') THEN
            RAISE EXCEPTION 'Synthetic late audit prerequisites not reached' USING ERRCODE='P0001';
          END IF;
          NEW.action := 'synthetic_invalid_action';
        END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER lab_late_transfer_audit_fault BEFORE INSERT ON public.business_claim_audit
        FOR EACH ROW EXECUTE FUNCTION public.lab_late_transfer_audit_fault()`);
        await unchangedFailure(
          db,
          () => approve(db),
          hasCode("23514", "business_claim_audit_action_check"),
        );
        assert.equal((await business(db)).owner_id, id.previousOwner);
        assert.equal((await claim(db)).status, "pending");
        assert.deepEqual(await audit(db), []);
        await db.exec(
          "DROP TRIGGER lab_late_transfer_audit_fault ON public.business_claim_audit; DROP FUNCTION public.lab_late_transfer_audit_fault()",
        );
        await approve(db);
        assert.equal((await business(db)).owner_id, id.claimant);
        assert.equal(
          (await audit(db)).length,
          2,
          "removing instrumentation restores actual-source behavior",
        );
      },
      { owner: id.previousOwner, kind: "transfer" },
    );
  },
);
