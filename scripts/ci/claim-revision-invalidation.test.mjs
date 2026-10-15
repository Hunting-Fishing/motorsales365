// Disposable metadata revision capture on unchanged full actual PR #65 schema.
// No original-human/JWT, private object custody, lock/executor or release claim.
import test from "node:test";
import assert from "node:assert/strict";
import {
  withRevisions,
  binding,
  snapshot,
  sql,
} from "./fixtures/claim-revision-invalidation-fixture.mjs";
import { id, signup, attempt, asSettings } from "./fixtures/full-claim-evidence-fixture.mjs";
const options = { concurrency: false, timeout: 40_000 };
const claimId = id(201);
const businessId = id(101);
async function setup(db, { owner = null } = {}) {
  for (const n of [1, 2, 3])
    await signup(db, {
      user: id(n),
      email: "synthetic-revision-" + n + "@example.invalid",
      metadata: { signup_intent: "buyer" },
    });
  await db.exec(
    "INSERT INTO public.business_types(slug,label) VALUES('synthetic','Synthetic Type')",
  );
  await addBusiness(db, businessId, owner);
}
async function addBusiness(db, target = id(102), owner = null) {
  await db.query(
    "INSERT INTO public.businesses(id,slug,name,type_slug,owner_id) VALUES($1,$2,'Synthetic Business','synthetic',$3)",
    [target, "synthetic-" + target, owner],
  );
}
async function claim(db, target = claimId, user = id(2), kind = "claim") {
  await db.query(
    "INSERT INTO public.business_claim_requests(id,business_id,claimant_user_id,contact_method,kind) VALUES($1,$2,$3,'document',$4)",
    [target, businessId, user, kind],
  );
}
async function evidence(db, target = id(301), parent = claimId) {
  await db.query(
    "INSERT INTO public.business_claim_evidence(id,claim_id,uploader_user_id,evidence_type,file_name,file_size,mime_type,storage_path) VALUES($1,$2,$3,'other','synthetic.txt',12,'text/plain','lab/not-uploaded.txt')",
    [target, parent, id(2)],
  );
}
const approve = (db, target = claimId) =>
  db.query("SELECT public.approve_business_claim($1,false)", [target]);
const get = (db) => binding(db, claimId);
const revise = (v, amount = 1n) => (BigInt(v) + amount).toString();
async function unchangedFailure(db, run, code) {
  const before = await snapshot(db);
  await assert.rejects(
    () => attempt(db, run),
    (e) => e.code === code,
  );
  assert.equal(await snapshot(db), before, "full public/Auth AND all companion rows restore");
}

test(
  "candidate stays private, invoker-only and non-migration; nine explicit capture/guard attachments",
  options,
  async () => {
    await withRevisions(async (db) => {
      assert.ok(sql.includes("DISPOSABLE MODEL ONLY"));
      const funcs = (
        await db.query(
          "SELECT p.proname name,p.prosecdef definer,p.proconfig config FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='claim_revision_lab' ORDER BY name",
        )
      ).rows;
      assert.equal(funcs.length, 5);
      for (const f of funcs)
        assert.deepEqual([f.definer, f.config], [false, ["search_path=pg_catalog, pg_temp"]]);
      assert.equal(
        (await db.query("SELECT count(*)::int n FROM pg_trigger WHERE tgname LIKE 'z_lab_%'"))
          .rows[0].n,
        9,
      );
      assert.deepEqual(
        (
          await db.query(
            "SELECT relrowsecurity enabled FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='claim_revision_lab' AND c.relkind='r'",
          )
        ).rows.map((r) => r.enabled),
        [true, true],
      );
      for (const role of ["anon", "authenticated", "service_role"])
        await asSettings(db, { role }, async () => {
          await assert.rejects(
            () => attempt(db, () => get(db)),
            (e) => e.code === "42501",
          );
          await assert.rejects(
            () => attempt(db, () => db.exec("SELECT * FROM claim_revision_lab.claim_versions")),
            (e) => e.code === "42501",
          );
          await assert.rejects(
            () =>
              attempt(db, () =>
                db.exec("UPDATE claim_revision_lab.owner_versions SET tenure_revision=1"),
              ),
            (e) => e.code === "42501",
          );
        });
    });
  },
);

