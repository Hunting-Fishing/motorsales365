# Locked atomic quote creation candidate

16 October 2026. Source `c2f7f3153d13a2453db863877bf9ae880628b1e1`, same integration
branch and [draft PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68).
The quote header and ordered items now have an actual SQL transaction candidate.
It is **revoked, unapplied and disconnected**; C3.02 is not accepted or complete.

## Implementation and activation boundary

`supabase/candidates/create_quote_atomic_candidate.sql` is outside migrations and
has no application caller. Its nine arguments carry expected account, client quote
ID, customer, optional vehicle, text tax fraction, optional date/notes/terms and
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
existing signature instead of overwriting it. PUBLIC, anon, authenticated and
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

## Remaining dependency and release status

There is **no expected-shop argument**. Customer shop is captured only after the
first lock wait; subsequent checks protect intra-call binding, not the caller's
earlier selected-shop intent. auth.uid equality and the legacy profile resolver
do not prove original-human identity, fresh session/role or trusted native-shop
authority. New execution must stay locked until shared R2 authority and the
expected-tenant/writer protocol are complete.

Client ID collisions reject; there is no durable command receipt, replay result,
conflicting-payload decision or unknown-commit recovery. The retained privileged
number trigger remains unchanged: sequence gaps survive rollback and five-place
lpad truncation still needs a reviewed forward solution. Row/DTO verification is
not outer-COMMIT acknowledgment, indefinite tenant invariance or closure over all
legacy/raw writers, triggers, audit and deferred effects.

Next: compose trusted original-actor/fresh native authority and expected tenant
intent with this actual transaction; add durable retry/numbering semantics and
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

QA handoff was checked once this run: standard signup contact/credentials/Terms/
submission remain incomplete. Existing identities are preserved; no repeated
email nomination or secret request. Pilot membership, owner acceptance and live
verification remain open. The seven-day target remains a target, not a forecast.
