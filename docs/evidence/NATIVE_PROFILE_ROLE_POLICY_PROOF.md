# Native profile and role policy composition

2026-10-15 Asia/Manila. **Selected catalog observation and disposable source
characterization, not a production exploit, correction or release acceptance.**
Branch `security/native-profile-role-policy`, stacked on PR #39 documentation
head `6bfde57`, whose six CI gates passed in run `38662121967`. Its independent
hosting build remains failed; migrations and production deployment skip.
Published draft PR #40: `https://github.com/Hunting-Fishing/motorsales365/pull/40`,
code `58a63d68cde05bd4d33c4ee3b9742f726829fa23`.

## One bounded catalog observation

The independently reviewed `native-profile-role-catalog-review.sql` ran once on
project `wjxaajgvddtrxxtocxen` at `2026-10-15 01:00:28.666866` UTC. Its exact
11,368 LF bytes have SHA-256
`ea8597272733c8579651e6f9c47cb0e600a2cfa5addaf6b03ea91d7706ce880d`.
It selects only catalog metadata for `shop_manager.profiles`, `roles`,
`user_roles`, three exact helpers and their noninternal attachments. None of
those three tables has a noninternal trigger in this observation. No application
record/count was read, application function invoked, or live write performed.

Defaults/generated expressions, every function configuration value, function
bodies/default arguments and trigger WHEN/arguments are hashed. Rendered policy,
constraint and index expressions were privately inspected before retaining
`native-profile-role-catalog-2026-10-15.json`; none contains a credential or
business record. MD5 is a correspondence fingerprint, not cryptographic
authenticity or secrecy. The selected-header hash contains catalog OIDs, so is
not asserted portable between databases. The query itself does not enforce a
READ ONLY transaction, timeouts or platform search-path configuration.

All three tables are postgres-owned, RLS-enabled and not FORCE RLS. Authenticated
has effective table SELECT/INSERT/UPDATE/DELETE and column SELECT/INSERT/UPDATE,
but not table TRUNCATE/REFERENCES/TRIGGER or column REFERENCES. Anon has schema
USAGE but no selected table/column privilege. Service has all seven checked table
privileges and all four checked column privileges; MAINTAIN is not queried.
Column ACLs are NULL; these effective
checks include the table grants rather than meaning columns are inaccessible.
This does not establish Data API schema exposure or actual JWT/session behavior.

The four profile and two user-role policies match the selected July source.
The roles catalog instead has the observed permissive FOR ALL policy
`shop scoped access roles_select_all`, with USING and WITH CHECK both
`get_current_user_shop_id() IS NOT NULL`. It is not the original SELECT-only
`roles_select_all`. The unchanged retained August conditional sweep can produce
this selected result; source order and correspondence do not prove applied
history or the sweep's effects on any other table.

Three SQL/STABLE/SECURITY DEFINER helpers retain PUBLIC, authenticated and service
EXECUTE and the original search-path configuration fingerprint:

| Exact identity                  | Definition MD5                   | LF body MD5                      |
| ------------------------------- | -------------------------------- | -------------------------------- |
| get_current_user_shop_id()      | be63946995c909e4a224b0e4989eaaf7 | 6049d4aebd36a1230288e6a2227e1071 |
| is_owner_or_admin(uuid)         | 869849c9428ef51ca5d9ac2fab605570 | 2ffa08c10ab6bd41b1d47a9a2610d56a |
| user_belongs_to_shop(uuid,uuid) | ef1de965a932a522f9dd61a203338d17 | 7786134c6646c4ade72c0107d4219236 |

## Source and fixture boundary

The fixture pins 11 whole migrations, 14 unchanged selected sections and three
unchanged helper definitions. It executes only selected declarations:
native profile/user-role DDL, roles DDL, the app-role enum, relevant auth-user
foreign keys, partial profile user uniqueness, labor columns, selected policies,
the three helpers and the original conditional true-policy rewrite block. It
does not replay migrations, seeds/backfills or the unrelated security sweep.
The earlier SELECT-only roles policy is a separate control, not current parity.

