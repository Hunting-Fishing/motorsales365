# Connected native Shop Manager stock adjustment

21 October 2026, PR #69. Based on `befd03c8c40f1b405a5898bbd3aa3abe9f267ed4`.
This is a connected implementation and an unapplied forward SQL package, not a
production deployment or whole-client acceptance.

## Finished source path

The native inventory detail route now calls an account-bound authenticated reader
and opens `ShopStockAdjustment`. The old separate browser transaction insert and
absolute quantity update are removed from this route, not merely disabled.
Add, Remove and Set Exact support native integer stock, including a result of zero.
A reason, exact item/shop/account and original quantity/microsecond version are
required. Reserved stock and inconsistent quantity aliases are refused, not clamped.

The request is saved in account/shop-scoped sessionStorage before dispatch. A
synchronous latch prevents duplicate clicks. Unknown results, a 20-second caller
deadline, reload and close/reopen preserve the original request ID and full intent.
Check Result and Retry Same Request do not manufacture replacement IDs. A deadline
is not backend cancellation. Browser-data clearing or a different tab/device is
not covered by sessionStorage persistence; the database outcome remains retained.

The public RPC uses the existing authenticated client, with no service-key fallback.
Current Auth user/session rows, JWT expiration, session expiration, anonymous/
deleted/banned state, active shop linkage and business ownership/management are
checked. A user-editable native profile is NOT used as membership authority.

Stock quantity, native transaction, employee operational event and immutable
operation outcome are verified and committed together. Original-version conflicts
and protected-stock refusals produce stable rejected outcomes. Exact retries return
the original outcome without a second stock posting. Conflicting intent is refused.

## Retained employee audit compatibility

The original add/remove code used `stock_in`/`stock_out`, but the actual native
CHECK permits `adjustment`, not those labels. The new writer retains that CHECK.

A read-only hosted catalog inspection found the retained `employee_operation_audit`
trigger. It derives the shop from `current_employee_profile()`, not from the stock
item. The new writer therefore locks and verifies one matching selected profile
and its active shift before a fresh adjustment. Management membership is checked
independently through the business boundary. An authorized manager may read another
accessible shop, but cannot make a fresh adjustment there under a different selected
profile. Existing recorded requests remain recoverable after selection changes.

The audit trigger is not disabled or replaced. Its exact body and profile-helper
body, security mode, search path and attachment are installation prerequisites.
The resulting audit event must match shop, profile, actor, shift, quantity, action
and reference. Missing, duplicated, suppressed or retargeted audit evidence rolls
back the operation. The outcome retains foreign keys/snapshots of transaction and
audit evidence; recovery rejects subsequent evidence corruption.

Observed catalog: PostgreSQL170006; audit body MD5
`d81faf24ab9e5c6744a25ad8d264c3ad`; profile-helper body MD5
`f4135fe6ed3f063cd52be5c69d1ead08`. Those match the retained source used by the
fixture. Only metadata was queried; no customer/stock rows or Auth records were
read or modified. This is selected body correspondence, not full schema acceptance.

## Verification

The test package includes 45 actual-transpiled contract/server cases, 16 actual
SQL groups and 18 actual React route/dialog cases. SQL composes the unchanged
retained inventory declarations, staff boundary, profile/shift/audit tables and
original employee audit functions. JWT claims remain synthetic SQL inputs, not
hosted signature verification. The native PG17 job independently tests duplicate
commit, first-writer rollback, changed intent, stale stock, and selected-profile
lock waits; it verifies one final transaction/audit and reconnect recovery.

Local contract tests and strict standalone contract TypeScript checking passed.
SQL groups were exercised in bounded local selections; one full local batch and
one later batch exceeded the execution tool window, so no complete local full-suite
pass is inferred. A new audit fixture initially attempted a staff insert without
an authenticated owner; the retained boundary correctly rejected it. The fixture
now uses the real owner-role path. No boundary/assertion was weakened.

The dedicated workflow must provide exact-head React, full SQL and native results.
Full application CI remains independent. Existing test timeouts, quarantine,
original migrations, public-stock tests and release/deployment guards are unchanged.
The source inventory retains all 22 pins, ten writer families and false global
readiness flags; its native-route pin and description follow the actual new path.

## Complete staging package and rollback

Generate, without connecting to a database:

```sh
node scripts/client-release/build-shop-stock-staging-release.mjs > shop-stock-forward.sql
```

This extends the complete business-stock/staff-lifecycle package in ONE outer
transaction. Existing schemas/endpoints or missing/incompatible prerequisites
stop publication. Historical migration files are untouched. The workflow publishes
a checksummed `shop-stock-staging-package`; it is not applied automatically.

`shop-stock-suspend-v1.sql` withdraws both public and private adjustment execution
without deleting outcomes, audit records or quantities. Authorized item reading
remains available. Do not restore the old split browser writer as a fallback.
Referenced rows are retained by the outcome foreign keys; business offboarding,
privacy retention and history-preserving deletion must respect these references.

Before activation: complete staging catalog/ACL and lifecycle compatibility,
register the reviewed forward migration, exercise signed-session HTTP calls,
verify suspension/recovery, deploy the matching application, and obtain
multi-business/device acceptance. No new paid staging resource, hosted write,
main merge or deployment accompanies this implementation.

## Remaining whole-client scope

Only business-linked active native shops with an unambiguous selected employee
profile are supported by this endpoint. Unlinked legacy shops need an authoritative
onboarding/mapping path; editable profile selection cannot grant access.
The Parts Shop decimal ledger and native Shop Manager integer ledger remain
separate systems. This change does not synchronize their balances or solve
inter-store receiving/fulfillment, invoice deductions, returns or other writers.
Safe shop switching, historical role provenance, direct native profile/role
containment, the full quote/work-order/invoice/payment/refund loop, whole-platform
recovery and staging acceptance remain open. Do not label the entire client
release complete based on this component's tests.
