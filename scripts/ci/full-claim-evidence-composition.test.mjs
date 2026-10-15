// Full-table retained behavior, NOT an approved claim/ownership protocol.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  withClaims,
  observed,
  functions,
  tables,
  signatures,
  attachments,
  excludedBusinessAttachments,
  pins,
  snapshot,
  data,
  attempt,
  asSettings,
  signup,
  id,
  labSequenceState,
} from "./fixtures/full-claim-evidence-fixture.mjs";
const options = { concurrency: false, timeout: 30_000 };
const rows = async (db, t) =>
  (await db.query("SELECT * FROM public." + t + " t ORDER BY to_jsonb(t)::text")).rows;
const profile = async (db, user = id(2)) =>
  (await db.query("SELECT * FROM public.profiles WHERE id=$1", [user])).rows[0];
const business = async (db) => (await rows(db, "businesses"))[0];
async function setup(db, { owner = null } = {}) {
  for (const n of [1, 2, 3])
    await signup(db, {
      user: id(n),
      email: "synthetic-claim-user-" + n + "@example.invalid",
      metadata: { signup_intent: "buyer", full_name: "Synthetic Claim User " + n },
    });
  await db.exec(
    "INSERT INTO public.business_types(slug,label) VALUES('synthetic','Synthetic Type')",
  );
  await db.query(
    "INSERT INTO public.businesses(id,slug,name,type_slug,owner_id) VALUES($1,'synthetic-claim-business','Synthetic Business','synthetic',$2)",
    [id(101), owner],
  );
}
const claim = (
  db,
  { claimId = id(201), user = id(2), kind = "claim", status = "pending", reviewer = null } = {},
) =>
  db.query(
    "INSERT INTO public.business_claim_requests(id,business_id,claimant_user_id,contact_method,kind,status,reviewer_user_id) VALUES($1,$2,$3,'document',$4,$5,$6) RETURNING *",
    [claimId, id(101), user, kind, status, reviewer],
  );
const approve = (db, claimId = id(201), auto = false) =>
  db.query("SELECT public.approve_business_claim($1,$2)", [claimId, auto]);
const evidence = (
  db,
  {
    evidenceId = id(301),
    claimId = id(201),
    uploader = id(2),
    size = "12",
    path = "lab/not-uploaded.txt",
  } = {},
) =>
  db.query(
    "INSERT INTO public.business_claim_evidence(id,claim_id,uploader_user_id,evidence_type,file_name,file_size,mime_type,storage_path) VALUES($1,$2,$3,'other','synthetic.txt',$4,'text/plain',$5) RETURNING *",
    [evidenceId, claimId, uploader, size, path],
  );
async function unchangedFailure(db, run, code, constraint) {
  const before = await snapshot(db);
  await assert.rejects(
    () => attempt(db, run),
    (e) => e.code === code && (!constraint || e.constraint === constraint),
  );
  assert.equal(await snapshot(db), before, "all 24 public tables/Auth rows restored");
}

test("full foundation/source/test pins and dated reviewed metadata are immutable", () => {
  const root = new URL("../../", import.meta.url);
  for (const [p, hash] of Object.entries(pins)) {
    const s = fs.readFileSync(new URL(p, root), "utf8").replaceAll("\r\n", "\n");
    assert.equal(createHash("sha256").update(s).digest("hex"), hash, p);
  }
  assert.deepEqual(
    [
      tables.length,
      signatures.length,
      Object.keys(functions).length,
      attachments.length,
      excludedBusinessAttachments.length,
    ],
    [24, 44, 6, 7, 7],
  );
  assert.deepEqual(
    [
      observed.tables.length,
      observed.columns.length,
      observed.constraints.length,
      observed.indexes.length,
      observed.policies.length,
      observed.triggers.length,
      observed.functions.length,
    ],
    [3, 31, 11, 10, 8, 4, 8],
  );
});

