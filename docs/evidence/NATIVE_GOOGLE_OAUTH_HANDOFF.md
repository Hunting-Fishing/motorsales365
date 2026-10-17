# Native Google OAuth handoff

15 October 2026. Source `c3f6bb9cc11c46246c0662f2030a3056b2287854`, URL/lifetime
guard follow-up `b3acef0eae9312073ca7541e7ba898482a3307dc`, formatting-only follow-up
`8e1be6acbe426920d8dbb9a1fb8007892e6a036f`. Same integration branch and
[draft PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68), stacked
on PR #67. This is source integration, not a production release.

## Selective PR #9 adoption

Reviewed PR #9 at `300f02ba8f8fb0ad8b6c5746fc60373153187c65`. This slice adopts
its native Google OAuth intent only: login/signup no longer invoke the Lovable
auth wrapper. Both use the existing Supabase browser client, already pinned to
365 project `wjxaajgvddtrxxtocxen`. The generated client, middleware, wrapper,
dependencies, lockfile and provider configuration are unchanged. Broader PR #9
email/maps/AI/billing/MCP/configuration/assets/legacy-URL changes remain separate
review work; neither PR #9 nor PR #2 was bulk merged.

The adapter requests `signInWithOAuth` with Google, the canonical return URL and
`skipBrowserRedirect: true`, then checks the returned authorization URL before
browser navigation. It requires the exact 365 Supabase origin and authorization
path, Google provider, matching permitted callback, unique allowed parameters and
no userinfo, fragment, raw whitespace/control characters or backslashes.
Internal return paths reject external/scheme-relative paths and normalized
scheme-relative variants. This does not validate a downstream internal endpoint's
own redirect implementation.

Login/signup share a synchronous lock with their password/email flow. Google
waits for auth bootstrap and a signed-out account. Pending handoffs/errors are
discarded after account, return target, signup details/consent or component
lifetime changes, including old retained handlers and A–B–A transitions. After
initiating navigation the form remains locked while the browser leaves; no
navigation-completed or auth-success assertion is made. Failed validation does
not dispatch; active-scope failures give a generic error and permit manual retry.
There is no cancellation, provider rollback or durable retry/idempotency ledger.

Signup preserves its existing required identity/address/business/terms checks,
omitting only password fields for Google, and writes the existing pending-profile
snapshot before handoff. It no longer calls the post-signup success path merely
because a URL was returned. Pending-profile storage/applier retries and their
authorization, legacy email/password callbacks and broader role/provisioning
boundaries are unchanged and not certified by this slice.

