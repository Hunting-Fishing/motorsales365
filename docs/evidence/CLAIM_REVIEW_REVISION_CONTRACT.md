# Unwired revision-aware claim review command

## Outcome

2026-10-15, code **dce37b1631a968bf4eb90cd60d09e443230cd286**, branch
`security/claim-review-revision-contract`, based on PR #65 docs `a9987a5`.

A separate v2 syntax/equality/fingerprint contract now carries explicit expected
claim-attempt, evidence-set and ownership-tenure revisions. It reuses the
unchanged v1 scalar/text validation without accepting or auto-upgrading v1 browser
commands. V1 source/test LF hashes are pinned in the new tests. Generated auth
middleware, current claim handlers, Supabase clients, database and UI are unchanged.
Source search confirms no current application consumer outside the new tests.

**This is preparatory, not an authorization or atomic decision endpoint.** It
does not authenticate a human, prove supplied-actor provenance/session/role
freshness, compare against locked current database versions, verify evidence
custody, execute ownership changes, return receipts or maintain an idempotency
ledger. The proposed companion fields are not existing adopted database columns.

## Expected state asserted by the request

| Field                           | Syntax                   | Meaning still required from a trusted locked state boundary               |
| ------------------------------- | ------------------------ | ------------------------------------------------------------------------- |
| expectedClaimAttemptId          | UUID                     | Which claim attempt, independently of stable claim ID                     |
| expectedClaimAttemptRevision    | Canonical decimal string | Version of that attempt and its review-relevant state                     |
| expectedEvidenceSetRevision     | Canonical decimal string | Version of the evidence set, including separately verified object custody |
| expectedOwnerId                 | UUID or explicit null    | Expected current owner, not a revision token                              |
| expectedOwnershipTenureRevision | Canonical decimal string | Monotonic tenure identity across ownership changes and ABA                |

All are required even for rejection or an unclaimed owner. Revision strings are
ASCII canonical decimal **0..9223372036854775807**, without coercion, signs,
whitespace, leading zeros, exponent/hex notation or overflow. Explicit zero is
syntactically valid, **never a default for a missing/unknown binding**. No initial
database value, trusted writer model or backfill is adopted by accepting its text.
Numbers/BigInts are rejected; large integers retain exact bytes beyond JavaScript
safe-integer range. Bounded length/lexical comparison avoids unbounded BigInt
conversion. Future transport must preserve exact text, not rounded JSON numbers.

The separately supplied actor must be a matching UUID for expectedAccountId;
actor/reviewer/claims/verified/authorized fields injected into browser data are
rejected. **Supplied equality is not authentication.** An arbitrary synthetic
matching UUID can still be prepared repeatedly, deliberately tested as a limit.

## Canonical payload and replay limits

The frozen key is `(actorId, requestId)`. Fixed-shape payload includes version 2,
actor/business/claim, expected attempt identity and all expected revisions,
expected owner, decision and exact notes. Its UTF-8 fixed-field-order JSON is
SHA256 fingerprinted. This is **not** a general canonical JSON standard.

Changing an expected revision/attempt/owner/business/claim/decision/notes changes
the fingerprint. Changing requestId changes only the key. Same key/different
payload is a future atomic-ledger conflict; this module does not resolve it.
Owner A→B→A can have unchanged owner UUID and a changed tenure revision/fingerprint.
Returning old bytes still parses: **the codec alone prevents no stale/replay
execution**. Attempt/evidence ABA and repeated equal inputs are equally explicit.

Own enumerable scalar data only: unknown/symbol/nonenumerable/accessor fields and
custom prototypes reject; accessor getters are not invoked. Null-prototype input
is allowed. Missing revisions/optional notes do not fall back to host prototype
pollution. Returned objects/key/payload are detached frozen scalar copies. Notes
reuse v1's exact whitespace/Unicode/line-ending, 2,000 UTF-16-unit bound, NUL and
malformed-surrogate rules; absent/undefined become null, empty remains distinct.
Failures expose one generic error, not input or credential contents.

