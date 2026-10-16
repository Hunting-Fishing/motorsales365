# One bounded native recovery alternative

17 October 2026, Asia/Manila. Same integrated candidate/draft PR68. This is the
ONE selected safe alternative for the20dd5a3e native recovery failure, not a
confirmed root-cause fix or accepted restore. No new native trial has run yet.

## Actual failure and bounded diagnosis

Code Review job117153435094/run38954382460 on published
20dd5a3eb90c0608e24007289b5b07351faec48f returns an untruncated log: signed native
PG17.11/server170011, Parts247 and six quote groups pass; existing recovery then
refuses `source stop could not be verified` at2026-10-16T19:22:35.5505254Z.
The new expense21-marker step **never runs**. Current recovery/expense acceptance
is red, not inherited from parentcaa1e4c4. No hosted database was involved.

One permitted log/source diagnosis cannot identify the failing subcheck: the
marker deliberately omits raw paths/process diagnostics. An immediate check of
the already-verified postmaster PID directory might race with actual process exit,
but that cause is **unconfirmed**. Successful later cleanup does not establish
the cause: when the PID file is gone it skips that exact prior PID check, and a
process with an unreadable executable link is skipped by the final scan.

## Selected source alternative / exact quota

`stop_cluster` keeps the exact original `/proc/$verified_pid` directory-absence
predicate but polls it immediately and after at most20 cadences of0.1s. It admits
only one canonical nonzero numeric PID, already captured after complete postmaster
identity validation. Persistent/reused PID directory, zombie directory or cadence
failure refuses. No zombie exemption, new signal, process-name kill, wider path,
new privilege, weakened socket/process/listener proof or extended native command/
SQL/phase timeout is introduced. `postmaster_absent` still must succeed afterward.

The original entire shell is reconstructible by removing the three tiny helpers
and restoring the one old call site. Its SHA256-LF remains
`57a5e3f8c20080990d2d836aee108c2924d8135e400cc8855a39e4415b0a1d24`:
all original identity checks, stop escalation, socket/process/listener checks,
manifest/phase guards, cleanup and timeouts are byte-preserved.

Alternative1 is selected/prepared, **fresh Linux trial not executed**. After20dd
unit117153435216 completes without cancellation, publish this reviewed source
once in the same PR and read the fresh native result. Never rerun the old failed
job unchanged. If this alternative's native action fails, STOP recovery/expense
acceptance, notify the owner once with exact evidence and require new redacted
substage/access/configuration evidence or explicit direction. No second guessed
repair or automatic retry across scheduled turns. Other independent lanes remain
authorized. Unknown financial/stock/Storage outcomes are never retry candidates.

## Root validation, explicitly offline

Final **23/23** in2,639.3822ms, zero failures/skips/cancellations. Actual isolated
Bash executes only extracted definitions with fake presence/cadence closures:
initial absence/no cadence; delayed satisfaction including final bound; persistent
presence/exact21 checks20 cadences; malformed/missing PID with zero callbacks;
failed cadence immediate refusal. Original-source reconstruction, all retained
guards, Bash syntax and actual non-CI refusal also pass. No native PostgreSQL,
real process teardown, filesystem deletion or restore executed locally.

Initial21/23 had two test-construction failures: a forbidden-command regex matched
comment prose `executable/status`, and a newline-bearing malformed PID was split
by Windows native argv transport. ONE bounded test-only correction excludes
comment-only lines from that guard and embeds synthetic PID bytes as a fixed
ANSI-C hex DATA literal. Entire-original-shell SHA and malformed zero-callback
assertions remain. Production helper bytes did not change. A documentation patch
context mismatch changed nothing; one inspected exact-context application passed.
Changed-test ESLint/format/diff and independent read-only review are clear.

Final shell SHA256-LF:
`be5d8000bbe2a50e869bbabd940db27358edb95f82edb8f1b77a995d7b6f092f`.
Final test SHA256-LF:
`8ebd8263112817666ecbf057ff0cd8a3fd82a2fea6244634c3d4c7eaaf6d3c37`.

This extra teardown observation is not an operational recovery/RTO claim or proof
that the hypothetical race caused the actual failure. Full baseline/Auth/private-
object/config/forward/rollback recovery, real role/API/device/owner acceptance and
main/live gates remain open.47 replay failures/12 historical/five unapplied/two
recorded remain. No Docker, paid provisioning, grants, Auth access/accounts,
production/main/Buddy/366 changes or customer/operator communication.