Actual relevant constraints include email NOT NULL/UNIQUE, profile id PRIMARY
KEY, nullable profile user_id referencing auth.users ON DELETE SET NULL, partial
unique non-NULL profile user_id, and user_roles user_id auth FK ON DELETE CASCADE
plus id PK and `(user_id,role_id)` uniqueness. There is no selected profile
shop_id FK or user-role role_id FK; neither is invented. Incoming foreign keys
from other native tables are outside this fixture and snapshot: a successful
disposable id edit is not proof every referenced production profile is editable.

Auth users/session subject are explicitly synthetic supports. The labelled
independent-owner subject is not backed by a business table or independently
verified ownership; none of these policies reads businesses. Non-superuser/
NOBYPASSRLS authenticated and anon
roles exercise the actual policies. Reproduced dated ACLs are fixture setup,
not evidence of all role inheritance, default ACL provenance or operator trust.
No production row existence, ownership, compromise or affected-account count is
inferred from the metadata or synthetic records.

LF artifact pins (the fixture contains all retained source/section pins):

| Artifact                                    | Bytes | SHA-256                                                          |
| ------------------------------------------- | ----: | ---------------------------------------------------------------- |
| native-profile-role-catalog-review.sql      | 11368 | ea8597272733c8579651e6f9c47cb0e600a2cfa5addaf6b03ea91d7706ce880d |
| native-profile-role-catalog-2026-10-15.json | 37810 | d92af49531821c95fe9173bc3184b77060c22ffdaac30d7e7b70311e60f2712a |
| native-profile-role-policy-fixture.mjs      | 16164 | e7c57ed550370f29f8ec5435ce28bcbf2511d9ec2c98346d2802da28949e6dfa |
| native-profile-role-catalog.test.mjs        | 14335 | 58356b585d9d8196040b323f60f6aa989195e2583c3d9121001806a73fa4becc |
| native-profile-role-policy.test.mjs         | 29637 | bdc6d5799334e6084c1798a7707018fb8b5da0b48e86a7bb03040bd83e2257bd |

## Verification

14 behavior plus eight static catalog tests pass, 22/22 in 14.305s. Each behavior
case has a 30-second limit; statement/lock limits are three/one seconds. Fixtures
are sequential and always closed. The metadata comparison preserves exact
selected column types/nullability/default hashes, ACLs, policy sets, indexes,
outgoing constraints, absence of attachments and readable helper headers/config/
body/full-definition fingerprints. Only the memory PostgreSQL 18 NOT NULL
`contype=n` entries are excluded after exact column-nullability comparison, and
the OID-containing selected-header hash is excluded on both sides. The live
server version was not queried. This is bounded selected correspondence, not a
full live schema or applied-history assertion.

The controls establish the following source behavior on synthetic records:

- A self profile UPDATE can change shop_id, including an otherwise unrepresented
  non-NULL UUID. The next statement's id-only resolver and same-shop peer
  visibility change. Both profile OR identity branches admit value changes,
  including valid other/null user_id, a legacy profile id change and canonical
  NULL/false shadows beside a legitimate legacy match. Losing both identity
  branches fails. Incoming references may independently block real id changes.
- Raw constant own contact UPDATE succeeds; another subject, native admin editing
  a peer, NULL subject and unrelated INSERT remain denied/zero as appropriate.
  Own profile DELETE returns zero despite its table grant because no applicable
  DELETE policy exists. No profile repair is implemented.
- Native admin user_roles CRUD follows id-keyed same-shop membership. A legacy
  target fails that predicate. A global native admin can self-move its profile,
  then assign an owner catalog role to a canonical target in the new shop.
  No independent public business owner/delegation lookup is used or invented.
- The original SELECT-only roles policy blocks writes despite unchanged CRUD
  grants; the actual swept FOR ALL policy admits catalog writes for a non-NULL
  current shop. An occupied owner label first fails real UNIQUE enforcement.
  Deleting that catalog entry leaves an existing native owner-role binding
  dangling because no role_id FK exists. Renaming a bound technician entry to
  owner changes `is_owner_or_admin` for same- and other-shop subjects while every
  user_roles row stays unchanged. Explicit ROLLBACK restores all data/catalog/
  privilege snapshots. This is not a live exploit or a claim any live row exists.
- Actual NOT NULL, auth-user FK, email/partial-user uniqueness and role-assignment
  PK/composite-unique failures preserve state. A permitted orphan role UUID is
  stored without an invented FK. A later real NOT NULL failure rolls back earlier
  successful profile and role-catalog changes, not merely the last statement.

