# 365 Seven Day Completion Plan

## Target and scope

Owner target: complete the software already built or in progress within seven
days, by **22 October 2026 at 21:00 Asia/Manila**. Work starts immediately on
15 October. This is an aggressive delivery target, not a verified forecast or
permission to bypass release gates.

Owner clarification: the only hosted backend for 365 is Supabase project
`wjxaajgvddtrxxtocxen` at `https://wjxaajgvddtrxxtocxen.supabase.co`.
The 366 AI project is unrelated. References to staging below mean an isolated
test environment, not permission to create another hosted project or use live
365 data for destructive testing. Develop a local synthetic test environment and
a reviewed production-safe acceptance path; if a gate remains unsatisfied,
report it explicitly. The earlier separate-hosted-project/cost question is
superseded. No backend switch, new resource, charge or release is approved.

The target is one integrated, usable, tested 365 release covering receipts,
native CRM, Shop Manager, retail and recruitment pipelines, parts, owner vehicles
and history, existing commercial surfaces, role-based UI and operating readiness.
Each existing feature must be accounted for. An unfinished or disabled feature
does not count as completed. If the full current scope cannot meet the target,
report the exact gap and options early; do not quietly replace it with a smaller
MVP or call a staging build a completed production launch.

Use the existing native CRM and Shop Manager architecture. ERPNext and Dolibarr
are recovered candidates, not selected integrations. A new CRM installation,
rewrite or upstream code import is not part of this sprint without a separate
decision on architecture, licensing and migration.

The future government/insurer feeds, licensed repair-data network, new diagnostic
hardware, new-country launches and export programs are not currently completed
software integrations. Track those external dependencies separately. A proposal,
marketing route or scaffold must not be relabeled as an operational integration.

The scope ledger on Day 1 must also reconcile existing Marketplace/Directory,
partner/franchise, Learn and billing surfaces. Existing code is in the acceptance
inventory; broader proposed programs are not silently included or silently removed.
Any disputed item goes to the owner as an explicit scope decision.

## Starting point

The repository has image/PDF OCR, receipt/history and Parts foundations, native
Customer 360 components and substantial regression coverage. Much of the work is
still on review branches. At planning time there are **61 open PRs, 58 drafts**;
integration and release acceptance are unfinished.

Database source mapping remains **404 of 423**, with **19 unclassified** entries.
Hosting is failing independently of the main CI gates. The latest claim revision
model is isolated and unwired. Original reviewer authority, atomic authorized
writes, private evidence custody, role/offboarding consistency and migration/
recovery acceptance remain open. No application release is authorized by this
schedule alone. Existing approved production restrictions must be preserved.

## Delivery schedule

Each day ends at 21:00 Manila time. QA runs throughout the week, not only on Day 6.

| Day and deadline | Main delivery                                                                                                                                                                                                                                                                                                                        | Required evidence before calling it complete                                                                                                                                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — 16 October   | Establish one integration candidate and the exact feature ledger. Reconcile the PR dependency graph without destroying branches or bulk-merging drafts. Diagnose hosting, verify full media/artifacts, and prepare isolated staging plus database/private-storage recovery. Classify the 19 migration entries against the candidate. | Every current feature has an owner/work lane, acceptance test and status. A full candidate builds. Staging/recovery access and the precise migration path are recorded. Unresolved release-path entries block deployment; an exclusion needs evidence, not an assumption.                                                                                                      |
| 2 — 17 October   | Close shared identity and authorization for the candidate: account/organization/shop/customer/vehicle bindings, staff roles/offboarding, ownership/claim handling, authorized invoice and financial mutations. Bring the validated candidate onto staging.                                                                           | Real owner/staff/outsider tests, fresh authority checks, private object controls, duplicate/stale/concurrent-write tests and rollback recovery pass. No supplied UUID, service call or unsigned lab setting substitutes for verified authority. Conduct the seven-day feasibility review now.                                                                                  |
| 3 — 18 October   | Finish receipt scan and reviewed entry inside Customer 360 and Shop Manager. Complete customer activity, tasks/reminders and commercial links.                                                                                                                                                                                       | Phone image/PDF/manual entry → correction/review → confirmed purchase/expense → correct customer/vehicle/work order. Dates, currency, quantities and amount handling are checked; retries do not duplicate entries; originals remain private. Quotes/work orders/invoices/payments reconcile in staging.                                                                       |
| 4 — 19 October   | Finish Parts operations and vehicle/installed-component history together.                                                                                                                                                                                                                                                            | Catalog/fitment → order/receive → stock allocation → actual installation → history. Removal/replacement, return/warranty and financial reversals reconcile. Corrections, ownership transfer, consent/revocation, report snapshots and sharing expiry pass. Purchase alone never becomes an installation.                                                                       |
| 5 — 20 October   | Finish retail and business-recruitment pipelines and reconcile existing commercial/account surfaces.                                                                                                                                                                                                                                 | Separate stages, assignments, tasks, reminders and conversion reports work end to end. Existing listings/search/messaging/onboarding/admin and Learn/partner surfaces pass their scoped checks. Existing subscription/entitlement/checkout/refund paths are verified with test transactions; no new settlement or legal model is invented. No real customer messages are sent. |
| 6 — 21 October   | Complete professional role-based UI and release QA. Freeze the candidate except for acceptance-blocking fixes.                                                                                                                                                                                                                       | Owner, manager, advisor, parts, technician and permitted admin journeys pass on desktop and phone. Loading/error/empty states, navigation, accessibility, performance, account-switch privacy, tenant isolation and private files are checked. Full CI and browser/database regressions pass on the same integrated candidate.                                                 |
| 7 — 22 October   | Run owner/staff acceptance, fix blockers, rehearse recovery and make the release decision.                                                                                                                                                                                                                                           | Owner signs off the agreed journeys. Financial and stock reconciliation, backup/database/private-object restoration, rollback, monitoring, support and known-issue records are ready. Deploy only a full artifact through the agreed release gates, then verify live behavior. If a gate fails, report NO GO and unfinished items—not completion.                              |

