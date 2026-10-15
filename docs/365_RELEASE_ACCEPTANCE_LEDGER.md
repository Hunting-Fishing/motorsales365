# 365 integrated release acceptance ledger

Updated 15 October 2026. Target: 22 October, 21:00 Asia/Manila. This is a delivery
target, not a verified forecast. Scope and daily gates are in
`365_SEVEN_DAY_COMPLETION_PLAN.md`.

## Candidate and status rules

Owner clarification: the sole hosted 365 backend is `wjxaajgvddtrxxtocxen`, API
`https://wjxaajgvddtrxxtocxen.supabase.co`. The 366 AI project
`ujkizgblscqcejghxemb` must remain separate and untouched. A separate hosted staging
project/cost lookup is no longer requested. Use isolated local synthetic testing
and develop a reviewed production-safe acceptance path; do not waive validation,
recovery or release gates or treat a live database as disposable staging.

Integration branch: `completion/365-seven-day-integration`.
Latest source slices: `f46b048d` (unused cloud-auth retirement), `a420a44d`
(Parts reference recovery), `2350e403` (remaining-source ledger/CI).
Prior OAuth source: `c3f6bb9cc11c46246c0662f2030a3056b2287854`, guard follow-up
`b3acef0e` (native Google handoff);
public-asset guard: `75b2304fae26f9572041ff88d3cff86aeeaec5a0`;
staff slice: `ece7e2a0288a9a70be58feeeaefdfe1922fde887`.
Main remains `70ab892a8b7c05eac288ea4a6cce7a002d316f00`.

Published/attached [draft PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68),
stacked on PR #67 at `576fb17d`. Prior head `06e21a2e` passed all six CI gates
(`38759812700`); independent hosting failed. New reconciliation publication needs
its own exact latest-head checks. No upload or new-head pass is claimed.

The dated PR inventory found 59 of the 61 then-open PR heads already ancestors
of the candidate, including CI PR #8. Do not merge those heads again. PR #9
(provider/cutover/auth/assets and a legacy-URL migration) is now fully inventoried,
not adopted. PR #2's missing content is recovered under a pinned non-authoritative
reference namespace; baseline adoption/activation is still separate. This is
commit ancestry and source recovery, not patch parity,
database activation, accepted authority or a claim that 59 features are complete.

This initial ledger groups the known existing workflows; it is **not yet an
exhaustive route/action-to-acceptance inventory**. Day 1 remains in progress until
every existing action and external dependency is reconciled, including nested
Shop Manager, commercial and admin surfaces. Route presence and test counts are
not completion percentages. Preserve the detailed checklist and historical proof.

Status columns mean:

- Source: what is present, including partial implementations and unwired models.
- Integrated: source inclusion in this branch, not activated SQL/provider config.
- Staging: acceptance on isolated data, with actual authenticated roles.
- Owner: designated owner/staff acceptance of that same candidate.
- Live: authorized deployment and verified behavior of that exact full artifact.

No new staging, owner or live acceptance is claimed below. An existing production
route is not evidence that the changed candidate has passed those gates.

## Workflow ledger

