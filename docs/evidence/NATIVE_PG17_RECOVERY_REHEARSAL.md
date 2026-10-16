# Docker-free synthetic PostgreSQL17 recovery rehearsal

Updated 16 October 2026. Initial source `c25f79f3217565901d0359835b5246a543ebd7cd`;
repair source `3393d29adb0d313d8d009fecbb628ee4eedd32d1`;
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

Next: finish and publish this bounded runner, verify its actual exact-head Linux
execution, then continue real-stack/private-original recovery prerequisites and
independent receipt complete-line viewing/atomic workflow work. Carry remaining
access, baseline and acceptance gaps into the 17 October feasibility review; the
22 October 21:00 Asia/Manila target does not waive them or silently reduce scope.
