# 365 integrated release acceptance ledger

Updated 16 October 2026. Target: 22 October, 21:00 Asia/Manila. This is a delivery
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
Latest source slice: `0c23d336` (invoice read lifetimes and financial caller acknowledgments).
Prior source slices: `0271fc09` (inactive native Auth reservation/receipt and bounded provider attempt),
`0dfac563` (unwired native Auth planner/first-email rendering).
Prior source slices: `5e5d5f8a` (unwired webhook verifier), `65475626`
(unsubscribe acknowledgment/UI), test-type follow-up `3f829a6b`.
Prior slices: `f46b048d` (unused cloud-auth retirement), `a420a44d`
(Parts reference recovery), `2350e403` (remaining-source ledger/CI).
Prior OAuth source: `c3f6bb9cc11c46246c0662f2030a3056b2287854`, guard follow-up
`b3acef0e` (native Google handoff);
public-asset guard: `75b2304fae26f9572041ff88d3cff86aeeaec5a0`;
staff slice: `ece7e2a0288a9a70be58feeeaefdfe1922fde887`.
Main remains `70ab892a8b7c05eac288ea4a6cce7a002d316f00`.

Published/attached [draft PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68),
stacked on PR #67 at `576fb17d`. Prior published `d101f650` passed all six CI gates
(`38778102213`), including browser OCR and disposable Parts Postgres. Independent
hosting build `60d22afc-094a-4845-8d6e-f87a1e4e5cfe` failed with ID/link only,
without root-cause text/annotations. Wrapper `38778102490` preview passed and
migration/production skipped. Authenticated hosting diagnostics remain needed. New
publication requires exact latest-head checks. No upload or new-head pass is claimed.

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
| C3 / CRM           | Shop Manager operational/financial loop, `src/routes/_authenticated/workspace.work-orders.$id.tsx`, `src/routes/_authenticated/workspace.invoices.$id.tsx`         | Invoice caller lifetimes/returned rows hardened; quote/conversion and atomic writers unresolved             | Blocked | Pending | Not verified | Quote to work order to invoice/payment/refund must reconcile labor/parts/tax/due dates/status, stock and idempotent linkage in an authorized atomic transaction. Caller acknowledgments are not durable dedupe, stock/posting/recovery proof. Direct legacy helper restriction does not close indirect quote-conversion bypass or supply a replacement. |
| P1 / Parts/history | Parts catalog/fitment/receive/stock, `src/lib/parts-catalog.functions.ts`, `src/lib/parts-ops.functions.ts`, workspace inventory/purchase-order/vendor-bill routes | Existing implementation included; complete operational acceptance open                                      | Not run | Pending | Not verified | Catalog/fitment to order/receive/allocation/installation, returns/warranty and financial reversals must reconcile. Include counter-sale, stock alerts, vendors and margin reports in action-level inventory.                                                                                                                                            |
| P2 / Parts/history | Parts partner network, `src/lib/parts-network-operations.functions.ts`, `src/lib/parts-fulfillment.functions.ts`                                                   | Existing code included; pinned PR #2 reference content recovered; active authority unchanged                | Not run | Pending | Not verified | Reconcile PA1–PA7 below with current operational scope: partner onboarding/catalog/feed/inquiry/order/fulfillment and private cost/commission/report controls. Plan recovery is not baseline adoption or provider/runtime acceptance.                                                                                                                   |
| P3 / Parts/history | Vehicle/component history, `src/lib/vehicle-history.functions.ts`, `src/components/public-vehicle-history.tsx`                                                     | Receipt/installation/history foundations included; consent/tenure corrections unfinished                    | Blocked | Pending | Not verified | Actual installation/removal/replacement, corrections, ownership transfer, consent/revocation, private prior-owner records, report snapshots/source coverage and expiring shares. Purchase must never imply installation.                                                                                                                                |
| U1 / pipelines/UI  | Retail lead pipeline, `src/routes/dashboard.team.leads.tsx`, `src/lib/leads.functions.ts`                                                                          | Existing lead/team screens included; full retail journey not accepted                                       | Not run | Pending | Not verified | Separate stage definitions, assignment permissions, tasks/reminders, conversion and performance reports; prevent tenant leakage and duplicate conversion. Synthetic communications only.                                                                                                                                                                |
| U2 / pipelines/UI  | Business recruitment, `src/lib/partner-applications.functions.ts`, `src/routes/admin.partner-program.tsx`                                                          | Application/program surfaces included; separate recruitment pipeline not verified                           | Not run | Pending | Not verified | Reconcile existing application/claim/onboarding actions into distinct recruitment stages, assignments, follow-ups and conversion reporting. Do not equate an application form with a complete CRM pipeline.                                                                                                                                             |
| U3 / pipelines/UI  | Marketplace/directory/accounts, listings/search/messages, `src/routes/businesses.index.tsx`, `src/lib/marketplace-search.ts`                                       | Existing surfaces included; action-level scope inventory incomplete                                         | Not run | Pending | Not verified | Test listing/search/detail/account/onboarding/moderation and private messaging across permitted roles. Include existing directory, bookings and dispatch rather than silently dropping them.                                                                                                                                                            |
| U4 / pipelines/UI  | Learn, partner/franchise and staff academy, `src/routes/learn.index.tsx`, `src/routes/franchise.apply.tsx`, `src/routes/dashboard.partner.tsx`                     | Existing surfaces included; external program proposals remain separate                                      | Not run | Pending | Not verified | Enumerate and test current enrollment/content/progress/application/referral/admin actions and entitlements. Licensed repair feeds, government/insurer feeds, hardware and new-country programs need separate decisions/access.                                                                                                                          |
| U5 / pipelines/UI  | Existing billing/entitlements, `src/lib/billing.functions.ts`, `src/routes/dashboard.business.$businessId.billing.tsx`                                             | Existing billing/checkout code included; provider/cutover PR #9 not reconciled                              | Blocked | Pending | Not verified | Verify test-mode subscription/entitlement/checkout/webhook/refund and financial reconciliation with approved configuration. No real charges, new settlement/legal model or customer communications.                                                                                                                                                     |
| U6 / pipelines/UI  | Professional role-based UI, staff view and all above journeys                                                                                                      | Staff labels, error/loading/private-context behavior improved; full visual/accessibility work unfinished    | Not run | Pending | Not verified | Owner/manager/advisor/parts/technician/permitted-admin desktop/phone journeys, keyboard/accessibility, navigation, loading/error/empty states, account-switch privacy and performance. Component mocks are not visual/mobile acceptance.                                                                                                                |
| U7 / providers     | Native Auth/transactional email and unsubscribe, `src/lib/email/native-auth-email-reservation.server.ts`, `src/lib/email/resend-auth-attempt.server.ts`            | Verifier/planner/reservation/receipt/provider boundary unwired; first-email and unsubscribe fixes included  | Blocked | Pending | Not verified | Actual atomic ingress/slot/consent/lease/fenced completion writers and real transaction/recovery tests; action/callback/native settings, suppression/backlog classification, provider compatibility/correlation and sender/hook/controlled-recipient acceptance. Receipt comparison/fake transport is not durable or live delivery. No cutover/send.    |
| R4 / release       | Final owner/staff pilot, monitoring/support/release                                                                                                                | Seven-day plan saved and candidate established; release prerequisites open                                  | Blocked | Pending | Not verified | Name pilot/test accounts, run financial/stock/privacy/recovery acceptance on one full candidate, obtain required release approval, deploy through gated full-artifact workflow and check actual live behavior.                                                                                                                                          |

