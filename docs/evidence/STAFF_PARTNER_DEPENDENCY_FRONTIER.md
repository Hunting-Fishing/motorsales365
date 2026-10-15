# Staff partner dependency frontier

Updated: 2026-10-15 (Asia/Manila).

## New catalog evidence, not completed provisioning

The independently reviewed fingerprint-only query
`scripts/ci/staff-partner-catalog-review.sql` extends PR #50's unchanged catalog
projection to the partner application/partner/user-referral relations and their
attachments. Disposable PostgreSQL 18.6 syntax preflight and six offline contract
tests pass. Two successful catalog-only READ ONLY executions occurred: the first
at `06:16:44.329309` UTC was displayed but not retained as a complete artifact;
the second at `06:17:10.912953` UTC was parsed, privacy-reviewed and saved. Both
used project `wjxaajgvddtrxxtocxen`, 5-second statement/1-second lock timeouts,
trusted `pg_catalog,pg_temp` path and ROLLBACK. No application/auth rows, counts,
helper calls, schema/role/data/history changes or deployment occurred.

The retained PostgreSQL 17.6 observation has nine tables, 117 selected columns,
28 critical constraints, 28 indexes, 27 policies, 16 noninternal attachments,
25 functions and three enums. These are metadata counts. All eight metadata
facets of the immutable PR #50 capture reproduce exactly as subsets; this does
not make two dated snapshots a permanent authority or applied-history proof.
Raw bodies/defaults/config values/SQL expressions are omitted. Effective
MAINTAIN is not evaluated; raw ACL `m` remains recorded. Raw trigger-tree hashes
are not portable expression evidence.

| Immutable artifact                                    | LF bytes | SHA256                                                             |
| ----------------------------------------------------- | -------: | ------------------------------------------------------------------ |
| `scripts/ci/staff-partner-catalog-review.sql`         |   10,296 | `cbd77aca937487d1e514ac66999bf110787596594c73b5eb013c18d80b76044a` |
| `docs/evidence/staff-partner-catalog-2026-10-15.json` |  101,373 | `6851d471d2d5293c6db8a95d89caa5f65335783b5183ce4edb943dad964825f4` |

## Actual frontier

Partner applications have 33 columns and four constraints; partners have 17
columns and four constraints; user referrals have seven columns and four
constraints. Partner `user_id`/`application_id` remain nullable, with no unique
user binding. This is observation, not approval of applicant identity, terms,
payout, shop-manager access or anonymous/authenticated write policy behavior.

Partner application UPDATE and partner UPDATE use actual
`update_updated_at_column()`. Partner INSERT/targeted UPDATE/DELETE uses
`trg_partners_recompute_intent()`, which reads user referrals before invoking the
seven-argument intent helper for matching referred users. User-referral INSERT/
targeted UPDATE has **two more actual attachments**: signup bounty and automatic
sales-rep assignment. Merely capturing their function fingerprints does not close
their transitive dependencies, financial effects, assignments or consent.

The accreditation body remains July's `93f21bd4e7112ea9e8c5257267f9da69`, not the
later retained September rewrite. Both intent overloads remain present. Neither
these functions nor any of the new partner/referral effects executes in the new
catalog tests. PR #50's genuine nonstaff-domain fixture remains byte-unchanged;
its intentionally missing-partner boundary is not retroactively a full staff-
domain proof.

## Exact next construction

Build a NEW disposable wrapper around the pinned PR #50 fixture, without editing
its bytes. Select the actual July 1 partner DDL, July 28 column additions and
current policies/indexes/constraints, actual timestamp functions/attachments and
partner intent wrapper. Retain actual empty user-referrals table/read support;
the empty SELECT loop is a genuine bounded branch, not a permissive no-op stub.
Do not claim nonempty-referral coverage. That later branch must compose actual
intent/profile/admin-audit effects plus the two user-referral writer fanouts and
their critical constraints before adoption. No full historical migration replay.

The separate auth bootstrap source investigation found normally reachable org,
founding subscription and member-number dependencies even for ordinary signup.
The internal-manager helper initializer also runs before its nonstaff early
return; it cannot be stubbed away. Organization/member creation source and their
attachments still need mapping. Predictions about trial predicates or staff
intent overwrites are not new current-body/live-behavior evidence and require a
separate fingerprint match and disposable composition before repair.

All three subagents hit an account usage limit after their bounded source/query
findings; they were not repeatedly retried, credits were not purchased, and
partial API edits were preserved and completed/tested by the primary agent in a
separate application slice. No full partner behavioral fixture is claimed here.

Provider changelog review also identifies release checks for the future
[HTTP TLS cipher change](https://supabase.com/changelog/cbc-tls-ciphers-deprecated)
and [PostgreSQL 17.11 upgrade considerations](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).
No upgrade, reindexing, encrypted-row scan or production change was performed.
Baseline/replay/parity/release flags remain false. Full regression/publication
evidence follows after validation.

## Publication and regression checkpoint

Draft PR #52, code `e4e099df191e7a6f74fe49dc386dcbfdac9a1ac9`, branch
`security/signup-partner-provenance`, stacked on PR #51 docs `681e36c`.
Six focused catalog contracts pass (1.181 seconds). Full serial CI-tooling
446/446 pass (347.324 seconds), followed by separate receipt assets 10/10
(0.396 seconds): 456 total, no failures/skips/cancellations. Syntax, lint,
format/diff and the independent pre-execution query review pass. No application
source change is included; the separate API receipt patch is being validated
independently. Parent PR #51's 1,154-test result is parent evidence, not new
partner-behavior evidence. No privilege/constraint/function was altered live.

PR #50 docs `3c153c5` and PR #51 docs `681e36c` now passed all six CI gates
(`38687811205`, `38688332298`). PR #52 code CI `38692637701` is running;
hosting `b4ba08d8-9a2e-4d5f-b5a2-672c8f42a905` failed separately and wrapper
`38692637642` skipped migrations/production deployment. Later docs heads require
fresh verification. Next construct the bounded empty-referrals partner wrapper
described above, recover/match organization/bootstrap source and actual critical
metadata, then compose nonempty referrals and incoming/offboarding/original-
actor dependencies. Do not repeat completed catalog recovery or the three
approved EXECUTE restrictions. Same-chat continuation remains active.
