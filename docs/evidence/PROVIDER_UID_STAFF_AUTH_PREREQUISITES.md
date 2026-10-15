# Provider Auth uid source and staff Auth prerequisites

## Scope and outcome

2026-10-15, code **d59b24e660d6585157e1283e991d631a840d262e**, branch
security/provider-uid-staff-prerequisites, based on PR #62 docs 9425099.

Two bounded proofs, **not yet one provisioning chain**:

- The actual provider auth.uid() definition is recovered behind prior full-envelope
  equality and independent privacy/size/literal guards, reviewed before retention,
  then replayed with its exact owner/ACL/header/body in disposable databases.
- Actual staff-domain Auth SQL INSERT prerequisites execute against unchanged
  PR #62 full structures/functions, without calling its nonstaff helper guard.
  Genuine manager/configuration/late subscription failures and recovery are tested.

No hosted Auth API/JWT/session/original-human, native shop-role, whole staff
provisioning, approved billing or production acceptance. No migration, production
mutation/deployment, paid resources, user data deletion or customer communication.

## One live read-only source diagnostic

At **10:40:55.605099 UTC**, Postgres 17.6, one READ ONLY query against
wjxaajgvddtrxxtocxen selected **only auth.uid()**. Expected full envelope comes from
the reviewed PR #61 financial catalog at 09:44:45.633371, not a guessed function.
All captured metadata matches: definition **274 bytes**, MD5
ea3b41bf29e2ad573067939329aa088e, LF body cdef18c69c4f4cbbced2eaf81e628b49,
SQL/STABLE/SECURITY INVOKER, zero args/defaults, UUID result, NULL config,
supabase_auth_admin owner and exact existing raw ACL/effective execute rights.

The expected envelope is immutable in the pinned query. Raw source additionally
requires bounded body, no sensitive markers/nested quoting, and only the four
known request-setting/sub/empty literals. Independent tests deny unreviewed
literal, sensitive comment, nested dollar quoting and excessive body even after
matching diagnostic body/definition/byte fingerprints. Changed owner/body/ACL
also denies. Denials return NULL definition. Query runs no provider helper, reads
no Auth/app/config rows/counts or current JWT/settings/sequence values and ends in
ROLLBACK with bounded local timeouts/catalog-only search_path.

Recovered source only reads legacy request.jwt.claim.sub, then request.jwt.claims
JSON sub, NULLIFing empty settings, and casts UUID. It does **not** itself verify
a JWT. This is normal source separation from gateway validation, not evidence a
production anonymous user can forge a session. No production settings were read.

## Disposable provider component

The function's complete observed envelope/source, including actual provider owner
and existing PUBLIC/dashboard execute ACL, matches locally before and after the
callback. This is **not** the previous GUC identity stub. Role names are reproduced
with explicit synthetic NOLOGIN/non-superuser flags; schema USAGE grants are lab
supports, not recovered provider role flags or production Auth schema permissions.

Tests establish NULL when unset/empty/no-sub, legacy-sub precedence, JSON fallback,
short-circuiting valid sub despite malformed claims, genuine malformed UUID/JSON
errors, and drift rejection. All subjects are deliberately **unsigned synthetic
settings**, not verified human/JWT/session authority. The component remains
separate from the staff writer/audit chain until the next composition slice.

## Actual staff Auth prerequisite matrix

The unchanged PR #62 proof retains eighteen complete public tables, 322 columns,
72 critical constraints, 74 indexes, 26 public function envelopes and 22
attachments. Its four provider field definitions/tier/plan config are explicit
synthetic supports. Referrer role/staff writers, staff audit and sales profile/
territory tables/attachments are still omitted, not stubbed or called successful.

- Without a row for the retained static canonical-manager UUID, actual unconfirmed
  **and confirmed** staff SQL signup fails profiles_manager_user_id_fkey.
  Every public/Auth row rolls back while local member sequence allocation survives.
  This is a controlled missing-input case, **not a live missing-manager diagnosis**.
- Creating that manager through the actual ordinary Auth bootstrap permits staff
  signup. Manager-row existence proves a FK, not an admin/staff role or person.
- The current captured Auth branch yields is_staff_account=true **before email
  confirmation**, seller_type=private, derived signup_intent=buyer and founding
  complimentary sandbox Bronze. With no configured canonical org, parent_org_id
  stays NULL, no own org is created and no staff membership is added.
- A fixture configured canonical org references a genuine existing full org and
  gives staff a member link. Its configuration is synthetic; FK validity does not
  establish correct canonical-org kind, professional/native role or manager policy.
- Confirmed staff Auth without an existing active staff_referrals row does **not**
  provision platform roles, staff/referral rows, partner applications/partners or
  assignments. Profile flag/confirmation is not complete staff provisioning.
- A user-editable manager UUID can select an existing ordinary row without any
  admin/staff role. Malformed metadata falls back to the static row if it exists;
  a valid missing UUID fails the genuine FK even if fallback exists. Recovery
  preserves the sequence gap and uses the original constraints.
- The static canonical UUID self-case bypasses manager fallback but creates no
  platform admin role. This is source behavior, not accepted identity authority.
- Missing-org configuration fails its actual FK. A late subscription environment
  NOT NULL fault restores all eighteen public tables and Auth rows, including
  preexisting canonical inputs; restoring the original sandbox default recovers.
- Missing manager can recover after actual ordinary manager creation without
  stripping the FK. These are disposable rows only, not production creation.

