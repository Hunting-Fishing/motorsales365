# Platform-role forward composition evidence

Updated: 2026-10-15 (Asia/Manila).

## Scope and observation

This is a bounded dependency proof for platform `public.user_roles`, **not** the
native Shop Manager role catalogs, accepted platform-role authority, or release
approval. The separately approved production converter/bootstrap/totals EXECUTE
restrictions are preserved without replay. No production role, schema, history or
application-data mutation is part of this slice.

The independently reviewed `scripts/ci/platform-role-catalog-review.sql` was
executed once against project `wjxaajgvddtrxxtocxen` in a READ ONLY transaction
with 5-second statement/1-second lock timeouts, trusted `pg_catalog,pg_temp` path
and ROLLBACK. Its syntax was first exercised in disposable PGlite PostgreSQL
18.6; that is not hosted PostgreSQL 17.6 parity. No application helpers, rows or
application counts were read. The JSON output was inspected before saving.

Observation `platform-role-catalog-2026-10-15.json` is dated
`2026-10-15T05:15:07.018072` UTC, PostgreSQL 17.6. It records six selected
relations, 60 selected columns (including two auth-user and six profile support
columns), 16 constraints, 17 indexes, 15 policies, 11 noninternal attachments,
18 helper/attached functions and three enums. These are metadata counts, not
customer/business counts. Missing `request_jwt_role()` is a bounded family
observation, not a claim that no other role helper exists.

Only structural metadata and fingerprints were returned: no unreviewed function
bodies, argument defaults, configuration values or SQL expressions. Raw trigger
tree hashes are not portable expression evidence. Effective SELECT/INSERT/
UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER are recorded; effective MAINTAIN is
not evaluated (the raw ACL still records `m`). This is not a generic privacy
redactor or complete dependency inventory.

| Immutable artifact                                    | LF bytes | SHA256 of LF bytes                                                 |
| ----------------------------------------------------- | -------: | ------------------------------------------------------------------ |
| `scripts/ci/platform-role-catalog-review.sql`         |    9,977 | `c8163fdf9419afbe6bf27157cd53f366b42731f575a2fb78478962ae4a5690a0` |
| `docs/evidence/platform-role-catalog-2026-10-15.json` |   61,446 | `78586245e5426261006a7381724c68315a4dd11b5729b0635a26aad4b953fcda` |

## What this resolves and does not resolve

The fresh `accredit_staff_partner(uuid)` body fingerprint is
`93f21bd4e7112ea9e8c5257267f9da69`, matching retained July source rather than
September's `350b4c4c4f6e365c196737c0ca014295`. Its current owner/service EXECUTE
ACL is not September's source ACL. Filename order does not establish what was
applied. Do not replay or adopt the September file on this evidence.

The latest observed `handle_new_user()` body matches retained July 7 source
(`9bb9dde968ced3998403b7c78330d836`). The two observed `auth.users` attachments
cover creation and staff-email-confirmation accreditation through their respective
functions. Static mapping also finds
the internal-domain and canonical-organization helpers. This identifies, but
does not execute or close, signup/profile/organization INSERT dependencies.
The current bootstrap body does not itself insert a default public user role;
other profile attachments and incoming writers still need separate review.

Platform roles have nine actual enum labels and three policies. The selected
staff referral relation has two current policies, not its original three;
`sales_rep_subject` includes the later `supplier` label. The fixture must select
these observed deltas explicitly rather than replay whole historical migrations.

Raw `ALL` grants and permissive policy composition are different questions.
RLS command denials cannot prove non-row privilege containment. Existing
administrator/service behavior is characterization, not accepted human authority.
GUC-based identities in memory do not establish trusted original-actor custody.

## Completed bounded rehearsal

The memory-only fixture selects 18 pinned whole source files and exact retained
function/DDL/policy/trigger statements. Six full selected tables, all 15 policies,
16 critical constraints, 17 indexes, 13 unchanged helper bodies and nine forward
attachments reproduce the dated catalog, including function headers/config
fingerprints/raw ACLs and actual enums. The only catalog comparison exclusions
are backed PostgreSQL 18 NOT NULL constraint entries (validated against actual
NOT NULL columns) and physical positions of the eight synthetic support columns.
The other five observed helper families/two auth attachments are not loaded.