| ID / lane          | Workflow and source anchor                                                                                                                                         | Source / integrated state                                                                                   | Staging | Owner   | Live         | Required acceptance / exact remaining dependency                                                                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------- | ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 / release       | Migration provenance, `scripts/ci/migration-provenance.mjs`                                                                                                        | Existing tooling plus typed 12/5/2 ledger; exact 404/423 whole-source mapping unchanged                     | Blocked | Pending | Not verified | Resolve 12 historical source/replay gaps, validate five unapplied candidates and preserve two recorded envelope executions. Verify schema/ACL/trigger provenance and a reviewed forward/recovery path. No destructive history repair or restriction replay.                                                                                             |
| R2 / release       | Identity, roles, team/offboarding, ownership claims; `src/lib/internal-staff.functions.ts` and `docs/evidence/CLAIM_REVISION_INVALIDATION_MODEL.md`                | Staff returned-response/lifetime fixes integrated; authority and claim models are incomplete/unwired        | Blocked | Pending | Not verified | Original-human and fresh session/role/tenant checks, trusted native-team bindings, atomic manager/claim/offboarding protocols, durable retry/audit, private evidence custody and independent-session races. Preserve approved restrictions; do not treat bans as session revocation.                                                                    |
| R3 / release       | Full artifact, hosting, database/private-object recovery                                                                                                           | Complete local build and 214 tracked public copies verified; broader artifact/release acceptance open       | Blocked | Pending | Not verified | Prepare isolated local synthetic API/Auth/storage tests and a reviewed production-safe acceptance path under the sole-hosted-backend requirement; recover hosting logs/configuration; rehearse database/private-object restore and rollback. Actions guard does not govern independent Workers Builds/raw Wrangler. Never deploy earlier sparse output. |
| U0 / identity      | Native Google login/signup, `src/lib/google-oauth.ts`, `src/hooks/use-google-oauth.ts`, login/signup routes                                                        | PR #9 native-client handoff selectively adapted with URL, single-flight and context-lifetime guards         | Not run | Pending | Not verified | Verify approved Google provider/callback and Supabase redirect allowlist, actual implicit callback/session, pending-profile application, permitted account/role transitions and recovery. URL generation is not authentication or provisioning. Generated middleware/wrapper, dependencies and broader PR #9 cutover remain unchanged.                  |
| C1 / CRM           | Receipt image/PDF/manual review, `src/components/vehicle-receipt-panel.tsx`, `src/lib/receipt-document.client.ts`, `src/lib/vehicle-receipts.functions.ts`         | OCR and reviewed-entry foundations included; broader workflow acceptance open                               | Not run | Pending | Not verified | Phone image/PDF/manual correction to confirmed purchase/expense with correct amounts/currency/date/customer/vehicle/work order; no duplicate on retry, originals private. Recover original interrupted scanner/workspace separately or record its unresolved status; do not call source recovery completed by rebuilding.                               |
| C2 / CRM           | Native Customer 360, `src/routes/_authenticated/workspace.customers.$id.tsx`, `src/components/shop-manager/customer-vehicle-activity.tsx`                          | Commercial, communications, reminders and activity readers/UI included; selected SQL candidates not applied | Blocked | Pending | Not verified | Verify same native identities, linked-vehicle consent at read, independent errors/caps, assignments/tasks/reminders and account/shop transitions. Complete release-safe SQL/role boundary before activating consumers.                                                                                                                                  |
| C3 / CRM           | Shop Manager operational/financial loop, `src/routes/_authenticated/workspace.work-orders.$id.tsx`, `src/routes/_authenticated/workspace.invoices.$id.tsx`         | Existing screens and read hardening included; invoice converter integrity unresolved                        | Blocked | Pending | Not verified | Quote to work order to invoice/payment/refund must reconcile labor/parts/tax/due dates/status, stock and idempotent linkage in an authorized atomic transaction. Direct legacy helper restriction does not close indirect quote-conversion bypass or supply a replacement.                                                                              |
| P1 / Parts/history | Parts catalog/fitment/receive/stock, `src/lib/parts-catalog.functions.ts`, `src/lib/parts-ops.functions.ts`, workspace inventory/purchase-order/vendor-bill routes | Existing implementation included; complete operational acceptance open                                      | Not run | Pending | Not verified | Catalog/fitment to order/receive/allocation/installation, returns/warranty and financial reversals must reconcile. Include counter-sale, stock alerts, vendors and margin reports in action-level inventory.                                                                                                                                            |
| P2 / Parts/history | Parts partner network, `src/lib/parts-network-operations.functions.ts`, `src/lib/parts-fulfillment.functions.ts`                                                   | Existing code included; pinned PR #2 reference content recovered; active authority unchanged                | Not run | Pending | Not verified | Reconcile PA1–PA7 below with current operational scope: partner onboarding/catalog/feed/inquiry/order/fulfillment and private cost/commission/report controls. Plan recovery is not baseline adoption or provider/runtime acceptance.                                                                                                                   |
| P3 / Parts/history | Vehicle/component history, `src/lib/vehicle-history.functions.ts`, `src/components/public-vehicle-history.tsx`                                                     | Receipt/installation/history foundations included; consent/tenure corrections unfinished                    | Blocked | Pending | Not verified | Actual installation/removal/replacement, corrections, ownership transfer, consent/revocation, private prior-owner records, report snapshots/source coverage and expiring shares. Purchase must never imply installation.                                                                                                                                |
| U1 / pipelines/UI  | Retail lead pipeline, `src/routes/dashboard.team.leads.tsx`, `src/lib/leads.functions.ts`                                                                          | Existing lead/team screens included; full retail journey not accepted                                       | Not run | Pending | Not verified | Separate stage definitions, assignment permissions, tasks/reminders, conversion and performance reports; prevent tenant leakage and duplicate conversion. Synthetic communications only.                                                                                                                                                                |
| U2 / pipelines/UI  | Business recruitment, `src/lib/partner-applications.functions.ts`, `src/routes/admin.partner-program.tsx`                                                          | Application/program surfaces included; separate recruitment pipeline not verified                           | Not run | Pending | Not verified | Reconcile existing application/claim/onboarding actions into distinct recruitment stages, assignments, follow-ups and conversion reporting. Do not equate an application form with a complete CRM pipeline.                                                                                                                                             |
| U3 / pipelines/UI  | Marketplace/directory/accounts, listings/search/messages, `src/routes/businesses.index.tsx`, `src/lib/marketplace-search.ts`                                       | Existing surfaces included; action-level scope inventory incomplete                                         | Not run | Pending | Not verified | Test listing/search/detail/account/onboarding/moderation and private messaging across permitted roles. Include existing directory, bookings and dispatch rather than silently dropping them.                                                                                                                                                            |
| U4 / pipelines/UI  | Learn, partner/franchise and staff academy, `src/routes/learn.index.tsx`, `src/routes/franchise.apply.tsx`, `src/routes/dashboard.partner.tsx`                     | Existing surfaces included; external program proposals remain separate                                      | Not run | Pending | Not verified | Enumerate and test current enrollment/content/progress/application/referral/admin actions and entitlements. Licensed repair feeds, government/insurer feeds, hardware and new-country programs need separate decisions/access.                                                                                                                          |
| U5 / pipelines/UI  | Existing billing/entitlements, `src/lib/billing.functions.ts`, `src/routes/dashboard.business.$businessId.billing.tsx`                                             | Existing billing/checkout code included; provider/cutover PR #9 not reconciled                              | Blocked | Pending | Not verified | Verify test-mode subscription/entitlement/checkout/webhook/refund and financial reconciliation with approved configuration. No real charges, new settlement/legal model or customer communications.                                                                                                                                                     |
| U6 / pipelines/UI  | Professional role-based UI, staff view and all above journeys                                                                                                      | Staff labels, error/loading/private-context behavior improved; full visual/accessibility work unfinished    | Not run | Pending | Not verified | Owner/manager/advisor/parts/technician/permitted-admin desktop/phone journeys, keyboard/accessibility, navigation, loading/error/empty states, account-switch privacy and performance. Component mocks are not visual/mobile acceptance.                                                                                                                |
| R4 / release       | Final owner/staff pilot, monitoring/support/release                                                                                                                | Seven-day plan saved and candidate established; release prerequisites open                                  | Blocked | Pending | Not verified | Name pilot/test accounts, run financial/stock/privacy/recovery acceptance on one full candidate, obtain required release approval, deploy through gated full-artifact workflow and check actual live behavior.                                                                                                                                          |

