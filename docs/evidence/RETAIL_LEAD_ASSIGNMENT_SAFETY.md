# Retail lead assignment safety

16 October 2026, Asia/Manila. Same integrated candidate and draft
[PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68).
The existing retail lead assignment path now binds the prior account,
organization, lead and selected assignee. Source
`bd5e4b0406c899d84d348386e5bfcebfb0f9d7cc`; final integrated
TypeScript/build checks pass below, with publication/exact-head CI separately recorded.
This is connected assignment safety, not a completed sales/recruitment pipeline.

## Server assignment contract

`assignLead` requires strict expected-account and prior expected-org input,
snapshots all four validated primitive intent values before request access, and
composes the unchanged captured-caller/current-Auth-record guard. It retains the
existing org member/manager RPC and native RLS boundaries; it grants no authority.
All selected success envelopes require `error: null`; membership/manager results
must be actual boolean true, not truthy values.

The primary lead must match both requested ID and prior organization. A nonnull
assignee must pass the selected org's membership check; explicit null preserves
unassignment. The update is filtered by lead and expected org, disables supported
SDK retries and requests an exact selected-row acknowledgment. Its own data
fields must match ID, org and assigned user/null. Zero rows, mismatches, malformed
or failed acknowledgments are not success. Caller/request checks surround every
await and recheck after the existing audit wait before private return.

Failures are generic; any unacknowledged dispatched update is uncertain. The
existing best-effort privileged audit logger is unchanged and is not a caller or
authorization fallback. No other lead server function's status/note policy was
changed; the existing file was mechanically formatted.

These are separate HTTP checks and one update, not an atomic membership/revocation
transaction. Concurrent same-org assignments can still overwrite one another;
membership/role/lead changes after preflight, durable retry, original-human/fresh
native-shop authority and recovery remain open. Existing org membership is not
trusted native Shop Manager authority.

## Connected detail route

The detail has a committed account/lead/prior-org scope, per-mount private query
keys and top-level Query signal forwarding. Lead/activity identities must match;
member choices are fetched only from the loaded matching lead's actual org.
Errors are generic with explicit retry. Paused and invalidated snapshots hide
retained private data/options; subscribed invalidation flags also cover
invalidate-without-refetch. Exact-key current cache witnesses protect admission
and completion in the tick before React commits a changed read.

One synchronous operation latch prevents overlapping assignments and stale
callbacks. A dispatched assignment with unknown/mismatched outcome holds this
mounted view before the pending latch is released. Ordinary refresh cannot clear
the hold or reset the note draft. Account/target/logout/Auth-loading teardown
permanently loses old callbacks; retained-user Auth loading is not fresh-role
proof. Holds end on remount/reopen and do not cancel pending server writes or
supply durable dedupe.

Existing status/note callbacks are current-only and share the operation latch,
but their server acknowledgments, affected-row/partial-note outcomes and policies
remain legacy and unaccepted. A won status is not customer/order conversion.
The inbox, performance reader, other routes, complete read/activity/member caps,
new due tasks/reminders and recruitment orchestration remain separate work.

## Verification

- Actual-handler synthetic suite 106/106; real QueryClient/route suite 45/45.
  Combined 151/151 in 5.71s (2.18s tests), one worker/768-MiB heap and ordinary
  timeouts, no failures/skips/quarantine changes.
- First focused run 137/151 exposed seven harness Promise-wrapper mismatches and
  seven route cases affected by error-state precedence/duplicate member retries.
  The test-only call wrapper became async; actual primary error precedence and
  duplicate retry rendering were corrected. Same two files then pass 151/151.
- Independent review corrected paused/invalidated reads, same-tick cache/held
  races, primitive intent capture, strict success envelopes and lazy valid-ID
  mismatch controls. Final frozen-source/test/CI review has no actionable findings;
  reviewer ran no tests.
- Owned formatting passes; ESLint has zero errors and 16 existing warnings in
  retained helpers/display/legacy functions. Changed-line results are separate.
- Root final combined receipt/customer/assignment run: 703/703 across eight files,
  35.65s, single worker and ordinary timeouts. Includes the 101 receipt-panel
  tests, shared receipt31, caller helper92, customer detail67, commercial126,
  communications135 and this assignment151. No failure/skip/quarantine change.
- First combined run also passed 703/703 (23.53s). Full TypeScript then found only
  a receipt StrictMode fixture `Query.setData` option missing its required manual
  flag. Adding test-only `manual: true` preserves the timestamp/in-flight assertions
  and matches QueryClient seeding semantics; final 703/703 above passes after it.
- Seven-file changed-line lint against `3dfca78a`: zero new errors/warnings,
  23 older findings elsewhere. This separately verifies new/changed lines.
- A dedicated unconditional single-worker, never-quarantined CI step includes
  both new assignment suites, with the literal dollar-sign route path quoted.
  Both offline mandatory-step/Ubuntu-family guards pass (113.127ms); all existing
  selected native-PG17/Parts/quote gates and ordinary timeouts are retained.
- Full integrated TypeScript and fresh complete build pass at `bd5e4b04`.
  All 214 tracked public Git/source/output copies, Worker identity/canonical
  backend/15 OCR/202 PDF/server boundary verify. Expected route-test/module/
  chunk/Wrangler warnings remain. No sparse artifact/upload. New publication
  still needs its own exact-head CI, not a runtime claim from packaging.
  Parent `3dfca78a` passes all six Actions gates, including
  critical533/533 and application2,998/2,998; that is not this new source's result.

All Auth/native query/mutation/audit responses in these tests are synthetic.
There was no live JWT/API/RLS/storage write, role change, database transaction,
restore, owner journey or real assignee/customer communication.

## Release impact and next dependency

No migration/SQL/grant/restriction replay, live Auth/business write, provider
activation, customer send, Docker, paid resource/new hosted project, upload,
deployment or merge. Sole hosted backend remains `wjxaajgvddtrxxtocxen`; other
business projects, PR base/draft and main are preserved. The quote candidate
remains revoked/unapplied/unconnected.

Continue trusted original-human/fresh session/role/tenant/native-team/claim/
offboarding authority and an authorized atomic assignment/conversion/recovery
path. Receipt server DTO/attachment completeness and typed durable writer
outcomes remain immediate connected dependencies. U1/U2 action-level findings
in the acceptance ledger distinguish retail triage, parts-network partnerships
and the dedicated affiliate program. Their due tasks, conversion, reporting and
independent-role acceptance gaps are substantive Day 2 feasibility inputs, not
final polish. The seven-day date is a target, not a verified forecast; no scope is
silently removed.
