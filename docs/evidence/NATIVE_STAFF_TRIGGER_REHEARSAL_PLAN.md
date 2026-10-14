# Native staff, chat and offboarding trigger rehearsal plan

2026-10-15 Asia/Manila. Status: **original offline plan, not mitigation**.
The subsequent nine-test proof is implemented separately; see
`NATIVE_STAFF_TRIGGER_COMPOSITION_PROOF.md` for actual results, publication
evidence and limits. This preserves the original proposed cases as a dependency before a
companion native-authority guard. It does not authorize production changes,
profile repair, a migration replay, new permissions or customer communications.

The existing reduced roster proof demonstrates selected authorization and native
bridge behavior. It omits the real chat triggers and shift/register constraints,
so it is not offboarding acceptance. The completed current-profile, module and
receipt composition proofs do not need repeating here. See
`BUSINESS_STAFF_AUTHORITY_GATES.md`, `NATIVE_PROFILE_RESOLUTION_PROOF.md` and
`NATIVE_ACCESS_COMPOSITION_PROOF.md` for their separate evidence and limits.

## Evidence boundary

The retained source below predicts behavior that the proposed six-case rehearsal
must test with unchanged definitions and critical constraints. These are not
claims that affected production records exist, that a live incident occurred, or
that a particular production workflow succeeded or failed.

The separate saved catalog artifact
`native-staff-trigger-catalog-2026-10-15.json` records project
`wjxaajgvddtrxxtocxen`: four selected table records observed at
`2026-10-14 22:28:03.478815 UTC`, then five selected function records at
`22:28:36.246141` through `22:28:36.246157 UTC`. Its whole-file LF SHA-256 is
`5c10e2399f1bbfe4ba16f1b2cf434fd4d9cbba5e72e18185e748760e16eed567`
(24,043 UTF-8 bytes after CRLF-to-LF-only normalization). This document inspected
the saved artifact; it performs no additional database query. The artifact
contains catalog metadata, not business rows, business counts, function
invocations, history changes or platform writes.

These observations are dated, narrow snapshots, not one atomic snapshot of all
dependencies. Source correspondence and matching fingerprints do not prove
applied migration history, full schema parity, immutable authority, JWT/API
reachability or a safe release. MD5 values below are definition identifiers, not
cryptographic authenticity evidence. Reproducing selected catalog fingerprints
in the future fixture remains an explicit assertion to implement, not a test
result established by this plan.

## Actual narrow catalog observations

All four selected tables are postgres-owned, RLS-enabled and not FORCE RLS.
Their saved table ACLs are not their row policies and do not establish row-level
authorization. `business_staff`, `chat_threads` and `chat_thread_members` have
raw anon/authenticated table ACL entries; `employee_shifts` has authenticated
SELECT in its raw ACL. Current policies, column-level privileges, default
privileges and complete role inheritance were not captured by this artifact.

### Three enabled staff trigger attachments

The saved `public.business_staff` record contains these three enabled (`O`),
non-internal triggers, in addition to internal FK checks:

| Trigger                               | Attachment                                            | Function                                     |
| ------------------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| `trg_business_staff_updated`          | BEFORE UPDATE                                         | `public.set_updated_at()`                    |
| `business_staff_team_thread_sync`     | AFTER INSERT, DELETE or every UPDATE                  | `public.trg_staff_sync_team_thread()`        |
| `sync_business_staff_to_shop_manager` | AFTER INSERT, DELETE or UPDATE OF role, title, active | `shop_manager.sync_business_staff_trigger()` |

Both AFTER triggers must be present in the same rehearsal. Do not replace them
with direct helper calls or a change-only simulation. An UPDATE target list may
fire the native bridge even when its role/title/active value does not change.
Conversely, an identity-only or on_shift-only target does not target those three
native columns, while the chat trigger still applies. The BEFORE timestamp
trigger is another real side effect, including on no-op updates.

### Effective function EXECUTE observations

For **each of the five selected functions**, the saved effective observations
are `anon_execute=false`, `authenticated_execute=false`,
`service_execute=true`, with ACL `{postgres=X/postgres,service_role=X/postgres}`.
All are postgres-owned PL/pgSQL functions with volatility `v`. This resolves the
earlier source-only uncertainty about direct client EXECUTE for these exact
identities at the observation time; do not report these five as currently
PUBLIC-executable merely because a historical declaration omitted REVOKE.
Denied direct EXECUTE does not prevent an enabled trigger from running after a
separately permitted roster write.

