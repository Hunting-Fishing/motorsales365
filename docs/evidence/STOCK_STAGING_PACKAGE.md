# Stock staging package and activation checkpoint

21 October 2026 (Asia/Manila). Based on PR69 head b6a98e974b7779d1ec68bf946404241674cf34c0.
This is deployment preparation, not an installed staging or production release.

## Corrected package dependency

The previous generated forward artifact contained the staff authority boundary
and stock endpoint, but omitted the already-written staff lifecycle repairs.
A new composed test reproduces SQLSTATE23514 during staff deactivation with that
old package and the retained real chat/shift status constraints. Installing a
new stock endpoint alone does not repair that incompatibility.

Use the new complete generator:

```sh
node scripts/client-release/build-business-stock-staging-release.mjs > business-stock-forward.sql
```

It composes the unchanged stock/boundary package with the unchanged, source-pinned
staff lifecycle builder in ONE transaction. There is one outer BEGIN/COMMIT.
Unexpected original function bodies stop installation and roll back the endpoint,
grants and new schemas together. Original constraints and policies remain intact.
The old component builder remains for its isolated tests; do not use its older
artifact as the complete deployment package.

Generated complete SQL SHA256:
`ed955348daed43355c66cd96f1b6ba1c2321e59154d62b8372b4a89908e4e436`.
The updated workflow publishes `business-stock-staging-package` containing this
forward SQL, suspension SQL, this note and SHA256SUMS. No step connects to a hosted
database or registers/applies a migration.

## Receipt-preserving suspension

`supabase/releases/business-stock-suspend-v1.sql` revokes execution of BOTH the
public wrapper and private implementation for ordinary/application roles. It
retains all outcomes, movements, quantities, staff guards and lifecycle repairs.
It suspends lookups as well as writes. Already executing transactions may finish;
this is NOT cancellation and NOT reversal of committed stock. Review outcomes
before restoring exact grants. Do not drop the outcome schema on a code rollback.

## Executed checks

Six new local groups passed (11.947 seconds, zero failed/skipped/cancelled):
transaction envelope; old-package failure reproduction; combined stock posting
and valid staff deactivation with unknown cash preserved; Store A maintenance
preserving selected Shop B; all-or-nothing installation on function drift; and
suspension followed by same-ID recovery without a second movement.

These execute retained staff triggers and selected stock tables together in
PGlite. Public business support and Auth/session claims remain synthetic; this
is NOT real signed-token acceptance or complete hosted-schema coverage. Existing
UI, contract, SQL, source-integrity and native PG17 concurrency gates remain.
Exact-head GitHub results must be read independently after publishing.

## Hosted inspection and next authorization

A bounded READ ONLY catalog query on the 365 project confirmed PG170006, no new
stock RPC/schema or staff-boundary schema installed, and the two original staff
function body hashes expected by the lifecycle repair:
`3953299c83e7f20a19f4a7f60b12ba84` and `b6c1d106f82fc26edef65f28189a3470`.
The relevant current chat/shift status constraints match the retained fixture.
No customer, account, stock or payment records were read or modified.

Connected project/branch discovery found no separate 365 staging database. The
branch-create request stopped before provisioning because the connector requires
explicit cost confirmation. The organization-specific branch quote is USD0.01344
per hour (USD0.32256 per24 hours at that rate; other usage may be additional).
No cost-confirmation ID was created and no paid branch was provisioned.

Still required: cost approval and isolated staging provision; successful current
schema migration replay (the existing main branch record reports MIGRATIONS_FAILED,
while the project itself reports ACTIVE_HEALTHY); apply/register the reviewed
forward migration in staging; real signed-session and multi-business device
checks; compatibility review of existing writers and service jobs; recovery
acceptance; then coordinated deployment. Other full-client release gaps remain.
No main merge, live SQL/grant change or production deployment accompanies this commit.
