# Native invoice read lifetimes and financial acknowledgments

Integration branch: `completion/365-seven-day-integration`, same draft PR #68.
Source commit: `0c23d3368c6afe56408e779379316d1a75cbe69b`.
This slice hardens the existing native invoice list/detail, payment entry and
inventory-line callers. It adds no database writer or migration and does not
complete financial, stock, settlement, role or recovery acceptance.

## Private read lifetimes

Both routes require a signed-in account with Auth loading finished. Keyed account/
invoice boundaries reset private forms and searches. Each mounted view has a
separate React read-lifetime key, preventing old same-account caches or an earlier
in-flight A-to-B-to-A request from serving as a current read acknowledgment. The
list forwards the query cancellation signal. Detail children wait for a fresh
matching primary invoice; refreshing/error/unknown states never paint old private
records or claim deletion/empty results. Queries have zero retention/staleness,
no placeholder data and manual generic retries. Lifetime checks supplement rather
than establish fresh backend session, role, tenant or original-human authority.

Detail item/payment reads request 101 rows with exact visible-row counts, display
at most 100 and require matching IDs/invoice bindings. The list uses the same
101/100 bound and explicit count/completeness labels. Unknown counts, hidden API
caps, truncation, failures and duplicate/malformed rows cannot establish complete
data. Zero returned rows with missing/positive counts are unconfirmed, not proof
that no entries exist. Complete counts describe RLS-visible rows only; they do
not prove the whole financial relation is authorized, visible or reconciled.
Pagination/authoritative aggregate acceptance remains open beyond these bounds.

Independent child errors have generic retry controls. Inventory search is mounted
only with an active editor, has a separate read lifetime, bounded filters/results
and clears stale selection. Unknown stock is labeled unknown, not zero. Scoped
invalidation reaches the current invoice lifetime prefix, the new account-list
prefix, the legacy exact list for compatibility and the actual current-customer
invoice-summary key. It does not invalidate another account's private records.

## Financial acknowledgments

Payment insertion requests exactly one returned row and checks invoice/customer,
amount/method/completed state and reference. A blank reference may legitimately
receive a generated receipt number; a supplied reference must match. The retained
covering-payment invoice update checks its own returned invoice/customer/paid/
method/total fields and uses optimistic source filters. A zero, missing, malformed,
mismatched, failed or rejected acknowledgment never becomes success.

Inventory-line insertion verifies returned invoice/inventory links, whole-unit
quantity, price and total. Its subsequent line read requires exact completeness,
distinct matching invoice IDs and the acknowledged inserted row before calculating
a subtotal. Tax/customer/status reads and the separate totals update are checked;
the update includes expected customer (including null), status and tax predicates.
Missing tax or failed/capped line reads cannot become zero. These optimistic
filters reduce mismatches but do not make the sequence atomic or race-safe.

A shared current-invoice write hold is set synchronously before dispatch to
prevent local double clicks and a second editor's write. All post-dispatch
failures conservatively become uncertain. The hold persists across dialog close/
reopen and primary snapshot changes; every awaited step checks current scope and
readiness before any follow-up. Late results cannot clear another draft, show a
success toast, invalidate a new context or dispatch its next write. Current failures
refresh scoped evidence and warn that a financial write may have completed.
This is a mounted-view hold, not a durable reservation: navigation/reload, another
tab/process, ambiguous network outcomes and concurrent callers still need an
authorized idempotent database command and recovery protocol.

Confirmed caller results say only **Payment entry recorded** or **Invoice line
recorded**. The former stock/COGS assertion is removed. No receipt, invoice status,
optimistic filter or passing UI test proves posting, settlement, stock consumption,
rollback, original authority or financial reconciliation.

## Amount and status compatibility

Retained native invoice/payment/item quantities and monetary fields are unbounded
NUMERIC, not universally two-decimal database columns. This editor supports
nonnegative minor-unit values only and refuses unsupported precision or lossy
decimal-to-number-to-serialized-decimal round trips before dispatch. Integer
stock quantities remain compatible with the native inventory model; unknown cost
does not silently become zero. The display preserves received decimal values,
including unsupported write precision, without default locale rounding. Missing
or malformed values remain unavailable. This caller-support bound is not a new
accounting policy, database limit or permission to rewrite historical amounts.

Only known completed payment entries contribute to the displayed recorded balance;
void/refunded entries are excluded and other free-text states require review.
Incomplete, unsupported or overpaid values and inconsistent header subtotal/tax/
total cannot produce a claimed balance or enable these writes. This does not
reconcile quantity times price against item totals, line totals against headers
or prove ledger/stock correctness.
Conservative caller-supported invoice
states are draft/unpaid/open/sent/overdue; paid/void/cancelled/refunded/unknown states
need a reviewed adjustment/transition writer. Overpayment is not supported by this
editor. These restrictions are explicit compatibility gaps for release acceptance,
not silently dropped refund, decimal or adjustment requirements.

The list's old outstanding aggregate added invoice totals without considering
partial payments. It is removed; filtered visible-record counts replace monetary
aggregates. Recorded totals are not presented as accounts-receivable balances.
Native TEXT invoice IDs and dates are preserved, not UUID/date coerced. PDF export
was not implemented by this slice; the receipt PDF reader is a different feature.

## Retained side effects and remaining transaction gate

The July definitions show why separate browser acknowledgments cannot establish
safe financial completion:

