# Selected stock writer frontier and stopped catalog prerequisite

17 October 2026, Asia/Manila. Same integrated candidate/draft PR68. Commit subject
`Pin selected stock writer frontier without advancing catalog acceptance`;
exact commit/publication and new-head checks go in its PR evidence comment.

## Implemented independent source dependency

`buildStockWriterFrontier()` accepts no arguments and performs only fixed local
source reads. Eleven application/authority files and eleven complete retained
SQL files are pinned by LF byte length and SHA256. Inclusive selected spans have
separate SHA256 pins. Ten unique writer-family rows return detached, deeply
frozen source witnesses and explicit unresolved gaps; import is inert and creates
no SQL engine, client, process, network request or migration.

The fixed inventory distinguishes `public.business_inventory_items` from
`shop_manager.inventory_items`. They are separate stock domains; neither the
source inventory nor the earlier public mixed-stock rehearsal proves they are
synchronized. The actual inquiry/reservation names are `network_part_inquiries`
and `parts_reservations`; native counter lines are `counter_sale_lines`.

| Selected family                                        | Source-backed remaining dependency                                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public direct stock edits/adjust/delete                | Absolute on-hand/hold/on-order edits and separate movement/read/update; error/affected-row and prior-business binding gaps.                              |
| Inquiry lifecycle/reserve/release                      | App still calls retained public writer, not private corrected candidate; direct status updates and fresh UUID/manual retry lack durable outcome lookup.  |
| B2B shipment/receive/return/exception/install/warranty | Selected acceptance/cancellation proof does not cover all branches, caller-order multi-item locks, missing destination-row phantoms or durable retries.  |
| Public invoice stock                                   | Separate raw on-hand precheck and insert/update/delete triggers deduct/restore independently of mixed holds.                                             |
| Native manual adjustment                               | Cached quantity, transaction insert and absolute inventory update are separate browser requests.                                                         |
| Native counter sale                                    | Register/stock writer plus cost/role text patches; applied body, all-writer ordering, native authority and durable operation identity remain unverified. |
| Native purchase-order receiving                        | Independent item quantities then order status; source does not establish atomic stock posting or partial/unknown-outcome reconciliation.                 |
| Native invoice stock/journal                           | Integer casts/clamps and indirect journal helpers require current correspondence, stock/reversal and recovery proof.                                     |
| Canonical inventory identity                           | Identity/permission changes must share compatible stock/financial/claim/offboarding ordering.                                                            |
| Demo reset/deletion cascades                           | Maintenance deletes/recreates both domains; no authority to execute it or infer recovery from retained source.                                           |

All seven flags remain FALSE: current catalog parity, all-writer compatibility,
native authority, durable outcome reconciliation, global no-oversell,
application adoption readiness and release readiness. This is a selected fixed
inventory, not an AST/exhaustive deployed/external/dynamic writer audit. The
native invoice UI/journal implementation and wider dependency closure are not
silently counted as pinned by the22-source frontier.

Seven source-frontier top-level tests pass in both root combined trials. They
cover exact whole/span/metadata pins, unique complete evidence, source-backed
gap phrases, two domains/false flags, no options, deep freezing/detachment and
inert builtin-only import. The combined22-check runs are NOT green: the separate
catalog scanner fails as recorded below. The source-only mandatory serialized,
non-quarantined CI step is new; existing six jobs/25-minute budgets/quarantine/
native PG17/adversarial/transaction coverage are unchanged. Own-head CI is not
inherited from the parent. Root format/lint/CI wiring/review results are recorded
with publication; no unchanged app/native rehearsal is repeated.

Final independent source-only validation (after formatting and its new CI wiring):
`node --test --test-concurrency=1 scripts/parts-stock/writer-frontier.test.mjs scripts/ci/native-commerce-ci.test.mjs`
passes9/9 in217.8239ms, zero failures/skips/cancellations. Node syntax, changed-script
ESLint0 and independent source/CI review pass. This command does NOT run the
stopped catalog scanner or its runtime test.

Frozen LF source pins:

| File                                           | Bytes | SHA256                                                             |
| ---------------------------------------------- | ----: | ------------------------------------------------------------------ |
| `scripts/parts-stock/writer-frontier.mjs`      | 14313 | `f910b3e05cf317582ea06bb6fd4a109229b1aba36208e14d871a4cebaf176276` |
| `scripts/parts-stock/writer-frontier.test.mjs` |  9083 | `1cd1a93de90673059fd62916957c4cff79c310b4094b4681c68af4fb628436ac` |
| `.github/workflows/ci.yml`                     | 30008 | `82e0133046bc9a2d6128066125728a79c9b33d64740083ad2acbd54653401d8d` |
| `scripts/ci/native-commerce-ci.test.mjs`       | 15353 | `1c43481a4340284d6c9567f58aa28faecb562f284db9c3c7077f2e3bdee7acea` |

