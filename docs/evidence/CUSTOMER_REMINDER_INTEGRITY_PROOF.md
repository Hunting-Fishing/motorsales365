# Customer reminder integrity: retained-source characterization

2026-10-15 Asia/Manila. Branch `security/customer-reminder-integrity-proof`,
stacked on communications PR #28 documentation head `b6478f7`. Offline behavior
proof only: **not a production incident, authority fix, complete native schema,
baseline/history approval or live reminder-entry acceptance**.

Published as draft PR #29, code `78f9460`. Remote CI pending at publication;
the verified communications parent `b6478f7` passed all six gates (run `38639864235`).

## Exact execution boundary

The new memory-only suite pins original whole files and six selected sections.
Only the reminder CREATE TABLE-to-EOF suffix, the selected current-shop helper,
and conditional policy-rewrite block 4 execute in fresh disposable PGlite.
Expense/storage statements, the rest of the security sweep and the historical
migration chain never run. No old SQL/evidence is edited or migration added.

| Original source                                           | Whole-file LF SHA-256                                              | Executed scope                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `20260714034131_1bed039d-569f-4b91-8f56-bf19451a7786.sql` | `b19993ff90b57a5adb8272b141d7bdb765f1066dca4a554ec46ab4d8cfe821c9` | Reminder suffix, including its actual table, grants, indexes, timestamp function/trigger and original policy |
| `20260805084402_cd07847a-26f0-4c31-a2fe-ab0088684f77.sql` | `d987fe1e83505eb4002529a5290361fba2ff4af994938986ced9006c1502b321` | Only conditional always-true-policy replacement block 4                                                      |
| `20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql` | `30dfd8df0c3537efb5155a8891804e00444b180f55e674b56d522e473e2f4144` | Exact `get_current_user_shop_id()` definition                                                                |

Selected suffix/table/timestamp-function/trigger/rewrite/helper hashes are
explicit in `scripts/ci/customer-reminder-integrity.test.mjs`. Suite LF SHA-256:
`f9f9e97573d2235a7ead957ed1866640dcd2c97a19412bcd02ead5539e2b47f8`.
Five immutable selected observations are pinned: preceding card policy/shape,
nine-helper composition, fresh integrity and separate index metadata. Their
exact hashes and narrow live SELECT scopes are preserved in
`CUSTOMER_COMMUNICATIONS_REQUEST_BOUND_READS.md` and the suite. No business row,
business RPC, live mutation/DDL/grant/history/platform or customer message is used.

Supporting auth/profile/customer/vehicle shapes, SELECT control policies and
session claims are explicitly synthetic. Actors run as real PostgreSQL
NOSUPERUSER/NOBYPASSRLS roles with active reminder RLS asserted; this is not real
JWT/HTTP or complete native identity/writer acceptance. Each database closes in
finally, sequentially, with statement/lock/test timeouts.

## What the selected source actually proves

- The original broad policy differs from the observed current one. Applying only
  the actual conditional block in memory yields the current shop-only policy;
  the current policy is **not** open authenticated access.
- Own-shop CRUD works in the fixture; other-shop INSERT/shop reassignment and
  null/no-profile access fail. PUBLIC helper EXECUTE is separate from reminder
  table access, and does not grant anon table rights.
- An app-style INSERT omitting shop_id fails with 42501. The selected current
  table has no shop default or INSERT trigger to attribute the shop/human actor.
  This is a synthetic payload test, not a live UI insertion attempt.
- Under the present table constraints and shop-only policy, an own-shop reminder
  can carry foreign or nonexistent customer/vehicle/creator/assignee UUIDs in the
  fixture. The native source has no physical reference FK/consistency CHECK here.
  Synthetic supporting-table visibility is deliberately not promoted to proof
  of the complete native customer/vehicle policy system or current business rows.
- Wrong-shop id-only UPDATE/DELETE returns zero rows without error or mutation.
  That is not confirmed application success. Within a shop, an id-only target can
  match another customer's reminder; an explicit expected-customer predicate
  prevents that match. Legitimate shop-wide role delegation remains a separate
  business authority contract, not inferred from this test.
- The actual timestamp trigger replaces updated_at but does not establish human
  actor attribution or protect creator/assignee fields. Repeating only the policy
  block preserves selected rows/schema/helper fingerprints and creates no
  expense/storage objects; it does not approve replay of the full sweep/history.

Selected owner/ACL/RLS/policies, all reminder column types/defaults/nullability,
PK/no-FK constraint set, enabled timestamp trigger and all three indexes match
pinned catalog observations in the fixture. Both helper fingerprints/ACLs match.
PGlite 0.5.9 uses PostgreSQL 18: only extra `contype=n` NOT NULL representation is
excluded after exact attnotnull comparison. Other selected comparisons remain
exact; full engine/catalog parity is not claimed.

## Verification and release status

Focused suite passes 13/13; complete local tooling passes 169/169, sequentially.
ESLint, formatting/diff and independent read-only review pass. A dedicated
memory-only CI step is added. Application source remains the parent's 642-test
slice; no application/SQL behavior changes in this proof. Remote CI/publication
is recorded in the completion checklist. Global source correspondence remains
404/422 with 18 unclassified; the limited inventory and all baseline/replay/parity/
attachment/release flags are unchanged. This proof does not promote coverage or
authorize data/identity repair, new FKs, a broad policy rewrite or history adoption.

## Exact next dependency

Build bounded caller-bound reminder reads with an explicit visible customer/shop
binding and strict returned scope; do not silently rely on a reminder's independent
shop field or make source errors look empty. Mask cached rows/counts/caps during
revalidation and separate unavailable/empty. The known-invalid create and
unconfirmed mutation paths need a separately tested write contract, not fake shop/
staff attribution or widened grants. Confirm exactly one expected returned ID
before success; refresh uncertain results before retry rather than claiming
rollback. Existing direct table authority needs database-level review too.

Continue native provisioning/writer/security/offboarding closure, baseline/
upgrade/recovery, private consent/tenure/retention, index/plan/load and mobile/
owner/pilot/hosting gates. Count-only identity diagnostic design may help future
data assertions, but has not run and must avoid publishing sensitive live counts.
Supabase security guidance keeps this characterization isolated; no production
permission or business data is changed. Pending helper approval is not re-asked.
