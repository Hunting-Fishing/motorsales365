# Bootstrap business-read and admin-audit structure recovery

## Outcome and limits

The actual business-owner read and audit-storage schema frontier needed by signup
is now reproduced without the old reduced business projection. Three complete
current structures are recovered: businesses (**63 columns**), business_types
(**4**) and admin_audit_log (**12**). The fixture extends the unchanged PR #58
seven-table fixture to **ten public tables, 208 columns, 38 critical constraints,
47 indexes and eight union enums**, plus prior exact member-sequence configuration.

This is **structure-only**, not a successful Auth bootstrap, client policy,
business writer, trusted original actor, accepted baseline/history or release.
No application source, migration, production schema/data/privilege or history
changed. Current-catalog businesses DDL is labeled observation-derived, not
original migration source. Business types and audit use selected retained source
statements, without seeds/backfills. No permissive helper replacement is used.

## Two bounded live reads

Exactly two successful READ ONLY diagnostic executions in this heartbeat, project
wjxaajgvddtrxxtocxen, PostgreSQL **17.6**:

1. **08:40:15.535109 UTC**: full fingerprint/metadata preflight, no raw definitions.
2. **08:42:08.249322 UTC**: raw structural pieces behind the preceding reviewed
   metadata hashes AND independent fixed privacy checks.

Both queries use trusted catalog search path, local five-second statement and
one-second lock timeout, and ROLLBACK. Neither reads app/Auth/config rows or counts,
settings/configuration-row values, raw function bodies, sequence state or server
files. Neither invokes an application helper or changes schema/data/ACL/history.
Output was privacy-reviewed before canonical retention.

| Facet                                         | Count |
| --------------------------------------------- | ----: |
| Public relations                              |     3 |
| Complete columns                              |    79 |
| Critical constraints                          |    11 |
| Indexes                                       |    23 |
| Policies                                      |    12 |
| Noninternal attachments                       |    10 |
| Selected/direct-expression function envelopes |    18 |
| Related enum types                            |     3 |
| Gated structural pieces                       |   147 |

All **147** pieces pass, zero denials. Every selected raw default/constraint/index/
policy/trigger definition must match the metadata preflight pin and pass bounded
length, credential/URL/dollar-quote and fixed-literal checks. Hash mismatch,
unknown piece or unknown literal returns NULL. Only structural string constants
from enums/reviewed retained sources are allowed, including the known vanity-slug
regex. A custom-domain token **column name** has no default value; no token,
domain, customer/account, organization, configuration or other row value was read.

All table/column/constraint/index/policy/attachment/function/type facets match
between the two observations. Prior business/audit critical constraint definitions
also match; selected older column type/NOT NULL facets remain unchanged. The old
ownership/intent captures are projections, not promoted to full baselines.
Named function metadata is fingerprint-only; dynamic/transitive helper/source
closure and actual business writer fanouts remain separate.

## Structural facts retained, not endorsed

Businesses has its actual type-slug FK, organization/reviewer delete-SET-NULL FKs,
PK/slug uniqueness and four CHECKs (claim state, video provider, network status
and vanity format). Its partial/functional/source/domain unique indexes remain.
No owner_id Auth FK exists in the observed current schema. The fixture never
adds one or treats a stored owner UUID as trusted identity.

Business types retains the actual four-column CREATE and slug PK. No dictionary
configuration seed is replayed or read live. Genuine missing-type FK failures
remain visible.

Admin audit retains all twelve actual columns and **only its PK constraint**.
actor_id and action remain NOT NULL; target_user_id/field remain nullable after
the retained widening statements. There is no Auth FK for its actor/target and
no audit-table trigger attachment in this snapshot. All five non-PK audit indexes
remain. Rolled-back lab probes show storage can hold actor/owner UUIDs without
matching Auth rows; that is **not accepted authority or audit attribution**.

All ten observed trigger attachments are on businesses, not business_types or
admin_audit_log. They include team creation, intent, timestamp, internal-staff
block, domain enforcement, owner guard, three notification paths and partner
bounty. They are retained as metadata/definition evidence but deliberately **not
installed** in this structure-only bundle. Business INSERT/owner/status/domain
behavior and downstream tables/writers are not accepted by empty-table parity.

Current broad ACL/RLS metadata is reproduced, not an endorsement. Policies are
reviewed definitions but deliberately not installed. Effective MAINTAIN is not
queried; raw ACL retains it. No new public grant, client JWT/API proof, owner/
service success or isolation/privacy acceptance is inferred.

