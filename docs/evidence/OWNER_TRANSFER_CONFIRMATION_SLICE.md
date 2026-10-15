# Admin owner-row transfer: confirmation and request isolation

2026-10-15 Asia/Manila. Published draft
[PR #46](https://github.com/Hunting-Fishing/motorsales365/pull/46), code
`8176dc996acb0bf64d94a0c600434d382c9dd698`, branch
`completion/owner-transfer-confirmation`, stacked on PR #45 docs `53350cf`.
**Application hardening, not complete ownership transfer, audit, native-access
reconciliation or production acceptance.** No schema/RPC/policy/grant is added.

## Delivered

- The existing browser UPDATE compares business ID **and the displayed prior
  owner**, using IS NULL for an unowned business. It requests only `id,owner_id`
  and requires exactly one valid matching returned business/new-owner row.
  Empty/multiple/mismatched/malformed rows cannot produce success, close the
  dialog or trigger its transfer callback. UUID comparison is case-insensitive.
- Backend/transport/build failures are caught and shown generically; raw private
  SQL/network details are not echoed. An unconfirmed outcome blocks another
  submission in that form and tells the operator to refresh/inspect business
  details before retrying; it does not observe or attest inspection/refresh.
  No automatic mutation retry or rollback claim.
- Account/business/prior-owner/open transitions remount the private form.
  Independent search/transfer flights and lifecycle epochs suppress old results,
  callbacks/toasts and old dismiss events, including account A→B→A and StrictMode.
  Input/filter changes invalidate old results/selection. A synchronous one-flight
  ref captures the selected owner before await and blocks double dispatch.
- Close invalidates synchronously even when the parent ignores the close request.
  AbortController/AbortSignal are best-effort transport controls, **not evidence
  that the server never executed or rolled back a dispatched UPDATE**. A confirmed
  consumer-callback exception cannot leave the old form resubmittable or close a
  newly changed business context.
- Labelled search, native selectable buttons and pressed states improve markup
  semantics. The badge says email confirmed, not generally verified identity.
  This is not a WCAG, real-dialog keyboard/focus, visual/mobile or browser pilot
  acceptance claim; the tests use a mocked dialog transport/UI boundary.

## Authority and outcome limits

The same authenticated browser Supabase client and existing table RLS remain the
authority. The server's audited admin user search is unchanged; it does not
authorize the separate mutation by itself. Client account/epoch checks do not
bind an immutable original human/server session, prevent ABA/concurrent owner
changes or prove role freshness. Previous-owner comparison is not a reviewed
database lock/revalidation/idempotency/audit contract.

Success text confirms the returned **business owner row only**, not staff,
native profiles/roles, linked shops, receipts, history, billing or related access.
The existing incoming owner-intent trigger and global profile/admin-audit effects
remain outside this UI proof; PR #45's selected partial SQL characterization is
not complete writer closure. A lost response can leave a committed outcome even
if the old form suppresses callbacks. Closing/reopening is not outcome recovery.

There is no new service client, mutation RPC, permission exception, automatic
native reconciliation or authority adoption. The three applied legacy helper
restrictions are preserved without replay. All baseline/replay/parity/release,
operator recovery, real API/role/session/concurrency, consent/tenure and full-media
deployment gates remain unchanged. No sparse checkout artifact may deploy.

## Verification

- 43 focused mocked React/transport tests pass (39.77s initial focused run).
- Final full application suite: **1,029/1,029 across 54 files** (112.60s), including
  the final strengthened late-private-result assertion; no quarantine/failure/skip.
- Full TypeScript passes. ESLint, formatting/diff and independent source/test
  review pass; review added known-confirmed callback-exception closure.
- Same-run parent tooling passed in separate serial commands: 384 CI-tooling
  and 10 receipt-asset tests, 394 total. It is not one combined app/database command
  or new production behavior verification. Initial code CI `38678357766` has four
  gates passed/build and unit pending at capture; hosting
  `9b812562-12a1-4f84-b12d-08b43068ac0b` failed separately and wrapper
  `38678357989` skipped migrations/production deployment. The later documentation
  head requires its own check.

Migration impact/live application calls/deployment: none. One earlier read-only
catalog call belongs to PR #45, not a live transfer test. No paid resources,
customer communication, user data deletion/repair or history action occurred.
Current SDK semantics verified against
[returned-row modifiers](https://supabase.com/docs/reference/javascript/using-modifiers-select)
and [fetch AbortSignal](https://supabase.com/docs/reference/javascript/using-modifiers-abortsignal).
Supabase safety skills kept UI confirmation separate from database authority.

Next verify PR #46 and PR #45 latest checks; then recover/compose the actual
owner-intent → recompute/derive → global role/profile/admin-audit writer chain
before an atomic, attributable claim/transfer candidate or native owner positives.
Keep original-actor, pending/current-owner conflict, idempotency, trusted team/
management, independent sessions and full recovery release prerequisites explicit.
The same-chat heartbeat continues without a duplicate automation.

## LF artifact pins

| Artifact                                                       | UTF-8 LF bytes | SHA-256                                                            |
| -------------------------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| `src/components/admin/transfer-business-owner-dialog.tsx`      |          16401 | `2b82a235bb4ecc79cae23e6c3ba42e216040965a5275d3f44863cdc8d9c7ae9d` |
| `src/components/admin/transfer-business-owner-dialog.test.tsx` |          20529 | `1ffcf6f9ea6011cc703132e633a07c1482847d74300c57d1a45eec9e06679f72` |
