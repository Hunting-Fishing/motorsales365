# Locked atomic quote creation candidate

16 October 2026. Latest source `ad776aa8a18ed181293bbc6fd01a65518ca62949`, same integration
branch and [draft PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68).
The quote header and ordered items now have an actual SQL transaction candidate.
It is **revoked, unapplied and disconnected**; C3.02 is not accepted or complete.

## Implementation and activation boundary

`supabase/candidates/create_quote_atomic_candidate.sql` is outside migrations and
has no application caller. Its ten arguments carry expected account and shop,
client quote ID, customer, optional vehicle, text tax fraction, optional date/notes/terms and
strict JSONB items. The invoker function validates every supplied field before
inserting, calculates exact bounded decimal totals, locks customer then vehicle,
rechecks relationships and saves header plus all children in one operation.

The supported subset is 1–100 named positive-quantity service/part/labor lines,
decimal strings compatible with native NUMERIC(10,2) and NUMERIC(5,4), and nullable
finite AD 0001–9999 dates. Fractional-cent products/tax and overflow reject rather
than round; no legal tax, expiry-order or broader accounting policy is inferred.
Text preserves the existing 200/4,000 UTF-16-unit caller bounds without truncation.
Persisted header/item identities, values, relationships, visible counts and order
must match after triggers. Suppression, rewrites and visible extra/orphan children
abort the operation. The explicit bounded DTO uses text numeric amounts, not
whole-row JSON or a committed/replayed success flag.

Installation is one BEGIN/CREATE/REVOKE/ACL-check/COMMIT unit. CREATE rejects an
existing same-name function/procedure of any signature instead of overwriting it
or silently adding an overload. This preflight is not a concurrent DDL name reservation.
PUBLIC, anon, authenticated and
service_role execution are explicitly revoked; unexpected default grantees fail
installation. Raw ACL containment does not universally deny intrinsic owner,
superuser or inherited-role access. No other function, table, sequence, policy,
role or default privilege is changed by the candidate.

