# Owned receipt-expense ingress and final SDK transport custody

17 October 2026, Asia/Manila. Same integrated candidate and draft PR68.
Connected source is a denial boundary, not completed financial/native authority,
strict session revocation, safe draft editing or production acceptance.

Source29172a0b6b5c34f6bd60e97992a6bf4f869fe2f5 follows parent0fbec296; publish
source/evidence together in same draft PR68. Required actual own-head CI results
are separate and must be read next; no inherited parent acceptance or release.

## Connected source

Only `recordVehicleReceiptExpense` adopts the new owned middleware. It captures
the original Request/Bearer before the first Auth await and constructs its own
ordinary SDK client. No generated Auth file, other receipt export/helper,
existing strict caller helper, package or lockfile is changed. Root compares all
14 non-expense exports/helpers and those preserved files against parent0fbec296.
All seven prior handler checkpoints, frozen selected account/receipt/shop-vehicle
intent, target/acknowledgment schemas, caller signal and `retry(false)` remain.
The handler no longer performs a second Auth verification after middleware.

The internally created client requires exact canonical `SUPABASE_URL` and a
bounded modern `sb_publishable_` `SUPABASE_PUBLISHABLE_KEY`; missing/legacy/secret/
foreign configuration fails closed, without reflecting credentials. No existing
key is copied or pinned in source. Value-free browser-key classification is not
proof of hosted server configuration; exact server settings/provider compatibility
remain a pre-activation acceptance gate, not an instruction to replace keys.

Initial `getClaims` plus the existing strict caller verification share one outer
monotonic10s Auth deadline. Private wrappers on this owned client's Auth methods
share its abort latch; they do not grant another10s or leave late work unobserved.
The installed SDK may call `getUser` inside `getClaims`: explicit mock calls are
not total network-request counts. Timeout/abort are not session termination.

A module-private WeakMap binds the opaque frozen capability to original request,
headers/reader/signal/Bearer, exact client/Auth/security-claim custody and captured
dispatch methods/transport metadata. TanStack legitimately shallow-merges context;
the outer merged object need not be the frozen source object, but its own data
members and opaque capability must be the exact captured identities. Fabricated,
copied or cross-request capabilities fail. Known-capability observed loss latches
permanently; restoring members/credentials does not revive it. Unobserved ABA is
not claimed. No exported trusted-client factory or arbitrary execution adapter.

Before constructing any target builder, the first valid assertion binds the
handler's frozen receipt ID once. Repeated same-ID checks are allowed; a different
ID/rebinding denies. This prevents a different valid receipt UUID reaching the
retained writer through the owned transport; it does not make the target/shop
preflight atomic with SQL.

Auth/client/REST transport identities, URLs/schema/header containers and known
method descriptors are captured before Auth awaits. Final fetch admits only:

- GET canonical Auth user/JWKS paths during Auth verification;
- GET public `vehicle_receipts`, exactly `id,shop_vehicle_id` for the bound ID;
- POST retained `record_vehicle_receipt_expense`, exactly one bound `_id`.

Final assembled Authorization/key must equal the original captured bytes, schema
headers are absent/public only, redirects error, cookies omitted and caller/
deadline cancellation retained. No Storage, foreign origin, refresh endpoint,
other RPC, privileged key or fallback. Dispatch uses detached validated URL and
method/body/header/signal snapshots, not a second mutable input read. Returned
redirect/non-Response/foreign-URL/errors are sanitized and custody rechecked.

This is not a sandbox against arbitrary malicious JavaScript/prototype/global
code. The actual installed SDK's known `client.rest`/fetch seams are included;
global all-writer and database authority are separate gates.

## Verification and limitations

Final seven-file focused run passes **1231/1231 in10.37s**, zero failures/skips:

```powershell
npx --no-install vitest run src/lib/receipt-command-ingress.server.test.ts src/lib/receipt-command-middleware.server.test.ts src/lib/vehicle-receipts.functions.test.ts src/lib/native-command-caller.server.test.ts src/lib/native-request-caller.server.test.ts src/lib/vehicle-receipt-expense-contract.test.ts src/lib/vehicle-receipt-read-contract.test.ts --maxWorkers=1
```

First run passed1222/1222 in47.04s. Independent final review then found the
mutable URL/init validate-to-use gap. The bounded snapshot repair and nine new
regressions are included in the1231 result, with a clear independent review.
Full normal `tsc --noEmit` initially found Authorization-nullability and SDK
generic diagnostics. One bounded safe repair explicitly narrows the already
validated header and names the public schema types; the ONE full compiler retry
passes. Final1231 rerun above includes that exact source. No any/suppression,
compiler flag or runtime security weakening. Full changed-file ESLint passes
zero errors/two retained legacy any warnings; formatting/diff checks and2/2
mandatory CI-command guards pass.214 tracked public assets remain verified.
This was new source, not repeated unchanged testing. Five initial prefer-const
lint findings were repaired with one safe lexical change; no lint rule relaxed.
Normal timeouts/quarantine/PG17/adversarial-role/transaction coverage are unchanged.
The mandatory standalone single-worker core/middleware CI step and exact-command
CI guard are added, not substituted for existing handler/caller/full-suite gates.

