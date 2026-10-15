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
memory database. Lint/format checks pass. Root's combined sequential run passed
15/15 in 5.964 seconds, no failures/skips/cancellations.

After recording production observations, seven additional file-only evidence
regressions pass. The final combined three-suite run passes 22/22 in 6.146
seconds, no failures/skips/cancellations. These compare immutable saved records,
not current live truth or independent provenance. Independent artifact review
also confirms exact intended deltas and source mappings; it is not a second live
database audit. No previous observation or original SQL was changed to pass.

**Both approved restrictions are applied and verified.** After publishing code
`9bad6b2f26b77fa92a78a191c7e9fcd5bff5821c` in draft PR #42, an immediate fresh
read-only preflight at `2026-10-15 02:11:11.50546 UTC` again matched every selected
function/role/history field. Each exact envelope was then submitted once through
Supabase `apply_migration`, which reported success. No retry or recovery occurred.

| Target    | Actual generated remote migration version | Postflight UTC               |
| --------- | ----------------------------------------- | ---------------------------- |
| Bootstrap | `20261015021118`                          | `2026-10-15 02:11:38.980018` |
| Totals    | `20261015021145`                          | `2026-10-15 02:11:58.84888`  |

Postflight after each action matched the expected permission-only delta: the
target's anon/authenticated EXECUTE became false, postgres/service stayed true,
and the declared ACL became exactly `{postgres=X/postgres,service_role=X/postgres}`.
The complete selected metadata for every other function and the four roles was
unchanged. All four definitions/body/header/configuration fingerprints remain
identical. The existing invoice restriction/history remained intact and the
quote converter remained public and unchanged. No production business routine
was called or business row/count read to claim runtime workflow verification.

Each new history name has exactly one row and one non-NULL stored statement;
its SHA-256 and byte length exactly match the checked-in execution envelope
below. Complete immediate preflight/intermediate/final selected observations and
both local/remote source mappings are retained in
`approved-helper-execution-2026-10-15.json`. No raw stored SQL was queried. These
are new bounded correspondence facts, not an update to the global evidence
composer or acceptance of either original whole-file migration.

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

Publication: draft [PR #42](https://github.com/Hunting-Fishing/motorsales365/pull/42),
branch `security/approved-helper-execution`, stacked on PR #41 docs `5ab35ef`.
PR #41 docs passed all six CI gates (`38667796510`); its native roles candidate
is still memory-only/unapplied. PR #42 code `9bad6b2` passed all six CI gates
(`38669588329`), including the new envelope/query regression step and full unit
gate, verified on this run. Separate hosting build
`994a4f64-94a7-4679-abe7-685b8fef64dc` failed; wrapper `38669588369` skipped
migrations/production deployment, and its green preview wrapper is not an upload.
PR #42 documentation/evidence-test head `dbdbf01c7d51946b880d6d348e886aefc8c4cc9e`
also passed all six gates (`38670594609`), verified on the profile/assignment
follow-up. Its hosting build `aeeb87e9-7882-4a6c-99d7-c57fa8777f4b` failed
separately and wrapper `38670594626` skipped migrations/production deployment.
Passing those checks is not production workflow
or hosting acceptance. No merge, application upload/deployment or sparse-media
checkout release was performed.

Exact next action (PR #42 docs checks now verified): do not replay either
applied helper; continue the offline deny-only direct native profiles and
user_roles write prototype described in the completion checklist. Preserve all
legacy rows and permitted SELECT; add no manager/contact-edit exception or repair.
Keep the separate quote-conversion risk explicit and outside this approval.

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
