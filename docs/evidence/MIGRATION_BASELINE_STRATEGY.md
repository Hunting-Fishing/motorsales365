# Migration baseline and forward-release strategy

Status: design plus a narrow, disposable replay regression; **not a completed
schema baseline, migration-history reconciliation, or production authorization**.
Updated 2026-10-15 (Asia/Manila).

## Evidence layers must stay separate

| Layer                                    | What it establishes                                                                                                                                           | What it does not establish                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Archived execution / retained SQL hashes | Which exact source was archived or recorded against this project, independent of filename timestamp changes and transport CRLF                                | Current schema/data/ACL parity, successful full replay of subsequently amended repository files                  |
| Source correspondence audit              | Where a local file folds in later changes or maps to split retained sources                                                                                   | Permission to rewrite history, rerun destructive/data migrations, or assume equivalent final state               |
| Projected final schema                   | Tables, columns/defaults/generated expressions, enum values, indexes/constraints, triggers/functions/views, ownership and security flags in a clean candidate | Reference/backfill completeness, storage objects, authentic multi-tenant isolation, restore readiness            |
| Data and ACL parity                      | Scoped reference-data/backfill invariants; effective table/column/sequence/function privileges; policies and adversarial role behavior                        | Completeness outside the declared assertions or application/deployment readiness                                 |
| Full replay and recovery rehearsal       | A reproducible candidate initialized twice from empty disposable databases, then upgraded and recovered using pinned inputs                                   | Production approval without fresh target evidence, backups, an explicit release boundary, and operational review |

See `migration-object-audit-2026-10-15.md` and the provenance/hash JSON snapshots.
Current archive matching must not be promoted to global schema equivalence.

## Implemented offline safeguards

`scripts/ci/migration-replay-preflight.mjs` reads local SQL and existing evidence
JSON only. It imports the fail-closed source classifier, validates nonempty inputs
and unique source/history timestamps, and recognizes the confirmed counter-cost
replay precondition. It has no database client, SQL execution, network request,
write operation, repair option, or release-approval capability.

The known failure is retained unchanged in applied SQL:

1. The original retained register migration used `i.cost` in the counter function.
2. A later migration replaces the exact old text with `i.cost_per_unit`, raising
   if the old text is absent.
3. Today's historical register source already contains the corrected text.
   Replaying it followed by the old correction therefore fails.

The regression test loads the **actual unchanged cost-fix migration** into an
in-memory PGlite database. A minimal matching function signature reproduces the
original invalid record-field access, verifies the correction works, and verifies
that rerunning it fails without changing the corrected function. A separately
initialized already-corrected fixture also rejects the patch. This is a focused
PostgreSQL behavior test, not a sales/workflow/schema-baseline test.

The preflight is a narrow static recognizer, not a SQL parser or simulator. If
the named patch changes or its earlier cost-reference precondition is missing or
ambiguous, it blocks. Other replay hazards can still exist. Even a zero exit sets
`fullReplayVerified`, `baselineVerified`, and `databaseReleaseApproved` to false.

## Safe commands available now

Run from the repository root; no environment credentials or running database are
needed. Use the already locked/installed PGlite dependency; do not install a new
runtime or point the fixture at a persistent database.

```powershell
node --test scripts/ci/migration-replay-preflight.test.mjs
node scripts/ci/migration-replay-preflight.mjs docs/evidence/migration-provenance-2026-10-14.json docs/evidence/post-cutover-migration-hashes-2026-10-14.json
```

Preflight exit 1 is the **expected blocked result** for the current full historical
chain: the confirmed cost trap and remaining unverified sources are present.
Exit 2 means invalid input or invocation; exit 0 means only the limited offline
source checks passed. There is no flag to bypass unknown provenance or execute
the printed findings. Reports contain filenames, classifications, and findings,
not SQL bodies or operational deployment/repair commands.

The check includes all checked-in SQL. Unapplied forward migrations are naturally
unclassified by an execution-evidence comparison; they are not silently declared
applied. A future reviewed release manifest must identify a tested baseline
boundary and the explicit forward-only set separately.

Validation checkpoint: 13/13 new replay/preflight tests passed, including both
PGlite cases; together with the existing provenance suite, 20/20 passed using:

```powershell
node --test scripts/ci/migration-provenance.test.mjs scripts/ci/migration-replay-preflight.test.mjs
```

Explicit lint on both new scripts passed. Running the safe preflight command
above returned exit 1 with the two expected findings: folded-in historical cost
fix and unverified sources. The exported evidence classified 388 legacy hashes,
two same-version SQL hashes and 13 differently versioned exact SQL hashes; 15
files remained unclassified, including the three intended forward migrations.
These counts describe the checked evidence snapshot, not refreshed live state.

## Candidate baseline construction: required next implementation

1. **Freeze inputs, not history.** Record the repository commit, project identity,
   evidence observation times and hashes, Postgres/Supabase/PGlite versions, CLI
   version/diff engine, required extensions and platform prerequisites. Preserve
   original SQL/evidence as immutable provenance. Do not edit applied files.
2. **Declare scope and assertions.** Define the final state needed before the
   three pending forward migrations. Enumerate schema objects, role/ownership
   contracts, auth/storage customizations, scheduled tasks and storage buckets.
   Keep platform-managed schema installation separate from application baseline.
