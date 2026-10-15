# Native self-shift-only companion: disposable research candidate

2026-10-15 (Asia/Manila). **Memory-only, not adopted, not a migration, not a
production mitigation or complete authority/offboarding contract.** This is the
first bounded implementation from `NATIVE_COMPANION_AUTHORITY_CONTRACT.md`.
Draft PR #39 (`https://github.com/Hunting-Fishing/motorsales365/pull/39`), code
`62f4c4b574224bfe55418b2ab30484644a1b8c03`, branch
`security/native-self-shift-candidate`.
No production records/counts, application RPCs, privileges, history or platform
resources are changed. The pending bootstrap/totals decision is not re-requested.

Parent PR #38 documentation `14c18d3` passed all six CI gates in run
`38659674559`, verified on this resume. Hosting still fails separately; preview
wrapper success is not upload evidence, and production migration/deploy skip.
No sparse local artifact may deploy.

## Deliberately closed research scope

The candidate studies **only an already-active subject's own `on_shift` toggle or
no-op**, including unchanged identity keys. All privileged UPDATE targets and
INSERT/DELETE are denied in this experiment—even for an actual owner, manager,
service role or database owner with a NULL subject. This deny-only scope is not an
adopted role/delegation matrix, an emergency production restriction or compatible
staff-management release. Full app upserts/reinvitation/removal remain gated.

The shared non-test fixture in
`scripts/ci/fixtures/native-staff-trigger-fixture.mjs` mechanically extracts the
existing proof's 14 whole-source pins, 23 selected sections, eight functions,
critical DDL and explicitly synthetic supports. All nine original test bodies
remain byte-identical; they still characterize unchanged source in their own
suite. The old PR #34 test-file hash is historical, not the new refactored file's
hash. No historical SQL, source constraints, source ACLs, policies or helpers are
edited by this extraction.

The new candidate is `scripts/ci/native-self-shift-candidate.mjs`; its SQL is
returned only to the disposable test harness. There is no application integration,
CLI/live execution path, migration/history entry or automatically applied recovery.
Callers wrap installation/recovery in a transaction with explicit rollback.

## Explicit candidate changes

1. A new private `companion_candidate` schema and three functions/BEFORE triggers.
   Identity **values** (`id`, business/user UUIDs, `created_at`) cannot change.
   Unchanged targets are not mistaken for a transfer. An active own row must also
   keep role/title/duties/active/invitation provenance unchanged.
2. A separate target-aware `BEFORE UPDATE OF` guard denies role/title/duties/
   active/invited_by and explicitly client-targeted updated_at, even when equal.
   The real timestamp trigger still owns derived updated_at. Mixed SET lists
   cannot hide a privileged target behind a shift toggle.
3. A deny-only INSERT/DELETE guard closes those commands in this lab. Full app
   `ON CONFLICT` payloads are tested as their real INSERT/conflict paths, not
   represented as an already-approved manager upsert. The research scope accepts
   no privileged positive case through a permissive supporting stub.
4. One SQL statement checks a conservative single-roster/single-linked-shop
   context and a single native identity matching `id=subject OR user_id=subject`,
   with the subject's user_id/shop binding matching that linked shop. This detects
   canonical/legacy NULL or non-NULL shadows without canonicalizing a legitimate
   legacy ID. Multiple/inactive-other rosters, missing/conflicting bindings and
   shadows are denied as **research gates**, not a final multi-roster policy.
5. Only the candidate version of `public.trg_staff_sync_team_thread()` gets a
   forward UPDATE short-circuit, before ensure/provisioning. It compares all
   identity/authority values null-safely, requires active own subject, and ignores
   only requested on_shift and derived updated_at. The complete retained tail is
   unchanged, including its still-invalid offboarding status; no CHECK is widened.
   All three original enabled staff attachments remain exact. Timestamp and both
   native wrapper/member functions remain unchanged. No trigger is silently
   removed to hide a side effect.

The private lookup guard is a narrowly scoped definer because source native RLS
does not expose those binding checks to the actor. It has an empty search_path,
qualified object references, mandatory subject check and no non-owner EXECUTE
grant. The other two new guards are invoker functions. No mutable role helper,
`current_user`, NULL actor or role-GUC privilege exception is introduced. This
does not certify the unchanged source definer paths or synthetic claim provider.

## Installation and recovery limits

The builder pins the complete original chat definition and its body fingerprint.
Installation refuses an existing candidate schema, mismatched original chat
header/body/config/owner/raw ACL or changed/extra/disabled staff attachment.
Recovery checks the expected candidate chat metadata, all six attachments and
three private function definitions/config/owners/closed EXECUTE ACLs before
explicitly removing candidate objects and restoring the original chat body.
No `CASCADE` is used: unknown private objects make schema removal fail and the
test caller rolls the transaction back. Recovery is memory-only and restores the
unsafe original source behavior; it is not approved production rollback/recovery.
It does not reverse an already-committed legitimate self-shift value.
These are narrow research preconditions, not arbitrary-drift validation of every
supporting native/timestamp function, schema or constraint. Private ACL checks
establish no non-owner EXECUTE, not exact schema ACL/owner-privilege equality.
Supporting source/schema correspondence remains the pinned fixture's boundary.

