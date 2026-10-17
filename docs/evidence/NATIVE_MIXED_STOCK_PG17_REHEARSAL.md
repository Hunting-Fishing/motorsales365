# Native mixed-stock PG17 rehearsal: runner preparation

17 October 2026, Asia/Manila. Same integrated candidate/draft PR68; commit subject
`Rehearse mixed stock writers on isolated native PostgreSQL17`. Exact source and
publication are recorded in its PR evidence comment. **Initial status: implemented
and offline-tested; first genuine Linux native execution is NOT yet observed.**

## Implemented scope and isolation

Four new files consume only the unchanged `buildMixedReservationOrderSource()`:
75 setup actions/49 exact spans/14 tables/30 real FKs plus the existing private
inquiry candidate. All seven prior mixed-stock source/fixture/test files remain
byte-unchanged against a69d2918; no application, historical migration, retained
writer body, generated file, dependency or existing permission is changed.

The shell admits exactly `--run`/`--cleanup` on non-root GitHub Actions Linux,
refuses every inherited PG/database route and reused stock state, and creates a
unique canonical0700 direct child `RUNNER_TEMP/stock-native.XXXXXX`. Fixed native
PG17 tools must be root-owned/nonwritable/non-symlink files. A fresh initdb cluster
uses UTF8/C.UTF-8, **TCP disabled**, private0700 Unix socket, port55437, and empty
private0600 single-link password/service controls. It never admits an existing,
package-managed, expense/quote/recovery or hosted database. No Docker or download/
installation is added; the existing required native PG17 CI package step remains.

Node independently validates paths/files, actual postmaster PID/executable/UID/
exact `-D` arguments, socket metadata, PG17 server/data-directory/database/owner/
encoding and fresh roles/schemas/object inventory before executing fixture SQL.
Pure import creates no process/connection and executes no SQL; CLI admission is
exact and fails safely on non-Actions environments. Fixed psql argv and scrubbed
environment have no HOME/libpq credential or routing fallback. Positive owner/
`test.user`/Auth-id/manager support remains synthetic, not original-human/native
Auth, native team/tenant membership or privilege-boundary acceptance.

Each psql command has bounded input/output/deadlines; SQL rejection settles only
after the child CLOSE event. Unexpected/late stderr, stream errors, oversized or
unsolicited output and timeouts latch failure, not a success marker. Every exit
awaits child closure. The180s phase captures merged stdout/stderr under a hard
byte bound and admits only the exact ordered server/eight-PASS/terminal vector
or one sanitized allowlisted failure. Raw SQL, filesystem context and diagnostics
are not published. A marker or successful statement alone is not COMMIT.

Cleanup revalidates actual PID/executable/UID/full arguments before any signal;
startup/PID receipts are refusal/absence bookkeeping, never kill authority.
Known postmaster PID must actually disappear, even if its PID file is missing;
bounded observation is not a zombie exemption. Unknown startup preserves the
directory. PID/socket/lock-file/process/readiness absence and phase-group reaping
precede removal of only the validated unique directory. EXIT/INT/TERM and a
separate mandatory always-cleanup retain original nonzero failure status.

## Authored native scenarios, not yet executed

Distinct writer/waiter/observer backends must be demonstrated by actual PIDs and
`pg_blocking_pids`, active state and Lock wait type. Poll cadence is not proof.
Each cohort uses a separate fresh stock10 item, submitted order line8 and no raw
reservation; the original unrelated raw8-hold/counter0 seed stays unchanged and
inside every complete selected-graph witness.

1. Ordinary/service B2B and inquiry execution denied, with unchanged graph.
2. Actual B2B acceptance8 holds the item; inquiry5 visibly waits, then rejects
   after B2B COMMIT with no partial inquiry writes.
3. Inquiry5 holds the item; actual B2B8 visibly waits, then rejects after inquiry
   COMMIT with no partial order/line/counter/reservation/event writes.
4. B2B ROLLBACK permits the waiting inquiry5 with no retained B2B effects.
5. Inquiry ROLLBACK permits the waiting actual B2B8 with no retained inquiry hold.
6. Both actual writers succeed inside an outer transaction, remain invisible to
   the observer, and ROLLBACK restores the graph; a competing actual B2B writer
   visibly waits and its own later ROLLBACK also restores all selected state.
7. Explicit synthetic BEFORE-event fault checks prior real accepted order/line/
   reservation/counter work, then makes the actual event/Auth FK reject23503.
   XX000 is not accepted as evidence. Fault helper execution is explicitly
   revoked; baseline is captured after install/revoke, and the helper/trigger
   are removed after whole-graph rollback equality. This is injected, not a
   natural production failure or invented provider schema.

