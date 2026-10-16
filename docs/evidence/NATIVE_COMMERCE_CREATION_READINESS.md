# Native quote and work order creation

16 October 2026. Same integration branch and draft PR #68. This slice corrects
creation callers; C3.02–C3.04 remain open until the authorized atomic backend and
actual-role, transaction, recovery and owner acceptance pass. No live writes,
migrations, Auth provisioning, uploads or deployment are part of this slice.

## Supported creation and selected schema

Both forms require a signed-in account and a fresh mounted form. Customer and
vehicle choices use fixed projections, bounded visible counts and independent
retry states. Up to 100 validated options are shown from a 101-row request;
capped choices do not disable the whole shop. A chosen customer and optional
same-customer vehicle are checked again by ID before the first write. Their
visible relationship is not proof of native shop membership or fresh authority.

Bounded canonical system-catalog reads on `wjxaajgvddtrxxtocxen` confirm these
selected fields and constraints, without business/Auth rows or any SQL write:

- Quotes has no `shop_id`; customers has a required UUID `shop_id`. The invalid
  quote field and unnecessary current-shop RPC are removed from the caller.
- Quote item types are `service`, `part` and `labor`; invalid Other is replaced by
  an explicit Service choice, not an automatic persisted-data conversion.
- Quote quantities, unit prices and amounts use `NUMERIC(10,2)`; tax rate is
  `NUMERIC(5,4)` with default `0.08`. The entered percentage is represented as a
  fraction (`12%` → `0.12`), consistent with that retained default and the existing
  display calculation. This is not approval of a legal tax rate or rounding policy.
  Exact decimal arithmetic rejects unsupported precision/range or fractional-cent
  results instead of silently rounding. The interim positive-quantity/named-line
  caller limits do not define the full native financial contract.
- Work orders requires `shop_id` and a customer or vehicle reference. Estimated
  hours is unscaled `NUMERIC`; mileage is int32. Supported decimal hours retain
  their wire text; caller resource limits do not redefine database precision.
- Selected FK metadata shows no quote customer/vehicle or quote-item parent FK.
  Work-order separate customer/vehicle/shop FKs do not enforce their joint scope.
  These observations strengthen the need for server-side relationship checks.

The selected policy/trigger/helper capture is
`commerce-creation-catalog-2026-10-16.json`: five RLS-enabled tables, six policy
predicates, four trigger attachments and four helper fingerprints. This is not
whole schema/ACL/replay proof. Current predicates still use the legacy profile
shop helper; RLS enabled is not trusted fresh membership. The existing native
quote-number trigger supplies numbering, not retry identity. Its retained
five-character `lpad` can truncate larger sequence values; numbering growth and
collision behavior require a reviewed forward fix, not sequence/history repair.

## Save outcomes and remaining atomic writer

Every dispatched write disables automatic SDK retry. Returned header and item
records must match their fixed projection, identity, submitted relationships and
values; partial, malformed, error or unknown outcomes never become success.
Draft/context changes and late results must not start a later write or navigate a
different account. A mounted uncertain draft cannot be resubmitted automatically.
Cancellation is not rollback and navigation does not make a hold durable.

Independent review found and repaired two quote hazards before publication:
PostgreSQL-invalid text could otherwise fail items after a saved header, and
render-side cancellation could abort a valid save during an abandoned render.
All supplied text is checked for NUL, unpaired UTF-16 surrogates and explicit
200/4,000-unit caller bounds before submission reads/writes; valid paired Unicode
is preserved. This follows PostgreSQL's [JSON/text encoding constraints](https://www.postgresql.org/docs/17/datatype-json.html),
not an invented business text policy. Context publication and irreversible
attempt-loss fencing now occur only in committed layout effects. The new
abandoned-Suspense regression uses a documented synthetic render-local read mask
over the real QueryClient; committed invalidation controls remain intact.

Quote header and items still save separately. Work-order creation still depends
on native server authorization, trigger/audit behavior and durable retry handling.
Neither browser preflight nor matching acknowledgments close those gaps. The
quote-conversion interlock remains; the unsafe legacy converter is not reconnected.

Next executable backend dependency is C3.02: one invoker-preferred transaction for
the complete quote, ordered children and durable command receipt. Bind the verified
original actor, fresh session/role/shop, canonical payload and stable retry key;
same content returns the same result and conflicting content rejects. Protect and
recheck mutable customer-shop/vehicle-customer scope after lock waits; key-share
alone does not protect non-key retargeting. Include all participating writers,
late-failure rollback and independent-session races. Do not use service/definer
fallback to conceal unresolved authority, tax/rounding or tenant-binding contracts.

## Verification and publication

Source commit: `bcc253507d65294d5dc73f37b39e91c13e7c87d8`, same branch and draft
[PR #68](https://github.com/Hunting-Fishing/motorsales365/pull/68).
Quote focused **84/84** (9.02s), work-order **89/89** (8.96s). Root combined actual
route/real QueryClient plus security scanner: **183/183 across three files
(18.68s)**, normal five-second timeouts, no quarantine change. Scanner file 10/10
at269ms. Full TypeScript passes after both review repairs; five-file changed-line
lint records zero errors/warnings/older findings. Independent final read-only
review has no remaining material finding. Creation CI is unconditional,
single-worker and never quarantined, with offline wiring **2/2**.

The first quote run passed68/70 because jsdom's native date control sanitized two
malformed-date test inputs to an optional empty string. Only those test fixtures
were corrected to deliver malformed text; their no-write assertions and optional
empty-date behavior remain. Final84 tests include the review regressions.
Synthetic SDK tests are not real API/Auth/private-storage or financial acceptance.
Fresh complete `npm run build` passes at `bcc25350`. Worker verification confirms
`motorsales365/index.mjs`, the sole canonical Supabase backend, all 15 same-origin
OCR and 202 PDF files, and no browser OCR/PDF engine in the server bundle. Tracked
release-asset verification confirms all **214 Git/source/output copies** at that
source commit. Existing route-discovery/chunk/import/Wrangler-main warnings
remain. No upload or live release follows from packaging. Publication of this
source/evidence needs its own exact-head remote checks, not prior green.

Prior published `bf091dc7` passed all six Actions gates in run `38833837897`.
Linux application: 2,422/2,422 across 77 files (69.02s), zero unexpected/quarantined
failures; scanner file 10/10 at 118ms. The earlier Windows full-run scanner timeout
remains recorded separately; no timeout, exclusion or quarantine was weakened.
Native PostgreSQL 17.11 Parts CI passed all 247 assertions with scoped cleanup and
no Docker. Its retained 47 migration replay failures are not full baseline proof.

Authenticated prior published `bf091dc7` Cloudflare build `42f57dc7-de56-48cd-8cc3-3e2518596bc0`
fails automatic Bun frozen-lockfile installation before configured npm build or
version upload. Source freeze was not reached; no lockfile, setting, token or retry
change was made. Migration/production and Supabase Preview were skipped.

The QA signup handoff was checked once: owner contact/credentials/Terms/submission
remain incomplete. Existing identities were untouched; no repeated email question
or secret request. Synthetic native shop/membership, real API/private storage and
restore acceptance remain open. Other hosted projects and approved restrictions
are unchanged. The seven-day target is not a verified forecast.
