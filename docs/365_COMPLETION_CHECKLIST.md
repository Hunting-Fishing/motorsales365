# 365 application completion checklist

Updated: 2026-10-14 (Asia/Manila)

## Authority and source

The owner authorized implementation in this chat. Production remains governed by
verified release prerequisites. This checklist tracks delivery; it does not replace
the platform, Parts, Repair Knowledge, or Vehicle History program decisions.

Canonical repository: `Hunting-Fishing/motorsales365`.
Starting main: `70ab892a8b7c05eac288ea4a6cce7a002d316f00`.
Implementation branch: `completion/365-foundation`.
Security reconciliation branch: `completion/365-security`.

## Recovery evidence

- [x] Confirm receipt/history release PR #10 is merged on current main.
- [x] Confirm five existing open PRs: #2, #5, #7, #8, #9.
- [x] Confirm authenticated GitHub CLI access for implementation.
- [ ] Recover the in-house receipt scanner from chat/workspace
  `01a13964-74e2-727b-a213-e5115412a098`. Remote history timed out during
  this implementation pass. No source recovery or publication is claimed.
- [ ] Recover the interrupted CRM workspace
  `/workspace/scratch/8b1286a419da/motorsales365`. Earlier execution created
  `feature/parts-crm-integration` and a migration but no verified push/PR.

## Delivery sequence

1. [x] Establish portable local build, typecheck, unit and receipt database tests.
2. [x] Reconcile CI PR #8 locally with current main; preserve its existing work.
3. [x] Resolve ten known test failures: 179/179 application tests now pass.
4. [ ] Audit tracked environment variables by purpose; distinguish intentionally
   public browser configuration from credentials requiring restriction/rotation.
5. [ ] Reconcile security PR #5 and dependent #7 together; test migrations on
   isolated/staging data before shipping application consumers.
6. [ ] Reconcile migration history against deployed schema before automated push.
7. [ ] Reconcile PR #9 and validate provider configuration and authentication.
8. [ ] Approve a single organization/shop/customer/vehicle identity contract and
   verify multiple-organization access boundaries, including cache separation.
9. [ ] Recover or rebuild local receipt OCR; bundle workers, PDF rendering and
   language assets; preserve manual review and private file handling.
10. [ ] Deliver CRM Customer 360 and activity/task follow-ups using existing
    customer, vehicle, receipt, invoice and work-order records.
11. [ ] Deliver separate retail and business-recruitment pipelines, consent-aware
    communications, assignments and reporting.
12. [ ] Verify the Parts catalog-to-receiving-to-installation loop, stock/financial
    reconciliation, returns and warranty recovery.
13. [ ] Complete history corrections, ownership transfer, report snapshots,
    source labels and sharing expiry.
14. [ ] Complete responsive role-based UI and business/owner acceptance checks.
15. [ ] Verify billing, entitlements, support operations and recovery procedure.
16. [ ] Run a bounded Philippine pilot before approving broader availability.

## Release evidence required per slice

Record the commit, changed behavior, test command/result, migration impact,
deployment status and next dependency. A merged PR is not proof that its database
or live customer workflow was verified. Do not infer an overall percentage from
route counts or documentation checkboxes.

## Current checkpoint

The working branch includes the original CI branch history and today's receipt
release. Windows build commands and the legacy MCP path adapter are verified by
a successful production compilation. No production deployment is claimed; this
initial sparse checkout omits static public media and must not be deployed.

Validation: clean npm install; TypeScript passes; application suite 179/179;
test-report checker regression suite 6/6; isolated receipt database checks pass.
The ten former test failures came from outdated mocks and source/snapshot
expectations; authorization behavior was not relaxed to make them pass.

Live read-only database inspection: project healthy; 116 remote migration
versions recorded versus 415 repository files. The remote history includes
standalone bootstrap/replay batches and split migrations with different version
numbers. Do not mark every missing filename applied or push the entire history.
Receipt migrations 20261014043336 and 20261014064816 are present remotely.

GitHub Actions verified the complete-checkout foundation build, typecheck, unit
tests and lint on PR #8. The separate Cloudflare Workers Builds check failed;
its GitHub check contains a dashboard link but no error log. Investigate that
hosting check before production release; no successful Cloudflare publication
is claimed.

Security branches #5 and #7 are merged together locally with the foundation,
preserving both histories. A Windows-only executable-mode test now verifies the
Git index mode as well as POSIX mode on Unix. Actual SQL adversarial execution
still needs the disposable PostgreSQL CI job; Docker Desktop is not running.

Migration provenance: all 388 legacy SQL files exactly match the deployed
archive hashes after line-ending normalization. Two receipt versions match the
remote migration history. On the security branch, 27 files remain unclassified:
25 post-cutover/split/demo migrations plus the two pending security migrations.
The read-only evidence and comparison script are committed; no history repair
or production SQL was executed. Run:

`node scripts/ci/migration-provenance.mjs docs/evidence/migration-provenance-2026-10-14.json --summary`

The script intentionally exits 1 while unclassified files remain.

PostgreSQL CI exposed a receipt-release integration regression: the new
installed-component trigger erased direct owned-vehicle references when no
Shop Manager vehicle was supplied. Follow-up migration
`20261014140802_preserve_direct_installed_vehicle.sql` fixes that case while
keeping shop-origin links approval-controlled. The isolated regression test
reproduces the failure against the original migration and verifies the fix,
history synchronization, revoked links, required vehicle and private execution.
Both receipt database suites pass. The new migration is not yet applied live.

Combined security release verified in GitHub Actions at `aff5b68`: all 247
adversarial SQL assertions passed against disposable PostgreSQL, along with
complete-checkout build, typecheck, unit tests and changed-line lint. A fixture
now reuses the customer account automatically created by installation history.
This is isolated verification, not a live migration or production deployment.

First native Customer 360 slice: quotes and invoices are linked to existing
Shop Manager customers, with PHP amounts, bounded lists and independent retry
states. Customer activity caches now include the authenticated account.
Application suite: 236/236; TypeScript passes; changed-line lint has zero errors.
See `CUSTOMER_360_BUILD.md`. Full CRM delivery remains incomplete.

CRM build verification and publication are complete: stacked draft PR #11
(`feature/customer-360-native`) passes the complete-checkout GitHub build,
typecheck, unit, lint and PostgreSQL security checks. The separate Cloudflare
Workers Builds check still fails. Local Wrangler authentication reports an
invalid token/not logged in, so hosting build-log access remains unavailable.
The preview job is configured to skip upload: its green wrapper is not proof
of a published preview. No production publication is claimed.

## Recurring continuation

An active same-chat heartbeat named **Continue 365 MotorSales to completion**
was created at the owner's request, every 30 minutes. Automation id:
`continue-365-motorsales-to-completion`. It resumes the next unfinished dependency,
records evidence here, avoids duplicate work and reports only meaningful changes
or required input. It stops when the agreed acceptance criteria are verified.
This is a schedule, not an instant phase-end trigger. Local work requires the
computer and desktop app to remain available. Do not duplicate the automation.

## Migration evidence follow-up

Read-only stored-SQL SHA256 evidence is now in
`evidence/post-cutover-migration-hashes-2026-10-14.json`. Thirteen previously
unclassified repository files exactly match deployed SQL under other timestamps.
Both directly recorded receipt files also have exact source matches. Together
with 388 legacy archive matches, 403 of 418 source files have execution-source
evidence. This does **not** prove current schema parity or approve history repair.

Run the comparison with both evidence files:

```powershell
node scripts/ci/migration-provenance.mjs docs/evidence/migration-provenance-2026-10-14.json docs/evidence/post-cutover-migration-hashes-2026-10-14.json --summary
```

Expected exit: 1. Fifteen files remain unclassified: twelve existing/split/seed
files plus the two pending security migrations and pending receipt-trigger fix.
Seven regression tests ensure names/timestamps alone cannot approve a source,
modified SQL blocks, line-ending normalization is safe, and another project's
evidence cannot be used. These tests run in CI.

Additional live read-only checks: all 50 curated chassis source rows have
matching PH profiles under the seed's identity predicate. This does not verify
every profile attribute or prove the seed file was applied. Both old migration
archive tables have RLS enabled and forced, no anon/authenticated table rights,
and no former anonymous ingress policies. The deployed counter-sale function
uses `i.cost_per_unit` and not the obsolete inventory-cost expression.

Replay hazard: the repository's earlier counter-register migration already
contains the corrected cost field, while the later cost-fix migration raises
unless it finds the obsolete text. Therefore exact individual source evidence
does not establish that replaying the entire historical chain will succeed.
Do not edit previously applied SQL or bulk-repair timestamps to hide this.
Compare final objects, then establish a tested baseline/release strategy.

Receipt source inspection confirms manual/reviewed entry and provider-based
image/PDF extraction, but no local Tesseract/PDF.js scanner in the repository.
Receipt and shop-link caches are now scoped to the authenticated account;
signed-out users mount no private receipt UI, and account/target switches reset
open editors and connection codes. Five added regressions cover cached account
switches, signed-out cached data, open-editor resets and scoped invalidation.
The application suite passes 241/241 tests; tooling regressions pass 13/13.
Local image OCR should run before upload,
keep every suggestion unreviewed, bundle assets on the same origin and retain
manual/provider fallbacks. PDF rendering is a separate bounded slice.

Next: complete TypeScript/build verification for this follow-up, then compare
the twelve unmatched existing migration sources to their split/deployed final
objects. Recover or rebuild the scanner before claiming receipt scan-to-entry
completion. Keep resource-heavy checks sequential on this 16 GB computer;
concurrent TypeScript and Vite left less than 1 GB free during this run.