Lane assignments describe sequencing, not guaranteed builder capacity. Three
bounded agents were available for this reconciliation run with non-overlapping
ownership and no branch changes; capacity must be checked again when needed.
Do not promise parallel throughput or continuous execution
between scheduled turns.

## Shop Manager financial action inventory

Bounded source scan at `0271fc09`, invoice caller update at `0c23d336`; not exhaustive application inventory. These
ported actions use browser `smSupabase` scoped by `src/lib/shop-manager/db.ts`,
not connected dedicated financial command handlers. Every row remains staging/API
unverified, owner pending and live unverified. Existing component/SDK mocks do not
establish JWT/RLS, monetary/stock transactions or recovery acceptance.

| ID    | Existing action and route anchor                                                                       | Required closure                                                                                                                                                                                                                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C3.01 | Browse/open quotes; `workspace.quotes.tsx:31`, `workspace.quotes.$id.tsx:47`                           | Account/shop-scoped caches, bounded complete items and generic errors; no direct quote-route tests located.                                                                                                                                                                       |
| C3.02 | Create quote/items; `workspace.quotes.new.tsx:116`                                                     | Separate header/items can partially commit. Verify current shop/customer/vehicle, amounts/date/number, retry identity and atomic creation.                                                                                                                                        |
| C3.03 | Convert quote; `workspace.quotes.$id.tsx:103`                                                          | Four separate writes and source-item readiness/mappings/shop binding; atomic authorized conversion and idempotency required.                                                                                                                                                      |
| C3.04 | Browse/create work order; `workspace.work-orders.tsx:29`, `workspace.work-orders.new.tsx:110`          | Unscoped list/options, current shop/customer/vehicle binding, returned-row/late callback and retry tests.                                                                                                                                                                         |
| C3.05 | Open work order/change status; `workspace.work-orders.$id.tsx:227`, `:379`                             | Existing mocked detail readiness/lifetime tests; affected-row confirmation, authorized transitions and actual API acceptance remain.                                                                                                                                              |
| C3.06 | Add/remove labor; `workspace.work-orders.$id.tsx:858`, `:398`                                          | Existing draft/late-callback mocks; finite amounts, affected rows, billing locks and authoritative totals reconciliation remain.                                                                                                                                                  |
| C3.07 | Add/remove parts; `workspace.work-orders.$id.tsx:987`, `:418`                                          | Existing caller mocks; atomic stock reservation/issue/actual installation and reversals remain.                                                                                                                                                                                   |
| C3.08 | Add/delete billable time; `src/components/shop-manager/work-order-time-entries.tsx:86`, `:243`, `:100` | Existing scoped child-card mocks; define labor/time billing contract, since current invoice generation does not consume these entries.                                                                                                                                            |
| C3.09 | Generate invoice; `workspace.work-orders.$id.tsx:293`                                                  | Existing incomplete-source/partial-write warnings; due date, field mapping, atomic header/items/work-order link, concurrent retries and reviewed tax/stock policy remain.                                                                                                         |
| C3.10 | Browse/open invoice/items/payments; `workspace.invoices.tsx:196`, `workspace.invoices.$id.tsx:324`     | Current-account/per-mount private lifetimes, bounded visible counts, independent errors and recorded-balance semantics hardened with 133 combined route tests. Real-role visibility, pagination/authoritative aggregates and reconciliation remain.                               |
| C3.11 | Add inventory invoice line; `workspace.invoices.$id.tsx:1095`                                          | Insert/read/tax/totals acknowledgments, numeric/stock preflight and current-editor uncertainty hold implemented. Separate writes remain non-atomic; stock reservation/issue/posting/reversal, concurrency and recovery acceptance required.                                       |
| C3.12 | Record payment; `workspace.invoices.$id.tsx:890`                                                       | Returned payment/conditional invoice rows and late/unknown outcomes checked; generated receipt references supported. Hold is mounted-view only. Atomic durable dedupe, exact decimal/tax/status/overpayment/adjustment policy, concurrent transactions and reconciliation remain. |
| C3.13 | Request/decide refund, void or credit approval; `workspace.operations.tsx:180`, `:205`                 | Approval RPCs record request/decision, not financial execution. Verify entity binding and fresh authority/role/RPC acceptance.                                                                                                                                                    |
| C3.14 | Execute native refund/void and reconcile; approval labels `workspace.operations.tsx:69`                | No connected native execution handler located in this bounded scan. Invoice display exclusions/caller restrictions do not execute refunds or adjustments. Keep as an explicit implementation gap; approval/display is not completion.                                             |

