# Customer reminders: caller-bound single-RPC adapter candidate

2026-10-15 Asia/Manila. Offline application candidate stacked on the unapplied
same-statement reminder API in PR #31. **Not a production release, native identity
fix, reminder writer or complete queue.** Do not deploy this consumer before a
compatible reviewed database release and all retained authority/recovery gates.
Parent docs `e51125c` passed all six CI gates (run `38644991112`), verified on
this follow-up. The separate hosting build still fails; preview upload is skipped.
Draft PR #32: `https://github.com/Hunting-Fishing/motorsales365/pull/32`, code
`dff0aa8`, branch `completion/customer-reminders-rpc-adapter`, stacked on #31.
Latest docs head `9edbd21` passed all six CI gates (run `38646246443`), verified
on the native diagnostic follow-up. No production release occurred.

## Request and response boundary

The authenticated POST reader retains strict expected-account/customer UUID input
and the middleware's caller-scoped Supabase client. It invokes only
`crm_customer_reminders({_customer_id: customerId})`; no shop/actor/filter/order/
limit override. It does not run a separate parent lookup, direct schema/table
query, browser singleton, admin/service fallback or mutation. The invoker API
owns the one-snapshot visible-parent/both-ID join; this adapter must not replace
that guarantee with two requests when the function is missing or denied.

Actor and request-abort checks surround request access, caller binding, builder
construction/modifiers, lazy dispatch and completed results. The same request
AbortSignal reaches the RPC builder; explicit retry(false) prevents SDK retries.
This is HTTP/client cancellation, not proof that PostgreSQL work was cancelled.
Missing API, source privilege/helper/database errors, malformed data, cancellation
or actor loss produce the existing generic error, not leaked backend diagnostics,
automatic retries, fabricated emptiness or a broader fallback reader.

The parser requires the exact envelope `{available, customer_id, shop_id, rows}`:

- false requires null customer/shop IDs and exactly empty rows; it maps to the
  existing unavailable result, not an exception or proof of nonexistent records.
- true requires a nonnull UUID customer matching the requested selector and a
  nonnull UUID shop from this same envelope; visible empty remains distinct.
- Every row, including the101st sentinel, has the exact nine native fields and
  both customer/shop bindings must match the validated context. Null shop,
  cross-scope/duplicate UUIDs, extra/missing fields and malformed/over-limit or
  contradictory envelopes fail closed. UUID comparisons are case-insensitive.

Native arbitrary/empty reminder_type/title/status TEXT is preserved; due_date is
a required calendar date, notes/completed_at nullable with strict timestamp
validation. No coercion, invented enum, staff identity, normalized business date
or status/completion inference. Validate at most101, then return at most100 with
hasMore. All statuses remain an earliest-due bounded snapshot, not the complete
pending/actionable workload. SQL defines due-date/UUID order; no client ordering
override or queue pagination is added.

The existing UI/result shape stays unchanged: account/customer cache isolation,
post-mount visibility checks, loading/error/refresh masking, honest cap/counts and
disabled create/complete/delete. Stored completion is not verified human audit.

## Verification and release limits

Verification:59 handler +22 unchanged UI focused tests pass. Final stable
application snapshot passes723/723 across47 files, result checker exit0/no
quarantined failures and full TypeScript. Focused ESLint/Prettier/diff and
independent source review pass. Tooling is unchanged from the191/191 verified
parent. Handler/builder and UI tests are synthetic mocks, not actual
JWT/HTTP/PostgREST/RLS, source data compatibility, database cancellation, real
concurrent transfer or production acceptance. The preceding22-case memory SQL
proof covers the selected unchanged policy/helper composition on synthetic
supports; it does not establish full native authorization or baseline parity.

The Supabase skill prompted current RPC/AbortSignal documentation and installed
SDK source verification: RPC defaults to POST and returns a modifier builder;
abortSignal and retry(false) are available. No package upgrade, API exposure/
configuration change, live business row/RPC/write/grant/history or platform
mutation. No migration change or deployment; source composition remains404/423
matched with19 unclassified and all release/baseline/replay flags false.

SQL STABLE uses the calling query's MVCC snapshot, not continuous revocation.
Read Committed versus stronger transaction snapshot semantics remain in
`CUSTOMER_REMINDERS_INVOKER_READ_CONTRACT.md`. Existing middleware validates
claims, not fresh offboarding/session revocation; mutable native profile/role/
roster/provisioning and security-writer closure are still separate prerequisites.

Next: verify the published checks, continue actual native authority/security
attachment and separately reviewed baseline/upgrade/recovery closure, then trusted
reminder entry/reference/affected-row and index/load/queue contracts. Actual
API/JWT/role and compatible deployment acceptance, private vehicle consent/tenure/
retention, original scanner recovery/owner/mobile OCR pilot and hosting gates
remain open. No pending helper restriction or release approval is inferred.

## Narrow release-state catalog refresh

At `2026-10-14 22:11:43.274436` UTC, a catalog-only SELECT in project
`wjxaajgvddtrxxtocxen` observed no public routine named crm_customer_reminders.
The API is still unapplied at that snapshot; this consumer must not ship first.
The exact approved legacy invoice converter still denies anon/authenticated
EXECUTE, retains postgres/service EXECUTE and body MD5
`c3ef84a1dfa61850a0135fdc66eb9f40`. No restriction was reapplied and no business
function was invoked. Snapshot:
`reminder-adapter-release-catalog-2026-10-15.json`. This is not complete source/
role/ACL/API parity, future absence or approval of the pending other helpers.
LF SHA-256 `9a0f07545373949a9e6fa9fc956ecc8599965dad99bbc3cb2c119e76bd808bef`.
