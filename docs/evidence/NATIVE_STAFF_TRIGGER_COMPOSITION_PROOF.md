# Native staff/chat/offboarding: unchanged-source offline rehearsal

2026-10-15 Asia/Manila. Nine new always-closed memory-only tests characterize
unchanged retained source with actual critical constraints and all observed
staff triggers. No mitigation, production incident, affected customer records or live
offboarding acceptance is inferred. No production writer/RPC/count was invoked.

Branch `security/native-staff-trigger-composition`, stacked on diagnostic PR #33
docs `1b0696f`, all six CI gates passed (run `38648993208`), verified on this
follow-up. The separate hosting build still fails; the green preview wrapper
skips upload and deployment/migrations remain skipped. The diagnostic review SQL remains unexecuted live. Application
source stays at the723-test parent; this slice does not change application logic,
historical SQL, migrations, permissions, business data, history or deployment.

Draft PR #34: `https://github.com/Hunting-Fishing/motorsales365/pull/34`, code
`ce4127e`. Full sequential local tooling passes215/215 (125.53s), focused
lint/format/diff and independent review pass. Remote CI pending verification on
the published documentation head.

## Selected source and catalog boundary

`NATIVE_STAFF_TRIGGER_REHEARSAL_PLAN.md` retains the exact source map, whole-file
LF SHA-256 pins, selected boundaries and exclusions. The new proof must select
unchanged source definitions, all three staff attachments, and actual critical
chat/shift/register status CHECKs, FKs, PKs and partial unique indexes. No status
CHECK may be widened to make a failing offboarding path pass. Auth/session and
other supporting fixture relations are explicitly synthetic where necessary.
No full historical replay, demo, seed, backfill, security sweep, message delivery
or eight-table operational audit chain is executed.

The dated narrow catalog `native-staff-trigger-catalog-2026-10-15.json` is LF
SHA-256 `5c10e2399f1bbfe4ba16f1b2cf434fd4d9cbba5e72e18185e748760e16eed567`,
24043 bytes. It contains four table records and five function fingerprints/ACLs,
not complete policy/index/writer closure. Three enabled noninternal staff
attachments and validated chat/shift CHECKs were observed. Selected five
functions deny effective anon/auth EXECUTE and retain service EXECUTE. Trigger
execution from a permitted roster write remains a distinct path. Reproducing
those selected metadata properties in a synthetic fixture is not live parity or
applied-history provenance.

## Outcome evidence

`scripts/ci/native-staff-trigger-composition.test.mjs` pins14 whole sources,
23 complete selected sections and eight function declarations. LF SHA-256
`5d97ba4e848e4fbf7664ed6e8dfcea949d753c341dd08ec17d88c3ec3e807a48`
(42298 bytes). Nine focused sequential tests pass9/9 (6.365s); own-file ESLint
and Prettier pass. Independent read-only review and full sequential tooling
are verified above. CI adds a dedicated
never-quarantined memory-only gate.

| Synthetic operation with both staff AFTER triggers retained            | Verified stored outcome                                                                                                                                                                                                            |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Self on_shift no-op/toggle, previously left chat member                | Chat becomes active and timestamp changes; native binding/roles stay unchanged. Targeting role=role separately invokes native remapping despite unchanged role.                                                                    |
| Self business_id-only retarget                                         | NEW team membership is added, OLD membership and native binding/roles remain; unrelated actor updates zero rows with no state change.                                                                                              |
| Owner deactivates staff with existing chat membership                  | Actual chat status CHECK rejects inactive (23514). Explicit ROLLBACK restores all relevant fixture rows/timestamp and selected catalog/ACLs; chat failure prevents reaching the remaining native bridge.                           |
| Owner deactivates staff with no chat member and an open shift/register | Chat affects zero member rows; native cleanup reaches the real shift CHECK, which rejects clocked_out (23514). Earlier register close and all relevant fixture state roll back.                                                    |
| Actual owner deletes their redundant roster                            | Chat membership is removed; native owner provisioning survives with the same legacy profile ID/owner role. This divergence is characterized, not accepted product behavior.                                                        |
| Multi-roster, completed-shift/open-register stale synthetic control    | Both shops' user sessions become manager_closed; managed roles are removed but other_staff remains; other-shop legacy profile binding and other active roster survive. No automatic shop selection or dual open shift is invented. |

The control fixture enforces real chat/shift/register status and time CHECKs,
auth/profile/shift FKs, team uniqueness and both one-open partial unique indexes.
Normal invalid writes fail with exact SQLSTATE/constraint names. Existing team
threads are explicitly staged: ensure returns early rather than rebuilding absent
members. Open register sessions on completed shifts are physically permitted by
the selected DDL but deliberately stale synthetic prerequisites, not live data.

The selected five full definition/body fingerprints, owners, language/security/
volatility/search paths and effective function ACLs match dated metadata. Three
noninternal staff attachments match exactly. Four selected owner/RLS/constraint
sets match; PostgreSQL18 NOT NULL constraint representation alone is excluded
after every selected attnotnull column is checked. Direct function and native
profile UPDATE denial is separate from automatic trigger execution by permitted
non-superuser/NOBYPASSRLS roster actors.

