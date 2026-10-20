# Native stock operation runner repair

20 October 2026, draft PR #69, Parts Shop + Shop Manager multi-business scope.

Published source `b1cebf28` passed its supplemental client regression job
118593248844/run39412440713, including the real invoice route, existing 63 source
regressions, stock source-integrity tests and 14 new SQL groups. Its native job
118593249329 installed PG17.11, verified server170011 and cleaned up its private
cluster, but failed with SQLSTATE42601 before any concurrency PASS marker.

Reproduction in local PGlite confirms that unquoted `SET LOCAL test.user=...`
is invalid SQL at the reserved `user` identifier. The runner now uses the
existing fixture's `SELECT set_config('test.user', ..., true)` convention.
The state remains transaction-local; no authorization or SQL policy was relaxed.
A fixed setup-completion marker was added. The actual repaired native run still
needs independent verification; the coarse old log alone did not locate the SQL.

Added seven regression cases exercise the actual runner Session source and actual
actor initialization SQL: four statement termination/framing variants, SQLSTATE
preservation, unexpected diagnostic denial and transaction-local identity rollback.
No real subprocess is run by those six transport doubles. The identity case runs
actual SQL in the unchanged selected fixture.

Combined new operation/runner suites pass 21/21 locally in26.156s, zero failed,
skipped or cancelled. Syntax and formatting checks pass. Native publication and
full exact-head CI are separate gates. The parent 14-group suite and frozen base
SQL are unchanged. Main, hosted data, permissions and the disabled application
adjustment remain unchanged. This is not client acceptance or production release.
