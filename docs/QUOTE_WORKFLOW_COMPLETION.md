# Connected quote approval and work-order conversion

21 October 2026. Multi-business client release, PR #69; parent 9afb7fdff23aec8ee12555403c0154b6ff4cdb71.
Source implementation and forward SQL. Not a hosted activation or whole-client acceptance.

## Connected business workflow

The real quote detail route now offers a separate authenticated **Review quote actions** dialog.
It fetches a complete quote review (up to 500 lines), current business/selected employee context,
and a full-content fingerprint. Recording customer approval requires an explicit checkbox stating
that actual customer approval was obtained, plus a mandatory note. The software records that
staff assertion; it does not pretend to contact or obtain consent from the customer itself.
Approval and conversion are separate durable requests, with a fresh review between them.

Conversion of an approved, unexpired, consistent quote creates exactly one work order with its
shop, customer, vehicle and creator explicitly bound. Labor/service names, descriptions, categories,
hours, rates and totals are retained. Parts retain their names, category, descriptions, whole-unit
quantities and prices. A fractional part quantity is rejected, never rounded. Quote subtotal/tax/
total are checked using exact database numeric arithmetic. The original quote's tax and total
remain in the immutable source snapshot and the work-order authorization limit; work-order
subtotal is its total_cost. Later invoice issuance still needs its own explicit tax/source protocol.

Quote lines do not identify inventory allocations. Converted parts therefore correctly use the
native `non-inventory` type, not invented stock links. This operation does not deduct stock,
charge a customer or mark a repair complete. Allocating parts/fulfillment is a separate workflow.
The legacy function omitted required shop_id, used unsupported `aftermarket` part_type, and
cast fractional quantities; its ordinary execution is revoked by the forward package.

Work order, copied lines, original employee audit entry, converted quote, immutable link and
request outcome commit or roll back together. The actual retained employee audit trigger is
preserved and its resulting actor/shop/profile/shift/customer evidence is verified.
All quote-item writes acquire the parent lock; edits waiting on a successful conversion are
rejected. Converted source quotes/items and conversion receipts cannot be mutated or deleted.
No old browser-to-database conversion fallback is used.

## Authority and recovery

The new public RPC uses the caller's authenticated client. It composes the reviewed native-stock
user/session/expiry/ban/anonymous checks, authoritative business-management membership and
selected employee/shift locks. A profile selection or editable JWT metadata cannot grant business
membership. Cross-business customer/vehicle bindings are rejected. These functions do not repair
historical membership provenance or certify every old privileged helper.

Each request binds account, shop, quote, profile, microsecond versions, reviewed fingerprint,
action, reason and a unique operation ID. Session storage is saved and read back before dispatch.
Double clicks share one in-flight request. Deadline/unknown/unavailable replies retain the same
request; Check result and Retry same request never generate a replacement ID. A missing outcome
is not cancellation. Matching completed/rejected outcomes are stable on replay; a changed intent
under the same ID is refused. Account changes hide old drafts and ignore late replies.
Tab-local persistence does not survive clearing browser data and is not cross-device persistence.

## Tests and evidence boundaries

The initial complete local SQL run passed 12/12 groups in 29.086s with no skipped/cancelled cases.
Fixtures compose actual retained tables, constraints, work-order numbering and employee audit
functions under authenticated database roles; JWT claim inputs are synthetic, not signed HTTP.
Initial implementation testing found and corrected the actual audit key type (bigint), numeric
text-to-integer conversion, a nonexistent fixture FK assumption and an ambiguous SQL variable.
No original schema constraint or safety assertion was removed.

The actual TypeScript contract/server source passes 59 local Node tests. Strict standalone contract
TypeScript and formatting/syntax checks pass. React tests and seven real PostgreSQL 17 races are
separate CI gates, not inferred from local SQL or SDK doubles. The native cases cover duplicate
commit, first-writer rollback, changed intent, stale review, both item-edit/conversion orderings,
and session expiry during a lock wait, with observed blocker PIDs and reconnect recovery.

The retained quote-detail tests still cover read/privacy/lifetime failures. Only the obsolete
"disabled conversion" expectation changes to a separate enabled review trigger: opening review
cannot invoke the legacy RPC or dispatch an action without fresh authorized data.
Full application CI, other stock/native tests, quarantine and deployment guards remain mandatory.

## Staging and remaining scope

`node scripts/client-release/build-quote-workflow-release.mjs` produces one cumulative transaction
including the current business/native-stock and shop-selection packages. It never connects to a
database. Existing conflicting objects, missing audit/authority prerequisites or unexpected grants
stop installation. `quote-workflow-suspend-v1.sql` withdraws mutation/inspection execution while
retaining all history, work orders, source guards and authorized quote reads. Do not restore the
legacy conversion as a fallback. Receipt/history foreign keys require a reviewed retention policy.

No live write, main merge, paid staging resource or production deployment accompanies this code.
Supabase staging-branch creation requested a cost-confirmation ID; no branch was created.
Current-schema/lifecycle compatibility, signed-session calls, migration registration, staging,
real-device/multi-business acceptance and production activation remain required.
This finishes the source-level quote approval/conversion path, not inter-store stock fulfillment,
work-order invoicing, payments/refunds or the entire client release.