## Evidence and remaining boundary

Focused and full sequential test results, code/PR and exact next action are
recorded in `../365_COMPLETION_CHECKLIST.md` after verification/publication.
Focused candidate tests pass 18/18 (final stable run 25.764s); the nine unchanged
characterization tests pass 9/9 (6.370s). Full sequential tooling passes 277/277
(181.68s), no skipped/cancelled tests. Lint/format/diff and independent source,
test and documentation review pass. Recovery-header drift and two stored-value
assertion gaps found in review were corrected; no source behavior was hidden.
CI includes a dedicated never-quarantined memory-only step. Code `62f4c4b` passed
all six CI gates (run `38661636502`); the subsequent documentation head requires
its own next-run check. Passing tests do not adopt this authority model.
All fixture state is synthetic. Positive checks inspect all 14 fixture relations;
only the target on_shift/derived timestamp may change. Negative controls compare
stored state and selected catalog/ACLs after explicit rollback, not merely errors
or returned-row counts. Private candidate metadata is checked separately from the
older fixture catalog's original three-schema projection.

This fixture deliberately does not load the selected chat policies. PR #36's raw
self-membership reentry/retarget proof still applies and is **not fixed here**.
No trusted business-team classification, ordinary private-group compatibility or
raw membership authority closure is inferred from a preserved membership value.
Native profile/role/bootstrap/ownership/direct writer closure remains open.
Owner/delegation/provenance/multi-roster positives, valid atomic offboarding,
original-human audit, API/JWT/session freshness, load/index planning and real
independent-session locking/revalidation remain unimplemented or unverified.

Next implement the trusted team/native-writer boundary separately, composing the
actual selected chat policies and raw/filtered/RETURNING controls. Do not enable
privileged positives or substitute a status-only `left` repair. Establish reviewed
delegation/provenance/ownership decisions, original-actor attribution and valid
atomic effects before independent-session concurrency/recovery and a separately
approved provenance-safe forward release. All baseline/replay/parity/release flags,
private consent/tenure/retention, receipt/mobile pilot and hosting gates stay open.

Immediate bounded dependency before that authority work: recover current metadata
and source-pin/compose `shop_manager.is_owner_or_admin(uuid)` (retained
`20260713081559_69ad9a73-edab-4719-b16e-38541b8ba91a.sql`) and
`shop_manager.user_belongs_to_shop(uuid,uuid)`
(`20260713081649_7763bb16-35c5-4c76-a8f9-36c3f58090ce.sql`) with the actual
`sm_profiles_update_self`, `sm_profiles_insert_self`, `sm_user_roles_admin_manage`
policies from `20260713081838_b99aba93-f19b-4aec-b7a1-3bdb86faadc6.sql`.
Use legacy/shadow/global-role and physically valid direct-DML controls; reuse the
already completed `ensure_profile_for(uuid)` proof as the indirect-writer boundary,
not seven repeated characterization cases. Later conditional sweeps and source
ordering are not effective policy/ACL or applied-history evidence. Ownership
claim/transfer (`approve_business_claim(uuid,boolean)`), shift actions and the
operations-ledger capture/attachment gap remain subsequent selected dependencies.

Primary semantics used for this candidate:
[PostgreSQL trigger target lists and ordering](https://www.postgresql.org/docs/18/sql-createtrigger.html),
[PostgreSQL function security](https://www.postgresql.org/docs/18/sql-createfunction.html).
Supabase security guidance kept privileged lookup, trigger execution, row-policy
reachability and production acceptance separate; local queries verify the bounded
experiment rather than treating a general SELECT-policy rule as universal.

## LF artifact pins

| Artifact                                               | UTF-8 LF bytes | SHA-256                                                            |
| ------------------------------------------------------ | -------------: | ------------------------------------------------------------------ |
| `scripts/ci/fixtures/native-staff-trigger-fixture.mjs` |          22775 | `02e7e1511ccf94878b86c9604eb4d38844f19017f933da43de5f84b1b5ffbad3` |
| `scripts/ci/native-staff-trigger-composition.test.mjs` |          20193 | `b4184f152de53a4100d1cbb8675918b5e862050ee6a873d0b49d3d4e274fde95` |
| `scripts/ci/native-self-shift-candidate.mjs`           |          11352 | `3a826e5bcd08ebf6437c022b213fe66ffca3665e5acb835743d2fa455a9aa381` |
| `scripts/ci/native-self-shift-candidate.test.mjs`      |          26320 | `bcb261d9c4443844ed1f6416f7315224fd002e5d6b8af5b9684e9e6f0029eea1` |
