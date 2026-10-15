# Native email webhook verification boundary

16 October 2026, Asia/Manila. Integration branch
`completion/365-seven-day-integration`, existing
[draft PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68).
Verifier source: `5e5d5f8a26a5e9befab1ff9ac507d47f2ca3c15c`.
This is an offline, unwired prerequisite for selective PR #9 email work, not a
new email endpoint, delivery cutover or release approval.

## Implemented boundary

`src/lib/webhooks/standard-webhooks.server.ts` verifies HMAC-SHA256 over the exact
`id.timestamp.raw-body` bytes using WebCrypto verification. It never parses or
reserializes JSON before authentication. The caller supplies one secret and one
header family; neither is selected from the incoming payload. Standard `webhook`
headers are the default, while `svix` requires an explicit caller option. Mixed
families, malformed/duplicate-coalesced security headers and unsupported-only
signature sets fail closed. Multiple valid `v1` signatures allow signature
rotation with the configured secret; this is not a multi-secret configuration
or an asymmetric-signature verifier.

The helper accepts canonical standard-base64 secrets with optional `whsec_` or
`v1,whsec_` prefixes, decoded lengths 24–64 bytes. It limits metadata, signature
count and header size. It requires POST and an unconsumed/unlocked, uncompressed
body; declared and actual lengths are checked independently. Stream collection
has a 20,000-byte limit, a one-second total deadline and a finite read count to
bound empty-chunk starvation. Cancellation is best effort and never waits on a
source's potentially non-settling cancellation callback. Producer-mutable chunks
are copied. Freshness is checked before and after body collection and again
after crypto, with a fixed five-minute allowance in either direction.

Only after successful verification is UTF-8 decoded strictly, preserving a BOM.
The result is an immutable event ID, timestamp and original body string. Errors
use one generic message and fixed codes, without payloads, signatures, secrets,
causes, console output or network calls. A future adapter must never log the
returned body, which can contain authentication tokens and personal information.

These are deliberately narrow local policies, not a claim of universal Standard
Webhooks compatibility. ID characters/length, canonical positive timestamp form,
eight-signature maximum, 20,000-byte limit, one-second read deadline, HMAC-only
support and mixed-family rejection must be checked against the approved sender
before activation. The general standard permits broader IDs and migration
between header families. Current protocol references:
[Standard Webhooks specification](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md)
and [Supabase Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks).

## What this does not complete

A valid signature establishes possession of the configured signing secret, not
the project's ownership, original-human identity, caller/shop authorization,
fresh role/session authority, consent or permission to send arbitrary mail.
Fresh timestamps do not prevent replay within the allowance. The stable event
ID still needs an atomic durable dedupe/content-binding ledger. Returned data is
not schema-validated or a provider acknowledgment; empty signed bodies are
allowed at this layer and must be rejected by a future JSON/schema adapter.

The [Supabase Send Email Hook guide](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook)
states that enabling the hook replaces SMTP delivery. No hook, sender/domain,
secret, scheduler, route or provider setting was changed. Existing legacy email
routes/dependencies remain unchanged, and no customer or synthetic email was sent.
Supabase project `wjxaajgvddtrxxtocxen` remains the only hosted 365 backend;
366 AI and Barangay Buddy remain separate and untouched.

Read-only legacy/source review identified these remaining activation blockers:

- Fresh random message IDs do not deduplicate Auth hook retries. Queue reads and
  sent-log checks precede provider side effects without an atomic reservation;
  an after-send unique log cannot establish exactly-once delivery.
- Some suppression, sent/failure-log and queue acknowledgment errors are ignored.
  Queue SQL producers and consumers also use incompatible payload shapes.
  Do not enable processing against an unclassified existing backlog.
- Transactional dispatch accepts a signed-in user's arbitrary recipient/template
  inputs without the necessary originating-action/tenant/fresh-authority contract.
  Runtime backend binding is not proven by a repository config file.
- The legacy unsubscribe false-acknowledgment/raw-logging defects are corrected
  separately in `65475626`; see `UNSUBSCRIBE_ACKNOWLEDGMENTS.md`. Token-first
  partial writes, stronger suppression reason overwrite and atomic consent/
  revision recovery remain open. Old-token repair must not override later consent.
- PR #9's proposed provider adapter lacks bounded transport/response handling
  and strict successful provider receipt validation. Signed delivery events still
  need durable correlation/dedupe, not just signature verification.

## Verification and release status

Focused verifier tests pass **133/133** (433 ms total, 84 ms tests). Command:
`npx vitest run src/lib/webhooks/standard-webhooks.server.test.ts --maxWorkers=1`.
They cover exact Unicode/CRLF/BOM bytes, tampering, secret/header/signature bounds,
freshness and late rechecks, declared/actual UTF-8 byte lengths, consumed/locked/
aborted bodies, stream errors, absolute and timer deadlines, non-settling
cancellation, empty-chunk starvation and producer-mutated views. Tests explicitly
show that verifying the same signed event twice does not perform dedupe.

