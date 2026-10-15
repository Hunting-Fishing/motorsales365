# Bootstrap core structure recovery and seven-table rehearsal

## Outcome and boundary

The four remaining current bootstrap core structures are recovered behind
prior-fingerprint and privacy gates: profiles, internal organization settings,
subscription plans and subscriptions. The disposable reproduction composes these
with the unchanged PR #57 organization, membership and tier structures.

This is **structure-only evidence**, not signup, trusted authority, original
migration provenance, an approved baseline or release acceptance. No application
source, migration, production schema/data/privilege or history changed. Current
catalog-derived DDL is explicitly not an original migration. No helper or policy
is replaced by a permissive success stub.

## Read-only recovery

One successful diagnostic executed against project
`wjxaajgvddtrxxtocxen` at **2026-10-15 08:23:01.783433 UTC**, PostgreSQL
**17.6**. The query uses BEGIN READ ONLY, trusted catalog search path, local
five-second statement and one-second lock timeouts, and ROLLBACK. It reads
catalogs only, not app/Auth/config rows or counts. No application helper, sequence
operation, settings/configuration-row read, source-body recovery or mutation ran.

| Captured facet                                | Count |
| --------------------------------------------- | ----: |
| Selected public tables                        |     4 |
| Complete columns                              |    90 |
| Critical PK/UNIQUE/CHECK/FK constraints       |    17 |
| Indexes                                       |    16 |
| Policies                                      |    16 |
| Current noninternal trigger attachments       |    10 |
| Selected/direct-expression function envelopes |    29 |
| Related enums                                 |     5 |
| Gated structural pieces                       |   165 |

All **165** pieces were permitted; none were withheld. Their expected MD5s derive
only from PR #55's already retained catalog. Each raw default, constraint, index,
policy expression or attachment definition also passes bounded-length,
credential/URL/dollar-quote and fixed-literal privacy checks. Hash mismatch,
unknown piece or privacy failure returns NULL, not an arbitrary definition.
Primary privacy review occurred before retaining canonical JSON. Function bodies
remain fingerprint-only. Ordinary names of schema columns are not row values.

Complete table/column/constraint/index/policy facets and selected function/type
fingerprints are unchanged from PR #55. The ten selected attachments are the nine
profile attachments and one subscription timestamp attachment. Auth's two
attachments are **outside this structural query**, not omitted from the future
signup workflow. Prior captures and existing fixtures remain byte-pinned and
unchanged.

The two successful read-only diagnostics in this logical heartbeat are PR #57's
07:59:37.940729 org/member/tier recovery and this 08:23:01.783433 core recovery.
Neither invoked signup or inspected business/customer accounts.

## Preserved structural facts

Profiles has all **58** current columns, including NOT NULL seller_type with
default private, common tier default and genuine member-number sequence default.
Tier, parent organization, manager, intent evaluator and Auth references retain
their actual delete actions. The signup intent/source CHECKs, founding-number and
login-username UNIQUE constraints, and standalone unique member-number/Facebook
indexes remain present. An explicit NULL seller type is not silently repaired;
staff API NULL/enum mismatch remains an open release blocker.

Internal settings has all three columns; its organization FK is **ON DELETE
RESTRICT**. No actual setting value/canonical organization row was read or seeded.

Plans has all eleven columns and its partial unique Stripe lookup-key index.
Subscriptions has all eighteen columns, Auth/plan/organization references, pending
status and sandbox environment defaults. None of this proves a current live plan,
tier, Stripe or billing configuration. Plan data and historical configuration
seeds are not replayed. The known business-trial ANY-logic problem is not changed.

The broad observed table ACLs/RLS metadata are reproduced, not endorsed.
Policies are retained as reviewed definitions but deliberately **not installed**
in the structure fixture. Effective MAINTAIN is not queried; raw ACL retains it.
There is no client-policy, JWT, owner/service API or tenant-isolation acceptance.

## Seven-table disposable fixture

The new fixture imports the unchanged PR #57 source/capture:
actual retained tier CREATE, plus labeled current-catalog org/member DDL.
It constructs the four new tables from pinned pieces and a strict type/identifier
allowlist, preserving all named critical constraints and standalone indexes.

It reproduces **seven public tables, 129 columns, 27 critical constraints,
24 indexes and six union enums**. Table ownership, declared ACL, RLS flags,
column ordinals/types/defaults/NOT NULL/ACLs, constraint validation/deferral/
references/delete actions and index fingerprints match both snapshots exactly.
Only PostgreSQL 18 catalog NOT NULL constraints are normalized, after checking
each is validated, single-column and backed by actual attnotnull. No genuine
FK, CHECK or UNIQUE is dropped or ignored.

The member sequence is reproduced using PR #55's exact **configuration metadata**:
bigint, start/increment/minimum/cache 1, maximum **9223372036854775807** as text,
NO CYCLE, profiles.member_number ownership and observed ACL. Configuration parity
is checked through catalogs only. This slice made no fresh live sequence read and
never queried its live last/current/is_called state or advanced it. It does not
prove concurrency, allocation gaps or live state.

Auth support is explicitly synthetic auth.users(id PK), solely an FK target.
No Auth provider schema, JWT uid helper, auth trigger, policy, application helper
or public trigger attachment is installed. Every public table and synthetic Auth
table must be empty before and after callbacks. Persistent data in these tables or
changes to their checked structural facets fail the invariant. Rolled-back synthetic diagnostic probes use explicit
member numbers; they test genuine constraint failures, **not successful signup**.

These are separate production observations composed offline: PR #55's sequence,
PR #57's org/member/tier and this core snapshot. The bundle is not a single atomic
production baseline, historical replay, application parity or trusted authority.

## Validation and immutable artifacts

