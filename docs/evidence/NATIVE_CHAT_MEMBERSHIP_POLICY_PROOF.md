# Native chat membership: selected current policies and offline proof

2026-10-15 Asia/Manila. This slice continues PR #35's conservative dependency
inventory. It does not implement a membership guard, change historical SQL or
claim a live vulnerability incident, mitigation or completed native authority.
Branch `security/native-chat-membership-composition`, stacked on PR #35 docs
`d7fb4cc`; all six parent CI gates passed (run `38651770280`), verified here.

Draft PR #36: `https://github.com/Hunting-Fishing/motorsales365/pull/36`, code
`a5e141d`. Full sequential tooling 241/241 (141.65s), focused lint/format/diff and
independent source review pass. Documentation head `2844477` passed all six CI
gates (run `38654334163`), verified on the writer follow-up. This is not a
merged/released application phase.

## Narrow current observation

Two independently reviewed catalog-only SELECT files ran once each against the
existing project. No application rows/counts, helper/RPC invocation, DDL, grants,
permission/history/data/platform mutation or deployment occurred. The queries
do not enforce READ ONLY transactions or timeouts, and their observations are
not a shared snapshot. Output was reviewed before saving: schema/role names and
ordinary default/constraint/index/policy expressions only; no individual record
IDs, secrets, function bodies or trigger arguments.

At `2026-10-14 23:14:53.057469` UTC, two exact membership helpers and two public
chat relations were observed:

- `is_thread_member(uuid,uuid)` and `is_active_thread_member(uuid,uuid)` remain
  postgres-owned SQL/STABLE/SECURITY DEFINER with search_path public. Their LF
  body MD5s match retained source. Both retain PUBLIC and effective anon,
  authenticated and service EXECUTE, unlike the separately inspected staff
  trigger helpers. This is an execution privilege, not proof of hosted API/RPC
  exposure or permission to invoke them in production.
- Both relations enable RLS without FORCE and retain three permissive policies
  each, all addressed to authenticated: SELECT, INSERT and UPDATE; no DELETE
  policy. There are no observed noninternal triggers on these two relations.
  Selected columns/defaults/column ACLs, validated constraints, indexes and table
  ACLs were captured. These are dated metadata, not full role/schema/default
  privilege closure or current business-data integrity.
