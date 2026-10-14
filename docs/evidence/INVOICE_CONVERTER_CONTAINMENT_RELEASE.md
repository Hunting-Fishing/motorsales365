# Approved converter-only containment: release record

Updated 2026-10-15 Asia/Manila. Status: **applied and catalog-verified** at
2026-10-14 18:04:02 UTC (2026-10-15 02:04:02 Asia/Manila).
The owner selected “Approve tested temporary restriction” in this
chat. Authority is only for `shop_manager.convert_work_order_to_invoice(uuid)`;
the totals helper, profile bindings and other functions are outside that approval.

## Exact change and provenance

Apply only `20261014175040_contain_legacy_invoice_conversion_execute.sql`, created
with pinned Supabase CLI 2.121.0 after inspecting its help. Never push/replay the
historical chain. This single atomic DO statement revokes converter EXECUTE from
PUBLIC, anon and authenticated with RESTRICT; it retains postgres/service_role.
No invoice, profile, accounting, stock or application deployment changes occur.

Fresh read-only target: project `wjxaajgvddtrxxtocxen`, database `postgres`.
The legacy converter is a postgres-owned SECURITY DEFINER returning text:

- Archived applied source SHA-256 (LF normalized):
  `08729a1af4909c61d5bc557083db8fddf85ea63ceb614ebf39653a8b8da57ae5`.
- Exact converter plus historical grant SHA-256:
  `1f2c322b8cbeec8c2e02435e46246833183d0ae163ea30dec54956f78a5a4065`.
- Retained body and fresh live body MD5 (LF normalized) both:
  `c3ef84a1dfa61850a0135fdc66eb9f40`.
- Fresh `pg_get_functiondef` MD5:
  `e590e08f9f68cc5fdead8a853af670b9`.
- Live original ACL: PUBLIC, postgres and service_role each hold EXECUTE,
  grantor postgres, no grant option. Anonymous/authenticated inherit PUBLIC
  execution; they have no separate declared direct grant in this snapshot.
- Unchanged totals helper definition MD5:
  `1119dd7abe3e643d8d0c6979f19fc2a1`; body MD5:
  `d5e17459c7a69975b494a3be2e4cd560`; original declared ACL also grants
  PUBLIC/postgres/service_role EXECUTE.

Migration file raw-byte SHA-256:
`a0a4132c9f17eb4df1d49f0ff735a3da651728b8d1d4d81e979a4e5bc033c1f0`.
These fingerprints identify scoped source/state; they do not approve global
schema parity or migration-history repair. MD5 is an observation identifier,
not a cryptographic authenticity guarantee.

The candidate accepts only the exact original or exact already-restricted ACL,
refuses definition/owner/other ACL drift, and checks effective role execution.
It snapshots/asserts the totals helper's ACL and definition unchanged. A failed
postcondition rolls back the single statement, including its REVOKE.

## Impact and verification

Current repository app/server/tool source has no converter RPC caller; native
Generate invoice performs separate table inserts and retains its documented
required-date/mapping/atomicity defects. No stored routine caller was found in
the bounded live catalog search. These checks cannot exclude external clients
or older deployed artifacts. Any legitimate direct authenticated RPC caller,
including a shop owner, will receive 42501 during containment. This temporary
availability restriction is intentional; no membership-aware replacement is
claimed. Already-running executions are not cancelled by revocation.

Six new memory-only PGlite tests execute the actual migration and actual recovery
file unchanged: client denial, preserved postgres/service/helper behavior, exact
rerun, refusal on definition/owner/ACL drift and atomic rollback after inherited
access fails a postcondition. Six separate profile-authority tests reproduce
the mutable-binding risk; they do not alter production. All six GitHub CI gates
passed at `1d500beb42ef7956cb3f6f209575a3182e232c14` in run `38611328319`:
370 application tests, 53 tooling regressions, both receipt database suites,
247 disposable PostgreSQL security assertions, lint, TypeScript, actual-browser
image/PDF OCR, and the full build/Worker package dry-run. This is draft PR #15,
stacked on PR #14; no merge or application upload is claimed.

