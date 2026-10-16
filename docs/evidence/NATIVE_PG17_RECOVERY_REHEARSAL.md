# Docker-free synthetic PostgreSQL17 recovery rehearsal

Updated 16 October 2026. Initial source `c25f79f3217565901d0359835b5246a543ebd7cd`;
repair source `3393d29adb0d313d8d009fecbb628ee4eedd32d1`;
diagnostic checkpoint source `176732c691ff7630ccc4cdaa2aa5b8494c868892`;
empty-client-control repair source `719255fbf14c77fdb076c5df3ebda46ee0c3d96f`;
same integrated candidate and draft PR #68; no hosted
project, application migration, live operation or deployment is part of this
slice. Source/publication and execution results are recorded below when verified.

## Purpose and acceptance boundary

R3 needs executable recovery evidence, not just a successful build or backup
command. This bounded experiment uses the established ephemeral Linux Actions
host to dump a tiny synthetic database, shut down its source cluster and restore
into a second fresh private PostgreSQL17 cluster. It does not use Docker or any
365/366/Barangay live database. Existing Parts and quote suites remain required.

The fixture has separate nonsuperuser readers, an owner, two synthetic tenants,
row policies, column grants, exact numeric values, constraints and a sequence
high-water mark. Actual separate ordinary database connections must demonstrate
allowed reads and denied cross-tenant/private-column/write access before and
after recovery. These are private local trust-socket LOGIN probes, not password,
JWT, Supabase Auth, original-human or trusted native-shop authority acceptance.

## Recovery contract

- CI-only Linux, fixed native PG17 binaries, private unique runner-temp root and
  socket-only servers; inherited database routes/credentials are refused.
- Source and restored server identity/path/owner checks precede operations.
  Cleanup stops only verified experiment clusters and preserves unverifiable
  targets instead of broad process or directory deletion.
- A custom archive preserves object ownership and ACLs. A separate roles-only
  dump deliberately omits passwords. Restored cluster bootstrap identity differs
  from the original bootstrap; database owner/metadata are handled explicitly.
- Prepare returns only a SHA-256 manifest pin to the shell. Restore verifies that
  externally held pin before reading manifest instructions and validates the
  fixed private artifact identities/hashes before using them. This catches
  mismatched/tampered artifacts; it is not protection against a malicious same-UID
  actor that can also alter running code or shell memory.
- The verified source is offline before restore. Archive commands run with
  exit-on-error/single-transaction; data/catalog/role/ACL/policy/sequence state and
  ordinary-reader behavior must match. Roles and the database archive are separate
  restore phases, not one globally atomic recovery transaction.
- Commands, output, artifacts and phase durations are bounded. Run and
  always-cleanup steps are mandatory. Timing describes this tiny fixture only,
  not a production recovery-time objective or service guarantee.
- A deliberately late policy-creation fault checks that both fixture tables
  already contain restored rows, then fails the archive transaction. The
  archive-created schema must be absent afterward while the preinstalled fault
  control remains. This is a synthetic database rollback witness, not recovery
  from a production incident or failure of separately restored cluster roles.

Native/Node stderr remains suppressed. The diagnostic follow-up adds a short
stdout failure marker containing only a fixed allowlisted stage and SQLSTATE;
the prepare wrapper admits that complete bounded record only after child/group
cleanup, still fails and never converts it to a manifest pin. Successful prepare
still requires exactly 64 lowercase hex bytes plus one newline. Prepare timing
stderr is not visible in CI; final passing restore output includes timings.
No raw SQL, data, credential, path or driver diagnostics are published.

