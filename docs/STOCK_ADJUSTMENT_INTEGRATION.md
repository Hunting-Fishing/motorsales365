# Connected Parts Shop stock adjustment

Scope: the real multi-business inventory page, authenticated server adapter,
public database operation and recoverable UI. This is not whole-platform release
acceptance or a claim that the hosted database has been changed.

## Working implementation path

The page replaces blind +/- calls with Adjust stock. Management opens a scoped
dialog, enters an exact decimal correction and reason, and submits the original
quantity/version. The UI saves a unique account/business-scoped request before
network dispatch. Reloading the tab restores that request; Check result and Retry
same request preserve its full original intent and ID. Missing or failed results
never authorize a replacement ID. Closing keeps unresolved recovery; switching
accounts hides old drafts and ignores their late responses. Session storage is
per-tab and is not a promise of recovery after clearing browser data or closing
all sessions. Valid completed/rejected results are acknowledged and then cleared.

The server uses the existing authenticated middleware/client, one RPC and no
service-key fallback. The public RPC invokes a private, fixed-search-path
transaction that verifies the actual account/session and current owner or active
manager/assistant-manager membership. Deleted, banned, anonymous, expired and
revoked sessions are refused. Editable user metadata is not authorization.

Inventory, movement and immutable outcome are committed together. Original
quantity and microsecond updated_at are checked under the inventory row lock.
Live inquiry and B2B holds, plus a conservative opaque-counter floor, are protected.
A stale or invalid request receives a durable rejected outcome; later retries
cannot silently turn it into a new adjustment. Successful retries return the
original movement/result, not the current stock quantity. Unexpected grants or
suppressed/retargeted writes abort rather than report success.

## Forward deployment package, not applied

The historical migration replay remains frozen and unchanged. Generate the
single staff-boundary + stock-RPC transaction with:

```sh
node scripts/client-release/build-business-stock-release.mjs > business-stock-forward.sql
```

The builder verifies the unchanged reviewed staff-boundary blob, emits SQL only,
and never connects to a database. The focused workflow publishes that SQL as an
artifact after its checks. It must be validated against a staging clone and
registered in the agreed forward migration process before production application.
It intentionally stops on existing objects or a missing boundary; it does not
silently overwrite an existing rollout. Preserve outcome rows and history on any
rollback; a code rollback must not delete successful operation receipts.

## Verification and limits

Before publication, 18 actual-contract/server-adapter tests and 12 actual SQL
groups passed locally (30 total). SQL uses retained selected inventory/roster
source in fresh disposable PGlite databases. Positive JWT claims are synthetic
SQL inputs, not proof of hosted signature verification. The combined forward
transaction also installs and executes successfully in that fixture.

Twelve actual dialog tests and seven inventory-page tests are added, together
with the retained metadata-editor tests. A separate PostgreSQL17 job runs four
independent-session public-RPC races using authenticated SQL roles, observed
blocking PIDs, one final movement and reconnect recovery. These jobs and the
full TypeScript/lint/build suite require their own exact-head results; local SQL
success is not a substitute. All existing CI/migration/production gates remain.

The old interlocked adjustment export is no longer used by this page. The new
route and endpoint are connected, but the endpoint cannot work on a database
until its forward SQL and prerequisite boundary are installed. No hosted SQL
write, production deployment or main merge accompanies this source checkpoint.

Other legacy stock/financial writers, historical membership provenance, service
jobs affected by the staff boundary, native Shop Manager permissions, complete
backup/restore and real-device/multi-business staging acceptance still require
release validation. This task does not certify global no-oversell across them.
