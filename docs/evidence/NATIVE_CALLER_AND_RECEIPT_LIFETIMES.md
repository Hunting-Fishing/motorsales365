# Connected customer caller checks and private receipt opening

16 October 2026, Asia/Manila. Same integrated candidate and draft PR #68.
Source `9a4059bde546ed81eaa886124cc3e5b59529b5bc`; publication
`a69903a750a07f8758be4f3adc934b023729a312`. Existing draft PR #68/base/main are
preserved. Publication follow-up below joins the next integrated source slice,
not a documentation-only CI restart.
These are connected application changes, not a new authority model or permission
grant. No production action or acceptance flag is supplied by this evidence.

## Changes

`src/lib/customer-detail.functions.ts` now calls the non-generated
`native-request-caller.server.ts` before binding a native schema. It captures the
existing middleware context, caller client/Auth method and verified claims before
`getRequest`, checks UUID/account/subject equality and the authenticated token
role, and rejects explicit anonymous users. One explicit-token `getUser` call
uses that same caller client, with its original Auth method receiver preserved.
Unavailable, malformed, mismatched or erroneous current-user responses deny
before customer reads. No admin, browser, service-role or broader reader fallback
is introduced. Existing fixed projections, primary visibility/list gates and
early account-change error contract remain.

The Auth **wait** is bounded to ten seconds and request abort, with timer/listener
cleanup and handled late resolution/rejection. Context/client/claims/credential/
signal are checked after the wait, before schema binding and at existing read
checkpoints. An observed loss stays denied. Changes that occur and return between
observations are not a proven epoch fence. The SDK has no per-call AbortSignal:
this does not cancel its underlying HTTP operation or establish strict session
revocation. Missing anonymous metadata is tolerated, not evidence of a physical
human. There is no email-domain or user-metadata authorization decision.

`src/components/vehicle-receipt-panel.tsx` now separates private file opening from
mutation refresh. A synchronous attempt latch rejects same-tick repeat/cross-file
clicks. A committed layout-effect lifetime permanently invalidates old reads on
account/vehicle/shop-vehicle changes, logout, unmount and StrictMode cleanup.
Late responses cannot open the old signed URL, toast its error, invalidate caches
or release a newer attempt's latch. Current signing/popup exceptions use one
generic error and permit explicit retry. Receipt editor, OCR and mutation paths
and server signing/storage permissions are unchanged.

## Verification

- Receipt UI: 33/33, including 20 new deferred regressions, real QueryClient and
  actual in-flight StrictMode cleanup. The first harness nested StrictMode below
  the provider and observed zero initial replay; wrapping the rendered root
  corrected that harness without changing production source. Final focused run
  passed in 4.42s.
- Caller helper: 92/92; connected customer handler: 67/67. Initial four method-swap
  controls used `vi.fn(existingMock)`, which retained identity in the installed
  Vitest. Distinct wrapper mocks with identity assertions corrected the tests,
  not the guard. Final focused run 159/159 in 1.92s.
- Root combined critical suites: 192/192 across three files, final 5.77s total, no
  warnings/failures/skips; ordinary timeouts and quarantine unchanged.
- Dedicated unconditional, single-worker, never-quarantined CI step includes all
  three suites. Both offline CI wiring guards pass (102.719ms). Formatting and
  independent source/test/CI review pass. Full TypeScript caught an unsupported
  Testing Library ByRole `exact` option in the new tests; anchored name matchers
  preserve exact selection, combined tests still pass and full TypeScript now
  passes. Seven-file changed-line lint has zero new errors/warnings; nine older
  findings remain outside changed lines.
- Fresh complete `npm run build` passes at source `9a4059bd`, including client and
  server packaging; existing route-test, module-directive/chunk and Wrangler-main
  warnings remain. This is a build, not a browser/Worker runtime acceptance.
  All 214 tracked Git/source/output public copies verify, as do Worker identity
  `motorsales365`/`index.mjs`, canonical Supabase binding, 15 OCR/202 PDF assets and
  the browser-engine/server boundary. No old sparse artifact is used or uploaded.

All caller/Auth transport and signed-URL responses in these tests are synthetic.
No JWT, live Auth lookup, HTTP cancellation, native RLS, Storage download or owner
journey was executed. The generated auth middleware is unchanged; its LF SHA-256
is `3c16c38eda5e4213aaac23a16194722ca413ec454aa8006f4b48a7e586f51868`.

Primary guidance checked:
[Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser)
performs a server user-record lookup; the existing
[getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims)
verification remains in middleware. Supabase security guidance kept current-user
lookup, JWT verification, session revocation and native-shop authorization as
distinct requirements rather than replacing one with another.

## Remaining gates and resumption

This is additional caller denial and a narrow signed-read lifetime fix. It does
not establish original-human custody, strict `auth.sessions` freshness, trusted
native membership/roles/tenant, delegation, offboarding or atomic mutation/retry
authority. Receipt cached-list freshness, retained-user Auth loading, same-account
permission changes, already-issued URL expiry/revocation, popup browser behavior,
editor/mutation lifetimes and purchase/expense duplicate recovery remain outside
this slice. Real phone/browser/private-object and owner acceptance remain open.

The separate locked quote candidate stays revoked/unapplied/unconnected. Its
published parent `2cbf20a4` native PG17.11 job verified six independent-session
scenario groups and cleanup alongside Parts 247/247; 47 retained migration replay
failures remain. Do not repeat that selected proof or promote it into full
baseline/API/Auth/Storage/restore acceptance. New application publication still
needs its own exact-head CI.

Next safe implementation: review the existing customer commercial/communications
readers for the same additional caller-denial integration, preserving their own
primary/link/projection boundaries and tests. Separately continue receipt list/
editor/mutation lifetime and unknown-outcome handling, without calling client
locks durable dedupe or bypassing native authority. Do not rerun completed email
plans, selected quote races or source recovery as substitute progress.

No migration, live SQL/ACL/Auth/business write, restriction replay, provider
activation, customer communication, new hosted project/cost, Docker, upload,
deployment or merge occurred. Sole hosted backend remains
`wjxaajgvddtrxxtocxen`; other business projects are untouched. Continue trusted
fresh/original-actor/native-team authority, durable monetary/stock/retry writers,
private evidence/recovery and reviewed pilot acceptance. The seven-day date is a
target, not a verified forecast; no scope is silently removed.

## Publication follow-up

Canonical remote and same attached draft PR #68 confirm `a69903a7`; base remains
`security/claim-revision-invalidation-model`, main remains `70ab892a`. Final-head
214 public copies verify again. Run `38846180291`: native Parts/quote
`116797113332` passes, with an untruncated log confirming actual PG17.11
(`server_version_num=170011`), all six named quote scenario groups, 247 Parts
assertions, 47 retained migration replay failures, both server stops and the
successful quote always-cleanup step. All six Actions gates pass. Completed unit
`116797113345` confirms critical192/192 (3.95s), locked quote94/94 and application
2,745/2,745 across80files (52.00s), zero unexpected/quarantined failures. Its
overall log is truncated but contains final summaries/checker. This is this
head's CI result, not acceptance of newer source. Selected native SQL proof is
verified, not R2/Auth/API/Storage/restore or financial acceptance.

Wrapper `38846180356` preview uses its successful configured skip path, not an
upload; migration detection/migrations/production and Supabase Preview skipped.
Independent Workers build `ef57aefb-0ec5-4e48-8daf-81514569432c` failed. Only its
reported ID/link is verified, not the fresh cause or source freeze execution.
No deployment, migration or authority adoption follows from this publication.
