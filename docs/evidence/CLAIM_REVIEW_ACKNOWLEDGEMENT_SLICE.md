# Admin claim review: acknowledgement and private-context lifetime

2026-10-15 Asia/Manila. Application-only hardening; not atomic approval, confirmed
ownership transfer, original-actor audit, native reconciliation or production
acceptance. Published draft [PR #48](https://github.com/Hunting-Fishing/motorsales365/pull/48),
code `59228c57be456d62c2e2cd67c7078dec4ab63fde`, branch
`completion/claim-review-acknowledgement`, stacked on PR #47 docs
`8b1b38e895cd8b867ee0eb429c83b46c010aebfe`. That parent's latest CI
`38681676475` has five gates passed/unit pending at capture; hosting
`40775dcb-bd16-4afe-823b-01bd8c5665c5` failed separately and wrapper
`38681676472` skipped migrations/production deployment. No preview upload inferred.

## Outcome contract

The existing review handler returns only `{ok:true}`. It is unchanged; PR #45
characterizes its service RPC followed by unchecked, separate reviewer stamping.
Reject-path affected-row, count/reset and other legacy error-handling gaps are
not repaired by this UI. The handler's whole-file UTF-8 LF SHA256 remains
`cc0960e0d7eb1ee065d405f112a9d3a2e7f5d03a57ee80e9908f0901735b52d6`.

The page accepts only the exact acknowledgement envelope. It no longer announces
“Claim approved/rejected” or “Approve & transfer” as a confirmed mutation. Neutral
feedback explicitly says stored status, ownership and audit were not confirmed.
There is no optimistic status/owner update or automatic mutation retry. One
synchronous gate covers both decisions and every visible claim, capturing the
claim target, decision and notes before dispatch. An acknowledged claim cannot be
requested again within that mounted account session. Uncertain outcomes require
manual record inspection; refreshing a snapshot does not unlock or attest them.

## Private reads and lifetime boundary

The private page remounts on authenticated account change; signed-out/loading
renders mount no private readers. Pending-list keys include account; route-local
audit keys include account/claim. Fresh-after-mount/read controls hide cached rows
while fetching or on failure; no unscoped cache fallback. Reads consume abort
signals and disable automatic query retries. Strict list/audit shapes with
100-claim/200-audit-entry caps
validate matching claim/evidence/claimant identities instead of displaying a
wrong-context response. These are client read contracts, not database role checks.

Account and observed-render target/generation fencing suppresses old response feedback and cache
invalidation, including account and target changes away and back. A dispatched
request whose visible matching context is observed lost stays uncertain within the old
mounted account session. Private signed-URL previews remount on account/evidence/
storage-path changes, clear old URL state and fence late responses; only validated
HTTPS URLs are rendered. Generic errors do not display backend exception payloads.

The route-local audit reader displays recorded snapshots and stored actor labels;
NULL actor is “Actor not recorded”, not an inferred System/human actor. No claim
of verified original-actor attribution or complete transfer audit. Evidence and
empty-queue wording describe visible snapshots, not definitive global absence.
The unchanged list handler may return partial related-source reads; strict UI
envelopes cannot attest the handler's query/error completeness.

## Limits and next action

Abort suppresses/requests cancellation of transport work, not a rollback of a
committed server transaction. Client account/epoch/fingerprint checks are not
immutable server actor/session binding, fresh role verification, SQL row locks,
idempotency or conflict serialization. Unobserved cache transitions and database
ABA/concurrency are not fenced by these client checks. Related evidence arrays/
dictionaries do not have a global response cap. No new service client, RPC, database
permission, policy, schema, migration or caller authorization exception is added.
The shared non-route audit widget and other review callers are not changed.

39 focused mocked React/transport cases pass (3.22s final focused run). Full
TypeScript, ESLint (zero errors/warnings), formatting/diff and independent
source/test review pass. Final full serial application suite: **1,068/1,068
across 55 files** (86.35s), no failures/skips/quarantine. Same-run parent tooling
405/405 plus10 receipt-asset tests passed in separate sequential commands (415
total), not one combined application/production test. Review corrected observed-target/masking/ABA
lock behavior and ensured tests await actual visible context boundaries; raw
unobserved cache assignment alone is not a rendered lifetime test. No real
HTTP/JWT/RLS, independent sessions, visual/mobile,
accessibility/owner pilot or production workflow acceptance is inferred.
Initial app-code CI `38681989244` is running; hosting
`2b616737-6cb3-4f8b-ab9d-8dfd2a5d3825` failed separately and wrapper
`38681989204` skipped migrations/production deployment. The later documentation
head requires its own next-resume verification, not acceptance from parent gates.
No sparse local checkout build may deploy. The three already-applied restrictions
are preserved without replay; all baseline/replay/parity/release flags stay false.

Migration impact/live application calls/deployment: none. The two earlier catalog-
only calls belong to PR #47; no live review/transfer/API was exercised here.

Next verify PR #48 and #47 latest head/checks, then close the authorized
original-actor/pending/current-owner/idempotent atomic
claim/transfer contract and trusted team/native/shift/audit dependencies, then
operator recovery and real API/concurrency acceptance. Receipt/mobile/consent/
tenure/private retention/full-media hosting gates remain open. The recurring
same-chat continuation remains active without a duplicate automation. Supabase
safety skills kept client acknowledgement separate from database authority.

## LF artifact pins

| Artifact                                           | UTF-8 LF bytes | SHA-256                                                            |
| -------------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| `src/routes/admin.claims.tsx`                      |          32169 | `289fa29420ec982b59aebec34c5c2d77a06ca91bf53fae8c67bd9896fc3d5b8e` |
| `src/routes/admin.claims.test.tsx`                 |          27853 | `11351ccbb9cf9494416125683fb239ccc751435991fef171c4336d76d088bdee` |
| `src/lib/business-claims.functions.ts` (unchanged) |          21743 | `cc0960e0d7eb1ee065d405f112a9d3a2e7f5d03a57ee80e9908f0901735b52d6` |