Lane assignments describe sequencing, not guaranteed builder capacity. Three
bounded agents were available for this reconciliation run with non-overlapping
ownership and no branch changes; capacity must be checked again when needed.
Do not promise parallel throughput or continuous execution
between scheduled turns.

## Current verified slice

Parts reference recovery, remaining-source categorization and unused cloud-auth
retirement are verified at the latest source slices above. Fresh 119/119 Node
checks comprise 18 reference, 41 remaining-ledger, 39 retired-auth (98 new), 16 existing
provenance/helper-evidence and five inventory checks. All pass without quarantine;
new guards are explicit in CI. Application 1,431/1,431 across 65 files, report
checker/full TypeScript/new-guard lint/format/diff pass. Fresh full build/Worker/
214-file Git-source-output checks pass at `2350e403`. See
`evidence/PARTS_AND_PROVIDER_RECONCILIATION.md`.

All 11 recovered Parts originals match pinned PR #2 Git blobs; active specialist
plans are unchanged. Gate collisions, historical links, commercial-decision
numbering and future country/lane/capital limits are explicit. Independent review
found no actionable preservation/authority errors; this is not runtime review.
The 19-source ledger distinguishes 12 historical unresolved/five recorded-unapplied/
two recorded embedded executions, without promoting exact 404/423 or any release
flag. The PR #9 URL rewrite is absent/outside 423. The one retired lock entry has
no transitive removals or other package-field/version changes; all other provider/
build/Auth configuration remains. Original-human/API/roles/private-files/recovery/
hosting/owner acceptance remains open.

