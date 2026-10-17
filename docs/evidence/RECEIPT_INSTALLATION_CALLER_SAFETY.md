# Receipt installation caller and acknowledgment safety

## Publication

Canonical remote and the same attached draft PR #68 verify published head
`0b836b1582afce33e88164a3821c8fa5e6c6918c`. Title/base/draft and main `70ab892a`
are preserved; the updated PR body retains all prior evidence. Final-head 214
public Git/source/output copies and Worker/backend/OCR/PDF/server checks pass.

Run `38873619165`: build/typecheck/lint/browser OCR/native Parts pass; unit
`116883321839` remains in progress at capture. Completed untruncated native
`116883321961` confirms PGDG17.11, actual server170011, Parts247/247, all six
independent-session quote groups, both server stops/scoped cleanup and 47 retained
replay failures. This is selected synthetic SQL, not whole baseline/API/Auth/
private-Storage/restore acceptance. Wrapper `38873619168` preview `116883322027`
is a confirmed DEPLOY_VIA_ACTIONS configuration skip, not application upload;
migrations/production/Supabase Preview skip. Independent Workers build
`abd7d11d-0509-4ec3-ba24-e540f18060e2` fails with ID/link only; fresh cause and
source-freeze execution remain unverified. No CI CLI/API fallback was used.

These follow-up publication notes join the next integrated source slice without
a docs-only CI restart. Verify remaining unit result, then implement the bounded
synthetic second-cluster PG17 recovery dependency below, without dropping real
API/private-object/role or broader receipt/commercial scope. No new acceptance,
live action, deployment, approval or scope reduction follows from publication.

## Scope and status

C1.06 source `ee9af3a8ff67d2bef9577ca8cb833fc94a98bde1`, 16 October 2026, same
integrated candidate and [draft PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68).
Publication evidence is recorded separately from source verification.
No SQL, native permissions, migration, live business data or deployment changes.
The existing discard interlock, other receipt handlers and editor remain intact.

The old installation request contained only item/date/odometer, and the dialog
treated any resolved response as "Installation recorded". The replacement captures
account, receipt, item, exactly one selected owner-vehicle/shop-vehicle target,
date and nullable integer odometer. It rejects malformed/extra/accessor fields
and validates every acknowledgment field against immutable captured intent.

The unchanged same-client caller guard verifies the middleware caller/request.
Fixed child `id,receipt_id` and parent `id,vehicle_id,shop_vehicle_id` preflight
reads bind the item, receipt and selected target. Shop mode requires the exact
selected `shop_vehicle_id`, not merely visibility via a linked public vehicle.
Owner mode matches `vehicle_id`; a retained receipt may legitimately have both
foreign keys, but the request must choose one target. Builders receive the
request signal and explicit `retry(false)`; context is fenced around construction,
awaits, parsing and return. There is one fixed existing installation RPC with
its three legacy arguments and no privileged fallback.

Both retained native installation functions return `void` in
`supabase/migrations/20261014043336_vehicle_receipts_shared_history.sql`.
The installed PostgREST 2.106.2 `PostgrestBuilder.processResponse` initializes
`error`/`data` to null and retains null data for an empty successful body. Only
own `error === null` and `data === null` are accepted; undefined, arbitrary data,
raw envelopes and errors are not success. The typed result echoes checked
captured intent. This is a **transport acknowledgment**, not persisted installation,
history synchronization, native-shop authority or durable retry proof.

The SDK's default retries apply to idempotent requests, not ordinary POST RPCs.
Explicit `retry(false)` removes read retry ambiguity; it is not evidence that
this installation POST previously retried automatically. Abort forwarding does
not prove cancellation or rollback inside the database.

## Panel behavior

The parent retains receipt/item/selected-target dialog intent and synchronously
admits at most one installation attempt per mounted scope. A fresh matching
receipt/item witness is required at dispatch, including confirmed/write/reviewed/
uninstalled eligibility. Ordinary receipt refresh/paging can preserve entered
date/odometer without turning an old launch closure into current permission.

Dialog-session and committed account/target/Auth/unmount lifetimes fence stale
callbacks. Dispatched rejected/malformed/aborted/closed-pending outcomes retain
a conservative mounted uncertainty hold, including close/reopen and ordinary
refetch/paging. No automatic retry, false removal or rollback claim follows.
True unmount/reload is not durable reconciliation.

Checked current acknowledgments use neutral feedback asking the operator to
refresh vehicle history, not "Installation recorded". Receipt/history invalidation
and close/error callbacks must belong to the current attempt/session. Generic
failure copy excludes provider/database detail. Purchase never means installation.

## Verification and release limitations

