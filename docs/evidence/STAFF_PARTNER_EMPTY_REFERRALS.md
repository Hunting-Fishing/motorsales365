# Staff-partner selected forward composition: empty referrals

2026-10-15. MEMORY-ONLY characterization, not migration history, platform
authority adoption, complete provisioning, hosted behavior or release acceptance.

## Scope and provenance

This new wrapper extends the immutable PR #50 fixture; it does not edit or replace
its fixture/test bytes. PR #52's privacy-reviewed catalog at
`2026-10-15T06:17:10.912953` UTC, PostgreSQL 17.6, project
`wjxaajgvddtrxxtocxen`, supplies the dated expected metadata. No additional live
catalog/row/helper query, production mutation or migration was performed here.

`scripts/ci/fixtures/staff-partner-empty-referrals-fixture.mjs` pins ten complete
historical source files, the observation and query. Exact uniquely selected DDL,
policies, indexes, function bodies and attachments are extracted; whole migrations,
historical seeds, backfills, payouts and other unrelated tables are never executed.
The selection manifest records source markers, line bounds, SHA256, bytes and
function body MD5. It retains PR #50's thirteen unchanged functions and adds:

| Function                                 | Source body MD5 (LF)               | Envelope                                                                        |
| ---------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `public.trg_partners_recompute_intent()` | `5df9fb3bd7a12cba1689f4bb9eb983ab` | postgres-owned SECURITY DEFINER, public search path, owner/service EXECUTE only |
| `public.update_updated_at_column()`      | `5b733ab523bad442e4b10f836de9e4ba` | postgres-owned invoker, public search path, owner/service EXECUTE only          |

The older actual July accreditation body remains unchanged, MD5
`93f21bd4e7112ea9e8c5257267f9da69`. No wrapper/helper is replaced with a success
stub, and no constraints or policies are disabled to obtain passing results.

The extended catalog compares nine actual tables, 117 selected columns, 28
critical constraints, 28 indexes, 27 policies, fifteen full function envelopes and
twelve selected trigger attachments. This includes application/partner July 1 DDL,
July 28 column additions, all twelve new dated policies and six explicit indexes
(plus automatically created PK/UNIQUE indexes). All previous six-table facets
are revalidated through PR #50 as well. Exact full function envelopes are keyed by
unique signature, avoiding locale-dependent underscore/parenthesis sort order;
no body/header/security/ACL/argument fields are ignored. Only the previously
documented synthetic auth/profile physical positions and validated, genuinely
backed PostgreSQL 18 NOT NULL catalog entries are normalized. NOT NULL enforcement
and every actual critical constraint remain intact.

## Actual bounded branch and explicit omissions

`public.user_referrals` is the real seven-column table, with its actual PK, UNIQUE,
auth/staff foreign keys, column defaults/NOT NULLs, indexes, grants/RLS and five
dated policies. It stays **empty** before and after every successful test callback.
The actual partner trigger performs its real SELECT and takes a zero-iteration
loop; INSERT, UPDATE OF code/active and DELETE all execute this branch. There is
no permissive `recompute_signup_intent` stub. Both overloads remain absent and
the test verifies that absence.

The two observed user-referral INSERT/UPDATE writer fanouts (signup bounty and
sales assignment), nonempty referral loop, derive/profile/admin-audit effects,
and commission/bounty/payment targets are deliberately excluded, not claimed as
covered. Invalid user-referral FK writes fail and roll back before the omitted
writer paths; no successful user-referral write is adopted or tested as safe.

PR #50's auth users/profiles remain explicitly synthetic read supports. Auth
bootstrap and eight profile INSERT fanouts, organization/member creation,
canonical internal settings, founding subscriptions/member sequence and other
incoming writers are not composed. GUC subjects are synthetic, not verified JWTs,
original human actor evidence, sessions, concurrent requests or offboarding.
Platform `public.user_roles` is not the native Shop Manager role model.

