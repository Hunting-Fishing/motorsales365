# Shop Manager expense read boundaries

Updated 16 October 2026. Source `1953f58084eedafa8d5ab920bf3d880865971a5d`, same
integrated candidate and draft PR #68. Publication/exact new-head CI remain
pending below; the prior published
`4af1d906` result does not transfer to new source.

## Connected reader and native compatibility

The existing expense route had account-independent query keys, unbounded
category/vehicle choices, a capped expense list presented as a month-to-date
total, and failed reads presented as empty data. The new caller-bound scope and
separate expense/category/vehicle windows use the captured middleware client,
existing Auth lookup, explicit projections, exact counts and 100-row ranges.
The existing SELECT-only native shop resolver is observed before and after the
read. An observed account/token/context/abort/shop change denies return. There
is no service-role fallback, new grant, shop bootstrap, SQL or migration.

This observes the retained ID-only profile resolver; it does not repair mutable
profiles or establish trusted native-shop membership, strict session revocation,
original-human identity, delegation or an atomic cross-statement snapshot.
`NATIVE_PROFILE_RESOLUTION_PROOF.md`, `NATIVE_PROFILE_ROLE_POLICY_PROOF.md` and
the selected `commerce-creation-catalog-2026-10-16.json` are partial retained
evidence, not whole current schema/policy/FK parity or actual API acceptance.

Expenses/categories have native UUID shop bindings. Vehicles have **no shop_id**
and their customer relation is nullable, including company/fleet cohorts. A LEFT
customer embed retains visible rows instead of silently dropping unmatched
vehicles. Any returned row with a missing, hidden or wrong-shop customer binding
refuses the entire page, not a false empty inventory. Valid-bound company rows
remain visible. Named-FK/API/policy compatibility still needs actual acceptance;
these choices are not described as the complete shop vehicle inventory.

Signed NUMERIC(14,2) values and native nullable/free TEXT fields are preserved,
not rounded, added, coerced or narrowed to invented nonnegative/status rules.
Native NaN is explicitly labeled unusable for accounting. DATE handling preserves the
native wire calendar, expanded/BC years and infinities without JS Date conversion.
Primary SQL ordering and UUID ties provide stable requested windows; PostgreSQL
text collation is not equated with JavaScript locale ordering. Counts/pages may
change between reads; a window is not an atomic accounting balance or full export.

## UI lifetimes and existing write boundary

The actual expense route uses account/shop/per-mount/kind/page keys and exact
query-state admission. Private data is hidden while fetching, paused, invalidated
or failed, with separate errors and retries instead of error-to-empty conversion.
Auth/scope loss and refreshed scope versions tear down the old private shop child.
Ordinary independent list refreshes do not destroy open expense input or the
selected receipt workspace and its mounted editor/unknown-outcome holds. New
vehicle selection is fresh-only; an existing selection is not renewed authority.
The receipt panel continues its own unchanged current-target read guards.

The expense acknowledgment callback refreshes the account expense prefix while
retaining legacy-key invalidation. Another account and the independent vehicle
picker are not invalidated by that account prefix. This is refresh integration,
not posting acknowledgment or an authorization grant.

Legacy create-category, create-expense/upload and delete mutationFn bodies and
payloads remain protected. Current-only launch/UI callback guards and neutral
acknowledgments do not fence their native writes. In particular, an in-flight
upload can still be followed by the old insert after context loss; the interval
between onMutate and mutationFn is not a native fence. Number(value)||0, missing
explicit writer shop binding, affected-row/persisted-value checks, object/row
coordination and durable unknown-outcome/reopen reconciliation remain unfinished.
No atomic/financial/write recovery acceptance follows from this reader slice.

The legacy original-file opener checks its captured account/shop/read lifetime
before signing/opening and after settlement; lost attempts do not open a popup or
emit feedback. Its existing bucket/path/full-URL behavior and 600-second signing
TTL remain, not a new private-byte/URL ownership/revocation proof. The underlying
Storage request is not canceled and no live file is opened by synthetic tests.

## Verification and publication

