# Receipt read contracts

## Mixed-consent follow-up and integrated candidate

Source `1a49acc58355f48a1f0d2cd365d21e62ecb98418` adds an interim receipt-level
sharing interlock on top of signing source `39a1ab1e`. Both sharing controls are
disabled for a complete receipt with mixed per-item public preferences, and both
event handlers independently refuse that operation. Detection uses the full
returned item set, not category-filtered displayed lines. A visible notice says
the individual choices are preserved and an independent control is still needed.
Homogeneous, zero-item and incomplete-item behavior remains unchanged.

The retained SQL locks the parent then sets every item's public preference to one
boolean. The interlock prevents that lossy dispatch from an observed mixed UI
snapshot; it does not change SQL, eliminate concurrent/direct callers, bind a
mutation acknowledgment or establish independent atomic sharing. This is an
explicit temporary safety restriction, not completion or removal of C1.03.

Final combined source run: **1,180/1,180 across 11 suites in 24.98s**, with normal
timeouts and one threaded worker. Panel coverage is 124: all 109 prior cases plus
15 appended cases covering both mixed orders, three filters, raw disabled-control
events, homogeneous/empty intent and incomplete cohorts. Root comparison verifies
the complete prior 93,298-byte LF test file is an exact prefix (SHA-256
`730af5a880c8c27c60acc252abb1591f0cb5a1d6e09acf19e93b379d79acd10a`). Independent
review confirms the only source additions are the helper, sharing predicates and
notice; opener/editor/install/expense/paging/lifetime and server/DTO blocks are
unchanged from `39a1ab1e`. Agent lint has zero errors/five retained warnings;
format and diff checks pass. Final full TypeScript passes at `1a49acc5`;
seven-file changed-line lint against `7f2fcd4c` has zero new errors/warnings and
eight retained findings. Fresh complete `npm run build` passes at `1a49acc5`, with
retained route-test/module/chunk/Wrangler warnings. All **214 tracked public
Git/source/output copies** verify. Worker `motorsales365/index.mjs` binds only the
canonical 365 backend, with 15 same-origin OCR/202 PDF assets and no browser engine
in its server package. Only the five owned documentation files remain dirty after
packaging. Publication/exact-head checks are recorded separately; no upload,
SQL, migration, grant or live operation is included.

## Private attachment reader follow up

The private receipt-link reader now requires a captured account and receipt ID,
uses the unchanged current-caller denial helper and reads only the selected
`id,file_path` through the middleware client. Own successful SDK evidence and an
exact matching receipt are required before signing its DB key; there is no
privileged fallback or requirement that the reader be the original uploader.

Signing source: `39a1ab1e4320ca55df3be284bba098fc78cdc700`, same integrated branch
and draft PR #68. No SQL, migration or production change is included.

The signer requests the existing 300-second TTL in the fixed private bucket. A
10-second monotonic wait discards overdue, aborted or caller-lost results and
observes both late settlements. The installed Storage SDK exposes no per-call
abort/retry for this operation: waiting is bounded, token minting is not canceled.
Returned URLs must match the canonical 365 origin, signed-object route, bucket,
exact encoded key and one opaque token. Errors expose no path, bearer or provider
cause. The UI adds only the captured account to its existing request; its opener
lifetimes and all editor, installation, paging and unknown-write state remain.

Operational bounds are 1,024 characters for a structurally safe relative key and
8,192 for a canonical URL. Empty/dot segments, controls, backslashes and percent/
query/fragment characters in retained keys are unavailable under this policy,
not rewritten or deleted. Generated keys fit; broader retained-key compatibility
still needs real Storage acceptance. This is not a new database key invariant.

Initial helper/UI run 193/193 passes; connected four-suite run 563/563 passes in
16.95s (helper 84, handler 262 including 149 retained, panel 109 including 107
retained, and DTO 108). Final signing integration passes **1,165/1,165 across 11
suites in 34.84s**, with normal timeouts and a single threaded worker. Full
TypeScript passes after a type-only `single()` fluent-builder declaration repair;
runtime statements are unchanged by that repair. Seven-file changed-line lint
against `7f2fcd4c` reports zero new errors/warnings and eight retained findings.
Prettier and diff checks pass. Independent review is clear after correcting a
test-only final-parser trap to prove it executes. No timeout, quarantine or
assertion coverage is weakened. The existing unconditional receipt CI step now
includes the signing helper suite and retains its literal offline guard (2/2).
The fresh integrated build and asset/Worker checks pass at follow-up source
`1a49acc5` above; final publication is recorded separately.