- `is_thread_member` admits active or invited members; the active helper admits
  active only. The own-membership UPDATE uses/checks user_id=auth.uid() without
  immutable identity or transition checks. SELECT may additionally apply when
  the UPDATE reads columns or returns rows. Test the actual command shape rather
  than inferring that every UPDATE is protected by SELECT or by its own WHERE.
  See [PostgreSQL CREATE POLICY](https://www.postgresql.org/docs/18/sql-createpolicy.html).

At `2026-10-14 23:14:53.668961` UTC, six incoming/operational relations, eleven
attached functions and eleven noninternal attachments were observed. The exact
retained source/body matches, two absent pending guards, current indexes and
excluded notification/commission/signup dependencies are recorded separately in
`NATIVE_INCOMING_ATTACHMENT_INVENTORY.md`. No email, commission or business
operation ran. Trigger-returning function EXECUTE is not normal invocation or
proof of an external endpoint. Source boundaries remain explicit.

## Immutable review artifacts

LF SHA-256 means UTF-8 with CRLF-to-LF normalization only, without trimming.

| File                                                | Bytes | SHA-256                                                          |
| --------------------------------------------------- | ----: | ---------------------------------------------------------------- |
| native-chat-security-catalog-review.sql             |  4269 | 2029a48ab7e540dbf10e2d8d2d54e2d0d6573f9c068ec0ced476296cccb8d441 |
| native-chat-security-catalog-2026-10-15.json        |  9231 | 5ca3902814a8a607d04d67b5ae250768a4717338fa73f508504e621303065911 |
| native-incoming-attachments-catalog-review.sql      |  3660 | a5201e6c9376d2a2407b9afe08618d8a97a4534ea823c516b2d6948ebb779611 |
| native-incoming-attachments-catalog-2026-10-15.json | 21280 | 37dc6a12548b43b992c12c41c1b4a0f558ac02188870469fd8dc82c0b5dc4c30 |

`scripts/ci/native-catalog-review.test.mjs` adds five offline tests protecting
these exact reviewed bytes, canonical identity, separate observation times,
bounded relation/function/attachment sets, helper EXECUTE versus policy roles,
and three selected rendered unique indexes. The incoming audit's twelve whole
source, eleven function/body and eleven attachment-section pins are also checked
against retained source; function identities/body hashes and trigger-name sets
compare to saved metadata, not complete trigger semantics/rendered definitions.
Its static checks are not a SQL
parser, general safety sandbox, authorization or live-parity proof. Independent
review found no blocker. It never remotely executes the review SQL.
The static test file is LF SHA-256
`58ef1b1c05503ccc350256058c297a3032605241622c9553e66eeda7d18bd158`,
9954 bytes. Full sequential command:

`node --test --test-concurrency=1 scripts/ci/*.test.mjs scripts/vehicle-receipts/verify-ocr-assets.test.mjs scripts/vehicle-receipts/verify-pdf-assets.test.mjs`

## Selected unchanged source and disposable outcomes

`scripts/ci/native-chat-membership-policy.test.mjs` pins two whole sources and
eleven complete selected sections: original chat table DDL/grants/RLS (3–25),
member index (44), two helpers (47–65) and six policies (68–95) from
`20260711073331_3314948d-c196-44ff-b656-7be383f5d16b.sql` (LF SHA-256
`67bba50f869ebbd00edab5de5d7913e91112073b7f7a1c75475bb4125414dac4`);
business_id/kind columns and selected indexes (3–10) from
`20260713071921_8c790938-2bb4-420b-b1df-3261d4bed855.sql` (LF SHA-256
`2231cdf09ee79ed8a8e0d93ef55176c2e32f245494f55c93dba5e5cbe4a171d7`).
Whole/section pin drift, missing or duplicate extraction fails closed.

Sixteen focused sequential always-closed tests pass (14.724s), with own-file
lint/format and independent read-only review clean. Test file LF SHA-256
`4e724caccaf70c1a998c2faea034a46168a1c165e07f46179f518b1d2da3e42c`,
35231 bytes. Five separate static artifact/source-map tests pass; the CI unit
job adds a dedicated never-quarantined gate for both files.

| Selected synthetic command/control                                | Verified outcome                                                                                                                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Active/invited versus left/stranger/null/anon SELECT              | Active/invited see the thread and all its member rows, including other left members; remaining actors see no rows.                                                             |
| Anon/authenticated nominated-user helper calls                    | Both can obtain active/invited/left/absent booleans under the reproduced EXECUTE privileges even when their table reads return no rows. No production helper ran.              |
| Left self UPDATE with WHERE, RHS column read or RETURNING         | Zero affected rows and unchanged state.                                                                                                                                        |
| Left self constant UPDATE with no WHERE/RETURNING/RHS column read | One row becomes active, returned rows remain empty, subsequent thread SELECT succeeds. Returned-array length is not mutation confirmation.                                     |
| Constant thread_id retarget without column reads/RETURNING        | One own membership moves into an existing unseen thread with an empty destination key; subsequent SELECT sees that thread.                                                     |
| Same physically valid retarget with WHERE and/or RETURNING        | Each of three reset shapes raises42501 and explicitly rolls back all selected state. A valid different user_id target likewise fails self WITH CHECK.                          |
| Active/invited self status→left, with/without RETURNING           | All four reset fixtures persist left; RETURNING can show the left row, but next-statement thread/member SELECTs are hidden. This is not concurrent revocation proof.           |
| Direct invitation paths                                           | Active noncreator and invited creator succeed; invited noncreator and creator without membership fail42501. Policies and definer RPCs are not assumed equivalent.              |
| New-thread creation/creator updates                               | INSERT without RETURNING succeeds without auto-membership and stays hidden; INSERT RETURNING fails42501. Scoped creator UPDATE affects zero versus constant title UPDATE one.  |
| New invitation versus existing-left upsert                        | New target succeeds; another user's existing-left ON CONFLICT UPDATE fails42501, DO NOTHING changes zero. Business ownership alone supplies no selected direct-table recovery. |
| Physical and unrelated-actor negatives                            | Actual status CHECK, auth/thread FKs, membership PK and unique team index fail as expected; other-member UPDATE and DELETE affect zero. Failed commands explicitly roll back.  |

Only raw no-read command shapes have the demonstrated reactivation/retarget
positive; the corresponding filtered/returning negative controls are equally
important. Neither app behavior nor hosted API exposure is inferred. A future
database boundary cannot rely solely on the app always selecting returned rows.
The actual business-owner/no-membership fixture is a direct-policy boundary,
not a claim that all owner recovery RPCs or roster paths are absent.

The actual DDL/CHECKs/PKs/FKs/indexes/helpers/policies execute unchanged. Minimal
auth.users/auth.uid/public.businesses, session claims and three roles are
explicit synthetic supports. Historical source grants run unchanged first;
additional explicitly fixture-only grants reproduce the two saved broad table
ACLs and selected helper ACLs. This is not evidence that historical source
grants alone produced current permissions. Nonowner/NOBYPASSRLS auth/anon roles
exercise the policies; postgres only stages fixtures and inspects stored state.

Selected owner/RLS/column/default/column-ACL/table-ACL/index/policy/constraint sets,
absence of noninternal chat triggers and both full function fingerprints/config/
ACLs match the dated chat catalog. PG18 NOT NULL constraint representation alone
is excluded after exact attnotnull/default/type/column-ACL comparison. Failure
snapshots include all four fixture relations and selected schema/function/table/
column/default ACLs, roles and attachments; not role inheritance, other schemas,
all incoming FKs, every platform/default privilege or dependency.

PGlite0.5.9 reports PostgreSQL18.6. This memory-only single-session engine is not
hosted PostgREST/JWT, production data/load, real independent-session concurrency,
CI's separate Parts PostgreSQL17, full writer/security closure or recovery proof.
No staff/native bridge, business-created/default-location trigger, chat writer
RPC, messages, notifications, permissive writer stub, backfill, sweep, storage
or realtime path is loaded merely to make this selected proof pass.

## Release and next dependency

Migration impact: none. Deployment: none. The application remains the previously
CI-verified 723-test parent; no app or customer workflow changes here. Historical
replay/adoption, sparse artifact deployment and all baseline/parity/release flags
remain closed/false. The selected inventory is not silently expanded or promoted.
Separate hosting build failure and skipped production migrations/deploy persist;
the successful preview wrapper is not an upload.

After verifying this proof and publishing its reviewable evidence, close the
remaining chat definer-writer/entry attachments before treating membership as
trusted authority. `NATIVE_CHAT_WRITER_REHEARSAL_PLAN.md` records the six exact
source entry points, real message/notification side effects and bounded next
catalog/fixture requirements; no production writer is invoked. Then implement/test the offline companion contract for
immutable roster identity/upsert compatibility, self-shift/downstream effects,
actual-owner recovery, explicit delegation/provenance, valid atomic offboarding,
multi-roster scope and original-actor audit/concurrency. No current-user/role-GUC
or helper bypass is adopted. Missing writer/role/dependency evidence remains an
explicit unknown, not a permissive stub or production repair.

Baseline/forward/private-storage recovery, real API/JWT/role/concurrent-session/
load acceptance, consent/ownership-tenure/retention, original OCR recovery and
owner/mobile pilot, trusted entry/invoicing/retail/recruitment and hosting gates
remain open. Pending bootstrap/totals restriction approval is unchanged and must
not be re-asked or inferred from these tests. Supabase security/performance
guidance kept privilege, RLS visibility, command shape, source correspondence
and production acceptance separate.
