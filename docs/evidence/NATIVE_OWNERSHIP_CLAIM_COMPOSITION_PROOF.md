# Ownership claim, protected update and audit: selected offline composition

2026-10-15 Asia/Manila. **Partial unchanged-source characterization, not a fix,
adopted owner/delegation authority, full transaction proof or production incident.**
Published draft [PR #45](https://github.com/Hunting-Fishing/motorsales365/pull/45),
code `340f2ca6748bba195ab668f5d42b0feff4409361`, branch
`security/native-ownership-claim-composition`, stacked on PR #44 docs `14e92c9`.
That parent passed all six CI gates (`38675678245`), verified on this run; hosting
failed separately and wrapper migrations/production deployment skipped.

## Read-only current evidence, not application data

`scripts/ci/native-ownership-catalog-review.sql` executed one reviewed READ ONLY
catalog transaction against connector project `wjxaajgvddtrxxtocxen` at
**2026-10-15 03:28:20.852805 UTC**, PostgreSQL 17.6. It uses transaction-local 5s
statement/1s lock timeouts, `pg_catalog,pg_temp` and ROLLBACK. It reads catalog
relations/CTEs and built-in metadata functions only, not business/auth/claim/audit
rows, customer data, business row counts or callable application helpers. No live
DDL, grants, migration/history repair, provisioning or deployment occurred.

The separate dated JSON captures seven selected function signatures, three
relations, 33 selected columns (all 21 claim/audit plus 12 named business columns),
selected constraints, twelve policies and twelve noninternal attachments. Project
identity comes from the explicit reviewed connector target; the JSON literal is
not a database-derived identity attestation. Stored configs/defaults/definitions
were privacy-reviewed for this capture; the query is not a general secret redactor
and future captures require fresh review. Five static tests pin query/artifact
bytes and distinguish metadata scope, ACL/RLS and unresolved incoming writers.

Current evidence confirms `approve_business_claim(uuid,boolean)` is postgres-
owned SECURITY DEFINER, with EXECUTE denied to anon/authenticated and retained
for postgres/service_role. Its raw ACL is
`{postgres=X/postgres,service_role=X/postgres}`. The June 6 source revokes clients;
the later June 19 replacement changes the body without a GRANT. August's skip-
revocation list is not a new grant. No authenticated execution exposure is claimed.

The three tables have observed broad ALL grants for all four selected roles,
with RLS enabled/not forced and no inheritance/partition edges. Broad table rights
are not row authorization. RLS constrains the selected row-level commands, not
all table privileges (for example TRUNCATE); non-row privileges and real SQL/API
reachability remain outside this proof.
`can_moderate(uuid)` is callable by anon/authenticated and directly reads platform
`public.user_roles` labels. That is not native `shop_manager.user_roles`, nor proof
that role-assignment provenance is trusted. No role permissions are broadened.

The captured `has_role(uuid,public.app_role)` body differs from its old retained
definition. It is not a dependency of selected `can_moderate`/policies and is not
executed, replaced or claimed source-matched by this proof. `update_updated_at_column()`
is captured but is not the actual business attachment: that uses `tg_set_updated_at()`.
No source-ordering assumption substitutes a different timestamp/body.

## Exact bounded composition

The fixture mechanically selects 34 bounded sections from 11 whole-file LF pins:
claim/audit DDL, kind/actual CHECKs and indexes, twelve current policies, four
attachments, original source-only approval ACL statements and six unchanged
functions. Whole-source hashes plus unique start/end markers fail closed; the
fixture records exact section boundaries/hashes for inspection. It never executes
whole migrations, historical seeds/cleanup/backfills or their adjacent DROP/
superseded declarations. Whole-source pinning is not applied-history adoption.

| Executed unchanged function            | Retained source                                                   | Body LF MD5                        |
| -------------------------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| `approve_business_claim(uuid,boolean)` | `20260619183732_375472c8-9c6b-4392-85c3-021a02d51140.sql:2–48`    | `bad56233bdb5168c543db21995aa5ed6` |
| `can_moderate(uuid)`                   | `20260512023916_08c3429a-e992-4bc3-ae1c-118ace98df45.sql:17–23`   | `995bf3deb59ebb7314cadfb102c0ec7c` |
| `guard_business_owner_update()`        | `20260606123543_fb94412b-0d85-4071-bee5-42acbaf4cf90.sql:80–99`   | `8cb2be4c21b728a5a86e9b06fcf6e94b` |
| `touch_updated_at()`                   | `20260608092901_ee4416c6-d63a-49e5-a6f8-5bbcc595767e.sql:110–112` | `9baf00d43cdeb2cd0e55c1de045be21b` |
| `tg_claim_audit_status()`              | `20260606130908_794768e3-771f-42ed-b904-e5f51aa1f509.sql:39–73`   | `a0c7fa189dec91f4024670da5bc71214` |
| `tg_set_updated_at()`                  | `20260627150439_5c3d6dc8-8f14-45b1-9eb3-dc261579364b.sql:29–38`   | `301a884953d37769916294bb60562e05` |

All six executed body/full-definition fingerprints and raw ACLs match dated
function/attachment metadata. Five selected function contracts additionally
compare owner/config/definer/volatility and selected effective EXECUTE fields;
the attached `tg_set_updated_at` comparison covers its two fingerprints/raw ACL,
not a complete dated effective-rights contract. All twelve policy renderings
match. Exact claim/audit columns/defaults/nullability,
actual CHECK/PK/FK definitions and four attachments match the selected metadata.
Each ignored PostgreSQL 18 redundant NOT NULL constraint is first individually
validated as a validated single-key constraint backed by the same table's live
not-null column after exact column-shape comparison; no blanket constraint bypass.

The four enabled attachments are business protected-field guard and timestamp,
plus claim touch timestamp and status audit. **Eight other observed business
attachments are excluded, not permissively stubbed**, including
`businesses_recompute_intent`. Owner changes can also execute that real trigger
outside this fixture. The known chain to `recompute_signup_intent` →
`derive_signup_intent` reads profiles/businesses; recompute updates profiles and
attempts an admin-audit insertion. Partner/global-role writers are separate
incoming/caller-authorization paths, not forward calls of these bodies. This
forward chain remains excluded from this PR #45 fixture. Reuse
`NATIVE_INCOMING_ATTACHMENT_INVENTORY.md`; do not repeat
its inventory as a new runtime proof. Insert/status/custom-domain/notification/
partner/team attachments are also outside this composition.

Business shape, auth users/claim settings and public-role storage are reduced
synthetic supports. Business tier is a reduced free-only enum; no full business
column/FK/index/default/incoming attachment parity is asserted. No claimant,
reviewer, audit-actor or owner FK is invented; the selected metadata declares none
for those UUID fields. Seeds precede source attachments, so initial submitted
audit rows are deliberately absent. This is not normal production insertion.
Session-setting subjects are not real JWT verification or immutable original-human
attribution. PGlite/PostgreSQL 18 is not live PostgreSQL 17.6 or independent sessions.

## Observed offline behavior

- Ordinary and auto approval update an unowned business under the synthetic
  service/SQL-owner context. The auto flag changes labels, not contact verification
  inside SQL. Server-side contact checks are separate and not executed by this proof.
- An ordinary claim for an already-owned business updates zero business rows but
  still becomes approved and rejects same-business pending siblings. Void SQL
  acknowledgement is not changed-owner confirmation. Another business's claim is
  preserved; SQL-only zero-row direct UPDATE also returns no rows/`affectedRows=0`.
- Transfers overwrite prior owner and create both a status-transition audit and
  an explicit transfer audit whose actor is NULL. Rejected/already-decided claims
  are not approval preconditions. Repeated transfers add another explicit entry
  even when there is no second status transition; this is not an idempotent writer.
- Status audit prefers stored reviewer over the fixture subject. An unstamped
  server-style NULL-subject call records NULL. A later committed reviewer/note
  update cannot retroactively attribute the already-written approval entry.
- The unchanged server caller is byte-pinned and performs reviewer stamping after
  the service approval RPC in a separate unchecked request. The two-request SQL
  analogue shows that a failed later stamping statement leaves the earlier
  ownership/status/audit decision committed; it is not execution of that handler.
- The actual protected-field guard rejects a nonmoderator subject even in a SQL-
  owner execution context, but admits NULL or platform-moderator subjects. Distinct
  new owner values and stored state are checked, not harmless no-op positives.
  These isolate source behavior, not complete business RLS or trusted operator policy.
- Missing claims and real kind/contact/action CHECK and business/claim FK failures
  roll back selected state. A clearly synthetic BEFORE-audit fault first checks
  that earlier ownership/status/status-audit effects occurred, then changes only
  the later explicit entry's action to trigger the **real action CHECK 23514**.
  Earlier selected effects roll back. Removing instrumentation restores source
  behavior; no original CHECK/function body is weakened. This is partial fixture
  atomicity, not the excluded owner's intent/audit chain or recovery acceptance.

Negative controls compare five fixture relation states, selected catalog/ACLs and
connection settings after explicit actor transaction rollback. The selected
catalog projection is not every schema/index/role/default ACL or security object.
The changing browser transfer component is deliberately not byte-pinned into this
database proof: its separate application tests/PR own request confirmation and
lifetime behavior, without conflating that with database authority.

## Verification, release state and next dependency

19/19 focused tests pass (12.841s): five catalog contracts and fourteen behavior
cases, no failures/skips/cancellations. Syntax/ESLint/format/diff and independent
catalog/query plus main source/test/document review pass. Full tooling passes in
consecutive serial commands: 384/384 scripts/ci (308.755s), then 10/10 receipt
OCR/PDF asset tests (2.559s), 394 aggregate, no failures/skips/cancellations.
This is not one combined command or production acceptance. Code-head CI
`38677704083` has five gates passed/unit pending at capture; hosting
`7d3c4c7b-d199-43f2-9d9e-1f0128a74613` failed separately and wrapper
`38677704186` skipped migrations/production deployment. The subsequent docs head
requires its own next-resume check.
CI adds a dedicated never-quarantined memory-only gate. Application source changes
are a separate slice; passing this proof does not adopt a transfer policy.

Migration impact: none. One read-only live catalog call; live business/helper
calls, permissions/data/history mutations and deployment: none. Preserve all
three already-applied legacy restrictions without replay. Composer remains
404/423 matched with 19 unclassified; source/body correspondences here do not
adopt those sources or promote baseline/replay/parity/release flags.

Next close the owner-intent/derive/profile/admin-audit forward chain and operator
impact/recovery before an independently authorized atomic, idempotent,
original-actor-attributable claim/transfer candidate. Do not implement trust from
NULL subject, execution role, mutable role labels or the latest owner UUID alone.
The separate browser confirmation/lifetime hardening may ship only as a reviewed
app slice after the ordinary release gates; it neither audits transfer nor
reconciles native profiles, staff, roles or shop access.

Trusted team/raw reentry, owner/delegation/invitation/multi-roster decisions,
original-actor shift/audit, native/bootstrap/quote writers, independent sessions,
real API/role freshness, full DB/private-storage restore, consent/tenure,
receipt/mobile/owner pilot and full-media hosting remain open. No paid resources,
customer communications, data repair, destructive history action or sparse
deployment. Existing heartbeat remains active without duplicate automation.

Supabase/Postgres safety skills kept catalog collection read-only and separated
EXECUTE, RLS, source behavior and human authorization. Relevant primary semantics:
[Supabase definer execution](https://supabase.com/docs/guides/observability/advisors?queryGroups=lint&lint=0029_authenticated_security_definer_function_executable),
[PostgreSQL trigger transaction rules](https://www.postgresql.org/docs/18/trigger-definition.html).
Current HTTP TLS/PG minor-upgrade changelog items do not authorize changing this
project's engine, resources or release state.

Follow-up verification: docs head `53350cfc45b9d028793f311eb360a39abb97e77c`
passed all six CI gates (`38678253032`), verified on the owner-intent follow-up.
Hosting `f8d81fc3-7ae4-4b0a-b2da-84a18ab0c424` failed separately;
wrapper `38678253257` skipped migrations and production deployment. These are
not production behavior or migration/release acceptance.

## LF artifact pins

| Artifact                                                       | UTF-8 LF bytes | SHA-256                                                            |
| -------------------------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| `scripts/ci/native-ownership-catalog-review.sql`               |           7257 | `1bca0f1f2bb3cdcaa6ad96f3159ebbfefaa20eb54977abcc51d1bfef05bcfdbe` |
| `docs/evidence/native-ownership-claim-catalog-2026-10-15.json` |          34859 | `d5caade20f8218117fc41d139d581a7e61ab2ad501d1b077cc278bf5ca3dca3a` |
| `scripts/ci/fixtures/native-ownership-claim-fixture.mjs`       |          26785 | `a630a01680897609ef6347ac9dbd9c109f40af08d5ff71e46534bb60daf70215` |
| `scripts/ci/native-ownership-claim-composition.test.mjs`       |          21287 | `1b82c4b0872b843df8797b77674f0688758bf3ef64222cfeef7c16a1a1930a7f` |
| `scripts/ci/native-ownership-catalog-review.test.mjs`          |           5444 | `96fa0e8c84a8ac246617ed0d420ee90e5b1d85faf5c0c465c012a6ac435d7d78` |
