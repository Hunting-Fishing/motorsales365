# Owner-intent profile update and admin audit: bounded forward composition

2026-10-15 Asia/Manila. Memory-only unchanged-source characterization, not a
production repair, adopted owner authority or complete owner workflow.
Published draft [PR #47](https://github.com/Hunting-Fishing/motorsales365/pull/47),
code `28cb9e2c26014abe3835cd5eb96f0ef744225437`, branch
`security/native-owner-intent-composition`. Stacked on
PR #46 docs `5346779b096f1a601f8c1c4981ad8e95727a5678`. PR #45 docs `53350cf`
and PR #46 docs `5346779` passed all six CI gates (`38678253032` and
`38678740970`), verified on this follow-up. Both hosting builds failed separately;
their wrappers skipped migrations and production deployment. Nothing was uploaded.

## Read-only observations and exact scope

Two separately reviewed READ ONLY catalog transactions against connector project
`wjxaajgvddtrxxtocxen`, PostgreSQL 17.6, ran at **04:00:11.110715 UTC** and
**04:08:11.297488 UTC** on 2026-10-15. Both use local 5s statement/1s lock timeouts,
trusted `pg_catalog,pg_temp` lookup and ROLLBACK. No business/auth/profile/role/
audit rows or business counts, application helper invocation, DDL/grant/history
mutation, provisioning or deployment. These observations are not one atomic
snapshot with each other or the earlier business-attachment capture.

The first records seven signatures in six named helper families, three tables,
22 selected columns, twelve policies and twelve noninternal attachments.
Full definitions are bounded to 64 KiB and manually privacy-reviewed for this
capture; the query is not a generic secret redactor. The project literal records
the selected connector target, not database-derived identity attestation.
The second independently confirms `public.seller_type` labels are exactly
`private,business,staff`; `public.app_role` has nine recorded labels. No enum
labels, profile records or mutable roles were changed to make test branches work.
Catalog correspondence is not applied migration provenance/history adoption.

Current recompute signatures coexist: `recompute_signup_intent(uuid)` and
`recompute_signup_intent(uuid,text,text,text,text,text,text)` with six defaults.
Both and the two trigger wrappers are postgres-owned SECURITY DEFINER,
`search_path=public`, owner/service EXECUTE only. `derive_signup_intent(uuid)`
is also SECURITY DEFINER but authenticated EXECUTE is true (anon false). This
does not authorize a new live restriction. `has_role`/`can_support` definitions
and policies are observation inventory, not permissive stubs or executed fixture
authorization. The old `has_role` source mismatch remains outside this proof.

The actual selected forward chain is business-owner attachment → seven-argument
recompute → derive profile/business reads → profile intent UPDATE and attempted
admin-audit insertion. Derive does not read/call global roles, partners or
referrals; their incoming/manual-writer authorization paths remain separate.
The manual TypeScript recompute writer is not executed or repaired here.

## Fixture boundary

The extension reuses PR #45's closed disposable fixture, its source pins and
unchanged guard/timestamp/claim-status-audit attachments. It adds mechanically
selected retained derive, both recompute overloads, business-owner wrapper and
latest July 8 profile wrapper (with enum-to-text casts). No whole migration,
cleanup/backfill, historical seed or production DDL executes.

Eleven additional whole-file LF pins and 26 bounded selections fail closed on
source drift. All five full function metadata records, two table records,
eighteen selected columns, selected real constraints and three attachments are
compared with the saved observations. Function records are compared by exact
unique signature keys, not database-dependent lexical/collation ordering.
The older business-attachment observation has no separate updateColumns field;
its exact rendered `UPDATE OF owner_id` declaration supplies that bounded field,
not a new live observation. Each ignored PG18 column-NOT-NULL catalog entry is
individually validated against its same-table live not-null column; no blanket
constraint normalization. Five retained audit indexes execute locally, but no
current index metadata/parity is claimed.

The reduced profiles support preserves selected actual types/defaults/nullability,
PK, auth-user cascading FK, evaluator SET NULL FK and latest signup-intent CHECK.
It does not assert full profile column positions/constraints/indexes/schema parity.
The admin-audit relation uses the actual twelve-column shape and PK; observed
actor/target UUIDs have no FK and no action CHECK. No FK/CHECK is invented.
Added tables retain RLS enabled/not forced and observed raw grants. Their client
policies are explicitly synthetic deny-all supports, not the actual sales/support/
admin policies. Base public-role text storage stays synthetic and unchanged.
This is the SQL-owner definer forward path, not client policy/role provenance
acceptance or a JWT/API test. Broad table grants do not establish row authority;
non-row privileges such as TRUNCATE are outside the row-level proof.

Recompute targets only `signup_intent,intent_evaluated_at,intent_evaluated_by`.
The actual blanket `set_profiles_updated` attachment runs. The actual profile
recompute attachment targets INSERT or UPDATE OF seller_type, so the automatic
intent-only UPDATE does not recursively fire it. Other observed profile triggers
are INSERT-only or target business_kind/verification_status and are excluded,
not stubbed. No admin-audit noninternal trigger was observed. Profiles are seeded
before attachments; normal production signup INSERT fanouts are not rehearsed.
Seven other business attachments remain excluded: they target INSERT, status or
custom-domain operations, not this owner_id-only UPDATE. The selected UPDATE
therefore composes the observed applicable guard, timestamp and owner-intent
families, within the dated/reduced-shape boundary. This does not close business
INSERT/DELETE fanouts, team/native linkage, invitations or complete owner workflow.

