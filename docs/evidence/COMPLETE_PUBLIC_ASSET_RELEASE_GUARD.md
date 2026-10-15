# Complete tracked public assets release guard

15 October 2026. Source `75b2304fae26f9572041ff88d3cff86aeeaec5a0` on
`completion/365-seven-day-integration`, continuing draft PR #68. This clears the
local missing-public-media check, not staging, release approval or live acceptance.

## Verified checkout and build

Read-only GitHub tree metadata identified 214 public blobs totaling 56,116,946
bytes, maximum file 2,895,334 bytes; the response was not truncated. The complete
repository tree has 2,211 blobs totaling 89,436,570 bytes. No file content or
credential value was printed during that inventory.

`git sparse-checkout disable` restored the working checkout without a branch
switch, reset, deletion or source modification. `core.sparseCheckout` is false.
All preexisting modified workflow/new guard files were preserved. The generated
OCR/PDF manifest SHA-256 values stayed unchanged:

- OCR: `11bcfa82beaa11ab1d697f45aebf131db9a665ba6c4497a83e8b21f92b585263`.
- PDF: `e31d4e863a813a7aa2bd6ed9acac341b37c1926b07c3f6e9965f03e5678cfdf6`.

The new verifier first rejected the actual sparse checkout. After restoration it
also rejected the old output for missing copied media. A fresh `npm run build`
completed with exit 0. The verifier then confirmed all 214 tracked public files
against Git HEAD and their copied `.output/public` bytes. Client, SSR and Worker
output was produced; existing route-test/chunk/use-client/config warnings remain
separate quality work. No output was uploaded or deployed.

## Guard and workflow behavior

`scripts/ci/verify-release-assets.mjs` is read-only. It requires the repository
root, a non-sparse checkout, a literal commit and NUL-delimited Git tree metadata.
It rejects unsupported modes, unsafe paths, case/normalization aliases, missing
or linked/nonregular files, source bytes that differ from their Git blob IDs,
copied bytes that differ from source, unexpected asset roots, unreviewed
`.assetsignore`, unsupported LFS pointers and a changed HEAD. A 64 MiB local
per-file resource bound is not a statement about provider limits. Git metadata
reads disable lazy fetching; the verifier does not restore files or access a
database, cloud provider, credential service or upload command. Error output
does not disclose underlying file contents or absolute paths. No CLI bypass or
alternate-root argument is supplied.

CI runs a dedicated never-quarantined regression step and the actual guard after
building, before Worker dry-run packaging. Both GitHub Actions upload paths run
the guard and existing Worker identity/Supabase/OCR/PDF verification before the
Wrangler action. Preview previously lacked that identity/target verification.
Production approval environment, migration dependency/freeze, configuration
readiness, fork controls, secrets and deployment flags are unchanged.

This is a tracked-public-file completeness check, **not** a complete artifact
attestation, asset-content security scanner, generated-chunk manifest, build
signature or filesystem race-proof custody mechanism. Untracked/generated public
files are outside this new gate; existing OCR/PDF manifest checks still apply.
The independent Cloudflare Workers Builds integration and raw manual Wrangler
commands are not controlled by these Actions steps. No external build command
or deployment setting was changed. Full release recovery/approval remains required.

## Fresh verification

- 50 new Node regressions plus 15 inventory/report/release regressions: **65/65**,
  7.591 seconds, zero failures/skips/cancellations. Synthetic temporary Git repos
  exercise actual local Git/filesystem/CLI behavior, including Windows junctions,
  missing/altered files, unknown output roots, exclusions, LFS, malformed paths,
  resource bounds, ambiguous names and an actual HEAD change during the check.
- Command: `node --test scripts/ci/verify-release-assets.test.mjs scripts/ci/check-vitest-results.test.mjs scripts/ci/supabase-release-safety.test.mjs scripts/ci/seven-day-integration-inventory.test.mjs`.
- Changed-file ESLint has zero warnings/errors; Prettier, diff and primary review
  pass. No independent agent review was available.
- Fresh complete-checkout build passes. `node scripts/ci/verify-release-assets.mjs`
  confirms 214 tracked public files against the unchanged public tree at `c5e4bf1a`.
  Subsequent commits change only guard/workflow/documentation files, not app/media.
- `node scripts/ci/verify-worker-bundle.mjs` passes for `motorsales365`, `index.mjs`,
  canonical Supabase ref, 15 OCR files, 202 PDF files and browser-engine separation.
- OCR/PDF asset regressions: **10/10**, 0.201 seconds.
- Application/SQL source is unchanged. Prior PR #68 head `c5e4bf1a` passed all
  six CI gates (`38748717058`), including real-browser OCR and disposable Parts
  PostgreSQL. Its 1,333 application tests and parent 701 tooling checks are prior
  evidence, not rerun or summed into these fresh counts. New publication head
  requires its own CI, including Linux execution of this guard.

## Release state and next dependency

The prior head's independent hosting build `73ef71c2-c97b-4b37-aac8-cadb567bf055`
failed; check `116469695294` exposes no diagnostic text or annotations. Wrapper
`38748717572` passes its preview step with upload configured skipped; migrations/
production skip. This is not an upload or a new hosting root-cause diagnosis.

The owner supplied canonical project `wjxaajgvddtrxxtocxen` in response to the
staging question. That is the existing production target, not isolated staging;
it was not assigned as `STAGING_PROJECT_REF` or used for acceptance mutations.
Fresh project/organization metadata discovery shows the same three existing
projects in `366 Industries AI Platform`; none is a separate 365 staging target.
Other businesses' databases were not repurposed. One follow-up asks whether to
price a separate project in that organization or use another existing staging
project. The cost tool requires the owner's organization selection; no cost was
quoted or confirmed and no resource was created. The pilot-account question
remains open. Safe local implementation continues without repeating those prompts.

Migration impact/deployment: **none**. No live SQL/business/Auth mutation,
restriction replay, provider setting change, paid provisioning, customer message,
history repair, PR merge or new automation. Source mapping remains 404/423, with
19 unclassified; all baseline/replay/parity/release gates stay unchanged.

Next: publish this slice on existing PR #68 and verify its exact latest head;
selectively reconcile PR #9 cutover/provider/auth/assets/migration and PR #2 plan;
complete the action-level acceptance/migration inventory and trusted transaction/
private-custody/recovery work. After the owner selects a staging option, obtain
the actual cost and explicit required confirmation before any creation. Do not
interpret the production link as staging isolation or release authorization.

The Cloudflare skill and current [static-assets configuration](https://developers.cloudflare.com/workers/static-assets/binding/)
guided the asset-root/exclusion checks; [Vite public-directory behavior](https://vite.dev/guide/assets.html#the-public-directory)
supports comparing copied public files unchanged. The Supabase skill preserved
the production/staging boundary; writing guidance keeps that remaining gate
separate from the newly verified local media check.
