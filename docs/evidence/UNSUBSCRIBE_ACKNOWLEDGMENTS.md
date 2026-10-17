# Unsubscribe acknowledgment and recovery boundary

16 October 2026, Asia/Manila. Same integration branch and
[draft PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68).
This fixes source-level acknowledgment and public-page behavior. It is not an
atomic consent writer, a provider cutover or verified delivery suppression.
Source: `65475626e97cd00c85d9f69a5fcf7546ac3c1e67`.

## Corrected behavior

The legacy handler consumed a token before attempting the suppression write.
If that write failed, subsequent requests returned an already-unsubscribed result
solely because the token was used. The page could even show that result for a
non-OK HTTP response. Some failure diagnostics included raw tokens/database
errors. These were concrete source defects, not a verified customer incident.

The handler now returns an already-unsubscribed acknowledgment only after a
successful read confirms the exact lowercased email and `unsubscribe` reason.
A consumed token with missing, mismatched or differently reasoned suppression
returns HTTP 409 `token_consumed`, without replaying a suppression write. Lookup
failure returns a generic HTTP 500, not an invalid-token or opt-out confirmation.
The empty conditional-consumption response also checks current suppression rather
than assuming another request completed both writes.

Fresh requests require a matching returned token-consumption row and matching
returned suppression row before success. Errors, empty responses and mismatched
acknowledgments never claim success. The token-first write order remains; failures
can leave partial state. All raw diagnostics were removed from these handlers,
and unexpected exceptions return generic errors. No token, recipient or database
error is reflected in an error response. JSON/form/query and RFC 8058 one-click
input paths remain supported; parsing/body-size/backend-binding limitations are
not certified by this change.

The public page treats already-unsubscribed as an acknowledgment only on an OK
response. It distinguishes missing/invalid links, used-but-unconfirmed links and
transient/unconfirmed requests, with a newer-link/support path or explicit GET-
only retry. It does not automatically repeat POST. Recorded opt-out copy does
not promise that all queued/provider mail has stopped. Pending replies must not
overwrite a newer token or page operation after their request scope ends.

## Why used-token repair is not automatic

The current schema has no consent revision or token expiry. Missing suppression
after token consumption could represent a partial failure **or later deliberate
resubscription**. Reapplying the old token cannot distinguish them and could
override newer consent. A conflict is intentionally not silently repaired.

The current fresh-token upsert still overwrites an existing bounce/complaint
reason, and token consumption plus suppression remain two separate requests.
Both need a reviewed atomic writer that locks the token and consent revision,
preserves stronger suppression reasons, has stable retry/acknowledgment rules and
defines delayed-token/resubscribe policy. A changed write order alone is not that
transaction. No schema/migration or retention/consent decision was invented here.

Queue dispatch still needs current suppression checks, classified payload/backlog,
atomic reservation/dedupe and strict provider acknowledgments. A confirmed opt-out
row is not proof that every sender honors it or that a previously queued message
was withdrawn. Auth/security purpose classification also remains separate.

## Verification and release status

Focused tests pass **62/62** across two files (2.79 seconds): 37 handler and 25
actual-page tests. They cover absent/different/error suppression, no used-token
replay, null/mismatched/error acknowledgments, input modes, no raw logging,
HTTP-status-first outcomes and stale GET/POST/unmount replies. Independent read-
only review found no introduced issue within this scope. Targeted lint/format and
diff checks pass.

Fresh combined application suite passes **1,626/1,626 across 68 files**, 109.46
seconds, with zero failures/skips/quarantine. All 195 new tests (133 verifier + 62
unsubscribe) are included, not added twice. Full TypeScript and report checker pass.
Initial integration TypeScript found a Buffer generic annotation mismatch in the
independent HMAC fixture; `3f829a6b` corrects only the parameter type. No runtime
behavior or assertion was weakened. Changed-line lint against `e72553b6` reports
zero errors/warnings/pre-existing findings in six files.

Commands: `npx tsc --noEmit -p tsconfig.json`,
`npx vitest run --maxWorkers=1 --reporter=default --reporter=json --outputFile=vitest-report.json`,
`node scripts/ci/check-vitest-results.mjs vitest-report.json scripts/ci/vitest-quarantine.json`
and `node scripts/ci/eslint-changed-lines.mjs e72553b68b1b39c6259c88479a00f7dff33e6f23`.

Handler tests use a mocked SDK; page tests mount the actual component with
controlled HTTP responses. They are not real database/concurrency/role/provider,
visual/mobile, owner or live acceptance. Both files run explicitly outside CI
quarantine. The signature prerequisite is separately recorded in
`NATIVE_EMAIL_WEBHOOK_VERIFIER.md` and is not connected to these routes.
Fresh full build/Worker/214-file media verification passes at `3f829a6b`; source
guards103/103 and release/report/inventory/assets75/75 pass. Five inventory checks
overlap, not a new unique total; older full SQL/tooling results are not fresh runs.
Build warnings and prior-head CI/hosting status are recorded in that same evidence.
New publication still needs its own exact latest-head CI.

Migration impact/deployment: none. No live SQL/business/Auth mutation, provider
settings, email send, paid resource, application upload, restriction replay,
history repair or PR merge. The sole hosted 365 project remains
`wjxaajgvddtrxxtocxen`; 366 AI/Barangay Buddy remain untouched. Source mapping
stays 404/423 with 12 historical unresolved, five recorded-unapplied and two
recorded embedded executions. Baseline/replay/parity/release flags stay unchanged.

Next: prepare the nonactivated native Auth email planner and atomic consent/delivery
contracts with controlled fixtures. Require project/sender ownership, current Auth
settings, controlled recipients, consent/recovery policy and the broader release
gates before enabling or deploying email delivery changes.

## Existing follow-up reconciled

The existing `continue-365-motorsales-to-completion` heartbeat was updated, not
duplicated: same active status, 30-minute interval, name, original creation time
and target chat. Its instructions now retain the seven-day target, sole hosted
365 backend, superseded staging/cost question, recovered-but-unselected CRM
candidates, complete-checkout requirement and inactive email boundary. Completion
still requires actual acceptance and disabling the follow-up without archiving
the chat. Official [OpenAI thread automation guidance](https://learn.chatgpt.com/docs/changelog)
describes scheduled same-chat follow-up, not uninterrupted execution. OpenAI Docs
guidance informed this update; no model, billing or execution permissions changed.
