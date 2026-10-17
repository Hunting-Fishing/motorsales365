# Retained expense and journal source rehearsal

Updated16 October2026. Same `completion/365-seven-day-integration` candidate and
draft [PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68).
Source `7804bd9892f01fbc279e214cae3407765a298d93`; evidence joins the same integrated
publication. New exact-head CI remains required. This is unchanged-source characterization, not a migration,
corrected financial writer, native authority proof or release acceptance.

Publication `de7152dfc0f88800abafd8738296b180c4b7546f` is verified on canonical
remote/same attached draft PR68, preserving title/base/main/history. All six
Actions gates pass; unit116959248579/run38896846951 confirms4,696/4,696 across
92 files (59.03s), zero unexpected/quarantined failures. Returned unit log is
truncated: final summaries/checker output present, early new fixture TAP not in
the returned tail; local12/12 and14/14 remain exact standalone counts. Actions
runtime deprecation warning retained. Native116959248633 is untruncated and
confirms Parts247/six quote groups/bounded synthetic restore/ACL/RLS/sequence/
late-failure rollback/cleanup; tiny65/81/208ms not RTO,47 replay failures remain.
Preview116959247789 confirms config skip/no upload; migrations/production/
Supabase Preview skip. Workers36043f9f-8aca-4bf2-a16b-2a4af5135aeb fails with
fresh cause unverified. No deployment/owner/live acceptance. Earlier pending
publication statements below are superseded by this checkpoint.

The next preparatory request/reported-result contract is implemented separately
at10d23d37, not an SQL command or durable ledger. Root36/36 combined contract/
retained SQL/CI guards pass; full binding closes the null/fallback description
collision but is still fabricable reported text. See `EXPENSE_OPERATION_CONTRACT.md`.
Continue the locked owner-only transaction/immutable ledger and real authority/
financial/recovery prerequisites, not repeat the completed fixture or contract.

## Execution and provenance boundary

`scripts/vehicle-receipts/expense-posting-fixture.mjs` creates only a fresh
in-memory PGlite instance, with no data directory, native process, hosted route,
credentials or Docker. It awaits and closes each database in `finally`.
Seven complete LF-normalized files and22 complete SQL selections are SHA256
pinned before execution. Historical migrations are not bulk-replayed; selected
native functions, table definitions, constraints and attachments are unchanged.
Exact whole-file/span hashes and line endpoints live beside their extraction
specifications. Fixture LF SHA256:
`98db65cfe826651d234367e9fae9c3222a294010d99bbd8a6876fc880fc6d2d1`;
test LF SHA256:
`a313320c150f928e95f048f8a04cdd0f36f8caa35d566d9df179bded607183a1`.

The explicit support schema/seed identities and Auth GUC/module/manager helpers
are synthetic. `SET LOCAL ROLE` runs inside real PGlite BEGIN/COMMIT/ROLLBACK,
not real Supabase JWT/session/tenant verification. Only support selections from
the older receipt fixture are used; its unscaled synthetic expense table is not.