All dated table grants are reproduced, including broad nonrow rights. RLS DML
denial is not a containment finding for TRUNCATE/REFERENCES/TRIGGER/MAINTAIN;
effective MAINTAIN is not present in the source capture. No destructive nonrow
experiment is performed. Synthetic existing admin/service controls demonstrate
unchanged source behavior, not an approved professional authority model.

## Characterized results, not repairs

- Synthetic existing-admin sales-role INSERT executes the real territory/sales,
  referral, audit and staff-domain accreditation chain. An approved internal
  application and active partner share the actual referral code; the partner's
  Shop Manager access remains false. These are lab database results only.
- Null/missing/nonstaff/null-email/no-referral/inactive-referral branches return
  unchanged through the actual helper. Mixed-case staff-domain email qualifies.
  Missing projected profile falls back to the referral name; no profile invented.
- Existing inactive partner rows matching code **or** user reactivate. A code
  owned by another user is not rebound; a same-user different code is not repaired.
  Both matching rows reactivate when those matches are different rows. No UNIQUE
  user/application binding is invented. Already active matches are unchanged and
  skip application repair.
- Existing internal applications are approved with nullable timestamps/notes
  filled or existing ones preserved. Existing names/email/platforms are not
  rewritten. An unrelated-channel application is not selected or approved.
- An unbound case-insensitive existing staff email is bound and accredited through
  the real UPDATE attachment. An already-bound matching email is not stolen and
  does not provision a partner for the newly requested user.
- Direct client accreditation execution is denied even for the synthetic admin;
  ordinary partner INSERT is denied and filtered UPDATE/DELETE affect zero rows.
  Existing synthetic admin/service DML remains a characterization, not adoption.
- Actual application INSERT policies allow anonymous/authenticated synthetic
  callers to submit another user's id and an approved/internal-staff claim. That
  INSERT alone does not provision a partner. This reproduces dated permissive
  policies in memory; it does not assert a newly verified production incident.
- Selected role deletion and staff deactivation do not deactivate the partner or
  remove the sales row. Deactivation audit fires. No offboarding fix is inferred.
- Application status CHECK, user/reviewer foreign keys and NOT NULL; partner
  user/application foreign keys and referral UNIQUE; and user-referral foreign
  keys enforce genuine failures with complete unchanged snapshots.

Two deliberate lab-only DEFAULT faults exercise late genuine constraints: partner
`payout_details` NULL fails with 23502 after upstream work, and a preexisting
partner id collision fails its actual primary key with 23505. No replacement
function, synthetic failure trigger or weakened constraint is used. Complete
snapshots cover all nine selected tables, auth/profile supports, full selected
catalog (including the deliberate fault) and caller settings. Role, sales,
territory, referral, audit and application effects all roll back. Exact defaults
are restored and full initial snapshots match; the actual chain then succeeds.
Preexisting partner rows are preserved. These experiments run only in discarded
PGlite databases and are not live failure injection or distributed atomicity proof.

## Verification and publication

The new test file contains 29 focused contracts, with a dedicated never-quarantined
serial CI step. Early harness failures were corrected without source or
test-policy weakening: function signature sort normalization, ordering tables
without assuming every table has an `id` column, and Date value comparisons.

PR #52 docs `0d925e2` now passed all six CI gates (`38693190311`), and PR #53 docs
`c18cc62` now passed all six (`38693787258`), verified on this follow-up. Separate
hosting checks `b33c6ab6-21cf-4e00-be7c-254268c104e9` and
`e7328bad-556b-4664-b266-928830ef0dad` failed. Both migration/production wrappers
skipped. PR #53's 1,207 application tests are connected application-source evidence,
not deployed or end-to-end account provisioning acceptance.