Root comparison confirms all thirteen other exported server blocks are
byte-identical to `7f2fcd4c` after LF normalization. At signing source `39a1ab1e`,
normalizing the one added opener account field reproduces the entire prior panel
(SHA-256 `af2a811e9591e57e02286cf67bdaf5d8aea978280273a0e1c45f4a555b540fb4`).
Editor, installation and prior unknown-write handling are not replaced.

A read-only browser check found signup still unsubmitted: credential/contact
fields blank and Terms unchecked. No values, credentials, signup submission,
personal/staff identity change or native-shop grant is included. These synthetic
tests do not establish live RLS/Storage authority, a valid signature, actual
expiry, object contents, immediate revocation, strict session/native authority or
restore acceptance. Existing signed URLs are not revoked by this change; see
[Supabase private Storage signing](https://supabase.com/docs/guides/storage/serving/downloads).
No SQL/migration/grant/deployment/provider activation/customer send/Docker use.

## Scope and safety

The integrated receipt and shop-connection readers bind each request to the
expected authenticated account and selected vehicle. They use the existing
middleware client and current-record caller denial helper; no privileged fallback,
SQL, grant, migration or production change is included. This is an additional
denial boundary, not original-human, strict session-revocation or native-shop
authority acceptance.

Receipt headers use a fixed projection, ordered by creation time and ID, in
25-record pages. Shop connections use 100-record pages ordered by shop vehicle ID.
Both requests require exact visible counts and matching page-window lengths. A
missing count or lower API row cap fails closed rather than presenting a complete
snapshot. Offset pages can change as records are inserted or removed; they are not
an immutable or exhaustive history export.

Each displayed receipt has a separate ordered item read with an exact visible
count and a 100-line display limit. At most four child reads run concurrently;
failure stops admission of additional work. An incomplete set is labeled and
cannot open the replacement editor or change summary sharing. More-than-100-line
receipts still need a full-line viewer/editor acceptance path; this display limit
does not remove them from the agreed scope. Existing open editors, installation
dialogs and uncertain-write holds remain mounted across ordinary page changes.

Returned fields, IDs, parent and target bindings, duplicates, booleans and counts
are validated without entry-schema trimming or defaulting of retained rows.
Dual vehicle IDs and linked owner/shop visibility are preserved. Attachment
evidence must contain exactly one own boolean per displayed receipt: missing
access evidence is unavailable, not a false upload flag. The final visibility
check and separate reads are not one atomic database snapshot.

The editor is offered only for complete drafts whose entry fields are compatible
without transformations and whose installation/public-summary metadata is empty.
Empty interrupted drafts intentionally retain the existing first-blank-line
recovery. The unchanged save writer still regenerates item IDs and normalizes
sort order; this is not lossless identity preservation or durable retry proof.
Receipt totals no longer receive the UI's three-decimal locale rounding.

Native text and date cohorts are retained; finite numeric values are those already
parsed by the SDK, not original PostgreSQL NUMERIC lexical bytes. Row/concurrency
bounds do not establish a byte-bounded HTTP response or bounded legacy text size.
Request signals and disabled retries are forwarded, without claiming server/SQL
cancellation or revocation of existing signed URLs.

## Verification and publication

Source commit: `f50aaa0dca4863e3074f39df9950a0ac4c75d7df`, existing integrated
branch and draft PR #68. The final full TypeScript check passes after correcting
the DTO item-array declaration. Seven-file changed-line lint against `3242e7df` has
zero new errors/warnings; nine older findings remain outside changed lines.
Offline workflow guards pass 2/2. Fresh complete `npm run build` passes at this
source, with existing route-test/module/chunk/Wrangler warnings. All 214 tracked
public Git/source/output copies verify; Worker `motorsales365/index.mjs` binds the
canonical 365 backend, with 15 same-origin OCR/202 PDF assets and no browser engine
in its server package. New-head CI/publication are recorded separately; no upload
or release is included.

Final focused source run: **966/966** across ten suites in **43.49s**, single-worker
threads with a 512MiB heap and normal timeouts. Connected receipt suites account
for 364 tests: 108 DTO, 149 handler and 107 panel (all 101 prior panel cases plus six).
The final error-null matrix uses successful otherwise-identical controls before
varying only the error field. Independent DTO/handler/UI/CI review is clear.

The first default-fork run could not start a worker within its normal 60s bound
during low available RAM; no tests ran. The lower-overhead threaded attempt ran
256 tests: 149 handler passed, 106 UI passed and one new test queried a correctly
aria-hidden modal background control. Test-only pre-modal references corrected
that harness; the three connected suites then passed 364/364 in 12.86s. No timeout,
quarantine, assertion or source coverage was weakened. Final ten-suite 966/966
includes the specificity correction. A later type-only DTO declaration correction
replaces an intersected base item-array type with an explicit omitted field. It
does not change runtime bytes and passes the final full TypeScript check.

All receipt mutation declarations and the private opener, editor and installation
dialog bodies are independently byte-identical to parent `3242e7df` after LF
normalization. Six-file lint has zero errors and nine existing warnings; changing
the typed outer sort removed two earlier casts. Format and diff checks pass.
Fresh full packaging and its asset/Worker checks pass; exact-head CI remains open.

The new DTO/handler suites have an unconditional, single-worker, never-quarantined
CI step protected by the offline workflow guard. Existing receipt UI coverage,
normal timeouts, quarantine policy, Docker-free PostgreSQL17 and all release gates
remain in place.

Parent publication `3242e7df` has successful build, typecheck, lint, browser OCR
and native Parts checks. Its unit check was still in progress at the last metadata
read. The next purpose-built log request returned a Codex sign-in error; no CLI or
API fallback was used. Parent green cannot establish this new source's acceptance.

### Published candidate

Canonical remote and same attached draft PR #68 confirm publication
`7f2fcd4cbdf8303d74d03150f2217e8dee5112fa`, with the same base/title/draft and
main unchanged at `70ab892a`. All 214 final-head public copies and Worker/backend/
OCR/PDF/server checks verify. The PR body preserves earlier evidence as history.

Run `38859267928`: all six Actions gates pass. Completed unit `116837596293`
confirms application **3,431/3,431 across 84 files in 93.55s**, zero unexpected or
quarantined failures. Its overall log is truncated; the final summaries and
result-checker output are present. Completed native `116837596063`
has an untruncated log: official PGDG17.11 package installation, actual `170011`
server marker, Parts247/247, all six independent-session quote groups, both server
stops/scoped cleanup and 47 retained migration replay failures. This is selected
SQL rehearsal, not whole baseline/Auth/API/private-storage/restore acceptance.
The earlier purpose-tool sign-in error did not recur on these reads; no CLI/API
CI-log fallback was used.

Wrapper `38859263186` preview `116837583059` completes through the confirmed
`DEPLOY_VIA_ACTIONS` configuration skip, not an upload. Detection/migrations/
production and Supabase Preview skip. Independent Workers build
`b72864b7-42c9-44af-81f1-a9c50563c853` fails with ID/link only; fresh cause and
source-freeze execution remain unverified. Do not substitute an earlier Bun
failure for this head's evidence or change hosting/release settings by inference.

These parent publication notes join the next integrated source slice, not a
documentation-only CI restart. Parent green does not accept new source. The
private attachment URL contract is now implemented at `39a1ab1e` above;
isolated/owner/live statuses and the seven-day target are unchanged. No deployment
or live mutation is included.

## Next dependency and release status

Typed receipt writer outcomes, durable retry/reopen reconciliation, complete-line
viewing and concurrent-edit conflict handling remain implementation work. The
follow-up audit found a concrete consent gap: shop sharing derives a public flag
with `.some()`, while the retained SQL overwrites every item's public preference.
The interim mixed-consent UI interlock is implemented at `1a49acc5` above; an atomic
independent sharing contract remains necessary for direct/concurrent clients.
The same audit found the expense UI ignores its UUID acknowledgment and claims
posting after any resolved payload. Receipt totals are unscaled NUMERIC while
expenses use NUMERIC(14,2); the retained conflict branch returns an existing UUID
without checking amount/shop/vehicle. Client numeric checks or a UUID response
cannot prove exact financial reconciliation. This follows the retained SQL and
[PostgreSQL 17's declared-scale coercion](https://www.postgresql.org/docs/17/datatype-numeric.html#DATATYPE-NUMERIC-DECIMAL),
not a new live transaction test. Next: row-action caller/lifetime,
acknowledgment and mounted unknown-outcome guards, followed by separately
rehearsed atomic exact-money/conflict and durable recovery contracts. Storage/DB
discard is also non-atomic; changing operation order is not recovery proof.
Real-role API/Auth/private-storage,
transaction/restore, trusted pilot membership and owner acceptance remain open.
Migration correspondence remains 404/423, and the selected native SQL rehearsal
retains 47 replay failures. Hosting still has an independent failed build with
fresh cause unverified. No upload, deployment, merge, live business/Auth write,
customer communication, resource provisioning, charge or Docker use occurred.
