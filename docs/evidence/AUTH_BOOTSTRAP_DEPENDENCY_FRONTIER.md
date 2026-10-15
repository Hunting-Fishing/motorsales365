# Auth/profile/org bootstrap dependency frontier

2026-10-15. Catalog/source evidence only: not complete signup behavior, adopted
authority, migration provenance acceptance, production repair or release readiness.

## Read-only recovery and privacy boundary

The separately reviewed bounded query is
`scripts/ci/auth-bootstrap-catalog-review.sql`. It uses BEGIN READ ONLY, trusted
`pg_catalog,pg_temp`, 5-second statement/1-second lock timeouts and ROLLBACK. All
catalog inspection remains structural/fingerprint-only. There are no application
or auth rows/counts, helper calls, raw function definitions/defaults/config values/
expressions, sequence last/current values, DDL/DML/privilege/history changes.

Two successful read-only executions occurred. The first at
`2026-10-15T07:20:28.319001` UTC exposed JavaScript bigint rounding in an unpublished
local evidence serialization. That intermediate local artifact was discarded;
no prior committed artifact or user data was removed. The query was corrected to
return all sequence bigint metadata as exact text, verified offline, then executed
at **`2026-10-15T07:22:41.479679` UTC**. Only this complete privacy-reviewed capture
is retained in `auth-bootstrap-catalog-2026-10-15.json`, PostgreSQL **17.6**, project
`wjxaajgvddtrxxtocxen`. The exact maximum is `9223372036854775807`, not a rounded
JSON number. No actual sequence value was read or advanced by the live query.

The primary agent reviewed the full query/output privacy surface. Quota-blocked
subagents were not retried; no fresh independent final review is claimed. Offline
tests prove parsing/settings rollback on an empty database and use an explicitly
synthetic diagnostic sentinel to prove expression-function discovery does not
execute that helper or evaluate a default/advance a sequence. That sentinel is
not an auth/bootstrap behavioral stub. Live output is never executed as SQL.

| Artifact                                               | UTF-8 LF bytes | SHA256                                                             |
| ------------------------------------------------------ | -------------: | ------------------------------------------------------------------ |
| `scripts/ci/auth-bootstrap-catalog-review.sql`         |         12,725 | `5ddc90c84163cb86340294175e4dd877aae28b2a54edd7d0bad5d92c03d27d6f` |
| `docs/evidence/auth-bootstrap-catalog-2026-10-15.json` |         98,885 | `e3ed0e24c8e00d018370360b0b8abb8dc0a80fee0232148756857d6a41f7df9b` |

## Recovered structure

Six actual public relations, 123 columns (119 public plus four auth support
columns), 25 critical constraints, 22 indexes, 24 policies, 15 trigger attachments,
29 function fingerprints, six enum types and one sequence metadata envelope.
Full `profiles` is no longer a six-column projection in this inventory. No full
`auth.users` schema or auth authority is claimed: its selected columns are only
id, email, raw_user_meta_data and email_confirmed_at, with no values.

| Relation                | Columns | Selected significance                                                               |
| ----------------------- | ------: | ----------------------------------------------------------------------------------- |
| `internal_org_settings` |       3 | canonical-org FK; no settings values read                                           |
| `organization_members`  |       6 | org/user/inviter FKs, org-user UNIQUE, `org_role` enum                              |
| `organizations`         |      23 | creator FK, slug UNIQUE, creator-owner/guard/timestamp attachments                  |
| `profiles`              |      58 | actual seller enum/NOT NULL, founding/member identity, source/intent checks and FKs |
| `subscription_plans`    |      11 | actual plan table structure only, no pricing/plan rows                              |
| `subscriptions`         |      18 | user/plan/org FKs and timestamp attachment                                          |

Overlapping PR #52 functions, the two auth attachments, eight shared support
columns and app-role enum are unchanged in this fresh capture. The older PR #50,
#52 and #54 artifacts are not edited. This overlap is not a transitive authority
or cross-snapshot closure assertion.

All six public tables retain broad dated anon/auth/service grants with RLS;
nonrow TRUNCATE/REFERENCES/TRIGGER/MAINTAIN risks are not contained by row policies.
Effective MAINTAIN is not queried. The member sequence's USAGE/SELECT/UPDATE
privileges include anon/auth as well as owner/service. This is catalog evidence,
not a destructive sequence experiment or a demonstrated hosted API exploit.
No direct production restriction is newly authorized/applied here.