| Qualified identity                                                     | SECURITY DEFINER | Saved search_path                     | Definition MD5 / body LF MD5                                            |
| ---------------------------------------------------------------------- | ---------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| `public.ensure_business_team_thread(uuid)`                             | true             | `public`                              | `af5f35c551b5166bff62f13c908ad09c` / `27f7116c7d2dd662b07990ae22f7aea6` |
| `public.set_updated_at()`                                              | false            | `public`                              | `79bdd57c6d1eda0a97a0f17733c0f713` / `5b733ab523bad442e4b10f836de9e4ba` |
| `shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)` | true             | `shop_manager, public, auth, pg_temp` | `402ef8741c2c78f2b0b9e4c7240fa9c4` / `3953299c83e7f20a19f4a7f60b12ba84` |
| `shop_manager.sync_business_staff_trigger()`                           | true             | `shop_manager, public, pg_temp`       | `7eda4e3d3d50670b1e27ae46528cb847` / `16868098a0e6e594f4d013a09f117af0` |
| `public.trg_staff_sync_team_thread()`                                  | true             | `public`                              | `217abef5cd5687f24a3da697ba5a4c9d` / `b6c1d106f82fc26edef65f28189a3470` |

The JSON prints the three public identities without schema qualification; the
retained declarations identify their public schema. These selected observations
do not cover the business-created thread trigger, default work-location helper,
chat membership helpers, other writers, all inherited role paths or all future
function definitions.

### Validated constraints, not inferred policy/index closure

- `business_staff`: validated id PK, unique `(business_id,user_id)`, business FK
  with DELETE CASCADE. No user FK is listed in this selected table record.
- `chat_thread_members`: validated `(thread_id,user_id)` PK; status CHECK permits
  **invited, active, left**; thread and auth user FKs DELETE CASCADE; invited_by
  auth user FK DELETE SET NULL.
- `chat_threads`: validated id PK and business/creator FKs DELETE CASCADE. Only
  internal FK triggers are listed for it and for members in this snapshot.
- `employee_shifts`: validated id PK; status CHECK permits **on_shift, on_break,
  completed, manager_closed**; clocked_out_at must be NULL or at least
  clocked_in_at; shop/profile/auth-user FKs DELETE RESTRICT; location/closed_by
  FKs DELETE SET NULL. Its captured triggers are internal FK triggers, including
  incoming event/register/counter-sale relations.

Indexes were not queried. In particular, this snapshot does not verify the
current team-thread unique index or one-open-shift index. Register-session,
work-location, native-profile and native-role attachments/constraints are outside
these four table records. Internal trigger names containing OIDs are
observation-specific and must not be treated as portable fixture identities.

## Immutable retained-source selection

All filenames in this table are under `supabase/migrations/`. Whole-source
SHA-256 uses UTF-8 with **CRLF-to-LF-only** normalization: no trimming, body
rewriting or SQL normalization. Line boundaries are one-based, inclusive, in the
pinned source. The future test must also pin each uniquely extracted section and
fail closed on missing/duplicate selectors or whole-source drift. Do not execute
whole files to obtain the selected definitions.