Route anchors above are under `src/routes/_authenticated/` unless given in full.
Existing `work-order-detail.test.tsx` and `work-order-child-cards.test.tsx` cover
mocked caller boundaries. New `invoice-detail.test.tsx` (70) and `invoice-list.test.tsx`
(63) cover actual routes with a real QueryClient and synthetic SDK responses.
Customer 360 commercial tests cover summary reads, not these quote screens.
`payments-manual.smoke.test.ts` covers
marketplace/admin payments, not native `shop_manager.payments`.

Next safe implementation is C3.01–C3.04: quote/work-order list/create/conversion
account/shop/target binding, source readiness and returned-row/late callback
tests. Use the existing deferred browser-builder and real QueryClient harness;
do not repeat invoice C3.10–C3.12 caller proofs. Unknown writes must stay visibly uncertain; no invented
rollback, durable dedupe, paid state or stock posting. Atomic financial/stock and
original-human/fresh-role authority remain release prerequisites.

## Current verified slice

Invoice caller safety at `0c23d336`: 133/133 focused tests (70 detail +63 list,
11.85s), fresh full application 2,176/2,176 across 74 files (129.13s), report
checker/full TypeScript/targeted lint/format/diff pass, zero failures/skips/
quarantine. Both new suites are explicit never-quarantined CI gates. Independent
review corrections cover private cache lifetimes, false empty states, numeric
display/preflight and optimistic customer binding. Visible-row completeness and
returned financial rows are not whole-ledger visibility, fresh authority,
transaction/idempotency/stock/settlement/recovery or mobile acceptance. Shared
uncertainty hold ends on unmount/reload; direct and concurrent callers remain.
Unsupported decimal/adjustment/overpayment requirements and PDF export remain
explicit, not silently removed. No SQL/history/live mutation/provider activation
or application upload. Exact checks, retained trigger risks and next dependency:
`evidence/NATIVE_INVOICE_ACKNOWLEDGMENTS.md`.

