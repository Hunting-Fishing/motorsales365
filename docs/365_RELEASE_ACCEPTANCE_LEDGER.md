# 365 integrated release acceptance ledger

Updated 15 October 2026. Target: 22 October, 21:00 Asia/Manila. This is a delivery
target, not a verified forecast. Scope and daily gates are in
`365_SEVEN_DAY_COMPLETION_PLAN.md`.

## Candidate and status rules

Integration branch: `completion/365-seven-day-integration`.
Source slice: `ece7e2a0288a9a70be58feeeaefdfe1922fde887`.
Main remains `70ab892a8b7c05eac288ea4a6cce7a002d316f00`.

The dated PR inventory found 59 of the 61 then-open PR heads already ancestors
of the candidate, including CI PR #8. Do not merge those heads again. PR #9
(provider/cutover/auth/assets and a legacy-URL migration) and PR #2 (Parts plan)
need separate content reconciliation. This is commit ancestry, not patch parity,
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

| ID / lane          | Workflow and source anchor                                                                                                                                         | Source / integrated state                                                                                   | Staging | Owner   | Live         | Required acceptance / exact remaining dependency                                                                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------- | ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 / release       | Migration provenance, `scripts/ci/migration-provenance.mjs`                                                                                                        | Existing tooling included; last composed mapping 404/423, 19 unclassified                                   | Blocked | Pending | Not verified | Classify the remaining entries against this candidate; verify actual schema/ACL/trigger provenance and a reviewed forward path. No destructive history repair.                                                                                                                                                            |
| R2 / release       | Identity, roles, team/offboarding, ownership claims; `src/lib/internal-staff.functions.ts` and `docs/evidence/CLAIM_REVISION_INVALIDATION_MODEL.md`                | Staff returned-response/lifetime fixes integrated; authority and claim models are incomplete/unwired        | Blocked | Pending | Not verified | Original-human and fresh session/role/tenant checks, trusted native-team bindings, atomic manager/claim/offboarding protocols, durable retry/audit, private evidence custody and independent-session races. Preserve approved restrictions; do not treat bans as session revocation.                                      |
| R3 / release       | Full artifact, hosting, database/private-object recovery                                                                                                           | Local app build succeeds; no full-media release artifact accepted                                           | Blocked | Pending | Not verified | Nominate isolated staging; recover authenticated hosting build logs, full media and provider configuration; rehearse database plus private-object restore and rollback. Sparse local artifact must never deploy.                                                                                                          |
| C1 / CRM           | Receipt image/PDF/manual review, `src/components/vehicle-receipt-panel.tsx`, `src/lib/receipt-document.client.ts`, `src/lib/vehicle-receipts.functions.ts`         | OCR and reviewed-entry foundations included; broader workflow acceptance open                               | Not run | Pending | Not verified | Phone image/PDF/manual correction to confirmed purchase/expense with correct amounts/currency/date/customer/vehicle/work order; no duplicate on retry, originals private. Recover original interrupted scanner/workspace separately or record its unresolved status; do not call source recovery completed by rebuilding. |
| C2 / CRM           | Native Customer 360, `src/routes/_authenticated/workspace.customers.$id.tsx`, `src/components/shop-manager/customer-vehicle-activity.tsx`                          | Commercial, communications, reminders and activity readers/UI included; selected SQL candidates not applied | Blocked | Pending | Not verified | Verify same native identities, linked-vehicle consent at read, independent errors/caps, assignments/tasks/reminders and account/shop transitions. Complete release-safe SQL/role boundary before activating consumers.                                                                                                    |
| C3 / CRM           | Shop Manager operational/financial loop, `src/routes/_authenticated/workspace.work-orders.$id.tsx`, `src/routes/_authenticated/workspace.invoices.$id.tsx`         | Existing screens and read hardening included; invoice converter integrity unresolved                        | Blocked | Pending | Not verified | Quote to work order to invoice/payment/refund must reconcile labor/parts/tax/due dates/status, stock and idempotent linkage in an authorized atomic transaction. Direct legacy helper restriction does not close indirect quote-conversion bypass or supply a replacement.                                                |
| P1 / Parts/history | Parts catalog/fitment/receive/stock, `src/lib/parts-catalog.functions.ts`, `src/lib/parts-ops.functions.ts`, workspace inventory/purchase-order/vendor-bill routes | Existing implementation included; complete operational acceptance open                                      | Not run | Pending | Not verified | Catalog/fitment to order/receive/allocation/installation, returns/warranty and financial reversals must reconcile. Include counter-sale, stock alerts, vendors and margin reports in action-level inventory.                                                                                                              |
| P2 / Parts/history | Parts partner network, `src/lib/parts-network-operations.functions.ts`, `src/lib/parts-fulfillment.functions.ts`                                                   | Existing code included; PR #2 plan content still needs reconciliation                                       | Not run | Pending | Not verified | Partner onboarding/catalog/feed/inquiry/order/fulfillment and scoped private cost/commission/report actions; do not infer external feed/provider operation from route presence.                                                                                                                                           |
| P3 / Parts/history | Vehicle/component history, `src/lib/vehicle-history.functions.ts`, `src/components/public-vehicle-history.tsx`                                                     | Receipt/installation/history foundations included; consent/tenure corrections unfinished                    | Blocked | Pending | Not verified | Actual installation/removal/replacement, corrections, ownership transfer, consent/revocation, private prior-owner records, report snapshots/source coverage and expiring shares. Purchase must never imply installation.                                                                                                  |
| U1 / pipelines/UI  | Retail lead pipeline, `src/routes/dashboard.team.leads.tsx`, `src/lib/leads.functions.ts`                                                                          | Existing lead/team screens included; full retail journey not accepted                                       | Not run | Pending | Not verified | Separate stage definitions, assignment permissions, tasks/reminders, conversion and performance reports; prevent tenant leakage and duplicate conversion. Synthetic communications only.                                                                                                                                  |
| U2 / pipelines/UI  | Business recruitment, `src/lib/partner-applications.functions.ts`, `src/routes/admin.partner-program.tsx`                                                          | Application/program surfaces included; separate recruitment pipeline not verified                           | Not run | Pending | Not verified | Reconcile existing application/claim/onboarding actions into distinct recruitment stages, assignments, follow-ups and conversion reporting. Do not equate an application form with a complete CRM pipeline.                                                                                                               |
| U3 / pipelines/UI  | Marketplace/directory/accounts, listings/search/messages, `src/routes/businesses.index.tsx`, `src/lib/marketplace-search.ts`                                       | Existing surfaces included; action-level scope inventory incomplete                                         | Not run | Pending | Not verified | Test listing/search/detail/account/onboarding/moderation and private messaging across permitted roles. Include existing directory, bookings and dispatch rather than silently dropping them.                                                                                                                              |
| U4 / pipelines/UI  | Learn, partner/franchise and staff academy, `src/routes/learn.index.tsx`, `src/routes/franchise.apply.tsx`, `src/routes/dashboard.partner.tsx`                     | Existing surfaces included; external program proposals remain separate                                      | Not run | Pending | Not verified | Enumerate and test current enrollment/content/progress/application/referral/admin actions and entitlements. Licensed repair feeds, government/insurer feeds, hardware and new-country programs need separate decisions/access.                                                                                            |
| U5 / pipelines/UI  | Existing billing/entitlements, `src/lib/billing.functions.ts`, `src/routes/dashboard.business.$businessId.billing.tsx`                                             | Existing billing/checkout code included; provider/cutover PR #9 not reconciled                              | Blocked | Pending | Not verified | Verify test-mode subscription/entitlement/checkout/webhook/refund and financial reconciliation with approved configuration. No real charges, new settlement/legal model or customer communications.                                                                                                                       |
| U6 / pipelines/UI  | Professional role-based UI, staff view and all above journeys                                                                                                      | Staff labels, error/loading/private-context behavior improved; full visual/accessibility work unfinished    | Not run | Pending | Not verified | Owner/manager/advisor/parts/technician/permitted-admin desktop/phone journeys, keyboard/accessibility, navigation, loading/error/empty states, account-switch privacy and performance. Component mocks are not visual/mobile acceptance.                                                                                  |
| R4 / release       | Final owner/staff pilot, monitoring/support/release                                                                                                                | Seven-day plan saved and candidate established; release prerequisites open                                  | Blocked | Pending | Not verified | Name pilot/test accounts, run financial/stock/privacy/recovery acceptance on one full candidate, obtain required release approval, deploy through gated full-artifact workflow and check actual live behavior.                                                                                                            |

