# Multi-business Shop Manager selection

21 October 2026. Client release branch, PR #69; parent 2ec7d6c557c9527d9bad619cf06d371e05377afc.
Source implementation and unapplied forward SQL, not production activation.

## User-facing path

A Switch shop control is connected to the shared /workspace layout. Its server
reader lists only currently owned/active-staff, business-linked active shops.
The user chooses a destination and confirms that work is saved and other workspace
tabs/devices are closed. Open registers and active shifts block switching; the
operation never closes a shift, counts cash, or changes stock to make a switch pass.

The request binds the account, canonical employee profile, original selected shop
and microsecond version, destination, and one operation ID. Tab sessionStorage is
verified before dispatch. Unknown replies, caller deadlines and reload preserve
the same request, with Check result and Retry same request. No automatic replacement
ID or browser-to-database write fallback exists. Clearing browser data or using a
different tab/device is outside this tab-local persistence guarantee.

During a switch/recovery the old workspace forms are unmounted. A confirmed switch
clears the QueryClient and navigates to a fresh workspace page. A same-browser
storage notification pauses other open workspace tabs. A changed selection observed
on a fresh list read also pauses the old context. These are UX safeguards, not a
cross-device lock or a guarantee that arbitrary already-dispatched legacy requests
are cancelled. All remaining legacy writers still require explicit tenant/version
admission before whole-platform production acceptance.

## Database behavior

The new authenticated RPC uses the existing caller client. Current Auth user/session,
JWT expiration, session expiration, banned/deleted/anonymous state and destination
business membership are checked. Editable profile fields are not membership proof.
Sessions are rechecked after an advisory-lock wait; new selection access is checked before mutation and before completion. Own historical receipts remain readable after destination offboarding, without reselecting that shop or granting access.

The retained native model uses one account-global selected profile and native role
assignment. Selection locks that profile and compares its original version. It
rebinds native roles from authoritative destination membership in the same transaction.
Owner/manager rights from Shop A are not carried into a clerk assignment at Shop B.
Unexpected roles such as admin/developer require review rather than silent removal
or propagation. Only unambiguous canonical id=user_id=account profiles are supported;
legacy identity repair/onboarding remains separate.

Job title, department, department ID, hourly rate and cost rate are saved privately
per account/shop. An unvisited destination starts with empty values instead of the
previous shop's compensation details; returning restores that shop's retained values.
These fields are never returned in the selection API or outcome receipt. Other
profile attributes remain account-wide under the existing data model.

Profile/context/role changes and the immutable operation outcome commit or roll back
together. Stale requests and busy-work refusals record stable rejected outcomes.
Exact retries return a historical result without switching again after a later
selection. The UI reloads the live context rather than mistaking that receipt for
current selection. Conflicting intent under one ID is denied.

New guards deny ordinary direct profile authority, role-catalog and role-assignment
writes while retaining self contact-field edits. Existing trusted DEFINER lifecycle
writers retain owner privileges. This does NOT certify all legacy privileged helpers
or historical memberships. Direct native staff-administration/onboarding compatibility
must be tested before installing the guards in staging or production.

Newly active shifts and registers acquire a compatible profile share lock and
recheck the selected shop. A concurrent selection either waits for activity and
refuses busy, or causes a stale-shop activation to fail after waiting. Closing
existing work is not blocked by these activation guards. Broad deadlock freedom
across every legacy writer is not asserted.

## Validation and scope

Local completed results: 33 actual-transpiled contract/server tests; 11 real-SQL
PGlite groups, covering authorized transitions, per-shop fields, role rebinding,
read/privacy boundaries, session denials, stable replay/rejection, busy work,
ordinary direct authority denial, late faults, outer rollback and private grants.
Two initial test findings were repaired: the generic trigger needed nested table
branching before accessing profile-only columns; enum output ordering needed an
order-independent assertion. No safety assertion or database constraint was removed.
Standalone strict TypeScript checking of the contract and formatting/syntax checks
also run locally. The local source subset has selected test dependencies, not the
full app runtime; React/full build claims require GitHub CI results.

The dedicated workflow runs the actual picker and the prior stock dialog, the new
contract/SQL suites, and seven native PostgreSQL 17 independent-session scenarios.
Those native cases cover duplicate commit, first-writer rollback, conflicting intent,
stale version, both shift/selection orderings, and session expiry while waiting.
Native success requires observed blocker PIDs, exact final roles and outcome counts,
reconnect replay, and scoped cluster cleanup. Claims are synthetic SQL claims under
real database roles, not hosted JWT-signature or real-device acceptance.

Full application CI remains separate. The previous full CI run 39469106864 ended
cancelled; its five passing component jobs were not a complete full-suite pass.
Read-only hosted inspection used table/trigger/function metadata only, not customer,
Auth, payroll or stock rows. It confirmed the canonical-id legacy shop helper and
account-global native roles, informing this implementation.

## Staging and suspension

```sh
node scripts/client-release/build-shop-selection-release.mjs > shop-selection-forward.sql
```

The generator appends this change to the cumulative business/staff/native-stock
package in one transaction. It does not apply SQL or register historical migrations.
Existing objects or missing prerequisites fail installation rather than overwrite
an unknown deployment. The workflow exports a checksummed staging artifact.

shop-selection-suspend-v1.sql withdraws both exposed and private switch execution
while retaining outcomes, per-shop contexts and authority guards; authorized lists
remain readable. Do not reinstate direct profile/role edits as a fallback.
Foreign keys deliberately retain referenced context/history; deletion/offboarding
and retention policy must be reconciled before activation.

No hosted write, paid branch, main merge or production deployment is part of this
slice. Still required: full staff lifecycle/legacy-writer compatibility, signed-session
HTTP and multi-tab/device acceptance, current-schema migration rehearsal, staging
activation, and the inter-store ordering/shared-stock and complete financial journeys.

References: PostgreSQL 17 explicit-locking documentation and Supabase database-function
execution privileges were reviewed. https://www.postgresql.org/docs/17/explicit-locking.html
https://supabase.com/docs/guides/database/functions
