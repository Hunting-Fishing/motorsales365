# Customer vehicle activity: authenticated read-only card

2026-10-15 Asia/Manila. Branch `feature/crm-vehicle-activity-card`, stacked on
reader candidate PR #22. This is repository implementation, **not a live feature
release**. No database, storage, historical SQL or platform configuration changes.
Draft PR #23: `https://github.com/Hunting-Fishing/motorsales365/pull/23`,
code `9f3f7b8`; latest docs head `3a3f1f2` passed all six CI gates
(run `38631111334`). Reader parent `ec4671e` passed
all six gates (run `38629630823`), not a database or hosting release.

## Delivered contract

The Customer 360 detail route now includes one explicitly selected native customer
vehicle's three independent activity panels. It passes the native customer_id
alongside the vehicle identity; the card excludes other-customer and duplicate
vehicle choices. The account/customer boundary remounts selection. A removed or
mismatched choice unmounts source reads in the same render; signed-out views mount
no private card or queries. The route also gates all private child mounting on
sign-in and remounts its private detail subtree across account/customer changes.
Route error output is generic rather than raw backend diagnostics.

`getCustomerVehicleActivity` retains `requireSupabaseAuth` and the verified
request's Supabase client. Strict input allows only an expected account assertion,
customer UUID, native vehicle UUID and one of three fixed source kinds. The
expected account must match the middleware subject **before** RPC dispatch: an
account switch between cache-key capture and bearer-token attachment cannot put a
new subject's response under an old account's key. The assertion does not select
the authenticated actor. Global `attachSupabaseAuth` remains registered in
`src/start.ts`; no admin/service client, table fallback or automatic retry exists.

Each source maps to its exact new RPC. Strict response parsing permits only the
candidate envelope/projection: boolean availability, at most 26 unique UUID rows,
valid calendar dates/offset timestamps, finite numeric values and nullable fields
where specified. IDs are deduplicated case-insensitively; private/extra fields,
wrong source shapes, unavailable-with-rows and malformed payloads fail closed.
Text fields over 10,000 characters are rejected, not truncated or silently trusted.
Backend exceptions/returned errors and parsing diagnostics become a fixed generic
error without exposing payload details. These checks supplement, not replace RLS.

## UI and cache semantics

Source keys include account/customer/native vehicle/source. Query staleTime/gcTime
are zero, mount revalidation is always enabled, previous/placeholder data is not
used and failures do not auto-retry. The installed TanStack fetcher accepts the
forwarded AbortSignal. Context changes abort the client request and late results
cannot replace another context's panel. This is not proof of server/SQL cancellation.

Loading/revalidation masks old rows, including prefilled matching caches and the
refresh click's immediate render. Errors, unavailable context and visible empty
snapshots are distinct. Refresh/retry affects only its source. Empty installation
copy says no **visible matching** records; an absent business mapping must not be
presented as proof that no installations exist. Each list displays at most 25 and
labels a 26th sentinel. Receipt currencies remain separate, calendar purchase dates
are not timezone-shifted, unknown values remain unknown, and no payment/lifetime
total is inferred. Installations are labeled shop-recorded; work orders show
opened date and current status, not historical transitions or verified repairs.

The card has semantic section/headings, a keyboard-accessible labeled native
selector and established Card/Badge/Button styles with responsive source columns.
It exposes no attachments/storage paths, OCR, sharing controls or write actions.
Existing scoped work-order detail links are retained for visible summary IDs.

Each source is a separate snapshot. The UI explicitly explains that sharing/link
changes appear on a subsequent refresh, not retroactively or instantly. Cached
data is not current consent. No subscription or cross-tab/session revocation SLA
is claimed.

## Verification scope and release dependencies

Focused tests pass 34 handler, 18 component and 13 route-integration checks.
Full local application tests pass 482/482 across 41 files; focused lint/format/diff
pass with four existing route any warnings. Local TypeScript checks pass;
publication CI is recorded in the completion checklist. Independent
read-only review found no further concrete adapter/UI issue. Handler tests mock the builder/client;
component/route tests use React Query and synthetic responses. They do not execute
JWT middleware, PostgREST/HTTP serialization, live RLS or production records.
The card has not yet had a real authenticated browser/mobile or owner pilot; the
existing real-browser OCR CI gate does not verify this new activity UI.
Numeric receipt summaries use JSON/JavaScript numbers, not exact-decimal ledger
arithmetic; they are not financial reconciliation or settlement evidence.
The formatter checks numeric round-trip before displaying a localized amount and
falls back to the received number's string if decimal formatting would lose it.
JPY, three-plus-decimal and tiny values are tested without assuming a fixed SQL
NUMERIC scale or applying currency-specific settlement rounding.

The three RPCs remain **unapplied** and release-blocked. Do not deploy this
consumer before a separately reviewed compatible database release and recovery.
See `CUSTOMER_VEHICLE_ACTIVITY_READ_CONTRACT.md` and
`VEHICLE_OWNERSHIP_CONSENT_GATES.md`: private owner vehicles remain unavailable to
ordinary staff, A-to-B-to-A can revive stale approval, existing financial receipt
access follows current ownership, and native identity/authority remains mutable.
No consent/transfer/financial retention decision is implied by UI implementation.

The route's older primary/customer/list readers still use the existing browser
client; their account-scoped caches and remounts are not a proof of request-bound
identity under every token/role race. A bounded authenticated primary/list reader
audit remains needed alongside the broader Shop Manager cache/role audit.
No whole-route/organization acceptance is claimed. Forward-upgrade/recovery, full
helper/trigger/writer provenance, role/API adversarial testing and hosting/full-
artifact prerequisites remain required. RESTRICT recovery cannot discover every
runtime/string-body caller: coordinate consumer rollback before dropping an API.

Next: verify the exact PR head; complete source/helper/security attachment closure
and the trusted native/roster guard; recover all owner writers and implement/test
serialized consent invalidation/reapproval before private-vehicle acceptance.
Continue receipt mobile/corpus/owner acceptance and then authorized atomic billing
and retail/recruitment slices in checklist order. Do not repeat the pending helper
approval question or widen production permissions to unblock tests.