## Disposable source construction and invariants

The unchanged PR #58 fixture/captures and PR #57 org/tier source remain pinned.
Actual retained statements are narrowly selected from:

- 20260512054457_90aac1ba-c3f0-48ff-a9b4-06739ddd2108.sql:
  business_types CREATE only, no historical dictionary seed.
- 20260513133043_5dfec6a3-6eca-4a03-8ee7-681496b8458c.sql:
  complete audit CREATE and three indexes.
- 20260619174416_890280d2-2b87-48e6-ac17-839a5b02fe50.sql:
  audit entity/metadata column additions, two DROP NOT NULL statements and two
  indexes. No module settings/seed rows or other file statements execute.

Whole-file LF hashes, unique bounded selectors, selected statement hashes/line
origins and exact current-catalog parity are retained. Businesses CREATE is
generated only from the pinned reviewed current pieces with strict identifiers/
types and all genuine named constraints. This closes the current structural
read/storage support frontier, **not original businesses migration provenance**.

All new table columns/defaults/NOT NULL/ACLs, PK/UNIQUE/CHECK/FK/validation/deferral/
references/actions, indexes, declared table owner/ACL/RLS and enums match exactly.
Only PG18 NOT NULL catalog constraints are normalized after verifying each is
validated, single-column and backed by actual attnotnull. No genuine constraint
is dropped or suppressed. The unmodified parent invariant separately verifies
the core/org/tier/sequence facets before and after the new callback.

No policies, helper functions or trigger attachments are installed. All ten
declared public tables and synthetic auth.users(id PK) remain empty outside
rolled-back diagnostic probes. Checked structural drift and persistent declared
table rows fail the invariant. Synthetic Auth storage is an FK target, not the
provider Auth schema or an adopted actor. Separate observations compose offline;
this is not one atomic production snapshot.

## Validation and immutable artifacts

Sixteen focused contracts pass (**8.220 seconds**): both read-only/static scope
guards and empty-catalog settings restoration, all 147 metadata pins, changed
safe default denial, independent privacy denial despite local hash substitution,
unknown-default helper with no execution, all four canonical artifact pins,
full cross-observation metadata, prior constraints/selected column types, actual
bounded retained source selection without seeds, ten-table structure parity,
persistent data/critical-FK removal rejection, real FK/CHECK/NOT NULL failures
and orphan owner/audit UUID storage without trusted identity adoption.

A dedicated never-quarantined serial CI step runs these tests. No timeouts,
genuine constraints, tests or quarantine were weakened. Syntax, ESLint zero
warnings, source/CI formatting and diff checks pass. Canonical evidence JSON is
verified without formatting it. Full serial tooling **538/538** passes (405.165
seconds), followed separately by receipt assets **10/10** (0.506 seconds):
**548** aggregate, zero failures/skips/cancellations. No fresh full application run is claimed:
PR #54's 1,207 tests/59 files and TypeScript remain parent application evidence,
not a bootstrap or production acceptance result. Primary review only; the
previously recorded independent-agent quota condition was not repeatedly retried.

| Artifact                                                     | UTF-8 LF bytes | SHA256                                                           |
| ------------------------------------------------------------ | -------------: | ---------------------------------------------------------------- |
| scripts/ci/bootstrap-business-catalog-review.sql             |          9,833 | ad47d258070ffab5ad87a25fb4ef2d124817ddc51b86ed0ec38e58426d674c25 |
| docs/evidence/bootstrap-business-catalog-2026-10-15.json     |         60,005 | 6a569e142c64f8da81b2afbb3d48bfad87c1b9db21cee03259db961b7c41169a |
| scripts/ci/bootstrap-business-structure-review.sql           |         23,305 | 79349e4596c9ed73f438c9246fcb03454b089a37d253d0749585b9689e9684c2 |
| docs/evidence/bootstrap-business-structure-2026-10-15.json   |        101,981 | dd826ce1edf75376bd75d4bfcf859e8a7300655c34445a01a0cca13ec43458e8 |
| scripts/ci/fixtures/bootstrap-business-structure-fixture.mjs |          9,224 | 69087d87fdd7e0a2076360945b2d9422207ab2c89b606307c8748d0e6b236fec |
| scripts/ci/bootstrap-business-structure-review.test.mjs      |         15,939 | 28876343ca6fb39b6549153294f7361d753cd575c683c3c177c3ed465d5810f2 |