**Correction of scope:** the earlier staff seller NULL/enum concern is not
reproduced by these current captured Auth functions: this branch stores private
and recomputes buyer. This does not resolve every legacy variant or native staff
intent contract; do not fabricate a NULL failure or claim the old concern fixed
globally. Private/buyer/Bronze staff defaults remain an unadopted policy boundary.

## Verification and release

Focused **26/26** (13 provider + 13 staff) in **23.084 seconds**, zero
failures/skips/cancellations. Syntax/lint/format/canonical JSON/diff/primary review
pass. Full serial tooling **628/628** passes (508.675 seconds), then receipt
assets **10/10** (0.298 seconds): **638 aggregate**, zero failures/skips/cancellations.
Dedicated serial never-quarantined CI step added. No fresh application
suite claimed; PR #54's 1,207 tests/59 files and TypeScript remain parent evidence.
Primary review only; previously recorded agent quota was not repeatedly retried.

PR #62 docs 9425099 passed all six CI gates (**38721062998**), verified this run.
Hosting **f3b89616-75ae-4375-88b4-cd88488592da** failed separately; wrapper
38721063061 skipped migrations/production. New publication needs latest-head checks.

Supabase safety guidance kept live access to one guarded catalog source read and
all behavioral execution disposable. Current [request-claims guidance](https://supabase.com/docs/guides/realtime/authorization),
[TLS notice](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) and
[PG17.11 changes](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
were checked. No upgrade, encrypted-row scan, reindex or production Auth changes.

## Exact next dependency

Do not repeat provider-source recovery, ordinary full Auth/referral/intent or
these staff prerequisite cases. Next extend full PR #62 structures with actual
remaining staff_referral_audit/sales_rep_profiles/sales_rep_territories, real role/
staff writer functions and attachments from PR #50/#54, plus the now recovered
provider auth.uid component. Use explicit synthetic request settings only to
characterize effects, not assert original-human attribution. Preserve exact
existing current captured envelopes/ACLs/structure and all constraints.

Compose actual staff Auth with real canonical-manager/org inputs, then the
separate actual platform role → staff/referral → sales/territory → partner/intent
write chain. Test genuine late failure, full row rollback and local sequence gaps.
Do not turn confirmed staff Auth's absence of automatic role creation into a
successful automatic provisioning claim, or invent a role-grant actor.

Before privileged positives/adoption, close trusted original actor/revisions/
common locks/offboarding/native-role contract. Staff preconfirmation flag,
metadata-selected manager, private/buyer/Bronze defaults and static UUID require
explicit authority/intent/entitlement decisions. Existing consent/audit/recredit/
retention/payout/privacy/recovery/receipt/mobile/owner/full-media/hosting gates
stay open. Source **404/423**, nineteen unclassified; all baseline/replay/parity/
release flags false. Preserve approved restrictions; quote bypass is outside them.
No sparse deploy, restriction replay, paid resource, customer message, production
deletion, PR merge or duplicate automation; single recurring continuation active.
**365 is not complete or release-ready.**

## Published checkpoint

Draft PR #63, code `d59b24e660d6585157e1283e991d631a840d262e`, based on PR #62
documentation `9425099`. Twenty-six focused and 638 tooling/assets pass;
syntax/lint/format/canonical JSON/diff/primary review pass. One guarded READ ONLY
provider function source diagnostic; zero migrations, production mutation/deploy,
paid resources, customer communications, production deletion or PR merges.
Code and verified checkpoint commits are published together to avoid cancelling
initial CI for routine documentation. Verify the publication HEAD's own checks;
PR #62's six green gates and failed hosting are parent evidence, not new acceptance.

Actual provider source and staff Auth prerequisites are proven separately, not
complete staff provisioning or original-human/JWT/native-role authority. Next
compose remaining real staff audit/sales profile/territory structures and role/
staff writer chain with full PR #62 Auth and this provider function, retaining
canonical-manager/org inputs, real constraints/failures/rollback and sequence
gaps. No repeated source/prerequisite recovery or old uid/helper stubs.
All recorded authority/entitlement/consent/retention/financial/privacy/recovery/
receipt/mobile/owner/full-media/hosting and source/baseline/replay/parity/release
gates stay open; single recurring continuation active.

## Artifact pins

SHA256 of UTF-8 LF content:

| Artifact                                            |  Bytes | SHA256                                                           |
| --------------------------------------------------- | -----: | ---------------------------------------------------------------- |
| scripts/ci/provider-uid-source-review.sql           |  4,124 | 71240a5a9e868594fc2315ccda98427a3761f2bfe2fdf794fdfb9d4dd0a5d8bc |
| docs/evidence/provider-uid-source-2026-10-15.json   |  1,908 | 033c55a27276b1a066099613a56745e74a8b208d9d93dee8812c43640adad9fc |
| scripts/ci/fixtures/provider-uid-source-fixture.mjs |  3,976 | ca95448771e7f4f09dc2e9666340d6d690b2246d134903d90843ed2e41a47a05 |
| scripts/ci/provider-uid-source-review.test.mjs      |  8,279 | 153319d148f6f2b779b527580aa6571300cfd6fb97a0ebfa2fab0715bdc9fd24 |
| scripts/ci/staff-auth-prerequisites.test.mjs        | 11,732 | fa26eaf914515a9c61fe90e590e6510d9afd858ad85e5544b0b7011b960a5ebb |
