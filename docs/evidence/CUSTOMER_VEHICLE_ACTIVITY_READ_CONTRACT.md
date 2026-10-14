# Customer vehicle activity: offline read contract

Observed/reviewed: 2026-10-15 Asia/Manila. This is an **unapplied candidate**,
not production authorization, a trusted native membership fix, or UI acceptance.
Parent: native prerequisite PR #21, latest head `e5a76ba`, all six CI gates passed
(run `38626559572`). The separate Cloudflare hosting check still fails; the preview
wrapper skipped upload. Nothing in this slice deploys the sparse checkout.
Draft PR #22: `https://github.com/Hunting-Fishing/motorsales365/pull/22`,
code `343557b`, stacked on #21; publication CI is pending.

## Exact candidate and recovery

Pinned CLI 2.121.0 created
`supabase/migrations/20261014194659_customer_vehicle_activity_readers.sql`.
The verified LF-normalized hashes are recorded below; do not execute
from a copied excerpt. No historical migration was edited or replayed.

| File                                               | LF-normalized SHA-256                                              |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| Candidate SQL                                      | `e6359571027741ea6402e2b6adda868c952e0d4776995b443400a8b3c34404b8` |
| `customer-vehicle-activity-drop-review.sql`        | `de3ea73a9801169ee44a1b0304e0e4425646bb48db03239aad32a2caddf596cd` |
| `scripts/ci/customer-vehicle-activity.test.mjs`    | `3ff4119e61724977444b20d51f6186c3c604acb6902c0d272b02b0f9f18feb1a` |
| `customer-activity-catalog-subset-2026-10-15.json` | `f009ba1c7ae42ecd26eaeed573512a17bf34b63ce84914c8d846e0328c802b9f` |

Three exact public functions take only `(customer_id uuid, shop_vehicle_id uuid)`:
`crm_customer_vehicle_receipts`, `crm_customer_vehicle_installations`, and
`crm_customer_vehicle_work_orders`. They are SQL/STABLE/SECURITY INVOKER with an
empty search path. Each uses one materialized context in one SELECT, deriving the
visible customer, its native vehicle, its shop, the active/non-revoked matching
shop link and an invoker-visible public vehicle whose current owner matches the
approver. Supplied IDs are selectors, not authority. Existing RLS still decides
visibility; no table privilege, policy, role, source helper or data changes.

Each returns only `{available, rows}`. `available=false` means the required
context is not visible/valid, not that records do not exist. Source permission or
other SQL failures remain errors. A valid context with no visible matching rows
returns `available=true, rows=[]`; a null shop business mapping also produces no
installation rows, not proof that no installations exist.

| Source        | Fixed fields                                                                                                    | Additional filters / order                                                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Receipts      | id, vendor, purchased_on, currency, total                                                                       | Confirmed; exact public vehicle; exact native shop vehicle OR shared owner-origin with null native ID and creator equal to current owner; purchase date descending/null last then ID descending |
| Installations | id, name_snapshot, part_number_snapshot, installed_quantity, installed_at, installed_odometer_km, work_order_id | Separately resolved non-null business ID and both vehicle IDs; any linked work order must match shop/customer/native vehicle; installation date then ID descending                              |
| Work orders   | id, work_order_number, status, created_at                                                                       | Exact shop/customer/native vehicle; opened date then ID descending                                                                                                                              |

Every source has literal LIMIT 26, supporting 25 displayed rows plus a sentinel.
No attachments, storage paths, owner/creator/account IDs, notes, serials or totals
across currencies are returned. This does not infer payment or lifetime totals,
verified repairs, historical status transitions or transferable private evidence.

Only the new functions' EXECUTE ACLs are normalized to owner plus authenticated.
PUBLIC/anon/service are removed. Transactional postchecks reject unexpected
defaults/inherited access, owner/security/configuration drift or collisions; CREATE
does not replace a pre-existing exact signature. The tested operator is postgres;
other operator identities/hosted role inheritance need release rehearsal.

Recovery is outside the migration path. It requires an explicit transaction-local
operator opt-in and checks all three exact signatures, body fingerprints, owner,
security configuration, scalar return/argument shape and ACLs before any DROP.
Independent review caught a missing SETOF guard; a new identical-body/ACL drift
regression now proves both SETOF and default-argument replacements are refused.
RESTRICT refuses dependencies;
the operator transaction rolls all drops back on failure. No CASCADE, data changes
or automatic recovery is authorized.

## Evidence and limits

`customer-activity-catalog-subset-2026-10-15.json` is a curated subset of the
read-only seven-table metadata query at `2026-10-14T19:39:13.084014Z`, project
`wjxaajgvddtrxxtocxen`. It records join/projection columns, selected grants and
policies, including all three observed public-vehicle policies. It is not a full
catalog/constraint/column-ACL/dependency export, business-row inspection, or a
fresh receipt-table query. No business RPC or customer/profile/vehicle/link/
receipt/installation/work-order row was read or mutated live.

Thirteen focused tests execute the unchanged candidate/recovery using 12 sequential,
always-closed, memory-only PGlite databases (30-second test, 3-second statement,
1-second fixture lock bounds). Eleven retained SQL sources are full-file LF-hash
pinned; selected actual native/link/receipt/installation/public-vehicle policies
and their helpers execute unchanged on minimal synthetic supporting tables.
Authenticated fixture roles are non-superuser/non-bypass-RLS. Tests cover strict
scope, actual private-vehicle negative, owner/admin positives, sharing/drafts,
previous owners, mixed currency/nulls, distinct IDs, deterministic caps/ties,
permission errors versus empty/unavailable, source catalog/data preservation,
default/inheritance collision rollback, exact ACLs and recovery drift/dependencies.
Complete local tooling passes 134/134; focused ESLint, Prettier and diff checks
pass. Full-checkout CI remains a publication gate for this candidate slice.

These are not a full historical schema replay, production data/JWT/HTTP/PostgREST,
real concurrent-transfer/transaction, complete helper closure or UI proof. SQL
STABLE uses the calling query's start snapshot, not continuous or retroactive
revocation. Separate sources can see different snapshots. Relevant primary
references: [Supabase function security](https://supabase.com/docs/guides/database/functions),
[PostgreSQL volatility](https://www.postgresql.org/docs/current/xfunc-volatility.html),
[transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

## Release gates and next work

Ordinary shop staff cannot see a private owner vehicle under the actual retained
and observed vehicle policies, even with an active link. This candidate deliberately
returns unavailable; it does not widen that policy to make a fixture pass.
Current-owner equality rejects A-to-B stale approval, but **A-to-B-to-A can revive
an old active approval**. No trusted tenure epoch is present. Native profile/shop
authority and legacy identity are still unresolved. See
`VEHICLE_OWNERSHIP_CONSENT_GATES.md` for the separate privacy regression and required
transfer/consent invariant; neither finding is a verified live incident.

Before live use: close trusted membership/helper/trigger provenance, implement and
test the owner-change/approval invariant and private consent projection, make an
explicit private financial-evidence retention decision, rehearse the forward
upgrade/recovery and API role matrix, and satisfy hosting/full-artifact release
gates. Do not bulk-push migrations or repair history. The new candidate remains
globally unclassified/unapplied; composed source correspondence is 404/422 (18 unclassified),
not baseline or schema parity. Existing seed inventory flags remain false.

Next independent slice: authenticated read adapter and account/customer/native-
vehicle/source-isolated UI with independent loading/error/unavailable/empty states,
currency/date/cap validation and late-context tests. No owner-only reader reuse.
