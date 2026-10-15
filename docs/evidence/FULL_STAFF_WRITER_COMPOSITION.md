# Full Auth and staff writer composition

## Scope and outcome

2026-10-15, code **5e748d2ab8a089979566cc3696d83dbda6551639**, branch
`security/full-staff-writer-composition`, based on PR #63 docs `a188571`.

The recovered provider auth.uid() and actual role/staff/audit/sales/territory
writers now execute together with the unchanged full PR #62 Auth/referral/intent
chain in disposable PGlite databases. This closes the earlier **separate-proof
boundary**, not the original-human, native authority or production release gates.
Zero live SQL diagnostics, production mutations, migrations or deployments.

Verified composition: **21 complete public tables, 347 columns, 78 critical
constraints, 81 indexes, 37 full public function envelopes, actual provider uid
and 30 complete selected attachments**. The added tables are staff_referral_audit
(7 columns), sales_rep_profiles (11) and sales_rep_territories (7). Eleven actual
function definitions and eight attachments are added from the pinned PR #50/#54
sources; existing accreditation/timestamp/assignment pieces are not replaced or
duplicated. Current captured ACLs are retained exactly, not old broader grants.
In particular, sales_rep_profiles does **not** receive the other tables' anon grant.

## Composition and guard boundaries

The immutable PR #62 guard runs before extension. Nested SAVEPOINT composition
then preserves every full parent table/column/default/critical constraint/index/
enum/RLS/ACL/policy facet, member sequence configuration/ownership/ACL and four
Auth field definitions. Actual nine-table staff/partner metadata, 21 parent
function envelopes and sixteen additional envelopes are checked, together with
the actual provider definition/envelope/ACL. Only catalog-backed PG18 NOT NULL
entries are normalized; critical checks and FK behavior are never removed.

Global allowlists require exactly 37 public functions, only auth.uid() in auth,
30 actual attachments and 21 public tables. Deliberate full-profile/Auth/new-table
default, commission CHECK, table/function/provider ACL, disabled attachment,
extra identity helper/table and permissive policy changes all fail the child
guard before rollback. Automatic child postflight also catches changed writers.
The child rolls back its additions before the immutable parent checks run again.

All 22 Auth/public table row snapshots participate in failure checks. Sequence
configuration is guarded, while **local in-memory allocation state** is separately
observed to expose nontransactional gaps. No live sequence/settings values read.

## Actual behavior characterized, not adopted

- Confirmed staff Auth alone flags the profile and links the genuine configured
  lab org/manager but creates no platform role, staff referral, staff audit,
  sales profile/territory or partner application/partner. Role provisioning is a
  separate write, not an automatic confirmation effect.
- A separate sales-role INSERT reaches territory creation, staff referral/code,
  staff audit, staff accreditation/application/partner and sales profile creation
  with full schema/constraints. It succeeds even when staff Auth is unconfirmed.
  Accreditation writes approved/agreed_terms=true/internal-staff-v1 without
  independent reviewer/consent evidence. These are explicit policy blockers.
- The user role alone skips referral creation; all seven other tested non-sales
  platform roles create one staff referral and accreditation for the staff domain.
  Only exact sales, not sales_junior/sales_senior/sales_manager, provisions the
  sales profile/territory. Duplicate same-role INSERT fails the genuine UNIQUE.
- Ordinary nonstaff Auth plus sales creates staff/sales rows; the real domain
  gate skips partner accreditation. No permissive accreditation stub is used.
- A generated staff referral code reaches real nonempty consumer Auth → full
  profile/org/owner/Bronze/referral → pending commission event and sales assignment.
  The event has amount_php=0 and commission_php=2, source_ref=signup:<user UUID>;
  these are ledger values, **not paid revenue or verified settlement**.
- Full profile signup area is trimmed; missing area returns no_signup_area.
  Business-area fallback executes with full real profile fields; existing
  territory causes already_has_territories rather than automatic area refresh.
- Actual provider uid supplies staff audit actor_id from unset/legacy/JSON
  fallback settings, including precedence and valid-sub short circuit. Deliberate
  unsigned, unbound UUIDs are recorded without an Auth row. This is **not** a
  gateway/JWT/session test or evidence a production anonymous caller can forge
  identity. Synthetic settings and schema/role supports are not adopted actors.
- Invalid JSON fallback raises 22P02 through the actual staff audit chain and
  rolls back its role/territory/staff/partner work; corrected settings recover.
- A full nonempty partner reactivation callback still attributes the target UUID
  instead of the supplied original subject and labels active changes referral_code.
  Actual uid recovery does not repair the retained intent/audit attribution bug.
- Staff deactivation/QR update records uid-based audits but leaves accredited
  partner and prior assignments active. Inactive staff prevents new Auth referral
  attachment. Removing the sales role likewise leaves staff/partner/sales profile/
  territory/prior assignment active; new referrals still earn pending commission
  but no new exact-sales assignment. **Offboarding is not accepted or repaired.**

## Genuine failure and recovery

