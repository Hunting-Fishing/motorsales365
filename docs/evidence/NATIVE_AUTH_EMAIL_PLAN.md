# Native Auth email command planning

16 October 2026, Asia/Manila. Source
`0dfac5632009323f9105d60af519070e8d12b4f6`, same integrated branch and
[draft PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68).
The planner produces immutable commands only. No native email route, hook,
provider, queue, scheduler, secret or delivery was activated.

## Payload and identity boundary

`src/lib/email/native-auth-email-plan.server.ts` accepts only the exact successful
result from the current Standard Webhooks verifier instance. A private WeakSet
rejects fabricated, spread, frozen-copy, cloned or serialized lookalikes. Freshness
is rechecked before planning and after hashing. This is same-process object
provenance, not proof that the caller configured the owned 365 hook secret. A
future ingress must bind that secret and endpoint to the canonical project.

Caller policy is explicit and snapshotted before asynchronous work: fixed 365
project, fixed `https://www.365motorsales.com` site origin and a boolean Secure
Email Change setting. It cannot come from webhook or user metadata. The planner
extracts only required identity, recipient, action and token fields from the
verified body. It does not grant authority from UUIDs, roles or editable metadata.
Signed JSON with duplicate keys, escaped-name aliases, non-object envelopes or
more than 32 container levels is rejected. IDs, plain ASCII addresses, opaque
tokens and hashes have fixed local bounds; no illustrative six-digit or guessed
hash-length schema is mistaken for the complete native protocol.

Six existing template actions are supported: signup, invite, magic link, recovery,
email change and reauthentication. The documented generic `email` action and seven
security-notification actions are explicitly rejected, not silently dropped or
mapped to signup. Activation needs an explicit tested handling decision for all
intended actions. OTP-only reauthentication emits no unused confirmation link.

## Native URLs and email-change mapping

