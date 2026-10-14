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

- Application tests: 236/236 passing, no quarantine.
- TypeScript: passing.
- Changed-line lint: zero errors; four existing-schema typing warnings.
- Five new commercial-history tests cover record display, independent failure,
  cross-account cache isolation, signed-out behavior and the display cap.
- Parent security branch: all 247 PostgreSQL adversarial assertions passed in
  GitHub Actions; complete-checkout build, typecheck and unit checks passed.

This PR is stacked on the combined security branch. It adds no migration and
does not apply the parent's pending migrations to production. Local sparse
checkout omits public media: its build artifact must not be deployed.

## Remaining work

This is not the full CRM. Unified receipt/installation activity, assignments,
retail and recruitment pipelines, consent-aware communications, reporting,
organization-level acceptance testing and receipt OCR recovery remain separate
delivery slices. Existing query scoping supplements database authorization;
it does not replace RLS or establish a new organization identity contract.
