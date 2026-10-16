# 365-side Buddy delivery request contract

17 October 2026, Asia/Manila. Bounded N3 source prerequisite in the existing
integrated candidate/[draft PR68](https://github.com/Hunting-Fishing/motorsales365/pull/68),
not an active bridge or completed online ordering/delivery feature.

Publishedcaa1e4c4f7a9b52ca07dc0aaf1da8633cc015102 verified on canonical branch/
same draft PR68/base/title/exact prior64,364-character body/main preserved;
[evidence comment6222580829](https://github.com/Hunting-Fishing/motorsales365/pull/68#issuecomment-6222580829).
Own run38951117451 all six Actions pass. Actual unit117142431397:5,032/96 files
101.60s, zero unexpected/quarantined failures (truncated/final summaries), no
inherited pass/cancellation. Actual native117142431134 log is
untruncated PG17.11/Parts247/all18 ordered selected proofs/cleanup, bounded
57/59/157ms not full/RTO,47 replay failures retained. Preview117142433032 actually
configuration-skips/no upload; production/migration/Supabase Preview skip.
Workers0eb20ff8/check117142467128 fails, fresh cause unverified/hosting stop
unchanged. Existing follow-up source checkpoint updated/read back in place,
identity/settings/thread/creation preserved. Notes join next source without
docs-only cancellation; unit publication hold cleared, no unchanged24 rerun.
Actual build log is truncated but final214 tracked assets/Worker motorsales365/
sole365/15OCR/202PDF/server-boundary/dry-run markers are present. Fetched COMPLETE
CI merge14a1878c3ecd0f7d01569a476b1668f3172d30bb equals candidate whole tree
8c0a4920731258ced1f9dae39e102214a3b70f2d;2,586 current objects/zero missing,
not complete historical recovery. Native/preview logs were not reread unchanged.

## Implemented, intentionally unwired

`src/lib/buddy-delivery-contract.ts` defines a proposed365-side v1 delivery-request
shape for the future N2 store-split fulfillment outbox and N3 Buddy inbox.
No Buddy-side contract adoption, signed transport or durable writer is asserted.
There are no network, database, environment, secret, Auth, provider or application
imports; no handler, route, dispatcher, notification or activation is connected.

- Fixed version/sender365/receiverbuddy/event delivery.requested. Operation,
  consumer order, store, fulfillment leg, offer, area and contact references have
  distinct365 namespaces and canonical lowercase non-nil UUID shapes. These are
  structural references, not minted records or proof of identity/ownership.
- Required **independent** expected store/order/leg tuple is compared before
  creating the immutable binding. Matching caller-supplied values still cannot
  establish native authority, actual order/store relationships or enrollment.
- Fixed-field-order v1 JSON binds the entire validated immutable request, not
  just operationId. Same operation with different payload produces a different
  comparison value; a future atomic inbox/outbox must detect/reconcile conflict.
  This is not a cryptographic fingerprint, signature, ledger or replay defense.
- Strict own-data records reject missing/unknown/accessor/symbol/custom-prototype
  fields, arrays, nested free-form values and credentials/contact/location fields.
  Copies and accepted nested payloads are detached/frozen. Canonical copies have
  null prototypes; neither inherited toJSON nor known-key property interception
  can rewrite the comparison. This is not an in-process JavaScript sandbox.
- Safe integer sequence1–2147483647, exact UTC millisecond calendar timestamps,
  expiry after issue and bounded ASCII references/4096-byte canonical maximum.
  There is deliberately no chosen TTL, current-clock/replay acceptance policy or
  HTTP body parser/stream bound. Future ingress needs its own bounded raw-byte
  signature/schema/clock verification before this structural decoder.
- Minimal offer projection contains only version/offerId/expiry/opaque pickup/
  dropoff area references. It excludes privateContactRef, internal order/store/
  leg/operation IDs and full binding. Offer decoding rejects those private fields.
  Reference shape does **not** prove coarse geography; a reviewed resolver must
  enforce precision/coverage. Contact resolution remains assignment/consent-gated;
  possession of a contact reference grants no access.

The cross-project boundary remains365 `wjxaajgvddtrxxtocxen` versus separate
`Hunting-Fishing/barangaybuddy` identity/backend. No shared JWT, service key or Auth
identity mapping is introduced. The366 AI project remains untouched. No actual
consumer order, store enrollment, contact reference or delivery job is created.
Existing Parts B2B orders, service checkout and tow dispatch do not complete N2/N3.

## Exact local validation

Final source SHA256-LF
`66f35ca8932e2dae509618b6fc87b2ded3b628b47832142d74bc55094c6393f9`
(9,042 bytes); tests SHA256-LF
`629db72c2008b12984485b0a7f3849c1653166959edb3761618a3b838cb5ad52`
(21,819 bytes). Final focused Vitest24/24,1.44s; CI wiring2/2,87.2558ms; full
normal TypeScript and changed-file ESLint pass with zero findings. Independent
read-only review is clear. Normal timeouts/quarantine and all retained native
PG17/adversarial-role/transaction coverage remain unchanged.

The first22-test draft passed, then review identified two narrow inherited-property
loopholes: descriptor `in` versus own-value validation and a prototype-backed
intermediate copy. One bounded correction uses Object.hasOwn/null-prototype
copies plus two cleanup-protected regressions; final24 and full TypeScript pass.
No test expectation, privacy rule or permission was relaxed.

The new explicit, single-worker **non-quarantined** CI gate is
`Buddy delivery handoff contract (offline, never quarantined)`. Full new-head
build/type/unit/native/OCR acceptance is separate from these focused results.
No low-memory full Windows suite or repeated unchanged1231/121 suites were run.

Parent19fd2a7ed8d0e7df27168f91035b87457f076ed0 now passes all six required Actions
in38947359743, actual unit117129750943 reports5,008/95 files101.25s, zero
unexpected/quarantined failures; returned log truncated/final summaries present.
Actual native PG17.11/Parts247/all18 selected ordered proofs/cleanup and complete
current CI artifact tree are separately recorded in the Auth catalog evidence.
Parent results are not inherited by this new source, and the running parent unit
was allowed to complete before publication. Same PR/base/title/body/main history
is preserved; exact publication head/checks are recorded in the PR evidence comment.

## Next dependency and release boundary

N1 authoritative verified business/store enrollment and live available stock,
N2 atomic stock/order/store-split fulfillment and immutable durable outbox, and
N3 signed versioned ingress with durable inbox/dedupe/sequenced callbacks are
still required. Connect this proposed codec only to a reviewed authoritative
365-side transaction after those prerequisites; separately scoped owner-authorized
Buddy implementation/handoff is required before changes there.

Then prove operator signup/approval/online eligibility, coarse offers, atomic one
winner/returned acknowledgment, assignment-gated contact access, pickup/delivery/
cancellation/reassignment, missed/duplicate/out-of-order callbacks, recovery and
support/device UI. Structural timestamps are not expiry enforcement; parsing a
sequence does not implement a sequenced state machine. Delivery completion never
implies financial settlement, goods receipt or part installation.

Coverage/hours, fees/collections/payment/refund/cancellation, consent/identity,
operator eligibility and notification policy remain unresolved owner decisions.
No policies, real money, paid membership, outreach or provider activation are
inferred from this codec. Auth/native-role authority, all-writer financial/stock
transactions,47 replay failures, full baseline/private-original recovery, QA/
hosting stops, owner/device and live release acceptance remain open. No scope
cut or supported promise of22 October completion.

Migration impact/deployment: **none**. No DDL/DML/grant/history/account/settings/
private-object/365-or-Buddy production operation, Docker, paid resource or main
promotion. This is implemented source only, not live ordering or dispatch.