The eighth PASS marks completion only after the required ordered cohorts. The
Node terminal requires all sessions closed and no latched failures; shell result
and EXIT/always-cleanup must also pass before accepting the native trial.

Graph witnesses SHA256 the complete selected14-table data, events, synthetic
Auth, catalog/ACL/RLS/defaults/FKs/functions/triggers/types/enums/roles/memberships,
observer settings and sequence state. Every NUMERIC becomes text before JSON;
positive normalization restores only individually validated allowed fields and
individually checked new reservation/event rows. No whole-target row masking,
count-only equality or sensitive row dump. These are same-cluster test witnesses,
not backups, current hosted catalog correspondence or complete baseline recovery.

## Actual local verification

Root serialized offline checks: **35/35 in2.5179738s**, zero failures/skips/
cancellations, first run. Includes fake transport closure/diagnostic behavior,
pure admission/filesystem metadata, inert import/non-Actions refusal, Bash syntax,
actual extracted transcript parser, bounded PID observation with fake predicates,
fake unsafe-cleanup refusal/status preservation and exact parsed CI wiring.
No native PostgreSQL process, server, fixture SQL or hosted operation ran locally.
Separate changed CI guard: **2/2 in74.8001ms**. Changed scripts/guard ESLint zero;
format/syntax/diff and independent source/test/CI reviews pass. One pre-runtime
review tightening explicitly revokes the synthetic fault helper; no failed SQL
trial or native alternative consumed. No unchanged prior6/13/16/app/Windows rerun.

Mandatory serialized non-quarantined offline step and native run after expense
always-cleanup are wired in the existing six-job workflow. Stock run timeout5min,
always-cleanup2min; job/test normal25min budgets and quarantine/native/adversarial/
transaction coverage remain unchanged. A69d's whole unit job is near this budget;
new head must actually pass without extending timeouts or dropping checks.

| New file in `scripts/ci/`                | LF bytes | SHA256                                                           |
| ---------------------------------------- | -------: | ---------------------------------------------------------------- |
| native-mixed-stock-postgres.mjs          |    45524 | 75f23ad7852e6db1b7e58a8f62f2ff2b8ed2b4be0a548b8ca850091739230b50 |
| native-mixed-stock-postgres.test.mjs     |    24496 | dccd068c2afa97d2397e6b9be590f551452fbee586d93b81c331ba3888f22127 |
| run-native-mixed-stock-postgres.sh       |    18265 | 7f4c397a64e95e366bb50659d889685a89609001085c4e07010ee3d0d0147624 |
| run-native-mixed-stock-postgres.test.mjs |    19393 | 3e978a97e6c62871dbf0e89c37038cb4f8297b14da0515d0cdf89ce084a104b1 |

## Closed parent, next exact trial and remaining gates

A69d291886659d0ee2ef2d52de2b72207f478521/comment6226732481 has all six
Actions38982570784 complete; actual unit117246578643:5,036/96 files103.31s,
zero unexpected/quarantined failures (returned log clipped/final summaries).
Early native-source6/order13 transcript is clipped, not separately observed
Linux19. Already verified own native21/Parts247/quote6/build/current2,604-object
artifact/Preview configuration skip are retained, not rerun or inherited. Its
native21 is expense/receipt, not stock; selected63/79/208ms restore is not full/RTO.
The parent unit completed before this new source publication; no cancellation.

Next read this slice's exact-head required gates and **first actual Linux native
stock trial**, complete ordered eight-PASS vector/server/terminals, clean child
exit and both cleanup paths. On failure diagnose once and try at most ONE safe
evidenced available alternative; if none or it fails, STOP that action and notify
once with exact stage/evidence/help/schedule impact. No blind rerun, weakened
checks or second speculative repair. The older recovery PID alternative remains
consumed; if that old source-stop failure recurs, its STOP rule still applies.

Even a successful selected native trial does not close current catalog/all direct
or legacy writers/phantoms/global lock/deadlock ordering, native session/team/
role/tenant authority, configured TTL/revocation, durable operations/idempotency/
unknown-outcome reconciliation, API/private Storage or whole restore. Split
`adjustBusinessInventory` remains; no global no-oversell/consumer ordering/fullCRM/
device/owner/main-ready/live claim. No migration/grant/app/hosting/Buddy/366 change
or deployment. All18+N1–N3/47 replay failures/12 historical/five unapplied/two
recorded classifications and existing Auth-source/QA/hosting stops remain. Day2
atomic stock is open;22 October remains at risk, not a verified full-scope forecast.

Supabase/Postgres guidance shaped least-privilege, fresh transaction/lock evidence
and the boundary between selected mechanics and native authority. OpenAI Docs
guidance keeps the existing follow-up in this chat updated in place, not duplicated.
