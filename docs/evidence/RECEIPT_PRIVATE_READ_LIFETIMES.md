# Receipt and shop link read lifetimes

16 October 2026, Asia/Manila. Source
`eb90d15c1805cb7f004bdb7a7db384b89219aa6b`, same integrated candidate and draft
[PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68).
Receipt and owner shop-link lists now separate each mounted account/target read
from older cached results. This closes selected UI privacy gaps, not the server
reader, authorization, transaction or recovery acceptance gates.

## Connected behavior

Both queries use per-mount identities after the existing account/target prefixes,
forward Query's signal as a top-level server-function option, disable automatic
query retry and discard their unused private cache entries. No placeholder data
is displayed. Auth bootstrap loading deliberately tears down the committed
private scope even when Auth retains a user; it is not fresh-role evidence.

Rows, category filters and empty states require a successful, idle,
non-invalidated snapshot. Fetching, offline-paused and invalidated-without-refetch
states hide retained private rows. Errors are generic and have explicit retry;
repeated retries join in-flight work instead of canceling and redispatching it.
Disabled native shop-link reads do not show perpetual loading. Empty labels refer
to the visible snapshot, not proof that no database records exist.

New list actions also inspect exact-key QueryClient state synchronously. They
refuse old DOM handlers after invalidation/fetch/data changes, before React's next
commit. Owner link actions require their current link read; native shop-code
creation requires the current receipt read. These checks add denial, not a new
permission or trusted shop identity.

Ordinary background refresh, failure and success preserve active receipt editors,
installation dialogs, entered values, acknowledged IDs and unknown-outcome holds.
Their identities and completed async chains are unchanged. Account/target/logout/
Auth-loading teardown remains distinct. Pending existing mutation/opener behavior,
same-account authority revocation and other mutation error/lifetime paths are not
made safe merely by hiding list rows.

## Verification

- Panel 101/101: 82 retained tests plus 19 new cases, 51.18s total and 7.89s test
  execution, single threads worker/768-MiB heap and ordinary timeouts. No failures,
  skips or quarantine changes. Startup/import/environment time is included in
  the total, not a relaxed assertion timeout.
- New cases cover actual nonce keys/top-level signals, old caches, retained-user
  Auth loading, deferred account/vehicle/shop ABA, logout/unmount, independent
  refetch errors/retry, same-tick old controls, paused/invalidated reads and
  editor/installation/unknown-hold preservation.
- The existing StrictMode opener regression still starts an actual pre-cleanup
  signed read. Its fixture seeds the newly generated QueryCache key with a
  test-only future timestamp before first layout commit; it does not mock a
  constant mount ID or weaken the test into a post-replay click.
- Independent source/test review found and corrected paused-read rendering;
  a query invalidation subscription closes invalidate-without-refetch rendering.
  Final read-only review has no actionable findings. Reviewer ran no tests.
- Two-file changed-line lint against `3dfca78a`: zero new errors/warnings;
  seven older findings elsewhere. Owned formatting and diff checks pass.
- Root independently verified byte-identical opener/editor/installation bodies
  against `3dfca78a`, normalized to LF: opener 733 bytes
  `a7f0034545028ab81e42003f2eee1f727dcbdf56fa386851934f67b887c774e6`;
  editor 20,621 bytes `f5367be1025ace9f6068e1785750eb403a1071014a0281ec2e9eea3e38e72df8`;
  installation 2,127 bytes `8aad1cf62319a9805c3bf016863d73290b6ac50077aafc96f2bfa6b431281d52`.
- Full integrated TypeScript and fresh complete `npm run build` pass at
  `bd5e4b04`. All 214 tracked Git/source/output public copies verify, alongside
  Worker `motorsales365`/`index.mjs`, canonical backend, 15 OCR/202 PDF assets and
  no browser engine in the server package. Expected route-test/module-directive/
  chunk/Wrangler-main warnings remain. No sparse artifact or upload. Publication/
  new-head CI remain separately recorded; packaging is not runtime acceptance.
  Existing mandatory six-suite receipt/customer CI already includes this test.
- Full TypeScript's first run found only the StrictMode fixture's required
  Query.setData `manual` option. Test-only `manual: true` at `bd5e4b04` matches
  QueryClient manual seeding and preserves the future timestamp/in-flight proof.
  Root final combined eight suites pass 703/703 (35.65s), no failures/skips or
  timeout/quarantine changes. Seven-file integrated changed-line lint has zero
  new errors/warnings and 23 older findings elsewhere; independent review clears
  the fixture correction and integrated retail/CI slice.

The tests use real React Query and synthetic server/Storage responses. Query
signal forwarding is not proven HTTP cancellation, real Auth/RLS/private-object
acceptance or a guarantee that pending server work stops. Query identity and
current-render witnesses do not establish complete or authorized server DTOs.

## Remaining server and release gates

Next receipt contract work must compose expected-account/captured-caller denial,
fixed projections, bounded complete DTOs and generic failures into the two
existing readers. Retained attachment SQL returns explicit booleans for visible
requested receipts but omits inaccessible IDs. The current server's truthy
coercion can return an earlier receipt with omitted attachment evidence; missing,
extra or malformed attachment maps must become unavailable, not "not uploaded".

Preserve native dual vehicle IDs, owner-visible linked shop receipts, shared owner
receipts in shop views and per-row write restrictions. Native NUMERIC/DATE/text
contracts are broader than entry validation; do not reuse trimming/defaulting
entry schemas for retained reads. A capped or unknown item set cannot become a
complete editable draft, because saving replaces all items. Bound/completeness
and editor eligibility need a connected contract, not silent truncation.

No SQL, migration, grant, restriction replay, live Auth/business write, signup,
provider activation, customer send, Docker, new hosted resource/cost, upload,
deployment or merge. Sole hosted backend remains `wjxaajgvddtrxxtocxen`; other
projects and main are unchanged. Trusted original-human/fresh session/native-team/
claim/offboarding authority, durable financial/stock/retry writers, real API/
private-storage/transaction/restore and designated pilot/owner acceptance remain
open. The revoked quote candidate is not activated by these UI results.

Latest read-only browser check found the prepared QA signup still unsubmitted,
with contact/credential fields blank and Terms unchecked. The tab is retained for
owner handoff; no personal/staff identity is changed and no secret is requested.
Native `psql`/`pg_ctl`/`postgres`/Go/Supabase CLI were not on PATH and the standard
Program Files PostgreSQL directory was absent in this bounded local probe. This
does not inventory every possible installation; it supplies no real local API/
Auth/Storage/restore acceptance. Docker remains prohibited, not a setup request.
