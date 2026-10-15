# Full nonstaff Auth referral and partner-intent rehearsal

## Outcome and boundaries

2026-10-15, draft [PR #62](https://github.com/Hunting-Fishing/motorsales365/pull/62).
Code **890644605cdcbfa102d9f4d32ba4cd2a4e97cfce**, branch
security/auth-referral-intent-bootstrap, stacked on PR #61 documentation e9de502.

The actual nonstaff SQL Auth INSERT now composes the full profile/org/owner/
Bronze/intent-audit chain with referral attribution, signup bounty and sales
assignment. Partner UPDATE/DELETE with nonempty referrals reaches the **real**
intent/profile/audit helpers, rather than the missing-dependency failure of the
bounded PR #61 fixture. Everything executes only in discarded databases.

This is **not** hosted Auth/API/JWT/session, complete staff provisioning, trusted
human identity, approved credit/accounting policy or production acceptance.
Zero live queries, migrations, production mutations/deployments or customer
communications. No historical migration or seed replay, new privilege decision
or source/baseline/replay/parity/release adoption.

## Exact composition and invariants

Unchanged PR #60 and PR #61 fixtures/tests are pinned. Actual retained selected
statements/functions/attachments and reviewed prior catalog-derived full
structures are reused without altering those proofs.

| Rehearsed public structure                   |    Count |
| -------------------------------------------- | -------: |
| Full actual selected public tables / columns | 18 / 322 |
| Critical constraints / indexes               |  72 / 74 |
| Exact public full function envelopes         |       26 |
| Actual selected attachments                  |       22 |

The eighteen full public tables include profiles (58 columns), businesses (63),
org/member/tier/settings/plan/subscription/audit, actual staff/roles/referral/
application/partner/assignment and full commission/payout structures. No reduced
profile projection or successful missing-helper substitute is loaded.
No auth.uid, JWT, has_role shim or provider Auth function is installed.

All current captured full definitions/body/header/config/owner/ACL/effective
execute envelopes match. Before/after guards cover every declared public table,
full columns/defaults/type/NN/RLS/raw ACL/index/critical constraint/enum, selected
attachments/functions, exact sequence configuration/ownership/ACL and the four
synthetic Auth field definitions. Only genuine backed PG18 NOT NULL catalog
entries normalize against PG17.6 evidence.

A nested savepoint encloses all additions and behavior. Its rollback restores the
immutable parent's original empty-staff/function/attachment invariants, but cannot
hide dropped FK, altered full-profile/Auth shape, sequence config, helper grants,
attachment or permissive policy drift: the child postflight runs first. Row
snapshots cover all eighteen public tables and Auth rows. Local sequence advances
are explicitly nontransactional, not hidden by row rollback.

Four observed provider Auth field definitions and common-tier/Bronze configuration
remain explicitly **synthetic supports**, not the full provider schema/config.
Referrer Auth rows run the actual ordinary signup, then fixture-only existing
role/staff/accreditation state is seeded. Its role/staff writer fanouts are omitted
and **not claimed provisioned**. Client policies, business writer fanouts and
staff-domain execution are excluded. Owner-context SQL execution is not client or
native-shop authority acceptance.

## Verified behavior and characterized gaps

- One exact active/accredited code produces full buyer/private/link profile,
  genuine org/owner membership, active complimentary sandbox Bronze, referral,
  pending signup bounty and exact-sales assignment. No payout is created.
- Explicit buyer avoids an intent-change audit. Editable is_staff_account metadata
  can suppress auto-org while the persisted account stays nonstaff and referral
  fanouts still execute. This remains a legacy gap, not accepted role policy.
- qr/direct source overrides can coexist with credited referral. Unknown, padded
  or case-variant codes fail the **exact staff lookup** even though profile source
  says link; the downstream award helper's looser normalization is not the gate.
- Missing/inactive partner permits staff attribution and sales assignment without
  money. Inactive staff prevents attachment; sales-junior permits bounty but not
  assignment. Accreditation lookup does not bind partner user to staff owner;
  a NULL-user partner can receive a ledger row.
- Confirmation and later Auth metadata changes do not rerun profile-INSERT
  attachment. Duplicate Auth ID fails without extra sequence allocation;
  this is not an idempotent signup API proof.
- Real partner active UPDATE recomputes stale intent through full profiles and
  audit. The audit uses the target as actor and labels the active change as
  referral_code with identical old/new code values. Referral, bounty and active
  assignment are not revoked.
- **Partner rename scans only the new code**, leaving old-code profile intent
  stale despite the actual derive helper returning buyer.
- **Disposable partner deletion cascades commission ledger rows** while referral/
  assignment remain; its real nonempty callback recomputes intent and audits
  partner_removed. No live data was deleted. Financial-history retention and
  offboarding policy are not approved by this test.
- Numeric bounty overflow and a later assignment id NOT NULL fault genuinely
  restore Auth/profile/org/owner/subscription/audit/referral/bounty/assignment
  together. Sequence member 2 is consumed by failure; recovery gets member 3 but
  founding number 2. Original configuration/default restoration permits recovery.
- Partner-intent audit INSERT failure is swallowed by the actual helper; profile
  update succeeds with no audit. This is not complete attribution acceptance.
- Same-code referral UPDATE suppresses duplicates; recredit to another partner
  still awards twice in the full account context.

## Verification and publishing

Focused **20/20** in **36.407 seconds**, zero failures/skips/cancellations.
Syntax/lint/format/diff/primary review pass. Full serial tooling **602/602**
passes (485.089 seconds), then separate receipt assets **10/10** (0.325 seconds):
**612 aggregate**, zero failures/skips/cancellations. A dedicated serial,
never-quarantined CI step is added. No fresh full application run is claimed;
PR #54's 1,207 tests/59 files and TypeScript remain parent application evidence.
Independent-agent quota was previously recorded unavailable and not repeatedly
retried; this slice claims primary review only.

PR #61 docs e9de502 passed all six CI gates (**38717396103**), verified now.
Hosting **2ba0b895-c326-420d-acf2-a04632b32323** failed separately; wrapper
38717396092 skipped migrations/production. This PR needs its own latest checks.

Supabase safety guidance kept behavior disposable and untrusted metadata separate
from authorization. Current [RBAC guidance](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac),
[TLS notice](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) and
[PG17.11 changes](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
were checked. No production configuration, upgrade, reindex or encrypted-row
scan was performed.

## Exact next dependency

Ordinary full-schema Auth/referral and nonempty partner-intent behavior no longer
need recovery or stubbing. Next compose **actual staff-domain Auth → platform
role/staff/partner** with genuine canonical-org/manager prerequisites and full
schemas, retaining all constraints and earlier actual functions/attachments.
If reached staff audit calls require provider auth.uid, recover/match its actual
definition/header/owner/ACL with privacy guards rather than using the old GUC
shim. Test real missing/invalid prerequisites and late rollback; do not call a
fixture staff-domain guard a reproduction of the actual branch.

The static canonical-admin UUID, editable manager metadata, staff seller
NULL/enum mismatch and trial ANY logic remain unadopted constraints/authority
decisions. Keep trusted original actor/revisions/common locks/offboarding/native
roles separate before privileged positives. Partner rename/delete/audit,
recredit/NULL-source/case-variant/unbound partner/inactive assignment and all-status/
cross-partner/negative payout gaps need explicit retention/credit/authority
contracts, not silent production financial or role changes.

Source **404/423**, nineteen unclassified; all baseline/history/replay/parity/
release flags unchanged. Recovery/owner/consent/private-history/receipt/mobile/
full-media/hosting acceptance remains open. Preserve all approved restrictions;
quote conversion remains outside them. No sparse deploy, paid resource, customer
message, user data deletion, PR merge or duplicate automation. Single recurring
continuation active; **365 is not complete or release-ready**.

## Published checkpoint

Draft [PR #62](https://github.com/Hunting-Fishing/motorsales365/pull/62), code
`890644605cdcbfa102d9f4d32ba4cd2a4e97cfce`, based on PR #61 docs `e9de502`.
Twenty focused and 612 tooling/assets pass; syntax/lint/format/diff/primary review
pass. Actual ordinary Auth/referral and nonempty partner intent now compose with
18 full public tables/322 columns/72 critical constraints/74 indexes/26 exact
public function envelopes/22 attachments. True late failure, full row rollback,
local sequence gaps and original-default recovery are verified in discarded DBs.
No identity/helper success stub, policy/privileged-actor adoption or live query.
Migration impact zero, production mutation/deployment none.

Initial code CI `38720036769`: lint/Parts/OCR/type/build passed, unit pending.
Hosting `df04c19c-6b6a-47f8-8f89-4c5b9aa85bc4` failed separately; wrapper
`38720037098` skipped migrations/production. Verify the documentation HEAD's own
latest checks; parent/code green or successful preview is not deployment.

Next actual staff-domain Auth/role/staff/partner/canonical-org/manager composition,
recovering actual provider Auth uid only if reached, retaining all constraints and
genuine failures. Then trusted original actor/revisions/common locks/offboarding/
native acceptance. All characterized financial/authority/privacy/recovery/receipt/
mobile/full-media/hosting blockers and source/baseline/replay/parity/release flags
stay open. Single recurring continuation active. Prefer publishing local code
and checkpoint commits together next time to avoid cancelling initial CI solely
for a routine checkpoint push.

## Artifact pins

SHA256 of UTF-8 LF content:

| Artifact                                                       |  Bytes | SHA256                                                           |
| -------------------------------------------------------------- | -----: | ---------------------------------------------------------------- |
| scripts/ci/fixtures/auth-referral-intent-bootstrap-fixture.mjs | 15,502 | 08c4a71a4e97d2f22ebd2a191eaa8ac322d71afae997ac1f0bfe17027ce7e12f |
| scripts/ci/auth-referral-intent-bootstrap.test.mjs             | 21,930 | 4a8ef753c1aded123ab0f0ef0082cfb6c23ded7c39b0b18e2ba067329957688e |
