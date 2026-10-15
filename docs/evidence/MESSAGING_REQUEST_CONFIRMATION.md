# Messaging request confirmation and lifetime boundary

Date: 2026-10-15 (Asia/Manila). Review candidate, not deployed acceptance.
Draft PR #38, code `22c2724f6607a9a4b69986d4b4d269eafb219149`, branch
`completion/messaging-request-confirmation`.
Parent: PR #37 documentation `1abcab4`; all six CI gates verified in run
`38656320823`. The independent hosting build still fails; the green preview
wrapper is not evidence of an upload. Production migrations/deployment skipped.
This candidate's code `22c2724` also passed all six CI gates in run `38659076609`;
the subsequent documentation head requires a separate next-run check.

## Why this slice follows the source proof

The unchanged-source writer proof distinguishes a returned create UUID, an invite
count (including valid zero), and four void writers whose no-op responses cannot
confirm membership/read-state changes. The old browser callers accepted malformed
results and treated resolved errors as successful automatic reads. Updating local
membership with browser time also retriggered the automatic-read effect.

The installed PostgREST SDK source additionally maps a non-2xx empty HTTP404 to
204/null without setting an error (`PostgrestBuilder.ts`, locked version 2.106.2).
The SDK's normalized error/status/success fields therefore cannot establish the
original HTTP success of these void commands. This is a local source observation,
not a claim that production returned that response. No dependencies were upgraded.

## Implemented boundary

- Six fixed commands only: create, invite, respond, leave, mark read, mark unread.
  Strict actor/thread UUIDs; create title trimmed to 1–80 characters; 1–100 distinct
  non-self member UUIDs. Unknown fields and duplicate/self targets are rejected.
- The unchanged authentication middleware validates the request bearer. The
  adapter checks its expected account against that context before request,
  configuration or fetch binding, and again around awaited work.
- Deliberate chat-only transport exception: raw server POST with the same original
  validated bearer and configured **publishable** key, not the SDK caller object's
  normalized response. No admin/service/anonymous fallback, new auth policy,
  dynamic RPC name, private SDK access, redirect following or automatic retry.
- Hosted HTTPS single-project `*.supabase.co` origins only, no credentials/path/
  query/fragment or nondefault port. Modern `sb_publishable_` keys only. These
  reject custom domains and legacy anon keys rather than silently falling back.
  Actual server configuration compatibility was not read or changed; verify it
  privately before any release without printing key values.
- Original HTTP status checked before response parsing. Scalar commands require
  actual 200 and strict JSON UUID/nonnegative SQL-int count bounded by the requested
  member count. Void accepts actual 204 with an empty body, or 200 with empty/JSON
  null; 404/202/arbitrary objects/scalars fail. Body decoding is byte-bounded at 4096,
  oversize/cancelled streams are cancelled, backend error bodies are not displayed.
- Void result explicitly says `acknowledged`, `effect: unverified`, bound to the
  operation/thread. UI says acknowledged, then refreshes visible membership.
  It does not declare joined/left/read or optimistically clear a conversation.
- Create/invite dialogs validate DTOs again at the client; valid zero invitations
  says no new memberships. Recording an invitation is not notification delivery.
  One-flight refs prevent synchronous duplicate submits; account/thread/open
  instances and abort/request tokens fence late successes and failures, including
  close/reopen, A→B→A and unmount. Drafts remain on current request failure.
- Route command lifetimes include the authenticated account and selected context,
  with immediate consumer-side rechecks before toast/refresh. Signed-out/loading
  auth has no workspace; account-keyed remount clears local private state.
- Automatic reads attempt once per observed inbound watermark, with no fabricated
  membership/timestamp and no same-watermark mutation loop/retry. Explicit manual
  unread suppresses automatic undo of that watermark. A genuinely newer inbound
  message remains eligible for a new automatic attempt.
- Message reads gather all required stages before publishing the visible read.
  Every query forwards the abort signal and disables SDK retries. Resolved query
  errors/non-list responses fail generically. Latest-load/lifetime tokens ignore
  stale responses even when cancellation is ignored. Failed refresh hides old
  rows/maps; empty results clear metadata maps. A manual refresh control remains.
  The composer remounts for account/thread changes.

