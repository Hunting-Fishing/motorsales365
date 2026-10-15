# Legacy helper EXECUTE containment: original candidates and scoped approval

Updated 2026-10-15 Asia/Manila. The owner now separately answered **"Approve both
helper restrictions"** after PR #18 passed all six CI gates. Current release
state, fresh preflight, tested execution envelopes and exact provenance are in
`APPROVED_HELPER_EXECUTE_RELEASE.md`. That newer record supersedes historical
pending-helper status below, not the original SQL bytes or observations.
Quote conversion, staff/profile policies, role provisioning, unsafe recovery and
application deployment remain outside this scope. Retain the original SQL's
historical UNAPPROVED comments unchanged; they are not the current authority record.

## Exact proposed scope

Each pinned Supabase CLI 2.121.0 `migration new` file is a separate atomic DO
statement. It revokes only its target's EXECUTE from PUBLIC, anon and authenticated
using RESTRICT, retaining postgres/service_role. It changes no function body,
default privileges, profile/role/customer/invoice/stock row, schema identity or
migration history. Either helper can be approved independently. Never db-push
the unreconciled historical chain or auto-run recovery.

| Candidate                                                     | Target                                           | Raw-byte and LF-normalized SHA-256 (identical here)                | Bytes |
| ------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------ | ----- |
| `20261014185003_contain_legacy_profile_bootstrap_execute.sql` | `shop_manager.ensure_profile_for(uuid)`          | `53c9081e23d9a31846f39a730a5c7cb5bd589716f224d11a7ed9a76e73d00aba` | 6295  |
| `20261014185052_contain_legacy_work_order_totals_execute.sql` | `shop_manager.calculate_work_order_totals(uuid)` | `f87c6852dce4cff8be7f33d97aeadceddd223c2e4a3f310185f149a60297baf7` | 6307  |

Both require unchanged target/companion/converter definitions and postgres
ownership. Target and companion ACL must be exactly original or restricted,
including grantor/grant options; restricted companion clients must remain denied.
The previously approved converter must already be restricted and effectively
denied to both clients. Unexpected state refuses with 55000. Protected function
owner/definition/ACL snapshots are compared after DDL. Exact restricted reruns
are supported without broadening access, including either helper execution order.

## Fresh read-only pre-state and provenance

Project `wjxaajgvddtrxxtocxen`, observation 2026-10-14 18:50:00 UTC. Neither helper
was invoked; no customer/profile rows were read or modified.

| Function          | Owner / security   | Return  | Definition MD5                     | Body MD5, CR removed               | Effective anon/authenticated |
| ----------------- | ------------------ | ------- | ---------------------------------- | ---------------------------------- | ---------------------------- |
| Bootstrap         | postgres / definer | uuid    | `77cb775bfedfb78996b31fcbdd3ada4c` | `ec9ce0a3dc3bcd576cef57c5ea347d58` | true / true                  |
| Totals            | postgres / definer | numeric | `1119dd7abe3e643d8d0c6979f19fc2a1` | `d5e17459c7a69975b494a3be2e4cd560` | true / true                  |
| Invoice converter | postgres / definer | text    | `e590e08f9f68cc5fdead8a853af670b9` | `c3ef84a1dfa61850a0135fdc66eb9f40` | false / false                |

Both helpers' original declared ACL is
`{=X/postgres,postgres=X/postgres,service_role=X/postgres}`. Owner/service EXECUTE
is true. Converter ACL is `{postgres=X/postgres,service_role=X/postgres}` and is
unchanged from its approved release. The exact historical bootstrap source and
retained invoice-helper source, including line-ending rules, are pinned in the
existing proofs and the new suite. All four fixture function definitions match
the inspected live definition hashes. MD5 is an observation identifier, not
cryptographic source authenticity or proof of full deployed parity.

Current composed source evidence: 404/421 files (388 legacy, two same-version,
14 different-version exact matches); 17 remain unclassified, including these two
unapplied candidates. Older snapshots remain unchanged. No remote execution row
for these candidates is fabricated. Global baseline/replay/release approval is
still blocked, including the unchanged counter-cost replay trap.

## Impact and important residual path

No browser/server source call to either helper was found in the bounded `src`
search. This cannot exclude external clients or older deployed artifacts. Any
legitimate direct anon/authenticated caller, including a shop owner, would receive 42501. Authenticated operators must not be silently switched to a service client.
Owner/service function execution remains available, preserving legacy behavior,
not establishing safe tenant authorization or correcting bootstrap mapping.