The primary agent reviewed this wrapper; quota-blocked subagents were not retried,
and no fresh independent final review is claimed. Supabase safety guidance kept
testing disposable and preserves the distinction between execute privileges,
RLS, elevated trigger effects and actual application authority. Current
[function security guidance](https://supabase.com/docs/guides/database/functions)
was checked; provider
[TLS](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) and
[PostgreSQL upgrade](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
release considerations remain recorded, not acted on.

## Exact next action and release gates

Recover the auth/bootstrap frontier with a separately privacy-reviewed bounded
catalog projection: full profiles, organizations/members, internal settings,
subscriptions/plans, member-number sequence, their critical constraints/indexes/
policies/ACLs and attached function metadata. First map source correspondences;
do not fetch bodies/config/data indiscriminately or call helpers. This follow-up's
bounded local SQL search and `git log --all -S` found no original organization/
member CREATE or `tg_org_add_creator_as_owner` definition in retained migration
history. That remains a provenance gap, not permission to reconstruct a stub.
Recover exact retained-source evidence or separately approved selected sanitized
definitions before composing those dependencies. Independently, the nonempty
referral branch needs its actual intent/profile/admin-audit, bounty/commission and
assignment fanouts with genuine critical constraints before adoption.

Then close original-actor custody, trusted claim/evidence/tenure revisions, common
writer locks, incoming/offboarding and native authority before designing/adopting
an atomic provisioning kernel. The staff API NULL/profile enum mismatch remains
open. Preserve approved helper restrictions without replay and keep the separate
quote-conversion bypass outside prior approvals. Migration provenance remains
404/423 matched, nineteen unclassified; baseline/replay/parity/release flags false.
No migration, production deployment, paid resource, customer communication or data
deletion. Sparse checkout must never be deployed. Native/consent/private-history,
scanner/mobile/owner pilot, full public-media and recovery gates remain open.
The existing same-chat continuation stays active without duplicate automations.

## Published checkpoint

Draft [PR #54](https://github.com/Hunting-Fishing/motorsales365/pull/54), code
`e4348cfbe636214601ee0ff6e10a3495b8952e39`, branch
`security/staff-partner-empty-referrals`, stacked on PR #53 docs `c18cc62`.
29/29 focused tests pass (24.106 seconds); full serial CI tooling 475/475 passes
(361.053 seconds), followed by separate receipt assets 10/10 (0.355 seconds):
485 aggregate, with zero failure/skip/cancellation. Syntax, lint (zero warnings),
format/diff and primary source review pass. Fresh full application tests pass:
1,207/1,207 across 59 files (93.25 seconds), no failures/skips/quarantine. Full
TypeScript (`tsc --noEmit -p tsconfig.json`) passes. No test/quarantine/timeout
or genuine constraint was relaxed.

| Artifact                                                        | UTF-8 LF bytes | SHA256                                                             |
| --------------------------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| `scripts/ci/fixtures/staff-partner-empty-referrals-fixture.mjs` |         13,105 | `1d2c94fcf0bae4443dff0f5dbfdb42f767a365e24b57ab6e665daa7d8bbb329a` |
| `scripts/ci/staff-partner-empty-referrals.test.mjs`             |         25,849 | `a843d616c868e2f6adcd38a458cbc94248249d60f7071f809a848e5323141d1c` |

Immutable PR #50 fixture remains 23,980 LF bytes/SHA256
`e2843eaf7c185eb52a21c342a482a1adb894f34ec1f4d8288a32db15b64da512`;
its test remains 27,023 bytes/SHA256
`55438e113952621868b15509e3926dd3a9307426df21df29cca8b082e951464b`.
PR #52 query/capture stay pinned and unchanged. Migration impact: **zero**;
live query/mutation: **none** this slice; deployment: **none**. No PR merged.
Next action and blockers are the auth/org/provenance and nonempty-referral
frontiers described above, not another completed partner/catalog replay.

PR #54 code CI `38696532588` currently has OCR/lint/Parts passed and build/type/
unit pending. Separate hosting `6f0e6469-b986-4938-bbaa-418a361b69ab` failed;
wrapper `38696532720` skipped migrations/production deployment. Later docs HEAD
requires fresh checks; neither the green preview wrapper nor a build is an upload.