A late sales-profile active NOT NULL failure occurs after earlier role territory,
staff/referral/audit and accreditation writes. An attempt wrapping actual staff
Auth plus the separate role write restores every Auth/public row. The lab member
sequence still burns 2; restoring the original default yields member 3/founding 2
and the real successful complete chain. A staff-audit CHECK failure likewise
restores earlier role/territory effects and recovers after fault removal.

After actual staff provisioning, a late consumer assignment id NOT NULL failure
restores full Auth/profile/org/owner/subscription/referral/bounty state; member 3
is consumed, then original-default recovery yields member 4/founding 3 and one
real commission event/assignment. These are controlled lab faults, not claims
about a currently failing production row.

Client anon/authenticated DML and privileged territory helper execution are denied
with **no installed legacy client policies**. This deny-only boundary is not
proof of the production policies or professional/native role acceptance. A lab
service_role BYPASSRLS case is explicitly synthetic and rolled back, not an
authorized original-human role grant. Broad captured nonrow rights are retained;
RLS DML denial does not prove TRUNCATE/TRIGGER/write containment.

## Validation and release status

- **23/23 focused tests pass**, 31.604 seconds, no failures/skips/cancellations.
- Node syntax, direct ESLint with zero warnings, Prettier and git diff checks pass.
- **651/651 full serial tooling tests pass**, 524.422 seconds, zero failures,
  skips or cancellations; then **10/10 receipt assets pass**, 0.365 seconds:
  **661 aggregate**. The 23 focused tests are included in tooling, not added twice.
- Primary review only; subagent quota remains the already-known blocker. No
  unchanged quota retry and no claim of independent review.
- No fresh application suite claimed; PR #54's 1,207 tests/59 files and TypeScript
  are parent evidence. This slice changes tests/CI/docs, not application runtime.
- PR #63 docs a188571 now passed all six CI gates, run **38724707790**.
  Hosting build **948ee9b6-fa4c-4e95-b3ae-0edb4a043741** failed separately.
  Wrapper **38724707588** preview step passed, migrations/production skipped.
  These are parent checks, not this publication head's CI or deployment evidence.
- Code/checkpoint publication is a draft review slice; verify that HEAD's checks
  at the next heartbeat rather than equating build/preview with production.

Supabase security skills kept behavioral execution disposable, client policies
unadopted and uid request settings distinct from verified original actors.
Current [Auth/RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security),
[TLS notice](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) and
[PG17.11 changes](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
were checked. No upgrade, encrypted-data scan, reindex or production Auth changes.

## Next dependency and safe parallel work

Do **not** repeat actual provider-source/prerequisite/ordinary/full-schema/referral/
financial/staff-writer recovery or return to projected Auth/profile/uid substitutes.
Reuse this composition as the full-table foundation. Continue trusted original
actor custody and claim-attempt/evidence/owner-tenure revisions, then consistent
shared locks/idempotency and team/ownership/native/offboarding reconciliation.

Current read-only caller inspection confirms generated auth middleware uses
getClaims(token) and passes userId/claims plus the caller-scoped client. Business
claim review then changes to a service client for approval, with reviewer metadata
written separately. Its unwired claim-review codec only checks a **supplied** actor
and expected owner; neither verifies provenance, freshness, revisions, an atomic
ledger nor confirmed mutation. Do not edit generated middleware or turn the codec
into accepted authority. Next recover/compose the actual claim/evidence/reviewer/
ownership writer boundaries from PR #45/#47 with this full foundation, reusing
current source and explicitly identifying remaining native/incoming dependencies;
then design the original-actor/revision/common-lock candidate, not a service or
global-admin positive disguised as a human. Omitted incoming native/team writes
and all non-owner business attachments remain explicit until proven composed.

Safe independent app work remains available: internal-staff create's ignored
follow-up profile-update result and manager-update/deactivation acknowledgment/
lifetime tests can be addressed without adopting new role authority. That work
must not claim ban_duration revokes issued JWTs or completes offboarding.

Source **404/423, nineteen unclassified**; all source/baseline/replay/parity/release
flags remain false. Static canonical UUID, editable manager, staff private/buyer/
Bronze, consent, ledger/recredit/payout/audit/retention, private vehicle tenure,
database/private-storage recovery, receipt/mobile/owner pilot, full media and
hosting prerequisites remain open. Preserve already-approved restrictions; quote
conversion bypass remains outside those approvals. No sparse deploy, restriction
replay, paid resources, customer messages, production data deletion, PR merge or
duplicate automation; the single recurring continuation stays active.
**365 is not complete or release-ready.**

## Artifact pins

UTF-8 LF SHA256:

| Artifact                                          |  Bytes | SHA256                                                           |
| ------------------------------------------------- | -----: | ---------------------------------------------------------------- |
| scripts/ci/fixtures/full-staff-writer-fixture.mjs | 14,931 | 06977f1bb407a2afe8bfce2843ad02dde4e5f0a698dd5303b03a5637b74859f0 |
| scripts/ci/full-staff-writer-composition.test.mjs | 22,676 | 72ee3cf22c68034329c5af58da11008ac4514a7135b82b59750b2ae95fc2e58e |
