# Receipt read contracts

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

## Next dependency and release status

Typed receipt writer outcomes, durable retry/reopen reconciliation, complete-line
viewing, concurrent-edit conflict handling and private attachment URL caller
binding remain separate implementation work. The next connected reader is
`getPrivateReceiptUrl` plus its opener call: bind expected account, selected receipt
and returned path/URL, redact errors and fence late signing results. Do not require
the current reader to match the uploader's path prefix. The installed Storage SDK
offers no per-call abort/retry option for signing; a bounded wait can discard and
observe late results, not cancel token minting or revoke a URL. Real-role API/Auth/private-storage,
transaction/restore, trusted pilot membership and owner acceptance remain open.
Migration correspondence remains 404/423, and the selected native SQL rehearsal
retains 47 replay failures. Hosting still has an independent failed build with
fresh cause unverified. No upload, deployment, merge, live business/Auth write,
customer communication, resource provisioning, charge or Docker use occurred.