| Source                                                                | Whole-source LF SHA-256                                            | Selected boundaries and purpose                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12.sql`             | `69afe9112531bd75d0bc68d4b31461d9e1c9aae41337ebdf79e6f40056447d62` | Roster DDL/indexes/grants/RLS 19–38; owner helper 41–44; member helper 57–65; four roster policies 67–82; timestamp trigger attachment 214–216. Do not load its superseded timestamp or manager body.                                                                                      |
| `20260620173020_b2bd6551-8f88-4050-bf57-10a0e7be4da2.sql`             | `61280ef72b2f631d1117b8b8dc3564442fff95be67b78d48e97250dc2cacbe84` | Latest retained `public.set_updated_at()` 30–33, invoker with public search_path.                                                                                                                                                                                                          |
| `20260711073331_3314948d-c196-44ff-b656-7be383f5d16b.sql`             | `67bba50f869ebbd00edab5de5d7913e91112073b7f7a1c75475bb4125414dac4` | Chat threads 3–12, members 14–25; optional unchanged chat policy dependencies 47–65 and policies 68–95. Exclude messages, storage and notification paths.                                                                                                                                  |
| `20260713071921_8c790938-2bb4-420b-b1df-3261d4bed855.sql`             | `2231cdf09ee79ed8a8e0d93ef55176c2e32f245494f55c93dba5e5cbe4a171d7` | Business chat columns/indexes 3–10; ensure helper 13–49; staff chat trigger function 63–89; attachment 91–94. Business-created helper/attachment 51–61 is a known separate incoming path. **Exclude backfill 96–103** and later notifications/publication changes.                         |
| `20260831124952_employee_operations_ledger.sql`                       | `2386ee30a1b12cd124445adf3da3568c35e567e96aa9f7b83e6cd4211ccae6b2` | Work locations 5–17; default-location function/shops INSERT attachment 23–36; actual shifts/checks/FKs/indexes 38–60. Exclude location bootstrap 18–21. Audit dependencies 335–375 are review-only for this first proof; normal shift action 232–277 is a separate writer, not the bridge. |
| `20260831193523_counter_sales_registers_pricebook.sql`                | `e2736908cc1e3343e4cb1a784c0f839ff198e0754c015f39b831fb3482f0327c` | Actual cash_registers DDL line 3 and register_sessions DDL/partial index 5–6. **Exclude register seed line 4**, counter-sale functions and all later patches.                                                                                                                              |
| `20260901025424_business_staff_shop_manager_bridge.sql`               | `a49e50ecd9a621d4162ff58666ab98584d9aa009775732ce4cf8b645d8c21a9e` | Two partial unique indexes 2–5; native staff trigger attachment 135–138. Load latest functions from the following two sources, not this file's superseded bodies. **Exclude staff backfill 140–145**.                                                                                      |
| `20260901090422_correct_business_role_and_associate_boundaries.sql`   | `bd5de1d18b1e22e361e161a249e22d36759cc24ba9b9636de5dd762b90a7ccd4` | Latest native trigger body 5–39 and REVOKE 40–41; authoritative businesses.owner_id overrides a redundant roster's active/role value.                                                                                                                                                      |
| `20260902151438_assistant_manager_temporary_canonical_permission.sql` | `1ac1aaed2fb7fe17bd10a73a1f62f9eab4764248bf257518b84b14db23752522` | Latest member bridge 161–216 plus REVOKE/GRANT 217–218. Reuse its uniquely selected latest `public.has_business_role` from the existing staff authority proof; exclude unrelated stock/inventory writers.                                                                                  |

Existing section pins for reuse, not a replacement for the new whole-source and
section checks:

- Latest member bridge:
  `73562fb19efda957ba6fd0574797a70ecf1b8281ed6cde15020d0622210c45d5`.
- Latest native trigger function:
  `e46a9d8d72bb19138e70129666388bdc4da87d34bd8fae777db00094df78f627`.
- Native trigger CREATE attachment, excluding DROP:
  `2d9d837c0f34888d9a79cedc577eb21de5c91b748e62aac30b0135a1102da492`.
- Latest manager helper:
  `e4c225778fec745ed02225d4f9bafa1d2854ecd2a4da554f4ca00383a3ee0f37`.

The retained demo patch
`20260901032848_test_tow_company_demo_workspace.sql` (whole LF SHA-256
`cee2458aa9175efd5a91650bbdf498c1fb500bb869a16a9bb39e858aca690061`)
contains dynamic definition replacement at 123–143. The later complete member
definition above supersedes it in retained filename ordering; **never execute
the demo or its data to recover a function**. The generic security sweep
`20260805084402_cd07847a-26f0-4c31-a2fe-ab0088684f77.sql` (whole LF SHA-256
`d987fe1e83505eb4002529a5290361fba2ff4af994938986ced9006c1502b321`)
is also excluded: saved effective ACL observations are narrower evidence than
replaying a broad conditional sweep. Filename ordering is not applied lineage.

## Minimal fixture contract

Proposed target: `scripts/ci/native-staff-trigger-composition.test.mjs`, not
created by this plan. Use sequential, memory-only PGlite fixtures, always closed
in `finally`, with a proposed 30-second test bound, 3-second statement timeout
and 1-second lock timeout. No network, credentials, persistent database,
dependency installation, database history adoption or real chat delivery.

Reuse selected unchanged roster authorization helpers/policies and the synthetic
auth.uid/session-setting harness from `business-staff-authority.test.mjs`, not
its reduced shift/register relations or invented native profile shop FK. Keep
supporting auth/public-business/public-profile/native-role shapes explicitly
synthetic where not recovered. Use the known native profile identity constraints
without inventing a profile.shop_id FK; preserve nullable user_id, legacy
id/user_id distinction and the partial unique user binding. Do not infer
business ID equals native shop ID or canonicalize legacy profiles.

Load actual critical chat, work-location, shift and register DDL/constraints and
partial indexes listed above; both staff AFTER triggers, the latest timestamp
function and BEFORE attachment, latest native member/trigger bodies, and the
default-location shops INSERT attachment. The latter is a known retained
side-effect when the bridge inserts a shop, not a catalog-verified current
attachment in this snapshot. Either include its unchanged selected definition
or explicitly classify that path outside the fixture; do not silently stub it
and claim writer closure.

Use a real non-superuser/NOBYPASSRLS role for actor operations with selected
roster RLS. Construct synthetic prerequisites with privileged fixture setup,
then switch to the tested actor. Fixture setup is not evidence of a production
transfer/offboarding workflow. Preserve real chat and shift CHECKs; do not admit
`inactive` or `clocked_out` simply to make the bridge succeed. Enforce actual FKs
and unique constraints in successful controls. A source-only chat policy may be
tested as source behavior, not described as a verified current live policy.

Keep selected function EXECUTE denial controls separate from trigger execution.
Any fixture grants or denials reproducing catalog observations must be labelled
synthetic privilege setup, not historical statements that were applied live.
Snapshot fixture rows and selected ACL/RLS/constraint/trigger properties before
each operation. For expected failures, assert SQLSTATE `23514`, recover the
transaction explicitly and compare complete relevant state afterward; an error
alone is not rollback evidence. Do not expose production IDs, PII or counts.

## Six-case unchanged-source proof plan

These are **predicted source behaviors and proposed assertions**, not passing
tests or verified production outcomes.

1. **Self shift and no-op update.** Start with an active roster, an existing team
   and the actor's `left` membership. Under selected self-update RLS, target only
   on_shift, including `on_shift=on_shift`. Characterize the chat upsert to
   `active`, unchanged native profile/roles and the real timestamp update. Use a
   deterministic earlier stored timestamp rather than assuming now() advances
   within one transaction. Contrast a role-targeted no-op with this source's
   native UPDATE OF attachment where useful.

2. **Identity-only retarget.** Target business_id only, with a user_id-only
   variant if retained in the bounded test. Characterize membership added for
   NEW identity/business, OLD membership retained, and no native column-targeted
   bridge invocation. The latest native trigger body does not remove OLD state
   because that trigger is not attached to these target columns. Assert actual
   roster RLS admission/denial separately; do not use privileged setup as proof
   an unrelated actor is authorized.

3. **Deactivation with an existing chat member.** The source chat writer assigns
   `inactive`, while the real chat CHECK admits only invited/active/left. Expect
   `23514` and prove roster, timestamp, chat, native profile/roles, shifts and
   registers roll back together. Keep both staff AFTER triggers attached and do
   not reorder or remove them to reach a preferred result.

4. **Deactivation with no actor member and an open shift.** Keep an existing
   team but no actor membership so chat UPDATE affects zero rows. Native cleanup
   closes matching open register sessions before writing shift status
   `clocked_out`; the real shift CHECK rejects that status. Expect `23514` and
   prove rollback of the earlier register update and all other relevant state.
   This isolates the second predicted incompatibility without relaxing either
   actual CHECK or bypassing the chat trigger.

5. **Actual owner roster deletion.** Delete a redundant roster for the user
   matching businesses.owner_id under the selected owner DELETE policy. Source
   chat handling removes OLD membership; the native trigger explicitly calls
   active owner provisioning instead of detaching the actual owner. Characterize
   that divergence, including preserved legacy profile ID if present. It is not
   a decision that this product behavior is correct or a proposed mitigation.

6. **Multi-roster, no-open-shift control.** Use valid completed shifts and open
   register sessions on distinct registers across two shops, with the actor chat
   member absent. Open sessions referencing completed shifts are physically
   permitted by the selected DDL but deliberately stale synthetic prerequisites,
   not a claim they occur live. Do not create two simultaneous open shifts for
   one user: the selected partial unique index forbids that. Characterize
   user-wide register cleanup and managed-role deletion versus profile detach
   additionally restricted to the resolved native shop. Check the single native
   binding, a still-active other roster, legacy ID preservation and no automatic
   active-shop selection. Preserve the source's different managed-role lists:
   inactive cleanup excludes `other_staff`, active remapping includes it.

The ensure-thread source returns an existing team immediately, without rebuilding
missing memberships; this matters for cases 4 and 6. For a new team it adds owner
and active roster members. Seed an existing team explicitly where a zero-member
branch is required rather than accidentally creating one through the helper and
assuming it stays empty. Successful controls must verify expected synthetic
changes; failure controls must verify no partial changes remain.

## Unfinished writer and audit closure

The initial inventory's source-observed staff chain and external chat placeholder
are not full attachment closure. Add concrete chat/timestamp/default-location
nodes only after the bounded proof and evidence review, retaining unknown
facets, lineage classes and false release/parity flags. Do not replace specific
dependencies with a blanket inventory-finding total.

Current chat self-update policy behavior is **source-only and unverified
current**: `20260711073331_3314948d-c196-44ff-b656-7be383f5d16b.sql`
92–95 allows UPDATE with self user_id in both predicates. The new artifact does
not capture chat policies, so it cannot verify, supersede or prove API exposure
of that rule. Effective UPDATE also depends on the SELECT policy and
is_thread_member, whose selected source admits active/invited membership; the
self UPDATE predicate alone does not prove a left member can self-reactivate or
move across threads. No additional live query is requested by this plan.

The ledger's `capture_employee_operation()` at 335–367 derives shop/profile from
the actor's current native profile, then writes limited operational metadata;
that is not independent verification of the changed row's trusted shop. Its
dynamic attachment block 369–375 names payments, invoices,
inventory_transactions, inventory_purchase_orders, stock_transfers, customers,
work_orders and work_order_discounts. It does not attach this audit hook to
staff, profiles, user_roles, shifts, register_sessions or work locations.
The normal employee_shift_action separately inserts shift and operational audit
events at 269–272; member-bridge cleanup does not call that writer. Therefore
offboarding audit completeness or correct cross-shop attribution cannot be
inferred from the existence of the operational ledger. Do not expand the first
six-case fixture into all eight business-table audit paths.

Broader current policies, indexes, column/default ACLs, role inheritance,
definer/invoker wrappers, dynamic/unqualified writers, profile/role provisioning,
business ownership changes, chat delivery/storage, shift/register/work-location
attachments, service/operator entry paths, multi-roster delegation and audit
semantics remain separate unknowns. Neither current_user inside a definer nor a
passing reduced fixture establishes the immutable original human's authority.
HTTP/JWT/session-offboarding, concurrency, production row integrity and rollback/
recovery readiness are not proved by session-setting memory fixtures.

## Next three safe actions

1. Implement and independently review only the hash-pinned six-case memory proof,
   with unchanged functions/triggers and intact critical constraints; report
   actual outcomes and limitations without modifying historical SQL.
2. Compare those outcomes to the dated narrow catalog evidence. Identify exact
   unresolved metadata dependencies for a separately reviewed future inspection,
   rather than requesting a broad query now or claiming complete live parity.
3. Extend the bounded inventory conservatively, then define the companion guard's
   identity-freeze, self-shift/no-op, owner/manager delegation, multi-roster
   cleanup and audit-attribution contract. Any forward SQL, ACL change, data
   repair or production action remains a separately reviewed release decision.

This original plan changed documentation only. No rehearsal ran in its PR #33 slice; the separate subsequent proof is linked above. No
migration was created/applied, no business data or counts were inspected, and no
production permissions, history, configuration or records were changed.