test(
  "post-install captured inserts start explicitly at one with distinct server-generated attempt IDs",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      assert.equal(await get(db), null);
      await claim(db);
      await claim(db, id(202), id(3));
      const b = await get(db);
      assert.deepEqual(
        [
          b.expectedClaimAttemptRevision,
          b.expectedEvidenceSetRevision,
          b.expectedOwnershipTenureRevision,
          b.expectedOwnerId,
        ],
        ["1", "1", "1", null],
      );
      assert.match(
        b.expectedClaimAttemptId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      assert.notEqual(
        (await binding(db, id(202))).expectedClaimAttemptId,
        b.expectedClaimAttemptId,
      );
    });
  },
);

test(
  "all actual claim metadata edits invalidate; timestamp-only/no-op and zero-row writes do not",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      for (const [column, value] of [
        ["contact_method", "email"],
        ["contact_value", "lab@example.invalid"],
        ["evidence_url", "lab/not-an-upload"],
        ["notes", "review changed"],
        ["reviewer_notes", "reviewer changed"],
        ["reviewer_user_id", id(3)],
        ["decided_at", "2026-10-15T00:00:00Z"],
        ["created_at", "2026-10-14T00:00:00Z"],
        ["status", "rejected"],
      ]) {
        const before = await get(db);
        await db.query("UPDATE public.business_claim_requests SET " + column + "=$1 WHERE id=$2", [
          value,
          claimId,
        ]);
        const after = await get(db);
        assert.equal(
          after.expectedClaimAttemptRevision,
          revise(before.expectedClaimAttemptRevision),
          column,
        );
        assert.equal(after.expectedClaimAttemptId, before.expectedClaimAttemptId);
        assert.equal(after.expectedEvidenceSetRevision, before.expectedEvidenceSetRevision);
        await db.query("UPDATE public.business_claim_requests SET " + column + "=$1 WHERE id=$2", [
          value,
          claimId,
        ]);
        assert.deepEqual(await get(db), after, column + " exact no-op");
      }
      const before = await get(db);
      await db.query(
        "UPDATE public.business_claim_requests SET updated_at=now()+interval '1 day' WHERE id=$1",
        [claimId],
      );
      await db.query("UPDATE public.business_claim_requests SET notes='missing' WHERE id=$1", [
        id(999),
      ]);
      assert.deepEqual(await get(db), before);
    });
  },
);

for (const [column, value] of [
  ["business_id", id(102)],
  ["claimant_user_id", id(3)],
  ["kind", "transfer"],
])
  test(
    "claim rebinding " +
      column +
      " rotates attempt and invalidates attached evidence interpretation",
    options,
    async () => {
      await withRevisions(async (db) => {
        await setup(db);
        await addBusiness(db);
        await claim(db);
        await evidence(db);
        const before = await get(db);
        await db.query("UPDATE public.business_claim_requests SET " + column + "=$1 WHERE id=$2", [
          value,
          claimId,
        ]);
        const after = await get(db);
        assert.notEqual(after.expectedClaimAttemptId, before.expectedClaimAttemptId);
        assert.equal(
          after.expectedClaimAttemptRevision,
          revise(before.expectedClaimAttemptRevision),
        );
        assert.equal(after.expectedEvidenceSetRevision, revise(before.expectedEvidenceSetRevision));
      });
    },
  );

test(
  "reopening an approved/rejected claim rotates attempt without resetting its monotonic revisions",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      for (const status of ["approved", "rejected", "auto_approved"]) {
        await db.query("UPDATE public.business_claim_requests SET status=$1 WHERE id=$2", [
          status,
          claimId,
        ]);
        const before = await get(db);
        await db.query("UPDATE public.business_claim_requests SET status='pending' WHERE id=$1", [
          claimId,
        ]);
        const after = await get(db);
        assert.notEqual(after.expectedClaimAttemptId, before.expectedClaimAttemptId);
        assert.equal(
          after.expectedClaimAttemptRevision,
          revise(before.expectedClaimAttemptRevision),
        );
        assert.equal(after.expectedEvidenceSetRevision, revise(before.expectedEvidenceSetRevision));
      }
    });
  },
);

