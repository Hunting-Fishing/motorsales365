# Parts and provider integration reconciliation

15 October 2026. Same integration branch/draft PR #68; no merge or deployment.
Source slices: `f46b048db9fa2adb309d184c161ff30d86a34621` (unused cloud-auth
retirement), `a420a44dbcfac6d308a1f85845595cd8aa9ade72` (Parts reference recovery)
and `2350e40389bcbc8cc556c708dc00a1a93a3176c4` (remaining migration ledger/CI).
This closes missing-plan recovery and records outstanding migration categories,
not Parts activation, a complete provider cutover or release acceptance.

## Parts draft recovered without changing authority

PR #2 at `cc75542f183e5b8ab363edef24f712a3899fb96f` has 12 documentation changes,
7,188 added lines and no deletions. All 11 new documents were absent at observed
candidate `06e21a2e`. They are preserved in `docs/reference/parts-pr2/source/`:
**7,186 lines / 381,036 bytes**, exact original Git blobs plus SHA-256 hashes.
The remaining two-line Repair Knowledge cross-link proposal is recorded separately
in the manifest, not adopted into the active plan. The current Platform, Parts,
Parts RLS, Repair Knowledge and Vehicle History plans remain byte-unchanged.

The [reference README](../reference/parts-pr2/README.md) maps current authority,
draft versus active gates and historical link/decision gaps. Draft G2 legal/finance
does not replace active Parts G2 tenancy/security; draft G4 sandbox is not active
G4 build authorization. No equivalence, passed gate or owner approval is inferred.
Future country/export/capital/legal proposals and D-050 regional topology remain
gated; the sole hosted 365 backend stays `wjxaajgvddtrxxtocxen`.

Original relative links and historical dates/status are preserved, including
known unresolved archive links. The README supplies current-authority links and
the manifest supplies pinned source URLs. This is not complete historical-link
repair or a current operational status report. An independent bounded review
verified original hashes, unchanged active plans, gate separation and decision
limits, with no actionable findings. It did not review runtime acceptance.

## Remaining migration sources are individually identified

`migration-remaining-source-ledger-2026-10-15.json` pins all 19 unchanged source
hashes and ten existing evidence files at observed candidate `06e21a2e`:

- **12 historical unresolved sources:** split/amended/composed/token-only
  correspondences and an unproven seed remain different from whole-source equality.
- **Five recorded-unapplied forward candidates:** Parts RLS/follow-ups, direct
  installed-vehicle preservation, Customer Vehicle Activity and reminder readers.
- **Two recorded embedded executions:** profile bootstrap and work-order totals
  restrictions already executed under remote versions `20261015021118` and
  `20261015021145`. Exact embedded ranges/envelope hashes match existing evidence;
  do not replay them. This is recorded evidence, not a fresh production read.

The unchanged exact whole-source classifier still returns **404/423**, with the
same 19 outside it and the historical cost-patch replay trap. Embedded originals
are not substituted for retained envelope hashes. Baseline/replay/parity/release,
fresh production verification, schema activation and history-repair approvals
remain false. Existing immutable inventories and execution records were not edited.

PR #9's `20260928090000_rewrite_legacy_hosted_asset_urls.sql` is **absent and outside
the 423**, not one of the 19 or accepted migration ingress. Its basename-based
data rewrite needs separate source/data/recovery review before adoption; adding
it would create another source entry, not resolve an existing classification.

## Provider cutover scope and bounded cleanup

PR #9 at `300f02ba8f8fb0ad8b6c5746fc60373153187c65`, base `c8b66ebd`, contains
**205 rename-aware changes / 211 physical paths**: 73 added, 68 deleted, 70 modified.
At fixed observed candidate `06e21a2e`, none of its complete target blobs/deletions
matched. Native Google intent was deliberately adapted, not copied byte-for-byte;
the canonical browser backend already predated PR #9. No `.env` values were read
or disclosed for this comparison.