test(
  "full actual schema/function/provider/attachment guards survive composition and original defaults",
  options,
  async () => {
    await withClaims(async (db, guard) => {
      assert.equal(Object.keys(await data(db)).length, 25);
      const counts = (
        await db.query(
          "SELECT (SELECT count(*)::int FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped) columns,(SELECT count(*)::int FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND k.contype<>'n') constraints,(SELECT count(*)::int FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') indexes",
        )
      ).rows[0];
      assert.deepEqual(counts, { columns: 378, constraints: 89, indexes: 91 });
      await guard();
    });
  },
);

test(
  "actual unclaimed approval reaches full business owner/profile intent/admin audit/claim audit and sibling rejection",
  options,
  async () => {
    await withClaims(async (db) => {
      await setup(db);
      await claim(db);
      await claim(db, { claimId: id(202), user: id(3) });
      await approve(db);
      assert.deepEqual(
        [(await business(db)).owner_id, (await business(db)).claim_state],
        [id(2), "owned"],
      );
      assert.equal((await profile(db)).signup_intent, "business");
      const claims = await rows(db, "business_claim_requests");
      assert.equal(claims.find((c) => c.id === id(201)).status, "approved");
      assert.equal(claims.find((c) => c.id === id(202)).status, "rejected");
      const audit = (await rows(db, "business_claim_audit")).find(
        (a) => a.claim_id === id(201) && a.action === "approved",
      );
      assert.equal(
        audit.actor_user_id,
        null,
        "service-style missing request subject is not original reviewer proof",
      );
      const intent = (await rows(db, "admin_audit_log")).find(
        (a) => a.target_user_id === id(2) && a.new_value === "business",
      );
      assert.equal(intent.actor_id, id(2), "retained intent still substitutes target as actor");
    });
  },
);

test(
  "actual occupied-owner claim reports approved and rejects siblings despite zero ownership mutation",
  options,
  async () => {
    await withClaims(async (db) => {
      await setup(db, { owner: id(1) });
      await claim(db);
      await claim(db, { claimId: id(202), user: id(3) });
      await approve(db);
      assert.equal((await business(db)).owner_id, id(1));
      assert.equal((await profile(db)).signup_intent, "buyer");
      assert.equal(
        (await rows(db, "business_claim_requests")).find((c) => c.id === id(201)).status,
        "approved",
      );
      assert.equal(
        (await rows(db, "business_claim_requests")).find((c) => c.id === id(202)).status,
        "rejected",
      );
    });
  },
);

for (const status of ["rejected", "approved", "auto_approved"])
  test(
    "retained approval ignores nonpending " + status + " status; no claim-attempt revision fence",
    options,
    async () => {
      await withClaims(async (db) => {
        await setup(db);
        await claim(db, { status });
        await approve(db);
        assert.equal((await business(db)).owner_id, id(2));
        assert.equal((await rows(db, "business_claim_requests"))[0].status, "approved");
      });
    },
  );

test(
  "transfer overwrites current owner without expected-owner revision and recomputes old/new full profiles",
  options,
  async () => {
    await withClaims(async (db) => {
      await setup(db, { owner: id(1) });
      await claim(db, { kind: "transfer" });
      await approve(db);
      assert.equal((await business(db)).owner_id, id(2));
      assert.equal((await profile(db, id(1))).signup_intent, "buyer");
      assert.equal((await profile(db, id(2))).signup_intent, "business");
      const transfer = (await rows(db, "business_claim_audit")).find(
        (a) => a.details?.previous_owner_id === id(1),
      );
      assert.equal(transfer.actor_user_id, null);
      assert.equal(transfer.details.new_owner_id, id(2));
    });
  },
);

test(
  "repeated transfer creates another unbound transfer audit without request ledger/idempotency",
  options,
  async () => {
    await withClaims(async (db) => {
      await setup(db, { owner: id(1) });
      await claim(db, { kind: "transfer" });
      await approve(db);
      await approve(db);
      const a = (await rows(db, "business_claim_audit")).filter(
        (a) => a.notes === "Ownership transfer approved",
      );
      assert.equal(a.length, 2);
      assert.deepEqual(
        a.map((a) => a.actor_user_id),
        [null, null],
      );
      assert.ok(
        a.some((a) => a.details.previous_owner_id === id(2) && a.details.new_owner_id === id(2)),
      );
    });
  },
);

