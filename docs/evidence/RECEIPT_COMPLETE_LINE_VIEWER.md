# C1.08: read-only complete-line receipt viewer

Updated 16 October 2026. Source `c8beede8e20257c48e8c68b8f51b6d47511184c8`, same
integrated candidate and draft PR #68. This slice
implements viewing beyond the parent's first100 lines, not editing a large
receipt or proving an atomic, complete multi-page snapshot.

## Connected source and preserved boundaries

`src/lib/vehicle-receipt-lines-contract.ts` supplies a separate strict display
request/window contract. The request captures account, receipt, exactly one
vehicle/shop target and page; own data properties are required, unknown fields,
accessors and inherited targets are refused. Windows use100 rows, exact visible
count, deterministic sort_order/UUID order, unique IDs and matching receipt IDs.
Unknown counts, lower API caps and contradictory window shapes fail closed.
Native retained field validation reuses the unchanged item parser, then strips
installation actor/origin metadata. The DTO contains no writable completeness,
eligibility or authority flag; it is never merged into the parent's receipt.

`getVehicleReceiptItemPage` uses the same captured middleware client and explicit
token lookup, no retry, request abort and context/parser/await denial checks. It
checks visible workspace/parent/active link before and after the item query.
Owner/direct selected-shop reads retain dual-bound receipt compatibility; an
indirect linked-owner-vehicle path additionally requires explicit sharing consent.
Observed link, target, consent or parent loss denies return. These separate reads
are not transactional native authority, strict revocation or original-human proof.

`vehicle-receipt-lines-dialog.tsx` is connected to the parent's incomplete-receipt
button. A selection is bound to exact account/target/receipt, parent data identity
and dataUpdateCount, parent page and a per-open lifetime. Committed parent read
loss, fresh same-object success, paging, close/reopen and account/target remount
destroy the old selection. The actual Radix content owns query/attempt cleanup;
per-mount/page-generation keys and synchronous navigation fences reject stale
handlers and ignored late outcomes. Fetching, paused, error and invalidated states
show no old private rows or false empty state. Manual retry and Previous remain
available where appropriate. Each page is explicitly labeled a read-time window;
records and counts may change between reads. No edit/share/install control exists
in this viewer.

Independent review verified all prior server handlers/shared helpers unchanged,
the protected `ReceiptEditor` through EOF unchanged, and all prior215 panel test
cases/assertions retained. Parent incomplete/edit/sharing flags,100-line
replacement writer, installation/expense uncertainty holds, discard interlock
and private original-file path are unchanged. No SQL/schema/migration, privilege,
Auth account, Storage object, provider, hosting or production change occurred.

## Verification and limits

Final combined focused **1,542/1,542 across18 suites**,35.42s, zero failures/skips.
This includes68 new contract,133 new handler and40 new UI cases (241 total), with
all existing485 handler and215 panel cases retained. Actual Dialog/QueryClient
tests reach line201 over three windows, handle count drift and empty later
windows, malformed envelopes, retry, invalidation/paused/error/fetching states,
same-tick old controls, parent/account/target/page transitions and late settlements.
The new StrictMode case proves pending-reader unmount fencing under StrictMode,
not an invented in-flight effect-replay result. Auth late resolve/reject and
parser traps remain synthetic; no actual API/Auth/RLS or private-byte proof.

Initial two-file run had683/685: two new fixtures incorrectly assumed real
`Headers` retained trailing whitespace and that a valid token first observed
after `getRequest` was an observed token change. Test-only repairs present raw
malformed header bytes, retain genuine post-capture change negatives and add a
positive first-observed valid-token case with exact same-client lookup argument.
Production caller policy and normal timeout/quarantine were not weakened.
The repaired two-file run passed686/686 (3.90s); UI-only255/255 passed (25.07s).
The combined run emitted two React act warnings in an existing paused expense
case; its assertions passed. These are disclosed, not suppressed or relabeled
as real browser/role acceptance.

Final eight-file Prettier/diff and independent frozen review pass. Full TypeScript
passes. Changed-line lint against `75974057` reports zero new errors/warnings and
six retained findings elsewhere across eight JS/TS files. Fresh complete build
exits0 with route-test/module-directive/chunk/Wrangler warnings; the verbose output
is truncated but completion/exit are captured. All214 tracked public Git/source/
output copies, Worker `motorsales365`/`index.mjs`, sole backend
`wjxaajgvddtrxxtocxen`,15 OCR and202 PDF assets, and browser-engine/server separation
verify. New exact published-head CI remains separate and required; source/build
verification alone is not deployment or owner acceptance.
No full Windows suite rerun, source-scanner timeout change or quarantine edit.

Frozen LF SHA-256 pins:

| File                                   | SHA-256                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| vehicle-receipt-lines-contract.ts      | aab7819a18563eb68670309bcd83efdc86a6af09369b1bfbcf10e2b408802f85 |
| vehicle-receipt-lines-contract.test.ts | d2ba8b551a0e3020a5df7cfd8f85b654114a14405844c769b09d4452ba73fc2d |
| vehicle-receipts.functions.ts          | aed8b2de58734f0f734d6bf62671bedce6d9fd06277bbf50f10805261fc80262 |
| vehicle-receipts.functions.test.ts     | 073b904256ee46bcc464752dfe92b92e15d2aabcc2d1f8d26f9e46bdade00ffe |
| vehicle-receipt-lines-dialog.tsx       | 730c47bc3086079701e465486e91a0238755cc30fa947d01feff7b9e48c57e68 |
| vehicle-receipt-lines-dialog.test.tsx  | f4c94d960b2b99ea1a6fec2cf0a8ce4ee6c9c655a60ee631bf7928745515f497 |
| vehicle-receipt-panel.tsx              | 7d0a7bb6284c91d50eadd680fc47f939c7ed1fda27b8aff92e12a204034fea95 |
| vehicle-receipt-panel.test.tsx         | 378174c81b76f9b93c38667f081be58da69e96590159f17d6459ae509b0abd95 |

## Remaining acceptance and next dependency

C1.08 read-only source is implemented; safe review/edit of101+ lines remains open.
Do not feed accumulated windows to the replace-all editor, infer full-set
completeness or remove the current writer limit. Native role/consent/session and
concurrent actual HTTP acceptance, durable atomic receipt writers, exact-money
financial reconciliation, original-byte recovery and QA/owner/live acceptance
remain separate gates. The dedicated QA session/native pilot are still unverified;
do not bypass the owner's credential/Terms handoff or re-ask unchanged email
nomination. No Docker or separate hosted backend is introduced.

Next: verify exact published-head CI, retain the successful bounded synthetic
PG17 recovery evidence, and advance whole-baseline/private-original/native
authority recovery and the separate safe full-line review/write contract. Continue
other independent atomic receipt/Shop Manager work without calling this viewer
a completed receipt workflow or reducing the22 October scope.
