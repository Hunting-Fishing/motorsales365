# Native quote and work-order list integration

Same branch `completion/365-seven-day-integration` and draft PR #68. This extends
the invoice caller slice rather than creating another candidate or adopting an
external CRM. Native quote detail/create/conversion and work-order creation are
not completed by read-only list fixes.
Source commit: `8302c62de94ded30cfff209f3d602d63071bcc71`.

## Verification checkpoint

Final focused integration passes 152/152 across three files (11.03s): 93 quote,
45 work-order list and 14 existing detail tests, strengthened for scoped list
invalidation and explicit relationships. The 138 new list tests are included in
fresh full application 2,314/2,314 across 76 files (124.92s), not added twice.
Full TypeScript, formatting and report checker pass, zero failures/skips/
quarantine. Targeted list/test/guard lint is clean; the older work-order detail
file retains 15 pre-existing any-type warnings. Existing detail/child-dialog
description warnings also remain; visual/accessibility acceptance is not claimed.

Fresh complete build passes at `8302c62d`. Worker/package verification confirms
`motorsales365`, `index.mjs`, canonical backend, 15 same-origin OCR/202 PDF assets
and no browser OCR/PDF engine in the server package. All 214 tracked public files
match Git/source/copied output. Changed-line lint across seven files against
`86c10c1d` has zero errors/warnings, with 15 older findings explicitly ignored.
Fresh source/reference/migration guards pass 103/103; release/report/inventory/
assets 75/75 (10.486s); new CI wiring guards 2/2. Five inventory tests overlap the
first two groups. Existing build warnings remain; no upload or live acceptance.

Prior invoice publication `86c10c1d` passed all six CI gates (`38784952101`),
including real-browser OCR and disposable Parts Postgres. Independent hosting
build `9e90f3b6-f999-4ed0-b77c-6da1a6d250c7` failed with ID/link only and no
annotations/root-cause text. Wrapper `38784952185` preview passed only its
configured skip path (`DEPLOY_VIA_ACTIONS` not true); migrations/production skipped.
New publication needs its own exact-head checks. No hosting fix, upload, live
revision, global schema or owner acceptance is inferred.

## Source behavior

Both lists require a signed-in account with Auth loading finished. Account-keyed
views and per-mount React read-lifetime keys prevent old same-account caches or
A-to-B-to-A in-flight reads from becoming fresh private snapshots. Current rows
are hidden during refresh/error; signals cancel old requests. React Query and
SDK retries are disabled explicitly; failures have generic manual retry controls.
Neither account/lifetime isolation nor query cancellation is fresh backend role,
shop, session or original-human authority.

Fixed projections request at most 101 rows with exact RLS-visible counts and a
deterministic created-time/ID order; at most 100 records are shown. All returned
rows, including the hidden sentinel, must satisfy the selected shape and distinct
native UUID identity. Missing/positive counts with zero returned rows cannot prove
empty data. Unknown, capped or partial views carry qualified completeness labels.
Quote search covers the received visible snapshot, not the full shop. Pagination,
authoritative aggregates and actual multi-role visibility remain acceptance gates.

The quote list preserves received monetary digits without arithmetic or locale
rounding; unusable/oversized values are unavailable, not zero. Native date/time
text is retained, including infinity, expanded/BC years and offset variants;
browser parsing never invents expiry or a calendar policy. Status is not defaulted
to draft. Source UUIDs, required fields and exact count/duplicate checks remain
validated independently of unsupported amount presentation.

The work-order list validates customer/vehicle embedded IDs against their own
work-order foreign keys. Null left-joined details are unavailable, not proof of no
customer/vehicle, and do not create speculative links. IDs casefold canonically;
vehicle year follows nullable int32 without invented recent-year/ownership rules.
Received negative/unscaled monetary text is not rounded or treated as a settlement
balance. A 512-character presentation-only bound prevents oversized numeric text
from entering the display/regex path; the record/count remains, with an explicit
unavailable label. This is not a new database or accounting range.

The obsolete advice to use legacy source files because the new-work-order form
was not ported is removed. Navigation opens the existing form, not a claim that
its unscoped options, late callbacks or separate writes are accepted.

## Verified relationship selection, not whole-schema proof