| Physical paths | Group                  | Remaining acceptance boundary                                                                                                                                         |
| -------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 105            | Assets/descriptors     | 55 binary payload additions and 50 descriptor removals must be reconciled atomically with consumers; do not remove existing artwork or infer data-URL rewrite safety. |
| 7              | Auth                   | Native Google handoff is adapted; generated Supabase ownership/preview-storage changes remain separate. Live callback/session/profile/role acceptance is open.        |
| 10             | Build/dependencies/E2E | Preserve current OCR/PDF/media guards and server/client boundaries; do not replace the whole Vite stack blindly.                                                      |
| 16             | Email/webhooks         | Native config, bounded signature handling, durable replay/idempotency, canonical backend and redacted provider acknowledgments before any mail-route cutover.         |
| 13             | MCP                    | Trusted security-metadata origins, bounded transport/batches, protocol and fresh-authority tests before replacing the transport.                                      |
| 45             | Provider/UI/route tree | AI endpoint/secret/timeout bounds; Maps key/billing restrictions; Stripe sandbox and return-origin acceptance; QR/printed-link and service-worker compatibility.      |
| 12             | Docs                   | Historical “code complete,” decommission and rotation statements are not current acceptance or authority to execute.                                                  |
| 2              | Environment            | Names/roles only here; never disclose values or assume credentials migrated with source.                                                                              |
| 1              | SQL                    | Historical-dated media URL rewrite remains outside the candidate and requires reviewed before/after recovery.                                                         |

Only the now-unused `@lovable.dev/cloud-auth-js@1.1.2` dependency and its unused
generated wrapper were retired after native Google adoption. Lockfile entries
changed **1,069 → 1,068**, with no other package/lock fields, versions, transitive
dependencies or provider settings changed. Offline lockfile-only npm regeneration
disabled scripts/audit/fund. The removed wrapper remains recoverable in Git.
Email/MCP/webhook/build dependencies, generated Supabase files, preview storage,
routes and SQL are unchanged by this cleanup.

The import guard parses runtime/build source for imports/exports/require/resolve
and statically computed constant targets, including aliases and relative paths.
It is not certification of arbitrary evaluated imports or live provider behavior.
No AI/payment/email provider was selected, enabled, charged or contacted.

## Verification and release state

- **119/119 focused Node checks**, 2.562 seconds, zero failures/skips/cancellations:
  18 Parts reference + 41 remaining-ledger + 39 retired-auth checks (98 new),
  plus 16 existing provenance/helper-proof and five existing inventory checks.
  New checks are never quarantined in CI; counts are not added again to older
  full tooling results.
- Fresh application suite **1,431/1,431 across 65 files**, report checker and full
  TypeScript pass. Full ESLint for all three new guards and formatting/diff checks
  pass. Primary review covers integration; independent review covers Parts
  preservation only. Author self-checks are not independent runtime review.
- Fresh complete-checkout build at `2350e403` passes. Worker verification confirms
  `motorsales365/index.mjs`, canonical backend, 15 OCR/202 PDF assets and server
  browser-engine separation. All **214 tracked public copies** match Git/source/
  output. Existing route-test/config warnings remain separate quality work.
- Prior published exact head `06e21a2e` passed all six CI gates (`38759812700`),
  including real-browser OCR and disposable Parts PostgreSQL. Independent hosting
  build `7f06007f-914b-4484-a3b7-66da30fc8f3b`, check `116512830341`, failed;
  reported output gives only its ID/link, no diagnostic text/annotations/root
  cause. Wrapper `38759812816` preview passes; migration/production steps skip.
  No upload or new-publication-head CI pass is inferred.

Migration impact/deployment: **none**. No live SQL/business/Auth write, history
repair, restriction replay, provider change, paid provisioning, customer message,
PR merge or duplicate automation. Local API/Auth/storage/recovery, trusted
original-human/fresh-role/tenant/native-team/claim/offboarding/private-custody,
financial/stock/consent/mobile/owner acceptance and hosting remain open.

Next: publish these slices on existing PR #68 and verify its exact latest head.
Use the recovered plans and 12/5/2 ledger for action-level acceptance and a reviewed
forward/recovery path, never historical replay. Prepare native email readiness
and strict webhook tests without activating delivery, and continue shared fresh
authority/atomic writer work in parallel. Prepare local synthetic API/Auth/storage
under the sole-hosted-backend requirement; no new hosted project or repeated
staging/cost question. The seven-day target remains subject to actual acceptance.

Supabase guidance preserved source/execution/activation distinctions; documentation
guidance kept recovered proposals separate from current control authority.