- Completed payment insertion may invoke a journal-posting trigger.
- A later draft-to-paid update may invoke invoice journal and stock consumption.
- Inventory-line insertion into a posted invoice may consume stock/COGS before
  later totals requests finish. A browser availability check cannot reserve stock.

Selected source anchors are `20260713062739_e0144043-a7a4-43b7-8fc6-050ea0304634.sql`
(invoice/item types), `20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe.sql`
(native payments) and `20260715012303_a5daad1f-ca4a-4606-b07d-3f38ec8c7ee9.sql`
(receipt numbering). September demo source replaces posting bodies; its filename
does not establish which trigger bodies are active. Current effective trigger/
schema/authority provenance and real transaction acceptance remain open. No live
financial rows or catalog were read for this UI slice.

## Verification and release state

Combined focused tests pass 133/133 across two actual route/real QueryClient
suites (11.85 seconds): 70 detail and 63 list tests. Synthetic fluent SDK responses
exercise reads, cancellation/lifetimes, receipts and partial/unknown outcomes;
they are not real API/JWT/RLS, browser/mobile or accounting tests. Both suites
have an explicit never-quarantined CI step. Independent read-only review found
and corrected cached-primary freshness, false-empty copy, precision display,
known numeric preflight and optimistic customer-filter issues before publication;
no remaining actionable finding in the refreshed source.

Fresh full application passes 2,176/2,176 across 74 files (129.13 seconds), including
all 133 new route tests without double counting. Full TypeScript, four-file ESLint,
Prettier and report checker pass; zero failures/skips/quarantine. A first TypeScript
pass caught a test-only optional query-key guard; it was corrected without changing
runtime assertions before this full verification.

Fresh complete `npm run build` passes at the source commit. Worker verification
confirms `motorsales365`, `index.mjs`, the sole canonical backend, all 15 same-origin
OCR and 202 PDF assets, and no browser OCR/PDF engine in the server package. The
read-only release-asset gate verifies all 214 tracked public files against Git,
source and copied output. Changed-line ESLint across four files versus `d101f650`
has zero errors, warnings or pre-existing findings. Build warnings include route
test discovery and overridden Wrangler `main`; no upload/runtime claim follows.

Fresh source/reference/migration-inventory guards pass 103/103 (2.557 seconds).
Release/report/migration-safety/inventory/OCR/PDF guard tests pass 75/75
(8.348 seconds). Five inventory tests occur in both runs and are not added as
unique coverage. These include model/asset/source gates, not fresh independent-
session SQL or a complete database/private-object restore rehearsal.

The first local Vitest fork failed its worker handshake before collecting any
tests. Single-worker threads passed using the normal five-second test timeout;
no assertion/quarantine/configuration was weakened. Heavy checks run sequentially
under the limited local RAM snapshot (1.21 GiB free of 15.71 GiB). No local Docker
daemon, image download or API/Auth/storage stack was started.

Prior exact published `d101f650` passed all six CI gates (`38778102213`), including
real-browser receipt OCR and disposable Parts Postgres. Independent hosting build
`60d22afc-094a-4845-8d6e-f87a1e4e5cfe` failed with ID/link only, no root-cause text
or annotations. Wrapper `38778102490` preview passed, migration/production skipped.
The new publication needs its own exact-head checks; prior CI is not current
source, deployment or live behavior.

Follow-up before the next list publication: exact invoice evidence head
`86c10c1d2777031be0786acc97e57dbbee049688` passed all six CI gates in
`38784952101`. Independent hosting `9e90f3b6-f999-4ed0-b77c-6da1a6d250c7`
failed with ID/link only and no root-cause text/annotations. Wrapper `38784952185`
preview used its configured `DEPLOY_VIA_ACTIONS` skip path; migrations/production
skipped. This supersedes the pending invoice-head check state, not live acceptance.

Migration impact/deployment: none. Sole hosted 365 backend remains
`wjxaajgvddtrxxtocxen`; 366 AI and Barangay Buddy remain untouched. No SQL/history
repair, restriction replay, live financial/Auth mutation, provider/email change,
customer send, paid resource, application upload, PR merge or new automation.
Mapping 404/423, typed 12 historical/five unapplied/two embedded and all baseline/
replay/parity/release flags remain unchanged. New email adapters stay inactive.

## Next dependency

Next smallest dependency is the read-only quote list (C3.01): account/loading and
per-mount lifetimes, exact visible counts, generic retry and received NUMERIC
display with real QueryClient/deferred SDK tests. Continue remaining quote/work-order
creation and conversion callers (C3.01–C3.04) with current-account/read/editor
acknowledgment tests, without treating those as
the authorized atomic invoice writer. In parallel close original-human/fresh
session/role/shop/module authority, exact money/tax/status/stock policy, durable
idempotent invoice/payment/adjustment/refund transactions and recovery. The
invoice/work-order link and one authorized stock-consumption point must reconcile.
Current list/detail caller fixes do not complete C3.09–C3.14 acceptance.

Keep local synthetic API/private-storage/recovery and full hosting diagnostics on
the release path. The owner pilot/test-account nomination remains unanswered;
do not repeat the superseded hosted staging question. The Day 2 feasibility review
must use actual accepted journeys, not these source test counts or the seven-day
target as proof of readiness.

Supabase guidance informed returned-row and RLS-visible completeness boundaries;
documentation guidance keeps caller tests distinct from durable/live acceptance.
