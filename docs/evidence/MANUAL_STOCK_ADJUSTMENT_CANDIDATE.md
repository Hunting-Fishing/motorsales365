# Private manual stock adjustment transaction candidate

17 October 2026, Asia/Manila. Same integrated candidate/draft PR68. Commit subject
`Prepare private atomic manual stock adjustment`; exact source/publication and
new-head checks go in its evidence comment. This is private/unapplied source,
not an activated RPC, production fix or completed stock/CRM workflow.

## Named dependency and retained source

The existing `adjustBusinessInventory` adapter at
`src/lib/business-inventory.functions.ts:206–240` inserts a movement, reads stock
and writes an absolute quantity in separate requests. It discards the read error,
uses zero for absent data, does not bind that read/update to the supplied business
or require a returned affected row, and performs JS-number arithmetic. The
adapter is unchanged; this slice does not claim its production behaviour fixed.

The new private function composes one exact quantity update and one bound movement
inside a statement. It reuses the unchanged `buildMixedReservationOrderSource()`:
14 complete selected tables, 75 setup actions, 49 retained spans and 30 real FKs.
No stock/business/order/provider DDL is invented or weakened. The complete
movement table and inventory timestamp function/trigger are already present.

The base source is
`supabase/migrations/20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12.sql`:
inventory144–159, movement175–185, timestamp210–212/223–224. Hand and delta are
`numeric(12,2)`; hold/order counters are unscaled numeric. Movement item/business
FKs are independent cascades; there is no composite pairing, actor/Auth FK,
tow-request FK or delta CHECK. Manual delta zero is refused here, not removed
from other writers: canonical-link zero movements remain in the wider scope.

The selected earlier businesses DDL declares `owner_id uuid` without an Auth FK
at `20260512054457_90aac1ba-c3f0-48ff-a9b4-06739ddd2108.sql:64–92`. The missing-user
test arrangement is legal only in that pinned synthetic fixture; it does not
assert current hosted schema or native authority.

## Private mechanics and limits

`manual_stock_candidate.adjust(uuid,uuid,uuid,uuid,numeric,numeric,text)` is a
SECURITY INVOKER function in a fresh private schema, pinned to
`pg_catalog,pg_temp`. PUBLIC/anon/authenticated/service schema and function
execution are withheld; publication rejects non-owner ACL entries. Owner,
id-only Auth, test.user and manager support are explicitly synthetic. No ordinary
Auth-table access, service/admin fallback or real-role positive grant is added.

The function:

- Validates immutable account/business/item/movement identity, nullable bounded
  reason and exact finite expected/delta/result NUMERIC values without rounding,
  overflow or clamping; requires a nonzero manual delta and nonnegative result.
- Locks the existing expected Auth user KEY SHARE first, then business KEY SHARE,
  then the exact inventory FOR UPDATE. It rereads binding/admission after waits
  and uses expected-hand CAS40001. This deletion lock is not session/ban/role/
  refresh/expiry fencing or a proven global lock order.
- Validates individual active accepted/unexpired inquiries and unreleased,
  unfulfilled B2B holds that are unexpired or picking/ready, including bindings,
  finite quantities and complete selected vectors. It never acquires inquiry,
  reservation, order or line locks after inventory. Direct/legacy phantoms remain.
- Refuses malformed stock/counters and an existing mixed-hold deficit. An opaque
  counter above old stock is quarantined, not silently repaired. As an explicit
  conservative PRIVATE rule, the protected floor is MAX(counter, mixed holds),
  never their sum; on-order quantity may exceed stock. Production semantics and
  compatible adoption of this rule remain unaccepted.
- Updates only hand/timestamp and inserts exactly one caller-ID movement with
  bound item/business/delta/reason/actor, null tow link and transaction time. Full
  RETURNING, persisted and final row/vector witnesses reject suppressed,
  retargeted or rewritten acknowledgments. Sanitized errors preserve SQLSTATE.
- Returns 13 exact acknowledgment fields, distinguishing counter/protected floor,
  mixed-only availability and conservative available-after. These are selected
  statement results, not authoritative live availability or external COMMIT.

A duplicate movement UUID raises23505 and rolls back; it is NOT replay success,
an immutable durable operation ledger or permission to retry an unknown outcome.
There is no delivery outbox, money/payment change or application connection.

## First isolated validation and frozen source

Root FIRST sequential PGlite execution: **12/12 top-level groups in18.6174385s**,
zero fail/skip/cancel. Fresh memory databases always close. No SQL/runtime failure
or alternative was consumed. Review tightened counter semantics before this run;
no failed trial was relabelled as preparation.