Days are delivery targets with dependencies, not claims that the open security
work has already been sized or can certainly finish in one day. CRM/receipt,
Parts/history, pipeline and UI work may proceed in parallel on synthetic data
while the shared foundation is repaired. Live use must wait for that foundation.

## Execution changes

Use four bounded work lanes: release/security/integration; CRM/receipts/Shop
Manager; Parts/vehicle history; and pipelines/UI/commercial QA. The primary agent
owns sequencing and integration. Assign independent tasks to available agents
using separate worktrees or non-overlapping files, with no concurrent branch
switches in a shared checkout. These are work lanes, not a claim that four
builders are currently available. Recent runs hit an additional-agent limit;
available capacity must be verified before relying on it for the deadline.

Prioritize completed user journeys and real staging behavior. Extend research or
prototypes only when needed to close a named release blocker. Reuse existing
components and tests. Maintain one acceptance ledger and an integrated candidate;
new review slices should have a concrete integration destination. Do not create
extra planning-only PRs or repeat completed recovery work.

Run focused tests while editing, the full required suite at integration milestones
and all mandatory CI/release gates before adoption. Do not weaken quarantine,
permissions, financial checks or release conditions to improve the schedule.

The existing scheduled follow-up must read this plan alongside the completion
checklist. Do not create a duplicate automation. Scheduled turns are not continuous
background work; the seven-day target needs sufficient active execution time and
timely owner decisions. Do not promise uninterrupted work between scheduled turns.

## Critical path and early escalation

The critical path is: trustworthy database/identity/recovery boundary → integrated
staging candidate → complete financial and receipt/parts/history transactions →
role-based end-to-end acceptance → authorized deployment and live verification.

By the end of Day 1, identify missing access, decisions, capacity and concrete
release blockers. Safe independent work continues while they are resolved.
By the end of Day 2, show the integrated candidate's actual state and whether the
remaining work fits the five remaining days. If it does not, provide the affected
features, cause, needed help and choices of additional capacity, explicit scope
change or revised date. Do not wait until Day 7 to disclose an infeasible target.

A safe temporary restriction may contain a risk but does not complete the affected
workflow. Existing JWT/session revocation, ownership/evidence privacy, ledger
atomicity and migration unknowns must not be written off as acceptable because a
build passes. The sparse local checkout must never be deployed.

## Definition of done

For every in-scope feature, the acceptance ledger must distinguish **implemented,
integrated, staging verified, owner accepted and deployed/live verified**. Record
the candidate commit, exact test, result, migration impact, deployment status and
open blocker. A passing isolated prototype or merged PR is not a completed feature.

Release acceptance requires these connected journeys:

1. Owner/shop onboarding, permitted roles and staff removal work without tenant
   leakage, stale private views or unintended access.
2. Receipt scan/manual entry, review, expense/purchase confirmation and subsequent
   installation work with private originals and safe retry handling.
3. Customer 360, retail/recruitment assignments, reminders and Shop Manager work
   orders/quotes/invoices/payments use the same identities and reconcile.
4. Parts receiving, inventory, installation/removal, returns/warranty and vehicle
   history preserve stock/financial correctness and evidence provenance.
5. Ownership transfer, corrections, consent/revocation and expiring sharing protect
   previous-owner/private shop records and identify each history source.
6. Existing marketplace/account/commercial surfaces, subscription entitlements,
   reports and role-based desktop/mobile UI pass the scoped acceptance ledger.
7. Recovery, rollback, monitoring and support are demonstrated; the authorized
   deployed version is checked with actual designated owner/staff accounts.

Externally supplied data must be labeled by source and coverage. A 365 history
report is not a claim of access to CARFAX, government or insurer records.

## Owner inputs and authority

Name the pilot shop/business and owner/staff acceptance testers using existing
test accounts. Use synthetic staging records until they are nominated. Never ask
for passwords in chat. Hosting/staging access or company/payment/privacy decisions
that prove missing must be requested specifically, with their deadline and impact.

This plan does not authorize new paid resources/charges, real customer outreach,
data deletion, destructive database-history repairs or irreversible production
decisions. Additional production restrictions, migrations and deployment follow
the existing approval boundary and verified release prerequisites. Notify for a
completed accepted milestone, release result, material failure, required action
or deadline-threatening blocker; keep unchanged scheduled polls quiet.