The body uses SECURITY INVOKER and an empty search path with qualified objects,
following [Supabase function guidance](https://supabase.com/docs/guides/database/functions).
Its PostgreSQL [row locks](https://www.postgresql.org/docs/17/explicit-locking.html)
protect selected rows inside the transaction; key-share alone would not protect
non-key retargeting. SQLSTATE is preserved with a fixed body-error message, not
private SQLERRM/DETAIL/HINT. Input parser errors, cancellation and assert_failure
are outside that generic-body claim.

## Exact verification

Latest source `ad776aa8` passes **94/94** reported tests with all prior 88 retained,
no skips/todos/cancellations, on PGlite 0.5.9/PostgreSQL 18.6/server 180006.
Command remains the bounded 768 MiB single-concurrency command below. Total
69.636s; disconnected source scanning took 62.510s, actual main SQL rehearsal
3.466s. No source-scan coverage, timeout or quarantine changed; this local timing
does not establish a root cause for the older Windows Vitest scanner timeout.
New cases reject wrong/null/missing expected shop and a previously selected shop
even when customer/profile have moved together and remain RLS-visible. Same-name
legacy nine-argument installation rejects without changing its source/ACL.
Latest candidate LF SHA256:
`9c5f6997b0f53aa9f75257fef9739801d2b50758600aa2157d98b879af68adff`.

The original atomic-only slice `c2f7f315` had the following verification:

Command: `node --max-old-space-size=768 --test --test-concurrency=1 scripts/ci/native-quote-create-transaction.test.mjs`.
Final **88/88 reported tests pass**, no skips/todos, 9.096s. Actual installed engine:
PGlite 0.5.9, PostgreSQL 18.6, server_version_num 180006. Candidate LF SHA256:
`8f914dcacd235dd3672b327a32fb8bf9ccb12cc819b453668271d31fe690374f`.

Five selected retained native tables, all nine selected FK definitions/validation/
actions, physical CHECK/PK/UNIQUE/scales and the native quote-number trigger run
unchanged. Auth/users, dependency relations, claims and fixture RLS are explicitly
synthetic. Operations run as non-superuser/NOBYPASSRLS with active RLS, after a
separate **test-only** execution grant; candidate ACLs are asserted first. Tests
exercise late real CHECK/PK/trigger/RLS failures, earlier-child/header rollback,
trigger suppression/rewrites/extras, final vehicle-binding rollback, duplicates,
strict inputs/dates/decimals/text, and transactional collision/default-grantee
installation failures. Real constraints are not disabled to obtain positives.

Initial 80-test run had three leaf fixture failures plus parent aggregation: a
URL/path walker mismatch, the subsequently narrowed date contract, and an AFTER
header deletion correctly failing native item RLS before the final postcondition.
Those cases were corrected to assert the actual boundary; no failure was ignored
or quarantined. Final independent read-only review has no material findings.
Syntax, four-file formatting, three-file changed-line lint and unconditional
single-concurrency CI wiring (2/2 offline guards) pass. No timeout/quarantine changes.

At `c2f7f315`, all 214 tracked Git/source/output public copies and the existing
Worker package/backend/15 OCR/202 PDF/server-engine boundary verify. Application,
media and package/configuration inputs are unchanged from published `6037678d`;
the complete build from the creation-caller slice is not relabeled a new build.
New publication still requires its own exact-head Linux CI.

Subsequent publication `bb1f193fd8d05c4b442c103dfafa44d317282b81` is verified on
the canonical remote, same attached draft PR #68 and unchanged base/main; all 214
tracked public copies pass again. Exact-head run `38840486491`: Parts job
`116779196476` has a complete log confirming signed PGDG 17.11 packages, actual
server/client, 247 assertions, 47 retained replay failures, server stop and scoped
cleanup. All six Actions gates now pass on this exact head; unit job
`116779196629` confirms 2,595/2,595 application tests across 79 files (56.84s),
zero unexpected/quarantined failures. The returned log is truncated overall but
includes the final summary/checker. Wrapper
`38840486567` migrations/production and Supabase Preview skipped; preview uses the
skip path, not an upload. Workers build `b6b6255a-380a-4ee6-a5c1-df569e0260df`
failed with ID/link only, fresh cause unverified. These publication/check notes
stay local for the next integrated slice rather than restarting active CI.

## Remaining dependency and release status

Expected shop now binds the caller's prior selected-shop intent immediately after
locking, after waits and after triggers; it is user-controlled input, not a grant
of authority. auth.uid equality and the legacy profile resolver
do not prove original-human identity, fresh session/role or trusted native-shop
authority. New execution must stay locked until shared R2 authority and the
all-writer tenant protocol are complete.

Client ID collisions reject; there is no durable command receipt, replay result,
conflicting-payload decision or unknown-commit recovery. The retained privileged
number trigger remains unchanged: sequence gaps survive rollback and five-place
lpad truncation still needs a reviewed forward solution. Row/DTO verification is
not outer-COMMIT acknowledgment, indefinite tenant invariance or closure over all
legacy/raw writers, triggers, audit and deferred effects.

Next: compose trusted original-actor/fresh native authority with this actual
transaction and its expected tenant intent; add durable retry/numbering semantics and
all-writer scope protection. Validate on native PostgreSQL 17 with independent
sessions, then the reviewed real API/Auth/private-storage and restore path before
any grant, migration adoption or UI connection. The PGlite rehearsal is not those
acceptance gates. No production SQL/ACL/Auth/business write, provider activation,
new resource/cost, Docker, upload, deployment or restriction replay occurred.
Migration mapping remains 404/423 with typed 12/5/2 remaining-source categories.

Published parent `6037678d` now passes all six Actions gates in run `38837739930`:
application 2,595/2,595 across 79 files (77.47s), zero unexpected/quarantined
failures; native PostgreSQL 17.11 Parts 247/247 with scoped cleanup. Retained replay
still reports 47 failures. Unit log is truncated overall but includes final
summary/checker. Wrapper migrations/production and Supabase Preview skipped.
Independent hosting build `57f7ae46-a59f-4580-b546-02dc45e68f67` failed; only ID/link
is verified for that head, not its fresh cause or guard execution.

Latest QA status check could not verify completion: the read-only browser request
timed out, and one inventory recovery returned no enabled browser surfaces. No
credential fields, account reset, form submission or browser-login fallback was
used. Dedicated session/pilot membership, owner acceptance and live verification
remain open; no repeated email nomination or secret request. The seven-day target
remains a target, not a forecast.

## Native PostgreSQL 17 execution path

Source `ad776aa8` factors the same pinned selected DDL/constraints/number trigger
and explicitly synthetic setup into `scripts/ci/fixtures/native-quote-create-source.mjs`.
The existing PGlite suite consumes those same 22 batches. The new native runner
uses Node builtins and psql, without installing application packages, and starts
a **second** private PostgreSQL 17 cluster only on GitHub Actions Linux, after
the existing Parts cluster is stopped/cleaned. The Parts runner, 247 assertions,
replay coverage, roles, OS pin and ordinary timeouts/quarantine are retained.

`run-native-quote-postgres.sh` restricts creation/cleanup to its canonical unique
0700 direct child of RUNNER_TEMP, private socket and no TCP listener. The Node
controller checks actual server major/data/socket/database/owner and stored
invoker/path/locked ACLs before any fixture-only grant. Inherited libpq routes,
credentials, rc/service/password files and arbitrary external URLs are not used.
Process, statement, lock and output bounds and static redacted failure stages
apply. Cleanup stops only a proven owned postmaster; an identity mismatch fails
and preserves the directory rather than targeting an unverified process.

Six native scenario groups cover the least-privilege happy call, real late CHECK
rollback, observed customer/shop and vehicle lock waits, outer transaction
visibility/competing writes, and duplicate UUID contention. Actual backend PIDs
and `pg_blocking_pids` establish wait barriers; a fixed sleep is not the proof.
A fresh role read separately shows moved customer/profile visibility before
rejecting the old expected shop; a wait-time 42501 may also involve EvalPlanQual
and stable legacy-helper snapshots. One commit plus one 23505 is **not** replay.
Row locks and a returned DTO do not supply outer-COMMIT or permanent tenant safety.
These are selected SQL/race tests, not JWT/Auth/API or trusted membership acceptance.

Local verification: nine offline runner guards plus two unconditional CI wiring
guards **11/11** (root combined 192.196ms), seven-file formatting, six-file changed-line
lint (zero errors/warnings/older findings), Node and Git Bash syntax-only and
independent review pass. Review caught and repaired separate actor-output parsing
and missing stdio error-event handlers before native publication. The synthetic
EventEmitter/wiring regression does not prove real pipe/process-fault teardown.
No PostgreSQL server or native SQL was executed on Windows. **Actual native Linux
server marker, all six groups and cleanup remain pending new-head CI**; do not
promote the offline guards, old Parts pass or PGlite result into that proof.

All 214 tracked public Git/source/output copies and existing Worker/backend/
15 OCR/202 PDF/server-engine boundaries verify at `ad776aa8`. App/media/package/
build inputs remain unchanged from the complete parent artifact; no fresh local
application build, upload or deployment is claimed. No new migration/history,
live ACL/Auth/business write, provider activation, resource/cost or Docker use.

### Published native execution result

Evidence/publication `2cbf20a45ecfec9affbec110b8e808af87af2571` is verified on the
canonical remote and same attached draft PR #68, unchanged base/main. Run
`38843686721`, job `116789263074`, completed successfully with an untruncated log.
Signed PGDG packages are `17.11-1.pgdg24.04+2`; actual postgres/psql 17.11 ran the
unchanged Parts 247/247 assertions with 47 retained migration replay failures.
After Parts stop/cleanup, the independent quote cluster logged actual
`server_version_num=170011` and verified private identity. All six named native
scenario groups passed, followed by server stop and the successful always-cleanup
step. The log explicitly retains synthetic authority and no JWT/API/R2/restore/
release/durable-idempotency acceptance. That selected native SQL/concurrency gate
is now verified; previous pending wording above describes prepublication status,
not a need to repeat completed tests.

All 214 tracked public copies and existing Worker/backend/OCR/PDF/server boundaries
verify again at publication. All six Actions gates pass. Completed unit log
confirms locked quote 94/94 and application 2,595/2,595 across 79 files (78.12s),
zero unexpected/quarantined failures. It is truncated overall but contains both
summaries and the final checker. Two earlier in-progress log reads returned
provider HTTP 502; completed read succeeded without CLI/API fallback. Wrapper
`38843686801` migrations/production and Supabase
Preview skipped; preview's skip path is not an upload. Workers build
`5f3fb782-58e0-49d7-9177-6625fea20b1b` failed (ID/link only, fresh cause unverified).
These exact-head follow-up notes remain local for the next integrated source
slice, avoiding a documentation-only CI restart. No live SQL/permission/business/
Auth change, upload or deployment. Next: final Actions checks, then trusted fresh/
original-human authority, durable replay/numbering and all-writer protocol, not
another copy of this selected SQL rehearsal.