## Observed offline behavior

- Selected claim approval changes buyer to business and creates a contextual
  intent audit. Transfer recomputes both old and new owners; an old owner with
  another business remains business. Missing profiles/NULL targets create no
  profiles/roles; unchanged values retain prior evaluator metadata and add no
  intent audit. Actual profile timestamp behavior is asserted.
- Actual private/business/staff enum values without an owned business derive
  buyer. An existing internal_staff intent can therefore become buyer in this
  fixture. Dealer/insurance/repair_shop assignments fail the actual enum rather
  than making unreachable classification branches artificially reachable. These
  are source behaviors, not evidence of affected production users or adopted policy.
- Both overloads coexist. Typed UUID, unknown-literal and named one-argument
  calls fail 42725 ambiguity in the disposable engine; explicit seven-argument
  wrapper calls work. A separately labelled one-overload-only memory variant
  drops only the contextual signature RESTRICT after default parity validation
  to exercise the unchanged one-argument body. It is not the current catalog,
  a proposed live fix/recovery or hosted API dispatch evidence.
- Automatic audits attribute actor_id to the evaluated target, not the original
  moderator/service caller; changed intent clears intent_evaluated_by. Context
  metadata records the triggering row event, not an immutable original human or
  global owner/access reconciliation. The authenticated definer classification
  reader can return another target's intent despite the explicitly synthetic
  deny-client profile policy; this is not actual policy/JWT/API acceptance.
- An injected BEFORE-audit hook triggers the real actor_id NOT NULL failure.
  Recompute swallows that audit failure while owner/profile/claim changes commit.
  Direct same-hook insertion outside the catch verifies the exact 23502 failure;
  ordinary source-positive controls verify an audit normally appears. No live
  fault or real production missing-audit incident is claimed.
- A real profile CHECK failure outside that catch rolls back the earlier old-owner
  profile/audit cascade and selected claim/owner state. A later real claim-audit
  CHECK failure also rolls back the added intent effects. Complete selected
  before/after state, catalog/ACL and session settings are compared; original
  constraints/functions are not weakened. Removing the profile fault restores
  successful behavior.
- A clearly synthetic BEFORE-profile UPDATE hook returning NULL leaves the
  profile unchanged while the unchanged recompute writes an intent audit anyway.
  This characterizes missing affected-row confirmation, not an observed current
  trigger or production incident. Hooks are confined to disposable memory fixtures.

## Verification and release limits

21/21 focused tests pass (17.518s): six static catalog contracts and fifteen
grouped behavior cases, no failures/skips/cancellations. Syntax, ESLint, formatting,
diff, independent source/fixture/API/catalog/query/document review pass. Final
full serial tooling passes 405/405 (321.868s), followed by 10/10 receipt-asset
tests (0.447s), 415 aggregate in separate consecutive commands. No failures,
skips, cancellations or quarantine; not one combined production acceptance test.
A dedicated never-quarantined CI step covers the new proof. This PR's own latest
head requires separate CI verification; the passing parent checks do not attest it.
No baseline/replay/parity/release flags change;
composer remains 404/423 matched with 19 unclassified. The three already-applied
legacy restrictions are preserved without replay. No live repair, source-history
adoption, irreversible decision or sparse checkout deployment is authorized here.

Next close the original-actor/pending/current-owner/idempotent decision contract,
team/shift/native synchronization and independently reviewed recovery before
privileged owner positives. Real API/JWT/role freshness/concurrent sessions,
consent/tenure, private financial retention, receipt/mobile/owner pilot and
full-media hosting acceptance remain open. Existing recurring continuation stays
active without a duplicate automation. Supabase/Postgres safety skills kept
metadata collection read-only and separated source behavior from authority.

## LF artifact pins

| Artifact                                                    | UTF-8 LF bytes | SHA-256                                                            |
| ----------------------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| `scripts/ci/native-owner-intent-catalog-review.sql`         |           7029 | `e78e67538224878c8e807f1d1800c27c92a0421acb37921bcccb41c3e5078ebf` |
| `scripts/ci/native-owner-intent-enum-review.sql`            |           1145 | `6f5ced4ab26ef060483414f8b484fb761bfccd37db407e988081f44f7ad3a7e0` |
| `docs/evidence/native-owner-intent-catalog-2026-10-15.json` |          37602 | `a82598cdf7fd1f1d3310c23e09ecf1885ca9b30f82adefddaf9a8f7d9fb42dad` |
| `docs/evidence/native-owner-intent-enums-2026-10-15.json`   |            770 | `a83137d5b93403dab43ad87bb43d69a6b2f6dfd2ebc7b2a23092664337574c65` |
| `scripts/ci/fixtures/native-owner-intent-fixture.mjs`       |          29846 | `bc05ec41b20abd048663f1f1be30e3f61b0bc4b7028a974ff254372dbd0e80fb` |
| `scripts/ci/native-owner-intent-composition.test.mjs`       |          24708 | `e037ed522f7e1de38bae75177000638b0b0ed846c9732d697539934f3632fd1d` |
| `scripts/ci/native-owner-intent-catalog-review.test.mjs`    |           8135 | `6ccc9cc6b45c87d11c29072478e50b95bb15c79d19b0faee128d5216b3f16487` |
