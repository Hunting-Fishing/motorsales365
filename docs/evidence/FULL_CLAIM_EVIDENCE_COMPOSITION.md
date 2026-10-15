# Full claim, evidence and ownership writer composition

## Outcome and scope

2026-10-15, code **dfac9d994c9403cfdbb926fda01d1e206353c660**, branch
`security/full-claim-evidence-composition`, based on PR #64 docs `5de2189`.

The retained claim approval/guard/status audit, evidence INSERT/DELETE audit,
owner-intent and timestamp writers now execute together on the unchanged full
Auth/staff foundation. This removes the reduced business/Auth/profile/role
supports from PR #45/#47 for this selected chain. It does **not** approve the
legacy ownership protocol or prove original-human authority, storage custody,
native/team synchronization, concurrent sessions or production release.

Verified full composition: **24 complete public tables, 378 columns, 89 critical
constraints, 91 indexes, 43 current public function envelopes plus actual provider
uid, 37 selected attachments**. Added claim requests/audit/evidence are 14/7/10
columns, 11 critical constraints and 10 indexes. Six new source definitions and
seven attachments compose; existing can_moderate/intent/provider/staff pieces are
not replaced. No identity, profile, intent, audit or permission success stub.

## One bounded live metadata diagnostic

At **11:41:19.388797 UTC**, project wjxaajgvddtrxxtocxen, Postgres 17.6, one
READ ONLY diagnostic recovered the complete three claim tables' metadata:
31 column/default fingerprints, 11 critical constraints, 10 indexes, 8 policies,
4 attachments, 8 selected function envelopes and the existing app_role enum.
It reads no app/Auth/config/storage rows or counts, evidence/file names/paths/
content, raw bodies/defaults/config/SQL expressions, settings/sequence values or
application helper. Local timeouts/catalog-only search_path and ROLLBACK bound
the query. Its dedicated offline privacy/scope test passed **before** execution.

Current retained source bodies, full headers/owner/ACL/effective execute and
full three-table structures match the capture locally. The new evidence source
is pinned in addition to unchanged PR #45/#47/#64 components. No source-derived
guess is promoted to original migration-history or approved baseline provenance.
All new privileged helpers retain the current owner/service-only execute ACL;
the actual broader table grants are reproduced, not the source's narrower grants.

## Guards and explicit omissions

The immutable full staff guard runs before the nested child SAVEPOINT. A local
catalog-only expansion compares every complete parent table/column/default/
critical FK/CHECK/index/RLS/ACL/policy/enum and full public/provider function
envelope against that validated parent. Four synthetic provider field definitions
and member sequence configuration/ownership/ACL are separately guarded. Full
claim/evidence metadata and actual business owner-UPDATE attachments match the
dated observations. Only backed PG18 NOT NULL entries are normalized.

Exact global allowlists require 24 public tables, 43 public functions plus uid,
37 selected attachments and no installed legacy client policies. Drifts in full
profile/Auth/sequence/new claim defaults/evidence CHECK/table and function/provider
ACL/disabled attachment/extra identity helper/table/permissive policy fail before
rollback. Automatic child postflight catches a changed evidence writer; rollback
then restores the unchanged parent before its checks run.

Seven other observed business attachments for team creation, internal-staff
INSERT blocking, custom domain and status notifications/business signup bounty
remain **excluded, not stubbed**. The business/type seed is explicit synthetic
existing fixture state; its INSERT is not whole business provisioning. The actual
owner-intent INSERT branch runs, but no full team/notification/domain/financial
INSERT or native reconciliation acceptance follows. Storage objects, their
policies, bytes and retention/recovery are **not** installed or read; a metadata
path is not proof an object exists, belongs to a claimant or is immutable.

## Retained behavior, not adopted policy

- An unclaimed approval reaches actual full business ownership → old/new profile
  intent → admin audit, claim status audit and sibling rejection. The service-style
  empty request subject produces NULL claim audit actor; intent uses the target
  UUID. Neither is a verified original reviewer.
- An occupied-owner non-transfer claim is marked approved and siblings rejected
  even though owner_id does not change. Successful void execution/status is not
  confirmed ownership mutation.
- Rejected, already-approved and auto-approved claims can be approved; pending
  status/claim-attempt revisions are not fenced. Transfer overwrites current owner
  without expected-owner/tenure revision. Repeating transfer adds another NULL-
  actor transfer audit, including same-owner→same-owner, with no request ledger.
- Actual uid JSON fallback reaches claim status audit for a lab moderator whose
  role is inserted through the real writer. This is synthetic existing authority,
  **not** trusted staff/native/JWT/session acceptance. A nonmoderator uid is
  genuinely blocked by the owner guard even through service-only approval.
- A preexisting reviewer UUID overrides uid; it need not have an Auth row.
  Writing reviewer metadata/notes later does not correct the earlier approval
  actor. The current server's separate approval and reviewer updates remain
  non-atomic; generated middleware/legacy callers are unchanged in this slice.
- Evidence INSERT uses supplied uploader UUID, not uid; DELETE uses real uid or
  falls back to that uploader. An unbound uploader, unverified path and negative
  size can pass the retained table shape. These are privileged SQL controls with
  client policies omitted, **not evidence of a production client RLS bypass**.
- Evidence metadata UPDATE changes file/path/size without an observed audit or
  review-revision fanout. No evidence-set/object/content-version acceptance follows.
- Actual claim/evidence FK and kind/type checks reject invalid input without
  weakening constraints. No file-storage behavior or original consent is inferred.
