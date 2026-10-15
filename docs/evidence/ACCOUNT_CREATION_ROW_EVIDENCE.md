# Account-creation returned-row evidence

Updated: 2026-10-15 (Asia/Manila).

## Bounded backend correction

The existing handler previously treated role insert/profile update responses
without errors as sufficient for its normal 200 acknowledgment, without returned
row identities. The correction requests only `user_id,role` from the same role
insert and `id` from the same profile update filtered by the new Auth user id.
It requires the exact unique requested role set bound to that UUID, independent
of row order, and exactly one matching profile UUID. Extra fields/rows, missing,
NULL, malformed, duplicate or wrong identities do not reach normal 200. Returned
errors take precedence over apparently matching data. A malformed Auth UUID also
prevents subsequent role/profile writes.

Normal 200 stays exactly `{ok:true,userId,email}` and remains an acknowledgment,
not full stored-field, trigger, tenant authority, credential-delivery or durable
audit proof. Existing role/profile 207 envelope shapes are preserved, with
generic diagnostics. Rejected later promises after a known Auth creation also
produce partial/unknown 207 without retry, compensation, deletion or rollback
claims. A completion-audit exception is distinguished from a profile response
failure; best-effort audit resolution itself supplies no durable receipt.
Pre-create exceptions return a generic unknown error, not raw diagnostics.

Verified-user/admin lookup ordering, exact requested writes (including duplicate
role requests), domain coercion, API input schema, current staff `seller_type=NULL`
patch, legacy seller choices and password generation are retained. No base `user`
role is added. Current enum/NOT NULL incompatibility, signup/org/partner fanouts,
mutable platform role provenance, session revocation and TOCTOU remain separate
release blockers, not repaired by identity evidence. No schema/migration, new
permissions, actor override, automatic delivery or customer communication.

## Validation boundaries

53 new tests run the actual route and real Zod validator with mocked SDK/audit.
Combined with the unchanged 41 dialog tests: 94/94 pass (8.24 seconds). They
exercise auth/admin/input/pre-create negatives, exact projections/filter/order,
both returned error and promise-rejection paths, stage-aware partial results,
role/profile receipt variants, canonical UUID/order, duplicate requests, domain
coercion, retained NULL/model gaps and private-field audit summaries. Mocked
authenticated subjects are not signed JWTs or trusted original-human custody;
mocked returned rows are not real PostgREST/RLS/commit/rollback/trigger tests.

This remains a multi-step Auth/PostgREST operation, not atomic/idempotent account
provisioning. Parent consumer read/cache lifetimes and real dialog accessibility
are unchanged. All live database work in this heartbeat was catalog-only for the
separate partner inventory. No deployment occurred. Full regressions, source
pins and publication identifiers follow after validation. Source/query review
findings from subagents were retained, but usage limits prevented a fresh
independent final review of this completed API patch; primary-agent review and
tests must not be labelled an additional independent audit.

## Final validation and publication

Draft PR #53, code `b1404074efb8ebab624386356a3c35a94682fa14`, branch
`security/account-creation-row-evidence`, stacked on PR #52 docs `0d925e2`.
Final full app: 1,207/1,207 across 59 files (92.56 seconds), no failures, skips
or quarantine. Full TypeScript passes. Same-run serial tooling 446/446
(347.324 seconds), then separate receipt assets 10/10 (0.396 seconds), 456 total,
pass. Combined handler/caller focused 94/94 pass (8.24 seconds). Lint: zero
errors, four retained `any` warnings; formatting/diff pass. No test, timeout,
constraint or quarantine was relaxed. Primary-agent final source review found
no additional defect; usage-limited subagents did not independently audit it.

| Artifact                                    | UTF-8 LF bytes | SHA256                                                             |
| ------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| `src/routes/api/admin/create-user.tsx`      |         16,174 | `b850709270a53e0a5a6025639f1bbedd4b233c2911923803608e9a4f830ec2a0` |
| `src/routes/api/admin/create-user.test.tsx` |         16,980 | `a5d796f18c172b237797189d3b880e35f7198f8c2c275290348c9fede20aeca0` |

PR #52 docs `0d925e2` has OCR/type/lint/Parts passed and build/unit running in
`38693190311`; its hosting failed separately. PR #53 code CI `38693453126`
is running; hosting `ca9b2edd-0b01-4958-8b33-13c3934b3df5` failed separately,
wrapper `38693453191` skipped migrations/production deployment. Later docs heads
require fresh checks. No live application calls, migration, deployment, production
mutation, paid provisioning or communication occurred for this API slice.

Next verify latest PR heads, construct the actual bounded partner wrapper and
map auth/profile/org/member dependencies before backend model/authority repair.
Keep the staff NULL/profile enum mismatch and separate Auth/PostgREST partial
steps as release blockers. Trusted original-actor/claim revision/common-writer
locks, offboarding/native/consent reconciliation, recovery and real HTTP/JWT/RLS/
session/concurrency/receipt/mobile/owner/full-media acceptance remain open.
Supabase safety guidance kept live inspection catalog-only and tests disposable;
neither returned-row evidence nor a passing build adopts production authority.
