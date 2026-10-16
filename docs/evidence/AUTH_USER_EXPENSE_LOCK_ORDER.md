# Private receipt-expense Auth-user lock ordering

17 October 2026, Asia/Manila. Integrated candidate, same
[draft PR68](https://github.com/Hunting-Fishing/motorsales365/pull/68).
Private/unapplied deletion and foreign-key ordering only, not session, native-shop
authority, connected CRM behavior or release acceptance. Commit subject:
`Order private receipt expense Auth-user lock before business writes`; its
publication comment records the exact commit and fresh-head checks.
Source commit:78e5fdfe62ffbc3c877351b1a6523a0a7c8836c0. Parentcaa1e4c4 completed
all six Actions before publication: actual unit117142431397 reports5,032/96 files
101.60s, zero unexpected/quarantined failures (truncated log/final summaries).
No running unit cancellation or inherited new-head/native21 result.

## Implemented boundary

After complete immutable intent validation, `create_operation` locks the exact
`expectedAccountId` in `auth.users` with `FOR KEY SHARE` **before** any outcome
lookup or receipt/customer/vehicle/financial lock. A missing row raises generic
`42501` before posting. The late outcome account FK remains intact. All prior
binding, replay, posting, ACLs, RLS and FKs remain; the unchanged seven-source/
22-span fixture is not a managed Auth reconstruction.

This follows PostgreSQL's [row-lock semantics and consistent-order guidance](https://www.postgresql.org/docs/17/explicit-locking.html).
KEY SHARE fences deletion/key changes only, **not** non-key user updates, bans,
session refresh/expiry/termination, native role/tenant changes or every competing
financial/stock writer. A user row is not original-human/fresh-session admission.
Supabase [sessions](https://supabase.com/docs/guides/auth/sessions) and
[user deletion](https://supabase.com/docs/guides/auth/managing-user-data) remain
separate prerequisites; deleting a user does not instantly invalidate a JWT.

Actual selected catalog shows ordinary/service roles lack the Auth SELECT/UPDATE
permissions required for row locking. No grant, definer function, admin/service
fallback or app writer activation is introduced. Positive rehearsals remain
synthetic schema-owner plus `test.user` GUC and stub legacy helpers; ordinary roles
retain denial tests. These are not real native authority or deployed behavior.

## New native cohorts, not yet accepted locally

Four dedicated noncreator actors preserve the receipt's retained `created_by`
NO ACTION FK. No FK is dropped/loosened or replaced by a fabricated Auth cascade.

1. Command first: deletion demonstrably waits; command COMMIT leaves one posting/
   outcome, deletion gets genuine FK23503 and exact replay writes nothing. A
   separate command ROLLBACK releases deletion, which commits without financial
   effects. The synthetic profile deliberately remains, not real offboarding.
2. Deletion first, ROLLBACK: command demonstrably waits on the user; an independent
   third session locks the same receipt `FOR UPDATE NOWAIT`, returns its exact ID
   and rolls back while the command remains blocked. Deletion rollback then
   permits the command and exact replay.
3. Deletion first, COMMIT: the same wait/NOWAIT controls apply; the command receives
   missing-user42501 with no receipt/financial/outcome effects.

The original nine-table financial/native digest is byte-preserved. An additional
same-cluster digest includes it, retained draft graph and all synthetic Auth
users. Exact user/profile presence and post-COMMIT/ROLLBACK equality are checked.
These are equality witnesses, not backups, managed Auth lineage or full recovery.

The shell requires **21** ordered markers: the previous18 remain an unchanged
subsequence, with three added before the original completion proof. Old18-only,
each missing/duplicate/swapped marker, extra/private output and truncation are
rejected. Three named failure stages are added; all timeouts, budgets, admission
and child/cluster cleanup remain intact.

## Root validation and publication prerequisites

Serial root execution: **75/75** in35,551.8278ms across expense candidate/native
source/native transport/actual isolated Bash parser; then retained draft candidate/
source/native guards **36/36** in11,610.2602ms (including15 nested cases). Zero
failures/skips/cancellations. The missing-user model proves otherwise-valid
synthetic scope before42501 and whole selected graph/Auth equality; valid-manager
positive controls remain. Changed-script ESLint zero findings, syntax/format/diff
and independent read-only review pass. No unchanged app24/1231/121 or full Windows
run. No app/packages/Worker/media/provider/hosted Auth rows/settings changed.

These local sequential models/offline parser tests do **not** execute the new
native concurrency cohorts. The mandatory Docker-free PG17 CI step must freshly
execute all21 markers, final terminators and EXIT/always-cleanup. Existing Parts/
adversarial/quote/transaction/recovery gates remain. Fresh build/type/unit/OCR/
native checks are separate from parent passes; do not cancel a running parent
unit with a docs-only push.

Candidate SQL SHA256-LF:
`eec735a6274708f21b87a05883f43ec420b20e9dd37b4487cf6977ecb6cce570`.
Unchanged posting fixture SHA256-LF:
`98db65cfe826651d234367e9fae9c3222a294010d99bbd8a6876fc880fc6d2d1`.

## Exact next dependency / release limits

Read the new head's actual PG17 result before accepting these cohorts. Then
compose reviewed original-human/fresh-session/native-shop admission inside the
eventual private expense transaction with compatible catalog, refresh/role/claim/
offboarding/financial/stock writers and durable unknown-outcome reconciliation.
Do not grant ordinary Auth table access to make it work. Real API/private-original/
device/owner/full restore acceptance remains open.

No live migration, Auth access, grant, account, Buddy/366 project, main promotion
or deployment. Preserve47 replay failures and12 historical/five unapplied/two
recorded classifications. QA/hosting stops retain existing resume conditions;
this slice consumes no new retry. All18 workflows plusN1–N3 remain in scope and
22 October remains at risk, not a verified forecast.