3. **Build a reviewed candidate outside the production migration path.** Compose
   a canonical final-state schema from verified definitions and required source
   changes, excluding temporary ingress/import/test/demo execution. Preserve
   lineage to archived/split source evidence. Keep seeds and data conversions
   separate. No baseline SQL is generated by this preflight.
4. **Initialize two fresh disposable PostgreSQL/Supabase instances.** Apply the
   same candidate and explicitly approved reference seeds with pinned tooling;
   require no ignored failures, no live credentials, and no dependency on prior
   table contents. Assert deterministic schema/ACL catalog snapshots and scoped
   data invariants. PGlite tests complement, not replace, a real Supabase stack.
5. **Exercise both clean and existing-state paths.** On a synthetic/anonymized
   candidate representing current production state, test the explicit forward
   set, then test a new-install candidate. Verify function signatures and return
   types, trigger behavior, RLS, effective column/table/sequence/function grants,
   view security, private storage and cross-organization role boundaries.
6. **Prove data compatibility separately.** Check PH chassis reference seed
   identity/count invariants and absence of fabricated fitment; staff identity
   linkage; receipt/history/account backfills; accounting/stock consistency.
   Use synthetic fixtures or separately authorized aggregate comparisons. A
   schema-only diff cannot pass these requirements.
7. **Review the complete difference.** Investigate every candidate-vs-target
   object/data/ACL difference. Require classified supersessions and intentional
   differences rather than approximate source matching. Only then select the
   migration-tool onboarding approach for future installs and existing projects.
   Any history adoption remains a separate reviewed operational decision; this
   document provides no timestamp-repair commands or automatic adoption.

## Explicit pending forward-only release

After the baseline boundary and existing-state upgrade path are verified, the
currently pending SQL must be reviewed/tested in order:

1. `20260927090000_parts_network_cross_org_rls_hardening.sql`
2. `20260927120000_parts_network_security_followups.sql`
3. `20261014140802_preserve_direct_installed_vehicle.sql`

Before release, refresh execution/object evidence to confirm these remain
unapplied. Never infer their live state from this older snapshot. Test these exact
files sequentially on the existing-state disposable candidate and the clean
candidate, not by replaying every historical SQL file on production.

Required acceptance: adversarial Parts RLS assertions; receipt private-file and
date/accounting tests; direct owned-vehicle installation preservation; approved
shop-link resolution; revoked-link isolation; required vehicle constraint;
history event synchronization; customer/account cache isolation; native Customer
360 queries; full-checkout build/typecheck/tests and hosting checks. Existing CI
passing is evidence for its tested fixture, not proof that live release has run.

## Rollback and operating prerequisites

### Separately approved, applied ACL containment

The owner-approved converter-only permission restriction was applied outside the
blocked historical replay on 2026-10-15 Asia/Manila after exact-source disposable
tests, passing CI, fresh guarded preconditions and scoped recovery rehearsal.
Local `20261014175040_contain_legacy_invoice_conversion_execute.sql` maps by exact
3,914-byte SHA-256 source to remote `20261014180351`; neither version was repaired.
Its scoped source export is `invoice-containment-migration-2026-10-15.json` and its
live privilege/hash postchecks are in `INVOICE_CONVERTER_CONTAINMENT_RELEASE.md`.
This exception authorizes no other live change and does not complete the baseline
or release the three pending forward files above. Earlier evidence remains an
immutable dated observation. Two provenance regressions compose it with this
supplement in memory only: 404/419 sources evidenced, 15 unresolved, the cost trap
still present, and all replay/baseline/release approval flags false.

### Broader release still requires

- Capture a fresh verified database backup and confirm restoration on a separate
  target with measured recovery time. Include private storage backup/versioning
  and application configuration; database schema snapshots alone are not backup.
- Record baseline/forward source hashes, exact live pre-state, release operator,
  exclusive migration window, lock/statement timeout expectations, stop criteria,
  application compatibility and previous deploy artifact. Never deploy a sparse
  build artifact missing public assets.
- Rehearse failure after each forward step. Determine transaction boundaries and
  whether application rollback remains compatible. For access controls, prefer a
  reviewed roll-forward repair rather than automatically restoring broader access.
- Keep compensating SQL, data restoration and application rollback procedures
  reviewed and independently rehearsed; a tracking-table edit neither applies nor
  reverses SQL. No automatic production down-migration is authorized here.
- After an approved release, verify live role boundaries, trigger/history/receipt
  smoke checks, error rates and hosting status. Preserve a release evidence record
  before promoting the next customer-facing phase.

## Primary guidance checked

- [Supabase migration workflow](https://supabase.com/docs/guides/deployment/database-migrations)
  distinguishes Git source from database execution history and recommends testing
  migrations in local development.
- [PGlite API](https://pglite.dev/docs/api) documents the embedded database used by
  these disposable tests. The tests construct `new PGlite()` without a data path.
- [Supabase changelog](https://supabase.com/changelog.md) and the
  [Postgres minor-release notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
  were reviewed. This pass performs no extension/index/cryptography or platform
  upgrade. Target platform version compatibility still belongs in the full
  disposable baseline rehearsal.
