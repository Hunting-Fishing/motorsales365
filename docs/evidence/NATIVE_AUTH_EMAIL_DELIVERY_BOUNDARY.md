# Native Auth email reservation and provider boundary

Source: `0271fc09e42adfc325e0893dcc52456b1611f5e3`, integration branch
`completion/365-seven-day-integration`, same draft PR #68. The new modules are
inactive and have no route, scheduler, database or default network transport.
They prepare private Auth delivery commands and compare acknowledgments; they do
not implement durable reservation, consent, queue processing or delivery.

## Implemented boundaries

`native-auth-email-reservation.server.ts` requires actual planner and provider
preparation instances from the same plan. Every recipient must be present exactly
once, including both secure email-change recipients. The immutable reservation
binds source kind, original event, subject, planner version, body/plan fingerprints
and every exact rendered provider body, request fingerprint and full send key.
Its original source-event key excludes planner/provider versions, so the future
database must not admit a replay as a new event after a version upgrade.

The queued-receipt comparison requires all matching immutable fields and every
recipient's matching request fingerprint/key. Queue IDs must be distinct canonical
positive decimal int64 strings; JavaScript numbers cannot acknowledge them. Extra,
missing, duplicate, accessor and conflicting fields fail closed. Oversized arrays
reject before element/descriptor enumeration. A matching caller-supplied receipt
is not storage evidence: the future trusted adapter must obtain it from a committed
canonical database transaction and reject SDK errors or uncertain responses.
This parser intentionally covers queued receipts only. Completed, suppressed or
expired replays need a separately reviewed durable replay acknowledgment; never
reset such outcomes to queued merely to satisfy this comparison.

`resend-auth-attempt.server.ts` prepares one recipient directly from the actual
Auth plan, not from a caller-supplied recipient. A narrow explicit sender policy
permits a plain mailbox under `365motorsales.com`; this validates the address
boundary, not domain ownership. HTML/text/subject and total encoded request bytes
are bounded. Preparation snapshots and freezes the exact body and deterministic
SHA-256 request fingerprint. The full stable delivery key is never truncated.

One attempt requires an explicit server-supplied key and injected transport. There
is no environment lookup, provider default, global fetch, internal retry or raw
logging. The fixed endpoint is `https://api.resend.com/emails`, POST only, with
redirects rejected, credentials omitted and caching disabled. The shared five
second deadline covers headers and all body reads, even when a transport ignores
abort. Late responses and incomplete streams receive best-effort cancellation
without extending that deadline. Body reads are capped at 4,096 bytes/4,097 reads,
with declared-length, UTF-8, content-type/encoding and exact acknowledgment checks.

Only HTTP 200 with the narrow sole UUID `id` acknowledgment returns
`provider_accepted`. Invalid/duplicate/extra acknowledgment fields, other statuses,
timeouts and transport failures return `outcome_unknown`, never delivery success.
Error bodies are not parsed or reflected. A numeric Retry-After hint is bounded
to 1–3,600 seconds for 429/503 only and does not authorize retry. The adapter never
acks or deletes a queue item. This conservative local response schema must pass
controlled provider compatibility tests before activation.