## Recovery readiness and limits

Review-only recovery file: `invoice-converter-acl-rollback-review.sql` (outside
the migration directory), raw-byte SHA-256:
`d1dbd2fc13b6b7852c8d0e58195e3a65861d891586ab3f6903d0419ae98009ae`.
It refuses execution without explicit transaction-local operator opt-in, requires
the unchanged definition/exact restricted ACL, and restores ONLY the recorded
original PUBLIC grant while retaining owner/service/helper state. Its exact
bytes were rehearsed in disposable databases; the opt-in clears on COMMIT.

Recovery would reopen the observed vulnerability. Never auto-run it or infer
authorization to restore unsafe access. A new operator/owner recovery decision
is required. No data changed by this ACL-only release needs data restoration;
full database/storage backup and recovery rehearsals remain prerequisites for
the broader schema/data release, which this containment does not authorize.

## Live application gate

Before execution, require published source/tests, passing CI, fresh matching
definition/complete ACL/effective privileges, owner approval and this recovery
record. Apply this one guarded file via the migration tool; never run a blanket
db push, history repair or the review-only rollback. Then verify denied anon/
authenticated execution, retained postgres/service execution, unchanged converter
body and totals helper, and the recorded migration source. Do not invoke the
business functions or mutate customer rows to verify a permission change.

## Applied result and migration identity

The migration tool reported success for this **single file**. Its generated
remote history version is `20261014180351`, name
`contain_legacy_invoice_conversion_execute`; the local CLI version remains
`20261014175040`. The stored history contains exactly one statement, 3,914 UTF-8
bytes, SHA-256
`a0a4132c9f17eb4df1d49f0ff735a3da651728b8d1d4d81e979a4e5bc033c1f0`:
an exact byte match to the reviewed file. Preserve both timestamps; do not repair
history or rename applied SQL to hide the difference. This source mapping is
not a verified full replay or global baseline.

The scoped export is `invoice-containment-migration-2026-10-15.json`; the older
October 14 snapshots remain unchanged. Two added provenance regressions check
the actual file/hash/bytes/remote mapping and compose evidence in memory only.
They prove the historical report still blocks (15 unresolved sources and the
cost-fix replay trap), with all three release/baseline/replay approval flags false.
The composed source evidence is 404 of 419 files, not global schema parity.
Reproduce these checks with `node --test scripts/ci/migration-provenance.test.mjs`.
Older two-input CLI commands intentionally use only their declared older evidence;
they do not automatically discover or adopt this supplement.

Fresh live catalog postchecks on project `wjxaajgvddtrxxtocxen`, database
`postgres`, operator `postgres`:

| Object        | OID   | anon / authenticated EXECUTE | postgres / service_role EXECUTE | Result                                                                                             |
| ------------- | ----- | ---------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| Converter     | 29005 | false / false                | true / true                     | ACL now `{postgres=X/postgres,service_role=X/postgres}`; original body/definition hashes unchanged |
| Totals helper | 29002 | true / true                  | true / true                     | Original ACL/body/definition hashes unchanged; outside approval                                    |

No business RPC was invoked, customer row mutated, app deployed or rollback
executed. These are database catalog/effective-privilege checks, not a live
PostgREST/JWT or end-to-end invoice test. Existing authenticated RPC callers,
if any, remain deliberately unavailable pending an authorized replacement.

Remaining risks: exposed totals helper, mutable shop authority, invoice atomicity/
idempotency/date/mapping/stock policy and full migration-baseline recovery gates.

## Advisor snapshot

The pre- and post-release security advisors returned the same four finding
categories; this narrow
change does not certify the project or resolve the other findings:
[RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[extension in public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public),
[anonymous definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
and [authenticated definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
Fresh explicit function-role postchecks, not a global advisor pass, establish
the containment result.
