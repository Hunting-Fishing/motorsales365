# Customer reminder read/cache hardening candidate

2026-10-15 Asia/Manila. Branch `completion/customer-reminders-request-bound`,
stacked on reminder-proof PR #29 docs `0b8bbed`. Read-only application candidate,
**not production privacy/entry/queue acceptance**. A same-statement invoker read
and trusted native authority remain explicit release gates before shipping this
direct-table consumer.

Draft PR #30: `https://github.com/Hunting-Fishing/motorsales365/pull/30`, code
`a2eff76`. Docs head `f4c86c1` passed all six CI gates (run `38642371142`),
verified on this resume; no production application or database release occurred.

## Current bounded application contract

The browser reminder query becomes an authenticated POST reader with strict
expected-account/customer UUID input, verified middleware-subject matching,
repeated actor/cancellation checks and only the request-scoped caller client.
It reads visible customer id/shop_id, then filters reminders by BOTH requested
customer_id and the shop_id returned by that visible parent. A client cannot
supply or override the shop. Missing parent is unavailable; malformed/null shop
bindings or source failures are generic errors, never guessed bindings/empty success.

Fixed projection: id, customer_id, shop_id, reminder_type, title, notes, due_date,
status and completed_at. Every record, including the 101st sentinel, must have
the complete strict DTO and matching nonnull parent customer/shop bindings;
duplicate UUID IDs are rejected case-insensitively. Physical nullable reminder
shop_id is preserved in the type but not accepted as a matching returned scope.
Native reminder_type/title/status are unconstrained NOT NULL TEXT, so arbitrary
and empty stored text remains valid rather than an invented enum. Notes and
completed_at remain nullable; date/timestamp values are validated without coercion.
No staff identifiers, assignment controls, attachments or broader fallback reader.

Sort: due_date ascending/nulls last then ID ascending, fetch 101/display at most
100 with `hasMore`. Includes all stored statuses. The card explicitly labels
an earliest-due limited snapshot, not a complete/actionable task queue or all
pending work. Old completed reminders may fill a bounded snapshot; queue filters
and scoped pagination require a separate product/data contract.

Authenticated account/customer remounts and source-scoped query keys isolate UI
state. Post-mount success is required despite seeded caches; stale-on-arrival,
zero unused-cache retention, always-refetch, no placeholders/automatic retry and
immediate refresh masking hide old rows/counts/cap labels throughout checking,
failure or unavailability. Source errors are generic with explicit retry. Due
dates format as UTC calendar days; no business-timezone/overdue inference or
automatic notifications. Completion timestamps are stored labels, not verified
human action. No write, toast, confirmation dialog or client singleton remains.

The candidate replaces known-invalid/unconfirmed create/complete/delete paths
with a disabled New reminder control and an explicit attribution/consistency/
affected-row gate. No live record changed and no workflow is claimed repaired.
Restore mutation controls only with a separately tested trusted write contract;
database direct-write authority must be addressed too.

## Non-atomic visibility counterexample: mandatory release gate

Explicit dual filters exclude pre-existing wrong-shop associations, but do not
make the two reads atomic. A hypothetical source-level sequence is:

1. Snapshot S1 permits customer C with shop A.
2. An authorized/external writer moves C to B or deletes it; no live incident,
   actual transfer endpoint or production experiment is asserted here.
3. At S2, stale reminder C/A still matches both application filters and the
   current shop-only reminder policy, despite C no longer being visible in A.

Same expected-account checks cannot version customer/profile/role data. Profile
binding changes can also yield visible-empty rather than unavailable across
snapshots. Rechecking repeatedly cannot provide a one-statement guarantee.

Before release, use a separately reviewed SQL/STABLE/SECURITY INVOKER read under
the original caller: a visible-customer CTE and reminder join on BOTH customer
and shop within the same statement, fixed projection/order/101 sentinel and
honest unavailable/empty envelope. Preserve both source RLS policies, review
auth-only EXECUTE and recovery/collision/default-ACL behavior; no SECDEF, service
fallback or broad grants. That gives statement-start consistency, not immediate
revocation after query start, trusted native identity or physical reference repair.
Test customer move/deletion and profile changes in disposable authorization cases
and real API/role acceptance before switching the application adapter to that API.

## Evidence, performance and verification limits

`customer-reminder-customer-scope-metadata-2026-10-15.json` captures a narrow
column-catalog SELECT at `2026-10-14 21:31:01.231285` UTC, project
`wjxaajgvddtrxxtocxen`: native customer id/shop_id are NOT NULL UUID.
LF SHA-256 `dc210c419872819a12b082ce688cef68e33f2e9f992e0eb183edae1561d13f87`.
Other reminder columns/policies/constraints/triggers/indexes remain in the
preceding pinned card metadata and `CUSTOMER_REMINDER_INTEGRITY_PROOF.md`.
No business row, RPC, live DDL/grant/history/platform or mutation was performed.
Catalog/source observations do not promote baseline, parity or applied lineage.

Existing customer_id, pending-only due_date and PK indexes do not establish an
all-status customer/shop/due/ID sort path. LIMIT bounds returned rows, not scan/
sort work or text bytes. Rehearse representative RLS/plan/load behavior and a
safe index build/recovery. A shop-wide actionable queue needs its own status/
due/ID index/filter/keyset-cursor design and explicit mutable-date snapshot limits.

Verification: 42 handler and 22 UI focused tests pass. The final stable application
snapshot passes 706/706 tests across 47 files, report checker exit 0/no quarantine,
full TypeScript, focused ESLint/Prettier/diff and independent source review.
Tooling remains the preceding 169/169 verified suite; no tooling source changed.
Migration impact: none. Deployment: none. Mocked handler/builder/UI tests do not prove JWT/HTTP/RLS, live
business compatibility, database cancellation or the atomic visibility missing
above. Supabase security guidance preserves caller access and keeps writes gated.

Next: verify this slice and implement the same-statement invoker contract before
production use; continue native writer/provisioning/delegation/offboarding and
baseline/upgrade/recovery closure, then trusted reminder entry/affected rows and
indexed queue pagination. Private consent/tenure/retention, receipt owner/mobile
pilot and hosting gates remain open. No deployment or helper approval inference.