test(
  "every actual evidence metadata field invalidates; unchanged row does not",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      await evidence(db);
      for (const [column, value] of [
        ["file_name", "renamed.txt"],
        ["file_size", 13],
        ["mime_type", "application/pdf"],
        ["storage_path", "lab/changed-not-uploaded"],
        ["notes", "updated evidence"],
        ["created_at", "2026-10-14T00:00:00Z"],
        ["evidence_type", "business_license"],
        ["uploader_user_id", id(3)],
      ]) {
        const before = await get(db);
        await db.query("UPDATE public.business_claim_evidence SET " + column + "=$1 WHERE id=$2", [
          value,
          id(301),
        ]);
        const after = await get(db);
        assert.equal(
          after.expectedEvidenceSetRevision,
          revise(before.expectedEvidenceSetRevision),
          column,
        );
        assert.equal(after.expectedClaimAttemptRevision, before.expectedClaimAttemptRevision);
        await db.query("UPDATE public.business_claim_evidence SET " + column + "=$1 WHERE id=$2", [
          value,
          id(301),
        ]);
        assert.deepEqual(await get(db), after, column + " exact no-op");
      }
    });
  },
);

test(
  "evidence delete/recreate same ID/path invalidates old set without pretending bytes were verified",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      const initial = await get(db);
      await evidence(db);
      const before = await get(db);
      assert.equal(before.expectedEvidenceSetRevision, revise(initial.expectedEvidenceSetRevision));
      await db.query("DELETE FROM public.business_claim_evidence WHERE id=$1", [id(301)]);
      await evidence(db);
      const after = await get(db);
      assert.equal(
        after.expectedEvidenceSetRevision,
        revise(before.expectedEvidenceSetRevision, 2n),
      );
      assert.equal(after.expectedClaimAttemptId, before.expectedClaimAttemptId);
    });
  },
);

test(
  "evidence reparent invalidates both old/new claim sets; an ABA return increments both again",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      await claim(db, id(202), id(3));
      await evidence(db);
      const before = await get(db),
        sibling = await binding(db, id(202));
      await db.query("UPDATE public.business_claim_evidence SET claim_id=$1 WHERE id=$2", [
        id(202),
        id(301),
      ]);
      await db.query("UPDATE public.business_claim_evidence SET claim_id=$1 WHERE id=$2", [
        claimId,
        id(301),
      ]);
      assert.equal(
        (await get(db)).expectedEvidenceSetRevision,
        revise(before.expectedEvidenceSetRevision, 2n),
      );
      assert.equal(
        (await binding(db, id(202))).expectedEvidenceSetRevision,
        revise(sibling.expectedEvidenceSetRevision, 2n),
      );
    });
  },
);

test(
  "claim delete/recreate retains tombstone and cannot resurrect the old attempt ID or revisions",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      const before = await get(db);
      await db.query("DELETE FROM public.business_claim_requests WHERE id=$1", [claimId]);
      assert.equal(await get(db), null);
      assert.equal(
        (
          await db.query("SELECT alive FROM claim_revision_lab.claim_versions WHERE claim_id=$1", [
            claimId,
          ])
        ).rows[0].alive,
        false,
      );
      await claim(db);
      const after = await get(db);
      assert.notEqual(after.expectedClaimAttemptId, before.expectedClaimAttemptId);
      assert.equal(
        after.expectedClaimAttemptRevision,
        revise(before.expectedClaimAttemptRevision, 2n),
      );
      assert.equal(
        after.expectedEvidenceSetRevision,
        revise(before.expectedEvidenceSetRevision, 2n),
      );
    });
  },
);