- Deleting a claim with evidence genuinely fails its cascading evidence-removal
  audit's claim FK; all rows restore. A no-evidence claim deletion cascades away
  audit rows. Neither is immutable retention. No destructive retention repair,
  live deletion or history mutation is attempted.

## Failure and recovery

A late sibling-rejection audit CHECK failure restores earlier full business,
old/new profiles/intent/admin-audit, approved claim/status-audit and siblings.
All **25 Auth/public table** row snapshots match; approval allocates no new
Auth/member sequence value. Removing only the lab fault restores original schema
and genuine successful approval. A late evidence-removal audit CHECK restores
the deleted metadata row and all others, then recovers after fault removal.

Conversely, a real admin_audit_log id NOT NULL fault is swallowed by the retained
intent helper: ownership/profile change succeeds without its intent audit.
Original-default recovery produces the audit. This is a controlled discarded-db
case, not a production missing-audit incident or accepted complete attribution.

Anon/authenticated direct approval/evidence writes are denied with **no legacy
client policies installed**. Owner/service inputs and unsigned synthetic settings
remain explicit controls, not approved human permissions. Captured broad nonrow
table rights remain; RLS DML denial does not establish write containment.

## Verification and publication

- **25/25 focused pass**, 36.094 seconds, zero failures/skips/cancellations.
- Node syntax, direct ESLint zero warnings, Prettier, canonical capture JSON and
  diff/primary review pass. No independent review claimed; known subagent quota
  is unchanged and was not retried.
- **676/676 full serial tooling pass**, 598.845 seconds, zero failures/skips/
  cancellations; then **10/10 receipt assets pass**, 0.283 seconds: **686 aggregate**.
  Focused tests are included in tooling, not double-counted.
- No fresh application suite claimed; this changes tests/CI/evidence/docs, not
  runtime callers. PR #54 application/TypeScript remains parent evidence.
- PR #64 docs `5de2189` passed all six CI gates, **38728141238**. Hosting build
  **05006cb7-c456-4b63-8cb9-c561b9b5f141** failed separately; wrapper
  **38728141233** preview passed, migrations/production skipped. Parent checks
  are not the new publication HEAD's acceptance; verify that head next heartbeat.

Supabase/Postgres skills kept live access metadata-only, retained actual ACLs,
and separated function execution from original-actor authorization.
Current [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security),
[session guidance](https://supabase.com/docs/guides/auth/sessions),
[TLS notice](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) and
[PG17.11 notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
were checked. No engine upgrade, reindex, encrypted-data scan or Auth mutation.

## Exact next action

Do not repeat provider/schema/staff/claim/evidence/owner-intent source recovery
or use PR #45/#47 reduced support fixtures for new full-chain conclusions.
Use this full foundation to build the **unwired original-actor/revision-fenced
claim-review candidate**, beginning with a separate strict versioned command
contract and its adversarial tests. Existing v1 codec and generated middleware
stay unchanged; v1 expectedOwnerId alone is not an ownership revision.

The candidate must explicitly carry/validate expected claim-attempt, evidence-set
and ownership-tenure revisions and a payload-bound request identity. These are
new companion-model requirements, **not columns already recovered or trusted
browser attestations**. Missing/unknown bindings fail closed. Authentication,
fresh reviewer/session authority and current locked revisions must come from a
separate trusted server/database boundary, never browser actor/reviewer fields,
editable user metadata, role labels, supplied UUID equality or service execution.
Parsing/hashing is not an auth check, ledger or confirmed mutation.

Then rehearse an atomic pending/current-owner/version/idempotency decision and
audit receipt against real downstream constraints. Enumerate a common lock order
with other ownership/evidence/team writers; independent-session native Postgres
verification remains required, not simulated by one PGlite connection. Keep
native/team/shift/offboarding reconciliation, immutable private-object custody/
retention and recovery as separate gates before any privileged positive is wired
or migration/production authority adopted. Do not silently turn the legacy
domain/global-admin/service cases into that contract.

Safe independent internal-staff caller acknowledgment/lifetime work remains
available. External CRM adoption and all release prerequisites remain unresolved.
Source **404/423, nineteen unclassified**, all baseline/replay/parity/release flags
false. Existing consent/vehicle tenure/ledger/payout/audit/retention/recovery/
receipt/mobile/owner/full-media/hosting gates stay open. Preserve approved helper
restrictions; quote conversion bypass remains outside them. No production write,
migration/deploy, paid resource, customer communication, data deletion, restriction
replay, PR merge or duplicate automation. Single recurring continuation active;
**365 is not complete or release-ready**.

## UTF-8 LF pins

| Artifact                                             |  Bytes | SHA256                                                           |
| ---------------------------------------------------- | -----: | ---------------------------------------------------------------- |
| scripts/ci/claim-evidence-catalog-review.sql         |  9,814 | 004f50413eaeee3dca1ca655c94aebef6a4893dca6693e80075bbdfe18c9bfec |
| scripts/ci/claim-evidence-catalog-review.test.mjs    |  2,038 | f2449810165b84343ae4ebb4720461be452d9d438bc95fbf777071534e7555d4 |
| docs/evidence/claim-evidence-catalog-2026-10-15.json | 31,842 | 3f70143d79d46daf52b5de222d367ba0bd40a9136c910301953deb24c7a90616 |
| scripts/ci/fixtures/full-claim-evidence-fixture.mjs  | 14,166 | 28a7e0beba95e09667bbb55da18b6cc09914cc85979906a52320e1f339b667c2 |
| scripts/ci/full-claim-evidence-composition.test.mjs  | 20,760 | 2269ff1f8097be9501499ced63b0dfbbfab1bcce03b4f2bd8e8860a911e95a17 |