| Retained source                                                                      | Complete selected behavior                                                                                      |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql:3-6`                        | ID-only current-shop resolver, not trusted original-human/team authority                                        |
| `20260714032507_f944b167-9bbe-4f1b-a49b-48dec9a68a68.sql:29-87`                      | Expense/category native DDL, NUMERIC(14,2), category FK, grants/RLS and both touch attachments                  |
| `20260714034131_1bed039d-569f-4b91-8f56-bf19451a7786.sql:2,47-49`                    | Expense receipt_url column and latest retained touch function/search_path                                       |
| `20260714040242_e2995194-583b-4ca7-9f5e-a8456e9af42f.sql:49-109`                     | Three GL tables, native FKs/CHECKs/ACL/RLS/indexes                                                              |
| `20260715015208_d62496ef-e67e-4f61-a395-604bfd5749dc.sql:2-29,53-114,252-289`        | Journal source columns/unique index, get/create account, journal posting, AFTER INSERT expense posting          |
| `20261014043336_vehicle_receipts_shared_history.sql:5-7,26-40,61-71,427-448,522-530` | Receipt DDL, shop_access, record_expense/public wrapper, expense vehicle/receipt links and actual binding guard |

No sm_fill_shop_id implementation/attachment is fabricated. The retained private
legacy receipt-URL rejection attaches to service records, not expenses, and is
not borrowed. Only selected original GL policies are loaded; the later August
generic ACL/RLS sweep/current applied catalog is not composed or claimed. No
expense UPDATE/DELETE journal reversal is invented. Missing retained evidence
does not prove absence of an attachment in production. Storage/private objects,
receipt-client RLS, unrelated posting/install/history writers and full baseline
are excluded.

## Actual local results

First serial fixture execution passed12/12, zero failures/skips/cancels/todos,
12,218.2491ms. After CI wiring, the same fixture plus the existing native CI
guards passed14/14, zero failures/skips/cancels/todos,8,841.9631ms:

```text
node --test --test-concurrency=1 scripts/vehicle-receipts/expense-posting-fixture.test.mjs scripts/ci/native-commerce-ci.test.mjs
```

Node syntax, Prettier, full ESLint on the three changed/new JS files and diff
checks pass. Frozen independent source/fixture review and separate CI-wiring
review retain the boundary above. No Windows full suite rerun, normal-timeout
change, removed assertion or quarantine change. The explicit single-worker
memory-only step runs without skip/continue-on-error and is checked by the
existing CI guard. All six application jobs, native PG17/Parts/quote/recovery
coverage and timeouts remain unchanged.
After source commit7804bd98, diff-aware lint againstef1cb798 reports zero errors,
zero warnings and zero retained findings across the three JS files. All214
Git/source/output public copies and Worker/backend/OCR/PDF/server boundaries
verify again at that exact source; no app or artifact upload occurs.

| Observed selected-source case                                     | SQL-persisted result, not a desired product policy                                                                                                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmed PHP receipt250                                          | Expense250.00/tax0.00/default recorded/creator; balanced expense debit/Cash credit; journal creator NULL                                                                                |
| Fractional receipt12.345                                          | Expense and journal12.35, not equality to unscaled receipt total                                                                                                                        |
| Existing mismatched expense17.89/tax2.01/date/description/creator | Same expense UUID, timestamp touched, stored fields and19.90 journal unchanged; no repost/reconciliation                                                                                |
| Privileged synthetic binding drift before repeat                  | Actual conflict UPDATE still reaches receipt/vehicle binding guard; P0001, snapshot unchanged                                                                                           |
| Status/payment selection                                          | Only exact unpaid chooses AP; default/other status chooses Cash; posting includes tax                                                                                                   |
| Zero receipt                                                      | Real expense UUID, no journal/accounts                                                                                                                                                  |
| Existing journal source key with changed/unbalanced payload       | Existing journal ID returned without new payload validation; not a durable operation receipt                                                                                            |
| NaN                                                               | Receipt CHECK rejects23514; direct expense admits native NaN and selected posting creates NaN journal lines                                                                             |
| Missing purchase date                                             | Genuine NOT NULL23502, no persisted expense/journal effects                                                                                                                             |
| Late second-line fault                                            | Synthetic hook observes expense/header/firstline/two accounts, then invalid account reaches real FK23503; rollback restores full snapshot and leaves zero expense/journal/line/accounts |

The late fault is explicitly a synthetic test hook, not retained production
behavior. Neither native account FK is removed or disabled; no custom exception
replaces the actual failing FK. Snapshots preserve SQL numeric text and selected
data/catalog/settings. These tests are not current production findings, native
independent-session/concurrency evidence or a financial policy decision.

## Published parent and next exact-head acceptance

Expense-read source `1953f58084eedafa8d5ab920bf3d880865971a5d` was published with
evidence at `ef1cb798151106ae963c3f251d04f95550774dad`, canonical remote/same draft
PR68, preserving title/base/main/history. All six Actions gates pass at ef1cb798
(run38892723856). Completed unit116945850260 confirms4,696/4,696 application
tests across92 files,61.59s, zero unexpected/quarantined failures. The overall
log is truncated, with full final summaries/checker output present.
Native116945850239 confirms PostgreSQL17.11/server170011, Parts247/six quote
groups and bounded synthetic data/catalog/ACL/RLS/sequence/offline-source
restore/late-failure rollback/cleanup. Tiny dump67ms/restore86ms/verify206ms is
not production RTO. The47 replay failures remain.

Preview116945850534/run38892723960 is a confirmed configuration skip/no upload.
Migrations/production/Supabase Preview skip. Independent Workers check116945888252,
build7522b11b-0909-430e-bc7f-50cbb5b32c36, fails; fresh cause is unverified.
No native app migration, upload, live database/Auth/Storage write or deployment.
Parent success does not transfer to the new fixture head; read its actual checks.

The app/public/SQL/package/Worker source is unchanged by this fixture slice.
Existing complete local build/TypeScript and214 tracked Git/source/output public
copies, motorsales365/index.mjs/sole365 backend/15 OCR/202 PDF/server boundary
checks are retained, not a new live release or full artifact recovery proof.

Next dependency: a locked, unconnected expense/journal transaction candidate
with exact money, explicit target/creator/shop binding, immutable payload-bound
durable operation receipt, conflict refusal, late failure and retry/reopen
reconciliation. Validate original-human/fresh native role/tenant authority,
current selected schema/ACL/trigger parity and competing manual/receipt writers
before connecting. Cash/AP/tax/zero and edits/deletes/reversal semantics need
explicit closure; do not overwrite legacy conflicts or silently invent policy.
Full baseline404/423 correspondence/47 replay failures, real API/Auth/private
original recovery, safe101+ receipt review/edit, owner pilot and release gates
remain open. Target22 October21:00 Asia/Manila and17 October feasibility review
remain; no completion guarantee or scope cut. QA handoff is unchanged and not
re-asked. Providers remain inactive, approved restrictions preserved.