test(
  "real provider JSON subject reaches claim audit while full owner-intent audit still substitutes target",
  options,
  async () => {
    await withClaims(async (db) => {
      await setup(db);
      await claim(db);
      // Explicit synthetic moderator state: actual writer, NOT trusted staff/native authority.
      await db.query("INSERT INTO public.user_roles(user_id,role) VALUES($1,'moderator')", [id(1)]);
      await asSettings(
        db,
        { role: "service_role", claims: JSON.stringify({ sub: id(1) }) },
        async () => {
          await approve(db);
          assert.equal(
            (await rows(db, "business_claim_audit")).find((a) => a.action === "approved")
              .actor_user_id,
            id(1),
          );
          assert.equal(
            (await rows(db, "admin_audit_log")).find(
              (a) => a.target_user_id === id(2) && a.new_value === "business",
            ).actor_id,
            id(2),
          );
        },
      );
    });
  },
);

test(
  "valid nonmoderator request subject is blocked by genuine owner guard even inside service-only approval",
  options,
  async () => {
    await withClaims(async (db) => {
      await setup(db);
      await claim(db);
      const before = await snapshot(db);
      await asSettings(db, { role: "service_role", subject: id(1) }, async () => {
        await assert.rejects(
          () => attempt(db, () => approve(db)),
          (e) => e.code === "P0001",
        );
      });
      assert.equal(
        await snapshot(db),
        before,
        "genuine guard denial restores all rows without granting Auth-table access",
      );
    });
  },
);

test(
  "preexisting reviewer UUID overrides provider uid; later separate reviewer note does not repair prior approval attribution",
  options,
  async () => {
    await withClaims(async (db) => {
      await setup(db);
      await claim(db, { reviewer: id(702) });
      await approve(db);
      assert.equal(
        (await rows(db, "business_claim_audit")).find((a) => a.action === "approved").actor_user_id,
        id(702),
      );
      await db.query(
        "UPDATE public.business_claim_requests SET reviewer_user_id=$1,reviewer_notes='Synthetic Later Review' WHERE id=$2",
        [id(1), id(201)],
      );
      const a = await rows(db, "business_claim_audit");
      assert.equal(a.find((a) => a.action === "approved").actor_user_id, id(702));
      assert.equal(a.find((a) => a.action === "reviewer_note").actor_user_id, id(1));
      assert.equal(
        (await db.query("SELECT count(*)::int n FROM auth.users WHERE id=$1", [id(702)])).rows[0].n,
        0,
        "reviewer UUID has no Auth FK/verified identity",
      );
    });
  },
);

test(
  "evidence INSERT attributes supplied uploader, not uid, and DELETE reads actual uid JSON fallback",
  options,
  async () => {
    await withClaims(async (db) => {
      await setup(db);
      await claim(db);
      await asSettings(db, { claims: JSON.stringify({ sub: id(701) }) }, async () => {
        await evidence(db, { uploader: id(702) });
        const added = (await rows(db, "business_claim_audit")).find(
          (a) => a.action === "evidence_added",
        );
        assert.equal(added.actor_user_id, id(702));
        assert.equal(added.details.file_name, "synthetic.txt");
        await db.query("DELETE FROM public.business_claim_evidence WHERE id=$1", [id(301)]);
        assert.equal(
          (await rows(db, "business_claim_audit")).find((a) => a.action === "evidence_removed")
            .actor_user_id,
          id(701),
        );
      });
    });
  },
);

test(
  "evidence DELETE without uid falls back to unbound uploader; metadata is not private object custody",
  options,
  async () => {
    await withClaims(async (db) => {
      await setup(db);
      await claim(db);
      await evidence(db, {
        uploader: id(702),
        size: "-1",
        path: "unverified/other-claim/no-object",
      });
      await db.query("DELETE FROM public.business_claim_evidence WHERE id=$1", [id(301)]);
      assert.equal(
        (await rows(db, "business_claim_audit")).find((a) => a.action === "evidence_removed")
          .actor_user_id,
        id(702),
      );
    });
  },
);