Fresh complete build/Worker/canonical backend/OCR/PDF/server-boundary and all 214
tracked public Git/source/output checks pass at `0c23d336`; changed-line lint
across four files has zero errors/warnings/pre-existing findings. Source guards
103/103 (2.557s) and release/report/inventory/assets 75/75 (8.348s) pass, with five
overlapping inventory tests not double-counted. Existing build warnings remain;
packaging is not runtime, transaction, recovery or owner acceptance.

### Previous Auth delivery-boundary slice

Inactive native Auth reservation/receipt and provider boundary at `0271fc09`:
198 new focused tests (86 reservation +112 provider), combined email chain 550/550
across five files (2.30s), independent review, full TypeScript/targeted lint/
changed-line lint/format/diff pass. Source guards 103/103 and release/report/assets
75/75 pass, with five overlapping inventory tests not double-counted.
Every same-plan recipient and exact private body/key/fingerprint is bound;
original source identity is version-independent. Strict queue receipts remain
comparison only. HTTP attempts are bounded, explicit/injected and never infer
delivery or retry from timeout/malformed acknowledgment. No SQL/queue/hook/provider
activation, live writes/emails or application upload. Exact full integration and
artifact results: `evidence/NATIVE_AUTH_EMAIL_DELIVERY_BOUNDARY.md`.
Fresh full application 2,043/2,043 across 72 files (152.91s), report checker and full
TypeScript pass; all 198 new tests included, zero failures/skips/quarantine.
Fresh complete build/Worker/backend/OCR/PDF/server-boundary and all 214 tracked
public Git/source/output checks pass at `0271fc09`. Build warnings remain; this
is local packaging, not upload, runtime/owner or complete release acceptance.

### Previous Auth planning slice

Native Auth command planning and first-address rendering are implemented at
`0dfac563`, intentionally unwired. The planner uses current verifier-instance
provenance, explicit snapshotted canonical policy, native action/recipient/URL
validation, secure and first-email mappings, immutable commands and stable
body/policy/event/recipient identities. Its comparison helper is not a durable
reservation, storage proof or enqueue. Six actions are supported; eight documented
other/notification actions and remaining callback/cohort coverage are activation
gates. Actual secret/project/sender/Auth-setting ownership remains unverified.