The new core tests exercise the actual helper and final guarded fetch with SDK
doubles, including original bytes, deadlines, drift, permanent denial, canonical
origin/schema/receipt/redirect policies and cancellation/late results. Separate
middleware tests exercise the actual core capability, adapter, installed TanStack
merge helper and expense handler, with SDK/fluent-query doubles. The retained
large handler suite explicitly uses a mocked session seam backed by the prior
strict caller helper; it is not represented as opaque-capability admission proof.

A bounded compatibility regression uses the actual installed Supabase client,
HS fallback and real PostgREST target/RPC builders with fake global HTTP only.
The fake endpoint accepts a synthetic JWT: this proves SDK/header/builder/transport
composition, NOT signature, a real Auth endpoint, session, role, SQL transaction
or private bytes. Real provider/session/native-role/API/device acceptance remains.

Parent0fbec296 all six Actions pass; actual unit4863/93 files100.43s, no unexpected/
quarantined failures (truncated log with summaries). Its actual native PG17
job117094365266 executes all18 ordered expense/draft-line proofs and cleanup;
see [native rehearsal](NATIVE_DRAFT_LINE_PG17_REHEARSAL.md). Neither parent result
is inherited by this new application source. Unchanged local121 tests were not
repeated. A fresh complete new-head build/type/full-unit/native/OCR result remains
separate; no older local output is called this candidate's build or deployed.
No fresh local app build/full Windows suite is attempted with observed1.2–3.5GiB
free physical memory of15.7GiB; use the actual new Linux gates, preserving normal
coverage/limits and avoiding concurrent memory-heavy runs. This is an explicit
validation limit, not a pass or permission to use an old artifact.

## LF source pins

| File                                        | SHA256                                                             |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `receipt-command-ingress.server.ts`         | `0552cf1570fbe987c9d8ce3faea223672a9e9599750164b1dbc9abf7859091c5` |
| `receipt-command-ingress.server.test.ts`    | `f280b9365fa19448972780ea5ebb6a6b672df030cdadf1c96e0145ac8a9b2568` |
| `receipt-command-middleware.server.ts`      | `27dbe63e93638434bf7663160f6a671a7957e0ab703ee2a9debaa9e65050d362` |
| `receipt-command-middleware.server.test.ts` | `7bf2342b0699c86ba2970411250969297111012caf4c75116e760fd20998a621` |
| `vehicle-receipts.functions.ts`             | `49c0ae73897e39c02640363e8c0c609f1824f7db4f5a6a3b07c756adbc9e9f07` |
| `vehicle-receipts.functions.test.ts`        | `148d1540550315eecab5d78c7ffb6c9c75144f6aefbce45b274ba36577b3a333` |
| `.github/workflows/ci.yml`                  | `69aae6e4084315b39b79d54a2700dc7b29734a186806c54f4986d0a751923272` |
| `scripts/ci/native-commerce-ci.test.mjs`    | `edf364923aca3cc9ebd630a54a8a6cc3d3023ad049a78b9e5d38c57943bfd242` |

The six TypeScript paths are under `src/lib/`. Pins are source correspondence,
not authentication, complete artifact provenance or permission to deploy.

## Impact and next dependency

No SQL/fixture/candidate/migration/grant/live query/write, account, Terms, email/
provider activation, paid resource, Docker, deployment, main or Buddy change.
Preserve existing restrictions and private unapplied candidate grants. Unknown
post-RPC outcomes remain unknown, not rolled back or automatically retried.

Original-token custody does not prove a physical human, strict `auth.sessions`
termination/inactivity/time-box, fresh native shop/team/role/tenant authority or
transaction-time authorization. No user-editable metadata grants access. Next
close those gates with complete current catalog/all-writer/account-phantom/
financial policy and durable operation/reopen reconciliation, followed by real
API/private-original/full recovery/pilot/device/owner acceptance before activation.
C1.04/C1.07/C1.08/R2/R3 remain incomplete;47 replay/12 historical/five unapplied/
two recorded provenance classifications and22 October risk remain. Hosting/QA
actions stay stopped until their recorded new-evidence/access conditions change.

Supabase security guidance informed ordinary publishable-client separation and
the explicit limit that verified claims/current user are not strict revocation:
[getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims),
[getUser](https://supabase.com/docs/reference/javascript/auth-getuser),
[API keys](https://supabase.com/docs/guides/getting-started/api-keys).
