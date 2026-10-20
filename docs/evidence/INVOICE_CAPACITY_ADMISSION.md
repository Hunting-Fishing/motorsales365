# Invoice capacity admission and truthful pre-write feedback

20 October 2026. Draft client release; no production deployment.

The actual invoice route now disables Add from inventory at the existing
100-line editor limit and explains that limit. Payment entry retains its own
status/balance/complete-read conditions; reaching the line limit alone does not
disable it. Existing invoices above the supported display window remain locked.

The fresh line-count preflight still occurs before any write. A complete
100-line response now raises a distinct no-write capacity error. An incomplete
or failed preflight does not raise FinancialWriteUncertain or claim that an
invoice mutation may have completed. The existing post-dispatch uncertainty and
no-blind-retry handling remains unchanged.

Twenty actual-source extracted mutation tests and 43 existing inventory handler
tests passed locally through TypeScript transpilation and Node's test runner.
Four additional real-route/QueryClient regressions cover exact-100 controls,
99-to-100 totals/refresh, count growth before dispatch, and read-error feedback.
They run in GitHub alongside the 70 retained invoice route tests; their result
must be read from the exact published head, not inferred from local AST tests.

The four UI tests use SDK doubles, not a real backend. This change does not make
line insertion and total recalculation atomic, extend the editor beyond 100
lines, prove stock/ledger reconciliation, or complete the Shop Manager release.
