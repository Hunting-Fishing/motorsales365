# Selected organization/member/tier current structure recovery

2026-10-15. Current-catalog reference/reproduction only, **not original migration
source, an approved baseline, signup behavior or authority/release acceptance**.

## Read-only recovery and provenance

One successful bounded READ ONLY execution at **`2026-10-15T07:59:37.940729` UTC**,
project `wjxaajgvddtrxxtocxen`, PostgreSQL **17.6**. Query:
`scripts/ci/org-tier-structure-review.sql`; capture:
`org-tier-structure-2026-10-15.json`. Trusted `pg_catalog,pg_temp`, 5-second
statement/1-second lock timeouts and ROLLBACK. No app/auth/configuration rows or
counts, helper invocation, function bodies, settings/sequence values, mutation,
privilege change, historical seed/backfill execution or deployment.

Exactly three tables are inspected: organizations, organization_members and
member_tiers. Structural text is returned only where a prior expected fingerprint
and bounded privacy checks pass. Organization/member hashes come from unchanged
PR #55 metadata. Tier hashes are derived offline from the actual retained CREATE
and read policy in
`20260615040047_45f630ff-bc04-4acc-abb9-c48a7ebd148d.sql`, whole-file LF SHA256
`c7479d534318d06b6fc9444098215a5719582987f79bc05d98c2591e9735938b`.
Only those uniquely selected statements execute in a discarded empty database;
historical configuration seeds and the rest of that migration never execute.

Seventy-eight expected default/constraint/index/policy/trigger pieces all pass.
Changed or unknown fingerprints return NULL text, as do unexpected literals,
sensitive markers or nested dollar-quoted content. The primary agent reviewed
the query and all returned structural text before retention. The retained text
contains structural identifiers and permitted enum/role/default literals, not
secrets, account identifiers, emails, URLs or customer/configuration-row values.
These guards are not a general secret scanner or authorization for broad dumps.
Quota-blocked subagents were not retried; no fresh independent final review is
claimed. Current definition/source recovery from PR #56 is not repeated.

| Artifact                                           | UTF-8 LF bytes | SHA256                                                             |
| -------------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| `scripts/ci/org-tier-structure-review.sql`         |         18,347 | `fd07f10c8da9824667aeda0615a99ebc6673eed135e80c917dc9a57483fa2701` |
| `docs/evidence/org-tier-structure-2026-10-15.json` |         56,447 | `803f200878ae9f5fbe4586583ecea394890cb7e55bb64310481413ab36db42e1` |

JSON remains canonical two-space JSON, byte/LF/SHA pinned, not silently reformatted.
The original PR #50/#52/#54/#55/#56 captures and fixtures remain unchanged.
Existing org/member table/column/constraint/index/policy/trigger metadata, all nine
selected function envelopes and four related enums match PR #55 exactly. Function
bodies are fingerprints only here; those functions are not called.

## Exact recovered shape

Three tables, **39 columns, ten critical constraints, eight indexes, nine policies,
three attachments, nine function fingerprints, four enum types and 78 structural
pieces**. All expected pieces passed; no raw-definition denial remains in this
selected scope. This is not a complete database/dependency inventory.

| Table                  | Columns | Critical constraints | Indexes |
| ---------------------- | ------: | -------------------: | ------: |
| `organizations`        |      23 |                    3 |       2 |
| `organization_members` |       6 |                    5 |       4 |
| `member_tiers`         |      10 |                    2 |       2 |

Recovered facts that must not be guessed away:

- Organization created_by is nullable, but its auth-user FK is **ON DELETE
  RESTRICT**. Creator deletion is not automatically detached. Name/slug/kind/
  status/verification/timestamps retain actual NOT NULL/defaults and slug UNIQUE.
- Membership user and organization are NOT NULL with CASCADE FKs; optional
  invited_by uses SET NULL. Org-user UNIQUE and the default `member` org-role stay
  intact. These are not native Shop Manager or platform app-role assignments.
- Tier id PK, rank UNIQUE and all ten NOT NULL columns/defaults match retained
  CREATE source. No actual tier values, scores, entitlements or plan rows were read.
  Profile tier default `common` remains a required configuration dependency, not
  a reason to remove that FK or silently change a default.
- Public organization read policy is true. Owner/admin management and self-
  creation predicates use the actual helpers and auth.uid contexts. The policies
  are recovered code, not approved customer-data disclosure or trusted actor proof.
- The three org attachments are creator-owner INSERT, timestamp UPDATE and
  internal-staff creation guard. PR #56 already recovered the creator conflict
  UPDATE-to-owner behavior. It is not changed or executed for acceptance here.
- Broad dated anon/auth/service table grants include nonrow rights. RLS DML
  denial is not containment for TRUNCATE/REFERENCES/TRIGGER/MAINTAIN. Effective
  MAINTAIN is not queried. No destructive experiment or production restriction.

## Structure-only reproduction

`scripts/ci/fixtures/org-tier-structure-fixture.mjs` reconstructs the two missing
original-source org/member tables from this pinned, reviewed current-catalog
structure. It uses the actual retained tier CREATE rather than inventing a tier
schema. Types, positions, defaults, NOT NULLs, every named critical PK/UNIQUE/FK,
delete action, index, current ACL/RLS/owner metadata and four enum label lists are
reproduced and compared exactly in discarded PGlite databases.

The only FK support is explicitly synthetic `auth.users(id uuid PRIMARY KEY)`;
it is not provider auth schema or JWT/session evidence. PostgreSQL 18 NOT NULL
catalog entries are normalized only after proving each is validated and backed
by a genuine attnotnull column; enforcement remains intact. No critical constraint
is dropped, disabled or deferred to obtain parity.