Frozen independent review passes, including exact LF-byte preservation of all
three legacy mutationFn bodies. Serial focused regression passed **1,468/1,468
across nine suites (27.59s)**. The new UI plus receipt panel passed276/276
(18.05s); the first narrow panel run passed235/235 (15.55s). The new contract and
handler suites passed **253/253 (2.26s)** after both test-fixture corrections.
These and the41 new UI cases provide294 new synthetic cases, not real Auth/API/
RLS/private-storage/financial transaction acceptance. The actual route/QueryClient
is tested; its receipt child is synthetic here, with the real panel independently
covered by its235 cases. No full Windows suite rerun or timeout/quarantine change.

The initial nine-suite run was1,467/1,468: one new fixture's default argument
converted the intended undefined SDK error to null. Test-only own-property
overrides retain that negative and isolate undefined count instead of a
row-length failure. Independent reversal/hash comparison confirms exactly three
fixture edits, no removed cases/assertions or production-policy loosening.
Full TypeScript passes on the frozen source. Changed-line lint against4af1d906
reports zero blocking errors, one moved legacy any warning and eight retained
findings elsewhere across eight JS/TS files. A trial removal of that cast failed
TypeScript because generated types only cover public; it was restored exactly,
without a commit, weaker types or a writer change. All eight final source files
match1953f580 byte-for-byte. Fresh complete build exits0 (verbose output truncated,
completion/exit captured), with existing route-test/module/chunk/Wrangler warnings.
All214 tracked public Git/source/output copies, Worker motorsales365/index.mjs,
sole backend wjxaajgvddtrxxtocxen,15 OCR/202 PDF assets and browser-engine/server
separation verify at1953f580. New exact published-head CI remains separate; no
artifact upload, deployment or live acceptance is implied.

Parent `4af1d90693d291a7e2b1e31026bcf655a9cb42e1` has all six Actions gates passing.
Completed unit `116923466985`, run `38885907605`, confirms application4,402/4,402
across89 files (95.99s), zero unexpected/quarantined failures; overall log
truncated with final summaries present. Native `116923467192` confirms bounded
synthetic PG17 restore/ACL/RLS/sequence/late-failure rollback/cleanup, retaining
47 replay failures. Preview is a confirmed configuration skip/no upload;
migrations/production/Supabase Preview skipped. Workers build
`a40c6591-1125-4912-a33b-29d11a669f55` failed, fresh cause unverified.

## Remaining acceptance and next dependency

The dedicated QA signup is still unsubmitted at the current read-only browser
check: credential/contact fields blank, Terms unchecked. No account reset,
privileged grant, form submission, customer communication, provider activation,
live SQL/Auth/Storage operation or deployment occurred. Do not re-ask unchanged
email nomination or bypass the owner credential/Terms handoff.

Next: verify the new exact published head, then compose the retained receipt
expense-to-journal dependency graph in an unchanged-source disposable fixture.
`20261014043336_vehicle_receipts_shared_history.sql:430` locks the receipt and
inserts its unscaled total into NUMERIC(14,2). Its conflict no-op UPDATE still
runs the existing vehicle/receipt binding guard, but does not compare stored
amount/date/description/creator or rerun the AFTER INSERT posting trigger.
`20260715015208_d62496ef-e67e-4f61-a395-604bfd5749dc.sql:252` posts through
sm_post_journal and sm_get_or_create_account; retained recorded status selects
Cash, only unpaid selects AP, and zero can produce no journal. The current
minimal receipt fixture omits this chain; duplicate UUID equality is not posting
proof. These are retained-source findings, not verified current trigger/ACL
attachments or a production finding. Do not overwrite legacy conflicts.

Then continue a locked/unconnected atomic command and durable operation receipt,
exact-money/conflict/late-trigger-failure/concurrency/retry/recovery tests, and
trusted native authority before connection. Cash/AP/tax/zero semantics and
competing expense edits/deletes require explicit closure. Whole baseline, 47 retained
replay failures, real API/Auth/private-original recovery, safe101+ review/edit,
owner pilot and release prerequisites remain open. The 22 October target and
17 October feasibility review remain; no scope cut or completion guarantee.

Relevant primary references used during this slice:
[Supabase range windows](https://supabase.com/docs/reference/javascript/using-modifiers-range),
[PostgreSQL DATE types](https://www.postgresql.org/docs/17/datatype-datetime.html).
