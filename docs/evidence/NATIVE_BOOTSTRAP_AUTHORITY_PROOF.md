# Native profile bootstrap: isolated authority proof

Updated 2026-10-15 Asia/Manila. **Seven offline tests pass; no live mitigation.**
The converter-only production approval does not include this function. No
business RPC or profile mutation was attempted live, and no forward migration
or production correction is introduced by this slice.

## Exact source and bounded live correspondence

The unchanged `shop_manager.ensure_profile_for(uuid)` definition is extracted
from `20260713081838_b99aba93-f19b-4aec-b7a1-3bdb86faadc6.sql`:

- Full historical file SHA-256, CRLF normalized to LF:
  `5ea2e85cf05bf006dcb684ef063f9ef15f38fdfcc9dccd2c050f4c0a5a115647`.
- Extracted definition SHA-256:
  `8f86e53b90d08631378fd50e28b63dceac4ede81059748dc255c15f0b0f5a554`.
- Fresh live and disposable `pg_get_functiondef` MD5:
  `77cb775bfedfb78996b31fcbdd3ada4c`.
- Fresh live and disposable CR-normalized body MD5:
  `ec9ce0a3dc3bcd576cef57c5ea347d58`.

Read-only catalog inspection on project `wjxaajgvddtrxxtocxen` confirms postgres
ownership, SECURITY DEFINER and original live ACL
`{=X/postgres,postgres=X/postgres,service_role=X/postgres}`. anon/authenticated
inherit PUBLIC execution; service execution is also available. These hashes are
bounded observation identifiers, not full schema provenance or current-state
monitoring. The historical source additionally declares a direct authenticated
EXECUTE grant; the fixture retains that stricter-to-revoke access path explicitly,
rather than pretending the live ACL contains it.

Native profile constraint metadata was also checked without reading rows:
email is NOT NULL UNIQUE; id is the primary key; nullable user_id references
auth.users(id) ON DELETE SET NULL and has a partial unique index where nonnull.
**There is no live profile shop_id foreign key.** The primary fixture matches
these relevant constraints. A separately added synthetic shop FK is labeled a
hypothetical stricter candidate, not a production constraint or proposed release.
Other omitted columns/triggers/policies and external API reachability remain
outside fixture parity.

## Reproduced behavior and positive controls

`scripts/ci/shop-manager-bootstrap-authority.test.mjs` uses six sequential
memory-only PGlite databases, always closed. Each test has a 20-second bound,
with 3-second statement and 1-second lock timeouts. Exact original definition and
historical authenticated grant are loaded, with LF transport normalization only.

1. Missing, ambiguous, modified or oversized source is refused; CRLF is accepted.
2. A non-superuser/NOBYPASSRLS actor cannot directly INSERT/UPDATE native profiles,
   yet the original definer bootstrap creates a requested other user's profile.
   For a synthetic owner whose business ID differs from the generated shop ID,
   it stores the business UUID as shop_id under the observed no-FK shape. It also
   creates the caller's unlinked profile; no native roles are granted.
3. An anonymous role with explicitly cleared JWT subject can create a requested
   valid unlinked user's profile. Missing auth targets fail NOT NULL email with
   23502 and leave all existing profiles unchanged.
4. A legacy profile whose id differs from user_id hits a uniqueness failure
   (23505); the existing row is not rewritten or repaired. This fixture does not
   distinguish whether email uniqueness or partial user_id uniqueness rejects
   the conflicting insert; both existing identity constraints are retained.
5. Existing nonnull shop bindings are returned for other actors without mutation.
   For an existing id with null shop, ON CONFLICT(id) DO NOTHING leaves it null
   even when the returned value is a business UUID. Return value is not proof of
   successful provisioning or valid shop selection.
6. Fixture-only PUBLIC denial still leaves the retained historical authenticated
   grant usable. Explicit client EXECUTE denial blocks both clients while
   preserving owner/service execution, the function definition and native table
   authority ACLs. This is not an applied mitigation or an automatic rollout.
7. Adding a hypothetical shop FK causes the business/shop mismatch to fail 23503,
   with no partial profile changes. Adding such a constraint blindly is not safe
   migration or repair of existing data.

Run `node --test scripts/ci/shop-manager-bootstrap-authority.test.mjs` without
credentials or an external database. The suite is included in the CI tooling
command. It does not test the production API, all RLS policies, onboarding,
restoration, concurrent provisioning or the complete identity contract.

Published draft PR #17, code `babc86f`: all six CI gates passed in run
`38616653784`, including 72 tooling tests, 370 application tests, both receipt DB
suites, 247 disposable PostgreSQL assertions, lint, TypeScript, actual-browser
OCR/PDF and the full build/package dry-run. No app deployment or migration follows
from these results. The subsequent handoff update changes documentation only.

## Next dependency and production limits

Prepare an independently reviewed exact bootstrap containment/replacement
candidate, caller-impact audit and recovery rehearsal; no app source caller was
found in the bounded retained search, but older deployments/external callers are
not excluded. Any live restriction still needs separately explicit authority,
fresh exact definition/complete ACL/effective-role preconditions and release
checks. Review the exposed totals helper independently; converter approval does
not extend to it either.

Then implement/test the companion roster and direct native-profile/role guards
from `BUSINESS_STAFF_AUTHORITY_GATES.md`, preserving authenticated shift/manager
workflows and legacy identity. Do not trust definer current_user or a writable
profile shop as an original caller/membership contract. Existing potentially
incorrect bindings are not established by these tests and must not be guessed,
backfilled or repaired without scoped evidence and approval. Atomic invoicing
and broader baseline/recovery requirements remain downstream gates.