test(
  "owner A-to-B-to-A and claim-state changes fence old tenure; unrelated business edits do not",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db, { owner: id(1) });
      await claim(db);
      const before = await get(db);
      for (const owner of [id(2), id(1)])
        await db.query("UPDATE public.businesses SET owner_id=$1 WHERE id=$2", [owner, businessId]);
      const after = await get(db);
      assert.equal(after.expectedOwnerId, before.expectedOwnerId);
      assert.equal(
        after.expectedOwnershipTenureRevision,
        revise(before.expectedOwnershipTenureRevision, 2n),
      );
      await db.query("UPDATE public.businesses SET name='Other Name',owner_id=$1 WHERE id=$2", [
        id(1),
        businessId,
      ]);
      assert.deepEqual(await get(db), after);
      await db.query("UPDATE public.businesses SET claim_state='claim_pending' WHERE id=$1", [
        businessId,
      ]);
      assert.equal(
        (await get(db)).expectedOwnershipTenureRevision,
        revise(after.expectedOwnershipTenureRevision),
      );
    });
  },
);

test(
  "business delete/recreate and cascading empty claim deletion preserve both monotonic tombstones",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      const before = await get(db);
      await db.query("DELETE FROM public.businesses WHERE id=$1", [businessId]);
      assert.equal(await get(db), null);
      await addBusiness(db, businessId);
      await claim(db);
      const after = await get(db);
      assert.notEqual(after.expectedClaimAttemptId, before.expectedClaimAttemptId);
      assert.equal(
        after.expectedOwnershipTenureRevision,
        revise(before.expectedOwnershipTenureRevision, 2n),
      );
      assert.equal(
        after.expectedClaimAttemptRevision,
        revise(before.expectedClaimAttemptRevision, 2n),
      );
    });
  },
);

test(
  "untracked preexisting rows never gain fabricated bindings through edits, evidence changes or recreation",
  options,
  async () => {
    await withRevisions(
      async (db) => {
        assert.equal(await get(db), null);
        await db.query("UPDATE public.business_claim_requests SET notes='changed' WHERE id=$1", [
          claimId,
        ]);
        await db.query("UPDATE public.businesses SET owner_id=$1 WHERE id=$2", [id(1), businessId]);
        await evidence(db);
        assert.equal(await get(db), null);
        await db.query("DELETE FROM public.business_claim_evidence WHERE id=$1", [id(301)]);
        await db.query("DELETE FROM public.business_claim_requests WHERE id=$1", [claimId]);
        await claim(db);
        assert.equal(await get(db), null);
        const c = (
          await db.query(
            "SELECT attempt_id,attempt_revision,evidence_revision FROM claim_revision_lab.claim_versions WHERE claim_id=$1",
            [claimId],
          )
        ).rows[0];
        assert.deepEqual(c, { attempt_id: null, attempt_revision: null, evidence_revision: null });
      },
      async (db) => {
        await setup(db);
        await claim(db);
      },
    );
  },
);

test(
  "new claim on unknown preexisting business remains unbound even after an owner change",
  options,
  async () => {
    await withRevisions(
      async (db) => {
        await claim(db);
        assert.equal(await get(db), null);
        await db.query("UPDATE public.businesses SET owner_id=$1 WHERE id=$2", [id(1), businessId]);
        assert.equal(await get(db), null);
        assert.equal(
          (
            await db.query(
              "SELECT tenure_revision FROM claim_revision_lab.owner_versions WHERE business_id=$1",
              [businessId],
            )
          ).rows[0].tenure_revision,
          null,
        );
      },
      (db) => setup(db),
    );
  },
);

test(
  "unknown preexisting owner tenure stays unknown across actual business delete/recreate",
  options,
  async () => {
    await withRevisions(
      async (db) => {
        await db.query("DELETE FROM public.businesses WHERE id=$1", [businessId]);
        await addBusiness(db, businessId);
        await claim(db);
        assert.equal(await get(db), null);
        assert.equal(
          (
            await db.query(
              "SELECT tenure_revision FROM claim_revision_lab.owner_versions WHERE business_id=$1",
              [businessId],
            )
          ).rows[0].tenure_revision,
          null,
        );
      },
      (db) => setup(db),
    );
  },
);

