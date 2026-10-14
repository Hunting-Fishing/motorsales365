# Customer 360 request-bound primary and native lists

2026-10-15 Asia/Manila. Branch `completion/customer-detail-request-bound`,
stacked on the native composition proof. Application-only candidate; no live
release, schema/grant changes or completed tenant-authority claim.

Published as draft PR #26, code `0357afb`, stacked on PR #25 docs head `9152836`
(all six CI gates, run `38635100444`). PR #26 remote CI pending at publication.

## Changed read boundary

The customer detail route's three browser Supabase queries are replaced by a
POST server function using the existing `requireSupabaseAuth` middleware and
only its request-scoped caller client. A strict UUID/account/customer/kind input
allows only the customer, vehicle and work-order sources. Expected-account versus
verified middleware-subject mismatch fails before handler request/schema access.
Actor and cancellation checks repeat before dispatch and after each await. No
admin, browser, broad reader or RPC fallback is present.

Primary customer reads retain the fixed existing contact/business/notes fields.
Each list request independently checks customer visibility with an ID-only read,
then selects only its fixed summary fields and matching customer ID. The returned
DTO must have the exact complete shape, types, matching customer/record IDs and
no duplicate IDs; malformed, extra-field, backend or cancellation results become
generic failures, not empty success. SQL table access remains governed by existing
RLS; request-bound reads do not repair the underlying mutable native authority.

Both lists sort by created_at descending/nulls last then ID descending, fetch
101 and return at most 100 with `hasMore`. A visible empty list differs from a
customer-unavailable list. UI counts use an em dash while unavailable/loading/
failed, and `100+` with an explicit most-recent-visible cap when truncated.
No attachment, write, invoice, message or permission action is introduced.

## Freshness and cancellation

Query keys retain account/customer/source separation. Queries are immediately
stale, retain no unused cache, refetch on mount, use no placeholder data and do
not automatically retry. Preseeded successful cache alone is not usable: a
successful fetch after mount is required. The primary refresh masks private
content immediately; pending/refetch/error/missing state unmounts private cards
and list observers. Remount requires fresh list responses. Source refresh/error
hides old list rows, vehicle options and counts independently of the other list.
Account/customer remount and sign-out remove the old private body; React Query
signals are forwarded to the server function and request-bound source builders.

These are response/cache semantics, not instantaneous live revocation. The
primary visibility gate and list query are separate snapshots; HTTP signal
forwarding is not proof of PostgreSQL cancellation. An already-rendered page does
not receive continuous authorization updates. Communications, reminders and
commercial cards remain separately implemented read paths and require their own
authority/cache review. No full-customer-page or production privacy acceptance is
inferred from this bounded slice.

## Evidence and verification

`customer-detail-column-metadata-2026-10-15.json` preserves a narrow read-only
column-catalog observation at `2026-10-14 20:37:54.266021+00`, project
`wjxaajgvddtrxxtocxen`. It checks selected UUID/integer/boolean/numeric/timestamptz
types and nullability used by the DTOs. No business rows were read or changed.
LF SHA-256: `c829f4fe2fac2d72352e78cb3d748637948069b09f358f01807972ff1516a2c8`.
This is not complete schema/API parity or real-row compatibility proof. Native
generated types cover public only, so a bounded local client adapter is retained.
Numeric totals preserve only the received JavaScript number precision; displayed
PHP formatting is not exact financial reconciliation or a currency-model change.

Focused handler tests pass 29/29 and route integration tests 24/24. Full local
application suite passes 522/522 across 42 files with two workers, report checker
exit 0, no unexpected or quarantined failures. Full TypeScript checking passes
against the final stable files. Focused ESLint has zero errors (one existing route
`any` warning); formatting/diff checks pass. Independent source review found no
concrete blocker. Tooling remains 156/156 from the composition proof; no tooling
or SQL changes in this application slice. Full-checkout remote build/browser/API
fixture gates remain pending, not substituted by the sparse local checkout.
Handler tests mock middleware/builders; route tests use mocked server functions
and real React Query. They do not validate actual JWT/HTTP/PostgREST/RLS, real
customer data, mobile rendering or database cancellation.

Supabase function/privilege guidance informed preserving the caller client and
leaving grants unchanged. No migration, historical SQL, recovery path, platform
setting, paid resource or deployment is changed. The existing activity APIs stay
unapplied and release-blocked.

## Exact next dependency

Finish native writer/security attachment, trusted profile/role provisioning and
offboarding closure before any companion guard or atomic invoice implementation.
Audit the remaining customer cards' request/cache boundaries independently.
Bounded source/current-catalog findings and their exact next order are preserved
in `CUSTOMER_CARD_REMAINING_GATES.md`; the observed reminder policy is already
shop-scoped, not its old always-true source declaration.
Complete strict private-vehicle consent/ownership-tenure and retention decisions,
baseline/upgrade/recovery tests, real API/role/browser/mobile acceptance, scanner
recovery/owner pilot and hosting authentication/full-artifact prerequisites.
Separate bootstrap/totals containment approval remains pending; it is not
re-requested or inferred from converter approval. No production release occurred.