| State                | Required evidence and boundary                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queued`             | Exact complete recipient receipt from the future committed ingress transaction; local comparison alone proves nothing about storage.                  |
| `provider_accepted`  | Bounded valid provider HTTP acknowledgment; must still be persisted against the current attempt/fencing generation.                                   |
| `delivery_confirmed` | Future authenticated, schema-validated, deduplicated provider event correlated to the stored receipt/account. Neither new module produces this state. |
| `outcome_unknown`    | Timeout, transport/response ambiguity or failed durable acknowledgment; preserve identity and reconcile rather than blindly resend.                   |

## Existing queue and consent incompatibilities

The retained `20260510014232_email_infra.sql` has no original-event/recipient
reservation, request fingerprint, lease/fencing generation or provider receipt.
Its partial unique index covers `sent` rows only, after external effects.
`enqueue_email` accepts arbitrary JSON/queue names and recreates missing queues.
`read_email_batch` returns only `msg_id/read_ct/message`, not the `enqueued_at`
value used by the processor's fallback TTL. The processor does not check a false
delete result; DLQ movement also ignores that Boolean before separate logging.

Twelve historical enqueue sites across six producer migrations use
`{template,to,data}`, without a version, stable delivery identity, rendered body
or queued time. This is source evidence, not a claim that all twelve sites are
installed. The existing and PR #9 processors expect rendered payloads. Current
server enqueue uses separate pending-log/token/queue writes and discards the
queue ID. No legacy backlog was read, classified, drained, resent or deleted.

The current unsubscribe handler still consumes the token separately from writing
suppression. Its single reason row can overwrite a bounce/complaint with
unsubscribe. A future critical-Auth policy must preserve those stronger facts
independently and bind channel/purpose/consent revision. The previous acknowledgment
fix does not repair these transaction or dispatch boundaries.

## Required durable implementation and recovery

Use a new inactive native Auth outbox and fixed reference-only queue, inaccessible
to the legacy dispatcher. In one short ingress transaction, enforce uniqueness
on `(project_ref, source_kind, original_event_id)` independently of plan version,
compare immutable replay fields, reserve every recipient, persist restricted
payload bytes/key/fingerprint and server-owned creation/expiry policy, enqueue
exactly one reference per recipient and record every queue ID. Any failure must
roll back the complete fanout. Ambiguous ingress acknowledgment is resolved with
the same reservation, never a new event/delivery identity.

A separate short worker-claim transaction must check expiry/current recipient
suppression, then issue attempt identity, lease and fencing generation. HTTP runs
outside the database transaction. Completion must condition updates on project,
delivery, request fingerprint, attempt and fencing generation, recording the
outcome and queue disposition together. A stale worker cannot overwrite a newer
outcome. One accepted secure-change recipient must not be reset when the other
fails. PGMQ visibility alone is not a provider-effect lease or fencing authority.

The provider retains idempotency keys for 24 hours. Unknown outcomes need the
same payload/key/provider account inside a validated retry window; after expiry,
reconcile rather than blindly resend or switch providers. Keep short-lived Auth
payloads private and retain replay/outcome tombstones when sensitive bytes expire.
These are implementation requirements, not permission to purge existing data.
[Resend idempotency guidance](https://resend.com/docs/dashboard/emails/idempotency-keys).

Suppression writers and dispatch need a shared recipient authorization protocol.
Suppression can block subsequent authorized attempts but cannot recall an HTTP
request already in flight. Test same-event races, changed-content conflicts,
fanout rollback, lost acknowledgment replay, lease fencing, suppression races,
false queue deletion, partial secure-change recovery and payload expiration with
real isolated transactions before proposing activation.
[Supabase PGMQ semantics](https://supabase.com/docs/guides/queues/pgmq).

## Verification and release status

Focused tests pass 550/550 across five files (2.30 seconds): 112 new provider,
86 new reservation, 212 existing planner, 133 verifier and seven renderer tests.
The new tests use independent Node HMAC/hash, actual WebCrypto/verifier/planner,
native Request/Response/streams and injected fake transport. No provider was
contacted. Independent review found and corrected malformed UTF-8 classification
and oversized-array pre-enumeration before publication; no remaining finding.
Both new tests have an explicit never-quarantined CI step. Changed-line lint has
zero errors/warnings/pre-existing findings across five files against `52145a0a`;
targeted lint/format/diff checks pass.

Fresh source guards pass 103/103 (5.229 seconds); release/report/inventory/OCR/PDF
regressions pass 75/75 (9.046 seconds), no failures/skips/cancellations. Five
inventory tests overlap; these totals are not added into a unique count or the
older full SQL/tooling evidence. Fresh full application suite passes 2,043/2,043
across 72 files (152.91 seconds), zero failures/skips/quarantine, including all
198 new tests without double counting. Full TypeScript and the report checker
pass. Commands:
`npx tsc --noEmit -p tsconfig.json`,
`npx vitest run --maxWorkers=1 --reporter=default --reporter=json --outputFile=vitest-report.json`
and `node scripts/ci/check-vitest-results.mjs vitest-report.json scripts/ci/vitest-quarantine.json`.

Fresh complete-checkout `npm run build` passes at `0271fc09`. The subsequent
`node scripts/ci/verify-worker-bundle.mjs` and
`node scripts/ci/verify-release-assets.mjs` verify Worker name/entrypoint, sole 365
backend, all 15 OCR/202 PDF assets, no browser engine in the server package and
byte-exact Git/source/copied output for all 214 tracked public files. Build warnings
remain for skipped test routes, large chunks, module directives/unused upstream
imports and configuration/main overrides; this is local packaging, not whole
release attestation, upload, visual/runtime or owner acceptance.

At prior published `52145a0a`, all six CI gates passed (`38774110116`), including
unit, real-browser OCR and disposable Parts Postgres. An earlier unit-log
diagnostic HTTP 502 was transient; follow-up discovery confirmed success. Independent hosting
build `8acd0607-20da-4608-a980-8635015eb2bc` failed with only ID/link, no root-cause
text or annotations. Wrapper `38774110207` preview passed; migration/production
skipped. New publication requires its own exact-head checks.

Migration impact/deployment: none. No SQL/history repair, restriction replay,
live data/Auth write, hook/provider/sender setting, email send, paid resource,
upload, PR merge or duplicate automation. Source mapping stays 404/423 and typed
12 historical unresolved/five recorded-unapplied/two embedded executions; baseline,
replay, parity and release flags remain blocked. Sole hosted 365 backend and
approved restrictions are unchanged; 366 AI and Barangay Buddy are untouched.

## Next integrated work

Close actual durable ingress/worker/completion and consent transactions before
wiring any email route. Complete native action/callback cohorts, actual project/
hook-secret/sender/provider-account/Auth-setting ownership, controlled-recipient,
backlog and recovery acceptance. Enabling Send Email Hook displaces SMTP; no
cutover is authorized by these source tests.

Continue the newly enumerated Shop Manager financial actions and safe
acknowledgment/account-lifetime fixes alongside original-human/fresh authority,
native-team/claim/offboarding/private custody, real API/storage and recovery gates.
The local resource snapshot during this run was 0.90 GiB free of 15.71 GiB RAM;
no Docker daemon, image download or local Supabase stack was started. Source tests
do not replace independent-session/API/private-storage/transaction acceptance.
The seven-day target is unchanged and still needs the Day 2 feasibility review.

Supabase guidance informed queue isolation and transaction boundaries; the
documentation guidance keeps source tests separate from durable/live acceptance.
