# Native identity count-only diagnostic: design, not execution

2026-10-15 Asia/Manila. Bounded source reconnaissance only. No production
identity rows/counts were queried, saved or published. This is not a guard,
data assertion result, binding repair or permission to expose business counts.

Before a native guard/data upgrade, a tested operator-private count-only SELECT
may help characterize profiles, shops, public businesses and auth-user bindings.
No names/emails/individual IDs, source bodies or helper results should reach its
single aggregate output. Counts can still identify small populations and must
not be committed or published by default.

## Proposed logical scope

- Five disjoint profile-shop buckets: NULL, native-shop-only, public-business-only,
  both UUID namespaces, neither. Equal UUIDs do not equate those entities.
- Disjoint null/canonical/legacy user bindings; existing/missing auth-user joins,
  duplicate-user groups versus affected profile rows.
- Null-shadow actors: auth ID has an id-matching profile with NULL user_id plus
  a distinct linked user_id profile; separately flag differing shop bindings.
  Count actors once even with duplicate linked profiles.
- Native shop/business link cardinalities, missing links and zero/one/many native
  shops per business, only if that wider scope is necessary and approved.

Use grouped user/business binding CTEs, grouped JOIN/BOOL_OR shadow summaries
and base-table PK joins. Avoid materializing all auth users or repeated correlated
self-scans. Ungrouped final aggregates return one fixed numeric-only row even on
empty data. A same-statement snapshot is not future immutability. RLS-filtered
counts can undercount/misclassify relationships; zero anomalies never prove
trusted membership, legitimate role delegation, writer closure or applied parity.
Roster/role business data is deliberately outside this minimal design.

## Retained source map and distinction

Under `supabase/migrations/`:

- Native profiles/shops/role-ID table: `20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe.sql`
  at lines 57/565/721; profile auth FK in `20260713070436_a4f482f9-5657-4142-88e7-047bd0e90a42.sql:83`.
  Do not invent a profile-shop FK.
- Explicit shops.business_id link: `20260831041350_associate_parts_catalogue_operations.sql:355`.
  Partial uniqueness and shop/profile bridge: `20260901025424_business_staff_shop_manager_bridge.sql`;
  later bridge: `20260902151438_assistant_manager_temporary_canonical_permission.sql:161`.
  The bridge uses native shop IDs linked to businesses, not interchangeable IDs.
- Public businesses: `20260512054457_90aac1ba-c3f0-48ff-a9b4-06739ddd2108.sql:64`;
  roster: `20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12.sql:19`.
  Public global roles in `20260501224406_1fde4d15-467c-4a50-a39e-089c25417e52.sql:37`
  are distinct from native role-ID bindings.
- Nullable selector: `20260831124952_employee_operations_ledger.sql:193`;
  id-only current shop: `20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql:3`.
  Existing bootstrap/roster authority proofs remain separate prerequisites.

These are recovered source references, not current live data/schema assertions
or applied-history provenance. Main must review the exact source/query before
any later execution; no reusable query artifact has yet been implemented.

## Prerequisites and synthetic tests

Implement and independently test the fixed query on disposable fixtures first:
empty result; five-bucket and identity partitions; namespace collisions; duplicate
groups/no join inflation; same/different/NULL shop shadows; false/absent-auth
negative controls; valid/orphan/duplicate shop-business links; numeric-only fixed
output and unchanged fixture tables. Omit uniqueness/FKs only where anomaly
fixtures require it, explicitly—not as full native schema acceptance.

Before any production count query: decide data scope/private storage, use an
existing authorized explicitly READ ONLY diagnostic context with understood
visibility, review a non-executing plan, and set short transaction-local
statement/lock timeouts (proposed 3s/1s, operator-reviewed). No grant, definer
wrapper, role change, automatic retry/timeout escalation, caller-filterable RPC,
or publication of production results. No count outcome authorizes data repair.