test(
  "evidence first touching an untracked claim creates UNKNOWN, never a trusted empty-set revision",
  options,
  async () => {
    await withRevisions(
      async (db) => {
        await evidence(db);
        assert.equal(await get(db), null);
        assert.deepEqual(
          (
            await db.query(
              "SELECT attempt_id,attempt_revision,evidence_revision,alive FROM claim_revision_lab.claim_versions WHERE claim_id=$1",
              [claimId],
            )
          ).rows[0],
          { attempt_id: null, attempt_revision: null, evidence_revision: null, alive: true },
        );
      },
      async (db) => {
        await setup(db);
        await claim(db);
      },
    );
  },
);

test(
  "legacy approval and sibling rejection are captured but not adopted as authorized or pending-only decisions",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      await claim(db, id(202), id(3));
      const before = await get(db),
        sibling = await binding(db, id(202));
      await approve(db);
      const after = await get(db);
      assert.equal(
        after.expectedOwnershipTenureRevision,
        revise(before.expectedOwnershipTenureRevision),
      );
      assert.equal(after.expectedClaimAttemptRevision, revise(before.expectedClaimAttemptRevision));
      assert.equal(
        (await binding(db, id(202))).expectedClaimAttemptRevision,
        revise(sibling.expectedClaimAttemptRevision),
      );
      await db.query("UPDATE public.business_claim_requests SET status='rejected' WHERE id=$1", [
        claimId,
      ]);
      await approve(db);
      assert.equal(
        (await db.query("SELECT status FROM public.business_claim_requests WHERE id=$1", [claimId]))
          .rows[0].status,
        "approved",
        "legacy nonpending defect remains, not a review executor",
      );
    });
  },
);

test(
  "legacy transfer changes tenure; repeated same-owner transfer still duplicates its legacy audit",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db, { owner: id(1) });
      await claim(db, claimId, id(2), "transfer");
      const before = await get(db);
      await approve(db);
      const after = await get(db);
      assert.equal(
        after.expectedOwnershipTenureRevision,
        revise(before.expectedOwnershipTenureRevision),
      );
      await approve(db);
      assert.equal(
        (await get(db)).expectedOwnershipTenureRevision,
        after.expectedOwnershipTenureRevision,
      );
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int n FROM public.business_claim_audit WHERE notes='Ownership transfer approved'",
          )
        ).rows[0].n,
        2,
        "capture is not an idempotency ledger",
      );
    });
  },
);

test(
  "late real sibling audit failure rolls back full owner/claim AND companion revisions, then original code recovers",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      await claim(db, id(202), id(3));
      await db.exec(
        "SAVEPOINT fault;ALTER TABLE public.business_claim_audit ADD CONSTRAINT lab_revision_reject CHECK(action<>'rejected')",
      );
      await unchangedFailure(db, () => approve(db), "23514");
      await db.exec("ROLLBACK TO SAVEPOINT fault;RELEASE SAVEPOINT fault");
      await approve(db);
      assert.equal((await get(db)).expectedOwnerId, id(2));
    });
  },
);

test(
  "legacy evidence-delete audit and parent cascade FK failures preserve full companion/public state",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      await evidence(db);
      await db.exec(
        "SAVEPOINT fault;ALTER TABLE public.business_claim_audit ADD CONSTRAINT lab_revision_evidence_reject CHECK(action<>'evidence_removed')",
      );
      await unchangedFailure(
        db,
        () => db.query("DELETE FROM public.business_claim_evidence WHERE id=$1", [id(301)]),
        "23514",
      );
      await db.exec("ROLLBACK TO SAVEPOINT fault;RELEASE SAVEPOINT fault");
      await unchangedFailure(
        db,
        () => db.query("DELETE FROM public.business_claim_requests WHERE id=$1", [claimId]),
        "23503",
      );
      await db.query("DELETE FROM public.business_claim_evidence WHERE id=$1", [id(301)]);
      assert.equal((await get(db)).expectedEvidenceSetRevision, "3");
    });
  },
);

