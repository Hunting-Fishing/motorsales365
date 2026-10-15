# Account-creation acknowledgment and lifetime slice

Updated: 2026-10-15 (Asia/Manila).

## Bounded application change

The unchanged `/api/admin/create-user` performs separate auth-account creation,
role insertion, profile patch and route-audit calls. Role insertion failure
returns HTTP 207 with `{error,userId}`; profile failure returns 207 with
`{ok:true,userId,email,warning}`. Previously the dialog treated the first envelope
as success and automatically displayed the temporary password in a toast.

The caller now accepts only status 200 and the exact three-field
`{ok:true,userId:UUID,email:capturedEmail}` contract. Its feedback says **request
acknowledged**, not roles/profile/audit confirmed. Both 207 envelopes, other
statuses, malformed/mismatched payloads and post-dispatch exceptions enter a
generic partial/unknown state. No raw server diagnostics or credentials appear
in outcome toasts. Explicit password generation/regeneration/copy remains;
there is no automatic credential delivery or customer communication.

Requests capture serialized input before session preparation and use a
synchronous one-flight guard. The session subject must match the bound account.
Account/configuration/open epochs and cleanup checks suppress stale dispatch,
callbacks, feedback and resets after observed close/reopen, account A→B→A,
configuration changes, loading or unmount. Abort is an attempt to stop transport,
not proof of database cancellation or rollback.

An issued request abandoned before acknowledgment locks creation for that
mounted account scope. The non-PII lock survives close/reopen, configuration
remount and temporary loading; displayed private form state/passwords are cleared.
This does not erase an already captured in-flight request from JavaScript memory.
This is
not a durable idempotency key: whole-component/account remounts, page reloads,
other tabs and server attempts remain separate. Inspect records outside this
dialog before a new attempt. A known acknowledgment closes and clears the form;
new empty-form requests remain possible. Sync/async consumer-refresh exceptions
do not reclassify the acknowledgment, leak diagnostics or trigger retries. The
consumer's independent read/cache lifecycle is not repaired here.

Known input limits/enums are duplicated locally from the current API to prevent
knowably invalid pre-dispatch requests consuming the uncertainty lock. The server
remains authoritative. The historical `seller_type="business"` UI value is not
accepted by the API, so it is rejected locally rather than remapped to dealer,
repair shop or insurance. This does not reconcile the API's broader seller enum
with the actual profile enum or repair its staff `seller_type=NULL` patch. Those
backend/model/provisioning boundaries require the separate dependency review.
Owned identity inputs gain accessible names; this is not full accessibility or
responsive/visual acceptance of the real dialog primitives.

## Validation and release boundary

Tests exercise the actual React component with mocked auth/fetch/UI primitives,
not real HTTP, signed JWTs, database roles/RLS, role-grant authority, affected rows,
signup triggers, session revocation, cancellation, credential delivery or audit
durability. Final focused suite: 41/41 passed in 6.77 seconds (5.46 seconds in
tests). Independent review found three bounded input/accessibility/async callback
issues; they were repaired and the final suite rerun. The callback control checks
that the component attaches rejection consumption before rejection; the test does
not mask it with its own catch. Final lint reports zero errors and four retained
`any` warnings; formatting passes. Full regressions and PR identifiers follow.

The API handler, auth middleware, database functions/policies and password
generation algorithm remain unchanged. There is no migration, production write,
upload or deployment. Do not deploy the sparse checkout or infer backend safety
from caller tests. Preserve the three applied EXECUTE restrictions without replay.

## UTF-8 LF pins

| Artifact                                           |  Bytes | SHA256                                                             |
| -------------------------------------------------- | -----: | ------------------------------------------------------------------ |
| `src/components/admin/add-user-dialog.tsx`         | 35,885 | `6aaca481243bf38f81983b29c4a44b9a4abb60e8bd8e83efd4cbeb4e7dca527d` |
| `src/components/admin/add-user-dialog.test.tsx`    | 42,530 | `680f40395cd9588af679d75b1aba011bebd4a5c3b0b0ea8ac562569ae9f5e54b` |
| `src/routes/api/admin/create-user.tsx` (unchanged) | 12,894 | `5cc551e4cf032dbd92c3e9181f6d0f1430c34a01fb6a20acabf59d358b7abf57` |

## Publication and full validation

Draft PR #51, code `883c505064338d524a7033e761b7d90471abc98a`, branch
`security/account-creation-ack-contract`, stacked on PR #50 docs `3c153c5`.
Final full app: 1,154/1,154 across 58 files, 92.42 seconds, no skips or quarantine.
Full TypeScript passes. Initial full run had 1,153 passes and one timeout in the
unchanged restricted-column source scan; isolated rerun passed all 10 tests in
1.09 seconds (scan 86ms), then unchanged full rerun passed. No test, gate, timeout,
source scan or quarantine was relaxed. Same-run serial tooling 440/440
(349.896 seconds) then separate receipt assets 10/10 (0.483 seconds), 450 total,
passed before this UI-only slice; no database changes were added afterward.

PR #50 docs `3c153c5` has lint/Parts gates passed and four running in
`38687811205` at capture. PR #51 initial code CI `38688116687` is queued; hosting
`471db0a9-290b-4fa2-afde-ae401530ad75` failed separately and wrapper `38688116568`
skips migrations/production deployment. Later documentation heads require fresh
next-resume verification. This slice adds no live calls, migration, mutation or
deployment; the heartbeat's one live database operation was PR #50's catalog-only
read. Supabase/Postgres safety guidance kept that inventory fingerprint-only and
the behavior proofs disposable, not a production authority decision.

Next verify latest heads, continue actual auth/profile/organization INSERT,
staff-domain partner and incoming role/offboarding composition/original-actor
custody, and define trusted claim-attempt/evidence/tenure revision/common lock
protocol before an atomic kernel. Keep account API model/partial-step/affected-row/
audit repair separate, and preserve native/consent/recovery/HTTP/JWT/session/
concurrency/receipt/mobile/owner/full-media release gates. Continuation stays active.
