# Docker-free synthetic PostgreSQL17 recovery rehearsal

Updated 16 October 2026. Source `c25f79f3217565901d0359835b5246a543ebd7cd`;
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

The wrapper suppresses native/Node stderr and exposes static phase failures
only. Prepare's detailed generic stage/SQLSTATE/timing stderr is not visible in
CI. The final passing restore marker includes dump/restore/verification timings;
failure diagnosis has this explicit observability limitation. No raw SQL, data,
credential or path diagnostics are published.

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

Source is committed and awaits same-PR publication. Offline tests
and shell syntax are not native runtime evidence. The new exact-head Linux job must prove
actual package/server identity, both fresh clusters, source shutdown, artifact
verification, restore/comparison/ordinary-role checks, timings and cleanup before
this selected synthetic rehearsal can be called passing.

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
