# Customer commercial history request-bound reads

2026-10-15 Asia/Manila. Branch `completion/customer-commercial-request-bound`,
stacked on PR #26 docs head `9b1fa59`. Read-only application candidate; not live
invoice/quote acceptance, authority repair or deployment.

Published as draft PR #27, code `56105e7` and test correction `0be35b0`, stacked on verified PR #26 docs
`9b1fa59` (six CI gates, run `38636725539`). Latest stable-snapshot verification
and remote CI are recorded below/on the completion checklist. Latest docs head
`de3ac1e` passed all six CI gates (run `38638332580`), verified on the next resume.

## Scope and native compatibility

Two browser invoice/quote queries become one fixed-kind authenticated POST read
contract using only the middleware's request-scoped caller client. Expected
account, UUID customer and allowed kind are strictly validated. Each source
independently verifies customer visibility before a fixed customer-ID-scoped list
read; actor/cancellation checks repeat before dispatch and after awaits. Returned
complete DTOs and sentinel must match customer scope and have unique IDs. Errors
stay generic; no broad/admin/browser/RPC fallback, writes or communications.

Fresh selected catalog metadata at `2026-10-14 21:00:13.169187` UTC, project
`wjxaajgvddtrxxtocxen`, is retained in
`customer-commercial-column-metadata-2026-10-15.json`, LF SHA-256
`45dc880c835758169ea60937210adf0b0e0d639475d350031d0c8863d17d8f86`.
No business rows, RPC, live DDL, mutation or history/platform changes occurred.

Invoice ID/date/due_date/status are native NOT NULL **TEXT**, not UUID/SQL date;
they are preserved verbatim. Invoice IDs are deduplicated case-sensitively;
quote UUIDs are compared case-insensitively. Invoice total is unscaled nullable
NUMERIC and created_at is nullable timestamptz. Quote created_at/status are NOT
NULL, expiry_date is a nullable SQL calendar date and total_amount is nullable
NUMERIC(10,2). Selected original declarations are in
`20260713062739_e0144043-a7a4-43b7-8fc6-050ea0304634.sql:917` and
`20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe.sql:133`.
Catalog/source compatibility is not complete schema/API/data parity or applied
history proof. No migration/source inventory facet is promoted.

Fixed projections add customer_id to validate response scope, and invoice
created_at to order by recorded timestamp rather than arbitrary legacy date text.
Both sources sort created_at descending/nulls last then ID descending, fetch 26
and display 25 with a sentinel-derived `hasMore`. The invoice limit explicitly
means most recently **recorded** invoices, not a normalized issuance chronology.
Legacy invoice dates are not rewritten; only valid YYYY-MM-DD values get calendar
formatting in UTC, and other text is explicitly unrecognized. Quote calendar
dates avoid timezone day shifts. PHP display preserves the received JS number
where possible, not lost SQL NUMERIC precision or financial reconciliation.

## Freshness and evidence limits

The outer authenticated account/customer key remounts private source observers.
Each source is independently stale-on-arrival with zero unused-cache retention,
always refetches on mount, has no placeholder/automatic retry and requires a
successful post-mount fetch. Pending/refetch/error/unavailable responses hide old
rows and cap captions; immediate refresh masking and independent generic retry
prevent stale records from looking current. Available-empty and unavailable
remain separate. Signals are forwarded; late old-account/customer results must
not contaminate current props/cache. Existing workspace links add no write path.

This is a request/response/cache contract. Separate customer/list snapshots do
not prove atomic revocation; forwarded HTTP signals do not establish PostgreSQL
cancellation. Existing RLS still depends on unresolved native profile/module/
provisioning authority. Mocked unit/component tests do not prove JWT/HTTP/API/RLS,
real customer compatibility, mobile rendering or current live business behavior.

Focused handler tests pass 36/36; component tests pass 23/23. Full application
tests pass 576/576 across 43 files with two workers, report checker exit 0 and
no unexpected/quarantined failures. Focused ESLint/format/diff checks and final
full TypeScript check pass against corrected stable files. Independent
server/source review found no concrete blocker; the invoice fixture and
observer-option test corrections are verified by a second full 576/576 run and
report checker. Full-checkout CI is verified. No tooling changes (prior suite 156/156).
No paid resource, SQL/grant/platform change or deployment.
Supabase privilege/security guidance is used to retain the caller client and
avoid widening permissions for the application reader.

## Exact next action

After verifying/publishing this slice, replace communications reads with the same
actor/freshness/bounded-sentinel safeguards. Keep logging-entry repair separate.
Reproduce current reminder integrity/policy behavior offline before reminder read
and entry contracts. See `CUSTOMER_CARD_REMAINING_GATES.md` for observed current
policies and form/attribution mismatches. Continue native writer/security closure,
baseline/upgrade/recovery, strict private-vehicle consent/tenure/retention and
mobile/pilot/hosting gates. Activity APIs remain unapplied; no consumer release.