Coverage includes complete inventory/movement pairing, all13 acknowledgment and
eight movement fields, unchanged unrelated fields, exact decimals/scientific
notation and overflow/nonfinite rejection, wrong bindings/missing user/CAS,
ordinary/service denial, counter-max/no-order-cap and malformed-state controls.
Actual retained B2B acceptance creates8 units held/counter/event on fresh stock10:
manual-3 is rejected, -2 permitted without counting16. Actual inquiry1.50 plus
B2B8 protects9.50. Synthetic opaque-counter and deficit arrangements remain
explicitly synthetic; the original unrelated raw8-hold/counter0 seed is not an
actual-writer or native-authority witness.

Synthetic fault helpers have ordinary execution revoked and graph baselines
captured AFTER installation. Suppressed/rewritten UPDATE/INSERT and persisted
row disappearance fail55000. Real late movement item/business FK23503 faults
witness stock12 before retargeting and roll back the whole selected graph;
XX000 is not accepted. Duplicate23505 and outer ROLLBACK preserve all14 tables/
events/NUMERIC-text/catalog/ACL/RLS/defaults/types/roles/memberships/settings/
sequence witnesses. Positive normalization masks only hand/timestamp and the one
fully asserted new movement, never a whole row or unexplained column.

| Frozen LF source                                           | Bytes | SHA256                                                             |
| ---------------------------------------------------------- | ----: | ------------------------------------------------------------------ |
| `scripts/parts-stock/manual-adjustment-candidate.sql`      | 14436 | `6b2899e15dc75ecffe943760604651aca9c63c22f4a7bc1bd4ca94bc8274b250` |
| `scripts/parts-stock/manual-adjustment-candidate.test.mjs` | 29561 | `e69dcaa5383a655114fc2f2cbc3d7adfee4a29e3235292f4643980047e2b9a98` |

Full root/independent source and test reviews clear before first execution;
syntax, changed-script ESLint0, format and diff checks pass. The separate parsed
CI guard passes3/3 in5671.3378ms, zero fail/skip/cancel; these are separate runs,
not a single15-test runtime. Mandatory memory-only serialized CI uses the
existing OCR runner after npmci and before Chromium setup, with a bounded2-minute
step. All six jobs, real OCR,25-minute unit/native budgets, normal timeouts,
quarantine and native/adversarial/transaction/cleanup coverage remain intact.
This uses existing runner headroom rather than raising an almost-full unit job.
Own-head Linux execution is separate; old native21+8 does NOT execute this SQL.

## Exact unsatisfied correspondence and adoption gates

The prior single metadata capture and six matching bodies are not repeated.
Retained `set_updated_at()` LF body hash is
`d753a27330cc2586f12fb8d2cf0e4e6873b7eeb1a6638631b8d724e8903a5de8`;
the captured current body hash is
`c65132a2c298725f67acf5857b5f6ee3a5df5eb94047848b690650542f6de5fb`.
This is an exact body-correspondence gap, NOT proof of changed semantics. The
retained cross-reference UPDATE-OF column list excludes quantity/timestamp;
current trigger-column/body and full-schema/default-ACL parity remain open.
No current helper, trigger, grant or historical restriction is changed/replayed.

Next named dependency: native PG17 independent manual/B2B/inquiry sessions with
observed blocker identities, CAS, COMMIT/ROLLBACK, deletion order and late-FK
graph witnesses, then a compatible all-writer/multi-item/phantom/deadlock/numeric
protocol. Direct absolute edits, invoice deductions, shipment/receiving/return/
quarantine and separate native adjustment/counter/PO/invoice/journal writers
remain in scope, not an approved public-only subset.

Strict original-human/fresh session/native membership/tenant/role/revocation/TTL,
durable operation/idempotency/unknown-outcome reconciliation, real API/private
Storage, whole recovery, owner/pilot/device and main/live acceptance remain open.
All catalog/frontier/baseline/provider acceptance flags remain false. All18+N1–N3,
47 replay failures and12 historical/five unapplied/two recorded classifications
are retained.22 October remains at risk; no fullCRM/consumer checkout/global
no-oversell or supported full-scope forecast follows from this mechanics slice.

Migration/deployment impact: none. No app/retained writer/generated/dependency/
production/backend/Buddy/366/identity/Terms/provider change, charge or customer
communication. Supabase least-privilege and consistent-lock-order guidance kept
the candidate private and its authority/recovery limitations explicit.
