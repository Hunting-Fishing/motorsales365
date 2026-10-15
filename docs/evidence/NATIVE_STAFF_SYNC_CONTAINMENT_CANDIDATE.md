# Native staff-sync selected writer: offline containment candidate

2026-10-15 Asia/Manila. **Memory-only, unapplied, non-adopted and not production
authorization or trusted original-human attribution.** This candidate studies
the next selected indirect writer after PR #43's direct native table prototype.
PR #43 documentation head `3bf5f43` passed all six CI gates in `38673257097`,
verified on this run. Hosting `d6a78c2b-157f-4d13-8904-2300c7c91cd2` failed
separately; wrapper `38673257105` skipped migrations and production deployment.
A green preview wrapper is not an upload. No sparse artifact may be deployed.

Published draft [PR #44](https://github.com/Hunting-Fishing/motorsales365/pull/44),
code `aad4f2644fb7612562a94e52ddf460971c34037e`, branch
`security/native-staff-sync-containment`, stacked on PR #43 docs `3bf5f43`.

## Selected endpoint, not an actor allowlist

`scripts/ci/native-staff-sync-containment.mjs` inserts one unconditional
`42501 / Memory-lab native staff sync unavailable` immediately after the latest
`shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)` body's
unique top-level BEGIN. It precedes every business SELECT and native write. The
entire original declaration, argument names/types/default, SECURITY DEFINER,
search_path, DECLARE block and original tail remain unchanged. That tail is
unreachable in this experiment, not repaired or authorized.

All callers are denied, including postgres, service_role, actual business owners,
different subjects and NULL subjects/arguments. No `current_user`, `session_user`,
claim setting, mutable manager/role helper or signed-out exception grants runtime
authority. Preexisting anon/authenticated EXECUTE denial remains distinct from
the distinctive denial reached by permitted callers inside the body. A service
grant is preserved as metadata, not a working service provisioning exception.

The real selected path is retained, not replaced with a permissive test wrapper:

1. Actual pinned roster mutation policies and critical DDL in the existing fixture.
2. Original `sync_business_staff_to_shop_manager` attachment from
   `20260901025424_business_staff_shop_manager_bridge.sql:135–138`.
3. **Later** wrapper from
   `20260901090422_correct_business_role_and_associate_boundaries.sql:5–42`, not
   the superseded wrapper in the original attachment file.
4. Latest member from
   `20260902151438_assistant_manager_temporary_canonical_permission.sql:161–216`;
   the separate source ACL statements follow at 217–218. The fixture selects only
   complete declarations, never whole historical replay/backfill/seed execution.

This contains that shared selected endpoint in memory. It does **not** close
trusted roster management or identify the original human. It would intentionally
break add/promote/remove/provision actions reaching it, including owner/service
actions. It is not a compatible staff-management release or an approved emergency
production restriction. The three already-applied legacy helper restrictions
stay intact and are not replayed, recovered or used to authorize this candidate.

## Exact guards and explicit unsafe recovery

`buildNativeStaffSyncContainment()` returns a frozen four-string object:
`installSql`, `recoverSql`, `candidateDefinition`, `originalDefinition`. There is
no CLI, network/database executor, path/approval parameter or application wiring.
Importing the shared fixture reads its fixed pinned local sources/metadata; it
does not create a database or reproduce a complete production baseline.

Each operation is one DO statement with a temporary trusted `pg_catalog,pg_temp`
search_path (built-ins before temporary types, neither application schema in it),
exact before/after member metadata, unchanged latest wrapper and exactly the
three original enabled staff attachments. Guards include argument names/types/
defaults, result kind, owner, language, definer/volatility/config, raw ACL, selected
effective EXECUTE rights and full-definition/body MD5s. Original canonical
PostgreSQL rendering is reconstructed offline and checked against the existing
dated full-definition hashes before deriving the candidate hash. This is not a
new live catalog observation or SQL-object-identity/provenance acceptance.

The roster must be an ordinary, nonpartitioned relation with no incoming/outgoing
inheritance edges; the same roster OID is checked before and after replacement.
Function ownership, defaults, ACL and OID survive actual CREATE OR REPLACE in the
test. No GRANT/REVOKE, new schema/table/function/trigger, explicit table lock or
source CHECK change is emitted. Installation/recovery performs no application-row
mutation, role catalog change or data canonicalization; the stored original tail
still contains its unreachable DML statements.
The postgres install/recovery execution-context check is a SQL-lab restriction,
not original-human authority or release approval. Caller transaction/timeouts and
explicit rollback remain required by contract; the builder does not enforce an
outer transaction or provide durable execution/commit proof.

Recovery separately requires the exact candidate member, original wrapper and
three attachments before restoring the original member declaration. Reinstall,
repeated recovery and changed body/default/security/ACL/wrapper/attachments fail
closed. Recovery deliberately restores the **unsafe original writer**, not data
or an earlier transaction's legitimate values. It is not automatic or approved
production recovery. An unrelated committed public-profile update survives it.

These are narrow correspondence guards, not all-table/column/default ACL,
policy, ownership, incoming attachment, function-OID or competing-DDL closure.
No explicit table locks or independent-session revocation/concurrency safety are
established; ordinary DDL still takes its normal database locks.
The source-only fixture policies and dated metadata are not one fresh production
snapshot. Actual target-version, operator impact/backup/recovery and authenticated
API acceptance remain required before any separately authorized live candidate.

Independent review found the implicit temporary-type precedence of an empty
search_path. The final operation uses `pg_catalog,pg_temp` throughout before
parsing the raw retained declaration, not just a preflight check. A hostile
temporary uuid/text/boolean/void fixture now verifies actual install/recovery,
the same built-in argument/result OIDs and original function OID, exactly one
member overload, exact selected state recovery and restored caller search_path.
The function's own original SET clause/tail remain unchanged. This is a local
regression, not proof against all hostile DDL or production operator acceptance.

## Focused controls and honest boundaries

The new tests reuse the existing source-pinned staff fixture, actual critical
CHECKs and all three staff attachments. Auth/session claims, public-business
supports, source-ACL reproduction and selected native RLS remain explicitly
synthetic. PGlite/PostgreSQL18 is not hosted JWT/API, actual customer data or
independent PostgreSQL sessions. The completed nine-case unchanged roster proof
and seven-case bootstrap proof are reused, not relabelled as new guard acceptance.

New controls exercise body-level owner/service/NULL denial versus client EXECUTE
denial; real wrapper no-op role/title/active and mixed target lists; actual-owner
INSERT/conflict upsert/redundant-owner DELETE; service/SQL-owner NULL-subject
roster paths; exact recovery, drift and topology refusal. Failed commands compare
all 14 fixture business relations and the selected catalog/ACL projection after
explicit rollback. No source CHECK or history is widened to admit offboarding.

A separately labelled synthetic midpoint AFTER trigger is ordered between the
original chat and native attachments. It checks transient chat activation and
the fixture subject in its own postgres-definer context, then advances a local
nontransactional sequence. The exact endpoint denial plus that one sequence
advance and restored business state proves the earlier activation was reached
and rolled back. The sequence is deliberately outside the 14 business relations;
it is not claimed to roll back, certify native human attribution or exist in
production. Recovery refuses the extra probe attachment until explicitly removed.
An empty-team control also exercises actual earlier team/membership provisioning
before endpoint failure; final stored state remains unchanged.

Deactivating a row with an existing chat member still fails the unchanged chat
CHECK with 23514 **before** the endpoint. An absent-member/open-shift/register
control reaches 42501 without running the original invalid `clocked_out` cleanup.
These outcomes are separate, not evidence of valid atomic offboarding. Zero-row
UPDATE and INSERT ON CONFLICT DO NOTHING may acknowledge without invoking the
row-level endpoint and do not prove a mutation.

Genuine post-DDL fault controls use a synthetic CREATE FUNCTION event hook that
changes the member's security mode and returns normally. Both install and
recovery reach their **own postguard 55000**, rolling back the replacement and
fault change. Separate division-by-zero suffix controls test the caller's outer
transaction, not the operation's postguard.

Shift-only and identity-only UPDATEs bypass the native UPDATE OF role/title/active
attachment: the tests intentionally retain successful chat reactivation/retarget
and unchanged native profile/role state as residual risks. The separate PR #39
self-shift candidate composes only in the tested explicit order: endpoint install,
companion install, companion recovery, endpoint recovery. Its three extra BEFORE
attachments make endpoint recovery refuse until companion recovery completes.
Toggle/no-op checks require one returned target ID and the requested stored shift
value, unchanged legacy native identity and unchanged `left` chat membership;
no zero-row response can pass those positives. No automatic ordering with the
separate roles/profile ACL candidates is established.

## Next dependency, migration and release state

Migration impact: none. Production calls/mutations/deployment: none. Preserve all
three applied legacy restrictions without replay. Baseline/replay/schema/data/
ACL/attachment/parity/release flags stay false; global source composition remains
404/423 matched with 19 unclassified and the approved helper-envelope facts separate.

Next recover narrow current metadata and compose the unchanged ownership-claim/
transfer guard/audit chain before trusting `businesses.owner_id` for native owner
positives. Local audit found the non-transfer claim UPDATE guarded by
`owner_id IS NULL` has no affected-row check before marking the claim approved
(`20260619183732_375472c8-9c6b-4392-85c3-021a02d51140.sql:16–33`). Transfer audit
actor is NULL and manual reviewer stamping occurs later in a separate unchecked
request (`src/lib/business-claims.functions.ts:112–122`). Its
original service-only source grant is not proof of today's ACL: an August skip-
revocation list does not itself GRANT authenticated execution. A separate browser
ownership transfer currently has error-only success and no prior-owner comparison
or returned-row confirmation (`src/components/admin/transfer-business-owner-dialog.tsx:82–96`).
None is repaired or made production-safe here.

Trusted business-team classification/reentry, owner/delegation/invitation/multi-
roster decisions, original-actor shift/audit writers, other native/bootstrap/
ownership writers and valid atomic offboarding remain open. Source owners are not
trusted merely because their latest value is non-NULL. Independent sessions,
real API/role freshness, full database/private-storage restore, consent/tenure,
receipt OCR/mobile/owner pilot and full-media hosting remain separate release
gates. The existing heartbeat stays active, without a duplicate automation or
premature live approval request.

Supabase/Postgres safety guidance kept this deny-only experiment offline and
separated EXECUTE/RLS, automatic definer triggers and original-human authority.
Primary semantics: [PostgreSQL trigger execution and transaction rules](https://www.postgresql.org/docs/18/trigger-definition.html),
[PostgreSQL execution identities](https://www.postgresql.org/docs/18/functions-info.html),
[PostgreSQL temporary-type search-path rules](https://www.postgresql.org/docs/18/runtime-config-client.html),
[Supabase RLS and unauthenticated subjects](https://supabase.com/docs/guides/database/postgres/row-level-security).
The current changelog's [November 10 HTTP TLS cipher deprecation](https://supabase.com/changelog/cbc-tls-ciphers-deprecated)
remains a future transport gate, not a reason to mutate this memory-only SQL experiment.

## Verification and LF artifact pins

19/19 final focused tests pass (24.359s), no failures/skips/cancellations. Syntax,
ESLint, formatting/diff and independent module/test/document review pass. Review
also added explicit returned-target/stored-shift assertions and the trusted-path
regression; original SQL/constraints were not modified to make controls pass.
Final full tooling passes in consecutive serial commands: 365/365 scripts/ci
(296.829s) and 10/10 receipt OCR/PDF asset tests, 375 aggregate with no failures/
skips/cancellations. This is not one combined command or fresh application/
production acceptance.
CI has a dedicated never-quarantined memory-only step. Code-head CI
`38675228250` is pending at initial publication; hosting
`fc69c404-608a-4572-b6ed-4d719328ba50` failed separately and wrapper
`38675228305` skipped migrations/production deployment. The later documentation
head requires its own next-resume check. Application source remains unchanged at
the PR #38 986-test verified parent, not newly verified production behavior.

| Artifact                                            | UTF-8 LF bytes | SHA-256                                                            |
| --------------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| `scripts/ci/native-staff-sync-containment.mjs`      |          10763 | `1b262fc1ec1b544eeedc5be26602173723f568345936da34b04eefb0efe33701` |
| `scripts/ci/native-staff-sync-containment.test.mjs` |          23637 | `bd8da12483a5ab8fc39708968219eeafc9304947695eb743ddb1382352c72ba8` |
| `installSql`                                        |          11962 | `48c1093c4d73e9de8b384e35e755a1651fd4f58eaadebec11076073e6a655891` |
| `recoverSql`                                        |          11865 | `9d938e1130eed04cfbf50d1b132238793875f80b776598ba5a71988273578368` |
| `candidateDefinition`                               |           4033 | `0f8c44292333445837b4a988b649c6c61751570128e1fbf0ee58c3c7fff7c5e1` |
| `originalDefinition`                                |           3940 | `73562fb19efda957ba6fd0574797a70ecf1b8281ed6cde15020d0622210c45d5` |

Passing tests do not adopt this candidate or complete 365.
