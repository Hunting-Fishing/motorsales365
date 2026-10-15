# Native roles catalog: disposable containment candidate

2026-10-15 Asia/Manila. **Memory-only, unapplied and not production authorization.**
Branch `security/native-role-catalog-containment`, stacked on PR #40 docs
`e97baca`, whose six CI gates passed in `38664876182`. Independent hosting remains
failed; migration/production deployment steps skip. No app source, historical SQL,
database migration, credentials, business records or production permissions are
changed here.
Published draft PR #41: `https://github.com/Hunting-Fishing/motorsales365/pull/41`,
code `08cd17fdc2fd82835e61f157bee9b58f24f6182e`.

## Narrow change and evidence boundary

The target is only `shop_manager.roles` authenticated INSERT/UPDATE/DELETE.
SELECT, table policy/RLS, helper definitions/ACLs, schema/default privileges and
postgres/service rights are preserved. The candidate neither repairs role rows
nor supplies a new tenant/owner/delegation model. It does not constrain direct
native profiles/user_roles writes, bootstrap, native staff triggers or privileged
writers. The full native authority contract remains unadopted.

Reuse the actual selected DDL, policies, relevant constraints and source pins in
`NATIVE_PROFILE_ROLE_POLICY_PROOF.md` and its non-test fixture. Do not repeat that
completed 14-case characterization or the completed bootstrap's seven cases.
The dated metadata is the separate catalog-only observation at
`2026-10-15 01:00:28.666866` UTC, not fresh production state or applied provenance.
No live SQL/network database call is made by this candidate slice.

The pure builder has no remote executor, CLI, application import or persistent
receipt table. Generated SQL is for the disposable lab, not an operator runbook
that can be pasted into production without independent review and approval.
Restriction uses only a targeted REVOKE with RESTRICT, never CASCADE, new
functions/triggers or table data writes. Recovery grants back only those three
original rights; it deliberately reopens the previously characterized exposure.

`buildNativeRoleCatalogContainment()` exposes deeply frozen expected states,
`restrictSql`, `recordRestrictionApplication({before,after})` and
`recoverSql(receipt)`. Both SQL blocks require database role postgres; service
table access is not authority to install/recover the candidate. Repeating
restriction or recovery is refused, not silently treated as an idempotent
application receipt. Successful operations restore the caller's prior search
path; errors require transaction rollback.

LF implementation pins, independently rechecked from the builder:

| Artifact                            | Bytes | SHA-256                                                          |
| ----------------------------------- | ----: | ---------------------------------------------------------------- |
| native-role-catalog-containment.mjs | 22124 | a4f6e13835064ad44c377978680455aefeb2ee00ba0f128c0878f588bdf069a4 |
| generated restrictSql               | 19540 | 223181861424492b93176153cfb2850015d98ac37b8174257de300169117e64d |
| generated recoverSql                | 19528 | 038d4cf77bafabfa00ca5ff004ae2e4394872dd67264bd83fa8f2bf63dde95a8 |

## Preconditions, transactions and recovery seam

The lab boundary is exact selected table owner/ACL/column shape/default
hashes/constraints/indexes/policy/no-attachment state, three selected helper
contracts and effective table/column privileges. Check column nullability before
excluding redundant memory PostgreSQL 18 NOT NULL constraint records; omit only
the nonportable OID-containing helper header fingerprint. Do not interpret this
normalization as full schema/server-version parity.

Use an early catalog-only ordinary-table/topology check, then the exact ONLY
roles ACCESS EXCLUSIVE lock and same-OID/topology revalidation before the full
metadata checks and small privilege change. An already-replaced view must be
refused before LOCK: ONLY does not prevent recursive locking of a view's
dependencies. Refuse partition/inheritance/descendant topology rather than
silently adopting it. This does not eliminate a concurrent name/object-replacement
race before lock acquisition; real independent-session validation remains open.
The caller must wrap the lab operation in an
explicit, short transaction, with statement/lock bounds, commit only after
verification and rollback on any failure. No external calls belong inside that
transaction. Locks last until transaction end. A single-session memory test does
not prove independent-session lock waits, revocation races, timeout behavior or
concurrent role/privilege changes.

