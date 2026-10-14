# Customer communications request-bound history

2026-10-15 Asia/Manila. Branch `completion/customer-communications-request-bound`,
stacked on verified PR #27 docs head `de3ac1e` (all six CI gates, run
`38638332580`). Application-only review candidate; not a live workflow release,
tenant-authority repair or a working logging-entry contract.

Published as draft PR #28, code `f30cb90`. Latest docs head `b6478f7` passed all
six CI gates (run `38639864235`), verified on the next slice's resume. This is
not a hosting upload or production acceptance.

## Read and visibility contract

The communications card's shared browser query is replaced by an authenticated
POST server reader accepting only expected-account and customer UUIDs. The
verified middleware subject must match before handler request/schema access;
actor and cancellation checks repeat around dispatch/await boundaries. The
reader retains only the middleware's request-scoped caller client. Every request
independently checks a visible customer ID before reading fixed customer-scoped
communications summaries. No admin/browser/RPC fallback or mutation is used.

Projection: id, customer_id, type, direction, subject, content, date,
staff_member_name and status. Private staff identifiers/templates/attachments
are excluded. Exact complete DTOs validate UUID identities/customer scope,
duplicate IDs case-insensitively, required text/timestamp fields and current
CHECK vocabulary. Subject alone is nullable in this projection. Existing long
text is not assigned invented short caps. Backend/validation/cancellation errors
remain generic failures, not empty success.

Each request sorts date descending/nulls last then ID descending, fetches 201,
validates the sentinel too, and returns at most 200 plus `hasMore`. Available
empty and customer-unavailable differ. A keyed authenticated account/customer
boundary remounts private observers. Queries are stale-on-arrival, retain no
unused cache, always refetch on mount, use no placeholder/automatic retry and
require post-mount successful fetching. Refresh masks private content immediately;
mount/refetch/error/unavailable states hide old rows, counts and cap captions.
Only fresh visible rows produce counts (200+ when truncated), with an explicit
most-recent-visible label. Signals are forwarded; old-context late results are
ignored and observers removed on account/customer change or sign-out.

Actual stored type/direction/status labels are displayed; recorded staff names
are labeled as stored labels, not verified human identities. Log status is not
delivery confirmation. The known-invalid browser entry form is removed from
this local candidate and replaced by a disabled Log entry control with an explicit
staff-attribution/entry-validation gate. This prevents the candidate offering a
known-incompatible write; it does not implement or permanently abandon logging.
No customer message is sent, no record is inserted/deleted/modified, and nothing
is deployed. Restore entry only with a separately tested trusted write contract.

## Narrow catalog and performance evidence

Project `wjxaajgvddtrxxtocxen`, read-only catalog only:

- `customer-card-integrity-metadata-2026-10-15.json`, table observations at
  `2026-10-14 21:14:13.699192` UTC, helper/column observations at 21:16:30 UTC.
  LF SHA-256 `e7a667979e7a3ba9ac0056370149d36fc05d1a64b4aeb630ad2bb5eff0f7d1aa`.
- `customer-card-index-metadata-2026-10-15.json`, at
  `2026-10-14 21:17:49.905593` UTC. LF SHA-256
  `2b3fec3f37eb1b5585ec9b607181f88718cb7909fb92606c09520e4dcc8733c4`.

The selected current communication policy, constraints and triggers match the
preceding dated observations: authenticated CRUD, customer/shop EXISTS policy,
validated type/direction/status CHECKs, required content/staff attribution and a
validated customer FK with its two internal triggers. Reminders remain shop-only
scoped with PK only and their timestamp trigger. No business rows, business RPC,
DDL, grants, migration history or platform settings were touched. Metadata/source
correspondence is not applied lineage, whole-schema parity or complete writers.

The performance skill prompted a targeted index check: communications has only
its valid/ready primary-key index, with no customer/date supporting index observed.
Reminders have a customer index, pending-only due-date index and PK. Output caps
do not bound database scan/sort work or response text bytes. No live business
query plan, load test or new index was executed. Before release, rehearse a
customer/date/ID index and realistic RLS/plan/load behavior on disposable data,
then review a non-destructive existing-state/index build and recovery strategy.
Do not infer low latency or production-scale readiness from these read tests.

## Verification and remaining dependencies

Focused handler tests pass 47/47; component tests pass 19/19. Full application
suite passes 642/642 across 45 files with two workers, report checker exit 0 and
no unexpected/quarantined failures. Final full TypeScript, focused ESLint,
formatting/diff checks pass. Independent source review found no concrete blocker.
No tooling change in this slice (previous 156/156). The tests mock handlers/builders
and server functions, with real React Query for UI state. They do not prove
middleware/JWT/HTTP execution, live RLS/API compatibility, database cancellation,
atomic customer/list visibility or strict instantaneous revocation. Existing
native tenant authority is still unresolved; each source remains governed by RLS.
Supabase security guidance informed caller-only access and no permission widening.

Next: publish/verify this slice, finish the separate retained-source reminder
integrity rehearsal, then bounded request-bound reminder reads. Entry/logging
contracts require verified schema vocabulary, trusted staff/shop attribution,
customer/vehicle consistency and affected-row confirmation; existing direct table
authority cannot be repaired solely by a new application writer. Continue native
writer/security/provisioning/offboarding closure, baseline/upgrade/recovery,
private consent/tenure/retention, OCR owner/mobile pilot and hosting gates.
Bootstrap/totals approval remains pending without another request. No live release.