The hook's `email_data.site_url` is validated as the canonical **Auth/API base**,
not the website origin. Only the sole 365 API origin with root or `/auth/v1`
(optional trailing slash) is accepted. Generated links do not reuse that input.
This distinction follows the current
[Supabase Send Email Hook guide](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook)
and pinned upstream Auth source
[mail generation](https://github.com/supabase/auth/blob/ce9a8eee0cc042be8c7a42981a7ddae631e41d91/internal/api/mail.go#L705)
and [external host resolution](https://github.com/supabase/auth/blob/ce9a8eee0cc042be8c7a42981a7ddae631e41d91/internal/api/middleware.go#L282).
Upstream source is not proof of the exact deployed Auth version or settings.

Website callbacks use the fixed HTTPS www origin and an action-specific path/
parameter allowlist. Credentials, ports, fragments, raw/encoded controls,
backslashes, normalized path aliases, duplicate/unknown parameters and arbitrary
same-origin nested destinations fail closed. The permitted post-verification
destinations are only `/dashboard`, `/businesses/submit` and `/dashboard/profile`.
Existing apex/other redirects need separate reconciliation, not a silent fallback.
Recovery retains the application's token-hash reset route. This constructs a
link; it does not prove a returned session, cross-device behavior or PKCE support.

| Mode                                        | Recipient and slot       | OTP and hash                                                       |
| ------------------------------------------- | ------------------------ | ------------------------------------------------------------------ |
| Secure change, existing current address     | Current email, `current` | `token` with `token_hash_new`                                      |
| Secure change, existing current address     | New email, `new`         | `token_new` with `token_hash`                                      |
| Non-secure change, existing current address | New email, `new`         | Exactly one supplied OTP variant with `token_hash`; no second hash |
| First email, either configured mode         | New email, `new`         | `token` with `token_hash`; both new-pair fields absent/empty       |

First-email handling requires **explicit empty current email**, not missing/null
fields or incomplete secure token pairs. It follows the pinned native source for
phone-only accounts adding their first address. A valid new address is mandatory;
there is never a fallback to the current recipient. Existing two-recipient secure
change still requires both complete pairs. Supplied old-address metadata must
match the current address.

The shared email-change template now renders an explicit first-address message
without an empty/from link. Both existing secure-change recipient halves retain
the original current-to-new wording, independent of which recipient receives
that half. React escaping is verified in actual HTML/plain text. Legacy route
payload validation and provider behavior remain separate; a template is not an
authorization boundary.

## Retry identity and comparison contract

Event and delivery keys hash version/project/event identity and stable recipient
slots, never random UUIDs, array positions, timestamps or changing token content.
Raw-body fingerprints preserve exact authenticated UTF-8 bytes. A separate plan
fingerprint binds the version, project, fixed site, snapshotted secure-change mode
and body fingerprint. Formatting, recipient/content or policy changes therefore
conflict with a matching event identity rather than producing another retry key.

The compatibility helper checks an actual planner result against exactly six own
data fields from a supplied record. Accessors are rejected without invocation;
extra hidden/symbol/inherited values and thrown Proxy diagnostics cannot produce
an acknowledgment or leak raw errors. This is a comparison only, not proof that
the record came from storage. No event reservation, transactional enqueue, durable
dedupe, retry outcome, queue acknowledgment or exactly-once send is implemented.
The purpose label `critical_auth` does not authorize bypassing hard-bounce,
complaint or other provider/consent controls.

## Verification and release state

Focused run passes **352/352** across three files (1.48 seconds): 212 new planner,
seven actual HTML/plain-text renderer and 133 existing webhook tests. The planner
fixtures use independent Node HMAC/SHA-256, the actual verifier and native
WebCrypto/Request behavior; no crypto or typed-array constructor replacements.
Tests cover actions/mappings, API-versus-site origin, malformed/bounded/duplicate
payloads, provenance, fixed URLs, freshness before/after hashing, policy snapshots,
immutable results, stable identities, changed-content/policy conflicts and generic
errors. Renderer tests cover both secure recipients, first address and escaped
display text. Both new files have a never-quarantined CI step.

Separate independent review identified the API-base and first-email cohort issues
before publication; both were corrected and reproduced as fixed with actual
signed fixtures. No further actionable issue was found in that bounded review.
Full TypeScript and targeted ESLint/format/diff checks pass. Fresh full application
suite passes **1,845/1,845 across 70 files**, 144.15 seconds, zero failures/skips/
quarantine, including all 219 new tests (212 planner + seven rendering) without
double counting. The report checker passes. Commands:
`npx tsc --noEmit -p tsconfig.json`,
`npx vitest run --maxWorkers=1 --reporter=default --reporter=json --outputFile=vitest-report.json`
and `node scripts/ci/check-vitest-results.mjs vitest-report.json scripts/ci/vitest-quarantine.json`.

Fresh source guards pass 103/103 (4.398s) and release/report/inventory/OCR/PDF
regressions 75/75 (8.797s), zero failures/skips/cancellations. Commands are the same
bounded suites recorded in `NATIVE_EMAIL_WEBHOOK_VERIFIER.md`; five inventory
checks overlap and are not summed into a new unique count or the older full
SQL/tooling results.

Fresh complete-checkout `npm run build` passes at `0dfac563`. Commands
`node scripts/ci/verify-worker-bundle.mjs` and `node scripts/ci/verify-release-assets.mjs`
confirm `motorsales365/index.mjs`, the sole 365 backend, 15 OCR/202 PDF assets,
server browser-engine separation and all 214 tracked public files matching
Git/source/copied output. Changed-line lint against `67f81e7e` passes for five
files with zero errors/warnings/pre-existing findings. Existing skipped test-route,
module-directive/input-option and Wrangler main-override warnings remain disclosed;
local packaging is not whole-artifact attestation, upload or runtime acceptance.

Prior published head `67f81e7e` passed all six CI gates (`38769939396`). Independent
hosting build `c9b12d3b-50ed-4b68-96d5-6f345d685f83` failed with only ID/link
reported, no diagnostic text/annotations/root cause. Wrapper `38769939461` preview
passed, migration/production skipped. New publication needs its own exact-head
checks. Passing source tests is not live hook/project/sender, API/roles/storage,
concurrency, owner, provider-delivery or browser/mobile acceptance.

Migration impact/deployment: **none**. No SQL/history repair, restriction replay,
live business/Auth write, email send, paid resource, provider setting, PR merge,
application upload or duplicate automation. The sole hosted 365 project remains
`wjxaajgvddtrxxtocxen`; 366 AI/Barangay Buddy remain untouched. Source mapping
stays 404/423 with 12 historical unresolved, five recorded-unapplied and two
recorded embedded executions; baseline/replay/parity/release flags stay unchanged.

## Next dependency

Implement the atomic event/recipient reservation and enqueue/acknowledgment
contract with the exact schema/backlog/recovery boundaries, plus a bounded
fake-transport provider adapter that distinguishes queued, provider-accepted,
delivery-confirmed and outcome-unknown states. Do not wire this planner into the
legacy dispatcher or activate the Auth hook: enabling it displaces SMTP.

Resolve action coverage, actual project/secret/sender/domain/Auth-setting ownership,
callback compatibility, consent/suppression revision and bounce/complaint policy,
backlog shape, durable retry/correlation and controlled-recipient/recovery gates
before activation. Continue shared original-human/fresh-role/native-team/claim/
offboarding/private-custody/financial and hosting/recovery acceptance in parallel.
The seven-day target does not waive these gates or authorize another hosted backend.

Supabase guidance informed native mapping and activation boundaries; documentation
guidance kept source verification separate from durable delivery and live acceptance.
