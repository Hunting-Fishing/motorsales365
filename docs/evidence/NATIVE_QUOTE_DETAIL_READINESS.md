# Native quote-detail readiness and independent build freeze

Checkpoint: 16 October 2026, Asia/Manila. Same integrated candidate branch
`completion/365-seven-day-integration` and draft PR #68, not a separate build.
Source commit: `166ff0c464e040ce3224b6675aba5b7a38d8234d`.
Publication and exact-head checks must be verified independently below.

## What changed

Quote detail now requires completed Auth loading and a signed-in account. A
keyed account/quote view and per-mount private read lifetime discard cached and
late A-to-B-to-A reads. Each successful matching primary read supplies a new
version witness and fresh item lifetime, even when identical refresh results are
batched. Loading, refresh and error hide previous snapshots. Both query layers
disable automatic retries; generic errors expose independent manual retry.

The fixed 14-field primary projection must be complete and match the requested
native UUID. Only that fresh primary mounts the item reader. The fixed 10-field
item projection requests exact RLS-visible counts, deterministic display-order/ID
ordering and at most 101 rows, displaying at most 100. Every returned row,
including the hidden sentinel, must have complete fields, a distinct native UUID
and the matching quote_id. Unknown/positive counts with no rows never confirm an
empty list; capped or partial snapshots never claim complete financial visibility.

Stored dates/timestamps are shown as received text, including native infinity,
expanded/BC years and offset variants. Received decimal strings retain their
digits and scale without accounting arithmetic or locale rounding. Missing or
unsupported values are unavailable, not zero, draft, current date or a presumed
expiry. A bounded presentation path does not establish a financial range, exact
database decoding or line/header reconciliation.