The installed SDK's existing implicit flow is preserved. Accepting a well-formed
S256 URL in parser tests is not an implemented or accepted PKCE callback. Actual
Google provider settings, approved callback/redirect allowlist, provider round
trip, returned session and profile/role application still require acceptance.
The [Supabase OAuth API](https://supabase.com/docs/reference/javascript/auth-signinwithoauth)
and [Google sign-in guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
support the SDK call and distinguish implicit session handling from a PKCE code
exchange. Installed SDK source was checked for automatic-redirect behavior.

## Application verification

Fresh full application suite: **1,431/1,431 across 65 files**, 105.08 seconds,
zero failures/skips/quarantine. This includes all 98 new tests, not added twice:

- 67 adapter/URL tests cover callback and response shape, wrong project/provider,
  duplicate/unknown parameters, control characters, normalized redirects and
  generic errors. One actual installed SDK test generates an implicit URL with
  synthetic publishable input and injected fetch: zero network requests.
- 23 real React hook tests cover preparation ordering, duplicate/cross-flow locks,
  blocked contexts, active-scope error/retry and late results after context/lifetime
  changes. Provider and browser navigation are mocked.
- Eight tests mount the actual login/signup routes, adapter and hook with mocked
  auth/navigation and lazy phone/location fixtures. They verify required signup
  details/terms, snapshot-before-dispatch, no false account/provisioning success,
  duplicate/password/email fencing and stale return-target/identity handling.

Command: `npx vitest run --maxWorkers=1 --reporter=default --reporter=json --outputFile=vitest-report.json`.
The report checker passes with zero unexpected or quarantined failures. An earlier
full run had one restricted-column repository-scan failure; it then passed alone
(10/10) and in the clean full rerun, without test/quarantine changes. No root cause
is asserted from that transient result. The new 98-test step is never quarantined
in CI. Parent SQL/tooling results are not fresh OAuth validation or double-counted.

Full TypeScript (`npx tsc --noEmit -p tsconfig.json`) passes. Changed-line ESLint
against prior head `818651fd` passes with zero errors/warnings, covering all new
files in full; 61 existing findings outside the changed lines remain. Manual
primary review found no additional release-blocking issue within this handoff
slice. No independent agent review was available.

Fresh `npm run build` passes from the complete checkout. Worker verification
confirms `motorsales365`, `index.mjs`, canonical Supabase target, 15 same-origin
OCR files, 202 PDF files and no browser OCR/PDF engine in the server package.
The release guard confirms all 214 tracked public files against Git HEAD
`8e1be6ac` and copied output. Existing route-test/chunk/use-client/config warnings
remain separate quality work. Nothing was uploaded or deployed.

Release/report/inventory guards pass **65/65**, 7.910 seconds; OCR/PDF asset tests
pass **10/10**, 0.236 seconds, with no failures/skips/cancellations. Commands:
`node --test scripts/ci/verify-release-assets.test.mjs scripts/ci/check-vitest-results.test.mjs scripts/ci/supabase-release-safety.test.mjs scripts/ci/seven-day-integration-inventory.test.mjs`
and `node --test scripts/vehicle-receipts/verify-ocr-assets.test.mjs scripts/vehicle-receipts/verify-pdf-assets.test.mjs`.
Prettier for all five new source/test files and changed documents plus diff checks
pass. Legacy routes use changed-line lint rather than a whole-file style rewrite.

## Backend and release boundary

The owner requires only hosted project `wjxaajgvddtrxxtocxen` for 365, API
`https://wjxaajgvddtrxxtocxen.supabase.co`. The 366 AI and Barangay Buddy projects
remain separate and untouched. The older separate-hosted-staging/cost question
is superseded; no project switch, creation, quote or charge occurred. Local
synthetic testing and a reviewed production-safe acceptance path must satisfy
actual API/Auth/roles/private-storage/transaction/recovery requirements without
using production as disposable staging. Docker Desktop is stopped/unavailable;
the read-only RAM snapshot was 1.93 GiB free of 15.71 GiB. No daemon, image download
or local Supabase stack was started. The pilot shop/test-account question remains
open and is not repeated here.

Prior exact PR #68 head `818651fd` passed all six CI gates (`38752315795`), including
real-browser OCR and disposable Parts PostgreSQL. Independent hosting build
`ea623a17-3b0f-4bc0-ba4e-90f939f8a218`, check `116482648981`, failed without
diagnostic text. Wrapper `38752316318` passed its preview step with upload
configured skipped; migrations/production skipped. New publication needs its
own exact-head checks. Prior green CI is not provider readiness, release approval
or verified live behavior.

Migration impact/deployment: **none**. No live SQL/business/Auth mutation, provider
change, restriction replay, history repair, customer communication, paid resource,
PR merge or new automation. Source correspondence remains 404/423 with 19
unclassified; baseline/replay/parity/release flags remain unchanged. Preserve the
approved restrictions and never release the older sparse output.

Next: publish on existing PR #68, verify exact latest-head CI, then complete the
remaining selective PR #9/#2 review and action-level feature/migration inventory.
Close actual Google/session acceptance and original-human/fresh-role/tenant,
native-team/claim/offboarding/private-custody/transaction/recovery gates through
the agreed safe path. Do not turn this handoff adapter into an identity-authority
claim or create another hosted backend to satisfy a test.

The Supabase skill guided native-client use and the provider/session boundary;
writing guidance kept the owner backend decision and unfinished acceptance
separate from passing source tests.