`profiles.seller_type` is NOT NULL, enum labels `private,business,staff`; this
confirms the existing staff-API NULL/legacy dealer/repair_shop/insurance mismatch
remains a release blocker. No account was created or altered to probe it.
`organization_members.role` is the distinct `org_role` enum
`owner,admin,manager,member,viewer`, not native Shop Manager roles or platform
`app_role`. The profile tier FK points to **`public.member_tiers`**, outside this
six-table inventory: a new explicit critical-table frontier, not a removable FK.

## Attachments and matched source

There are nine profile attachments, eight INSERT-capable plus the UPDATE-only
timestamp. The real bootstrap frontier includes:

1. BEFORE profile INSERT founding assignment, member-number assignment and
   internal-manager initialization.
2. AFTER profile INSERT automatic seller-org creation, intent recomputation,
   founding Bronze subscription, referral crediting and business-trial routine.
3. Organization creator-owner, internal-staff creation guard and timestamp;
   subscription timestamp on UPDATE. Two auth-user attachments remain observed.

The source map `scripts/ci/fixtures/auth-bootstrap-source-correspondence.mjs`
pins **19 whole retained SQL files** and matches **25 of 28 selected public
function bodies** to current catalog MD5s. It records path, source line, body
MD5/SHA256 and length, without executing SQL or adopting historical seeds/backfills.
This is body correspondence, not complete CREATE header equivalence or accepted
migration lineage. `auth.uid()` is provider-owned metadata, not a locally recovered
definition. These three public source definitions remain missing from the bounded
retained migration search:

- `public.can_manage_org(uuid,uuid)` — body MD5 `4b54f3895e3fab6350dea558838bdd05`
- `public.is_org_member(uuid,uuid)` — `cefe2097db7339afc78a8e4bbb665c4b`
- `public.tg_org_add_creator_as_owner()` — `866cb0936b4e0fb9f8babcbc24482324`

The original organization/member CREATE DDL and `org_role` type source also remain
unrecovered. Bounded SQL searches of the adjacent `motorsales365` and
`motorsales365-active` directories found no matching original definitions; they
were read only, with no branch/file changes. Existing retained-history `git log
--all -S` searches are recorded in PR #54's frontier. A missing source file is not
permission to invent a permissive helper/table or remove real constraints.

Current matched source now supports the following **source-level**, not hosted
behavior, findings:

- Ordinary nonstaff signup is not profile-only: automatic seller-org creation
  can write an organization when membership is absent. Its raw-user-metadata
  boolean cast can fail on malformed input. User-editable metadata is not adopted
  as trusted authority.
- The internal manager helper calls `canonical_365_admin_id()` in its declaration
  initializer before the nonstaff early return. It cannot be omitted as unreachable.
- Referral crediting declares the actual `staff_referrals%ROWTYPE` before its
  no-code return, so that actual table type is a prerequisite. A referral may
  enter the user-referral bounty/assignment writer frontier; PR #54 covers only
  an empty referral loop.
- Founding Bronze provisioning can write subscriptions, and member-number
  assignment calls the sequence. Actual plan rows, entitlement policy, concurrent
  founding numbering and member sequence rollback/recovery are not verified.
- The matched business-trial body has `<> ANY` over three different kind strings.
  Logically this comparison is true for every non-NULL kind, so its guard returns
  before trial granting on that source path. `dealer` is also not a current
  `business_kind` enum label (`dealership` exists). This is source/logic reasoning,
  not a production signup test, and no trial eligibility/model/function was changed.
- The current auth handler inserts/upserts profiles and internal org membership;
  it does not INSERT a default platform `public.user_roles` row. Source conditions
  and flags are not original human actor or approved platform authority evidence.

## Verification, release state and exact next action

Eleven focused offline contracts pass (1.857 seconds): query/privacy controls,
bounded scope, empty-catalog and nonexecuting sentinel, artifact pins, retained
metadata, cross-capture overlaps, actual enum/constraint/trigger frontier and 25
body correspondences. A dedicated never-quarantined serial CI step is added.
Full regression/publication is recorded below after completion. No test, genuine
constraint, quarantine or timeout was relaxed.