Cancellation uses the documented
[Supabase AbortSignal API](https://supabase.com/docs/reference/javascript/using-modifiers-abortsignal).
Neither browser cancellation, account keys nor SDK-response tests establish fresh
JWT/session/role/shop authority, RLS, revocation or private-object access.

## Explicitly unfinished conversion

The old browser conversion could commit a work-order header before failing its
children or linkage. Retained source and the prior narrow canonical catalog
capture identify wrong labor hours/total and part name/price/total payloads and
missing required part_type. Renaming columns would not make four separate writes
authorized, atomic or idempotent. Quote items do not supply a complete stock or
part-type mapping; none is invented here.

The unsafe browser conversion dispatch is removed from this unreleased candidate,
including its mutation handler and callbacks. The button is disabled with an
explicit pending-authorized-atomic-writer explanation. A previously converted
work order remains navigable only from the current validated primary. No hidden
DML/RPC path or manufactured success remains in this route.

This is a temporary candidate-only interlock, **not completion of C3.03**, a scope
cut, a live restriction or a deploy. The authorized atomic conversion writer and
its actual-role, concurrent-retry, rollback and recovery acceptance remain a
release blocker. C3.02 quote creation and C3.04 work-order creation remain open.

A bounded retained-source audit, not a fresh live catalog/function execution,
also rejects blindly wiring `convert_quote_to_work_order(uuid)` from migration
`20260715012303_a5daad1f-ca4a-4606-b07d-3f38ec8c7ee9.sql:122`. Its SECURITY DEFINER
body has no actor/shop check or quote lock, omits required work_orders.shop_id,
uses part_type `aftermarket` where the retained CHECK allows only `inventory` or
`non-inventory`, and casts fractional quote quantity to integer. Its status/pointer
early return is not concurrent deduplication. The dated reduced proof shows this
PUBLIC-executable definer path can reach the directly restricted totals helper;
the UI interlock does not contain that database path. No live RPC/restriction.

The smallest next writer dependency is explicit rather than guessed:

- Quotes have no retained shop_id; customer.shop_id is required, vehicle.customer_id
  is nullable and work-order FKs do not jointly enforce shop/customer/vehicle
  agreement. Support for nullable-customer/company vehicles needs a binding contract.
- Settle service-as-flat-units versus labor-hours, fractional-part compatibility,
  explicit inventory/non-inventory/stock identity, tax/header reconciliation,
  permitted statuses and expiry rules. Names/categories do not encode stock identity.
- Native current-shop/profile helpers and caller-bound expected-account patterns
  are source dependencies, not verified fresh/original-human authority. Mutable
  profile/role, legacy/null-shadow and native ownership gaps remain. Do not replace
  that proof with service credentials or a nominal owner role.
- Verify the selected six-table constraints/defaults/RLS/attachments and relevant
  helper fingerprints. Number-generation triggers/sequences and invoice-linked
  stock/COGS/journal effects require an explicit protocol to prevent missed or
  double stock consumption; current legacy conversion drops inventory linkage.
- One authorized transaction must bind source revision/retry identity, consistent
  locks/revalidation and same-shop target linkage. All competing item/header writers
  must participate or be fenced; existing-row locks alone do not stop new items.
  Rehearse genuine late-failure rollback and independent-session duplicate/edit
  races. Sequence gaps are not orphan work orders. Reduced models are not acceptance.

## Recovered hosting diagnosis and source freeze

Authenticated read-only dashboard access is available; no further hosting login
is currently missing. Prior exact head `65733393d34145f7c6810958b2e48bd2c51b6561`
passed all six Actions gates in run `38788467751`. Its independent Workers build
`c9a76b64-c814-400b-8229-8faf36b15548` failed during automatic dependency installation,
before configured building or uploading:

- Detected Bun1.2.15, npm10.9.2 and Node24.18.0.
- Automatic command: `bun install --frozen-lockfile`.
- Failure: lockfile changes rejected by frozen installation.
- Configured root `/`; build `npm ci --legacy-peer-deps && npm run build`;
  version upload `npx wrangler versions upload --config .output/server/wrangler.json --name motorsales365`.
- Both Bun lockfiles and package-lock.json are tracked. No lockfiles, provider
  variables, tokens, Worker settings or upload commands were changed.

Only environment filenames were visible in logs; no environment contents or
secret values were read. Wrapper run `38788467780` preview passed its confirmed
configured skip path, not an upload; migrations/production and Supabase Preview
were skipped. Old-head CI does not validate a subsequent publication.

The new local build-entrypoint guard rejects any presence of WORKERS_CI, including
false/empty overrides, with fixed redacted output and no bypass flag/secret/branch
exception. Both build/build:dev commands guard before Vite, not just lifecycle
hooks; prebuild variants guard before OCR preparation. Actual installed npm
ignore-scripts invocations are tested without compiling, installing or uploading.
Marker-absent local/Actions compilation remains possible and grants no release
approval. Both new suites have unconditional, never-quarantined CI steps.

Cloudflare documents the provider marker and overridable build variables in
[Build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
and automatic installation/overrides in
[Build image](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).
Automatic installation precedes this source guard, so the observed Bun failure
is **not repaired** and the guard has **not run remotely**. Operators can replace
commands/source or environment behavior; raw Wrangler is outside this guard.
Version uploads also do not isolate the bound resources. This is a source-path
freeze, not a universal upload firewall, staging or production authorization.

Do not blindly regenerate/remove Bun locks, set SKIP_DEPENDENCY_INSTALL or change
Node/provider settings to unlock the raw upload. First review a gated hosting
configuration/recovery path and satisfy provenance, authority, artifact and owner
release prerequisites. No Retry/save/upload/deploy operation was performed.

## Verification checkpoint

The Parts CI job now uses native PostgreSQL17 rather than a service container.
Official signed [PGDG Ubuntu packages](https://www.postgresql.org/download/linux/ubuntu/)
install only on the ephemeral Ubuntu24.04 runner, not the owner's computer.
Minor packages and runner images remain mutable. A private runner-owned mktemp
cluster has socket-only access, no TCP, explicit actual server-major/data-directory/
socket/superuser checks, bounded startup/stop and tightly validated cleanup.
The same --local adversarial runner, roles/stub/SQL, logs and no-SKIP rule remain;
missing test files now fail rather than succeeding with a skip. The retained
runner's tolerated historical replay failures are unchanged, not baseline proof.

Root review and current [PostgreSQL17 initdb documentation](https://www.postgresql.org/docs/17/app-initdb.html)
confirm the selected flags; syntax and offline wiring checks pass. Combined
freeze/wiring regressions at the committed source pass 12/12 (1.106s), including
the native-PG17 path. No packages/server/container were installed or started
locally. Actual Linux installation, extensions, cluster cleanup and adversarial
SQL were pending at source-commit capture; see the later accepted CI run below. Docker-free Parts SQL
coverage still does not provide real Supabase Auth, API or private Storage.

Focused actual-route/real QueryClient tests pass **108/108** (10.66s), with
synthetic SDK responses only and normal five-second test timeouts. Owned-file
formatting/ESLint and independent source/test review pass. The first focused run
passed 107/108; its single failure incorrectly required an already-settled
request's signal to abort on unmount. Only that test assertion was corrected;
pending-read abort and stale-context privacy assertions remain enforced.

Independent build-freeze tests pass 10/10, including actual npm ignore-scripts;
combined freeze/CI-wiring tests pass 12/12 (1.368s). These counts overlap and must
not be added as unique coverage. Route/package TypeScript and five-file ESLint
passed before the subsequent scanner-only traversal change; exact-head CI must
recheck the whole candidate. Changed source/package/CI files pass formatting.
The first fresh full application
run passed 2,421/2,422 across 77 files (252.05s); one unchanged whole-source
restricted-column scanner exceeded its normal five-second timeout. Its isolated
rerun also timed out (9/10 passed; scanner 33.009s). No full-suite pass is claimed.
A coverage-preserving scanner change removes ordinary per-entry stat calls and
retains symlink fallback. Old/new ordered manifests match all 1,144 TS/TSX paths;
unchanged filtering scans 1,067 files /10,622,436 characters /1,401 select matches.
Focused scanner suite passes 10/10 (scanner 213ms), with clean lint/format and the
normal timeout, regexes, assertions, exclusions and quarantine unchanged.

However the full post-change rerun still passes only 2,421/2,422 across 77 files
(190.22s), with the same scanner timeout (17.117s assertion duration). The small
traversal optimization is not a verified root-cause fix; under the separate idle
benchmark the prior unchanged loop was also fast. Do not claim a full-suite pass
or weaken the gate. Read-only full-vs-focused diagnosis and exact-head Linux CI
remain required. Fresh complete build passes at `166ff0c4`; Worker verification
confirms motorsales365/index.mjs, the sole canonical backend, all 15 same-origin
OCR and 202 PDF assets, no browser engine in the server package and all 214 tracked
public Git/source/output copies. Existing route-discovery/chunk/import/Wrangler
warnings remain. No upload, deployment or live acceptance follows from packaging.

An initial parallel Node release/report/assets run passed 63/70 and failed seven
subprocess checks, including a Git Bash spawn timeout, under low available memory.
It is not a pass. The first file-serial rerun passed 69/70, with only the Git Bash
startup timeout remaining. Bounded diagnostics ran both installed Git Bash paths
with empty PATH and the actual frozen entrypoint: both exited 1 with the expected
fixed denial and no CLI call. Final unchanged file-serial run passed 70/70
(40.641s), zero failures/skips. No timeout, test assertion, quarantine, migration
script or workflow was weakened; earlier failed runs remain part of this record.

## Deployment, next dependency and blockers

Subsequent exact published head `bf091dc7bdecf2a7a024c9d1db9a999344ad3bba` is
verified on the canonical remote; main remains unchanged. [Native Parts CI job](https://github.com/Hunting-Fishing/motorsales365/actions/runs/38833837897/job/116758376432)
completed successfully. Purpose-built CI diagnostics supplied the complete job
log, including PGDG package `17.11-1.pgdg24.04+2`, PostgreSQL/psql 17.11, private
cluster execution and all 247 adversarial assertions. Always cleanup passed.
No Docker service/container was used. Retained replay reports **47 local migration
failures**; unchanged tolerant harness semantics do not prove baseline/schema/
replay, Auth/API/Storage or database/private-object recovery. Those gates stay open.

At the same exact-head check lint, OCR and full TypeScript passed; build and unit
later passed, completing all six Actions gates. The final unit log tail confirms
Linux application **2,422/2,422 across 77 files (69.02s)**, source scanner file
10/10 at 118ms, and report-checker zero unexpected/quarantined failures. The
purpose-tool log is truncated overall; these explicit final summary lines and
successful job are present, not an assertion that the entire log was retrieved.
This Linux pass does not erase the failed Windows full run or prove its cause.
Two earlier attempted purpose-tool unit-log reads
returned provider HTTP 502; no alternate CLI diagnostics or test pass is inferred.
Wrapper `38833837904` migration/production skipped and Supabase
Preview skipped. Independent Workers build `42f57dc7-de56-48cd-8cc3-3e2518596bc0`
failed. A subsequent authenticated browser read of that exact-head build confirms
17 seconds, automatic `bun install --frozen-lockfile`, and frozen-lockfile changes
failure before configured npm build/version upload. The source freeze was not
reached. Build variables remain shown as None; no settings, retry, token or
lockfile change was made. No upload or live revision is inferred. Recheck current exact-head
results, not old green. These follow-up notes are local pending the next integrated
commit; new source still needs its own exact-head checks.

Subsequent owner directive, 16 October: no Docker. No Docker installation/start/
use or image pulls; do not ask the owner to open Docker Desktop. The existing
follow-up is updated, same schedule and authority. Docker-free tests may proceed,
but real API/Auth/private-storage/transaction/restore gates cannot become mocks
or risky live tests. The native-PG17 replacement is committed and the subsequent
published Linux run passed all 247 Parts assertions. Do not dispatch an older
containerized workflow or silently drop coverage. Existing older container paths
stay unused.

The owner subsequently authorized a dedicated QA login and nominated controlled
email addresses. A bounded read-only EXISTS check on those exact nominated
addresses found one already registered; no IDs, roles, tokens, password hashes or
customer records were returned. Do not overwrite that personal identity or create
a company-domain staff/admin account. A separate plus-tagged nominated Gmail alias
is proposed, not yet created or confirmed. Keep personal email addresses out of
GitHub evidence and automation prompts.

The live signup form is prepared with a synthetic QA name and ordinary Buyer &
Private Seller option only. Email, mobile/address and credentials remain blank;
Terms are unchecked and nothing was submitted. The owner must complete credential/
Terms steps and verify/sign in through the browser; no secrets in chat. Account
creation and login can trigger existing onboarding/profile/org/entitlement and
confirmation/welcome-mail paths. Only an explicitly controlled test recipient is
within this setup, not customer outreach or new provider activation. Use a clean
session and no referral/invitation/manager metadata. Native synthetic shop/role
binding, private files and commercial writers need separate reviewed acceptance;
a standard Auth login or ordinary org ownership does not establish those rights.

No SQL/schema migration, business/Auth write, new restriction, history repair,
provider activation/email/customer message, upload, deploy, merge or paid resource.
Sole hosted backend remains `wjxaajgvddtrxxtocxen`; 366 AI and Barangay Buddy are
untouched. Mapping remains 404/423 with typed 12/5/2; full baseline/schema/replay/
parity/release gates remain blocked. Existing approved restrictions are preserved.

Subsequent creation caller source `bcc25350` is documented in
`NATIVE_COMMERCE_CREATION_READINESS.md`; it does not complete the atomic writer.
Docker-free `bf091dc7` Linux CI is accepted above; do not repeat its installation
or erase the separate Windows failure. Reconcile the QA credential handoff without
modifying personal/staff identities. Immediate resume: close actual authorized atomic
C3.02-C3.04 writers and financial/stock/retry/recovery acceptance; do not repeat
these reader/email source proofs. Independent local API/Auth/private-storage/
restore acceptance remains unavailable. Docker is prohibited, not an access/setup
request; find a Docker-free path without lowering acceptance. The earlier check
found 1.17 GiB available of 15.71 GiB RAM; the no-Docker response check found 2.44
GiB (transient snapshots, not capacity guarantees). No daemon/image download.
Controlled email nomination is received; dedicated QA session/pilot synthetic shop
and least-privilege native membership remain unverified. Do not repeat the email
question or request passwords, OTPs or keys in chat.

The 22 October 21:00 Manila target is not yet a verified forecast. Day 2 feasibility
must use remaining accepted journeys, original-human/fresh-role/native-team/private
custody, atomic writer/recovery and owner gates, not test or PR counts. Supabase,
Cloudflare and documentation guidance keep source/hosting facts separate from
real-role, financial, recovery, owner and live acceptance.
