# Unconnected receipt-expense operation contract

16 October2026, same integrated candidate/draft PR #68. This preparatory offline
contract is not imported by the application, an SQL command or a migration. It
does not create an expense, journal, operation ledger, hosted resource or live
session. Source `10d23d37a26fe475046c5b77ac1281dd2f1dd922`; evidence/publication
joins this integrated slice. Published50baa80a now passes all six Actions gates;
application4,696/92 files92.72s, zero unexpected/quarantined failures (truncated
unit log with final summaries). Its bounded native Parts/quote/restore passes,
47 replay failures, Preview config skip/no upload and separate Workers failure
do not establish release acceptance. New transaction candidatef7632817 is
documented in `EXPENSE_OPERATION_TRANSACTION_CANDIDATE.md`; do not describe
it as an accepted atomic writer.

## Intent and reported result

The initial CREATE-only contract captures an explicit original expected account,
shop, shop vehicle, receipt and client operation UUID, with version/action,
currency, exact decimal text, purchase date, vendor and modeled payment intent.
Owned enumerable data fields are copied into a detached immutable intent;
missing/extra/accessor/prototype/symbol/non-JSON scalar shapes are refused with
generic errors that do not echo private inputs. Fixed-order full-payload binding
includes the account/operation key. It is not a cryptographic hash, capability,
authentication decision, database dedupe or persisted operation receipt.

No money passes through Number/parseFloat/rounding or numeric-or-zero coercion.
Positive finite exact cents are admitted; zero, negative, fractional cents,
special values and exponent notation are unsupported by this initial cohort.
Retained NUMERIC(14,2) and receipt-total bounds are distinct. The selected receipt
DDL bounds total to99999999 and vendor to200 PostgreSQL characters; valid Unicode,
null versus empty vendor and exact description mapping are retained. Any caller
resource budget is separate from those native constraints. Dates support a
canonical finite AD0001..9999 initial cohort with actual calendar validation,
not JS Date parsing or a claim of complete native DATE compatibility.

Modeled recorded/Cash versus unpaid/AP intent describes the retained trigger
mapping for tests; it is not an owner-approved accounting policy. The receipt-total
path currently models tax0.00 only. Zero/nonzero tax, other currencies/dates,
manual expenses, edits/deletes and reversal remain required product work, not
silently removed scope or a justification for connecting the candidate.

A reported result must echo the full normalized key/payload binding, bind the
same operation/account/shop/vehicle/receipt and
match reported expense identity, creator, exact amount/tax/date/description/
status, journal source/identity/shop/date/status and both ordered account lines.
Native numeric text may be normalized without loss, never rounded. A bare UUID,
source-key reuse, mismatched amount/scope or reported incomplete posting is not
admitted as success. Retained journal creator NULL is distinguished from the
expense creator; no human journal attribution is invented.
The full binding is necessary even when projected values coincide: null vendor
and the literal fallback vendor produce the same coalesced expense description,
but remain distinct captured requests. Matching text is still untrusted reported
data, not a cryptographic receipt or an independently protected ledger.

This validates only a reported DTO. Even a perfectly forged matching result can
pass a pure validator. It does not independently prove committed SQL state,
authority, current catalog, an immutable outcome ledger, recovery or a safe retry.
The existing connected legacy RPC, writer bodies and UI remain unchanged.

## Validation and next dependency

Root serial execution passed36/36, zero fail/skip/cancel/todo,8,905.9787ms:
22 pure contract tests,12 unchanged retained posting SQL cases and2 CI guards.

```text
node --test --test-concurrency=1 scripts/vehicle-receipts/expense-posting-fixture.test.mjs scripts/vehicle-receipts/expense-operation-contract.test.mjs scripts/ci/native-commerce-ci.test.mjs
```

Syntax/Prettier/full ESLint on the three changed/new JS files, diff checks and
independent frozen source/CI/evidence review pass. Changed-line lint after source
commit againstde7152df reports zero errors/warnings/retained findings. Root read
the full source/tests and the repair before execution. Review caught the missing
full-binding/null-vendor collision before the first runtime test; it was repaired
without removing existing cases. Tests also explicitly demonstrate that changing
fabricated binding text can fabricate a matching report, not independent truth.
No full Windows suite rerun, normal-timeout change or quarantine change. The new
unconditional offline contract step and literal command guard retain all six
jobs/native PG17/Parts/quote/recovery/cleanup/timeouts/prior suites.

Final LF SHA256: source
`ff8be156674f9968151dfe6c1988edea0648b108a7d2addcbfdf2c40ebed0454`;
test `48ac366854510398349da1613a6dabdf7e49b74bbbf914edc1912bd279fcf02d`.
The app/public/SQL/package/Worker and previously pinned fixture source is
unchanged.214 Git/source/output copies and Worker motorsales365/index.mjs/
sole365 backend/15 OCR/202 PDF/no browser-engine server boundary checks rerun at
10d23d37. This is retained unchanged app build/TypeScript evidence, not a newly
deployed artifact or full recovery proof; new-head CI must run independently.

Published parent `de7152dfc0f88800abafd8738296b180c4b7546f` passes all six Actions
gates, run38896846951. Completed unit116959248579 confirms4,696/4,696 application
tests across92 files,59.03s, zero unexpected/quarantined failures. Its log is
truncated; final summaries/checker output are present, but the early new posting
fixture TAP counts are not in the returned tail. Local fixture12/12 and CI guards
14/14 remain the exact standalone count evidence. A nonblocking Actions annotation
warns that checkout/setup-node/upload-artifact v4 target deprecated Node20 and
are forced to Actions runtime24; application Node22 setup remains pinned. No
runtime/action upgrade is made or claimed by this slice.

Untruncated native116959248633 confirms PostgreSQL17.11/server170011, Parts247,
six quote groups and bounded synthetic data/catalog/ACL/RLS/sequence/offline-source
restore/late-failure rollback/cleanup; tiny65/81/208ms is not production RTO.
The47 replay failures remain. Untruncated Preview116959247789/run38896846832
confirms DEPLOY_VIA_ACTIONS configuration skip/no upload; migrations/production/
Supabase Preview skip. Independent Workers116959291373, build
36043f9f-8aca-4bf2-a16b-2a4af5135aeb, fails with fresh cause unverified. No new
head/owner/live acceptance, app migration, upload or deployment follows.

Next: implement a locked, unapplied owner-only receipt CREATE transaction against
the pinned posting fixture, never adopt a legacy conflicting expense or separately
repost after its AFTER INSERT trigger. Verify the new expense and journal before
atomically writing an immutable payload-bound operation receipt. Reopen/retry must
revalidate the same payload and current actor/authority, not return a source-key
UUID blindly. A security-invoker RPC must not be made functional by granting
clients operation-ledger DML; that would permit forged committed acknowledgments.

Connection requires trusted original-human/fresh session/role/tenant and shop
authority, protected ledger/writer boundaries, current schema/ACL/trigger parity,
all competing writers, independent-session/concurrency and late-failure tests,
approved financial semantics and recovery. Synthetic helpers/memory models are
not real Auth/API/private-storage or production-safe restore acceptance. Whole
baseline404/423 correspondence/47 replay failures, safe101+ receipt review/edit,
QA/pilot/owner and release gates remain. No Docker/live SQL/Auth/Storage write,
paid provisioning, provider activation, communications or deployment.

Primary function privilege guidance:
[Supabase database functions](https://supabase.com/docs/guides/database/functions).