The initial combined run passed 1,703/1,705; two new panel harness cases failed.
The refresh test checked DOM state before QueryObserver notification and now
awaits observable disabled rendering; the separate raw exact-tick cache guard
remains. React suppresses delegated events during mutation, so the StrictMode
case now invokes the actual installed source handler at connected content commit.
That rerun passed 1,704/1,705 but did not abort the admitted request. Radix mounts
portal content after wrapper replay; the production cleanup boundary
was moved into the actual dialog content. Named regression 1/1 then passes
(1.62s total), retaining one admitted request, actual forwarded-signal abort,
mounted hold, no redispatch and no late feedback. This is a synthetic source-handler
injection, not an ordinary browser click during React's event-disabled phase.
No timeout, quarantine or assertion was weakened. Prior 179 panel cases remain
an exact LF prefix; protected workflows are byte-identical. Independent final
read-only review is clear. Final source LF64,051B SHA-256
`c2eb1cc9708596453d05501ad0e5523566c8a53504063b66d8ec46c629e0bc4d`;
test LF152,233B SHA-256
`388bf07e3962b1574c4f12dc166eb0a3481b629dc65227292fe018f7358b2082`.

Final combined focused tests pass **1,705/1,705 across 13 suites**, 32.14s.
The 247 new cases comprise 101 pure-contract, 110 actual-handler and 36 panel
cases; the panel totals 215. Earlier isolated handler/helper run passed 595/595
in 3.45s. New helper coverage is explicit and unconditional in existing CI, not
quarantined. Offline wiring guards pass 2/2 (111.52ms). Final source/test/CI
Prettier and diff checks pass. Final full TypeScript passes. Changed-line lint
against published parent `15743f05` has zero new errors or warnings across eight
JS/TS files, with six retained findings elsewhere. Fresh complete build exits
successfully with retained route-test/module/chunk/Wrangler warnings. At source
`ee9af3a8`, all 214 tracked public Git/source/output copies, Worker
`motorsales365`/`index.mjs`, canonical backend, 15 OCR and 202 PDF assets and
browser-engine/server separation verify. Same-PR publication joins C1.05 source
`5ede72c6` and its evidence `c872a4be`; new exact-head CI is separate and must be
read after push. No application upload/deployment or live operation occurred.
Normal timeouts and
quarantine remain unchanged; no Windows full-suite rerun is claimed.

The child/parent preflights and RPC are separate operations. Concurrent relation,
role, ownership, consent or installation changes still need native transaction
binding and actual independent-session acceptance. The retained native item lock
and already-installed rejection cannot identify whether a prior lost request
succeeded. Durable operation identity, exact persisted installation/history
evidence, correction/removal/replacement, ownership/consent and recovery remain
unfinished release gates. Synthetic source checks do not close real API/Auth/
private-storage/transaction/restore, owner or live acceptance.

Next independent receipt dependency is read-only complete-line viewing for
101+ lines, without promoting a partial row into editor/sharing completeness or
weakening the retained 100-line replacement-write guard. Independent atomic
sharing and durable discard/financial recovery remain separately open. Preserve
the no-Docker directive, sole canonical backend, existing approved restrictions
and owner-completed QA credential/Terms/native pilot handoff.

## Completed exact-head application checks

Published `0b836b1582afce33e88164a3821c8fa5e6c6918c` now has all six Actions
gates passing in run `38873619165`. Completed unit `116883321839` reports
application 4,170/4,170 across 87 files (69.56s), zero unexpected/quarantined
failures. Its overall log is truncated but final Vitest/checker summaries are
present. This closes the previously pending CI result, not native atomic
installation, real-role/history/owner or live acceptance. The prepared QA signup
remains unsubmitted at the new read-only check: credential/contact fields blank,
Terms unchecked; no form changes, identity reset or privilege grant occurred.

## Shared release dependency after this slice

A bounded read-only environment check finds Node but no PATH-resolved PostgreSQL,
`pg_dump`, `pg_restore`, PostgREST or GoTrue; no software/service is installed or
started. Existing native PG17 runs on the ephemeral Linux Actions host. There is
still no complete Docker-free real API/Auth/private-Storage/restore runner, and
47 retained migration replay failures prevent assuming a clean application
baseline. Existing synthetic platform stubs are not real API/Auth acceptance.

The next safe executable shared dependency is a synthetic dump into a second
fresh, private PG17 cluster followed by restore/data/constraint/ACL/sequence and
measured-recovery verification on that existing host. Preserve sanitized routing,
identity-checked scoped cleanup and all adversarial coverage. This would advance
partial database recovery only; it must not be called whole application or live
private-file recovery. Precreate/recover synthetic role definitions explicitly:
[`pg_dump` does not include cluster-wide roles](https://www.postgresql.org/docs/17/backup-dump.html),
and restored ownership/grants require those roles. Do not strip ACLs/owners and
then claim they were recovered. Pinned real Auth/PostgREST/Storage services, actual platform
migrations, private original-byte/configuration backup/restore and least-privilege
pilot/session acceptance remain separate. No new resource/cost or production
operation is authorized. Carry these exact gaps into the 17 October feasibility
review rather than repeating a hosted-project or Docker setup question.
