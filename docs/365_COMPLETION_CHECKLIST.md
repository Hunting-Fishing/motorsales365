# 365 application completion checklist

Updated: 2026-10-14 (Asia/Manila)

## Authority and source

The owner authorized implementation in this chat. Production remains governed by
verified release prerequisites. This checklist tracks delivery; it does not replace
the platform, Parts, Repair Knowledge, or Vehicle History program decisions.

Canonical repository: `Hunting-Fishing/motorsales365`.
Starting main: `70ab892a8b7c05eac288ea4a6cce7a002d316f00`.
Implementation branch: `completion/365-foundation`.

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

1. [ ] Establish portable local build, typecheck, unit and receipt database tests.
2. [ ] Reconcile CI PR #8 with current main; preserve its existing work.
3. [ ] Resolve known test failures and document remaining reproducible failures.
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

Source acquisition and recovery investigation are in progress. No application
change, database migration or deployment has been completed in this pass yet.