## Catalog action STOPPED; no hosted capture

This is the original source-only publication checkpoint. Subsequent direct owner
authorization resumed the fixed lexical repair, now passing16/16 with ONE actual
read-only capture; see [the current catalog prerequisite](STOCK_WRITER_CATALOG_PREREQUISITE.md).
The original failure/consumed alternative below is preserved, not an active stop
after that explicit resumption. No automatic unchanged retry occurred.

The proposed local `stock-writer-catalog-review.sql` is one fixed pg_catalog-only
SELECT over29 requested relations/33 function-name families and three fixed
roles, returning bounded fingerprints/effective privileges, never application,
Auth or Storage rows/raw bodies/configuration/helper execution. It has NOT been
executed against hosted365, and is not included in this source-only publication.
Its static/runtime files remain local for a later explicitly resumed review.

Initial root run:21/22 checks pass in1.5608798s, one static scanner failure. The
scanner treats SQL `IS DISTINCT FROM true` as a relation read. ONE test-only
correction masks precisely that Boolean comparison, retaining negative controls
rejecting real `FROM true`/`FROM false` and all app/helper/private-file ingress.
Alternative run:21/22 pass in1.5171016s; the scanner now rejects SQL `SELECT (`
syntax. The SQL source is byte-unchanged and the alternative is CONSUMED.

All five isolated PGlite subtests pass in each run: selected missing-object
metadata; global column-cap suppression; global definition-byte refusal;
missing-reader refusal; and an attached foreign-schema function whose source
stays private. This is synthetic query execution, NOT hosted catalog acceptance,
native authority or permission to bypass the failed safety gate.

STOP recorded01:00UTC. Owner notified once and asked asynchronously for direction
to resume a reviewed SQL-token/parser repair. No second correction, unchanged
rerun, another connector/capture mechanism or hosted query is authorized while
stopped. Proposed unpublished catalog CI was not admitted; the independent
source-only step preserves all already-required coverage. Current catalog and
dependent compatible transaction work are delayed, worsening an already at-risk
22 October target. No smaller scope is silently accepted.

Stopped local file pins (preserve, do not admit or retry unchanged): SQL27546LF
bytes/c604084f3ebf5f7daa851bff12671ae29f8ece4f7a6525272205a931b480c292;
static test15280LF bytes/7159992f32e6f03b7633bfce9f971f93667e052b572d377e8185b7ef2387fbef;
runtime test6371LF bytes/1acf2e8d82ed4ed1d39c8f993423f74a6e119a2f7d36b1fa6c5ade75514108d6.

## Closed parent and next dependency

Parent53c01904ff945f3842e9d0125b250219736a9ac8 completes all six Actions38986941600.
Actual unit117260493854 reports5,036/96 files70.13s, zero unexpected/quarantined
failures; returned log is truncated with final summaries. Its already-verified
untruncated native PG17.11 stock8/retained21/Parts247/quote6/cleanup, current2,609-
object artifact and Preview configuration skip are retained, not repeated or
inherited by this slice. Production/migrations stay skipped; hosting STOP persists.

Next: resume catalog scanner only on changed owner direction/source/config/access;
then one reviewed sole365 read-only capture and actual schema/ACL/body
correspondence. Implement compatible atomic stock/multi-item/phantom/deadlock
protocols and durable operation reconciliation across the exposed writer
families, with strict original-human/session/native membership/tenant/revocation
and TTL plus real API/private Storage/whole recovery before grants/app/UI.
Native Auth upstream recovery and QA/hosting stops are unchanged. All18 workflows
plus N1–N3,47 replay failures/12 historical/five unapplied/two recorded envelopes,
device/owner/main/live gates and22 October risk remain.

No existing app, SQL writer, migration, dependency, grants, user/account, hosted
row/configuration, Buddy/366 project, main, deployment or provider activation
changes. Supabase least-privilege and PostgreSQL consistent lock-order guidance
informed the explicit two-domain/all-writer/authority boundary; source metadata
does not authorize changing current permissions or clamping stock to pass tests.