PR #58 documentation head **018fd26** passed all six CI gates
(**38706843133**), verified here. Hosting
da136074-79ba-4d3b-88e7-272b67d1bd26 failed separately; wrapper 38706843108
skipped migrations/production deployment. This slice still needs its own
latest-head CI verification. Passing a build or preview wrapper is not a release.

Supabase safety guidance kept live work read-only and schema/row probes in
discarded memory databases, preserving the distinction between structural parity,
RLS/ACLs and trusted application authority. Current [Auth/user-data guidance](https://supabase.com/docs/guides/auth/managing-user-data),
[TLS](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) and
[PG17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
breaking-change pages were checked; no upgrade, reindex,
encrypted-row scan or Auth configuration change ran.

## Exact next dependency

Implement a separate **actual ordinary no-referral Auth bootstrap behavioral
fixture**, using these full ten-table structures and the already pinned
auth/bootstrap source correspondence/three current org definitions. Do not
repeat the completed full core/org/tier/business/audit recovery.

Retain actual Auth→profile BEFORE/AFTER→org/membership→subscription/intent/audit
functions/headers/attachments and all critical constraints. Synthetic provider
Auth support and tier/plan/configuration rows must be explicitly labeled, never
treated as observed production configuration or authority. Keep actual
derive_signup_intent business-owner read and seven-argument recompute audit
writes/failure swallowing; do not stub them or use the old reduced business
projection. Account for actual staff_referrals rowtype even when no referral
code returns early, and the canonical admin initializer called before the
ordinary/nonstaff manager return. Reuse current sources/metadata, not guessed
function bodies or the old incompatible has_role body.

Test ordinary no-referral branches with absent/present prerequisite tier/plan
configuration, full atomic rollback on genuine late failures and exact state
effects. Member sequence allocation/rollback/concurrency proof must remain
bounded and explicit; a disposable sequence is not live sequence parity.
No-referral early return does not close nonempty referral bounty/assignment,
staff-domain/role/partner or incoming/offboarding writer frontiers. Business
INSERT/status/domain/team/bounty fanouts remain outside ordinary bootstrap
unless actually reached and fully composed.

Known trial ANY logic, staff seller NULL/enum mismatch, original org/member/
org-role history, trusted actor/revisions/common writer locks/offboarding/native/
consent/private-history/recovery/receipt/mobile/owner/full-media/hosting gates
remain open. Source classification remains **404/423**, nineteen unclassified;
baseline/history-replay/parity/release flags stay false.

Preserve the three approved helper restrictions without replay; quote conversion
is outside those approvals. Zero migrations, production mutations/deployment,
paid resources, customer communications, data deletion or PR merge. No sparse
checkout deployment or duplicate automation. Existing single continuation active;
365 is not release-ready or complete.

## Published checkpoint

Draft [PR #59](https://github.com/Hunting-Fishing/motorsales365/pull/59), code
`ed256f59b7dbf23df53522babe8ee28ad4323634`, branch
`security/bootstrap-business-structure`, stacked on PR #58 docs `018fd26`.
Sixteen focused and 548 tooling/asset tests pass; syntax/lint/format/canonical
JSON/diff/primary review pass. PR #58 latest documentation head passed all six
CI gates (`38706843133`); this new PR requires its own latest-head verification.
Migration impact **zero**, production mutation **none**, deployment **none**.
Exactly two catalog-only diagnostics, no rows/helper calls/history adoption.

Exact next action: actual ordinary no-referral Auth bootstrap behavior using the
full ten-table structure, actual selected source/functions/attachments and explicit
synthetic Auth/configuration prerequisites, plus real late-failure rollback tests.
Do not repeat the completed business/audit/core/org/tier or three-function recovery,
strip real constraints, silently replace helpers or treat orphan UUID storage as
trusted actor proof. All documented writer/authority/privacy/recovery/release gates
remain open. Existing single recurring continuation stays active.

Initial code CI `38709099865` has lint/Parts/OCR passed, build/unit/type pending.
Hosting `631b96f0-15e1-44ee-a9ee-f2e8dd718298` failed separately; wrapper
`38709100327` skipped migrations/production deployment. Verify the later
documentation HEAD separately; this code snapshot and parent green checks are not
its acceptance evidence.