A narrow canonical-project system-catalog SELECT on 16 October confirmed both
customer FK names (`fk_work_orders_customer`, `work_orders_customer_id_fkey`) and
both vehicle FK names (`fk_work_orders_vehicle`, `work_orders_vehicle_id_fkey`).
Each pair points from the same native work-order column to the same target ID,
with `ON DELETE SET NULL`. List and detail readers now select the verified
`!fk_work_orders_customer` and `!fk_work_orders_vehicle` relationships explicitly,
retaining left-join behavior and response names. No constraint was deleted or
altered. Exact query/rows and limits are in
`work-order-relationship-catalog-2026-10-16.json`.

This follows [Supabase's documented foreign-key disambiguation](https://supabase.com/docs/guides/database/joins-and-nesting).
The observation confirms four names, not API schema-cache resolution, JWT/RLS,
tenant authority, global schema/ACL/trigger parity or migration replay. No customer,
work-order, Auth or other business rows/private objects were read.

The already mounted/account-fenced work-order detail callback now invalidates
the current account's work-order list prefix, including lifetime suffixes, plus
the retained exact legacy key and current customer/vehicle summaries. Existing
invoice-generation account-prefix invalidation already reaches invoice lifetimes.
Quote conversion remains unfenced and invalidates only its old quote-list key;
it is not mechanically broadened into all-account invalidation. Fresh list mounts
do not supply a conversion writer or realtime-refresh acceptance.

## Confirmed next conversion gap

A second read-only catalog SELECT checked only selected child-column names/types/
nullability, matching the retained source. Quote conversion still sends job-line
`hours`/`total`, whereas the native table has `estimated_hours`/`total_amount`;
parts payload sends `name`/`price`/`total` rather than `part_name`/`customer_price`
and omits required `part_type`. Exact observations and requested absent-column
scope: `quote-conversion-column-catalog-2026-10-16.json`.

No conversion was executed, and metadata is not an API failure reproduction.
Changing column names alone would not fix the four separate writes, source item
readiness, original/fresh shop authority, financial amounts/status/stock or durable
idempotency/recovery. Quote detail still has account-unscoped caches and unbounded
item reads. Its creation/conversion handlers and the work-order create/options
remain explicit next implementation and release dependencies, not complete flows.

## CI stability and remaining gates

All six existing CI test/build jobs now name `ubuntu-24.04`, preserving Node22,
the Postgres17 fixture, test timeouts, required gates and existing job count. This
avoids the moving-label transition during the owner target week described in
[GitHub's runner announcement](https://github.com/actions/runner-images/issues/14748).
It pins an OS family, not an immutable image or full build reproducibility.
Migration/deployment/type-generation workflows, provider/Worker settings and
release freezes are unchanged. Two offline YAML regressions check that exact
runner/suite wiring; new list suites are explicit and never quarantined.

Independent review corrections for UUID aliases, oversized numeric presentation,
native date cohorts and duplicate FK hints are included. Component/real QueryClient
tests use synthetic fluent SDK responses, not actual browser/mobile, JWT/API/RLS,
private storage, financial concurrency or database/private-object restore.

Migration/deployment impact: no SQL write, migration/history repair, restriction
replay, live business/Auth/financial mutation, provider activation/email, paid
resource, application upload or PR merge. Only the two bounded system-catalog
reads targeted hosted 365 project `wjxaajgvddtrxxtocxen`; other projects remain
untouched. Mapping 404/423, typed 12/5/2 and baseline/replay/parity/release gates
remain unchanged. New email adapters stay inactive.

Next smallest safe dependency: quote-detail account/read lifetimes and bounded
complete source items, then schema-correct, current-shop-bound create/conversion
acknowledgments alongside the actual authorized atomic writer and recovery path.
Do not repeat completed list/email proofs or call source acceptance financial/live
acceptance. Hosting diagnostics, original-human/fresh authority/native-team/private
custody, local independent-session API/storage/recovery and pilot/test-account
nomination remain open. The seven-day target still needs the Day 2 feasibility
review against accepted journeys, not test/PR counts.

Supabase guidance supplied the relationship/visible-count boundaries; documentation
guidance keeps selected catalog and source tests separate from real acceptance.