Focused ESLint/Prettier/diff checks and independent read-only fixture/test/
metadata review pass. Review corrected a Date-vs-string assertion and added
stored-value/cross-shop/DELETE controls; source SQL and constraints were not
altered. Full sequential tooling passes 299/299 in 200.044s, no skipped/cancelled
tests. A dedicated never-quarantined CI step runs both new suites. Docs `e97baca`
passed all six CI gates (`38664876182`), verified on the roles-catalog follow-up;
wrapper `38664876278` skips migrations and production deployment. Independent
hosting build `32e54404-4e90-4412-a970-98ac34b38dce` remains failed, not a release.
No application source, migration,
historical SQL, live ACL or configuration is changed by this slice.

## Exact next dependency and release limits

Follow-up draft PR #41 (`08cd17f`) now implements the narrow memory-lab roles-only
candidate described below; it is still unapplied and not production authorization.
See `NATIVE_ROLE_CATALOG_CONTAINMENT_CANDIDATE.md` for final tests/pins, receipt
limitations and the next deny-only direct profiles/user_roles prototype. The
following paragraphs retain this checkpoint's bounded proposal and release limits.

Prepare an independently reviewed, fail-closed native profile/role containment
candidate with exact current preconditions, caller-impact checks, service/owner
boundaries and rehearsed recovery. Removing only a UI control is insufficient;
do not trust a self-editable shop binding or global catalog/role row as tenant
delegation. Do not grant privileged positive cases to make existing workflows
pass. Any live restriction needs its own explicit approval after tests and
rollback preparation; the converter-only approval and pending PR #18 decision
do not cover these tables.

The independently reviewed next narrow slice is **proposal only**: remove only
authenticated INSERT/UPDATE/DELETE on `shop_manager.roles`, preserving SELECT,
RLS/policy, helpers, postgres/service and defaults. Refuse exact ACL/column ACL/
owner/policy/shape drift before changing privileges, then verify both effective
table and column writes are denied. Inherited/PUBLIC/other-grantor access must
not survive unnoticed. A table REVOKE can also remove corresponding column
privileges; refuse unexpected column grants rather than sweeping them away.
The change also affects SELECT FOR UPDATE/SHARE on this catalog. No candidate
SQL or live approval is supplied by this proposal.
These privilege semantics were checked against the PostgreSQL 18
[REVOKE](https://www.postgresql.org/docs/18/sql-revoke.html) and
[privileges](https://www.postgresql.org/docs/18/ddl-priv.html) references; the
candidate must still be tested against the actual target version before use.

Rehearse direct INSERT/UPDATE/DELETE/upsert and the catalog-label escalation,
preserved permitted reads/helper results, owner/service boundaries, fault
rollback, inherited/PUBLIC/column drift refusal, and exact guarded recovery.
Recovery must require the recorded application receipt, expected restricted
state and explicit operator decision; grant back only the three original rights,
never ALL. It deliberately reopens the original exposure. Do not reconstruct
roles, reconcile poisoned rows or change another table as a recovery shortcut.

Bounded retained-source inspection found no literal native `.from("roles")`
caller in `src`. The browser seam is `src/lib/shop-manager/db.ts:14`; unrelated
public `user_roles` callers are not native catalog writers. The latest staff
synchronizer reads roles and writes user_roles, while the July enum seed is a
literal catalog writer. This is not dynamic/external/privileged caller closure
or proof that revocation is impact-free. Preserve that SELECT dependency and
close indirect writers separately.

Reuse the completed `ensure_profile_for(uuid)` indirect-writer proof instead of
repeating its seven cases. Closing direct profile policies alone cannot stop
that definer writer or native roster-trigger provisioning. Then recover and
compose the already-identified ownership claim/transfer, trusted team linkage,
employee shift and original-actor audit writers before approving management and
valid atomic offboarding. Existing self-shift PR #39 remains a narrow, unadopted
memory candidate; no compatible full staff guard is implied.

Global source correspondence remains 404/423 with 19 unclassified; selected
inventory unknowns and all baseline/parity/replay/release flags stay unchanged
and false. No paid resource, business communication, history repair or deployment.
Real API/JWT/session and independent-session concurrency, baseline/private-storage
recovery, consent/tenure, OCR/mobile owner pilot, configuration and full-media
hosting gates remain open. Never deploy the sparse checkout.