PostgreSQL documents that [cluster roles need a separate dump](https://www.postgresql.org/docs/17/backup-dump.html).
The [roles dump's password omission](https://www.postgresql.org/docs/17/app-pg-dumpall.html)
does not recover password authentication. A [single-transaction archive restore](https://www.postgresql.org/docs/17/app-pgrestore.html)
is all-or-nothing for its commands; it is not whole-platform recovery.

## Verification and publication

Current published parent `0b836b1582afce33e88164a3821c8fa5e6c6918c` has all six
Actions gates passing in run `38873619165`. Application unit `116883321839`:
4,170/4,170 across 87 files, 69.56s, zero unexpected/quarantined failures. The
overall log is truncated but final summaries are present. Native `116883321961`
is untruncated and verifies PGDG17.11/server170011, Parts247/247, six quote groups,
both scoped stops/cleanup and 47 retained application migration replay failures.

Final local combined offline guards pass **91/91**, zero failures/skips, 793.18ms:

```text
node --test --test-concurrency=1 --test-reporter=spec scripts/ci/native-recovery-postgres.test.mjs scripts/ci/run-native-recovery-postgres.test.mjs scripts/ci/native-quote-postgres.test.mjs scripts/ci/native-commerce-ci.test.mjs
```

This comprises 66 new Node recovery and 14 new shell safety tests plus the 11
retained quote/wiring guards. Imports/refusals and mocked child/file/tamper tests
do not connect to PostgreSQL. Shell syntax and actual non-CI refusal execute
without starting any service. Node syntax, new source/test/CI formatting and diff
checks pass. Earlier 91/91 runs also passed; final rerun includes the reviewed
interruption boundary and shared-catalog comment corrections. Normal timeouts/quarantine and existing SQL groups
are unchanged. Reader checks remain strict after correcting PostgreSQL's sole
implicit `pg_database_owner` membership for the actual database owner.
Changed-line lint against `0b836b15` has zero errors/warnings and zero retained
findings across four JS files. Independent frozen source and integration/document
reviews are clear. Final source/test hashes:

- Node controller: `0f3905366c5195fae89300ff9b200268116896296781b0482c2b534bc5508634`.
- Node test: `1c77cc2581778e46de151fbdff991e67bb2473c94b229f2ed25b8b7c30b06b07`.
- Shell: `efeac0f654fbad67213de5a8d34de7f1b2b48ebb48395ec6641638c06100c86a`.
- Shell test: `348ea3d4000d1768494c538437e55bf435e2b771f9602704c257c9a8180f9d51`.

Only CI/scripts/documentation change; application build inputs are unchanged
from the complete `ee9af3a8`/published `0b836b15` build. No fresh local application
build or TypeScript run is claimed for this CI-only slice. Read-only checks at
`c25f79f3` verify all 214 tracked public Git/source/output copies and retained
Worker `motorsales365`/`index.mjs`, canonical backend, 15 OCR/202 PDF assets and
browser-engine/server separation. They do not prove new-head CI or deployment.

Initial source/evidence is published as `c08c25c8d29ac793aceb905d0c3539e202942f7a`
on the same draft PR #68; canonical remote/title/base/draft/history/main are
verified, with a clean checkout and final 214 public/Worker boundaries. No upload
or deployment. Offline tests and shell syntax are not native runtime evidence.
The new exact-head Linux job must prove
actual package/server identity, both fresh clusters, source shutdown, artifact
verification, restore/comparison/ordinary-role checks, timings and cleanup before
this selected synthetic rehearsal can be called passing.

### First Linux attempt and bounded repair

Actual `c08c25c8` native job `116896620628` in run `38877697404` fails during
prepare; the untruncated log has only the static prepare-failed message, so its
first/sole internal cause is not proven. Both retained Parts247 and six quote
groups pass, including native17.11/server170011 identity and scoped stops. The
recovery EXIT cleanup and subsequent always-cleanup complete; no restore/PASS
or recovery-time result is present. Existing 47 migration replay failures remain.

Independent source diagnosis finds a definite catalog error: `pg_authid` has no
`rolconfig` field. [PostgreSQL17 catalogs](https://www.postgresql.org/docs/17/catalog-pg-authid.html)
and the [`pg_roles` view](https://www.postgresql.org/docs/17/view-pg-roles.html)
distinguish role properties/passwords from role settings. The repair retains real
password-null checking and obtains global role settings through the correlated
`pg_db_role_setting` row (`setrole=pg_authid.oid`, `setdatabase=0`). This would fix
an undefined-column error when the old snapshot is reached; it is not proof that
no earlier failure existed. The fixed bounded failure marker makes the next
attempt diagnosable without enabling raw stderr.

Final repair offline checks pass **96/96**, zero failures/skips, 1,791.91ms:
68 Node recovery tests, 17 shell guards (including real isolated Bash marker
parser allow/deny cases) and 11 retained quote/wiring guards. The shell test first
found Windows newline argument transport in its new parser harness; input moved
to stdin without changing the production parser or any assertion. Syntax/format/
diff pass. Actual native restore and the repaired exact head remain unverified
until publication/execution; no test timeout, quarantine or recovery condition is
relaxed.

Repair source is committed at `3393d29a`; changed-line lint against `c08c25c8`
has zero errors/warnings/retained findings across three JS files. Independent
frozen delta review is clear. Final repair hashes:

- Node: `c5fdc66420c22af8139ae78abc31439e103499fd2e28f25ae401ae12b948c17c`.
- Node test: `36c006d1bec82c09264975ed391e1bd3533efb24b4624acc16cf832e9830ed3f`.
- Shell: `553731239a6e983a8bc5a962636318d0dde90c2749571fc7b46c06425fd2222e`.
- Shell test: `d6dc437c902f0d5ca67908574b0447c3d1e3905b8937f1634e965380eee9c5af`.

At the last `c08c25c8` check, build/typecheck/lint/browser OCR pass and unit
`116896620703` is still running. Wrapper preview `116896619501` is a confirmed
configuration skip without application upload; migrations/production/Supabase
Preview skip. Independent Workers build `cadc5a53-e04a-416f-9f88-9f7dca03009a`
fails with ID/link only; no fresh cause is inferred from older build logs.

### Second Linux attempt: identity admission still refuses

Published `e4b316b05bc5799022beafb5afd892ce34b766c9` is verified on canonical
remote and the same draft PR #68, preserving title/base/draft/prior body/main.
Read-only 214 public copies/Worker/backend/OCR/PDF/server checks pass. Actual
native job `116900472237` in run `38878828660` fails with the admitted fixed
marker `stage=server-identity sqlState=unavailable`. This is before fixture
creation, role snapshot, dump or restore, so the valid catalog correction was
not the first observed failure. Parts247/six quote groups and scoped stops pass;
recovery EXIT/always-cleanup complete. No recovery acceptance or timing result.

The next source adds finer fixed identity-read/JSON/field and pristine-inventory
checkpoints. Every original query and identity condition remains; the extracted
identity validator tests each wrong/missing field, and pristine validation still
rejects extra keys with its full exact comparison. The shell extends only the
fixed stage allowlist; successful pin length/grammar, source-offline, restore,
timeouts and all cleanup guards stay unchanged. No actual values are logged.
Final combined offline **98/98**, zero failures/skips, 2,796.64ms; syntax/format/
diff pass. This improves diagnosis only and does not claim the failing admission
is repaired. New exact-head native execution must identify the remaining issue.

Checkpoint source `176732c6` is committed; changed-line lint against `e4b316b0`
has zero errors/warnings/retained findings across three JS files. Independent
frozen delta review is clear. Hashes: Node
`0aecc7460f06182d76c61de096b08f80a2249750fa69ab3f5ba6e0ef2c833b5f`, test
`a0941f1313e7f2a0bf8eb18f1073fcbd95b87d646f05759d7594e8dbe20b2170`, shell
`57a5e3f8c20080990d2d836aee108c2924d8135e400cc8855a39e4415b0a1d24`, shell test
`1c3abe69f251faea10f0cb3e37e67dfe0d091f568736c3fb1c3057b8b0fe0217`.
At the final `e4b316b0` check, build/typecheck/lint/browser OCR pass and unit
`116900472468` is still running. Migrations/production/Supabase Preview skip;
preview is reported success but its new log is not yet inspected. Workers build
`7368be80-be35-4f33-87ed-4cbbc92e1ff9` fails with fresh cause unverified. No app
build input, migration, hosting setting or live state changed in this follow-up.

### Third Linux attempt: first client read and libpq control-file repair

Actual published `aff9f82908474fdb82e04dd551c1a253c680dc2d` native job
`116905322349` in run `38880223108` fails `identity-read/unavailable`, before
JSON parsing or field/pristine assertions. Retained Parts247/six quote groups and
scoped cleanup pass. There is still no dump/restore or recovery-time success.

[PostgreSQL17 libpq source](https://raw.githubusercontent.com/postgres/postgres/REL_17_STABLE/src/interfaces/libpq/fe-connect.c)
confirms that password-file lookup occurs during connection-option setup, even
before later trust authentication, and a nonregular password file emits a stderr
warning. The runner uses `PGPASSFILE=/dev/null` and rejects any successful command
with stderr, a concrete source-confirmed client blocker consistent with this
observed stage. The raw warning was not captured, so it is not claimed as the
proven sole cause of that run.

Repair `719255fb` uses fixed private `empty.pgpass` and `empty.pg_service.conf`
files in the verified root, created exclusively/no-follow before the first client
and validated on both phases: regular, zero bytes, own UID,0600, single link and
stable inode/metadata. No fallback to real credential/service configuration.
Backup artifact reads still reject empty files by default. Strict stderr rejection,
all SQL/identity/pristine/manifest/restore checks and shell cleanup are unchanged.

Final combined offline **100/100**, zero failures/skips, 2,854.39ms; format/syntax/
diff and independent frozen review pass. New negatives cover one/two bytes,
nonregular/symlink/hardlink, wrong owner/mode/named inode, empty-artifact refusal
and exclusive-create/validation-before-first-client ordering. Initial99/100 had
one new source-guard formatting mismatch after Prettier; whitespace matching was
corrected without changing runtime conditions, assertions, timeout or quarantine.
Source SHA `d9b80bf391b80cc0935bb4aaf93c7c3d9070a785aff635b14fabf833204e4341`;
test SHA `77de95105603720997ecbb17881473654c8fd9f8798430682e055821425dc653`.
Actual repaired Linux recovery remains required; this source fix is not acceptance.
Changed-line lint against `aff9f829` has zero errors/warnings/retained findings
across two JS files. Shell and its previously reviewed cleanup remain byte-identical.

### Fourth Linux attempt: column ACL snapshot repair

Actual `afde5a81468f528ce47f6ade4ae0d3945aeb07b1` native job `116909139334`
in run `38881411362` passes identity/pristine admission and fixture setup, then
fails `source-access/22023`. Parts247 and six quote groups/scoped stops pass;
recovery EXIT/always-cleanup complete. Dump/restore/timing acceptance is still open.
Build/typecheck/lint/browser OCR pass; unit `116909138968` remains running at the
latest capture. Untruncated preview `116908772613` confirms configuration skip
(`DEPLOY_VIA_ACTIONS` not true), no upload. Migrations/production/Supabase Preview
skip. Workers build `4b01435b-cac3-4b66-9224-de5dd9e7be33` fails with ID/link only,
fresh cause unverified; no earlier cause is promoted into this head's proof.

Snapshot columns previously coalesced NULL `attacl` to a zero-dimensional literal
empty ACL array. [PG17 ACL implementation](https://raw.githubusercontent.com/postgres/postgres/REL_17_STABLE/src/backend/utils/adt/acl.c)
rejects that shape with22023. Source repair `6fb1e895` passes nullable `attacl`
directly: [the strict set-returning function behavior](https://raw.githubusercontent.com/postgres/postgres/REL_17_STABLE/src/backend/executor/execSRF.c)
returns no rows on NULL input, and the existing aggregate normalizes this to `[]`.
Explicit column grants and their grantor/grantee/privilege/grantable ordering stay
unchanged; no fabricated defaults or removed ACL checks. This is a definite source
defect consistent with the stage/code, not a claim that all later stages pass.

Final offline **101/101**, zero failures/skips, 3,034.21ms; syntax/format/diff and
independent frozen review pass. New isolated-column regression pins explicit
grants/empty normalization and refuses invalid fallback/default substitution.
Changed-line lint against `afde5a81`: zero errors/warnings/retained findings across
two JS files. Node SHA `f11075479200119dea5614673b7e12d5873612b3c94f56b40426a0a50a1f2850`;
test SHA `3f46cc744f01ae12c35095b5d5221d9b64092fdc99c557df4f2b7f1d278ad15d`.
Shell/fixture/admission/pin/restore/cleanup are unchanged. Actual repaired Linux
execution remains required; no Docker, app SQL/live changes or deployment.

### Fifth Linux attempt: bounded synthetic recovery passes

Published `759740574e216eb3d3d81c4f2f6c70cb3f58b269`, native job
[`116912992234`](https://github.com/Hunting-Fishing/motorsales365/actions/runs/38882590003/job/116912992234),
has a completed **success** and untruncated log. Actual Docker-free PG17 execution
passes source identity/pristine checks, synthetic role access/fixture/snapshot,
custom dump and separate roles archive, externally pinned manifest, verified
source shutdown, distinct-target roles/database restore, catalog/owner/ACL/FORCE
RLS/data/exact-number/sequence comparison, non-superuser independent connection
checks, high-watermark nextval9001 and witnessed late restore-failure rollback.
EXIT and explicit always-cleanup complete; retained Parts247/six quote groups and
their cleanup pass. PGDG17.11/server170011 and 47 retained replay failures are
separate evidence, not whole application baseline recovery.

Observed tiny synthetic timings: dump **66ms**, restore **79ms**, verification
**205ms**. This proves only this fixed fixture on this ephemeral host, not the
production dataset's RTO, credentials, Auth/JWT/API/native shop authority or
private original bytes. All six Actions gates now pass on this exact head.
Completed unit `116912992545` confirms application4,170/4,170 across87 files
(92.02s), zero unexpected/quarantined failures; its overall log is truncated but
final summaries are present. Earlier captures had unit still pending, and two
in-progress log requests returned502; no fallback or inferred result was used.
Untruncated preview job `116912624823` confirms the
`DEPLOY_VIA_ACTIONS` configuration skip and no upload; migrations/production/
Supabase Preview skip. Workers build
`2644237e-f3e6-49b1-bc81-0f9dfba76a11` fails with fresh cause unverified.
These verified results join the next integrated source slice, not a docs-only
CI restart. No Docker, hosted resource, app migration/live operation or deployment.

## Open release gates and next dependency

Even a passing rehearsal does not recover the application baseline, real Auth/
HTTP services, credentials, provider/Worker configuration or private originals.
Supabase [file metadata and original bytes are separate](https://supabase.com/docs/guides/storage/management/download-objects);
a database dump is not a backup/restore of stored receipt files. Real role/session/
tenant authority, private-byte recovery, durable domain writers and an approved
production-safe acceptance/recovery path remain open. No full Docker-free stack
runner is accepted; the 47 retained migration replay failures are not repaired.

The prepared standard QA signup remains unsubmitted at this turn's read-only
browser check (contact/credential fields blank, Terms unchecked). No form change,
submission, personal/staff reset or privilege grant occurred. Trusted synthetic
native-shop membership and owner acceptance remain separate.

Next: retain this published bounded native result, continue real-stack/private-
original recovery prerequisites and independent receipt complete-line viewing/
atomic workflow work. C1.08 read-only server/DTO and UI are now separate bounded
implementation tasks; they must not unlock incomplete-row editing/sharing or the
100-line replacement writer. Carry remaining
access, baseline and acceptance gaps into the 17 October feasibility review; the
22 October 21:00 Asia/Manila target does not waive them or silently reduce scope.