Thirteen focused tests pass (**7.106 seconds**): read-only/static scope,
empty-catalog parse/settings restoration, all 165 prior pins, fail-closed changed
safe-literal default, independent privacy denial despite a local hash substitution,
unknown CHECK dependency with no execution, canonical bytes, complete cross-capture
metadata, seven-table/sequence parity, persistent public/Auth-write rejection,
constraint-change rejection and rolled-back seller NOT NULL/tier FK/intent CHECK/
member-number uniqueness probes. CI gets a dedicated never-quarantined serial step.

| Artifact                                                 | UTF-8 LF bytes | SHA256                                                           |
| -------------------------------------------------------- | -------------: | ---------------------------------------------------------------- |
| scripts/ci/bootstrap-core-structure-review.sql           |         25,310 | b16bece8c3307271a1cb3e6c61d681c124dd00aea9888c89b8e5b5cf5fa47b75 |
| docs/evidence/bootstrap-core-structure-2026-10-15.json   |        124,321 | ffc1546bcf876cc302aad0c1f704bbf4195fadeb95f8b303c823d252457bc0db |
| scripts/ci/bootstrap-core-structure-review.test.mjs      |         13,258 | db12da5d7c0d1ca5537f4e8220a896150c5dc76cc7bc7c7a4a40afb3ea3dfb0b |
| scripts/ci/fixtures/bootstrap-core-structure-fixture.mjs |         10,941 | e77f375c58c47ca37e4cf7115823877dea47f9cd8d21aec54073b153eb2a5b62 |

Full serial tooling **522/522** passes (380.738 seconds), followed by separate
receipt assets **10/10** (0.330 seconds): **532** aggregate, no failures/skips/
cancellations. Focused syntax, ESLint (zero warnings), source/CI format,
canonical JSON and diff checks pass. A local CI indentation formatter failure was
corrected and rechecked before publication; no production or CI run was affected.
Primary review only: independent subagent final review remains unavailable from
the previously recorded quota condition, which was not repeatedly retried.

Supabase safety guidance kept live inspection catalog-only and all schema/row
probes in discarded memory databases. No new application run is claimed for
this structure-only slice; PR #54's 1,207 tests/59 files and TypeScript remain
verified parent application evidence, not fresh bootstrap acceptance.

## Exact next dependency

Compose the actual ordinary **no-referral** Auth bootstrap, without another
core/org/tier or three-org-function recovery. Reuse retained source correspondence
and these structural pins. Preserve all real profile BEFORE/AFTER effects,
organization/membership creation, tier/plan/default prerequisites, sequence and
intent/admin-audit behavior. Configuration lab rows must be labeled synthetic,
not inferred from production or silently replayed.

First close actual business-owner read support required by derive_signup_intent
and full admin-audit metadata/source. The prior owner-intent fixture uses reduced
synthetic business support; do not promote it to a full bootstrap baseline or stub
derive/recompute/audit. Local retained business CREATE is in
20260512054457_90aac1ba-c3f0-48ff-a9b4-06739ddd2108.sql; audit CREATE is in
20260513133043_5dfec6a3-6eca-4a03-8ee7-681496b8458c.sql. Review later changes and
bounded current metadata before composing them. Account for staff_referrals rowtype
even on the no-referral early return, the real canonical manager initializer,
audit failure swallowing and all applicable forward attachments. Nonempty
referrals/bounty/assignment/member-tier writers remain separate open frontiers.

Original org/member/org-role provenance, trusted original actor, revisions/common
writer locks, incoming writers/offboarding/native roles, consent/private vehicle
history, recovery, receipt/mobile/owner/full-media/hosting acceptance stay open.
Source classification remains **404/423**, nineteen unclassified; baseline/
history-replay/parity/release flags remain false. Known trial logic and staff
seller NULL/enum mismatch remain uncorrected release blockers.

Preserve all three approved helper restrictions without replay. Quote conversion
is outside those approvals. No migration, production mutation/deploy, paid
resource, customer message, data deletion, PR merge or duplicate automation.
Never deploy the sparse checkout. The existing single recurring continuation
stays active; the project is not complete.

## Published checkpoint

Draft [PR #58](https://github.com/Hunting-Fishing/motorsales365/pull/58), code
`734d3b4852ad89859329d0e2e96ee15308c40ff5`, branch
`security/bootstrap-core-structure`, stacked on PR #57 docs `27b3d70`.
All thirteen focused and 532 tooling/asset tests pass; syntax/lint/format/
canonical JSON/diff/primary review pass. No fresh application run is claimed.
PR #57's latest docs passed all six CI gates (`38704489116`); its separate hosting
build failed and wrapper `38704489366` skipped production/migrations.
PR #58 needs its own latest-head checks; do not promote parent green checks.

Migration impact **zero**, production mutation **none**, deployment **none**.
Exactly one selected core READ ONLY diagnostic executed. Original history,
baseline/parity/authority and release flags stay unchanged. Exact next action is
the business-owner read/admin-audit frontier, then actual ordinary no-referral
bootstrap with real prerequisites and effects. Single continuation stays active.

Initial code CI `38706672417` has all six gates pending. Hosting
`f3b62436-0494-488e-b3a9-3fcd34cee668` failed separately; wrapper `38706672435`
skipped migrations/production deployment. Verify the later documentation HEAD
separately rather than carrying forward this initial snapshot or parent green checks.

Follow-up: PR #58 docs `018fd26` now passed all six CI gates (`38706843133`).
Hosting `da136074-79ba-4d3b-88e7-272b67d1bd26` failed separately; wrapper
`38706843108` skipped migrations and production deployment. The full business-read/
audit structural frontier is now documented in `BOOTSTRAP_BUSINESS_AUDIT_STRUCTURE.md`.
Current core source/capture/fixture pins remain unchanged. No release is inferred.
