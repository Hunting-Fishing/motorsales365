# Customer reminders: same-statement invoker read candidate

2026-10-15 Asia/Manila. **Unapplied offline review candidate**, not native
authority closure, a production release or trusted reminder entry. Parent is
PR #30's bounded reminder application reader; its two separate reads remain
release-blocked until a compatible reviewed adapter/database release. This slice
does not switch the application adapter or change any source policy/grant/data.
Draft PR #31: `https://github.com/Hunting-Fishing/motorsales365/pull/31`, code
`797876c`, branch `completion/customer-reminders-invoker-read`, stacked on
CI-verified PR #30 docs `f4c86c1`. Remote CI pending verification at publication.

## Exact contract

Supabase CLI 2.121.0, after local version/help discovery, generated
`supabase/migrations/20261014214406_customer_reminders_invoker_read.sql`.
LF-normalized SHA-256: `c65593b7a93048b3801e50853ce72bac58c83d6f76a8848cedb2d7ff3adfbb5d`
(5363 bytes). Review-only recovery LF SHA-256:
`1408ebbb6c9c0e90dca6a41c64f3d16c177adb7ead6d62e815236edb64b324d0`
(3390 bytes); body LF MD5 `74e7436ee945b5db183c2dcf5be820df` is a drift
identifier, not authenticity. Execute neither from a copied excerpt.
It creates only `public.crm_customer_reminders(_customer_id uuid) RETURNS jsonb`,
SQL/STABLE/SECURITY INVOKER, with empty search_path and fully qualified source
relations. No arbitrary shop, actor, order, filter or pagination parameter.
Built-in types are pg_catalog-qualified in CREATE, ACL/lookup/drop signatures,
guard declarations/casts and JSON fallback; argument count/type OID is explicitly
checked. Empty search_path alone does not exclude temporary data-type shadowing.
See [PostgreSQL search-path rules](https://www.postgresql.org/docs/18/runtime-config-client.html#GUC-SEARCH-PATH).

One materialized context reads the invoker-visible native customer with a nonnull
auth.uid(). Preflight requires native customer id/shop_id to be NOT NULL UUID;
malformed context must not be hidden as ordinary unavailability. The reminder
source joins on BOTH customer_id and shop_id in that same SELECT. Existing
customer and reminder RLS remains
active under the original caller; neither an untrusted client-supplied shop nor
a previous application request establishes current parent visibility.

The fixed envelope is `{available, customer_id, shop_id, rows}`:

- Unavailable context: false, both context IDs null, empty rows. This means no
  visible valid customer context, not proof that the customer does not exist.
- Visible context: true, exact requested customer and its visible shop, possibly
  empty rows. A valid context may have no visible matching reminders.
- Missing source privileges or SQL/helper failures propagate as errors, not a
  forged empty/unavailable success. No service/definer fallback or grant repair.

Each row contains only id, customer_id, shop_id, reminder_type, title, notes,
due_date, status and completed_at. No vehicle/creator/assignee identifiers,
created/updated timestamps, attachment paths or broader row expansion. Arbitrary
native reminder_type/title/status TEXT, including empty text, and nullable values
remain unaltered. Completion timestamps are recorded values, not verified audit.
All statuses are included; no overdue/timezone/status/pending inference.
Order is due_date ascending NULLS LAST then UUID id ascending in both selection
and JSON aggregation, LIMIT101 for a future strict 100-display adapter sentinel.
The API intentionally returns all101; the adapter must validate the sentinel,
cap at100 and disclose hasMore, rather than silently dropping invalid data.

SQL STABLE uses the calling query's MVCC snapshot. Under Read Committed, a later
statement observes changes committed before its snapshot; Repeatable Read or
Serializable may reuse an earlier transaction snapshot. This is not a cached
application parent lookup, immediate/retroactive revocation after statement start,
a lock preventing customer movement, a cross-source transaction, a trusted native
membership fix or repair of reminder physical reference inconsistencies. Selected
native helpers/profile writers remain a separate authority prerequisite.
See [PostgreSQL function volatility](https://www.postgresql.org/docs/18/xfunc-volatility.html)
and [transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html).

## Narrow creation and recovery

The reviewed operator is postgres. Migration search_path is transaction-local
empty; function search_path is also empty. Preflight refuses any public routine
with the same name, including overloads; no CREATE OR REPLACE or signature adoption.
The transaction normalizes only this new API's EXECUTE to postgres and
authenticated. No global/default/source grants change. Exact definition/body,
operator/owner, scalar return/argument shape, STABLE/invoker/configuration and
ACL/effective anon/service denial are postchecked; unexpected custom default
grants or inherited anon/service access abort creation rather than silently widen
execution. This is not complete custom-role membership/SET ROLE closure. Name
pre/postchecks do not prevent an unrelated concurrent overload created after the
check; release requires controlled DDL. Hosted role inheritance/operator semantics
need separate rehearsal.

`customer-reminders-drop-review.sql` is outside the migration path, review-only.
Its first statement resets transaction-local search_path before safety predicates;
qualified types alone do not protect operators from a hostile ambient path.
It requires explicit transaction-local operator opt-in and checks exact signature,
body, owner/configuration/API shape and reviewed ACL/effective access before
DROP RESTRICT. Drift refuses; a dependency aborts the operator transaction.
The guard checks the opt-in value; use of SET LOCAL inside an explicit transaction
is an operator/runbook requirement, not scope inferred by current_setting().
No CASCADE, data deletion, source policy/grant/history alteration or automatic
recovery. An unrelated overload is never dropped. Recovery and any release must
be separately reviewed; this file is not permission to execute in production.

## Verification and release limits

Focused verification:22/22 pass (26.03s), ESLint/Prettier and independent review
pass. `scripts/ci/customer-reminders-read-contract.test.mjs` LF SHA-256:
`32d5fd4646d7567663756cca76de386cdf29a602cf46a0dd56f31a67137eb283`.
Full sequential local tooling passes191/191 (104.22s), zero failures/skips;
focused lint/format/diff and independent review pass. Reproducible command:
`node --test --test-concurrency=1 scripts/ci/*.test.mjs scripts/vehicle-receipts/verify-ocr-assets.test.mjs scripts/vehicle-receipts/verify-pdf-assets.test.mjs`.
Application source is unchanged from CI-verified PR #30 (706 application tests/full
TypeScript). Migration impact: one new unapplied forward candidate. Deployment:
none. Supabase advisors/staging/upgrade/live recovery were not run successfully.

Four whole retained migration sources and six extracted sections are pinned.
Only the actual reminder suffix, current-shop helper, policy-rewrite block4,
customer shop-policy block, customer-self and profile-self policies execute.
Expense/storage/full historical security sweep/bootstrap SQL does not run.
Three immutable catalog-evidence files constrain selected reminder and parent
column/helper/policy/ACL/trigger/index comparisons. PG18 NOT NULL catalog
representation is excluded only after exact attnotnull checks, not as a broad
schema-drift exception. Auth/profile/customer/supporting shapes and session claims
remain explicitly synthetic; actual selected policy logic is not replaced with
a permissive fixture. Every memory database closes in finally, tests are sequential
and bounded (30s/test,3s fixture statement/1s lock; candidate DDL lock bound5s).

Cases include non-bypass actor roles/RLS-active controls, own/cross/null/no-profile
and NULL/unknown selectors, customer-self versus employee context, unavailable/
visible-empty distinctions, explicit dual bindings, move/delete/profile changes
between statements, all-status stable101 ordering/projection and permission errors.
Critically, actual customer-self plus shop-only reminder policies can expose a
shop-B parent and stale shop-A child to the same shop-A actor; the new RPC returns
the visible B context with empty rows. A new B reminder is independently hidden
by reminder RLS. This tests the explicit shop join rather than relying on RLS to
hide all mismatched rows. It is not a real concurrent transfer or a live incident.

Exact source catalog/ACL/defaults/roles/memberships/data snapshots are preserved
through candidate/read/recovery and refusal paths. Common hosted-style defaults
normalize only the new API; custom defaults/inherited anon/service access,
operator/schema/name collisions refuse transactionally. Recovery proves opt-in,
body/config/owner/ACL/inherited access/strict/definer/identical-body SETOF/default
drift refusal, dependency RESTRICT rollback, exact drop/overload preservation and
local opt-in expiration. Real temporary uuid/jsonb domains demonstrably shadow
unqualified types before builtin OID checks/call/drop succeed. A hostile text
equality operator is demonstrably active; changed-body recovery still refuses,
preserves objects and restores the ambient path on rollback. These are disposable
operator-hardening controls, not a production compromise assertion.

Test fixtures are memory-only PGlite, not full historical replay,
PostgREST/JWT/HTTP, production business data, concurrent transaction, hosted
operator/default ACL parity or live load acceptance. Source correspondence does
not establish applied migration lineage. No live business rows/RPCs, migrations,
grants, history edits, platform writes or deployments occurred in this slice.

Adding this unapplied file yields 423 unique source timestamps. Explicit
in-memory base + converter-containment evidence composition is 404/423 matched,
19 unclassified (previously 404/422,18); the new candidate remains unclassified,
not adopted history. Base-only CLI is 403/423 with20 unclassified. Provenance,
replay and bounded inventory CLIs each intentionally return 1: replay retains the
folded-in historical cost-fix trap and unverified-source blocker. Existing
35-source/7-evidence inventory pins remain valid:73 objects/61 reachable/four
cycles/481 explicit findings; the new API is outside that original bounded
inventory. No inventory/parity/baseline/replay/release flag is promoted.

The Supabase skill prompted current function-security/unique-name documentation
checks, CLI-generated filename and caller-only/narrow ACL design. Its local-stack
advisor/db-pull workflow cannot be exercised with Docker off/no approved staging;
memory-only test catalog checks are not a successful Supabase advisor run. Preserve
the candidate without production application or historical replay. Relevant primary
reference: [Supabase database function security](https://supabase.com/docs/guides/database/functions).

Next: verify PR #31 CI and implement a
strict caller-bound adapter using this one RPC (no separate parent lookup).
Database/API/JWT/role/load and migration/recovery acceptance must precede any
release. Continue actual native identity/provisioning/delegation/offboarding/
security attachment closure and separately reviewed baseline/upgrade/recovery;
then trusted reminder entry with attribution/reference/affected-row contracts.
Existing indexes do not prove an all-status customer/shop/due/ID scan/sort bound;
plan/index/recovery and queue pagination remain separate. Private vehicle consent/
tenure/retention, original receipt scanner recovery/owner/mobile pilot and hosting
release gates remain open. No pending helper restriction approval is inferred.
