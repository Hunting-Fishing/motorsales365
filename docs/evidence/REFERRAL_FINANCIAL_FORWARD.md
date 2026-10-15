# Nonempty referral bounty / assignment forward rehearsal

## Scope and outcome

2026-10-15, branch security/referral-financial-structure, stacked on PR #60
documentation 3f48b40. **Disposable-database legacy characterization**, not a
migration, financial-policy approval, production acceptance or complete Auth flow.

The actual user_referrals INSERT fanouts execute together:
pp_user_signup_bounty() → pp_award_bounty(text,text,text) and
tg_auto_assign_sales_rep(). A late assignment failure restores earlier referral
and bounty writes. The separate actual pp_recompute_payout_total(uuid) helper and
payout timestamp attachment execute without moving money.

Four retained source files supply narrowly selected unchanged statements: July 1
partner/event creation, July 1 payout/event extensions, July 28 bounty extension
and June 5 assignment logic. Whole files, selected statements, queries/captures
and unchanged PR #54 fixture/tests are pinned. No full migration, seed or backfill
replay; no source-history adoption.

## Live inspection and provenance

Exactly two **READ ONLY catalog diagnostics** ran against wjxaajgvddtrxxtocxen,
Postgres 17.6: **09:44:45.633371 UTC** fingerprints, then **09:45:26.830475 UTC**
preceding-hash/privacy-gated structural pieces. Local statement/lock timeouts and
catalog-only search_path end in ROLLBACK. No application/Auth/config rows/counts,
helper calls, live sequence/settings values or raw function bodies were read.

All facets match between captures. All **57** pieces passed independent expected
hash, fixed privacy/literal and size guards, manually reviewed before retention.
Denials return NULL. Tests independently prove privacy denial despite a matching
updated hash, and hash denial for an otherwise safe literal.

| Selected current metadata                             |      Count |
| ----------------------------------------------------- | ---------: |
| Financial tables                                      |          2 |
| Commission-event / payout columns                     |    18 / 12 |
| Critical constraints / indexes / policies             | 12 / 6 / 4 |
| Payout attachment / function envelopes / related enum |  1 / 7 / 1 |

All **six public** full definition/body/header/config/owner/ACL/effective-execute
envelopes match the lab; both referral trigger functions match PR #52 too.
Current bounty/recompute ACLs allow owner/service, not anon/authenticated.
The old payout migration's authenticated grant is **not current** or replayed.
Broad raw table ACL/nonrow rights remain reproduced; RLS DML denials are not
complete write containment or effective MAINTAIN/API/shop-role acceptance.
No live grant/revoke was made.

## Exact disposable composition

The immutable PR #54 fixture is extended inside a rolled-back transaction;
its original empty-referral/postflight checks then run unchanged.

- Eleven actual selected public tables: **139 columns, 40 critical constraints,
  34 indexes, 31 policies**; **15 attachments and 19 public function envelopes**.
- Parent's two-field Auth support, six-field profiles projection, GUC auth.uid shim
  and role seeds are explicitly **synthetic**, not provider/full-profile/JWT
  evidence. The shim envelope is pinned/guarded and differs from the provider.
- Only genuine backed PG18 NOT NULL catalog entries normalize against PG17.6.
  All other facets stay exact before and after the callback.
- Removed FK, unrestored default, altered grants, removed attachment or changed
  Auth shim fails before outer rollback can hide drift. Failed writes restore
  all eleven table rows, Auth/profile supports, parent catalog and caller settings.
- PR #60's full Auth/profile/org/plan/intent structures are **not** combined here.
  The independent proofs are not promoted to complete workflow acceptance.

## Characterized legacy behavior, not adopted policy

- Trimmed/case-insensitive active partner code creates a pending signup bounty,
  amount zero/configured commission. Exact sales role creates referral assignment
  with the rep as assigned_by. No payout row is created.
- NULL/blank/unknown/inactive codes and nonpositive signup rates skip credit.
  Business helper uses its separate rate; business INSERT attachment is omitted.
- Same partner/type/non-NULL source and same-code UPDATE suppress duplicates.
  **Recredit to another partner awards again for one signup; NULL source duplicates.**
- Case-sensitive code UNIQUE admits case variants; lowercased unordered LIMIT 1
  does not establish deterministic credit authority.
- Exact sales only: junior/senior/manager alone do not qualify. Inactive staff,
  inactive profile and not accepting clients do not prevent assignment.
  Existing active assignment wins conflict; staff-link UPDATE does not retarget.