Lane assignments describe sequencing, not four currently available builders.
Additional-agent capacity is unavailable in the last observed run; primary-agent
work continues. Do not promise parallel throughput or continuous execution
between scheduled turns.

## Current verified slice

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

## Next actions and owner dependencies

1. Publish this source-bearing candidate slice; verify its exact latest CI head.
   Do not substitute PR #67's green CI for the new head's checks.
2. Reconcile PR #9 selectively, including provider/auth/generated middleware,
   configuration, assets and its legacy-URL migration. Do not expose tracked
   `.env` contents or bulk merge the provider cleanup. Reconcile PR #2 plan separately.
3. Complete the action-level feature inventory and classify the 19 outstanding
   migration entries on this candidate while shared authority work continues.
4. Owner: nominate an **existing isolated Supabase staging project**, or connect
   access to one. Connected discovery shows no separate 365 staging target.
   The default main branch is not isolation; do not repurpose another business's
   database or provision paid resources without approval. A question is already
   open in this chat; no passwords or keys requested.
5. Owner: nominate the pilot shop and owner/staff test accounts (names/test IDs
   only). This earlier question remains open. Safe local work uses synthetic data.
6. Close trusted original-actor/fresh authority and native-team/offboarding/claim
   mutation boundaries with actual transaction and recovery tests, then promote
   the complete approved candidate to staging. Docker CLI exists locally but its
   Linux engine is unavailable; no local independent-session PostgreSQL evidence
   is claimed and no daemon was started or image downloaded.
7. Reassess the seven-day target by Day 2 using actual integrated acceptance,
   not draft PR count. Report exact deadline-threatening gaps and options early.

No scope is silently dropped. ERPNext and Dolibarr remain recovered alternatives,
not selected or installed. Existing production restrictions are preserved without
replay. Production, migration history and paid resources remain unchanged.