test("evidence UPDATE has no observed audit or review-revision fanout", options, async () => {
  await withClaims(async (db) => {
    await setup(db);
    await claim(db);
    await evidence(db);
    const audits = JSON.stringify(await rows(db, "business_claim_audit"));
    await db.query(
      "UPDATE public.business_claim_evidence SET storage_path='changed/unverified',file_name='changed.txt',file_size=-1 WHERE id=$1",
      [id(301)],
    );
    assert.equal(JSON.stringify(await rows(db, "business_claim_audit")), audits);
    assert.equal((await rows(db, "business_claim_evidence"))[0].file_name, "changed.txt");
  });
});

test(
  "full real claim/evidence FKs and enum-like CHECKs reject invalid input without dropping constraints",
  options,
  async () => {
    await withClaims(async (db) => {
      await setup(db);
      await claim(db);
      await unchangedFailure(
        db,
        () => evidence(db, { claimId: id(999) }),
        "23503",
        "business_claim_evidence_claim_id_fkey",
      );
      await unchangedFailure(
        db,
        () =>
          db.query("UPDATE public.business_claim_requests SET kind='unknown' WHERE id=$1", [
            id(201),
          ]),
        "23514",
        "business_claim_requests_kind_check",
      );
      await unchangedFailure(
        db,
        () => db.query("UPDATE public.businesses SET type_slug='missing' WHERE id=$1", [id(101)]),
        "23503",
        "businesses_type_slug_fkey",
      );
      await unchangedFailure(db, () => approve(db, id(999)), "P0001");
    });
  },
);

test(
  "late sibling rejection audit CHECK failure restores owner/full profiles/intent/claims/audits and genuine recovery",
  options,
  async () => {
    await withClaims(async (db, guard) => {
      await setup(db);
      await claim(db);
      await claim(db, { claimId: id(202), user: id(3) });
      const seq = await labSequenceState(db);
      await db.exec(
        "SAVEPOINT audit_fault;ALTER TABLE public.business_claim_audit ADD CONSTRAINT lab_reject_rejected CHECK(action <> 'rejected')",
      );
      await unchangedFailure(db, () => approve(db), "23514", "lab_reject_rejected");
      assert.deepEqual(
        await labSequenceState(db),
        seq,
        "approval allocates no new Auth/member rows",
      );
      await db.exec("ROLLBACK TO SAVEPOINT audit_fault;RELEASE SAVEPOINT audit_fault");
      await guard();
      await approve(db);
      assert.equal((await business(db)).owner_id, id(2));
      assert.equal((await profile(db)).signup_intent, "business");
      assert.equal(
        (await rows(db, "business_claim_requests")).find((c) => c.id === id(202)).status,
        "rejected",
      );
    });
  },
);

test(
  "genuine evidence removal-audit failure restores deleted evidence and all rows then recovers",
  options,
  async () => {
    await withClaims(async (db, guard) => {
      await setup(db);
      await claim(db);
      await evidence(db);
      await db.exec(
        "SAVEPOINT evidence_fault;ALTER TABLE public.business_claim_audit ADD CONSTRAINT lab_reject_removed CHECK(action <> 'evidence_removed')",
      );
      await unchangedFailure(
        db,
        () => db.query("DELETE FROM public.business_claim_evidence WHERE id=$1", [id(301)]),
        "23514",
        "lab_reject_removed",
      );
      await db.exec("ROLLBACK TO SAVEPOINT evidence_fault;RELEASE SAVEPOINT evidence_fault");
      await guard();
      await db.query("DELETE FROM public.business_claim_evidence WHERE id=$1", [id(301)]);
      assert.equal((await rows(db, "business_claim_evidence")).length, 0);
    });
  },
);