Native Google handoff at `c3f6bb9c` / `b3acef0e` selectively replaces the two
Lovable auth callers with the existing canonical 365 client. Callback/provider
URL checks, shared form locks and context lifetimes are implemented without
claiming session creation or provisioning. Required signup details/terms and the
existing pending-profile snapshot remain. All 98 new tests are included in the
fresh 1,431/1,431 application suite across 65 files (105.08s); report checker,
full TypeScript and changed-line lint pass, zero new warnings/quarantine. See
`evidence/NATIVE_GOOGLE_OAUTH_HANDOFF.md`. Live Google/session/role acceptance
and the rest of PR #9 remain open; no SQL or provider configuration changed.
Fresh complete build, Worker target/OCR/PDF boundary and 214-file Git/source/output
guard pass at formatting follow-up `8e1be6ac`. Release/report/inventory tests65/65
and assets10/10 pass separately. No upload or wider artifact/runtime approval.

Staff manager changes now require an exact returned row. Account creation
distinguishes an acknowledged profile update from a partial/unknown outcome;
uncertain creation locks controls only within the mounted account scope.
Sign-in restriction is explicitly not full offboarding or verified revocation.
Private staff forms/queries and pending callbacks are scoped to account/admin/
snapshot/dialog lifetimes. These changes do not repair underlying mutable-role,
target-eligibility or concurrent writer authority.

At code `ece7e2a`: 93 focused regressions, included in 1,333/1,333 application tests
across 62 files; TypeScript, changed-file ESLint and build pass. Fifteen inventory/
report/release guards and ten OCR/PDF asset checks also pass. No live business
request, database migration, provider account creation or deployment was tested.
Detailed commands, limitations and metadata discoveries are in
`evidence/SEVEN_DAY_INTEGRATION_STAFF_ACKNOWLEDGMENT.md`.

Public-media follow-up at `75b2304f`: the checkout is no longer sparse and a fresh
build passes exact Git/source/output checks for all 214 tracked public files.
The new fail-closed guard precedes CI packaging and both Actions upload paths;
50 new regressions plus 15 existing guards pass 65/65, OCR/PDF assets 10/10.
See `evidence/COMPLETE_PUBLIC_ASSET_RELEASE_GUARD.md` for test commands, the
independent-hosting boundary and unchanged release prerequisites. This clears
local missing-media verification, not staging/owner/live acceptance.

## Parts acceptance inputs

These recovered requirements must be reconciled with the existing software scope;
they are not seven newly completed features or a replacement for the full action
inventory. Unbuilt proposed controls need an explicit gap/scope decision, not an
invented test pass or silent omission. No group below has runtime/owner acceptance.

