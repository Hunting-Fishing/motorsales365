# 365 application completion checklist

Updated: 2026-10-15 (Asia/Manila)

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
9. [x] Rebuild English on-device image/PDF receipt OCR; bundle workers, PDF
       rendering and language assets; preserve manual review and private file handling.
       Wider corpus/mobile/owner acceptance remains a separate pilot gate.
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

## Earlier foundation checkpoints (historical)

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

The receipt-cache follow-up at `b43adfb` passed all complete-checkout GitHub
checks (build, typecheck, unit, lint, PostgreSQL). It is not a deployment.

## Image OCR heartbeat checkpoint: 2026-10-15

Implementation branch: `feature/receipt-ocr-local`, stacked on the existing
Customer 360 branch; published as draft PR #12. Verified code commit: `7ebe425`.
The first local image OCR slice is implemented: same-origin
pinned worker/core/model assets, conservative unreviewed suggestions, no upload
during scanning, cancellation, and manual/provider fallbacks. Saving separately
uploads the attachment to existing private storage. Local PDF scanning remains
unfinished. See `RECEIPT_OCR_DELIVERY.md` for exact behavior and limitations.

Real browser smoke verification reads a synthetic receipt through the actual
worker, relaxed-SIMD core and English model with zero third-party requests.
The source is guarded as client-only for the application's SSR build. Empty
results preserve existing entries; account changes abort and ignore late results.
Bounded encoded-header checks reject oversized PNG/JPEG/WebP before decoding.
Current validation: 283/283 application tests, 18/18 tooling regressions and real
browser scans of all three image formats pass. Local TypeScript passes. All six
GitHub CI gates passed for `7ebe425` (run `38600950050`): full build/Worker package,
typecheck, unit tests, changed-line lint, real-browser OCR and 247 PostgreSQL
security assertions. Built OCR assets pass byte/hash verification, and the server
package check confirms that the browser OCR engine was stripped. The import
boundary was corrected after CI caught an initial server-visible client import.
No production release is inferred. This final checkpoint update is docs-only.
Both isolated receipt/installation DB regression suites still pass. No schema
migration or production deployment is included in this slice.

Read-only migration audit: all twelve unmatched existing sources were
investigated. Eleven have explained split/subsequent-fix/object correspondence,
not exact full-source identity. The PH reference seed still lacks source proof;
the prior aggregate check covered identities only, not every seeded attribute.
The audit verified 21 retained source hashes, scoped function/object/permission
checks, residual anonymous lifecycle grants, and the historical cost-fix replay
hazard. See `evidence/migration-object-audit-2026-10-15.md`. Keep the provenance
classifier fail-closed; source correspondence does not approve history repair.

The subsequent docs-only head `7240f02` also passed all six GitHub CI gates
(run `38601415344`). The separate hosting check still failed; no upload was inferred.

## PDF OCR and replay-safety checkpoint: 2026-10-15

Implementation branch: `feature/receipt-pdf-local`, draft PR #13 stacked on PR #12.
Verified code commit: `21e651c`. Bounded
same-origin PDF rendering and sequential page OCR are implemented for receipts
of 1–3 pages, with no upload during scanning. Unsupported, unreadable or failed
pages reject the entire operation. Conflicting metadata requires explicit manual
resolution, amounts retain their page's currency provenance, and all suggestions
remain unreviewed. Chunk-loading cancellation now releases UI waiting promptly.
See `RECEIPT_PDF_DELIVERY.md` for resource limits and remaining acceptance gates.

Local actual-browser checks pass for all three image formats, a two-page digital
PDF and an image-only PDF, with zero external requests. Four-page, malformed and
oversized-viewport PDFs reject. The synthetic rendered preview was visually
inspected and is legible/unclipped. All 325 application tests and 36 Node tooling
regressions pass. Explicit lint on the new source/scripts has no errors; nine
pre-existing receipt-panel typing warnings remain. All six GitHub CI gates pass
at `21e651c` (run `38604862474`): full build/Worker dry-run, TypeScript, application
and isolated receipt DB suites, lint, actual browser OCR/PDF and 247 adversarial
SQL assertions. Built assets verify 15 OCR and 202 PDF files by bytes/hash; the
server-package boundary check excludes both engines. Local TypeScript first
caught untyped test callback mocks; they were corrected against the public
scanner contract, and complete-checkout TypeScript then passed. No safeguards
were relaxed. This final PDF checkpoint update is docs-only.

The docs-only PDF head `adc5fd2` also passed all six GitHub CI gates
(run `38605658988`). The separate Cloudflare hosting check remains failed.

Migration replay safety: 13 new offline/PGlite regressions reproduce the unchanged
historical cost-fix patch on original and already-corrected disposable fixtures.
The offline preflight intentionally reports blocked (exit 1) for the current
historical chain. It executes no SQL and never approves baseline/history repair.
`evidence/MIGRATION_BASELINE_STRATEGY.md` separates source, schema, data/ACL,
replay and recovery evidence and identifies the explicit three-file forward set.
The complete reproducible baseline remains unfinished; no applied SQL was edited.

No schema migration or production deployment is part of this slice. Cloudflare
authentication and failed hosting-build details remain unresolved. Do not deploy
this sparse checkout. Next: finish account-isolated vehicle/work-order drill-down
and child-card caches, then deliver bounded native customer/vehicle activity and
the disposable baseline/recovery prerequisites. External CRM candidate selection
remains unresolved pending recovery of the actual repositories/licenses. Keep
resource-heavy local checks sequential on this 16 GB computer.