The builder's opaque per-instance receipt is only **process bookkeeping**. It
accepts exact caller-supplied before/after observations and gates recovery SQL
generation on the issued object identity. A forged receipt object, another
builder's object or mismatched observations are rejected. However, a caller
can fabricate matching observations: the receipt cannot prove that SQL ran,
committed, ran once, had a trusted original state, or received human approval.
It is not durable or cryptographically authenticated production provenance.
Do not replace it with a client-controlled GUC/service/NULL-subject bypass.

Production use would require a separately reviewed trusted operator path,
recorded execution/commit evidence, fresh exact preconditions and an explicit
decision to apply or recover. Do not generate recovery merely because a table
already has a restricted ACL. Recovery SQL must independently recheck the exact
expected restricted state/effective privileges, refuse drift, restore only the
original three rights and verify the original contract afterward. Unexpected
state or an unknown transport outcome requires inspection, never an automatic
GRANT or retry.

## Compatibility and remaining risk

The bounded retained-source audit found no literal native `.from("roles")`
caller in `src`, and found the July enum seed as a literal qualified catalog
writer. `src/lib/shop-manager/db.ts:14` provides the native schema seam; its
comment about legacy code is not evidence that old deployed clients are absent.
The current local `src/shop-manager` tree is absent. Dynamic SQL, external clients
and complete privileged writer closure remain unverified.

