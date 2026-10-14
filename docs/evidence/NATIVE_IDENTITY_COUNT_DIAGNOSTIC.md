# Native identity count diagnostic: offline review artifact

2026-10-15 Asia/Manila. **No production identity rows or counts queried, saved or
published.** This slice implements the earlier design as disposable-tested,
operator-private review SQL, not an application endpoint, membership guard,
binding repair, baseline adoption or production execution approval.

Parent PR #32 docs `9edbd21` passed all six CI gates (run `38646246443`), verified
on this resume. Application source remains the verified723-test/TypeScript parent.
The separate hosting build still fails; a green preview wrapper skipped upload.

Draft PR #33: `https://github.com/Hunting-Fishing/motorsales365/pull/33`.
Code `8de974e`, branch `security/native-identity-count-diagnostic`, stacked on
`completion/customer-reminders-rpc-adapter`. Full sequential local tooling passes
206/206 (119.16s), focused ESLint/format/diff and independent read-only review pass.
Remote CI is pending verification on the published documentation head.

## Separate fixed scopes

| Artifact                                      | Read scope                                                                                         | Exact output                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------- |
| `native-identity-counts-review.sql`           | Native profile id/user_id/shop_id; native shop ID; public business ID namespace; auth ID existence | One row,17 named int8 counts |
| `native-shop-business-link-counts-review.sql` | Optional wider scope: explicit native shops.business_id links and all visible public business IDs  | One row,10 named int8 counts |

Core LF SHA-256 `455497eeb0f6d147cdac3d54ba7893eb299c67176e47621b13e249063f243ed0`
(4200 bytes). Optional LF SHA-256
`4f915425a5003526744f6d5298a18b3a5237ea6530a28e43aac0cf6b87685a7f`
(2283 bytes). Review unchanged files, not copied excerpts.

Each file contains one fixed SELECT with no caller parameters, migration DDL,
view/function/RPC registration, grants, writes, role changes or helper calls in
the query text. Existing source RLS may itself invoke helpers. The core does not
read shops.business_id; the optional file is not implicitly required or executed
with core. No execution script connecting to a live database is added.

IDs are used internally for joins/grouping, but no individual IDs, names, emails,
profile bodies, helper results or arrays reach the fixed numeric-only output.
Counts and plans can still reveal small populations or sensitive relationships:
do not commit/publish real results, logs or screenshots. Preserve int8 decimal
precision if an operator later exports approved results; no JS-number business
reporting or public dashboard is supplied.

## Metric definitions and invariants

- profiles_total equals the five disjoint shop buckets: NULL, native-only,
  business-only, both namespaces, neither. The latter four require nonnull shop_id.
  Matching UUID namespaces do not prove equivalent shop/business entities.
- NULL/canonical(user_id=id)/legacy(nonnull user_id<>id) profile counts partition
  profiles_total. A legacy ID can be a retained legitimate writer result, not an
  automatic anomaly to rewrite. No has_auth_account flag is trusted.
- Profile-ID auth-present + missing equals profiles_total. Linked-user auth-
  present + missing equals nonnull user links only; NULL is not missing auth.
  Auth row existence does not prove an active/login-capable account, current
  session, trusted membership, legitimate role or completed offboarding.
- Nonnull user_id values are grouped first. Duplicate groups and affected profile
  rows are distinct measures; NULL links never form a duplicate group. These
  structural groups can include missing/not-visible auth IDs.
- Null-user ID-shadow actors require an existing visible auth row at shadow.id
  plus a distinct linked profile. Group once per actor despite multiple links.
  Any linked-shop IS DISTINCT FROM the shadow shop contributes one actor to a
  subset, not a second partition. Both NULL shops are the same; NULL/non-NULL differ.
  This is a shadow-versus-linked binding difference, **not** a disagreement between
  the two current native helpers: both can select the NULL-user ID shadow.
- Optional shop NULL/valid/orphan links partition shops_total. Public businesses
  with zero/one/many native links partition businesses_total. Duplicate nonnull
  business-link groups include orphan IDs, unlike businesses_many_shops; their
  counts therefore need not agree. Only explicit business_id joins establish links.

External joins require verified unique nonnull UUID primary keys. Aggregates are
kept separate from raw duplicate joins, and empty inputs yield one all-zero row.
NULL-safe comparisons and coalesced sums avoid missing/NULL success envelopes.
Filtered source visibility can undercount rows or classify an actually existing
relationship as absent. Numeric-only output is not global integrity evidence.

## Source/fixture boundaries

Retained profile/shop/business declarations, the selected conditional profile-
auth FK, later explicit business-link DDL and two partial unique indexes are
examined without historical replay. The profile-auth block catches all exceptions:
tests must verify actual attachment, not treat a notice as success. IF NOT EXISTS
does not verify a pre-existing object. No profile-shop FK is invented.

