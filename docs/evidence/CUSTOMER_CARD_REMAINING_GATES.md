# Remaining Customer 360 card read and entry gates

2026-10-15 Asia/Manila. Bounded source review and metadata-only observations;
not live business acceptance, an authority repair or deployment.

## Current narrow metadata

Project `wjxaajgvddtrxxtocxen`, read-only catalog SELECTs only:

- `customer-card-policy-metadata-2026-10-15.json`, observed
  `2026-10-14 20:53:31.861799` UTC, LF SHA-256
  `cea708c4ba5d4ab520347cba75c83f8552a5d82d2c55eb42b8721162ac4d6c13`.
- `customer-card-shape-metadata-2026-10-15.json`, observed
  `2026-10-14 20:54:47.578436` UTC, LF SHA-256
  `7e959b0d41367135d132d210d0261ccec6ed9ad210c51ec118958cebc1511304`.

Both tables are postgres-owned, RLS-enabled/not forced, with authenticated CRUD
and owner/service privileges. Reminders currently have a single authenticated
ALL policy requiring `shop_id=get_current_user_shop_id()` for USING and CHECK;
communications require an existing visible customer in that helper's shop.
The old reminder `USING(true)` declaration is **not the observed current policy**.
The generic policy sweep in `20260805084402_cd07847a-26f0-4c31-a2fe-ab0088684f77.sql`
lines 86-115 explains the selected policy form/name; this is correspondence,
not applied-history provenance or approval to replay the sweep.

No business rows, customer communications, mutations, business RPCs, live DDL,
history or platform settings were inspected/executed. This is not complete
writer/role inheritance/security attachment closure.

## Independent read gaps

The reminders, communications and commercial cards still use shared browser
`smSupabase` queries with account/customer keys but no expected-account versus
request-actor check, cancellation forwarding or strict response scope validation.
Asynchronous bearer acquisition can occur after a cache key is captured; a key
alone does not bind the eventual reader identity. The keyed customer parent now
protects primary revalidation and ordinary account/customer remounts, not each
child's independent browser dispatch/freshness.

These cards do not require a post-mount fetch or hide retained rows throughout
`isFetching`. Communications counts and commercial cap captions can inspect
retained data outside loading/error branches. None uses an ID tie-breaker.
Reminders are unbounded; communications silently stop at 200. Invoices/quotes
fetch 26/display 25 but still need strict fields and fresh independent states.

## Entry and integrity gaps (not fixed by read-only UI work)

The observed reminder table has nullable `shop_id` with no default, only a PK,
no customer/shop/vehicle FK or CHECK, and one enabled BEFORE UPDATE timestamp
trigger. There is no observed INSERT trigger to populate shop identity. Current
card creation omits `shop_id`/`created_by`; its completion/deletion filters only
record ID and does not confirm affected rows. The current shop-only policy does
not itself bind reminder customer/vehicle IDs to the same shop. No actual insert
or cross-shop business-row experiment was performed; prove those cases offline
before claiming entry success or designing a forward integrity contract.

Communications' current catalog retains type `email|phone|text|in-person`, direction
`incoming|outgoing`, and status `completed|pending|failed` CHECKs. Content and
staff_member_id/name are NOT NULL without defaults; only two internal customer-FK
triggers exist. The current form sends `call/outbound/logged`, can send null
content and omits staff attribution. Those source payloads conflict with observed
constraints; no real logging attempt was made. Do not silently relax CHECKs or
fabricate a staff identity to make the form succeed.

## Dependency order

1. Replace commercial invoice/quote browser reads with actor-bound caller reads,
   visible-customer gates, strict customer-scoped DTOs, deterministic 26/25
   bounds and independent freshness/error/cap states. Preserve native invoice
   TEXT IDs/date/due_date; do not blindly reuse UUID/timestamp schemas. Verify
   selected current column metadata before implementation.
2. Do the same for communications, with a bounded sentinel and honest counts.
   Keep logging mutation repair separate from read-contract changes.
3. Reproduce reminders' selected actual DDL/current policy composition offline:
   missing shop identity, mismatched customer/shop, two-shop denial and affected
   rows. Then implement bounded actor-bound reminder reads. A new application
   reader is not database authority closure.
4. Build separately reviewed entry contracts with validated schema vocabulary,
   trustworthy staff/shop attribution, actor/customer binding, transactional
   integrity and explicit affected-row confirmation. Preserve data; no destructive
   backfill, broad grant or unverified identity repair.

All steps retain native provisioning/offboarding, baseline/upgrade/recovery,
strict private consent/tenure, pilot/mobile and hosting release prerequisites.
