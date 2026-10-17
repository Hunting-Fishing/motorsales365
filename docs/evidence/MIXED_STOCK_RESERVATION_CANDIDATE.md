# Private mixed inquiry and B2B reservation mechanics

17 October 2026, Asia/Manila. Same integrated candidate/draft PR68, commit subject
`Prepare private mixed stock reservation correction`; exact commit/publication
in the PR evidence comment. No application, migration, grant or live activation.

Follow-on [native-source/B2B composition](MIXED_STOCK_NATIVE_SOURCE.md) now
preserves this original fixture/candidate/test exactly. Root6/6 parity2.1367703s
and13/13 actual retained writer sequential SQL10.8898883s pass. Native mixed-stock
independent sessions, current catalog/all-writer/native authority/TTL/durable
outcome/full recovery and application connection remain open; no native process
ran and this candidate stays private/unapplied.

Source4050ec27de26564af807a2d3eace898ac2556e36 is published same draft PR68/comment
6226237118, exact remote/body/title/base/draft/main retained. Parentc59 all six
38976025387 Actions now pass; actual unit1172255607745,036/96 files103.47s zero
unexpected/quarantined failures (truncated/final summaries), including18 actual
detail tests. Hold cleared without cancellation. Own405 all six38978627414
Actions now pass; actual unit1172339677465,036/96 files64.75s zero unexpected/
quarantined failures (returned log truncated/final summaries). Early memory16
step transcript is clipped, not separately observed Linux16 from status/local16.
Actual own native117233967523 is untruncated: PG17.11/Parts247/quote6/all21 exact
ordered expense/draft/Auth-user markers/terminators/EXIT+always-cleanup, complete
vector equals admitted frozen21 whose source is unchanged. This is NOT native
stock SQL execution. Selected68/88/225ms not full/RTO;47 failures remain. Actual
build final214media/15OCR/202PDF/server-boundary/Worker+sole365/dry-run summaries
verified (truncated/final summaries); COMPLETE CI merge062cdfd18b0a3c121ab4535cb501d7c3a5c949ee
equals candidate treeb0d4759428b6031fa422c77264f16b3ed665042b/2,599 current objects
0missing, not history recovery. Actual untruncated Preview117233967617 skips
configuration/no upload, production/migrations/Supabase Preview skip.
Workers117234010767
fails cause unverified, hosting STOP unchanged. Production/migrations/Supabase
Preview skip. Read-back notes join next implementation, no docs-only restart.

## Actual retained-source defect and selected correction

The retained `20260709033911_3dc415e7-4ec3-47e8-bafa-e2dc520d5f34.sql`
`reserve_network_inquiry` locks an inquiry then its inventory item but sums only
other active inquiry holds. The later
`20260831041834_associate_parts_order_lifecycle.sql` creates Parts reservations;
its `active_reservation_qty` includes both families. The old inquiry body can
admit5 against stock10 with an8-unit B2B hold, producing combined13. This is
reproduced selected SQL, NOT an observation of hosted behavior. Historical
migrations/functions are unchanged and must not be replayed as a repair.

The new `scripts/parts-stock/mixed-reservation-candidate.sql` creates one private
`mixed_reservation_candidate.reserve_inquiry(uuid,uuid,uuid,uuid,numeric,integer,text)`
SECURITY INVOKER function. PUBLIC/anon/authenticated/service schema/function
privileges are withheld and publication ACL checks reject nonowner grantees.
Owner/superuser/inherited capabilities and owner DDL still exist; this is not an
authority boundary. No API/app connection or existing writer replacement.

Mechanics: validate exact intended actor/business/inquiry/item/quantity/hours;
inquiry→bound inventory row locks; reread after possible inventory waits;
sum both active families, excluding only this inquiry; do not double-count the
derived qty_on_hold or clamp inconsistent availability. Preserve actual source
inquiry accepted/unexpired and B2B unreleased/unfulfilled plus unexpired OR
picking/ready predicates. Conservative unexpired cancelled/received holds remain
counted as in source, not silently freed. NUMERIC(12,2) assignment is checked
against exact requested NUMERIC, rejecting unsupported precision/range and
nonfinite/nonpositive values rather than rounding. Only seven intended response/
hold fields change on the matching inquiry. Compare RETURNING, persisted row,
inventory and combined total before returning a statement acknowledgment.
Generic diagnostics preserve SQLSTATE without private detail/hint.

## Pinned selected fixture and real test execution

Fixture imports12 whole SHA256-LF-pinned retained files and41 exact SQL spans.
It installs12 complete retained tables plus one synthetic Auth id table (13
total),28 actual inline FKs, physical CHECKs,
indices/sequence, inventory/inquiry alterations and actual response-stamp trigger.
Business/catalog/location/shop/work-order FK targets are complete retained DDL,
not dropped constraints or invented stock/business/order tables. Only Auth
id-only table/uid/test.user and manager owner-lookup support are synthetic.
All ordinary positive grants/policies are withheld; table RLS is enabled.
Listed selected declarations/alterations do NOT represent complete later/current
catalog, all triggers/constraints/policies/writers or the managed Auth baseline.