test(
  "signed bigint overflow fails the real source write atomically instead of wrapping/reusing a revision",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      await evidence(db);
      for (const [stateTable, column, sourceWrite] of [
        [
          "claim_versions",
          "attempt_revision",
          () =>
            db.query("UPDATE public.business_claim_requests SET notes='overflow' WHERE id=$1", [
              claimId,
            ]),
        ],
        [
          "claim_versions",
          "evidence_revision",
          () =>
            db.query("UPDATE public.business_claim_evidence SET notes='overflow' WHERE id=$1", [
              id(301),
            ]),
        ],
        [
          "owner_versions",
          "tenure_revision",
          () =>
            db.query("UPDATE public.businesses SET owner_id=$1 WHERE id=$2", [id(1), businessId]),
        ],
      ]) {
        await db.exec("SAVEPOINT max_revision");
        await db.exec(
          "UPDATE claim_revision_lab." + stateTable + " SET " + column + "=9223372036854775807",
        );
        await unchangedFailure(db, sourceWrite, "22003");
        await db.exec("ROLLBACK TO SAVEPOINT max_revision;RELEASE SAVEPOINT max_revision");
      }
    });
  },
);

test(
  "large adjacent revisions remain exact decimal strings and exact rollback snapshots",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      await evidence(db);
      await db.exec(
        "UPDATE claim_revision_lab.claim_versions SET attempt_revision=9223372036854775806,evidence_revision=9223372036854775806;UPDATE claim_revision_lab.owner_versions SET tenure_revision=9223372036854775806",
      );
      const before = await snapshot(db);
      await db.query(
        "UPDATE public.business_claim_requests SET notes='last revision' WHERE id=$1",
        [claimId],
      );
      await db.query(
        "UPDATE public.business_claim_evidence SET notes='last revision' WHERE id=$1",
        [id(301)],
      );
      await db.query("UPDATE public.businesses SET owner_id=$1 WHERE id=$2", [id(1), businessId]);
      const after = await get(db);
      for (const field of [
        "expectedClaimAttemptRevision",
        "expectedEvidenceSetRevision",
        "expectedOwnershipTenureRevision",
      ])
        assert.equal(after[field], "9223372036854775807");
      assert.notEqual(await snapshot(db), before);
      await unchangedFailure(
        db,
        () =>
          db.query("UPDATE public.business_claim_requests SET notes='over limit' WHERE id=$1", [
            claimId,
          ]),
        "22003",
      );
    });
  },
);

test(
  "unsupported primary-key reassignment and truncate fail closed without deleting revision witnesses",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      await evidence(db);
      for (const table of ["businesses", "business_claim_requests", "business_claim_evidence"]) {
        await unchangedFailure(
          db,
          () => db.query("UPDATE public." + table + " SET id=$1", [id(999)]),
          "55000",
        );
        await unchangedFailure(db, () => db.exec("TRUNCATE public." + table + " CASCADE"), "55000");
      }
    });
  },
);

test(
  "genuine FK/CHECK and companion CHECK failures restore all captured state",
  options,
  async () => {
    await withRevisions(async (db) => {
      await setup(db);
      await claim(db);
      await evidence(db);
      await unchangedFailure(
        db,
        () => db.query("UPDATE public.business_claim_evidence SET claim_id=$1", [id(999)]),
        "23503",
      );
      await unchangedFailure(
        db,
        () => db.exec("UPDATE public.business_claim_requests SET status='invalid'"),
        "23514",
      );
      await unchangedFailure(
        db,
        () => db.exec("UPDATE claim_revision_lab.claim_versions SET evidence_revision=0"),
        "23514",
      );
      await unchangedFailure(
        db,
        () => db.exec("UPDATE claim_revision_lab.claim_versions SET attempt_id=NULL"),
        "23514",
      );
    });
  },
);