Source fixture grants are preserved, not a reproduction of all raw live table
ACLs. Shift RLS/SELECT flags and the five function ACLs are explicitly synthetic
catalog reproduction; native profile/role RLS is synthetic defense-in-depth.
No current chat policies are loaded. Snapshots cover all14 fixture relation rows,
selected columns/defaults, constraints, indexes, noninternal attachments,
functions, policies, table/schema/function ACLs, four fixture roles and selected membership fields;
not every platform object, column/default ACL or security attachment. Failures
explicitly roll back the actor transaction before state comparison. Successful
controls assert expected changes with selected catalog preservation.

Memory engine: PGlite0.5.9/PostgreSQL18.6, not live PostgreSQL or CI's disposable
Parts PostgreSQL17. Session-setting fixtures are not hosted authentication,
HTTP/JWT, concurrent sessions, production load, all native policies/writers,
audit completeness, current data integrity, applied lineage or recovery proof.
No source CHECK, historical SQL or production state was altered to pass.

## Companion contract: still unresolved, not an implemented guard

- Freeze identity **values**, preserving unchanged upsert business/user keys and
  retained legacy profile IDs. Active self-service should target only on_shift;
  privileged self-targets require separate authority even if values are unchanged.
  Existing app upserts include business_id/user_id, and reinvitations overwrite
  invited_by: freezing provenance needs an explicit adapter/audit contract.
- Coordinate downstream effects, not just a roster BEFORE guard. Self-shift/no-op
  updates must not silently reactivate chat or rebind native authority. Column-
  targeted triggers can run for unchanged target values. See
  [PostgreSQL trigger rules](https://www.postgresql.org/docs/18/sql-createtrigger.html).
- Preserve actual businesses.owner_id authority across chat and native handling;
  roster.role='owner' is not ownership. Resolve manager/assistant-manager
  invitations, owner-equivalent assignments and deletion rights. Current manager
  app gating does not broaden retained owner-only DELETE RLS.
- Choose compatible offboarding states and atomic roster/chat/native/shift/
  register/audit outcomes without admitting invalid historical statuses. Resolve
  multi-roster scope: user-wide cleanup/global role bindings do not establish
  tenant-specific removal or justify automatic active-shop selection.
- Specify transaction-wide authority checks, consistent lock order, revalidation
  after waits and stale-version/conflict responses. FOR KEY SHARE does not block
  ordinary non-key updates. A preflight RPC or row trigger alone is not proof of
  revocation-safe concurrency. Audit every ownership/delegation writer and test
  with independent PostgreSQL sessions. See
  [PostgreSQL locking](https://www.postgresql.org/docs/18/explicit-locking.html).
- Keep original-actor attribution, idempotent audited operator provisioning,
  bootstrap/other definer paths, and chat policy/SELECT dependencies explicit.
  An own-membership UPDATE predicate alone does not prove left-member self-
  reactivation: source SELECT/is_thread_member and actual current grants/policies
  also matter. No production policy or operator bypass is approved here.

## Exact next bounded inventory slice

After this proof is verified, extend `baseline-native-scope-v1.json`
conservatively; no release/parity/baseline flag promotion:

1. The validator currently requires evidence JSON.project, while the new dated
   catalog has projectRef. Do not edit dated evidence to conceal this mismatch.
   First add a narrowly tested canonical projectRef fallback only when project
   is absent; reject conflicting/wrong/malformed identities. This is tooling,
   not database authority or whole-source catalog correspondence.
2. Add chatBase and timestampShared source pins from the rehearsal map. Their
   exact filename/LF hashes match the already-pinned provenance.legacyApplied
   source-correspondence records; global404/423 and19 unclassified stay unchanged.
   Pin the dated catalog as metadata evidence, not applied SQL.
3. Add concrete timestamp staff attachment/function, chat threads/members and
   source-only membership SELECT/UPDATE helper/policies; default work-location
   table/shops INSERT attachment/function; business-created team attachment/
   function. Keep the external broader chat closure placeholder and add an
   explicit offboarding/audit writer-closure unknown reachable from the bridge.
   Source-observed business/shop incoming attachments are not catalog-verified
   merely because the three staff attachments were observed.
4. Preserve all nine mandatory table facets as unreviewed, existing exclusions,
   roots, forward sources and false flags. Add only narrowly dated fingerprint/
   ACL/attachment observations to existing/new objects, keeping later
   supersession/full writer authorization unresolved. Exclude location bootstrap
   and register seeds. Real new graph cycles must remain unresolved coverage;
   expected inventory exit remains1, not acceptance.

Then develop the offline companion contract and its real constraint/trigger/
concurrency tests. Baseline/forward/private-storage recovery, actual API/JWT/role/
load acceptance, private consent/tenure/financial retention, original receipt
scanner recovery/owner/mobile pilot, trusted entry/billing/retail/recruitment and
hosting release gates remain open. The pending bootstrap/totals owner decision
is unchanged; do not re-ask or apply it based on these proofs.

The Supabase security/performance skills kept this work disposable and separated
direct EXECUTE, trigger authority, row policy visibility and release acceptance.
Migration impact: none. Deployment: none. Sparse local artifacts must not deploy.