Root actual serialized command:
`node --test --test-concurrency=1 scripts/parts-stock/mixed-reservation-candidate.test.mjs`.
16/16 top-level groups pass in14,666.0125ms, zero fail/skip/cancel. Actual memory
SQL covers the legacy13 repro/correct reject5-allow2, self-only exclusion/another
same-business hold, nine B2B/seven inquiry lifecycle cohorts, decimal/scientific
NUMERIC/native precision/range/nonfinite rejection, wrong binding/account/hour
limits, ordinary/service denial, malformed holds/inconsistent stock refusal,
real post-UPDATE movement FK23503, suppressed/rewritten acknowledgments,
inventory side effects and outer rollback. Complete selected data/catalog/
settings/sequence snapshots compare, not only totals. One review-driven test-only
correction normalizes only the seven intended fields and independently checks
persisted responded_at; no failed SQL trial or candidate change occurred.

Frozen SHA256-LF:

| Source                               |  Bytes | SHA256                                                           |
| ------------------------------------ | -----: | ---------------------------------------------------------------- |
| mixed-reservation-fixture.mjs        | 18,979 | 6e628a528fbe23496b2b8cb7e2b0b0590aec7299fc0b6b5ca4fee833b983fd13 |
| mixed-reservation-candidate.sql      |  9,942 | 80dfd6a15e15ca404ece0cb77402d3fa3280da767d5f19a1cca9e3b16436332f |
| mixed-reservation-candidate.test.mjs | 21,827 | 78451f5aba2894782a99b44780d09ee4eeffc8addb3ed0031d970decc5c5181e |

Root adds a mandatory, unique, unconditional, serialized non-quarantined CI step
and parsed-YAML exact command tuple. Wiring2/2 passes93.3995ms, changed-script
ESLint0 findings, syntax/format/diff and independent read-only review pass.
Normal25-minute job timeout, quarantine and all native/adversarial/transaction
coverage remain unchanged. A reviewer capacity failure used ONE available
independent read-only reviewer alternative successfully; no repeated model retry
or bypass. Same-PR publication followed c59 unit completion, no cancellation.
Own-head required CI is separate and does not imply new native mixed-hold proof.

## Limits, impact and next dependency

No native PostgreSQL mixed-hold independent-session rehearsal ran. PGlite is
sequential and memory-only, always closed; owner/GUC positives are NOT real Auth,
original-human/fresh-session/native-shop membership or least-privilege acceptance.
Statement acknowledgment is NOT durable operation/replay/unknown-outcome proof.
Expiry uses retained transaction-time semantics, not configured TTL/revocation
policy acceptance. Existing direct/legacy writers and phantom/race/global lock
ordering remain open; `adjustBusinessInventory` still separates movement/read/
update. No global no-oversell, complete atomic stock or consumer-order claim.

Next: exact own-head CI, then actual native PG17 independent-session inquiry/B2B
wait/commit/rollback/recheck/mixed-writer proof, current-catalog/all-writer and
native authority composition, durable operation outcome/reconciliation and full
recovery before connection. N1/N2 store-split consumer stock/order/outbox and
N3 signed Buddy integration remain separate, not completed by B2B mechanics.

Supabase current changelog/relevant PG17.11/TLS/Data API notices and current RLS
docs were reviewed; Postgres least-privilege/consistent-lock guidance informs
private INVOKER scope and explicit all-writer frontier. No production extension
scan, upgrade, hosted query/mutation, new service, grant or provider activation.
Sites informed the already published adjacent UI labels, not stock authority.
OpenAI Docs keeps the existing follow-up updated in place, not duplicated.

Parentc59 Add Part source has actual18/18 DOM30.97s/full normal TypeScript/lint/
format/review, all six own Actions pass; actual unit5,036/96 files103.47s zero
unexpected/quarantined failures (truncated/final summaries). Its actual
untruncated nativePG17.11/Parts247/quote6/
retained21 expense markers/cleanup and build/full current2,594-object artifact
are separately verified, not execution of this new stock candidate. Actual
Preview skipped/no upload. All18+N1–N3/47 replay failures/12 historical/five
unapplied/two recorded classifications, Auth-source/QA/hosting STOPs, whole
baseline/private-object/config recovery/device/owner/main/live gates remain.
Day2 atomic-stock milestone and22 October21:00 target remain at risk, not a
verified forecast or permission to reduce scope. No Docker, paid resources,
user-data deletion, customer outreach, Buddy/366 mutation, main push or deployment.