## CRM drill-down continuation: 2026-10-15

Branch: `feature/crm-drilldown-isolation`, draft PR #14 stacked on the verified
PDF slice. Verified application commit: `5945c33`; verified follow-up/test commit:
`117412b`.
Vehicle/work-order detail and time/technician/inspection child-card caches now
include account identity. Signed-out UI is hidden, drafts reset on account/target
changes, late old-context callbacks are ignored, dependent reads require a visible
primary record and work-order writes require complete job/part reads. Generic
independent errors/retries replace misleading empty states. PHP amounts and
explicit vehicle-history list caps are preserved. No database grants/RLS were
relaxed. See `CUSTOMER_360_BUILD.md`.

All 370 application tests pass, including 45 new focused regressions and partial
invoice failure warnings/invalidation. Explicit lint has zero errors and 33
existing schema-typing warnings. Local TypeScript passes. All six GitHub CI gates
passed at `5945c33` (run `38607348255`), including full build/package dry-run,
TypeScript, application/tooling/receipt DB suites, lint, real-browser image/PDF
OCR and 247 disposable PostgreSQL assertions. No schema migration or deployment
is included. The separate Cloudflare hosting check still fails.

New priority release blocker: read-only live catalog inspection confirmed
`convert_work_order_to_invoice(uuid)` and `calculate_work_order_totals(uuid)` are
postgres-owned SECURITY DEFINER functions, executable by anon/authenticated roles
and lacking caller/shop checks in their inspected bodies. Neither was invoked;
external API reachability was not tested. The native browser conversion also
omits live NOT NULL `due_date`, has wrong line mappings and lacks atomic/idempotent
creation. Do not wire the legacy RPC as a shortcut. Exact evidence and ordered
acceptance gates: `evidence/SHOP_MANAGER_INVOICE_RELEASE_GATES.md`.

The initial checkpoint requested owner approval for tested temporary converter
restriction. The owner subsequently approved this exact converter-only action;
see the following containment checkpoint. Related helpers/profile changes remain
outside that approval. Existing applied migrations must remain untouched.

Five focused memory-only PGlite ACL tests now prove historical definer bypass
despite real synthetic RLS denial, and verify proposed fixture-only revocations.
They are added to CI; total tooling regressions are now 41. No containment SQL
is applied. Live ACLs differ from retained direct authenticated grants, which is
documented explicitly rather than inferred from old source.
All six GitHub gates also pass at `117412b` (run `38608648139`); job logs confirm
370/370 application tests, 41/41 tooling regressions and both isolated receipt
database suites. This final handoff update changes documentation only.

Identity follow-up found a prerequisite to converter hardening: native shop,
business and public organization IDs are distinct, and current profile shop
binding is self-writable under observed grants/policies. Catalog inspection found
no non-internal profile triggers; no profile mutation or API exploit was attempted.
See `evidence/SHOP_MANAGER_IDENTITY_CONTRACT_AUDIT.md`. Do not trust a writable
profile shop ID as sufficient tenant authority or infer linkage from names/emails.

Tracked environment-name/format inspection covered `.env`, `.env.development`
and `.env.production` without printing values: Supabase publishable formats and
public identifiers, Maps browser configuration and public-format payment client
tokens. This does not verify provider key restrictions, runtime secrets or Git
history; the environment/security audit remains incomplete.

Next: verify any new docs-head checks without repeating the completed OCR/UI
slices, then prepare disposable trusted shop/role binding and membership-tampering
tests before invoice authorization,
atomicity and concurrency implementation. Continue the
baseline/recovery path. Native bounded receipt/installation activity follows;
retail/recruitment pipelines, wider account/role UI audits and owner/pilot
acceptance remain unfinished. Do not deploy the sparse local artifact.

## Tenant-authority proof and approved containment: 2026-10-15

Branch: `security/native-tenant-authority`, stacked on PR #14. Its docs head
`bbb93f0` passed all six CI gates (run `38609286187`); no completed OCR/UI work
was repeated. Six new disposable authority regressions reproduce profile UPDATE
and INSERT shop pivots under ordinary authenticated roles, show the legacy
id/user_id resolver mismatch, and contrast fixture-only safe-column grants.
No profile/customer rows were touched live.

The owner explicitly approved tested temporary restriction of ONLY
`shop_manager.convert_work_order_to_invoice(uuid)`. Fresh catalog/source checks
match its archived body and current complete ACL. CLI-generated forward file:
`20261014175040_contain_legacy_invoice_conversion_execute.sql`. It is guarded,
atomic and converter-only; it retains owner/service access and checks the totals
helper unchanged. Six additional tests execute this exact file and the exact
operator-opt-in review-only rollback in memory, including postcondition failure
after REVOKE and full automatic statement rollback.

Local focused tests: 12/12. CI tooling now includes both suites (53 tests total).
No production application is claimed yet. Before executing this one approved ACL
file: publish/review, require CI, refresh unchanged target state and retain the
scoped recovery record. Do not db-push or repair the whole historical chain.
See `evidence/INVOICE_CONVERTER_CONTAINMENT_RELEASE.md` for source/ACL fingerprints,
impact, recovery rehearsal and exact release status. Restoring PUBLIC access
would reopen the risk and is not automatically authorized.

Next: complete the approved converter-only containment and role/catalog
postchecks; then prepare the trusted profile/membership guard candidate offline.
The exposed totals helper and profile binding still need separately scoped
release authority; invoice atomicity and the global baseline/recovery gates remain.
No application deployment, customer communication or paid resource is authorized
by this checkpoint.
