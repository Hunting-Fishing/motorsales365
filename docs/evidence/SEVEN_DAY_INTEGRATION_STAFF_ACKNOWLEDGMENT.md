# Seven-day candidate: staff acknowledgments and private UI lifetimes

Date: 15 October 2026. Canonical repository: `Hunting-Fishing/motorsales365`.
Branch: `completion/365-seven-day-integration`.
Code commit: `ece7e2a0288a9a70be58feeeaefdfe1922fde887`.
Parent: `0aa3fb5f1a3f0f664e4808b6eaab5342cc0acb27`, preserving the owner's
seven-day plan. Main remains `70ab892a8b7c05eac288ea4a6cce7a002d316f00`.

## Changed behavior

`src/lib/internal-staff.functions.ts` now rejects an admin role result with an
error, including data-plus-error, and masks private provider failures. The
existing domain/role/auth middleware remains the authority mechanism; this
change does not certify it as trustworthy or repair mutable `user_roles`.

Manager changes require a bounded, successful hierarchy read and one exact
returned target/manager row. Missing/malformed/error/mismatched responses and
cycles fail closed, including preexisting unrelated cycles and chains beyond
50 nodes. Explicit null manager remains supported. This is not an atomic
concurrent hierarchy protocol, audit receipt or target-eligibility repair.

Creation checks the returned Auth identity/email and exact profile id, manager
and name after the profile update. Failed or ambiguous profile outcomes remain
partial: the existing Auth account is not deleted, retried or reported as rolled
back. A confirmed response acknowledges only account/profile calls, not role,
organization, trusted staff or audit provisioning. No new grant is introduced.

The existing provider ban must return the matching user and a valid future
`banned_until`; acknowledgment explicitly covers sign-in restriction only.
Existing JWT/session, native roster, roles, chat and storage revocation are not
verified. The directory rejects failed role/Auth lookups instead of silently
returning partial identities or downgrading admin badges.

`src/lib/internal-staff-contract.ts` is a browser-safe Zod response contract with
strict shape and target equality. It is not authentication, freshness or a ledger.

The actual staff view now waits for the matching authenticated account, scopes
private query keys to account/admin context, and hides old private content during
refresh/error. Account/admin/snapshot/dialog boundaries plus layout-effect cleanup
suppress stale toasts, refreshes and form closure, including account A-B-A.
Synchronous pending refs prevent duplicate dispatch in a live form.

Unknown creation outcomes keep creation controls locked across dialog close,
refresh and admin-context changes within the **mounted account scope**. Navigation,
loading/sign-out or account unmount resets that local scope. It is not durable
idempotency, cross-tab locking, request cancellation or a server recovery ledger.
Manager/sign-in actions also do not claim rollback after an uncertain response.

Sign-in UI now says "Restrict sign-in", not "deactivated". Creation and manager
acknowledgments identify unconfirmed related role/audit effects. Directory
pagination, existing cyclic-roster completeness, staff/manager eligibility,
atomic hierarchy changes, permanent creation retry safety, current original-human
authority and full offboarding remain open release dependencies.

## Exact local verification

