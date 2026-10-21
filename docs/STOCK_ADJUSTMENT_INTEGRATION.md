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
complete staff-boundary + staff-lifecycle + stock-RPC transaction with:

```sh
node scripts/client-release/build-business-stock-staging-release.mjs > business-stock-forward.sql
```

This supersedes the older two-component deployment artifact. The original
`build-business-stock-release.mjs` remains for isolated component tests only.
The complete package must also retain staff deactivation and selected-shop
preservation repairs. See `docs/evidence/STOCK_STAGING_PACKAGE.md` for the
composed tests, generated digest, suspension procedure and hosted activation gates.

The builder verifies the unchanged reviewed staff-boundary blob and retained
lifecycle source, emits SQL only, and never connects to a database. The focused
workflow publishes the complete package after its checks. It must be validated
against a staging clone and registered in the agreed forward migration process
before production application. It stops on existing objects or incompatible
prerequisites rather than silently overwriting an existing rollout. Preserve
outcomes and history on rollback; never delete successful operation receipts.

## Verification and limits

Before initial publication, 18 actual-contract/server-adapter tests and 12 actual
SQL groups passed locally. Later exact-head checks and the composed staging
package checks are recorded in the PR and the evidence note above. SQL uses
retained selected inventory/roster source in disposable PGlite databases. Positive
JWT claims are synthetic SQL inputs, not proof of hosted signature verification.

The actual dialog and inventory-page tests retain the metadata-editor tests.
A separate PostgreSQL17 job runs four independent-session public-RPC races using
authenticated SQL roles, observed blocking PIDs, one final movement and reconnect
recovery. These jobs and full TypeScript/lint/build checks require their own
exact-head results. All existing CI/migration/production gates remain.

The old interlocked adjustment export is no longer used by this page. The new
route and endpoint are connected, but the endpoint cannot work on a database
until its complete forward SQL and prerequisites are installed. No hosted SQL
write, production deployment or main merge accompanies this source checkpoint.

Other legacy stock/financial writers, historical membership provenance, service
jobs affected by the staff boundary, native Shop Manager permissions, complete
backup/restore and real-device/multi-business staging acceptance still require
release validation. This task does not certify global no-oversell across them.
