# Retry-safe manual stock operations — implementation checkpoint

20 October 2026. Parts Shop + Shop Manager, multiple independent businesses.
Base: `4906fb23aeb42fbe679f2619681f8bcc0b250cc5`, draft PR #69.

## Implemented, not activated

`manual-operation-candidate.sql` composes the existing, unchanged private
`manual_stock_candidate.adjust` transaction with a persistent operation outcome.
The operation ID belongs to an account; its full business/item/expected quantity/
delta/reason intent is checked on every replay. Equivalent exact decimal values
normalize; a reused ID with a different intent is rejected.

A transaction-scoped advisory lock serializes duplicate operation identities.
The quantity update, movement and outcome insert succeed or roll back together.
A committed replay returns the original result without applying the delta again,
including after later adjustments have changed current stock. The result is an
operation receipt, not a live availability read.

An inspection call recovers a recorded outcome. `not_observed` is explicitly NOT
cancellation or permission to create a replacement operation ID: an in-flight
request may still commit. The caller must retain the same ID and full intent.
Outcomes reject UPDATE/DELETE/TRUNCATE; foreign keys retain their referenced
movement and stock history. This retention behavior needs integration with the
business offboarding/deletion workflows before adoption.

## Validation

- Fourteen independent PGlite test groups pass locally, executing SQL against the
  existing selected 14-table fixture. Coverage includes replay after a lost reply,
  full-intent conflicts, independent businesses/accounts, stale stock, reservation
  floors, precise decimals, late foreign-key/trigger failures, immutability,
  ordinary/service-role denial, unexpected grants, and disk close/reopen recovery.
- The first run had 12/13 groups pass; the sole failure was a fixture expectation
  of `8` rather than the actual retained numeric scale `8.00`. The expectation was
  corrected, a persistent-restart case was added, and all 14 passed in 24.401s.
- The existing 43 handler and 20 invoice-mutation source tests were also run locally
  with TypeScript transpilation and Node's test runner: 63/63 pass. This is not a
  claim of a local React/Vitest browser execution or a complete app build.
- A later combined parent/new/frontier run was interrupted by the tool's 60-second
  process limit after 16 passing groups. It is NOT a combined-suite pass. The
  standalone 14-group pass remains the exact completed new-SQL result.
- `manual-operation-native.mjs` adds a socket-only PostgreSQL 17 concurrency test:
  two independent clients, observed blocker PIDs, commit/rollback, conflicting
  intent, stale compare-and-set, replacement-connection recovery and cleanup.
  Native execution is a separate CI gate; do not infer a pass from PGlite.
- Supplemental CI keeps the existing handler/invoice/source-integrity tests, adds
  the real invoice route suite, the new SQL suite and the native concurrency job.
  Full application CI, deployment restrictions and migration gates are unchanged.

## Explicit release limits

The SQL stays in `scripts/parts-stock`, outside migrations. All candidate schema,
function and table access remains withheld from PUBLIC/anon/authenticated/service.
No new SECURITY DEFINER path or service-role fallback is introduced. The existing
manual adjustment interlock is unchanged. This is a tested backend component,
not a completed user-facing stock-adjustment feature.

The selected fixtures use synthetic owner/test.user authorization. Actual
session expiry, trusted staff membership, profile authority, full current schema,
all competing stock writers, actual API recovery, backup/restore, staging and
multi-business client acceptance remain required. In particular, the known
staff/profile authorization defects are not fixed by an operation ledger.
No live SQL, hosted data change, grants, provider activation, main merge or
production deployment was performed for this checkpoint.

A separate local invoice-capacity UI patch has been prepared but is NOT part of
this published stock transaction slice. Do not count it as an accepted UI change.

## References

PostgreSQL 17 explicit locking:
<https://www.postgresql.org/docs/17/explicit-locking.html>

Supabase database functions and execution privileges:
<https://supabase.com/docs/guides/database/functions>
