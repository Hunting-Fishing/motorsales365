# Multi-business staff boundary and lifecycle repair

20 October 2026. Development source for draft PR 69. Not a live migration,
production permission change, completed staff release, or enabled stock writer.

## What changed

`business-staff-boundary.sql` adds two private trigger functions and two BEFORE
triggers. Actual business ownership comes from `businesses.owner_id`, never a
self-assigned roster label. The authenticated subject, existing account, active
membership and allowed business role are checked. Business and role rows are
locked while admitting the selected change. Staff identity, business, user,
creation time and invitation attribution cannot be reassigned. Active employees
retain their own shift toggle, but cannot change roles, duties, active status or
same-value columns that would invoke the native authorization bridge. Owners can
manage staff; managers/assistant managers cannot create or alter privileged peers.

The privileged lookup is narrowly scoped, uses a fixed search path and does not
grant ordinary Auth-table access. Schema/function access is withheld from PUBLIC,
anon, authenticated and service_role; trigger execution is the intended entry.
Unexpected default grants or an existing candidate schema stop publication.
Service-role jobs are not automatically exempted: their compatibility remains a
required adoption review, rather than an unexamined bypass.

`business-staff-lifecycle.mjs` builds replacements from the pinned actual retained
chat and native staff functions. It executes no SQL on import. The installation
checks the existing function bodies before replacing them and preserves existing
function ACLs, table constraints, policies and trigger attachments.

- Deactivation uses the existing valid `left` chat and `manager_closed` shift
  states; it does not weaken CHECK constraints to accept the old invalid values.
- Shift and metadata changes cannot silently rejoin an employee who left chat.
- Deactivation closes only the selected shop's open shifts/register sessions.
  It does not create a shop/register just to remove access.
- Cash counts and variances are preserved. Unknown counts remain unknown; access
  closure is not relabelled as a balanced till or completed reconciliation.
- A native profile is detached only when bound to that shop. Removing business A
  membership must not erase business B's current profile, roles or till records.
- Persisted close/detach/role witnesses reject suppressed partial changes; late
  failures roll the selected roster/chat/native operation back together.

## Executed validation

Fresh disposable PGlite 0.5.9 databases execute retained roster RLS, chat/native
triggers and selected original constraints from
`scripts/ci/fixtures/native-staff-trigger-fixture.mjs`. Authentication subjects and
support tables remain synthetic; this is not hosted JWT/session or full-schema
acceptance.

Final local runs on the published source:

| Suite | Result |
| --- | --- |
| `business-staff-boundary.test.mjs` | 13/13, no failures/skips/cancellations |
| `business-staff-lifecycle.test.mjs` | 14/14, no failures/skips/cancellations |

The tests reproduce the original self-promotion before installing the boundary,
then test denied escalation, immutable identity, active self-shift, real owner
and manager actions, two-business isolation, missing users/forged inviters,
private helpers, service impersonation and publication collision. The lifecycle
suite tests real constraint-compatible deactivation/reactivation, preserved cash,
other-business isolation, historical retention, a real late CHECK rollback,
function/trigger preservation, source drift refusal and four suppressed-write
faults. No production data or real customer account is involved.

Exact-head GitHub execution must be reported independently; a local pass is not
an inherited CI or native PG17 result. The supplemental workflow adds these tests
without removing stock, invoice, native concurrency or full application gates.

## Remaining adoption requirements

These scripts are outside migrations and have not been applied to the hosted
backend. Existing live authorization is not fixed merely by committing them.
Historical membership provenance, all privileged writers and service jobs, strict
session/ban/revocation enforcement, direct native profile/role paths, full catalog
correspondence, independent-session lock/deadlock behavior, recovery and
multi-business/device acceptance remain open. The retained native profile and
role model is still account-global; this is not a complete multi-shop role model.

The stock operation ledger remains private and the application manual-adjustment
interlock remains enabled. No main merge, production deployment, live SQL,
provider activation or customer communication is part of this checkpoint.