- Missing Auth/staff/payout/reviewer FKs, duplicate referral user and numeric
  overflow fail genuinely. Late assignment id NOT NULL fault rolls back the
  earlier bounty/referral; restoring the original default permits recovery.
- Direct anon/authenticated helper calls and ledger/payout INSERTs deny under
  reproduced ACL/RLS with synthetic ordinary subjects. No trusted-human/admin
  authority positive is adopted.
- **Payout sum includes every linked status**, including pending/clawed-back/paid,
  despite the old source comment saying approved. Cross-partner payout links and
  negative event values are permitted. Status stays pending, paid_at stays NULL.
  These are accounting/release gaps, not payable totals, payments or live incidents.
- Deleting a disposable payout SET NULLs event linkage; no live data was deleted.
- Partner UPDATE after nonempty referrals reaches the real intent wrapper and
  fails with missing recompute_signup_intent in this bounded fixture, rolling
  back. **No helper stub hides this dependency** or claims successful full intent.

## Verification and release status

Focused **22/22**, **28.614 seconds**, zero failures/skips/cancellations.
Full tooling/assets results are recorded in the published checkpoint below.
Syntax/lint/format/canonical JSON/diff checks and primary review are required.
Dedicated serial never-quarantined CI step added. No fresh application run is
claimed; PR #54's 1,207 tests/59 files and TypeScript remain parent evidence.
Independent review was unavailable under the previously recorded agent quota;
the unchanged condition was not repeatedly retried.

PR #60 docs 3f48b40 passed all six CI gates, run **38713945751**, verified now.
Hosting **839382da-a68a-46ea-8179-74805105095c** failed separately; wrapper
38713945758 skipped migrations/production. New work needs latest-head checks.

Supabase safety guidance kept live access catalog-only and behavior disposable.
Current [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[TLS notice](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) and
[PG17.11 breaking changes](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
were checked. No upgrade, reindex, encrypted-row scan or Auth configuration ran.

## Exact next dependency and blockers

Compose **actual nonempty ordinary Auth referral + partner intent** using unchanged
PR #60 full profiles/org/plan/business/audit structure and actual retained
staff/roles/partner/referral/assignment/financial functions/attachments proven here.
Keep all constraints, explicit provider/configuration limits, late row rollback
and nontransactional local sequence gaps. Do not promote the old projections.
If reached staff/audit calls need auth.uid, recover/match its actual definition/
header/owner/ACL behind privacy gates, not the GUC shim. Then close staff-domain
Auth/role/staff/partner/canonical-org/manager integration.

Original actor, revision/common locks/offboarding/native-role decisions stay
separate before privileged positives. Recredit/case-variant/inactive assignment/
all-status sum/cross-partner/negative ledger and prior trial/staff-enum/audit/
entitlement gaps require explicit contracts, not silent monetary/authority rules.
Recovery/owner/consent/private-history/receipt/mobile/full-media/hosting stay open.

Source classification **404/423**, nineteen unclassified; source/baseline/replay/
parity/release flags unchanged. Zero migration, production mutation/deploy, paid
resource, customer communication, PR merge or restriction replay. Quote conversion
remains outside earlier approvals. No sparse deploy or duplicate automation.
Single recurring continuation active; **365 is not complete or release-ready**.

## Artifact pins

All hashes are SHA256 of UTF-8 LF content.

| Artifact                                                   |  Bytes | SHA256                                                           |
| ---------------------------------------------------------- | -----: | ---------------------------------------------------------------- |
| scripts/ci/referral-financial-catalog-review.sql           |  9,836 | 33781cdb706136454762c4647f4a29aff88b7c695b826a3cd013b734720c8655 |
| docs/evidence/referral-financial-catalog-2026-10-15.json   | 27,538 | deba693bf365e7811c20b520116a9f4f84d0eb6622f1b3e597dbb70dd4f09763 |
| scripts/ci/referral-financial-structure-review.sql         | 17,984 | 8d9ea5db4f0d4eda0448276a9325f27ac5ad5a8213819e438cfd6ad0efe133d3 |
| docs/evidence/referral-financial-structure-2026-10-15.json | 45,800 | 97fbec8e9b7fb432a8758aec144023378cd5b066eac1dd116cedd2a3b26baa8b |
| scripts/ci/fixtures/referral-financial-forward-fixture.mjs | 12,138 | 059ea6e1db88f02bb2939bbb737fbc44c5ed6d1b8c0dce243410916dca92ad58 |
| scripts/ci/referral-financial-forward.test.mjs             | 22,698 | 6f1f49960c1cab59fa8e6e6696d819945b1072cf52d15c356aa84d38610ca4e0 |
