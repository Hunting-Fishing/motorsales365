# Native profile resolution: isolated prerequisite proof

2026-10-15 Asia/Manila. Branch `security/native-profile-resolution-proof`, stacked
on UI PR #23 (`3a3f1f2`, all six gates passed, run `38631111334`). This is an
offline behavior proof and narrowly scoped catalog refresh, **not a native
identity repair, authority mitigation, whole baseline or production finding**.
Draft PR #24: `https://github.com/Hunting-Fishing/motorsales365/pull/24`,
code `7f9bfb5`; latest documentation head `985a659` passed all six CI gates
(run `38632585607`). No release is inferred.

## Observed metadata, not business records

`native-access-helper-metadata-2026-10-15.json` records six exact catalog identities
in project `wjxaajgvddtrxxtocxen`, observed at `2026-10-14 20:19:45.882471+00`
(shop_access at `20:20:09.678803+00`). It includes definition/body fingerprints,
owner/language/volatility/search path, return/argument shape and effective client
EXECUTE observations. LF SHA-256:
`3cf13e8c9b1718cb6791c3fb88fe0319090c62888749dc5e45b097a76c124834`.
All six are observed postgres/STABLE/SECURITY DEFINER; current-shop remains
PUBLIC-executable while the other five deny anon and allow authenticated/service.
This is not full role inheritance, caller, dependency, policy or API parity.
MD5 fingerprints identify selected observed definitions, not cryptographic authenticity.

The initial selector mistakenly used shop_access(uuid). Its absence is **not** a
missing-helper defect: the actual identity is shop_access(uuid,boolean), whose
second argument defaults to false. The corrected exact identity was queried
separately and retained. No helper was invoked live, no customer/profile/vehicle/
receipt or other business row was read, and no privileges/schema/data/history/
platform configuration changed.

## Two selected unchanged lookup definitions

| Helper                     | Whole retained source / LF SHA-256                                                                                             | Selected definition LF SHA-256                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| current_employee_profile() | `20260831124952_employee_operations_ledger.sql` / `2386ee30a1b12cd124445adf3da3568c35e567e96aa9f7b83e6cd4211ccae6b2`           | `340715972e053fa97ae0593c6209cc7b0111a4a1ba0ffc9f7d690deebe45712f` |
| get_current_user_shop_id() | `20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql` / `30dfd8df0c3537efb5155a8891804e00444b180f55e674b56d522e473e2f4144` | `96d278351d5b335519711b97e89dd5b52052886929fbce820951414612cd7845` |

The first selects profiles matching either user_id or id, ordering the nullable
boolean `(user_id=auth.uid()) DESC` without NULLS LAST. The second selects only
`profiles.id=auth.uid()`. These are not equivalent legacy identity contracts.
The proof executes only those two unchanged function sections, not historical
tables/policies/triggers/seeds/backfills or a replay chain. Eight focused tests
pass using seven sequential always-closed memory-only databases (20-second test,
3-second statement and 1-second lock bounds). Test LF SHA-256:
`7572344928e06365ee39e7c0bc3430a4097da295fa27cb360d8d0f3013a1c957`.

The isolated fixtures confirm canonical identity agreement, legacy-only helper
divergence, a null-user id-shadow sorting ahead of a true legacy user match, and
the contrasting true-before-false control. A non-null false shadow makes the
helpers select different shops; changing that shadow to NULL changes the selected
employee profile. No subject/no match returns a NULL composite, whereas a real
profile with null shop remains an identity row. Expanding a scalar composite in
FROM still yields a row of null attributes when absent: row count alone is not
identity. A synthetic privileged binding change is read by the next statement;
lookup is not immutable or independently authorized membership. Actual selected
definition/body/owner/search-path/argument/ACL fingerprints match the two catalog
observations. Fixture rows, table/schema ACLs, RLS and indexes remain unchanged
around reads. Direct SELECT/RLS denial versus definer lookup, null-subject anon
EXECUTE denial for current_employee, and owner/service boundaries are explicit.
Focused ESLint, Prettier and diff checks pass; complete local tooling passes
142/142. Independent read-only review found no concrete issue. Full-checkout
publication checks are the next gate, recorded in the completion checklist.