The bounded live routine-body search found the existing invoice converter and
`shop_manager.convert_quote_to_work_order(uuid)` call totals. The latter remains
postgres SECURITY DEFINER, PUBLIC/postgres/service_role EXECUTE, effective
anon/authenticated true, definition MD5 `1080a60b75ddd930e541297dda1e17dc`.
Its retained source has no actor/shop check. The actual reduced quote fixture
demonstrates it can still reach totals through its definer context after direct
client totals access is denied. **Direct EXECUTE restrictions do not contain this
indirect path or fix quote/work-order authorization.** Quote hardening/containment
requires a separately scoped candidate/decision. Dynamic callers are not ruled out.

## Isolated verification and recovery

`scripts/ci/shop-manager-helper-containment.test.mjs`: 17 passing memory-only
PGlite tests, bounded waiting and always-closed databases. It executes both exact
candidate files and both exact recovery files unchanged. Tests cover independent
execution, both orders, reruns, direct client 42501, retained owner/service behavior,
unchanged converter/companion/native fixture state, definition/owner/ACL/missing
prerequisites, and preservation of the reduced legacy quote path.

Inherited owner/service client access normally fails the converter precheck.
Separate disposable REVOKE event-trigger fault injection introduces inherited
access **after** REVOKE, reaches the effective-privilege postcondition and verifies
the exact DO rolls back its DDL, injected role changes and fixture rows without
an enclosing test transaction. These event triggers are test-only, never a live
proposal. Recovery fault injection is separately labeled as an operator-transaction
rollback rehearsal, not a standalone atomicity claim. Reduced fixtures do not
verify full native constraints/triggers, real JWT/HTTP, posting or concurrency.

Review-only recovery files are outside the migration directory:

| File                                        | Raw-byte/LF SHA-256                                                | Bytes | Required transaction-local opt-in              |
| ------------------------------------------- | ------------------------------------------------------------------ | ----- | ---------------------------------------------- |
| `profile-bootstrap-acl-rollback-review.sql` | `5c8bcca8de679d805842fcb31e0a7db5aa5dfa75f548b61d6ac47cca793f4c0e` | 6485  | `motorsales365.profile_bootstrap_acl_recovery` |
| `work-order-totals-acl-rollback-review.sql` | `bde84b287271c64ca61b91920281e447eee9cb50223ea32667808d3cf6fcdbb9` | 6497  | `motorsales365.work_order_totals_acl_recovery` |

The opt-in value must be `owner-reviewed-unsafe-restore` and clears on COMMIT.
Recovery requires the unchanged target and exact restricted pre-state, restores
only its known unsafe original PUBLIC grant, and preserves the companion/converter.
Running it would reopen an observed risk; it requires a new operator/owner
decision, not automatic authorization from a containment approval. No recovery
was run live. Broader database/private-storage restore readiness remains open.

## Original live gate checklist (now superseded by release evidence)

The two helper restrictions are now individually applied and verified in
`APPROVED_HELPER_EXECUTE_RELEASE.md` / draft PR #42. Actual remote versions are
`20261015021118` and `20261015021145`; each stored single statement is the pinned
trusted-path execution envelope containing the exact original source bytes,
not the original candidate whole file. Do not replay either applied action or
restore unsafe access. The original preparation checklist follows for context.

Publish/review these sources and tests, require CI, obtain explicit scope approval,
refresh exact complete ACL/definition/effective roles, confirm the approved
converter restriction remains intact and retain these scoped recovery inputs.
Only then apply the individually approved file via the migration tool in an
exclusive operator window. Verify catalog/role results and exact stored-source
mapping afterward without invoking business functions or repairing history.
Do not treat a green CI build or scoped approval as a full application release.

Until then continue safe application compatibility, companion roster/native
authority guards and baseline inventory work. Guard design must also address
no-op/team-thread side effects, active/revoked staff, actual-owner versus delegated
management, legacy identity and multi-roster/offboarding cleanup. No existing
binding is guessed or repaired by this proposal.

## Guidance and advisor state

[Supabase function privileges](https://supabase.com/docs/guides/database/functions)
informed exact-function rather than global grants, and
[PostgreSQL REVOKE](https://www.postgresql.org/docs/current/sql-revoke.html)
informed explicit role paths/RESTRICT. The changelog/minor-release/API-exposure
notices were reviewed; no platform, extension or Data API setting changed.
The security advisor still reports the same four categories:
[RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[public extension](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public),
[anonymous definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
and [authenticated definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
These candidates do not clear the global advisor or authorize any other change.