test(
  "full intent audit NOT NULL failure is swallowed by retained helper, not complete ownership attribution",
  options,
  async () => {
    await withClaims(async (db, guard) => {
      await setup(db);
      await claim(db);
      await db.exec(
        "SAVEPOINT intent_fault;ALTER TABLE public.admin_audit_log ALTER COLUMN id SET DEFAULT NULL",
      );
      await approve(db);
      assert.equal((await business(db)).owner_id, id(2));
      assert.equal((await profile(db)).signup_intent, "business");
      assert.equal((await rows(db, "admin_audit_log")).length, 0);
      await db.exec("ROLLBACK TO SAVEPOINT intent_fault;RELEASE SAVEPOINT intent_fault");
      await guard();
      await approve(db);
      assert.ok((await rows(db, "admin_audit_log")).length > 0);
    });
  },
);

test(
  "deleting claim with evidence hits genuine cascade/audit FK failure; no destructive retention repair",
  options,
  async () => {
    await withClaims(async (db) => {
      await setup(db);
      await claim(db);
      await evidence(db);
      await unchangedFailure(
        db,
        () => db.query("DELETE FROM public.business_claim_requests WHERE id=$1", [id(201)]),
        "23503",
        "business_claim_audit_claim_id_fkey",
      );
    });
  },
);

test(
  "no-evidence claim deletion cascades audit rows rather than preserving an immutable ledger",
  options,
  async () => {
    await withClaims(async (db) => {
      await setup(db);
      await claim(db);
      assert.equal((await rows(db, "business_claim_audit")).length, 1);
      await db.query("DELETE FROM public.business_claim_requests WHERE id=$1", [id(201)]);
      assert.equal((await rows(db, "business_claim_audit")).length, 0);
    });
  },
);

test(
  "anon/authenticated direct approval/evidence writes remain denied without adopting legacy policies",
  options,
  async () => {
    await withClaims(async (db) => {
      await setup(db);
      await claim(db);
      const before = await snapshot(db);
      for (const role of ["anon", "authenticated"])
        await asSettings(db, { role, subject: id(2) }, async () => {
          await assert.rejects(
            () => attempt(db, () => approve(db)),
            (e) => e.code === "42501",
          );
          await assert.rejects(
            () => attempt(db, () => evidence(db)),
            (e) => e.code === "42501",
          );
        });
      assert.equal(await snapshot(db), before);
    });
  },
);

test(
  "full parent/Auth/sequence/new-table/ACL/attachment/provider/shim drift is rejected before nested rollback",
  options,
  async () => {
    await withClaims(async (db, guard) => {
      for (const sql of [
        "ALTER TABLE public.profiles ALTER COLUMN phone SET DEFAULT 'lab-drift'",
        "ALTER TABLE auth.users ALTER COLUMN email SET NOT NULL",
        "ALTER SEQUENCE public.profiles_member_number_seq CACHE 2",
        "ALTER TABLE public.business_claim_requests ALTER COLUMN kind DROP DEFAULT",
        "ALTER TABLE public.business_claim_evidence DROP CONSTRAINT business_claim_evidence_evidence_type_check",
        "REVOKE SELECT ON TABLE public.business_claim_evidence FROM anon",
        "GRANT EXECUTE ON FUNCTION public.approve_business_claim(uuid,boolean) TO authenticated",
        "REVOKE EXECUTE ON FUNCTION auth.uid() FROM PUBLIC",
        "ALTER TABLE public.business_claim_evidence DISABLE TRIGGER trg_claim_audit_evidence_del",
        "CREATE FUNCTION auth.synthetic_identity() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid'",
        "CREATE TABLE public.synthetic_support(id uuid)",
        "CREATE POLICY lab_allow ON public.business_claim_requests USING(true)",
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
  "automatic child postflight catches altered evidence writer before parent rollback can hide it",
  options,
  async () => {
    await assert.rejects(
      () =>
        withClaims(async (db) => {
          await db.exec("GRANT EXECUTE ON FUNCTION public.tg_claim_audit_evidence() TO anon");
        }),
      { code: "ERR_ASSERTION" },
    );
  },
);