An initial JSDOM run exposed a Node Request/JSDOM typed-array realm mismatch.
The server-only test uses Vitest's Node environment instead of replacing a typed-
array constructor or weakening crypto/input assertions. No verifier bypass was
introduced. Fixtures use independent Node HMAC and actual WebCrypto/Request/
ReadableStream behavior. Independent native Node 22 checks also passed BOM/
Unicode/CRLF preservation, the 20,000-byte boundary and timeout despite hanging
cancellation. The separate read-only reviewer found no actionable module issue;
their two additional read-boundary regressions were added and pass.

Module/test lint and formatting pass. Fresh combined application suite passes
**1,626/1,626 across 68 files**, 109.46 seconds, including all 195 new tests
(133 verifier + 62 unsubscribe) without double counting. Report checker and full
TypeScript pass, zero failures/skips/quarantine. Initial integration TypeScript
found a fixture Buffer generic mismatch, corrected by annotation-only follow-up
`3f829a6b0d09151a52fff5bb0c23e96c5270054d`, without runtime/assertion changes.
Changed-line lint reports zero errors/warnings. The CI workflow runs both slices
explicitly outside quarantine. Commands and acknowledgment limits are in
`UNSUBSCRIBE_ACKNOWLEDGMENTS.md`. These tests are not live Supabase/provider,
Worker-runtime, real-role, storage or customer-delivery acceptance.

Fresh complete-checkout `npm run build` passes at `3f829a6b`. Commands
`node scripts/ci/verify-worker-bundle.mjs` and
`node scripts/ci/verify-release-assets.mjs` confirm `motorsales365/index.mjs`,
sole 365 backend, 15 OCR/202 PDF assets, no browser OCR/PDF engine in the server
package and all 214 tracked public files matching Git/source/copied output.
This is local artifact verification, not upload or whole-artifact/live acceptance.
Build warnings include skipped test-route files (including the two new tests),
ignored module directives/input option and the existing Wrangler main override.
They were not hidden or treated as clean visual/runtime acceptance.

Fresh source guards pass **103/103**, 2.263 seconds:
`node --test scripts/ci/parts-plan-reference.test.mjs scripts/ci/migration-remaining-source-ledger.test.mjs scripts/ci/retired-cloud-auth.test.mjs scripts/ci/seven-day-integration-inventory.test.mjs`.
Release/report/inventory/OCR/PDF regressions pass **75/75**, 11.532 seconds:
`node --test scripts/ci/verify-release-assets.test.mjs scripts/ci/check-vitest-results.test.mjs scripts/ci/supabase-release-safety.test.mjs scripts/ci/seven-day-integration-inventory.test.mjs scripts/vehicle-receipts/verify-ocr-assets.test.mjs scripts/vehicle-receipts/verify-pdf-assets.test.mjs`.
Five inventory checks overlap; these are not a combined unique test count or a
rerun of the older full SQL/tooling suite.

Prior exact publication `e72553b6` passed all six CI gates (`38764688404`). The
separate hosting build `e96dd8b6-cdb0-4211-bc13-db782a9badfb`, check `116529931765`,
failed with only ID/link reported, no diagnostic text/annotations/root cause.
Wrapper `38764688552` preview passed, migration/production skipped. An initial
diagnostic read returned HTTP 502; later exact-head discovery confirmed unit
success. New publication requires its own exact-head checks. No upload is inferred.

No migration, schema change, live SQL/Auth/business write, restriction replay,
history repair, paid resource, PR merge, application upload or duplicate
automation is part of this slice. Exact source correspondence stays 404/423;
the 19 remaining entries stay 12 historical unresolved, five recorded-unapplied
candidates and two recorded embedded executions. No baseline/replay/parity/
release flag changes. Never deploy the older sparse artifact.

## Exact next dependency

Build and test a nonactivated Auth payload-to-delivery-plan adapter: supported
action/schema bounds, sole-project and approved redirect binding, secure
email-change current/new recipient and token/hash mappings, stable event/recipient
slot identities and same-ID/different-content rejection. Output commands only;
do not enqueue or invoke a provider. Then implement an atomic durable delivery
contract and bounded provider adapter with fake transport, separately identifying
queued, provider-accepted, delivery-confirmed and outcome-unknown states.
The current six existing templates do not cover every documented Auth action;
unsupported actions must fail explicitly and block activation, not disappear.

Before activation, verify approved provider/sender-domain/hook/scheduler ownership,
secret presence without exposing values, backlog handling, controlled recipient,
recovery and owner acceptance. Keep original-human/fresh-role/native-team/claim/
offboarding/private-custody/financial transactions and hosting/recovery gates open.
Local synthetic API/Auth/storage and a reviewed production-safe acceptance path
must honor the sole-hosted-backend requirement; production is not disposable
staging. The pilot/test-account question remains open, not repeated here.

Supabase guidance informed the signature-versus-authority and hook-activation
boundaries. Documentation guidance kept verified source evidence distinct from
provider readiness and release acceptance.
