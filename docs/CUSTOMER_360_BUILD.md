# Native Customer 360: first delivery slice

This change extends the existing Shop Manager customer detail screen. It does not
introduce a second CRM database or duplicate customer identity.

## Delivered

- Customer-scoped quote and invoice cards with record links, dates and statuses.
- PHP amounts consistent with the existing native commercial records, without
  visitor-currency conversion or misleading lifetime totals.
- Explicit 25-record display limit and independent errors/retry controls.
- Authenticated-account query keys for customer details, vehicles, work orders,
  commercial history, communications and reminders.
- Work-order display currency corrected to PHP.

## Verification

- Application tests: 241/241 passing, no quarantine.
- TypeScript: passing.
- Changed-line lint: zero errors; four existing-schema typing warnings.
- Five new commercial-history tests cover record display, independent failure,
  cross-account cache isolation, signed-out behavior and the display cap.
- Five receipt-panel regressions cover account-isolated receipt/shop-link caches,
  signed-out behavior, open-editor resets and scoped invalidation. A keyed
  account/target boundary clears local private state on account switches.
- Tooling regressions: 13/13 passing. Read-only migration source evidence now
  verifies exact deployed SQL for 13 additional files under other timestamps;
  15 source files remain unresolved, so automated history repair stays blocked.
- Parent security branch: all 247 PostgreSQL adversarial assertions passed in
  GitHub Actions; complete-checkout build, typecheck and unit checks passed.

This PR is stacked on the combined security branch. It adds no migration and
does not apply the parent's pending migrations to production. Local sparse
checkout omits public media: its build artifact must not be deployed.

The owner's same-chat continuation heartbeat is active every 30 minutes. It
resumes from the repository checklist and must not be duplicated. It is not an
instant chat/phase-end event trigger. Local runs require this computer and app.

## Remaining work

This is not the full CRM. Unified receipt/installation activity, assignments,
retail and recruitment pipelines, consent-aware communications, reporting,
organization-level acceptance testing and receipt OCR recovery remain separate
delivery slices. Existing query scoping supplements database authorization;
it does not replace RLS or establish a new organization identity contract.

## Drill-down isolation follow-up (2026-10-15)

The vehicle/work-order screens linked from Customer 360 now scope their detail,
service, installation, job-line and part caches to the authenticated account.
Signed-out renders mount no private UI. Vehicle histories are explicitly bounded
to 100 displayed records; PHP is used consistently for operational amounts.
Independent source failures offer generic retries rather than claiming an empty
history or guessing a workspace-link problem.

Work-order editors remount across account/target changes; pending old-context
callbacks cannot reset a new draft, toast, navigate or invalidate its caches.
Dependent reads wait for a visible primary record, and write entry points wait
for complete job/part reads. Existing list invalidation is preserved while the
current account's customer/vehicle commercial/service caches are refreshed.

Time-entry, technician-picker and inspection caches are also account scoped.
Child-card drafts reset on context changes. Sequential inspection work checks
previously ignored checklist errors and stops subsequent dispatch after context
loss. Partial creation failures refresh the scoped list and warn the operator
to inspect existing records before retrying; they do not claim rollback.

Focused verification: 45 new route/child-card regressions pass. Full-suite,
type/build and review commit evidence is recorded in the completion checklist.
This does not certify all Shop Manager list/editor caches or organization-level
role transitions; other routes still need a bounded audit.

### New release dependency: invoice integrity and privileged helpers

Do not promote UI test success to invoicing readiness. Read-only inspection found
elevated legacy invoice/totals RPCs executable by anon/authenticated database
roles without caller/shop checks. The current browser invoice insert omits the
required due date and has incorrect labor/part mappings, non-atomic requests and
no idempotent work-order link. The legacy RPC is not a safe substitute because
it has authorization, concurrency, tax/status and inventory-posting differences.
See `evidence/SHOP_MANAGER_INVOICE_RELEASE_GATES.md` for exact observations.

The owner-approved converter-only temporary restriction was applied and catalog-
verified on 2026-10-15 Asia/Manila after six CI gates passed; anon/authenticated
execution is denied, owner/service execution retained. The function body and
totals helper are unchanged. See `evidence/INVOICE_CONVERTER_CONTAINMENT_RELEASE.md`.
No customer records or application deployment changed. The totals helper and
mutable profile/membership authority remain unresolved and are outside this approval.

Before expanding commercial activity: prepare/test an independently authorized
atomic converter with stable retry behavior and draft billing policy, then complete
baseline/recovery and release gates before live application.
The bounded activity card can follow, using only explicit active vehicle links;
never reuse the owner-only sharing/history screen inside shop CRM.
