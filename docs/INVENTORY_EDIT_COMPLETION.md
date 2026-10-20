# Inventory metadata editing — one client-release task

Scope: existing part-detail saves and editor lifetimes in the multi-business
Parts Shop. This is a connected UI/server change, not a disabled placeholder.
It does not activate the separate manual stock-adjustment feature or complete
the platform's database authorization/deployment work.

## Implemented behavior

- The form never submits existing on-hand, held, on-order quantities or the
  canonical link. Existing quantities are read-only; the separate Catalogue
  action retains its dedicated permission path.
- The handler rejects those fields on metadata updates, validates the original
  timestamp and expected account, and checks manager permission. The UPDATE
  filters item, business, and the exact opening `updated_at` in one statement.
- A zero-row update reports a known no-write conflict. It never rebases onto a
  newer version automatically. The form keeps the draft for review, disables
  another save, and offers a deliberate close/reload action.
- Unconfirmed responses or transport failures do not report success or encourage
  blind retries. Synchronous double clicks dispatch one in-flight request.
- Account/business changes discard the old editor and use separate inventory
  cache lifetimes. Auth loading/logout hides inventory. Errors are not empty lists.
- Notes now travel from the form to the actual inventory `notes` column. Optional
  fields remain untouched when absent; explicit false/zero/null remain deliberate.
- Existing new-item creation is retained with opening quantity, plan limits and
  expected-account binding. No new package or production database migration.

## Verification boundaries

The handler suite has 62 tests. Five database-backed groups execute this actual
handler against the retained inventory table/trigger fixture through an SDK
adapter: notes/price preservation, stale editors, intervening stock changes,
wrong-business identifiers, and account/permission refusal. All five completed
locally; timestamps are rendered at PostgreSQL precision, not JS Date precision.

Eleven real-form and five real-page tests are added to the focused GitHub gate.
They use the actual React/QueryClient components with server/auth response doubles.
Their exact-head GitHub result must be read independently; local transpilation is
not React execution. Full application CI, stock integrity checks, migrations and
release protections are unchanged. No release-ready flags are set true.

This task does not establish real-session revocation, all database policy safety,
atomic invoicing/stock operations, inter-store fulfillment or deployed acceptance.
All changes stay in the existing release branch until the wider release is ready.