Focused 352/352 (212 new planner + seven new render + 133 existing verifier), full
application 1,845/1,845 across 70 files (144.15s), report checker/full TypeScript/
targeted lint/format/diff and independent review pass. All 219 new tests are included
in the full total, not added twice. Source guards 103/103 and release/report/
inventory/assets 75/75 pass (five inventory tests overlap). See
`evidence/NATIVE_AUTH_EMAIL_PLAN.md` for artifact verification and native-source
mapping. No SQL, native hook activation, provider change, live write or deploy.
Fresh complete build/Worker/backend/OCR/PDF/browser-engine and all 214 tracked
public Git/source/output checks pass at `0dfac563`; changed-line lint has zero
errors/warnings. Existing build warnings remain; local artifact verification is
not upload or live acceptance.

### Previous email acknowledgment slice

Native email authenticity and unsubscribe acknowledgment slices have focused
133/133 and 62/62 tests respectively. The verifier uses actual WebCrypto and
independent Node HMAC fixtures; unsubscribe uses mocked SDK/HTTP with actual
handlers/page. Independent read-only review found no introduced issue. These are
not project/sender/provider/delivery, real database/concurrency, role, mobile or
owner acceptance. See `evidence/NATIVE_EMAIL_WEBHOOK_VERIFIER.md` and
`evidence/UNSUBSCRIBE_ACKNOWLEDGMENTS.md` for combined integration results and
unchanged activation blockers. No migration, live write, provider change or deploy.
Fresh combined application 1,626/1,626 across 68 files (109.46s) includes all 195
new tests; report checker/full TypeScript/changed-line lint pass, zero quarantine
or new lint warnings. The fixture type-only correction weakens no runtime/test
assertion. Node source guards103/103 pass (2.263s), release/report/inventory/assets
75/75 pass (11.532s); five inventory checks overlap and are not summed into a
unique total or the older full tooling evidence.
Fresh complete build/Worker/backend/browser-engine and all 214 tracked public
Git/source/output checks pass at `3f829a6b`, retaining 15 OCR/202 PDF assets.
Build warnings remain explicit in the evidence; local packaging is not release
approval, provider activation or live acceptance.

Previous Parts reference recovery, remaining-source categorization and unused cloud-auth
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
   branch/PR. Do not substitute prior-head CI for new-head checks.
2. Continue the remaining PR #9 reconciliation, including provider/generated middleware,
   configuration, assets and its legacy-URL migration. Do not expose tracked
   `.env` contents or bulk merge the provider cleanup. Next native email work is
   actual durable ingress/lease/fenced completion and consent transactions;
   the inactive command/receipt/fake-transport boundary is now implemented. Complete action/callback/cohort and
   actual project/secret/sender/Auth-setting coverage; keep consent/suppression/
   backlog/recovery gates explicit. Do not repeat completed verifier/planner work
   or enable delivery. Use the recovered PR #2
   source/crosswalk; formal baseline/activation acceptance is not granted.
3. Continue C3.01–C3.04 quote/work-order list/create/conversion caller bindings,
   starting with read-only quote-list lifetime/completeness/error tests, then
   readiness and acknowledgments; C3.10–C3.12 invoice caller hardening is implemented,
   not financially accepted. Close the C3.01–C3.14 financial actions with
   authorized atomic monetary/stock/recovery acceptance. Complete the remaining
   action-level feature inventory. Use the pinned 12/5/2 remaining-source
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
   was previously stopped/unavailable; latest read-only RAM snapshot is 1.21 GiB
   free of 15.71 GiB. No local
   independent-session API/Auth/storage/PostgreSQL acceptance is claimed and no
   daemon was started or image downloaded.
7. Reassess the seven-day target by Day 2 using actual integrated acceptance,
   not draft PR count. Report exact deadline-threatening gaps and options early.

No scope is silently dropped. ERPNext and Dolibarr remain recovered alternatives,
not selected or installed. Existing production restrictions are preserved without
replay. Production, migration history and paid resources remain unchanged.
