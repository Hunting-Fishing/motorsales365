# Receipt command Auth catalog prerequisite

17 October 2026, Asia/Manila. Same integrated candidate and
[draft PR68](https://github.com/Hunting-Fishing/motorsales365/pull/68).
Published19fd2a7ed8d0e7df27168f91035b87457f076ed0 is verified on canonical remote,
same draft/base/title/exact prior body/main preserved; evidence
[comment6222081796](https://github.com/Hunting-Fishing/motorsales365/pull/68#issuecomment-6222081796).
Own run38947359743 now passes all six Actions; actual unit117129750943 reports
5,008/95 files101.25s, zero unexpected/quarantined failures (truncated/final
summaries). Actual native117129750990 is untruncated PG17.11/Parts247/all18
ordered proofs/cleanup, bounded67/82/215ms not full/RTO,47 failures retained.
Build117129750739 is truncated with final artifact guards present; COMPLETE
merge09f63857… equals candidate whole current treea4f1b0b0… . Current artifact
closure2,583 objects/zero missing verified by ONE current-commit/tree alternative
after an overbroad history audit found41 missing ancestor objects. Full historical
object recovery is not proved or attempted; no unrelated history fetch/retry.
Preview configuration skip/no
upload and production/migration/Supabase Preview skips verified; Workers eca54607
fails, fresh cause unverified/existing hosting stop unchanged. Check readHTTP500
resolved by ONE same-tool retry. Existing automation exact checkpoint readback
preserves identity/settings/thread/creation, no duplicate. These follow-up notes
join next integrated source after the unit completed, without cancellation.

Parent publication `fb881504bbd35821fd8e8d0b4497c76176ab72b4` now passes all six
required Actions gates. Actual unit job117112437695/run38942225928 reports
5,008/5,008 across95 files72.81s, zero unexpected/quarantined failures; returned
log is truncated, final summaries and new ingress117/middleware28 file results
are present. No unchanged local1231 or native121 rerun. New-head CI is separate.

## Implemented and actually observed

The fixed `scripts/ci/auth-session-catalog-review.sql` reads only `pg_catalog`
metadata on the sole hosted365 project `wjxaajgvddtrxxtocxen`. It returns owner,
column/type/nullability, selected constraints/indexes/policies/trigger attachments,
effective fixed-role privileges and function fingerprints. It does not execute
Auth helpers, read Auth/application rows or row counts, or return user/session
identifiers, credentials, configuration values, raw source/expressions/arguments.
Function configuration **keys**, not values, are included. Built-in PostgreSQL
SHA256 requires no extension installation. Raw-definition and CRLF-to-LF-only body
hashes are deliberately distinct; neither is source recovery or applied lineage.

Scope: all `auth.sessions` columns/attachments; only `auth.users` id/is_anonymous/
deleted_at column metadata plus DELETE and inbound sessions-FK attachments;
zero-argument `auth.uid()`/`auth.jwt()` and selected attached trigger-function
fingerprints in any schema. Four roles are fixed: anon, authenticated,
service_role and supabase_auth_admin. This is **selected metadata completeness**,
not the full Auth schema, writer closure or complete database baseline.

Two actual read-only connector calls were made, with the fail-fast budget retained:

- Initial query SHA256-LF
  `f6380610169df7316f73c8c9b6297b3d22139a85b1f1b850e5d68ed1fb410ffa`
  observed218 attachments against a64-trigger bound. It correctly returned
  complete=false/truncated=true/trigger-cap-exceeded and suppressed that facet.
  Original evidence is retained at
  [first incomplete capture](auth-session-catalog-2026-10-17-attempt-1-incomplete.json),
  SHA256-LF `e1ffac57e1e1591c9d07ebcf3ed2d1e9dc06c820c4d79e0832585af90d023df6`.
- ONE safe alternative, independently reviewed before execution, changes only the
  fixed trigger bound64→256 for the observed218. No source/WHERE/output/privilege/
  other-bound expansion, trimming or permission weakening. Query SHA256-LF
  `ed3d0459f2c01946278c57c1df7252f12337323541a2ed3fe56e290966faf7d9`.
  No further automatic bound escalation or unchanged capture retry is allowed.
- [Actual complete selected capture](auth-session-catalog-2026-10-17.json):
  observed2026-10-16T18:18:36.401211UTC, server170006, 138,282LF bytes,
  SHA256-LF `9e2106517fcf040392db69acb8d315bcb04950c409a95d3175dd338fca113804`.
  Complete=true/truncated=false/failures=[];18 selected columns,4 constraints,
  5 indexes,0 session policies,218 attachments (8 sessions/210 users),9 functions
  including the2 requested helpers. The512KiB artifact bound remains enforced.
  Repository formatting changes only JSON whitespace; both parsed evidence objects
  were compared exactly with their respective saved connector results before pinning.

Both tables are owned by supabase_auth_admin, RLS enabled and FORCE RLS false.
For the four inspected roles, anon/authenticated/service_role have neither
effective table nor selected-column SELECT/UPDATE; supabase_auth_admin has them.
This metadata is not authorization to grant ordinary clients Auth-table access.
Session id/user_id are non-null UUIDs; not_after is nullable timestamp with time
zone, refreshed_at nullable timestamp **without** time zone. The local stub is not
the managed schema. Session user and OAuth-client FKs both have cascade-delete
actions; fingerprints do not establish provider refresh/deletion behavior.

## Integrated enforcement, without authority promotion

The existing baseline manifest now declares reachable, explicitly **unverified**
external receipt-command requirements for sessions/JWT, termination/refresh/lock
ordering, configured timeouts and native profile/shop/role authority. These are
requirements, not invented calls from retained receipt functions. Only the dated
selected-metadata pin is source-observed. Managed installation/lineage, expiry,
native authority, all-writer closure and real Auth acceptance stay unreviewed.
All prior source pins, lineage classes, function projections and historical
manifest observation date are preserved. Inventory remains explicit exit1 with
release/baseline/replay/parity flags false, not a newly accepted baseline.

An offline, non-quarantined CI gate checks the exact fixed SQL/privacy contract
and actual supplied catalog. The existing baseline-inventory tests enforce
dependency/pin preservation and reject authority/release promotion. These checks
do not query production in CI or execute managed Auth DDL. First static validation
found one test-scanner false positive on the Boolean index `expression` marker;
one exact-marker correction plus an adversarial raw-expression rejection passed.
No broad privacy exception or SQL change was used to hide that failure.

## Validation and next dependency

Final integrated local gate:62/62 across six Node suites,2.2056851s, no failures,
skips or cancellation. This includes6 catalog tests/28 inventory tests and retained
CI/provenance/replay-safety/release-containment tests. Full changed-script ESLint
has zero findings, fourteen-file Prettier/diff checks pass, and independent SQL/
actual-capture/manifest reviews are clear. Both formatted parsed captures exactly
match the respective stored connector objects; no formatting-induced value change.
Direct inventory inspection has structureValid/pinsVerified=true, expected
exit1,37 sources/9 evidence files/93 objects/81 reachable/5 forward sources/
624 explicit findings, with baseline/release/coverage/replay flags false.
The earlier first static failure received one bounded marker-only repair; the
first capture failure received one reviewed same-scope alternative. Both resolved,
neither action has another automatic alternative. JSON formatting was repaired
once before final pins/tests; no format ignore, source rewrite or weakened gate.

Exact publication head is recorded in this slice's PR evidence comment and the
delivery board checkpoint. Commit subject:
`Pin real Auth catalog prerequisites without promoting session authority`.
Parent build/type/unit/native results are not inherited by this new source.

Next implement a reviewed original-human/session/native-shop command-admission
protocol inside a private/unapplied transaction boundary, with independent caller
intent and compatible current catalog, all financial/stock/role/refresh writers
and durable outcome reconciliation. Do not append a row lookup to the existing
receipt-first lock sequence or treat FOR KEY SHARE as blocking non-key expiry/
refresh/role changes. Auth-user deletion/cascades and late Auth-user outcome FK
locks require an independently tested ordering protocol. The retained expense
created_by UUID is not itself human authorization. Do not grant Auth-table access,
add a service-role fallback or activate the draft/UI to make tests pass.

[Supabase session guidance](https://supabase.com/docs/guides/auth/sessions)
distinguishes token validity/session removal from non-proactive timebox/inactivity
enforcement; catalog existence alone does not prove current permission.
[PostgreSQL SELECT locking](https://www.postgresql.org/docs/17/sql-select.html)
requires additional privileges and a compatible concurrent-writer protocol.
Supabase least-privilege guidance caused us to keep this slice metadata-only and
withhold any positive session/role writer until those boundaries are reviewed.

Migration impact: **none**; no DDL/DML/grant/history repair, app writer connection,
Auth rows, private objects or provider settings changed. No Docker, paid resource,
email/customer/operator message, new account, Buddy/366 change, main promotion or
deployment. QA-login and hosting actions remain stopped on their recorded resume
conditions. Real-role/API/private-original/device/financial/full recovery/owner/
live acceptance remains open, as do47 replay failures and12 historical/five
unapplied/two recorded classifications.22 October remains at risk.
