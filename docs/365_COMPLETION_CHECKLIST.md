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

Next: validate the combined security release in PostgreSQL CI and map the
remaining 25 existing migrations to deployed definitions. Then deliver the
native CRM and receipt scanner slices.