| ID  | Acceptance group              | Required evidence and boundary                                                                                                                                                                                                                           |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PA1 | Operational authority         | Original-human/fresh-session organization/location memberships, permitted roles and offboarding isolation across actual Parts actions; selectors and mutable profile values are not authority.                                                           |
| PA2 | Catalog and fitment           | Licensed/source-attributed catalog, seller-item mapping, quarantine/correction, supersession and domain-specific fitment. AI or unverified suggestions cannot establish confirmed fitment. Anchor: `src/lib/parts-catalog.functions.ts`.                 |
| PA3 | Private stock and publication | Consent, freshness/expiry, revocation, no private cost/bin/customer leakage; concurrent reservation and atomic expiry/release/consume. Anchor: `src/lib/parts-network-operations.functions.ts`.                                                          |
| PA4 | Recoverable order snapshots   | Seller/entity, price/tax/currency/policy, stock and payment/refund/fee/payout snapshots; duplicate callback handling and recovery. Existing billing does not authorize a new settlement/legal model. Anchor: `src/lib/parts-fulfillment.functions.ts`.   |
| PA5 | Shop Manager consumption      | Need → approved offer/reservation → purchase/partial receive/variance → issue → actual installation/outcome → invoice; return/core/warranty and stock/financial reversals. Purchase never proves installation. Anchor: `src/lib/parts-ops.functions.ts`. |
| PA6 | Quality and traceability gaps | Reconcile supplier/source approval, receiving quarantine, lot/serial custody, cause-specific warranty/CAPA and stop-sale/recall tracing to stock/orders/installations. Preserved quality plan is requirements input, not evidence these controls exist.  |
| PA7 | Philippine pilot readiness    | Named cohort/limits, support/stop thresholds, legal/finance/provider decisions, reconciliation/recovery/incident tests and owner acceptance. Preserved country pack is draft evidence checklist, not an activated market.                                |

Reference sources, authority crosswalk and commercial/expansion limits:
`reference/parts-pr2/README.md` and `reference/parts-pr2/manifest.json`.

## Next actions and owner dependencies

1. Verify existing PR #68's exact latest published CI head; continue on the same
   branch/PR. Do not substitute prior `06e21a2e` green CI for new-head checks.
2. Continue the remaining PR #9 reconciliation, including provider/generated middleware,
   configuration, assets and its legacy-URL migration. Do not expose tracked
   `.env` contents or bulk merge the provider cleanup. Prepare native email
   readiness/signature tests without activating delivery. Use the recovered PR #2
   source/crosswalk; formal baseline/activation acceptance is not granted.
3. Complete action-level feature acceptance. Use the pinned 12/5/2 remaining-source
   ledger for a reviewed forward/recovery path; preserve exact 404/423 and do not
   replay recorded restrictions or repeat already completed source proof.
4. Owner requires `wjxaajgvddtrxxtocxen` as the only hosted 365 backend. The earlier
   separate-project/cost question is superseded; do not repeat it. Prepare isolated
   local synthetic testing and a reviewed production-safe acceptance path without
   repurposing another business's project, creating a hosted target or waiving gates.
   No new costs, project creation or production mutation are authorized here.
5. Owner: nominate the pilot shop and owner/staff test accounts (names/test IDs
   only). This earlier question remains open. Safe local work uses synthetic data.
6. Close trusted original-actor/fresh authority and native-team/offboarding/claim
   mutation boundaries with actual transaction and recovery tests, then validate
   the complete candidate through the agreed safe acceptance path. Docker Desktop
   is stopped/unavailable; 1.93 GiB free of 15.71 GiB RAM was observed. No local
   independent-session API/Auth/storage/PostgreSQL acceptance is claimed and no
   daemon was started or image downloaded.
7. Reassess the seven-day target by Day 2 using actual integrated acceptance,
   not draft PR count. Report exact deadline-threatening gaps and options early.

No scope is silently dropped. ERPNext and Dolibarr remain recovered alternatives,
not selected or installed. Existing production restrictions are preserved without
replay. Production, migration history and paid resources remain unchanged.
