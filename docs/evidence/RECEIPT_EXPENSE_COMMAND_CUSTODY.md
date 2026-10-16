# Receipt-expense command session custody

16 October 2026. Same integrated candidate and draft PR #68. Final source
`d4538923454e28ae0c2fd570b12dd6aa84141c47` follows initial source50cf029c with
the checked callable typing correction; neither interim commit was published
before local verification. This slice connects
an additional denial boundary to `recordVehicleReceiptExpense`; it does not
activate the private expense transaction candidate or establish native authority.

## Connected boundary

`captureNativeCommandCaller` is a separate mode of the existing request helper.
Only receipt expense recording adopts it. Reader compatibility remains unchanged;
the generated authentication middleware is not edited. Before `getRequest`, it
captures the existing middleware client, Auth methods and security claims. The
exact observed request bearer is passed to that captured client's `getClaims`,
then to its explicit `getUser`, within one shared 10-second wait/abort boundary.
Strict mode also checks a captured monotonic clock before the second lookup,
settlements and acceptance, so a delayed timer or wall-clock rollback cannot
widen the Auth wait. That budget ends at Auth acceptance; it is not a ten-second
business-command lifetime. Late resolutions and rejections are observed;
timing out does not cancel Auth's
network operation or revoke a session. The installed SDK may itself call
`getUser` inside `getClaims` for symmetric/no-key fallback: one explicit helper
call is not a guarantee of one Auth network request.

The middleware and reverified security tuples must agree: canonical subject and
session UUID, exact sole-365 issuer, authenticated role/audience, explicit false
anonymous flag, supported `aal1`/`aal2`, safe integer issue/expiry and optional
not-before seconds. Issue/not-before must not be in the future and expiry must
remain in the future. This does not impose an MFA policy or invent token-age
limits. The strict cohort has zero issue/not-before clock-skew allowance; signed
credential/provider compatibility still needs designated acceptance. Own
enumerable data fields are required; audience may be the exact
authenticated string or a strict singleton array. Original middleware field
values, array identity/content, optional-field presence, client/method/header/
signal identity and temporal validity are rechecked at existing checkpoints.
The current Auth user must also explicitly report `is_anonymous: false`.

Malformed/mismatching or changed evidence denies before target/RPC dispatch when
observed there. Expiry or mutation after RPC dispatch denies the acknowledgment,
not the transaction: its outcome is unknown, not rolled back. No automatic retry,
credential refresh, privileged fallback or additional write is introduced. The
retained `record_vehicle_receipt_expense` RPC and private SQL candidates remain
unchanged; their native authority/financial/durable-retry weaknesses are not fixed
by this caller check.

## Exact limits and remaining release gates

- This compares a security tuple, not original middleware token bytes. The
  generated middleware exposes neither an owned immutable ingress capability nor
  its exact bearer; same-tuple credential equivalence and mutable SDK global
  Data API authorization remain outside this proof.
- Signed-claim verification and a current user lookup are not strict logout,
  session termination, configured inactivity/time-box, fresh membership/role or
  transaction-time native-shop authorization. Nonanonymous is not proof of a
  physical human. No user/app metadata grants authority here.
- Root's bounded read-only system-catalog query on the sole 365 hosted project
  observed PostgreSQL `170006`, `auth.sessions` with UUID id/user_id and nullable
  not_after/refreshed_at, and table SELECT false for anon/authenticated/service_role.
  No Auth/session rows, identifiers, counts or secrets were read. No permission
  was added. Native CI uses PG17.11; that is not hosted-version parity acceptance.
  [Supabase sessions guidance](https://supabase.com/docs/guides/auth/sessions)
  distinguishes JWT validity, session-row termination and non-proactive expiry.
- Trusted original-caller/session/native membership, complete catalog/baseline,
  all-writer/account-phantom/financial/recovery/API/private-original/owner/live
  gates remain open. The full platform staff/claim foundation has not yet been
  composed with the business-staff-to-native bridge; its separate reduced-support
  fixture is not that composition or positive authority.

## Verification and release status

Final focused helper/actual-handler/expense-contract verification passes978/978
across4 files in12.65s (`--maxWorkers=1`, no timeouts/quarantine relaxed). Full
normal `tsc --noEmit` passes; four-file ESLint has zero errors and2 unchanged
legacy any warnings, changed-line lint has zero errors/warnings and2 retained
findings. Formatting, diff checks and root/independent frozen review pass.
The first977-test run had2 incorrect BEFORE-verify request fixture expectations:
request evidence is first captured at verify, unlike middleware context captured
earlier. Those fixtures were corrected and an explicit same-tuple/different-token
positive control added; pending/after-observation denial tests remain. The final
runtime rerun includes the subsequent callable alias fix for TypeScript TS18046;
original method identity/receiver/token remain pinned. No runtime check is
represented by static parsing, and no result is inferred from the parent.
Tests use the actual helper/handler and synthetic SDK responses; no real JWT,
Auth endpoint, session-row lookup, RLS, private storage or accounting write occurs.

Final SHA256 pins (LF source bytes):

- native-request-caller.server.ts:
  `8345b4311def2f61dbacb016b5206887b41e77ba830a2dd56bc853796f488a46`.
- native-command-caller.server.test.ts:
  `3c50f65ae36e75cf181037737372a7d757ac7fe6f9b46c25da0d86a8de9276b6`.
- vehicle-receipts.functions.ts:
  `e31f5ee8653b8d52391f037d9ce440aaf41a4bcc0a5acfb4e22754f9fe593b72`.
- vehicle-receipts.functions.test.ts:
  `c8bd6640511e05bb91d1af51e79b92a66da9490af9e97e567f9a63692572d51d`.

Atd4538923, all214 tracked release assets verify; the existing local output passes
Worker motorsales365/canonical365 backend,15 OCR/202 PDF and server-package engine
boundaries. This is not a fresh candidate build. A new local app build/full Windows
suite was not repeated (free memory observed1.36 then2.56GiB of15.71GiB); the new
published head still requires its own actual type/build/unit/native/browser checks.

Parent `0eae86921ecae9d819e6a7eae79ab3149271c16b` now passes all six Actions gates
in run38908883680, including unit116999369587: 4,696/4,696 across92 files,96.87s,
zero unexpected/quarantined failures. The returned unit log is truncated but its
final summaries are present. Native expense116999369392 already has the separate
untruncated server170011/ten ordered markers/cleanup proof; Parts247/quote/bounded
synthetic recovery pass and47 replay failures remain. Preview116999366702 confirms
config skip/no upload; production/migration/Supabase Preview skip. Workers
116999425502/buildf5173470-a650-49ae-9914-2dff972549b3 fails; fresh cause unverified.
New-head checks are independent and not yet claimed.

Migration impact: none. No migration, SQL candidate, grant, hosted setting/data,
package/dependency, provider adapter or generated middleware changes. No Docker,
new hosted project, upload, deployment, merge or change to main. The existing QA
signup was checked read-only at this checkpoint: it is still unsubmitted with
credentials/contact/Terms left to the owner; no dedicated session or native pilot
membership is verified and no repeated question was sent.

Next dependency: owned ingress plus strict session/native authority and bounded
full staff/claim/native bridge composition, followed by current-catalog/all-writer/
financial/recovery closure before private transaction activation. Independently,
safe101+ review/edit needs a draft-only existing-line operation preserving unseen
items and a locked legacy replace-all refusal; merely raising100 or adding more
viewer pages is unsafe. Target22 October remains at risk; Day2 review17 October
is retained without scope cuts or a completion guarantee.