The retained JSON is canonical two-space `JSON.stringify` evidence, independently
LF/length/SHA pinned, rather than a Prettier-rewritten artifact. Source, CI and
Markdown formatting are checked separately; no captured bytes are silently
reformatted. Supabase safety guidance kept all live work catalog-only and tests
disposable, and preserves the distinction between source correspondence,
elevated/RLS authority and real signup behavior. Current
[user-management guidance](https://supabase.com/docs/guides/auth/managing-user-data)
was checked, including trigger-failure and user-editable metadata/session limits.
Provider [TLS](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) and
[PostgreSQL upgrade](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
release checks remain recorded; no upgrade/reindex/encrypted-row scan was run.

PR #54 docs `b415d4b` now passed all six CI gates (`38696845832`), verified on
this follow-up. Hosting `8889aaa6-9b79-4e51-9875-337a098993ec` failed separately;
wrapper `38696846028` skipped migrations/production deployment. Its 1,207 app
tests are verified parent evidence, not fresh auth-bootstrap behavioral proof.

Next recover the three missing org function definitions, original org/member/
org-role DDL and the actual `member_tiers` critical-table metadata/source. Use
retained repository/backup evidence first; if unavailable, a separately reviewed
selected sanitized catalog-definition recovery can be proposed without treating
it as historical provenance or approved baseline. Do not dump arbitrary bodies,
config values, settings/plan/auth/customer rows or sequence current values.
Then compose the ordinary no-referral auth branch with the actual profile/org/
membership/plan/subscription/sequence/intent/admin-audit effects and critical
constraints. Keep user metadata untrusted and trusted original-actor/revision/
writer-lock/offboarding/native/consent authority unresolved until verified.

If original-source recovery needs owner access/approval, continue the independent
nonempty referral and caller-contract work without repeating failed discovery.
No production change, migration, deployment, paid resource, communication or
customer-data deletion; preserve the three approved helper restrictions without
replay. Quote conversion remains outside those approvals. Source provenance is
still 404/423 matched with nineteen unclassified; baseline/replay/parity/release
flags remain false. Sparse checkout must not be deployed. Native/private-history/
consent/receipt/mobile/owner/full-media/recovery gates and the existing single
recurring continuation remain open and active.

## Published regression checkpoint

Draft [PR #55](https://github.com/Hunting-Fishing/motorsales365/pull/55), code
`34cea8897048beb406e9e67f9ed363941923a8da`, branch
`security/auth-bootstrap-catalog`, stacked on PR #54 docs `b415d4b`. Eleven focused
contracts pass (1.857 seconds). Full serial tooling **486/486** passes
(361.861 seconds), followed by receipt assets **10/10** separately (0.345 seconds):
**496** aggregate, no failures/skips/cancellations. Syntax/lint (zero warnings),
source/CI/Markdown formatting, canonical pinned JSON, diff and primary review pass.
No fresh full application run is claimed for this catalog-only change: PR #54's
1,207-test/59-file full app and TypeScript plus six green CI gates are parent
evidence, not bootstrap runtime acceptance. Latest PR #55 checks require their
own verification. Migration impact **zero**, deployment **none**; exactly the two
read-only catalog executions above, no production mutation or PR merge.

| Artifact                                                       | UTF-8 LF bytes | SHA256                                                             |
| -------------------------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| `scripts/ci/auth-bootstrap-catalog-review.test.mjs`            |         14,509 | `50f9d3d4d1e5ef69b33a9fbad1cf2f1d6037fe5b740a51003ded46874236c04f` |
| `scripts/ci/fixtures/auth-bootstrap-source-correspondence.mjs` |          6,033 | `b6f4859d92b319f148cda6a2cd3c889b97693116f9f1fe8e52d0167dec51c968` |

Next prepare narrowly selected privacy-gated current definition recovery for the
three missing organization functions and original org/member/org-role structure,
without row reads or treating catalog-derived source as historical provenance.
Continue member-tier and nonempty-referral critical dependency work independently;
do not repeat completed fingerprint capture, partner proof or approved restrictions.

PR #55 code CI `38699596178` has OCR/lint/Parts passed and build/type/unit
pending. Hosting `b1cb0ff7-3661-4df8-9c52-e8006f6b3cca` failed separately;
wrapper `38699596161` skipped migrations/production deployment. Verify the later
documentation HEAD separately; no passing build/preview wrapper is an upload.

Follow-up: docs HEAD `ec8ea7a` passed all six CI gates (`38699776700`); hosting
failed separately and migration/deployment skipped. PR #56's separate current
definition recovery is recorded in `ORG_FUNCTION_SOURCE_RECOVERY.md`. The three
original retained-source definitions are still missing, but their exact current
catalog-derived reference source is now recovered. This fingerprint capture and
25-body retained-source map remain unchanged, with no history/baseline adoption.
