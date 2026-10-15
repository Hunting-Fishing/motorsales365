# Disposable claim/evidence/owner revision invalidation model

## Outcome and limits

2026-10-15, code `c03fede86f14c0e081ec4c766b65fe9d20c48fb7`, branch
`security/claim-revision-invalidation-model`, based on PR #66
`02cb49ff0b644a14fc871ac089cb53b43324eb14`. This is a **disposable, UNWIRED model**,
not a migration, live repair, client API or adopted review executor.

The candidate adds two private metadata-witness tables, five SECURITY INVOKER
functions with fixed `pg_catalog,pg_temp` paths and nine capture/unsupported-write
attachments inside the full PR #65 fixture's savepoint. It executes against the
unchanged 24 public tables, actual Auth fields, 43 public functions plus actual
provider uid, 37 selected legacy attachments, constraints/defaults/ACLs and real
forward/audit effects. Parent source and v2 codec source/test are LF-hash pinned.
No permissive replacement Auth/profile/identity/helper or legacy client policy
is installed. Seven other business INSERT/status/domain attachments remain
explicitly excluded, **not all production writers certified**.

Installation changes no public/Auth rows and seeds no companion bindings.
Everything, including the private schema and added public attachments, is removed
by rollback. The full parent structural guard and row snapshot pass again after
removal. There are no Supabase clients, credentials, live calls, history changes,
persisted test database, application consumers or changes to either v1/v2 codec.

## Captured transitions

| Actual source operation                                             | Model effect                                                                                               |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| New post-install claim INSERT                                       | Fresh server-generated attempt UUID; explicit attempt/evidence revisions **1**, not an unknown-state zero  |
| Material claim UPDATE, including notes/contact/reviewer/date/status | Increment attempt revision; legacy `updated_at` touch alone and exact no-op do not increment               |
| Claim business/claimant/kind change, or nonpending to pending       | Rotate attempt UUID and increment both attempt and evidence interpretation revisions                       |
| Claim DELETE/recreate with the same UUID                            | Retain tombstone, advance revisions, generate a different attempt UUID; never reset counters               |
| Evidence INSERT/DELETE or any metadata UPDATE                       | Increment the parent evidence-set **metadata** revision; no-op does not increment                          |
| Evidence reparenting                                                | Invalidate both old/new sets in sorted UUID order; returning to the original parent invalidates both again |
| Owner or business claim-state change                                | Increment tenure revision, including owner A-to-B-to-A; unrelated business edits do not increment          |
| Business DELETE/recreate with the same UUID                         | Retain monotonic owner and cascading claim tombstones                                                      |
| Unsupported primary-key reassignment/TRUNCATE                       | Fail closed, rather than silently lose/reuse witness identity                                              |
| Overflow or genuine late audit/constraint failure                   | Source mutation and all companion/public/Auth row changes roll back together                               |

Tombstones intentionally have no cascading FK to public rows. Their future
retention, privacy and operational recovery design is **not approved by this
test model**. No sensitive receipt/evidence bytes or duplicate row images are
stored. Stored identity/status fields are private lab metadata, not a new CRM.

## Unknown initialization stays unknown

Existing rows do not acquire made-up initial revisions. On the first captured
UPDATE/DELETE/evidence event for an untracked claim or business, the model stores
NULL revision/attempt fields. Later changes and delete/recreate **cannot promote
them to known**. No initializer, historical replay, destructive backfill, trusted
zero fallback or operator-selected proof flag exists in this slice.

The owner-only diagnostic `binding(uuid)` returns exact decimal strings only
when both claim and business have captured non-NULL, live, matching metadata
bindings. It returns NULL for missing/unknown/deleted/mismatched bindings.
That result is **not** authorization, pending-only decision acceptance, freshness
at mutation time, row locking, evidence-byte custody, an audit receipt or replay
protection. It is deliberately not callable by anon/authenticated/service roles.

New captured inserts establish only the beginning of a **local metadata witness**.
They do not prove legitimate claimant/reviewer authority, verified private objects
or a trustworthy installation epoch in production. The v2 evidence-set revision
must ultimately cover separately verified immutable object custody; this model's
metadata counter alone does not satisfy that contract or unlock an executor.

## Preserved legacy blockers

The original approval function still permits nonpending approvals. Occupied-owner
zero-change approvals, target/missing actor attribution, repeated transfer audits,
swallowed intent-audit failure, legacy evidence UPDATE auditing and cascade audit
FK/retention behavior remain unchanged. Capture does not repair or adopt them.
The tests explicitly preserve repeated same-owner transfer audit duplication and
nonpending approval to avoid confusing invalidation with an idempotency ledger.