`.server` is currently a naming convention, not an enforced import boundary.
Node crypto compatibility on the deployed Cloudflare runtime is **unverified**;
an unwired/tree-shaken file and a passing TypeScript/build cannot prove it.

## Validation and release

- **33 new tests pass**; **58 focused v1/v2 tests pass**, 28.74 seconds.
- **1,240/1,240 full application tests across 60 files pass**, 114.058 seconds,
  JSON success/process exit 0, zero failed/pending tests; quarantine not needed.
  No separate application-report checker execution is claimed.
- Full TypeScript passes. Direct ESLint zero warnings, Prettier, diff and primary
  source/test review pass. No independent review claimed; known subagent quota
  remains unchanged and was not retried.
- **10 fresh report/release guard tests pass**, 0.753 seconds. These are a subset
  of the unchanged tooling suite, not added to a new aggregate. PR #65's 676
  tooling +10 receipt assets are **parent evidence**, not rerun for this codec.
- CI adds the v2 file to the existing dedicated never-quarantined claim-contract
  gate. Verify the new publication HEAD's own CI/hosting separately.
- PR #65 head `a9987a5`: CI **38733014822** has five gates passed/unit pending at
  observation; hosting **d95849c7-2798-4699-9864-cebf717fd2d6** failed separately.
  Wrapper **38733014809** preview passed, migrations/production skipped. These
  are parent state, not this publication or production behavior.

Supabase security guidance kept browser-asserted revisions and supplied actor
values separate from trusted authorization. This slice performs **zero live
diagnostics, database mutation/migration or deployment**. No new resources,
customer communication, production deletion, PR merge or restriction replay.
Source404/423, nineteen unclassified; baseline/replay/parity/release and all
native/team/consent/private-object/retention/recovery/receipt/mobile/owner/full-media/
hosting prerequisites remain open. Single recurring continuation remains active.

## Exact next dependency

Do not repeat full Auth/staff/claim/evidence source recovery or this codec. Next
build and test a **disposable companion revision/invalidation model** on PR #65's
full-table foundation: attempts, evidence-set and ownership-tenure versions must
be maintained by all relevant real writers, including legacy/metadata UPDATE,
delete/recreate, owner ABA and evidence mutation paths. Missing/unknown/unverified
initial bindings must deny; do not synthesize trusted zero versions or adopt a
destructive history backfill. Preserve prior proofs and actual constraints.

Then implement an unwired atomic pending/current-owner/revision/idempotency
decision/audit-receipt candidate with a common lock protocol and tests for same
key/different payload, stale attempts/evidence/tenure, zero mutation and rollback.
Original-human custody and fresh role/session/tenant authority remain separate
trusted-server/database requirements. Do not authorize from service/global-role
fixtures, raw user metadata, supplied actor equality or this hash.

Native/team/offboarding and immutable private-storage custody/recovery remain
separate gates. Independent-session Postgres/concurrency and deployed-runtime
proof are still required, not one PGlite connection or syntax tests. Keep v1,
generated middleware and legacy callers unchanged until the complete authority/
revision/common-lock model and release prerequisites are reviewed and verified.
Safe independent internal-staff acknowledgment work remains available.
**365 is not complete or release-ready.**

## UTF-8 LF pins

| Artifact                                              |  Bytes | SHA256                                                           |
| ----------------------------------------------------- | -----: | ---------------------------------------------------------------- |
| src/lib/claim-review-revision-contract.server.ts      |  6,629 | db0f666a431e8a2016e78bae68e5d8fadf6b574e7807e62f797182ddf8879c01 |
| src/lib/claim-review-revision-contract.server.test.ts | 13,814 | 608de6f317985a68408ab080605010a241525c34089e51f2cd9c65138a53dade |
