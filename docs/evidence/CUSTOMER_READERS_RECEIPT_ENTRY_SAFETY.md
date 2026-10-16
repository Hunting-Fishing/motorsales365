# Customer 360 readers and receipt entry safety

16 October 2026, Asia/Manila. Source
`a56480a129bc72f93e381ecffd93e5f2ea10a61b`, same integrated branch and draft
[PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68).
Publication and exact-head CI are recorded separately after verification.
This is connected application safety work, not production acceptance.

## Connected customer readers

The existing commercial and communications handlers now use the unchanged
`captureNativeRequestCaller` helper before request access. They verify the
same-client explicit-token current Auth record and retain the captured caller
checks at every existing readiness checkpoint. Early account/input errors,
primary customer visibility, selected projections, sorting, limits and returned
values are unchanged. Commercial retains its 26-row cap and legacy invoice TEXT
identities; communications retains its 201-row cap and date/ID ordering.

Actual-handler tests cover malformed credentials/verified claims, current-user
lookup failures, observed client/method/claim/actor replacement, abort, the
ordinary 10-second bound and ignored late results. These use synthetic Auth and
native-query responses. They do not establish strict session revocation,
original-human provenance, native-shop membership, team/claim/offboarding or
real API/RLS authority. Generated middleware and the caller helper are unchanged.

## Receipt entry

One synchronous latch now admits Save, Confirm, cloud scan and local OCR within
the committed editor lifetime. Account/target/logout/unmount changes fence old
responses before further dispatch or UI effects. Entries and selected files are
captured at admission; shared validation rejects invalid manual/file input
before draft creation. Server input validation uses the same field bounds,
normalization, defaults and review predicate as before; equivalence tests retain
the previous inline validator as an oracle.

New draft acknowledgments require the exact UUID and owner/draft/media path.
Upload acknowledgments require the selected bucket/path and no error. An
"already exists" message is no longer treated as evidence of successful upload.
No overwrite or cleanup is attempted. A save requires the existing RPC's exact
null/void transport acknowledgment before closing. Null is not a durable receipt
or proof of persisted financial values; a path acknowledgment is not file-byte
provenance.

An unacknowledged draft/upload/save outcome holds this mounted editor, retains
entries and prevents blind retry or automatic deletion. The operator can
explicitly close and check existing receipts. The hold does not survive
close/remount/reopen, cancel pending backend work or provide durable idempotency.
Known database rejections are conservatively held because the current error
contract does not attest rollback. An acknowledged draft/upload followed by a
cloud scan failure still permits manual saving against that same draft/path,
without another creation/upload. Existing cloud consent and manual correction
remain; no provider is configured or activated.

The prior private-file opener's 33 tests and in-flight StrictMode proof remain.
New editor in-flight StrictMode replay is not specifically tested. Receipt lists,
retained-user Auth loading, same-account permissions, installation/sharing/expense
writers and durable purchase/expense recovery remain separate dependencies.

## Verification

- Commercial 126/126; communications 135/135. Their independent format/lint and
  read-only review pass.
- Receipt panel 82/82, including 33 retained private-opener tests and 49 entry
  regressions; shared receipt/schema tests 31/31, including 26 new cases.
- Root final six-suite run: 533/533 across six files, 15.19s, single worker and
  ordinary timeouts. Includes caller helper92/customer detail67. No failures,
  skips or quarantine change. Independent source/test/CI review found no
  actionable issue.
- Full TypeScript passes. First check caught only a test-mock fetcher-options
  inference error; an explicit test-only unknown cast preserves behavior. A
  1536-MiB compiler run exhausted its selected heap; a serialized 3072-MiB run
  passed. This is not timeout or assertion weakening.
- Ten-file changed-line ESLint against `a69903a7`: zero new errors/warnings;
  13 existing findings elsewhere. Format/diff checks pass. Both offline CI
  wiring tests pass (114.223ms).
- The unconditional, single-worker, never-quarantined CI step now includes all
  six suites. All six Ubuntu-family pins, native PostgreSQL17 Parts/quote paths,
  ordinary timeouts and quarantine are retained. Docker is not used.
- Fresh complete `npm run build` passes at `a56480a1`, including client/server
  packaging. Existing route-test, module-directive/chunk and Wrangler-main
  warnings remain. All 214 tracked Git/source/output public copies verify,
  alongside Worker `motorsales365`/`index.mjs`, canonical backend, 15 OCR/202 PDF
  assets and the browser-engine/server boundary. No sparse artifact or upload.
  Local build/focused results and parent CI are not new-head CI or runtime proof.

Parent publication `a69903a7` now passes all six Actions gates in run
`38846180291`. Completed unit job `116797113345` confirms critical192/192
(3.95s), locked quote94/94 and application2,745/2,745 across80files (52.00s), zero
unexpected/quarantined failures; overall log truncated, summaries/checker present.
Its untruncated native log confirms actual PG17.11, Parts247/247, six quote
scenario groups and cleanup, with 47 retained migration replay failures. This
does not prove the whole baseline or this newer source. Wrapper preview skip is
not an upload; migrations/production/Supabase Preview skipped. Independent
Workers build `ef57aefb-0ec5-4e48-8daf-81514569432c` failed with ID/link only;
its fresh cause is unverified.

## Release impact and next dependency

No migration/SQL/ACL/Auth/business write, restriction replay, provider activation,
customer send, Docker, new hosted resource/cost, upload/deployment or merge.
The sole hosted backend remains `wjxaajgvddtrxxtocxen`; 366 AI and Barangay Buddy
are untouched. The quote SQL candidate remains revoked/unapplied/unconnected.
Main, PR base/draft and branch histories are preserved.

Next bounded connected slice: receipt and shop-link read lifetimes, with
per-mounted account/target keys, signal forwarding, fresh-only loading/error
rendering and deferred ABA/refetch/logout tests. Preserve existing invalidation
prefixes; do not mount read/write controls from nonfresh retained rows. Then
bound the existing receipt/shop-link reader DTOs and compose expected-account
caller denial without granting authority. Server typed confirmed/rejected/unknown
outcomes and durable retry/recovery remain separate writer work. Trusted fresh
original-human/native-team/claim/offboarding authority, real API/private-storage/
transaction/restore, synthetic pilot and owner acceptance remain release gates.
The 22 October target is not a verified forecast or permission to cut scope.
