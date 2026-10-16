# Private receipt expense transaction candidate

16 October 2026. Source `f763281703205283be215203645d2a08dc28f1a4`, same integrated
branch/draft PR #68. This is an **unapplied laboratory candidate**, not a connected
application writer, migration, approved accounting policy or production release.
Publication and exact-head CI must be verified separately.

Publication92d05890 is now verified on the canonical remote/same draft PR; all six
Actions pass, application4,696/92 files93.50s, zero unexpected/quarantined failures
(truncated unit log/final summaries). Bounded native Parts/quote/recovery and
cleanup pass,47 replay failures remain; Preview config skip/no upload, Workers
failure fresh cause unverified. Next harness source7d866ce0 is implemented with
root104/104 offline/model cases, not yet actual native execution; details and
exact next action: `NATIVE_EXPENSE_PG17_REHEARSAL.md`. No connection or live change.

## Implemented boundary

`scripts/vehicle-receipts/expense-operation-candidate.sql` creates a new private
schema atomically, with no silent adoption of an existing schema. All four
functions are SECURITY INVOKER with a fixed pg_catalog/pg_temp search path.
PUBLIC/anon/authenticated/service_role receive no schema, function or ledger
access. Catalog publication checks refuse unexpected default grantees. The
outcome table has forced RLS, no client policies, four real FKs, a request-key PK
and unique receipt. UPDATE/DELETE/TRUNCATE guards include no-op updates.

Positive calls are explicitly schema-owner laboratory calls with synthetic
test.user/Auth and module/manager support. A nonsuperuser owner may be denied by
forced RLS; no bypass or grant is added to make it work. Owner INSERT/DDL,
superusers and inherited owner capabilities are not an external tamper-proof
trust boundary. This does not establish original-human/fresh-session/native-shop
authority or protected production ledger custody.

The command independently validates the complete normalized CREATE intent and
fixed-order JSON binding, including null/empty/fallback vendor distinctions.
It locks receipt, customer and vehicle, rereads intent/scope after waits, and
refuses any legacy expense without the same committed request outcome. One
expense INSERT invokes the retained AFTER INSERT posting once; it never calls
legacy record_expense or separately reposts the journal.

Exact persisted expense, one source journal and two ordered, balanced account
lines are verified before recording the full payload/binding/acknowledgment in
the same transaction. INSERT RETURNING and final ledger/financial rereads are
checked. Replay reauthorizes/rechecks current source and financial state and
returns the identical saved result without UPDATE, timestamp touch or repost.
Changed requests, scope, amounts, dates, journal/account state and ambiguous
existing account codes are refused, not overwritten or silently adopted.

Financial verification takes expense, journal, UUID-ordered existing line and
referenced-account row locks and rereads after waits. Other writers do not yet
share this protocol. Native chart_of_accounts has no UNIQUE(shop_id,code): row
locks are not phantom prevention or all-writer/concurrency/deadlock acceptance.
The returned SQL result is not an external COMMIT/HTTP/durability promise.

Initial positive exact-cent PHP/tax-zero/finite-date/Cash-or-AP cohorts remain
model limits, not adopted policy or scope cuts. Zero/nonzero tax, other currency,
manual expenses, edits/deletes/reversal and competing legacy writers remain
required financial work before connection.

## Root validation

Frozen SQL LF SHA256:
`ddea3f2c59cc8ec385c6273d700ea4a8ee2a010eeac14c3f6475cd3f7b3c1368`.
Frozen test LF SHA256:
`d6e7756fc234b559a4842435a8d379cfa21f01c5c464751e3913904b2d97fd87`.
Existing contract, seven source files/22 selections and retained fixture remain
byte-identical. Two independent full frozen reviews and root full-file review
preceded serial execution.

Standalone candidate: **20/20**, zero fail/skip/cancel/todo,23,723.6691ms.
Combined candidate20 + pure contract22 + retained posting12 + CI guards2:
**56/56**, zero fail/skip/cancel/todo,32,361.0453ms.