**Policies, functions and trigger attachments are deliberately not installed**
in this structure-only fixture. Their recovered reference metadata/text remain
available for the next complete composition. No permissive helper is substituted.
All three tables must stay empty before/after callbacks: a deliberately synthetic
diagnostic INSERT proves persistent writes are rejected by this fixture invariant.
That probe is not a valid organization workflow or production write. This fixture
cannot silently turn reduced-schema row success into auth/bootstrap acceptance.
Future behavioral composition must use separately complete actual effects and
critical dependencies, not claim this empty reproduction as provisioning proof.

## Offline checks and release state

Twelve focused contracts pass (**6.129 seconds**). They cover READ ONLY/privacy/
fingerprint scope, empty-catalog parsing/settings rollback, sixteen actual tier
source-piece pins, retained constraints, changed/unknown definition denial, local
diagnostic fingerprint substitution that still fails privacy checks, nonexecuting
unknown CHECK helper, dated/cross-capture metadata, exact current structural
reproduction and the no-write invariant. A dedicated never-quarantined serial
CI step is added. No genuine constraint, timeout, test or quarantine was relaxed.
Full regression/publication checkpoint follows below after completion.

Syntax/lint (zero warnings), source/CI formatting, canonical evidence JSON, diff
and primary review pass. Supabase safety guidance kept live recovery read-only and
the reproduction disposable, preserving the distinction between structure,
RLS/privileges, source lineage and real application authority. Current docs and
[TLS](https://supabase.com/changelog/cbc-tls-ciphers-deprecated)/
[PostgreSQL upgrade](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
release considerations were checked; no upgrade/reindex/encrypted-row scan ran.

PR #56 docs `7b46012` now passed all six CI gates (`38701375439`), verified on
this follow-up. Its hosting `7b1381dc-17f3-43a8-8874-48e54b952fa4` failed
separately and wrapper `38701375552` skipped migrations/production deployment.
PR #54's 1,207 application tests/TypeScript remain parent evidence, not a fresh
application run or bootstrap behavior for this structure-only slice.

## Exact next dependency

Recover/reproduce the complete current profiles, internal settings, subscription
plans and subscriptions structural pieces with the same bounded hash/privacy
controls, using PR #55 metadata/source first. Retain all profile tier/parent-org/
manager/intent/auth FKs and genuine default/configuration prerequisites. Then
complete ordinary no-referral auth composition with actual profile BEFORE/AFTER
effects, org/member creation, tier, plans/subscriptions, member sequence and
intent/admin-audit behavior. Derive also requires actual business-owner read
support; do not silently replace it with a no-op or erase its real dependencies.
The older owner-intent capture projects only 22 columns across audit/profile/roles,
so it is not a full business/profile bootstrap baseline.

Current org/member/tier structure and the three current org function definitions
need not be recovered again. Original org/member/org-role migration provenance
still remains open; current catalog-derived reproduction does not resolve it.
Source classification remains 404/423 matched, nineteen unclassified, with all
baseline/replay/parity/release flags false. Complete original actor/revision/common
writer locks, incoming/offboarding/native/consent authority before privileged
adoption or an atomic kernel. Preserve the three approved restrictions without
replay; quote conversion is outside those approvals.

No live data/privilege/history mutation, migration, deployment, paid resource,
customer communication, user-data deletion or PR merge. Never deploy the sparse
checkout. Native/private-history/consent/receipt/mobile/owner/full-media/recovery
acceptance and the existing single recurring continuation remain open and active.

## Published checkpoint

Draft [PR #57](https://github.com/Hunting-Fishing/motorsales365/pull/57), code
`e859bed580c816ede166e58b2bbed8d3440ec146`, branch `security/org-tier-structure`,
stacked on PR #56 docs `7b46012`. Twelve focused contracts pass (6.129 seconds).
Full serial tooling **509/509** passes (371.318 seconds), followed by receipt
assets **10/10** separately (0.280 seconds): **519** aggregate, no failures/skips/
cancellations. Syntax/lint, source/CI/Markdown formatting, canonical JSON, diff
and primary review pass. No fresh app run is claimed for the structure-only change;
parent application evidence is clearly separated above. New PR latest CI needs
verification. Migration impact **zero**; deployment **none**; exactly one
read-only structural diagnostic execution, no production mutation or PR merge.

| Artifact                                             | UTF-8 LF bytes | SHA256                                                             |
| ---------------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| `scripts/ci/org-tier-structure-review.test.mjs`      |         11,545 | `b59d4dda284e509ae427d22b412152682aa25827887a4bb9b686fde856fd214d` |
| `scripts/ci/fixtures/org-tier-structure-fixture.mjs` |          6,792 | `b76ed9507f111e86586d42478ca7f087cc41ebff729ec79a6bf3d2731597f55c` |
| `scripts/ci/fixtures/member-tier-source.mjs`         |          2,312 | `7414ec1d1d73c71c75a8813a403f3c3467d6cd1da7c69de565b0ee3154ccab4f` |

Next complete the actual profile/settings/plan/subscription structural frontier,
then ordinary no-referral bootstrap effects with business read/admin-audit and all
genuine constraints/defaults. Do not repeat org/tier or three-function recovery,
adopt current-catalog source as original history, or infer authority from this
deliberately empty structure-only reproduction. Existing continuation stays active.

PR #57 code CI `38704263088` has OCR/type/lint/Parts passed, build/unit pending.
Hosting `120afc79-525b-4e1f-b771-625a6defe154` failed separately; wrapper
`38704262461` skipped production/migrations. Verify the later documentation HEAD
separately. A passing build/preview wrapper is not an upload.