Retain catalog SELECT for has_role overloads, is_owner_or_admin, operating-context
and staff synchronization reads. Native staff synchronization writes user_roles,
not catalog roles. Removing UPDATE also affects SELECT FOR UPDATE/SHARE on the
catalog; preserving plain SELECT is not full reader compatibility. Table REVOKE
can remove corresponding column privileges, so unexpected column grants must be
refused rather than silently swept away. Effective rights can survive through
PUBLIC, inherited roles or another grantor. These semantics are checked against
[PostgreSQL REVOKE](https://www.postgresql.org/docs/18/sql-revoke.html),
[privileges](https://www.postgresql.org/docs/18/ddl-priv.html) and
[LOCK](https://www.postgresql.org/docs/18/sql-lock.html).

Even a successful direct write restriction leaves self-editable profile shop/
identity predicates and global native role-assignment authority unresolved. It
does not remove poisoned existing catalog rows, prevent a privileged writer from
changing/recreating the catalog, revoke SET ROLE capability, close role
inheritance/delegation or block a future replay/default-grant restoration. Never
repair historical data, change defaults globally or adopt replay as a shortcut.

## Verification and publication

16/16 focused tests pass in 27.786s. Each case is bounded to 30 seconds, with the
fixture's three-second statement/one-second lock limits, sequential memory
databases and guaranteed close. ESLint, Prettier, diff checks and independent
read-only module/test/document review pass. The tests retain all selected actual
source/constraint/helper pins and explicitly synthetic Auth/session support.
Test file LF pin: 27,799 bytes,
`d5fba8859c52d7e33c397053f129dc669a0fc204faa66e06e464f90192977ca6`.

The final controls prove:

- Deep-frozen expectations, source/generated-SQL pins and malformed/unknown/
  accessor/symbol/sparse/oversized observation refusal. Getters are not invoked
  for the ordinary data-object controls. A caller fabricates matching data with
  no database to demonstrate the receipt's explicit provenance limit.
- Exact roles-only privilege delta and unsafe original recovery, for seeded and
  empty data; repeated operations refuse. Selected data, other table catalogs,
  helper definitions/ACLs, platform/default ACLs, memberships and search path are
  unchanged except the intended target ACL/effective-rights delta.
- Tested raw/filtered/RETURNING/zero-row/no-op/INSERT/DELETE/UPSERT/DO NOTHING
  catalog writes fail 42501 before data or UNIQUE effects. Permitted plain SELECT
  and original helper results remain; authenticated FOR UPDATE loses its required
  UPDATE right. Owner/service table writes still work in rolled-back controls,
  but authenticated/service roles cannot install or recover the candidate.
- Real earlier own-profile and native-admin role-assignment changes roll back
  when a later catalog write fails. Separate successful profile rebinding and
  native-admin role-assignment controls remain effective after restriction, so
  they are not falsely labelled repaired.
- Exact helper body/header/owner/config/ACL, table owner/service access, column,
  policy/attachment/inheritance/view and original-versus-swept policy drift
  refuse without candidate changes. PUBLIC, inherited and another-grantor chain
  are precondition refusals, not falsely presented as postcheck fault coverage.
- Two genuine after-DDL faults reach postchecks: an event trigger grants effective
  inherited rights after REVOKE, and another adds a column after recovery GRANT.
  Each raises 55000 and rolls back the ACL/metadata/membership changes and inserted
  synthetic fault row. Removing the fault permits the identical reviewed SQL.
  These are explicit lab instrumentation, never production proposals or replay.
- Separately labelled wrapper-suffix failures after a successful DO roll back
  the operation. Recovery retains unrelated committed profile/assignment changes
  rather than reverting data; a controlled write confirms the original exposure
  was deliberately restored, not made safe.

Review corrected pre-lock wrong-kind scope, observation descriptor/bound checks
and an actual initial 42601 SQL parse error by parenthesizing CASE. The final
passing run occurs after those fixes; no historical SQL/constraints or live
permission was altered to pass a test. Full sequential tooling passes 315/315 in
232.393s, none skipped/cancelled. A dedicated never-quarantined CI step runs the
new suite. Code CI `38667600224` and hosting build
`2ca956a1-037d-467d-bb89-0567e521298a` are pending at this checkpoint; wrapper
`38667600239` skips migrations/production deployment. The documentation head
requires its own next-run check. App source is unchanged from the CI-verified
986-test parent, not newly verified production behavior. No production readiness,
approval or application compatibility is inferred from memory tests or passing CI.

## Exact next action and release gates

Verify this candidate's latest review head/checks, then build the next **deny-only,
direct native write prototype** for `shop_manager.profiles` and `user_roles`:
remove authenticated INSERT/UPDATE/DELETE on both, preserve SELECT/current
policies/constraints/all legacy rows, and add no contact-edit or manager exception.
The successful historical phone UPDATE proves policy admission, not an approved
contact workflow or safe allowlist. Bounded native callers are readers; no literal
direct writer was found, but dynamic/external callers remain unverified.

Use exact 21-profile-column/four-role-assignment-column metadata, effective
table/column checks and the same clearly limited receipt seam. Apply both changes
atomically, with deterministic table lock ordering, topology/OID refusal and
rollback/recovery controls. Test legacy/canonical reads, direct identity/shop/
shadow/contact and user-role CRUD/UPSERT denial, no admin/owner-role exception,
owner/service boundaries and lock-reader compatibility. Do not canonicalize,
repair, backfill or GRANT ALL. This still leaves bootstrap and postgres-owned
roster synchronization effective; reuse the completed seven bootstrap/nine
roster cases rather than replaying them or claiming comprehensive containment.
The existing leave-request reader requests an unobserved `profiles.role` column;
preserving SELECT does not validate that separate query.

Then close the remaining indirect profile/bootstrap and role-assignment writer
boundary using actual source and existing legacy/shadow controls. Keep
owner/delegation/provenance/multiple-
roster positives gated; do not supply a permissive manager helper to finish a
test. Recover ownership claim/transfer, trusted business-team classification,
employee shift and original-actor audit dependencies before valid atomic
offboarding. The full contract's independent-session concurrency and durable
operator recovery remain open.

Any live restriction needs separate explicit authority and fresh impact/recovery
readiness. The converter-only approval and pending PR #18 helper decision do not
cover this table. Baseline/replay/parity/release flags stay false; correspondence
remains 404/423 with 19 unclassified. Private-storage/database recovery,
consent/tenure, receipt OCR/mobile/owner pilot, real API/JWT/session acceptance,
configuration and full-media hosting remain open. Never deploy the sparse checkout,
provision paid resources, send customer communications or duplicate the heartbeat.