```text
node --test --test-concurrency=1 scripts/vehicle-receipts/expense-posting-fixture.test.mjs scripts/vehicle-receipts/expense-operation-contract.test.mjs scripts/vehicle-receipts/expense-operation-candidate.test.mjs scripts/ci/native-commerce-ci.test.mjs
```

Cases cover actual ordinary-role ACL denial, modeled Cash/AP, exact raw SQL to
ledger equality and separately normalized JS acknowledgment, escaping/Unicode,
sequential replay, full-binding collision, legacy nonadoption, malformed intent,
NULL-helper fail-closed behavior, source/financial drift and duplicate accounts.
Genuine account FK23503 occurs after expense/header/first line; genuine outcome
journal FK23503 occurs after completed financial posting. Both restore complete
selected base data/catalog/settings plus outcome data, candidate table/RLS/FKs/
triggers, namespace/function ownership/ACL/definitions/config and policy snapshots.
A synthetic late unique23505 fault also rolls back new posting/outcome effects;
it is not an independent-session race. No source constraints are disabled for
positive cases. The deliberate owner DDL bypass is a negative trust-limit case.

Review repaired nullable permission predicates and raw-versus-normalized native
numeric zero comparisons before execution. Syntax/Prettier/full changed-file
ESLint/diff pass; changed-line lint against50baa80a has zero errors, warnings or
retained findings. The new explicit single-worker CI step is never quarantined;
six jobs, PG17/Parts/quote/recovery coverage and normal timeouts are preserved.
No full Windows suite rerun or timeout/quarantine relaxation.

Atf7632817,214 tracked/source/output media copies and Worker motorsales365/
index.mjs/sole365 backend/15 OCR/202 PDF/server-boundary guards pass. App/public/
packages/Worker/supabase migrations are unchanged; no new app build/TypeScript
run is claimed locally. No Docker, hosted SQL/Auth/Storage mutation, provider
activation, communications, upload or deployment.

## Published parent and exact next dependency

Published parent50baa80a passes all six Actions gates in run38900373011.
Completed unit116970847389 confirms application4,696/4,696 across92 files,
92.72s, zero unexpected/quarantined failures. Its returned log is truncated but
final summaries/checker output are present. Actions v4 runtime deprecation
warning remains; app Node22 remains pinned.

Native116970847559 confirms PG17.11/server170011, Parts247/six quote groups and
bounded synthetic restore/data/catalog/ACL/RLS/sequence/late-failure rollback/
cleanup; tiny60/474/235ms is not production RTO.47 replay failures remain.
Preview116970846507/run38900372888 confirms configuration skip/no upload;
migrations/production/Supabase Preview skip. Separate Workers116971172693,
builda249a034-73b5-4a3b-8599-c9f057057ca7, fails with fresh cause unverified.
No parent pass is borrowed for this candidate or live acceptance.

Next: Docker-free native PG17 independent sessions with observed lock barriers,
same/different request retries, outer COMMIT/ROLLBACK visibility, late actual FK
failure and post-wait drift checks. Preserve the private owner-only boundary.
Then close current catalog/baseline, trusted human/session/shop authority,
all-writer/phantom/financial policy and complete API/Auth/private-original/restore
gates before any app connection. The sole hosted365 project remains unchanged.
404/423 correspondence,12 historical/5 unapplied/2 envelope records and47 replay
failures are not full release proof. Safe101+ receipt review/edit, QA signup,
synthetic native pilot membership, owner acceptance and deployment/live gates
remain open.22 October is at risk, not a verified forecast;17 October feasibility
review remains required, with no silent scope cuts or repeated setup questions.

Least-privilege review followed
[Supabase function privileges](https://supabase.com/docs/guides/database/functions)
and [PostgreSQL17 locking](https://www.postgresql.org/docs/17/explicit-locking.html).