Synthetic minimal supporting profile rows/constraints and a session-setting auth
stub are explicitly fixture-only. Direct profile RLS denial tests definer lookup
behavior, not the current production policy or JWT authentication. Catalog
fingerprints can match while the reduced composite/table fixture is not the full
live row shape/constraint set. A privileged fixture update is not an implemented
writer or evidence that affected rows exist in production.

No NULLS LAST repair or automatic duplicate/binding reconciliation is performed.
Any trusted mapping must resolve all writers, legacy identities and multi-roster
behavior and be verified against the agreed tenant contract before release.

## Bounded incoming/supersession reconnaissance

Canonical retained-migration search found one qualified current-shop declaration,
one current-employee declaration and one receipt-source declaration for each
receipt helper. Module routing has two retained declarations:
`20260831130502_employee_module_access.sql` (whole LF SHA
`103dcc61d3136e4deee11a42300cc46025ee114b26b7f381b492721f77a72d04`) and
`20260901025637_add_driver_module_access.sql` (whole LF SHA
`ee6d043f23fe25f7f849fdd2d2cc104983a0ae3594d2f269e22d748ad498cff8`).
Both remain unclassified **in the selected seed inventory**; this is distinct from
the composed global source-correspondence ledger. Similar bodies/whitespace are
not applied lineage, and the earlier source also redeclares operating context.

The employee ledger uses the profile helper in operating context, shift actions,
approval request/decision and capture_employee_operation. Its dynamic audit trigger
attaches to eight tables: payments, invoices, inventory_transactions,
inventory_purchase_orders, stock_transfers, customers, work_orders and
work_order_discounts. The module/operating-context and counter-register/sale
families add consumers. Current-shop has broad native policy, job/part/payment,
vendor/accounting, communication/automation, inspection/storage and posting uses,
plus browser creation/editor calls. Receipt helpers feed receipt/link/item and
storage read/upload/delete policies, receipt lifecycle/install/share/scan,
ride/link, expense/history, workspace and attachment operations.

Helper-name grep is not complete executable closure. Conditional security-sweep
SQL changes grants/search paths/policies, and counter patches use dynamic
pg_get_functiondef/string replacements. Preserve the known frozen counter-cost
replay trap; do not execute those files to recover provenance. The seed registry
still lacks a shop_role_permissions table node and many incoming writers/audit/
storage attachments. No source facet or release flag is promoted by this report.

## Exact next proof and release dependencies

Compose the **actual unchanged** profile, module and receipt helpers on a bounded
fixture, then cover auth-ID versus legacy-profile-ID roles, real per-shop action
overrides (read/view/manage, absent versus empty), privileged-role early return and
the currently unused shop_access \_write argument. Keep owner-linked receipt
revocation distinct from retained native shop business records. Recover and pin
the real override table, writer/trigger/ACL and supersession closure before a
companion guard. Selected module/receipt metadata here is not their composed proof.

No application source or SQL migration is changed in this proof slice. Source
correspondence remains 404/422 with 18 unclassified; all replay/baseline/parity/
release flags remain false. UI/browser/mobile, private-vehicle consent/tenure,
financial retention, baseline/forward recovery, role/API and hosting gates stay
open. Existing helper-containment approval remains pending and is not re-requested.

A separate read-only catalog check at `2026-10-14 20:28:53.395651+00` confirmed the
approved converter still denies anon/authenticated and retains postgres/service
EXECUTE; definition/body MD5 remain `e590e08f9f68cc5fdead8a853af670b9` /
`c3ef84a1dfa61850a0135fdc66eb9f40`. Bootstrap and totals remain PUBLIC-executable
with their prior definition/body fingerprints. No business function was invoked
and no live mitigation/permission change was performed in this continuation.
