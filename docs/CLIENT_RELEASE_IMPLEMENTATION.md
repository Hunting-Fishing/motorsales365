# Client release implementation checkpoint

20 October 2026. Scope: multiple independent Parts Shops and Shop Managers.
This is development evidence, not client acceptance or production approval.

## Connected inventory fixes

- Manager/member permission replies require boolean true without an SDK error.
  Malformed truthy cost permissions cannot trigger the private-cost RPC.
- Business/item identifiers are validated before the relevant SDK calls.
- Metadata-only inventory updates preserve omitted quantities, visibility,
  prices, locations and canonical links instead of applying creation defaults.
- Update acknowledgments must match the selected item and business. Deletion
  now filters both identifiers and requires the exact returned row before success.
- The pre-existing manual adjustment interlock remains; it is not a completed
  adjustment feature. Other direct quantity writers and native authorization,
  transaction isolation, retention and durable retry still require work.

## Regression evidence

The sandbox reconstructed the full inventory handler from GitHub and verified
its original Git blob SHA. The new 43 handler/SDK-double tests pass locally via
Node's test runner with TypeScript transpilation. Running the same tests against
the previous source gives 34 failures and nine passes; no assertions were removed.
A focused strict TypeScript check of the new test sources passes. This is not a
full application typecheck, an actual middleware execution or real JWT/RLS proof.

The new invoice test reads the real route AST and executes its actual inventory
mutation and helpers with SDK doubles. Twenty local tests pass on the selected
route source excerpts. Repository CI must independently execute it against the
complete route. Cases include 99-to-100 success, 100/101 pre-write refusal,
invalid counts/rows, read errors, context loss and malformed acknowledgments.
One case explicitly preserves the unresolved concurrent-growth partial-write
boundary; it must not be described as atomic invoicing acceptance.

The earlier branch's CI failed at the stock writer source-integrity step and
changed-line formatting. The revised inventory source pin, bounded span and
metadata digests are updated together with these independently targeted tests.
All 22 source entries, ten writer families and seven false readiness flags are
retained. Full frontier execution requires the complete repository and is pending
CI, not inferred from the local changed-file pin check.

A read-only supplemental workflow runs the focused client regressions and the
unchanged full frontier test set. Existing full CI, native PostgreSQL, OCR,
quarantine, deployment and migration gates are not removed or weakened.

## Release status

No database migration, live data change, privilege expansion, provider activation,
main merge or production deployment is part of this checkpoint. Exact new-head
GitHub results must be read separately. The working atomic stock operation,
inter-store fulfillment, complete Shop Manager financial loop, staging and
multi-business acceptance remain release requirements.
