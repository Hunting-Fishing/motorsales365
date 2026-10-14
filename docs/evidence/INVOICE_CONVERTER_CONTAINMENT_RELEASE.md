# Approved converter-only containment: release record

Updated 2026-10-15 Asia/Manila. Status: prepared and locally tested, **not yet
applied**. The owner selected “Approve tested temporary restriction” in this
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
the mutable-binding risk; they do not alter production. Full CI remains required
before this release record is marked applied.

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

Production application and postchecks: pending.
Remaining risks: exposed totals helper, mutable shop authority, invoice atomicity/
idempotency/date/mapping/stock policy and full migration-baseline recovery gates.

## Advisor snapshot

The pre-release security advisor returned four finding categories; this narrow
change does not certify the project or resolve the other findings:
[RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[extension in public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public),
[anonymous definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
and [authenticated definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
Fresh explicit function-role postchecks, not a global advisor pass, establish
the containment result.