The fixture uses privileged synthetic lab writes. Supplied unsigned request
settings and service/owner execution remain **not original-human or JWT proof**.
Private schema/table/function ACLs deny all app roles; no permission is expanded.
Invoker capture would deny a direct writer lacking private-table privileges:
production compatibility/authority must be designed and tested separately.

## Verification

LF-normalized immutable model/source pins:

| File                                                          | Bytes | SHA256                                                             |
| ------------------------------------------------------------- | ----: | ------------------------------------------------------------------ |
| `scripts/ci/fixtures/claim-revision-invalidation-model.sql`   |  9535 | `33728fe4bb63223f936dcdd43581f0edd1536366d2a40dca92fa91a99093c9b7` |
| `scripts/ci/fixtures/claim-revision-invalidation-fixture.mjs` |  3139 | `9a702db1db126dc7b755288866121b63d59abacac47b62979d230270aa47223d` |
| `scripts/ci/claim-revision-invalidation.test.mjs`             | 26166 | `6e51ba8e8d7e834e910232a5fd996451977ff580ad227b574d7229894dc1316e` |

- `node --test --test-concurrency=1 scripts/ci/claim-revision-invalidation.test.mjs`:
  **25/25 pass**, 46.926 seconds, zero failures/skips/cancellations.
- Genuine full-schema FK/CHECK faults, late sibling/evidence audit faults,
  existing parent-delete cascade FK failure, maximum-bigint overflow and recovery
  are exercised. Public/Auth **and** exact companion snapshots restore.
- Adjacent large revisions remain exact strings through 9223372036854775807.
  Companion snapshots retain raw JSON text, not rounded JavaScript JSON numbers.
- Node syntax, direct ESLint with zero warnings, Prettier and diff check pass.
- Dedicated **never-quarantined** CI step is added without removing tests or
  changing quarantine, release conditions, billing, resources or timeouts.
- `node --test --test-concurrency=1 scripts/ci/*.test.mjs`: **701/701 pass**,
  761.866 seconds; then the two receipt OCR/PDF asset suites: **10/10 pass**,
  0.228 seconds. **711 aggregate**, zero failures/skips/cancellations. The focused
  25 are included in tooling, not double-counted. Publication-head CI pending.
- Disposable PostgreSQL **18.6**, dated remote metadata **17.6**. These tests do
  not establish independent-session/remote-version/production parity.
- No fresh application/TypeScript/runtime test claimed for this SQL/test-only
  slice; unchanged parent PR #66 has 1,240 local application tests and all six CI
  gates passed at `02cb49f` (`38735428535`). PR #65 `3040a1e` also passed all six
  (`38735096453`). These checks do not confirm production behavior.
- Hosting failed separately for both parents. Wrapper previews passed;
  migrations and production deployment were skipped. No hosting fix is claimed.
- Primary review only; known unavailable subagent quota was not retried. No
  independent review or concurrent multi-session PostgreSQL proof is claimed.

## Exact next dependency / release status

1. Establish trusted original-reviewer custody plus fresh session/role/tenant
   authority. A matching UUID, service call or global-admin lab seed is not proof.
2. Independently close every real writer/trigger/DDL/replication path and verified
   initialization/epoch binding; couple immutable private-object changes to
   evidence-set invalidation. Unknown bindings must continue to deny, not backfill
   guessed history. The seven omitted business attachments remain outside proof.
3. Rehearse a separate UNWIRED atomic review executor with pending/current-owner/
   attempt/evidence/tenure fences, payload-bound request ledger/conflicts, confirmed
   mutation/audit receipt and one common lock protocol across **all** writers.
4. Verify independent PostgreSQL sessions, native/team/offboarding synchronization,
   storage retention/recovery and deployed runtime before production adoption.

Source mapping remains **404/423, 19 unclassified**. All baseline/replay/parity/
release flags and financial/consent/privacy/recovery/receipt/mobile/owner/full-media/
hosting acceptance gates remain open. No migration, deployment, production write,
customer communication, paid resource, data deletion, approved-restriction replay,
PR merge or duplicate automation occurred. Safe internal-staff caller return-row/
partial-create and manager/deactivation acknowledgment/lifetime work is independent.

The Supabase/PostgreSQL skills directed private least-privilege invoker code,
explicit unknown-state denial, short isolated transactions and actual rollback
tests. Official references checked for this slice:
[Supabase changelog](https://supabase.com/changelog),
[database triggers](https://supabase.com/docs/guides/database/postgres/triggers),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[PostgreSQL trigger behavior](https://www.postgresql.org/docs/current/trigger-definition.html),
[locking](https://www.postgresql.org/docs/current/explicit-locking.html).
The changelog's upcoming HTTP TLS change does not affect this local SQL-only model;
no SDK/server adapter, CLI, auth integration or TLS configuration was changed.