| Command / scope                                                                                                                                        | Result                                                                           | Boundary                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx vitest run src/lib/internal-staff.functions.test.ts src/components/internal-staff/InternalStaffView.test.tsx --maxWorkers=1`                      | 93/93, 4.15 seconds (65 server/contract, 28 UI)                                  | Mocked clients/auth/server transport; real React/QueryClient. No hosted API/JWT/RLS/provider or database-trigger execution.                                                                |
| `npx vitest run --maxWorkers=1 --reporter=json --outputFile=vitest-report.json`                                                                        | 1,333/1,333 across 62 files; zero failures/pending; report span 100.029 seconds  | Includes the focused 93, not added twice. Application regression, not live acceptance.                                                                                                     |
| `node scripts/ci/check-vitest-results.mjs vitest-report.json scripts/ci/vitest-quarantine.json`                                                        | Exit 0; zero unexpected/quarantined failures or newly passing quarantine entries | Report policy unchanged.                                                                                                                                                                   |
| `npx tsc --noEmit -p tsconfig.json`                                                                                                                    | Exit 0 after final source changes                                                | Full TypeScript check.                                                                                                                                                                     |
| Direct ESLint on five changed/new staff source/test files and the inventory test                                                                       | Zero warnings/errors                                                             | No repository-wide cleanup or weakening.                                                                                                                                                   |
| `npm run build`                                                                                                                                        | Exit 0; client/SSR/Worker produced                                               | Sparse public media, including unresolved `/banner.webp`, and existing chunk/route/use-client/config warnings prevent claiming a full releasable artifact. Never deploy this local output. |
| `node scripts/ci/verify-worker-bundle.mjs`                                                                                                             | Exit 0; Worker and 15 OCR/202 PDF assets verified                                | Bundle inspection, not hosting upload.                                                                                                                                                     |
| `node --test scripts/ci/seven-day-integration-inventory.test.mjs scripts/ci/check-vitest-results.test.mjs scripts/ci/supabase-release-safety.test.mjs` | 15/15, 0.346 seconds                                                             | Hermetic capture/report/release guards; no network/database replay.                                                                                                                        |
| `node --test scripts/vehicle-receipts/verify-ocr-assets.test.mjs scripts/vehicle-receipts/verify-pdf-assets.test.mjs`                                  | 10/10, 0.256 seconds                                                             | Asset regression; no new browser/mobile OCR run.                                                                                                                                           |
| Prettier, `git diff --check`, primary source/test review                                                                                               | Pass                                                                             | No independent reviewer available; do not relabel primary review.                                                                                                                          |

Two explicit never-quarantined CI steps now run the new staff regressions and
dated inventory guards. All existing tests/quarantine/report/release gates are
preserved. Parent PR #67's 701 SQL/tooling tests are unchanged prior evidence,
not rerun or summed into this slice's fresh counts. No SQL fixture/migration or
generated middleware was modified.

Supabase skill guidance and the installed SDK drove explicit selected-row
confirmation and narrow provider acknowledgment; the UI work treats uncertainty
and lifetime changes separately from durable authority. Official references:

- [Update API](https://supabase.com/docs/reference/javascript/update): returned
  rows require a chained selection.
- [Maybe single](https://supabase.com/docs/reference/javascript/using-modifiers-maybesingle):
  zero-or-one row is permitted; a successful transport alone is not a changed row.
- [Admin update user](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid):
  server-side provider operation. It does not establish application-wide revocation.

## Integration inventory and parent checks

Capture: `seven-day-pr-inventory-2026-10-15.json`, observed at 13:44:13 UTC.
Normalized LF bytes: 32,594. SHA-256:
`898cde522511fb792356e3ddcd5652780b7c72057cf1c5c681b8b9f7444b7d3d`.
The immutable capture names each head, base, draft status and ancestry result at
candidate `0aa3fb5f1a3f0f664e4808b6eaab5342cc0acb27`.

There were 61 open PRs, 58 drafts; all captured commits were present locally.
59 heads are candidate ancestors, including PR #8. PR #67's base-branch graph
walks 58 PRs through PR #5. PR #9 and PR #2 are not ancestors and need separate
content reconciliation. No draft was merged or closed. This source inclusion
does not activate SQL or establish patch parity, authorization or release readiness.

PR #9 is a large cutover touching provider packages/configuration, auth/generated
middleware, assets, AI/email/webhooks/Stripe/MCP and a legacy-URL rewrite migration.
Only a read-only file-name diff was inspected here; no `.env` value was printed
and no cutover merge or provider setting was adopted. PR #2 plan reconciliation
also remains open. The initial feature ledger does not yet claim exhaustive
action-level coverage.

Parent PR #67 latest head `576fb17d1fdea96d73b4ae68ea6b725eef62efdf` passed all
six CI gates, run `38740109605`. Wrapper `38740109751` passed its preview step,
but configured upload was skipped; migration/production jobs were skipped.
Separate hosting check `116439365725` failed, build
`e4ecbe71-54eb-4776-9b31-3f3508d6fece`.

Purpose-built check diagnostics returned a build ID/link, no text or annotations.
There is no supported root-cause diagnosis yet. Prior local Wrangler authentication
failure was not retried and is not asserted to be the hosting build's cause.
Cloudflare skill guidance kept this diagnostic read-only: no config, logging,
deployment or paid-resource changes. Obtain authenticated provider build logs.
The new candidate's exact publication head still needs its own CI check.

## Staging and independent-session findings

Two Supabase metadata API reads listed projects and canonical project branches;
no SQL or business/Auth/storage/config rows were read. The canonical 365 project
`wjxaajgvddtrxxtocxen` reports ACTIVE_HEALTHY, PostgreSQL 17.6.1.155. No separate
365 staging project is visible. Other businesses' projects were not selected.

Only the default `main` branch is returned, referring to the canonical project,
not isolated staging. It carries a `MIGRATIONS_FAILED` metadata marker last updated
27 September, while project/preview-project health reports ACTIVE_HEALTHY. This is
**not a newly attempted or failed migration in this run** and is not permission
to reset history. No branch was created, deleted, reset or promoted.

An owner question is open to nominate an existing isolated staging project or
connect access; no passwords or keys requested. The earlier pilot shop/tester
question remains open. Local work continues on synthetic records meanwhile.

Docker CLI is installed, but a read-only `docker version --format '{{json .Server}}'`
failed because the Docker Desktop Linux engine pipe is unavailable. `psql` was
not found on PATH. No daemon start/install, container/image download or new
resource was attempted. Existing disposable PostgreSQL 18.6 evidence is not real
independent-session or live 17.6 parity.

## Release impact and resumption

Migration impact: **none**. Application deployment: **none**. No live business
RPC, provider account mutation, paid provisioning, customer message, data deletion,
history repair, approved-restriction replay or PR merge. Existing production
restrictions and all false baseline/replay/parity/release flags remain unchanged.
Global composed source mapping remains 404/423 with 19 unclassified entries; no
fresh live mapping count is claimed by this app slice.

Next: publish/attach this candidate and verify its exact head, reconcile PR #9
selectively and PR #2 plan content, complete action-level acceptance/migration
inventory, and close original-actor/fresh-authority/native-team/offboarding/claim
transaction/private-custody dependencies for integrated staging. Do not repeat
already completed model/codec/recovery characterization or manufacture privileged
legacy positives. See `../365_RELEASE_ACCEPTANCE_LEDGER.md` for workflow gates and
the owner staging/pilot inputs. Reassess the seven-day target by Day 2; no silent
scope reduction or guarantee of completion from CI/test counts.

### Publication record

Published and attached draft [PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68),
base `security/claim-revision-invalidation-model` at `576fb17d`, head
`completion/365-seven-day-integration`. First evidence head `76c5fa41` started
CI `38748496533`; the first snapshot has running/queued jobs, not a pass.
Wrapper `38748496539` preview
is in progress; migration/production jobs skip. Supabase Preview skips because
the SQL directory did not change. No upload or provider hosting result is inferred.
This publication-record commit supersedes the initial check head. Verify the
exact newest PR head on resumption. No other remote branch or main was changed.
