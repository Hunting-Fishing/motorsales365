# Native profiles and role assignments: offline containment candidate

2026-10-15 Asia/Manila. **Offline, unapplied and not production authorization.**
This slice follows PR #42 documentation head `dbdbf01`, whose six CI gates passed
in `38670594609`, verified on this run. Hosting remains separately failed;
wrapper `38670594626` skipped migrations/production deployment. Preserve the
three already-applied legacy EXECUTE restrictions without replay or recovery.
Their owner approvals do not authorize changes to these native tables or roles.

Published draft [PR #43](https://github.com/Hunting-Fishing/motorsales365/pull/43),
code `7ce8f19794cbd7cdcc90cc6e03461ccf2ecde1b3`, branch
`security/native-profile-assignment-containment`, stacked on PR #42 docs `dbdbf01`.

## Exact scope and evidence

The candidate atomically removes only authenticated INSERT/UPDATE/DELETE from
`shop_manager.profiles` and `shop_manager.user_roles`, using RESTRICT. It preserves
permitted SELECT, existing policies/RLS, relevant constraints/indexes/defaults,
all stored legacy rows, original roles-catalog permissions, three selected native
helpers and postgres/service access. It adds no contact-edit, native-admin or
owner exception; successful historical phone edits were policy admission, not an
approved secure contact workflow. No GRANT ALL, identity repair/canonicalization,
business communication, application source change or migration is supplied.

`scripts/ci/native-profile-assignment-containment.mjs` is an offline fixed-evidence
SQL builder, not a production executor. It reads one fixed local metadata file
through an always-closed descriptor, bounded to 64 KiB, and refuses a size/hash/
project/date/table-identity mismatch. It does not read credentials or arbitrary
paths. Its builder is not a no-filesystem module. The imported prior roles builder
supplies only immutable original roles/helper expectations; its SQL is never
executed or adopted.

The unchanged `native-profile-role-catalog-2026-10-15.json` is pinned to LF SHA-256
`d92af49531821c95fe9173bc3184b77060c22ffdaac30d7e7b70311e60f2712a`.
Its observation is `2026-10-15 01:00:28.666866 UTC`, not current live table state.
There are 21 profile columns and four user-role columns, NULL declared column
ACLs, no selected noninternal attachments and the recorded effective table/column
rights. The native three-helper contracts differ from the legacy bootstrap/totals
helpers restricted by PR #42. No new live database/catalog/API call occurs here.

Tests reuse `fixtures/native-profile-role-policy-fixture.mjs`, with actual pinned
selected DDL, outgoing constraints, policies and three unchanged native helpers.
Auth users/session claims, labelled native owner, legacy/shadow data and fault
instrumentation are explicitly synthetic. No incoming profile FKs, business/shop
table ownership, real JWT verification or full production baseline is invented.
There is no selected profile shop FK or user-role role FK. Existing legacy and
NULL-shadow rows are preserved, not chosen as a canonical binding or repaired.

## Atomic operations and recovery boundary

`buildNativeProfileAssignmentContainment()` returns frozen target expectations
ordered profiles/user_roles, exact helper/provenance metadata, `restrictSql`,
`recordRestrictionApplication({before,after})` and `recoverSql(receipt)`.
Both SQL operations require database role postgres, not a native owner/admin
label or service caller. This database-owner gate is not human release approval
or proof that an operator/service actor is trusted.

All three selected relations must be ordinary, nonpartitioned and unrelated by
inheritance before either lock. The two write targets lock in deterministic
profiles-then-user_roles order, using ONLY ACCESS EXCLUSIVE; no roles lock or
hidden descendant adoption is introduced. The original OIDs and topology are
rechecked, both full target catalogs and the original roles/helper contracts are
checked before any privilege mutation, and exact expected catalogs/effective
rights are verified afterward. PostgreSQL 18 redundant NOT NULL records are
excluded only when validated, single-column and backed by the exact nullability
shape; only the nonportable OID-derived helper header fingerprint is omitted.

The caller must supply its own explicit short transaction and bounded statement/
lock timeouts, commit only after verification and roll back any failure. No
external call belongs inside that transaction. Locks last until transaction end.
The prior search path is restored on success; failed operations require rollback.
Early wrong-kind checks avoid locking an already-replaced view, but do not prove
independent-session name-replacement/DDL/revocation safety. The roles catalog is
not locked; no concurrent roles data/DDL guarantee is inferred.

Global and selected-schema default ACLs are snapshotted before and compared after
the operation. This proves a bounded operation did not change that snapshot; it
does not adopt the preexisting defaults or establish their provenance. Effective
rights checks do not close all role inheritance, SET ROLE, MAINTAIN or operator
paths. Unexpected column grants are refused rather than swept away by table REVOKE.

Recovery grants back only the original I/U/D on both tables. It deliberately
reopens unsafe direct writes and does not roll back data. The per-builder WeakSet
receipt is **caller-fabricable process bookkeeping**, not SQL execution, commit,
once-only application, trusted original state, human approval or durable evidence.
Matching observations can be invented with no database; copied generated SQL can
bypass the JS seam. Do not generate recovery merely because a live ACL looks
restricted. Repeated restriction/recovery refuses exact state mismatches, not an
idempotent production application receipt. No automatic recovery is authorized.

## Compatibility and remaining authority risks

Permitted canonical/legacy reads and selected helper results are intended to
remain unchanged. Losing UPDATE also removes its required row-lock privilege;
plain SELECT preservation is not complete reader compatibility. The bounded
retained native profile callers are reads, not observed contact/assignment
writers; dynamic, external and older deployed callers remain unverified.
The leave-request reader still asks for an unobserved `profiles.role` column;
this candidate neither validates nor repairs that separate existing query.

The roles catalog retains its actual authenticated CRUD and swept FOR ALL policy.
The separate PR #41 candidate is still unapplied. Prior unchanged-source evidence
shows catalog label changes can alter global role interpretation while profile/
assignment rows stay fixed. This two-table restriction is not that repair. It
deliberately refuses the separate role candidate's restricted catalog state:
applying the candidates in that other order requires separately reviewed fixed
expectations and a combined rehearsal, not broad "accept either state" logic.

Likewise, postgres/service and nested definer writers remain effective. Reuse the
completed seven bootstrap and nine roster characterization cases instead of
repeating them or claiming comprehensive containment. Bootstrap direct client
execution is already restricted by PR #42, but owner/service/nested execution
and other ownership/provisioning paths remain open. No poisoned existing rows,
full caller closure, trusted business owner/delegation, valid offboarding or real
session/concurrency acceptance follows from direct DML denial.

## Verification

19/19 focused cases pass in 18.980 seconds, no failures/skips/cancellations;
syntax, ESLint and Prettier pass. Each case has a 30-second bound, fixture
statement/lock limits are three/one seconds, databases are sequential and always
closed. The first run caught an actual generated regclass[] versus oid[] guard
comparison error before any privilege mutation. Explicit oid[] casts fix the
initial array and same-OID comparison; the final passing run uses those casts.
No old source/constraint or production state was altered to pass.

The final controls cover:

- Exact seeded/empty two-table privilege deltas, unchanged rows/helpers/original
  roles/defaults, exact recovery and repeated-operation refusal.
- Raw/scoped/RETURNING/zero/no-op/UPSERT/DO NOTHING profile identity, shop, shadow,
  contact and role-assignment writes fail 42501, including native admin/owner
  labels. Canonical/legacy/NULL-shadow SELECT and helper results are preserved;
  FOR UPDATE loses its required UPDATE privilege. A rollback-only roles catalog
  write remains allowed and is explicitly residual, not role-meaning containment.
- Postgres/service data CRUD remains available in rolled-back controls, while
  authenticated native admin/owner and service roles cannot install or recover.
  Unexpected column/PUBLIC/inherited/other-grantor/service/owner, topology/view,
  shape/default/index/policy/attachment and helper contract drift is refused.
- Second-table precondition drift fails 55000 without reaching a first-REVOKE
  event trap. Separate genuine first-REVOKE and first-recovery-GRANT traps confirm
  all three rights changed on profiles while user_roles is still unchanged, then
  raise distinct P0001 and roll the complete operation/fault row/settings back.
  These boundary exceptions are not labelled postcondition-check coverage.
- Three additional genuine after-second-DDL faults return normally to the
  candidate: a PUBLIC UPDATE regrant after both restrictions, an added assignment
  column after both recovery grants, and an altered native default ACL after
  both restrictions. The candidate's own catalog/default 55000 postchecks fail;
  both target changes and injected grant/column/default/fault row roll back.
- Separately labelled transaction-suffix failures roll back; recovery preserves
  unrelated committed privileged data changes and deliberately reopens the
  original unsafe self-write. Fakeable receipt controls reject copies, another
  builder's token, mismatched observations and ordinary accessors without invoking
  getters; no actual execution/approval/provenance claim is made.

Implementation pins, UTF-8 LF:

| Artifact                                         | Bytes | SHA-256                                                            |
| ------------------------------------------------ | ----: | ------------------------------------------------------------------ |
| `native-profile-assignment-containment.mjs`      | 21565 | `e8b506043d0efb84b538e09a56bff0809c9f2c9581f160614e65a12293d13cbc` |
| Generated restriction SQL                        | 47666 | `5f513af8dfe6390d0fb5d2880adcfab66e0380d6c73c1ea6f683a2f3054f6c1d` |
| Generated recovery SQL                           | 47642 | `d40934ae878b89072d9520631c888ddc4bbe15119539f2fb2b4179756680ffbb` |
| `native-profile-assignment-containment.test.mjs` | 38950 | `2da172c90bca623b03ad2c3a225aa211f37cb816639e934db9a07234bf0af295` |

Full tooling verification passes in two consecutive sequential commands:
346/346 `scripts/ci` tests in 272.003 seconds and 10/10 receipt-asset regressions
in 0.484 seconds, 356 total, no failures/skips/cancellations. Final independent
module/test/document review is clean, not a separate live or runtime test run.
A dedicated never-quarantined CI step runs the new suite. This PR's latest
documentation head requires its own next-resume CI check; do not infer a release
from the already-passing parent's checks.
Initial code CI `38672918147` is pending at capture (build/unit still running);
separate hosting build `051891c6-e359-4e58-a36a-db9731c2fda1` failed and wrapper
`38672918177` skipped migrations/production deployment. This is not an upload.
Application source is unchanged from the CI-verified 986-test parent. Memory
results do not certify production workflow, target-version parity, operator
recovery, concurrency or application compatibility.

## Next dependency and release gates

After this offline candidate is verified/published, close the original-actor and
trusted roster/native writer boundary, starting from the already-observed chain:
`public.business_staff` permitted mutation →
`sync_business_staff_to_shop_manager` →
`shop_manager.sync_business_staff_trigger()` → latest
`shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)` → native
profile upsert/shop rebinding and managed role-assignment delete/insert. The
trigger executes as postgres independently of authenticated target-table ACLs.
Direct EXECUTE denial on the bridge functions does not constrain that trigger.

The retained trigger source is in
`20260901025424_business_staff_shop_manager_bridge.sql`; the latest member body is
in `20260902151438_assistant_manager_temporary_canonical_permission.sql`.
Coordinate the always-UPDATE chat writer/no-op effects and actual constraints.
Recover ownership claim/transfer (`approve_business_claim(uuid,boolean)`), trusted
team classification and original-actor shift/audit dependencies before adopting
owner/delegation/management positives or valid atomic offboarding. Do not invent
manager, service or NULL-subject bypasses to make fixtures pass.

Any live table restriction/recovery requires separate explicit authority after
fresh complete preconditions, impact analysis, actual target-version testing and
real operator/concurrency/recovery readiness. Existing helper approvals do not
apply. Baseline/parity/replay/release flags remain false; global source composer
remains the prior 404/423 with 19 unclassified and new PR #42 envelope facts still
separate. Database/private-storage restore, consent/tenure/retention, real API/
session/role acceptance, receipt OCR/mobile/owner pilot and full-media hosting
remain open. No paid resources, customer communications, history repair or sparse
checkout deployment. Keep the existing recurring follow-up without duplication.

Current primary guidance: [PostgreSQL REVOKE](https://www.postgresql.org/docs/18/sql-revoke.html),
[LOCK](https://www.postgresql.org/docs/18/sql-lock.html) and
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
The Supabase skills kept table privileges, row policy and privileged writer
authority separate, and required local query verification instead of production
experimentation. Current changelog minor-upgrade/HTTP-cipher notices were reviewed;
this offline candidate does not upgrade the server, change extensions, credentials
or transport settings, or validate the later full-version/HTTP release gates.