Auth.users table/PK DDL is not retained locally: its minimal fixture is explicitly
synthetic platform support. Selected actual table DDL/constraints do not establish
live data/schema/role/security parity. Normal fixtures keep selected constraints;
duplicate/orphan fixtures must explicitly relax only the needed FK/unique index
while retaining all ID primary keys. Production constraints are never changed.
No bootstrap, staff bridge, backfill, roster/role or chat/audit writer executes.

`scripts/ci/native-identity-count-diagnostic.test.mjs` adds15 sequential,
always-closed PGlite0.5.9 tests. LF SHA-256
`d136875d21cfbac4ffafa90bc996f9d80753ea3f7803abc56efcae93e4d9410d`.
Focused tests pass15/15 (14.12s); own-file ESLint/Prettier pass. Full sequential
tooling and independent review are verified above.

The proof pins five whole retained sources and eight complete selected DDL
sections. It verifies the conditional FK really attached/validated, normal
FK/unique rejection, explicit anomaly relaxations and preserved ID PKs. Tests
cover all17/10 fixed field names with int8 OID20, empty partitions, collision!=link,
duplicate3+2 groups/no inflation, auth absence/unrelated-auth invariance, real
auth-null shadows (including both-NULL/one-NULL and multiple links), optional
orphan cardinalities and exact catalog/data/ACL/default/role preservation around
every successful/failed fixed SELECT. A column-only non-bypass fixture reader
succeeds; missing column permission fails42501 without fallback. External READ
ONLY rejects writes25006 and LOCAL settings expire. Synthetic RLS both undercounts
profiles and misclassifies a hidden namespace, demonstrating the visibility limit.
Core still works without shops.business_id; the optional query fails42703.

PGlite reports PostgreSQL18.6, not the live hosted engine or CI's disposable
Parts PostgreSQL17. Synthetic role/data/policy controls are explicit and are not
hosted JWT/API, complete native policy/trigger, concurrent transaction or live
load proof. No EXPLAIN, production count, new index or platform mutation ran.

## Operator prerequisites: not satisfied by this publication

Before any production diagnostic, resolve the necessary scope (core versus wider
business links), purpose and private result/storage/log handling with the owner.
Use only an already authorized explicitly READ ONLY diagnostic context with
understood source RLS, column rights, key definitions and security attachments.
No new service key, role/grant, bypass-RLS elevation, definer wrapper or fallback.
Do not run this as an application query or make it browser/customer accessible.

Review a non-executing plan in the approved context first; planning can consult
statistics/policies and its outputs must remain private. EXPLAIN ANALYZE executes
the query and is not an approved substitute. Use a separately reviewed explicit
transaction with empty transaction-local search_path and short statement/lock
timeouts (proposed3s/1s), then roll back. These are operator/runbook requirements,
not self-enforced by the standalone SELECT. Do not automatically retry, raise
timeouts, escalate access or turn permission errors/partial visibility into zeros.

Grouped minimal projections avoid correlated self-scans and all-auth-ID CTE
materialization; actual plans can still scan/hash tables/indexes and rescan the
materialized profile flags. Exact counts require work proportional to their
visible input, not a latency guarantee. No live plan, new index or production
performance acceptance is claimed. Relevant primary guidance:
[PostgreSQL aggregate behavior](https://www.postgresql.org/docs/18/functions-aggregate.html),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

The Supabase/security/performance skills led to fixed private scopes, existing
caller permissions, explicit RLS limits and grouped/PK-based query structure.
Current changelog was checked; no database/extension upgrade, API exposure,
security advisor success or production setting change is inferred.

Migration impact: none; historical SQL and source evidence immutable. Explicit
source composition remains404/423 matched with19 unclassified; initial bounded
inventory/baseline/replay/parity/release flags are unchanged. Deployment: none.

The narrow staff/chat/shift catalog artifact
`native-staff-trigger-catalog-2026-10-15.json` is metadata only, LF SHA-256
`5c10e2399f1bbfe4ba16f1b2cf434fd4d9cbba5e72e18185e748760e16eed567`
(24043 bytes). It contains no business rows/counts or invocation results. The
selected three noninternal staff triggers, validated chat/shift CHECKs and five
function fingerprints/ACLs are current only at their dated snapshots. Effective
anon/auth EXECUTE is false on those five functions, service true; automatic
trigger execution is a separate path. This is not all policies, indexes, inherited
permissions, writers or workflow acceptance.

Next: verify this artifact's checks, then implement the unchanged-source
staff/chat/native transaction rehearsal in `NATIVE_STAFF_TRIGGER_REHEARSAL_PLAN.md`.
Keep actual status CHECKs and all observed staff triggers; do not relax constraints
to make offboarding pass. Close remaining writer/trigger/security-attachment
dependencies and contracts before a companion guard/baseline.
Production counts remain unexecuted until the operator prerequisites above are
resolved. Zero counts would not authorize binding/duplicate/history repair or
prove trusted tenant authority. Existing helper decision, private consent/tenure/
retention, receipt scanner recovery/owner/mobile pilot and hosting gates stay open.