## Unknown outcomes and intentionally unclosed scope

A dispatched error, malformed response or cancellation can follow a committed
write. The generic error asks the user to refresh before retrying; there is no
automatic mutation retry or rollback assertion. Manual resubmission is not
idempotent or guaranteed safe. Refresh is observational, not proof a write did
not happen; a future idempotency/affected-row API is a separate database contract.
Abort is a UI/network fence, not proof of database cancellation or token revocation.
No separate server deadline is added; host/request stream cancellation and timeout
behavior remain a release acceptance check.

These are strict command transport acknowledgements, not a native authority fix.
The selected source chat helpers/policies still have the characterized behavior.
Native ownership/delegation, mutable profile/role/provisioning writers, business-
team classification and atomic offboarding remain open. No new SQL, migration,
grant, policy, trigger, permission, repair or baseline promotion is supplied.

The reader still uses the existing shared browser client/RLS: it is not the new
server command's fixed-bearer boundary, a SQL transaction, full DTO validation or
a complete/paginated history. Existing 500-DM/1000-group-message caps and unbounded
membership metadata reads remain. Current caps/order can omit newer group history;
this slice must not be treated as full-history/tenant/consent acceptance.
During a same-account pending refresh, the previous snapshot remains visible with
the Refreshing indicator; it is not fresh-only masking or immediate same-account
revocation handling. Route-level group read/unread/respond/leave actions and
automatic reads wait for refresh completion. This is not a fresh-only or server
authorization gate for independently opened dialogs or the excluded writes.
Account changes unmount the workspace, and a failed refresh hides its snapshot.

DM read/unread/notification writes, direct message/group-message inserts, offers,
uploads, search/profile authority and thread-state writes are **outside** the six
command contract. Account/component fencing does not certify those workflows.
Real JWT/HTTP/error/stream behavior, role/API/RLS, realtime delivery, actual
browser visuals/mobile, concurrency, server configuration and hosting acceptance
are not supplied by mocks or a passing build.

## Verification and release status

Focused suites: 176 adapter/parser, 43 dialog, 26 hook, 18 route/reader tests pass.
Tests use synthetic requests/fetch/streams and React/mock readers only; no live
application RPCs, customer messages, business rows/counts or platform mutation.
Full application: 986/986 across 53 files, report checker exit 0, no quarantined
failures (79.00s). The final lint-only alias cleanup additionally passed all 10
route tests. Typecheck/lint and remote CI status are recorded in
`../365_COMPLETION_CHECKLIST.md`. No SQL tooling changed; the complete sequential
tooling suite was re-run on this candidate, 259/259 passing (157.79s). Those
source/provenance/security/asset and memory-only SQL checks are not live database
acceptance.

Migration impact: none. Deployment: none. The local sparse checkout omits public
media and must not deploy. Existing approved invoice-converter restriction remains;
bootstrap/totals permission decision is still pending and was not re-requested.
All baseline/replay/parity/release flags remain false.

Next: independently review this caller slice and the design-only
`NATIVE_COMPANION_AUTHORITY_CONTRACT.md`, then implement its separate disposable
new-candidate tests. Preserve unknown bindings and legacy identities;
do not adopt a status-only offboarding fix or infer trusted owner/delegation from
mutable roster/chat/native role fields.

## Primary transport references

- [PostgREST functions](https://docs.postgrest.org/en/stable/references/api/functions.html)
- [Supabase AbortSignal](https://supabase.com/docs/reference/javascript/using-modifiers-abortsignal)
- [Supabase retry modifier](https://supabase.com/docs/reference/javascript/using-modifiers-retry)
- [Supabase transient retry announcement](https://supabase.com/changelog/45071-automatic-postgrest-retries-for-transient-errors)

Source inspection and these references guided the narrow no-retry/status-preserving
transport. Neither documentation nor mocks replace the remaining hosted acceptance.
