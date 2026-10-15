# Approved legacy helper EXECUTE restrictions

Updated 2026-10-15 (Asia/Manila). This record supersedes the pending helper
decision in older checkpoints, not their retained source or observations.

## Authority and narrow scope

The owner answered **"Approve both helper restrictions"** to the displayed
question naming `shop_manager.ensure_profile_for(uuid)` and
`shop_manager.calculate_work_order_totals(uuid)`, retaining postgres/service
access and explicitly leaving the quote-conversion bypass unresolved. This is
separate from the earlier invoice-converter approval. It does not approve native
roles/profile/user-role changes, quote-converter changes, recovery execution,
application deployment, data repair or global migration-history reconciliation.

The original SQL files, including historical UNAPPROVED comments, remain exactly
as published in PR #18 at `88a8977f4d2fd79420b7c447ab5686eb01510e9c`:

| Target    | Original local migration                                      | SHA-256, raw = UTF-8 LF                                            | Bytes |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------------ | ----- |
| Bootstrap | `20261014185003_contain_legacy_profile_bootstrap_execute.sql` | `53c9081e23d9a31846f39a730a5c7cb5bd589716f224d11a7ed9a76e73d00aba` | 6295  |
| Totals    | `20261014185052_contain_legacy_work_order_totals_execute.sql` | `f87c6852dce4cff8be7f33d97aeadceddd223c2e4a3f310185f149a60297baf7` | 6307  |

All six CI gates for that PR head passed (`38621075525`), rechecked for this
release. Separate Workers build `7dda8e82-0c17-4050-87c2-c64b81b9e520` failed;
wrapper `38621075579` skipped migrations/production deployment. This scoped
database action is not a hosting release or a claim of application compatibility.

## Fresh preflight and execution safety

`approved-helpers-catalog-review.sql` is one independently reviewed metadata-only
SELECT, pinned to SHA-256
`cf43f4db6719fa9ecf1e787349710203c82cb80f6a75df2e702795186879bf7a`,
10504 UTF-8 LF bytes. Its exact four functions and three history names exclude
business rows/counts, function invocation, raw bodies/configuration/stored SQL and
DDL. Root rehearsed the full read-only transaction in memory before live use.

Actual Supabase tool target: `wjxaajgvddtrxxtocxen`. The literal project reference
in the SELECT is only a label, not intrinsic identity proof. Preflight at
`2026-10-15 02:00:48.414858 UTC` returned postgres session/operator, PostgreSQL
17.6, read-only on, 15-second statement/5-second lock timeouts and trusted
`pg_catalog,pg_temp` search path for that SELECT connection. See
`approved-helpers-preflight-2026-10-15.json`.

The four expected definition fingerprints, owners, complete declared ACLs and
effective anon/authenticated/postgres/service execution matched. Both helpers
were original PUBLIC-executable; the invoice converter remained restricted;
the quote converter remained unchanged and publicly executable. Both selected
helper history names had zero rows. Invoice history remained the exact sole
3914-byte statement, SHA-256
`a0a4132c9f17eb4df1d49f0ff735a3da651728b8d1d4d81e979a4e5bc033c1f0`,
remote version `20261014180351`; its original evidence is not rewritten.

The metadata SELECT does not prove the separate migration connection's context.
Use a separately pinned, locally rehearsed single atomic outer DO: set trusted
`pg_catalog,pg_temp` through qualified `pg_catalog.set_config`, require postgres,
then execute the exact original file bytes as an inner DO. No separate SET LOCAL
transaction assumption, explicit BEGIN/COMMIT nesting or altered original SQL.
The envelope has its own source hash/bytes; do not equate it to the embedded
approved file. Preserve both pins and exact delimiter/byte-offset extraction.

## Release state

Owner approval and fresh preflight are verified. The execution envelope rehearsal
passed 7/7 in 4.938 seconds; independent full-generator and generated-SQL review
passed. Metadata query regressions passed 8/8 in 1.119 seconds using one synthetic
memory database. Lint/format checks pass. **Neither helper restriction has
been applied at this checkpoint.** Apply each only through `apply_migration`,
then inspect the same narrow metadata SELECT and actual stored-source hashes.

| Exact stored execution source                     | Envelope SHA-256, UTF-8 LF                                         | Bytes | Embedded original byte interval |
| ------------------------------------------------- | ------------------------------------------------------------------ | ----- | ------------------------------- |
| `approved-helper-profile_bootstrap-execution.sql` | `3903780b9eab291b0481ec4aec83373925827eb64d78f492a5045e6da1c1ffd6` | 6741  | `[357,6652)`                    |
| `approved-helper-work_order_totals-execution.sql` | `34a1623d30fa59a1a9dbd9b596e1270101111f4e0b41cda596c488458ff01cb8` | 6753  | `[357,6664)`                    |

The fixed-file generator is `scripts/ci/approved-helper-execution-envelope.mjs`,
2881 bytes, SHA-256
`a7198845fe250c15686bc0832474810c8c9f05b34db19ee4f7abdac29f3b7746`.
Intervals are zero-based UTF-8 bytes with exclusive ends, not character/line offsets.
Each inner delimiter occurs exactly twice and the extracted buffer equals the
unchanged original migration file. The checked-in envelope files are outside
the migration directory; do not db-push them or the unreconciled history chain.

If a tool result is ambiguous, inspect ACL/history before any retry. If one
restriction succeeds and the other fails, preserve and document the partial
state; do not automatically restore unsafe access or alter migration history.
Actual generated remote versions can differ from local source timestamps. Record
that relationship rather than renaming rows or claiming whole-file identity when
the stored statement is an envelope.

## Impact, recovery and remaining gates

The focused existing suite passed 17/17, no failures/skips/cancellations, in
49.916 seconds on this release. All four candidate/recovery files were independently
compared with PR #18 before and after the run. Tests cover direct client 42501,
owner/service preservation, both orders/reruns, drift refusal and rollback, and
the retained indirect quote path. They are reduced memory-only fixtures, not
production HTTP/JWT, full native constraints, concurrent sessions or a full restore.

The direct anon/authenticated caller, even a legitimate business owner, loses
EXECUTE. No literal browser/server helper caller was found in bounded retained
`src`; older deployed or external callers remain unknown. No silent service-client
fallback is introduced. Preserving postgres/service and SECURITY DEFINER nesting
is not tenant authorization: the publicly executable quote converter can still
reach totals. No quote change is included.

The two existing recovery SQL files remain outside the migration directory and
are NOT authorized to run. Their owner-reviewed unsafe-restore opt-ins must be
deliberately set transaction-locally by a separately reviewed operator decision;
the scripts themselves cannot prove the setting's lifetime. They restore unsafe
PUBLIC access, not application data or a secure tenant model. No automatic recovery.

Global source correspondence, baseline/parity/replay/release acceptance, private
storage/database restore, consent/tenure, actual API/session/concurrency, receipt
OCR/mobile/owner pilot and full-media hosting gates remain open. Never deploy the
sparse checkout. Native roles/profile/user-role candidates need their own readiness
and explicit live authority. The recurring follow-up stays active without a new
automation or repeated unchanged approval requests.