Positive accreditation stops at the genuine nonstaff-domain early return.
Auth-user/profile supports are projected synthetic prerequisites, seeded before
role attachments; the real auth bootstrap does not execute. No partner tables or
permissive partner/auth stubs are provided. A staff-domain control reaches the
actual missing partner relation (`42P01`) and rolls back, marking the boundary,
not a claim that production staff accreditation fails that way.

The 25 focused groups pass (26.173 seconds), plus seven separate catalog-contract
tests (1.082 seconds). Ordinary own-role SELECT is distinguished from hidden
other roles, INSERT `42501`, and zero-affected UPDATE/DELETE. Moderator lookup
does not imply the admin ALL policy. Plain sales visibility requires actual
active user assignments; business/supplier, wrong rep/subject, inactive and the
junior/senior/manager-only labels do not substitute for plain sales. Existing
synthetic admin/service controls characterize source behavior, not new authority.

Real staff/referral/sales/territory/audit effects, nullable service audit actors,
preexisting referral user/email links, absent profile/email and case-distinct
email bindings are exercised. Role UPDATE to sales is confirmed to affect one
actual row without provisioning. DELETE is also confirmed to affect one role
row while derived records remain stale. Neither behavior is repaired or adopted;
full offboarding and the separate own-rep policies remain review dependencies.
Source SQL TRIM removes spaces but preserves a tab; both outcomes are retained.
Random referral generation/collision fallback is not concurrent uniqueness proof.

Real enum/NOT NULL/FK/UNIQUE/commission CHECK failures remain enforced. Labelled
fault hooks verify earlier genuine territory/referral/audit writes occurred, then
cause actual audit-action NOT NULL (`23502`) or late rep auth FK (`23503`) failure.
Complete selected data/catalog/settings snapshots are restored after rollback;
test-hook precondition failures are distinguished from these real constraint
errors. No source function/constraint is weakened to pass. Non-row grants are
metadata-only assertions, not TRUNCATE/trigger creation or hosted reachability
experiments. Independent source/test review, syntax/lint/format checks pass.

| Added offline executable                                | LF bytes | SHA256 of LF bytes                                                 |
| ------------------------------------------------------- | -------: | ------------------------------------------------------------------ |
| `scripts/ci/fixtures/platform-role-forward-fixture.mjs` |   23,980 | `e2843eaf7c185eb52a21c342a482a1adb894f34ec1f4d8288a32db15b64da512` |
| `scripts/ci/platform-role-forward-composition.test.mjs` |   27,023 | `55438e113952621868b15509e3926dd3a9307426df21df29cca8b082e951464b` |

Full regressions and code/PR identifiers follow below. Next compose the separately
fingerprint-mapped auth/profile/organization INSERT chain and staff-domain partner
chain with actual constraints/attachments, review incoming role writers and
offboarding, and establish trusted original-actor custody. In parallel define
trusted claim-attempt/evidence/ownership-tenure revisions and common competing-
writer lock protocol before wiring an atomic claim kernel. No migration/replay/
baseline/parity/release flags are promoted, and the sparse checkout is not deployed.

## Publication and full regressions

Draft PR #50, code `6136701dc4a6aeb6e00724b4ec21328f3ea273fa`, branch
`security/platform-role-forward-composition`, stacked on PR #49 docs `722f4de`.
Full serial CI-tooling: 440/440 pass (349.896 seconds); consecutive separate
receipt assets: 10/10 pass (0.483 seconds), 450 total without failures, skips or
cancellations. No application source changes are in this code commit. The separate
account-dialog candidate is being validated independently, not counted as part
of this SQL-only change. Parent PR #49's 1,113-test app result remains parent evidence.

Initial code CI `38687514056` is running; hosting
`26ea1452-0928-4058-982f-d7ee9d3654c5` failed separately. Wrapper `38687514137`
skipped migrations/production deployment. Later documentation heads require a
fresh next-resume check. PR #49 docs `722f4de` passed all six gates
(`38684735093`); that does not verify this newer head. Live work was exactly the
one reviewed catalog read described above, not application queries/communication,
DDL/history/data mutation, new resources or deployment. Continuation remains active.
