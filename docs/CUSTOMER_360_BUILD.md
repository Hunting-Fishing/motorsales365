# Native Customer 360: first delivery slice

C1.04 source `5bd1a715` (16 October) adds captured account/receipt/selected-shop
expense intent, same-client preflight, checked transport acknowledgment and
neutral current-only feedback. A synchronous per-mount fence/unknown hold
survives ordinary receipt refresh/paging; other writers/editor/install stay
unchanged. Focused 1,415/1,415 across 12 suites (28.51s), all 124 prior panel cases
plus 37 new, review/format/diff/CI guards and final full TypeScript pass.
Changed-line lint zero new findings and fresh complete build/214 public copies/
Worker/backend/OCR/PDF/server checks pass with retained warnings. Evidence and
publication: `evidence/RECEIPT_EXPENSE_CALLER_SAFETY.md`. Financial/conflict
reconciliation, atomic target/native authority and durable recovery remain open;
the expense reader still uses a legacy unscoped key. Next: C1.05/sharing/install.

Mixed-consent source `1a49acc5` (16 October) adds a temporary receipt-level sharing
interlock while preserving individual public choices. Both disabled and event
guards use the full returned items, including category-filtered-out lines. Final
combined 1,180/1,180 across 11 suites (24.98s), with 15 new cases and all 109 prior
panel tests unchanged; independent review/format/diff pass. Full TypeScript,
changed-line lint zero new findings and fresh complete build/214 public copies/
Worker/backend/OCR/PDF/server boundaries pass, with retained warnings. Exact
evidence/publication: `evidence/RECEIPT_READ_CONTRACTS.md`. Independent atomic sharing and
direct/concurrent caller safety remain open, not removed from scope. Next:
expense/discard row-action safety, exact-money and durable recovery.

Private receipt signing follow-up `39a1ab1e` (16 October): captured account/receipt
intent, fixed DB-key/canonical URL evidence, generic errors and bounded late-result
discard are integrated without SQL or live changes. Focused 1,165/1,165 across 11
suites, full TypeScript and changed-line lint/review/format/CI guards pass;
packaging/publication are recorded in `evidence/RECEIPT_READ_CONTRACTS.md`.
Signed URL expiry/revocation and real private-object acceptance remain unverified.
Next is preservation of mixed per-item consent, then row-action caller/lifetime/
acknowledgment and atomic exact-money/durable recovery. A success-looking expense
UUID is not financial reconciliation, and the two existing numeric scales differ.

Latest connected receipt source `f50aaa0d` (16 October): expected-account-bound
server reads, fixed counted receipt/link pages, complete-item evidence and safe
new-editor eligibility are integrated with the existing panel. Open editor,
installation and uncertain-write state survives ordinary paging/refresh.
Final focused 966/966, full TypeScript, changed-line lint/review/CI guards and fresh
complete build/214 public assets/Worker boundaries pass with existing warnings.
`evidence/RECEIPT_READ_CONTRACTS.md` records source/tests/publication and the
remaining writer, complete-line, private-object and release dependencies. This
does not establish native authority, atomic snapshots or live acceptance.

This change extends the existing Shop Manager customer detail screen. It does not
introduce a second CRM database or duplicate customer identity.

## Delivered

- Customer-scoped quote and invoice cards with record links, dates and statuses.
- PHP amounts consistent with the existing native commercial records, without
  visitor-currency conversion or misleading lifetime totals.
- Explicit 25-record display limit and independent errors/retry controls.
- Authenticated-account query keys for customer details, vehicles, work orders,
  commercial history, communications and reminders.
- Work-order display currency corrected to PHP.

## Verification

- Application tests: 241/241 passing, no quarantine.
- TypeScript: passing.
- Changed-line lint: zero errors; four existing-schema typing warnings.
- Five new commercial-history tests cover record display, independent failure,
  cross-account cache isolation, signed-out behavior and the display cap.
- Five receipt-panel regressions cover account-isolated receipt/shop-link caches,
  signed-out behavior, open-editor resets and scoped invalidation. A keyed
  account/target boundary clears local private state on account switches.
- Tooling regressions: 13/13 passing. Read-only migration source evidence now
  verifies exact deployed SQL for 13 additional files under other timestamps;
  15 source files remain unresolved, so automated history repair stays blocked.
- Parent security branch: all 247 PostgreSQL adversarial assertions passed in
  GitHub Actions; complete-checkout build, typecheck and unit checks passed.

This PR is stacked on the combined security branch. It adds no migration and
does not apply the parent's pending migrations to production. Local sparse
checkout omits public media: its build artifact must not be deployed.

The owner's same-chat continuation heartbeat is active every 30 minutes. It
resumes from the repository checklist and must not be duplicated. It is not an
instant chat/phase-end event trigger. Local runs require this computer and app.

## Remaining work

This is not the full CRM. Unified receipt/installation activity, assignments,
retail and recruitment pipelines, consent-aware communications, reporting,
organization-level acceptance testing and receipt OCR recovery remain separate
delivery slices. Existing query scoping supplements database authorization;
it does not replace RLS or establish a new organization identity contract.

The interrupted CRM chat is now recovered: its actual options were ERPNext and
Dolibarr, with no recorded adoption decision. Current pinned license/stack/API
evidence and the optional-adapter acceptance boundary are in
`evidence/CRM_CANDIDATES_RECOVERED.md`. Native CRM remains the implementation path;
neither external application is installed or integrated. Original scanner source
recovery and actual live OCR/owner acceptance remain separate from the rebuilt,
CI-verified PR #12/#13 scanner.

## Drill-down isolation follow-up (2026-10-15)

The vehicle/work-order screens linked from Customer 360 now scope their detail,
service, installation, job-line and part caches to the authenticated account.
Signed-out renders mount no private UI. Vehicle histories are explicitly bounded
to 100 displayed records; PHP is used consistently for operational amounts.
Independent source failures offer generic retries rather than claiming an empty
history or guessing a workspace-link problem.

Work-order editors remount across account/target changes; pending old-context
callbacks cannot reset a new draft, toast, navigate or invalidate its caches.
Dependent reads wait for a visible primary record, and write entry points wait
for complete job/part reads. Existing list invalidation is preserved while the
current account's customer/vehicle commercial/service caches are refreshed.

Time-entry, technician-picker and inspection caches are also account scoped.
Child-card drafts reset on context changes. Sequential inspection work checks
previously ignored checklist errors and stops subsequent dispatch after context
loss. Partial creation failures refresh the scoped list and warn the operator
to inspect existing records before retrying; they do not claim rollback.

Focused verification: 45 new route/child-card regressions pass. Full-suite,
type/build and review commit evidence is recorded in the completion checklist.
This does not certify all Shop Manager list/editor caches or organization-level
role transitions; other routes still need a bounded audit.

### New release dependency: invoice integrity and privileged helpers

Do not promote UI test success to invoicing readiness. Read-only inspection found
elevated legacy invoice/totals RPCs executable by anon/authenticated database
roles without caller/shop checks. The current browser invoice insert omits the
required due date and has incorrect labor/part mappings, non-atomic requests and
no idempotent work-order link. The legacy RPC is not a safe substitute because
it has authorization, concurrency, tax/status and inventory-posting differences.
See `evidence/SHOP_MANAGER_INVOICE_RELEASE_GATES.md` for exact observations.

The owner-approved converter-only temporary restriction was applied and catalog-
verified on 2026-10-15 Asia/Manila after six CI gates passed; anon/authenticated
execution is denied, owner/service execution retained. The function body and
totals helper are unchanged. See `evidence/INVOICE_CONVERTER_CONTAINMENT_RELEASE.md`.
No customer records or application deployment changed. The totals helper and
mutable profile/membership authority remain unresolved and are outside this approval.

Before expanding commercial activity: prepare/test an independently authorized
atomic converter with stable retry behavior and draft billing policy, then complete
baseline/recovery and release gates before live application.
The bounded activity card can follow, using only explicit active vehicle links;
never reuse the owner-only sharing/history screen inside shop CRM.

## Bounded activity slice (implemented offline; not released)

Build a read-only Customer Vehicle Activity card for one selected native customer
vehicle. A new authenticated reader must resolve the visible customer, matching
native vehicle and explicit active owner-approved `vehicle_shop_links` row for
that shop on every source request. Resolve `shops.business_id` independently for
network installation records; never assume shop/business/organization IDs match.
Missing, revoked, mismatched or ambiguous links dispatch no downstream reads.

Use fixed summary projections and independent lists of confirmed receipt
purchases, shop-recorded installations and work-order opened/current-status
snapshots. Fetch 26/display 25 per source with stable date/ID ordering; retain
receipt currency and label each limit. Do not infer payment, historical status
changes, independently verified repairs or lifetime totals. Exclude private/draft
receipts, require sharing for owner-origin records and deduplicate receipt IDs.
Do not return attachments, storage paths, owner sharing controls or write actions.

Cache by account/customer/native vehicle/source, remount selection across account
or customer changes, suppress signed-out reads and expose independent generic
errors/retries. Test mismatched/revoked links, source scoping, currency/date/null
mapping, caps/ties, late results and all account/customer/vehicle transitions.
Do not reuse the unbounded full-row receipt reader or owner-only history UI.

Separate link-check and activity requests have a revocation race. Snapshot/cache
semantics must be explicit; production acceptance of strict consent-at-read needs
a reviewed invoker join/read contract and disposable authorization regressions,
not another unrestricted definer helper. Current link-policy/owner-transfer
semantics, native mutable membership, the pending direct-installation correction
and full baseline/recovery prerequisites remain separate release gates. This
read contract now has an **unapplied, release-blocked** SQL candidate and 13
memory-only authorization/projection/recovery regressions. See
`evidence/CUSTOMER_VEHICLE_ACTIVITY_READ_CONTRACT.md`. The actual vehicle policies
keep private owner rows unavailable to ordinary linked staff; no widening was
introduced. Existing private receipt access follows current ownership, and
A-to-B-to-A can revive old link approval without a proven tenure invariant. Four
separate retained-source privacy regressions and required transfer/retention gates
are documented in `evidence/VEHICLE_OWNERSHIP_CONSENT_GATES.md`.

The separate authenticated adapter/card slice is now implemented in the customer
detail route. It requires explicit exact-customer vehicle selection; isolates
source caches by account/customer/vehicle; hides stale rows during refresh/error;
and keeps loading, unavailable and visible-empty states separate. The server
rejects an expected-account/middleware-subject mismatch before any RPC, strictly
validates bounded fixed response fields, and retains the authenticated client.
No service fallback, attachments, sharing or write actions are added. See
`evidence/CUSTOMER_VEHICLE_ACTIVITY_UI.md` for semantics, verification limits and
remaining browser/mobile, primary-reader, authority and release gates. The three
reader RPCs are still unapplied. No live database/application release or production
capability is claimed; do not ship the consumer before the compatible reviewed
database/consent/recovery release.

## Primary/detail request boundary (implemented offline; not released)

The customer route now replaces its three older browser queries with a fixed,
request-bound authenticated server reader for customer/vehicles/work orders.
Expected-account mismatch fails before handler reads; lists independently check
customer visibility, strictly validate returned scope/shape and fetch 101/display
100 with honest cap labels. Primary revalidation/error masks all private children;
list revalidation/error hides cached rows/options/counts. A preseeded successful
cache is not current visibility evidence. No grant, SQL, write or service fallback
is added. See `evidence/CUSTOMER_DETAIL_REQUEST_BOUND_READS.md` for verification
and remaining separate-snapshot, other-card, native-authority and release gates.

The next commercial history slice replaces invoice/quote browser reads with
the same caller-bound customer gate and independently fresh bounded snapshots.
It preserves TEXT invoice IDs/dates, sorts by recorded timestamps instead of
arbitrary date text, and labels 26-fetch/25-display limits without implying
lifetime financial totals. No invoice mutation or legacy converter is called.
See `evidence/CUSTOMER_COMMERCIAL_REQUEST_BOUND_READS.md`; communications and
reminder reads/entry integrity remain separate unfinished dependencies.

The communications history slice now uses an authenticated caller-bound read,
strict native vocabulary/field/scope validation and 201-fetch/200-display snapshots.
Refresh/error/unavailable states mask stale rows/counts/cap labels. Recorded staff
labels and statuses are not verified human identity or delivery confirmation.
The known-incompatible logging form is replaced in the review candidate by an
explicit disabled-entry gate; no messages or writes occur. Logging repair remains
a separate trusted-attribution contract. See
`evidence/CUSTOMER_COMMUNICATIONS_REQUEST_BOUND_READS.md` for verification limits,
the observed missing customer/date index and remaining reminder/authority gates.

The reminder read candidate now derives shop scope from the caller-visible
customer, filters by customer and shop, strictly validates 101 fetched rows and
displays at most 100 with independent freshness, errors and explicit caps.
Native text/status values remain unaltered; this is an all-status earliest-due
snapshot, not a complete task queue. Unverified create/complete/delete controls
are disabled in the local review candidate. No production workflow changed.
See `evidence/CUSTOMER_REMINDERS_REQUEST_BOUND_READS.md` (draft PR #30, code
`a2eff76`;706 application tests). The two reads are not atomic: before release,
implement a same-statement invoker customer/reminder join without widening RLS,
then satisfy native authority, trusted entry, recovery/index/load and role/API
acceptance. The preceding actual-source reminder integrity proof (PR #29) passes
169 tooling tests; source-level proof is not live business or entry acceptance.

The same-statement reminder invoker contract is now implemented/tested offline
in draft PR #31 (code `797876c`;22 focused/191 tooling tests). It joins both
customer and shop within one caller snapshot, preserves source RLS, guards only
the new API's execution and includes review-only exact recovery. It is unapplied;
the app adapter still uses two reads and must switch separately before any
compatible approved release. See
`evidence/CUSTOMER_REMINDERS_INVOKER_READ_CONTRACT.md`. This does not resolve
mutable native identity, baseline/recovery, actual API/role/load acceptance or
trusted entry. No application deployment or live database/permission change.

Draft PR #32 (code `dff0aa8`) now switches the reminder adapter to that single
caller RPC, validating the full strict context/envelope and101 rows before100 +
hasMore. Request cancellation is forwarded and SDK retries explicitly disabled;
there is no direct-table or privileged fallback if the unapplied API is absent.
UI/result shape and disabled writes stay unchanged.59 handler +22 UI focused
tests,723 full application tests and full TypeScript pass. Docs `9edbd21` passed
all six CI gates (run `38646246443`), verified on the native diagnostic follow-up.
See `evidence/CUSTOMER_REMINDERS_RPC_ADAPTER.md`. Catalog-only refresh confirms
the API remains absent and approved invoice restriction retained at its dated
snapshot; no live release/record/permission change or new helper approval.

The native identity diagnostic design now has two fixed offline-tested review
queries (17 core counts;10 optional shop/business counts),15 new memory-only
regressions and a dedicated CI gate in draft PR #33 (code `8de974e`), with206/206
full sequential tooling tests and independent review passing. Docs `1b0696f`
passed all six CI gates (run `38648993208`), verified on the staff-trigger follow-up.
No production count/plan or installed RPC,
guard or repair is supplied. See `evidence/NATIVE_IDENTITY_COUNT_DIAGNOSTIC.md`.
Next is the unchanged-source staff/chat/native transaction rehearsal with actual
status CHECKs and all observed staff triggers, before a companion guard; see
`evidence/NATIVE_STAFF_TRIGGER_REHEARSAL_PLAN.md`. Narrow catalog metadata is not
complete native authority/offboarding, applied parity or production acceptance.

Draft PR #34 (code `ce4127e`;9 focused/215 full tooling tests) now implements that rehearsal:
both real status-CHECK failures roll back relevant state, while no-op/identity-
retarget/owner-delete/multi-roster behaviors expose remaining contract gaps.
No source constraint or production workflow changed. Selected dated metadata
correspondence is not global permission/writer or hosted API acceptance. See
`evidence/NATIVE_STAFF_TRIGGER_COMPOSITION_PROOF.md` for exact evidence/limits and
the next conservative inventory/companion-contract slice before any guard release.

That conservative inventory increment now declares concrete chat/timestamp/
work-location/incoming writer paths in draft PR #35 (code `8e52323`), a strict evidence projectRef identity adapter
and an explicit offboarding/audit unknown. Documentation head `d7fb4cc` passed
all six CI gates (run `38651770280`), verified on the chat-policy follow-up.
26 metadata tests pass; all mandatory
table facets and release/parity/baseline flags remain unreviewed/false. No source
SQL, live query, API or permissions change. See
`evidence/NATIVE_STAFF_DEPENDENCY_INVENTORY.md`. Next is selected current chat
policy/helper/incoming-attachment metadata and corresponding disposable policy
composition, then the offline companion contract; no production guard is released.

Draft PR #36 (code `a5e141d`) now compares the selected current chat policies and
incoming attachments and rehearses actual chat DDL/helpers/policies offline.
16 policy +5 artifact/source-pin tests and 241 full sequential tooling tests pass;
independent review is clean. Raw constant writes differ from scoped/returning
updates, so the app's current request shape cannot substitute for a database
authority contract. Dated metadata/function body matches are not live incidents,
full writer/role closure, mitigation or deployment. No migration or production
permission/data/history change. Documentation head `2844477` passed all six CI
gates (run `38654334163`), verified on the writer follow-up.
See `evidence/NATIVE_CHAT_MEMBERSHIP_POLICY_PROOF.md`.
Next is the six source chat writer/message/notification boundary in
`evidence/NATIVE_CHAT_WRITER_REHEARSAL_PLAN.md`, then the offline companion guard
contract; native authority, baseline/recovery, consent/OCR/pilot and hosting gates
remain open. The recurring heartbeat continues; no duplicate automation is added.

Draft PR #37 (code `0d5ada9`) now rehearses the six chat writers and actual
message/notification side effects with 15 focused +3 artifact tests and 259 full
sequential tooling tests passing; independent review is clean. All eleven
selected functions and four attachments match dated metadata. Both fanouts,
invoker timestamp RLS, void no-ops, duplicate invitation rows, notification-id
guard omission and real atomic rollback are characterized, not production fixes
or notification delivery. Source/ACL boundaries and synthetic sender-profile
support remain explicit in `evidence/NATIVE_CHAT_WRITER_COMPOSITION_PROOF.md`.
Documentation head `1abcab4` passed all six CI gates (run `38656320823`), verified
on the messaging follow-up. Independent hosting still fails. No migration,
application/production permission/data/history change or deployment occurs.

The bounded caller acknowledgement/error/late-context candidate (strict
UUID/count responses, no false read success after resolved RPC errors, no
row-confirmation claim from void, refresh-before-retry ambiguity) is now implemented
locally; verification/publication is recorded in the completion checklist and
`evidence/MESSAGING_REQUEST_CONFIRMATION.md`. It changes no SQL or native authority.
Next is the offline native companion authority/offboarding contract. All native identity,
baseline/recovery, consent/OCR/pilot, real API/concurrency/role and hosting release
gates remain open; the recurring follow-up is not a completion or revenue promise.

Draft PR #38 (code `22c2724`) now implements the six chat caller confirmation/
context slice: original HTTP status is preserved in a no-retry fixed-bearer
server transport, UUID/count results are strict, and void stays acknowledged/
effect-unverified. Account/thread/dialog lifetimes suppress late callbacks;
automatic reads no longer invent membership timestamps or loop, and manual unread
is not undone. Browser snapshot reads publish only complete/latest visible reads
and hide prior rows on failure, but remain browser/RLS/capped/non-atomic and show
the previous same-account snapshot during a pending refresh. Excluded DM/offer/
upload/thread-state/direct-message writers and real authority/API/hosting limits
remain explicit in `evidence/MESSAGING_REQUEST_CONFIRMATION.md`.

263 new focused tests; 986 full application tests across 53 files, full TypeScript,
report checker/no quarantine, formatting/diff and zero-error focused lint pass.
Full sequential tooling re-run passes 259/259 (157.79s); no SQL tooling changed.
Independent bounded review is clean after two corrected route regressions.
Code `22c2724` passed all six CI gates (run `38659076609`); docs `14c18d3` also
passed all six (run `38659674559`), verified on the self-shift follow-up.
Hosting still fails separately; migrations/production
deployment skip and the green preview wrapper is not an upload. No SQL, migration, grant, live
business RPC/message, authority repair or deployment is performed.

The next offline dependency is proposed in
`evidence/NATIVE_COMPANION_AUTHORITY_CONTRACT.md`: the full contract is not adopted
or implemented. Its first disposable self-shift-only candidate is now implemented
as research in draft PR #39 (code `62f4c4b`), preserving legacy IDs and all three
actual attachments. 18 focused cases and 277 full sequential tooling tests pass;
the nine original characterization bodies and fixture SQL are unchanged. The
candidate adds identity/self/target guards, an explicit chat UPDATE short-circuit
and deny-only privileged branches, not production authority or app upsert compatibility.
No application, historical SQL/migration or production workflow changes.
See `evidence/NATIVE_SELF_SHIFT_CANDIDATE.md`. Keep unresolved
owner/delegation/provenance/multi-roster positives gated and close trusted team/
native provisioning/role writers before claiming atomic offboarding authority.
Real independent-session concurrency, baseline/storage recovery, consent/tenure,
configuration/role/API acceptance, OCR/mobile pilot and hosting remain open. The
recurring follow-up remains active without duplicate automations or reminders.

Exact next bounded native dependency: current metadata/source composition of
`is_owner_or_admin(uuid)` and `user_belongs_to_shop(uuid,uuid)` with the actual
profile self-insert/update and role-admin policies, including legacy/shadow/global-
role controls. Reuse completed bootstrap evidence rather than repeating it; no
current effective policy/ACL or applied-history acceptance is implied. Then close
ownership claim/transfer, team membership and original-actor shift/audit writers
before approving privileged positives or atomic offboarding. PR #39 code `62f4c4b`
passed all six CI gates (run `38661636502`); docs `6bfde57` also passed all six
(run `38662121967`), verified on the profile/role follow-up. Hosting remains
separately failed; migrations/production deployment skip and no deployment is claimed.

Draft PR #40 (`58a63d6`) now composes the selected current native profile/role
policy boundary with unchanged source and actual relevant constraints. One
reviewed catalog-only SELECT confirms three tables, three helpers and no selected
noninternal attachments; no business rows/counts or application RPCs were read.
The actual roles catalog policy is FOR ALL/non-NULL-current-shop with client CRUD,
not the original SELECT-only policy. Offline profile pivots and catalog-label
changes affect helper authority; this is a security gate, not a fix or live exploit.

22/22 focused and 299/299 full sequential tooling tests pass, plus lint/format/
diff and independent bounded review. Docs `e97baca` passed all six CI gates in
`38664876182`, verified on the roles-catalog follow-up; hosting remains failed
and wrapper migrations/production deployment skip. See
`evidence/NATIVE_PROFILE_ROLE_POLICY_PROOF.md` for exact pins, PG18 NOT NULL/
OID-header normalization and synthetic/legacy/incoming-FK/indirect-writer limits.
Application source remains unchanged from the CI-verified 986-test parent.

Next: verify PR #40's latest checks, then prepare/test the narrow offline native
roles-catalog write restriction with exact preconditions, preserved SELECT and
explicit guarded recovery. It requires separate live approval only after readiness;
the prior converter approval does not apply. Then close mutable profile/bootstrap,
claim/team and shift/audit writers before accepting tenant authority or offboarding.
All baseline/storage, consent/tenure, actual API/concurrency, OCR/mobile/owner pilot
and hosting release gates remain open; no migration or deployment occurs.

Draft PR #41 (`08cd17f`) now implements the memory-only native roles-catalog I/U/D
restriction/recovery candidate. 16/16 focused and 315/315 full sequential tooling
tests pass; formatting/lint/diff and independent review pass. Exact guards preserve
permitted SELECT/helpers/owner/service, and real post-DDL faults roll back. The
process receipt is explicitly caller-fabricable bookkeeping, not production
approval/commit proof/durable provenance. Code CI `38667600224` was superseded;
docs `5ab35ef` passed all six gates (`38667796510`). Hosting failed separately;
wrapper migrations/production deployment skip. No live database call,
app change, migration or deployment; all release flags remain false.

See `evidence/NATIVE_ROLE_CATALOG_CONTAINMENT_CANDIDATE.md`. Next verify PR #41's
latest checks, then build the deny-only direct profiles/user_roles prototype
preserving SELECT and legacy rows, with no contact or manager exception. Direct
restriction is not trusted tenant authority: bootstrap/roster/ownership/team/shift/
audit writers, real concurrency/operator recovery, baseline/storage, consent/tenure,
OCR/mobile/owner pilot and hosting acceptance remain open. Separate live approval
must follow readiness; existing converter authority does not apply to these tables.

The owner subsequently approved both legacy helper EXECUTE restrictions only.
Draft PR #42 (code `9bad6b2`) records tested trusted-path atomic execution
envelopes around unchanged PR #18 SQL and fresh metadata-only release evidence.
The original 17 helper tests plus 22 new envelope/query/recorded-evidence checks
pass (final new combined run 6.146s); lint,
formatting and independent review pass. Both helper restrictions are now applied
and catalog/source verified at 2026-10-15 02:11:58 UTC: anon/authenticated EXECUTE
denied, postgres/service preserved, all four definitions/header/config unchanged,
invoice restriction intact and quote converter unchanged/public. No business
routine/rows/counts, unsafe recovery, data/history repair or application deployment.

Actual remote versions `20261015021118` and `20261015021145` each map exactly to
one stored execution envelope, with separately pinned original embedded bytes.
See `evidence/APPROVED_HELPER_EXECUTE_RELEASE.md` and
`evidence/approved-helper-execution-2026-10-15.json`. Do not rerun those actions or
claim global source-composer adoption; correspondence remains the previous
404/423 with 19 unclassified pending formal composition of these new envelopes.
PR #42 code `9bad6b2` passed all six CI gates (`38669588329`), including the new
regression step/full unit gate; hosting failed separately and wrapper
migrations/production deployment skipped. PR #41 docs `5ab35ef` passed all six
gates (`38667796510`), while its roles
candidate remains unapplied. PR #42 docs `dbdbf01` also passed all six gates
(`38670594609`), verified on the profile/assignment follow-up; hosting failed
separately and wrapper migrations/production deployment skipped. Continue the
offline deny-only direct profiles/user_roles prototype and
remaining indirect-writer authority boundaries. This helper approval does not
authorize native tables/roles or quote conversion. The indirect quote bypass,
baseline/recovery, real API/session/concurrency, OCR/mobile pilot and full-media
hosting gates remain open; heartbeat stays active without duplicate automation.

Draft PR #43 (code `7ce8f19`) now implements the offline deny-only direct native
profiles/user_roles containment/recovery prototype: only authenticated I/U/D on
both tables, preserving SELECT/policies/legacy rows/original roles/native helpers/
owner/service/defaults. No contact or native-admin/owner exception, identity
canonicalization, migration, app change, live database call or deployment occurs.
The fixed-evidence builder reads one bounded/pinned local metadata file; its
receipt is explicitly caller-fabricable bookkeeping, not execution/commit/
approval or trusted durable original-state evidence.

19/19 focused cases and 356 total tooling/receipt-asset checks pass in consecutive
sequential commands (346 CI-tooling plus10assets), no failures/skips/cancellations;
syntax/lint/format/diff and independent review pass. Exact two-table early
topology/ordered-lock/pre/post guards, partial-first-DDL and actual own-postcheck
rollback faults are rehearsed. A generated OID-array comparison defect was fixed
before passing runs, without changing original source/constraints. See
`evidence/NATIVE_PROFILE_ASSIGNMENT_CONTAINMENT_CANDIDATE.md` for exact pins and
limits. The parent's latest PR #42 docs `dbdbf01` passed all six gates; this
slice's documentation head `3bf5f43` now passed all six gates (`38673257097`),
verified on the staff-sync follow-up; hosting remains separately failed and
migrations/production deployment skipped. No production authority is inferred.

The separate roles-catalog restriction remains unapplied, so the original catalog
stays writable. This candidate requires
its original metadata, not automatic composition with PR #41's restriction.
Privileged roster/native/bootstrap/ownership writers still bypass direct client
table ACLs. Next close the original-actor business_staff-trigger to latest
sync_business_staff_member writer boundary with actual chat/no-op effects, then
trusted ownership/team/shift/audit dependencies before management positives or
valid offboarding. Preserve the three live legacy restrictions without replay.
No live table authority or release readiness is inferred; baseline/recovery,
API/session/concurrency, consent/tenure, OCR/mobile/owner pilot and full-media
hosting remain open. Recurring continuation stays active without duplication.

Draft PR #44 (code `aad4f26`) now implements/tests the memory-only selected native
staff-sync endpoint deny-all prototype. One distinctive 42501 precedes all reads/
writes for every caller; original header/defaults/tail/ACL, the later boundary
wrapper and three attachments remain unchanged. No trusted-human attribution,
manager/service/NULL exception, full roster containment or production mitigation
is inferred. Exact before/after guards, explicit unsafe source-body recovery and
trusted `pg_catalog,pg_temp` type parsing are local research, not release authority.

Final 19/19 focused tests pass (24.359s); full tooling/receipt-asset regression
passes 375 total in consecutive serial commands (365 CI-tooling plus 10 assets),
no failures/skips/cancellations. Independent review corrected returned-row/stored-
shift and temporary-type controls; original source/constraints remain unchanged.
Tests distinguish client EXECUTE/body denial, actual wrapper/no-op/upsert/owner
paths, earlier chat effects with full business rollback, real prior CHECK failures,
own postguard versus outer-transaction faults, drift and exact unsafe recovery.
Identity/shift-only chat bypasses remain explicit; PR #39 composition has a tested
specific install/recovery order, not automatic ACL-prototype adoption.

See `evidence/NATIVE_STAFF_SYNC_CONTAINMENT_CANDIDATE.md` for pins and limits.
PR #43 docs `3bf5f43` passed all six gates; PR #44 docs `14e92c9` now also passed
all six (`38675678245`), verified on the ownership follow-up. Hosting remains
separately failed and migrations/production deployment skipped. Migration
impact/live DB calls/deployment for that prototype: none. Preserve the three
applied helper restrictions without replay. Next recover and compose ownership-
claim/transfer guard/audit provenance before native owner positives, then trusted
team/original-actor shift/audit and other writers. Error-free zero-row browser
transfer and later unchecked reviewer stamping are not confirmed/audited transfer.
No baseline/parity/release flag changes; all existing recovery/consent/tenure/
API/session/concurrency/OCR/mobile/full-media hosting gates remain open.

Draft PR #45 (code `340f2ca`) now characterizes the selected unchanged ownership-
claim/guard/audit path offline. One read-only catalog transaction confirms approval
is still service/SQL-owner only and records selected current metadata; no customer
rows/counts, business helper call, DDL/grant/data/history change or deployment.
19 focused tests and 394 full tooling/receipt-asset tests pass in consecutive
serial commands (384 CI-tooling plus 10 assets). Main source/test and independent
metadata/document review pass; latest CI needs its own head verification.

Zero-row ordinary approval, repeated/rejected approval and NULL/stored-reviewer
attribution are source behaviors, not accepted business policy or production
incidents. The actual claim/audit constraints, twelve policies and four selected
attachments remain unchanged. Eight other business attachments—including the
owner-intent/global profile/audit chain—are excluded rather than stubbed, so full
owner transaction/native reconciliation is not established. No original-human
authority, migration provenance or baseline/parity/release flag is promoted.

See `evidence/NATIVE_OWNERSHIP_CLAIM_COMPOSITION_PROOF.md` for exact scope/pins.
The separate browser confirmation/lifetime handoff is now implemented in PR #46
below. Next close actual owner-intent/derive/global-role/profile/audit and atomic attributable claim/transfer
dependencies before native owner positives. All recovery/consent/tenure/role/API/
session/concurrency/OCR/mobile/full-media hosting gates remain open. Preserve the
three applied legacy restrictions without replay; recurring continuation remains
active without duplicate automation.

Draft PR #46 (code `8176dc9`) hardens the admin owner-row transfer dialog without
changing database authority: business/prior-owner compare (including NULL), exact
one matching returned id/owner_id, generic unconfirmed-outcome handling/no auto
retry, and account/business/prior-owner/open/search/transfer lifetime isolation.
After observed account/target/lifetime changes, old requests cannot publish private
results or act on the new UI context; transport
abort does not prove server rollback. Success confirms the owner row only, not
audit, staff/native profiles/roles/shop-access reconciliation.

43 new focused tests pass; final full application suite 1,029/1,029 across 54 files
(112.60s), TypeScript, lint/format/diff and independent review pass. Same-run
parent tooling 394/394 passed separately. Latest CI needs its own verification;
no migration/live application call/deployment occurred. See
`evidence/OWNER_TRANSFER_CONFIRMATION_SLICE.md`. Keep owner-intent/global profile/
audit, original-actor/idempotent atomic transfer, real API/session/concurrency,
recovery/consent/tenure/OCR/mobile/full-media hosting gates open. The three applied
legacy restrictions remain preserved without replay, and continuation stays active.

Follow-up verification: PR #45 docs `53350cf` and PR #46 docs `5346779` now
passed all six CI gates (`38678253032` and `38678740970`). Hosting failed
separately and migrations/production deployment were skipped. PR #46 is the
latest fully CI-verified application slice (1,029 tests), not a deployed release.
The next SQL proof composes the owner-intent/profile/admin-audit forward path;
global-role/partner/manual recompute writers remain distinct incoming paths,
not dependencies silently stubbed into derive. No authority, baseline/parity,
recovery or release gate is promoted by these CI results.

Draft PR #47 (code `28cb9e2`) now composes the actual selected owner-intent →
derive → profile UPDATE/admin-audit forward chain offline, reusing PR #45's
unchanged guard/claim fixture. Real seller enum values, five full function
metadata contracts, selected real profile/audit constraints and applicable
attachments are compared with two separate read-only catalog observations.
Client-deny policies and reduced profile/global-role supports are explicitly
synthetic, not actual client authorization or migration provenance acceptance.

21 focused tests and 415 full tooling/receipt-asset tests pass in separate serial
commands (405 CI-tooling plus10assets), no failures/skips/cancellations. Independent
review and lint/format/diff pass; PR #47 needs its own head verification. Actual
target-as-actor attribution, one-argument overload ambiguity, swallowed audit
failure and labelled zero-row profile fault remain source behavior, not repairs.
Real profile/late claim-audit CHECK failures roll back selected earlier effects.
No production business rows/helper calls, mutation, migration or deployment;
two catalog-only observations do not form one atomic live snapshot.

See `evidence/NATIVE_OWNER_INTENT_COMPOSITION_PROOF.md`. Seven excluded business
attachments target other operations; separate manual/global-role/partner writers
and trusted original-actor/pending/prior-owner/idempotent/team/native/shift/audit
authority still need closure. The claim-review ACK/lifetime UI is the next
separate application slice; recovery/consent/tenure/API/concurrency/OCR/mobile/
full-media hosting remain open. Preserve applied restrictions without replay;
no baseline/parity/release flag changes or duplicate continuation automation.

Draft PR #48 (code `59228c5`) now hardens the separate admin claim-review UI:
exact acknowledgement-only feedback, one-flight captured requests, per-claim ACK
and permanent same-account unknown-outcome locks, observed target/masking/ABA
fences, private account-scoped fresh list/audit reads and signed-preview lifetime
isolation. NULL audit actors remain unrecorded rather than being inferred human/
System actions. Refresh never unlocks or attests a review outcome. The backend
handler is byte-unchanged; unchecked separate stamping, row counts/error paths,
idempotency and original-actor/role authority are not repaired by the UI.

39 focused tests pass; final app 1,068/1,068 across 55 files (86.35s), TypeScript,
zero-error/warning lint, formatting/diff and independent review pass. Same-run
tooling 415/415 passed separately, not one production test. PR #47's docs CI has
five gates passed/unit pending and PR #48's code CI is running at capture; later
documentation heads need their own verification. Hosting fails separately and
migrations/production deployment are skipped. No live application test/mutation,
migration, API call or deployment occurred. Exact scope/pins:
`evidence/CLAIM_REVIEW_ACKNOWLEDGEMENT_SLICE.md`.

Next verify latest heads, then close narrowly authorized original-actor/pending/
prior-owner/idempotent atomic decisions with trusted team/native/shift/audit and
separate manual-writer authorization. Real HTTP/JWT/RLS/session/concurrency,
operator recovery/consent/tenure/private retention/OCR/mobile/owner pilot/full-media
hosting remain open; no sparse artifact deploy, baseline/parity/release promotion
or replay of the three applied restrictions. Same-chat scheduled continuation stays
active without duplication or a claim of continuous between-run work.

Follow-up verification: PR #47 docs `8b1b38e` and PR #48 docs `6389eac` now
passed all six CI gates (`38681676475` and `38682112982`). Hosting remains
separately failed; wrappers skipped migrations/production deployment. PR #48 is
the latest fully CI-verified application slice (1,068 tests), not a deployed
release. The next preparatory codec remains unwired until actual atomic authority,
claim-attempt/evidence/tenure revision, native reconciliation and recovery gates
are satisfied. An earlier has_role source-mismatch note is corrected by new
static body mapping; no source history or role authority is thereby adopted.

Draft PR #49 (code `f6bf32e`) adds the UNWIRED preparatory review-command codec
and actual unchanged server-caller characterization. It validates syntax and
separate supplied-actor equality and produces frozen canonical bytes/fingerprint;
no route/handler/RPC/ledger/authority/revision or confirmed receipt is implemented.
The owner A→B→A case explicitly demonstrates that matching values are not a
trusted claim/evidence/ownership revision. Legacy errors/zero rows/NULL-count
reset and separate stamping remain characterized gaps, not repairs.

Final 45 focused tests (25 codec + 20 handler), full app 1,113/1,113 across 57 files
(88.47s), TypeScript, zero-error/warning lint, format/diff and independent review
pass. Tooling 408 plus 10 receipt assets pass separately (418 total); three new
static tests correct the prior has_role mismatch by exact retained-source/body
mapping to both dated observations. Native role prototypes do not prove platform
role assignment authority. Frozen older source/observations are not rewritten.
See `evidence/CLAIM_REVIEW_ATOMIC_CONTRACT.md` for exact pins and proposed gates.

PR #47/#48 docs now passed all six CI gates; PR #49's own latest head needs
verification. Hosting remains failed separately and migration/deployment wrappers
skip; no live DB/application call, schema/history/data mutation or upload. Next
close actual platform-role/auth-bootstrap/referral writer provenance and original
actor custody, trusted claim/evidence/tenure revisions and competing-writer lock
protocol before an atomic kernel or native/consent-reconciled owner positives.
All recovery/API/session/concurrency/OCR/mobile/owner/full-media release gates
remain open; preserve applied restrictions and the single recurring follow-up.

Follow-up verification: PR #49 docs `722f4de` passed all six CI gates
(`38684735093`). The codec remains unwired; this does not verify an atomic
endpoint, original-actor custody, claim revision or production behavior. Hosting
remains separately failed and migration/deployment wrappers skipped.

Draft PR #50 (code `6136701`) now composes the separate platform-role selected
policy/nonstaff referral forward path offline: six actual tables, 15 current
policies, 16 critical constraints, 17 indexes, 13 unchanged helper bodies and nine
attachments match a new privacy-reviewed fingerprint-only dated catalog. The
actual accreditation is July's body, not the later retained September rewrite;
source filename order is not applied lineage. Auth bootstrap/internal helpers and
two auth attachments are fingerprint-mapped, not executed. Synthetic support
projections/admin seeds and actual nonstaff-domain early return are explicit;
no permissive auth/partner stubs or platform authority adoption.

25 composition and seven catalog tests pass; full serial tooling 440/440
(349.896s) then 10/10 receipt assets (0.483s), 450 total in separate commands.
Independent review, syntax/lint/format/diff pass. Real late audit NOT NULL/rep FK
faults verify prior real fanouts and restore selected data/catalog/settings.
Ordinary DML denials versus zero rows, actual sales-assignment visibility,
nullable service audit actor, binding gaps and role UPDATE/DELETE stale/missing
provisioning are characterized, not repaired. Non-row grants are not RLS row
containment. Scope/pins: `evidence/PLATFORM_ROLE_FORWARD_COMPOSITION.md`.

PR #50 code CI `38687514056` is running; hosting failed separately and wrapper
skipped migrations/production deployment. Documentation heads need fresh checks.
One catalog-only live read occurred; no application helpers/API calls, schema/
role/data/history mutation, migration or deployment. Next compose actual auth/
profile/organization INSERT and staff-domain partner paths, incoming role writers,
own-rep/offboarding and original-actor custody, while defining trusted claim/
evidence/tenure revisions and a common writer-lock protocol before an atomic
kernel. Native/consent/recovery/API/session/concurrency/OCR/mobile/owner/full-media
gates remain open. Preserve applied restrictions and the one recurring follow-up.

Draft PR #51 (code `883c505`) now hardens the separate account-creation dialog:
both real 207 envelopes are partial/unknown, exact 200 is acknowledgment-only,
captured one-flight requests and account/config/open/observed ABA/loading/unmount
fences suppress stale work, same-mounted-account unknown locks persist and no
credential/raw diagnostic outcome toast or automatic delivery/retry is emitted.
Known API limits/enums are checked before dispatch; unsupported historical seller
input is blocked without remapping. API, authority and password generation remain
unchanged; actual backend enum/NOT NULL/partial-step/row-count/audit repair is open.

41 focused tests pass; final full app 1,154/1,154 across 58 files (92.42s), full
TypeScript passes. First full run encountered one unchanged security source-scan
timeout; isolated 10/10 and unchanged final full reruns pass without weakening any
gate, timeout or quarantine. Same-run tooling 440 plus 10 receipt assets passed
separately; independent review/format/diff pass and ESLint zero errors/four retained
warnings. Real form primitives/accessibility and parent independent load races,
HTTP/JWT/RLS/credential delivery/audit/cancellation/durable idempotence are not
proved by mocked component tests. Scope/pins:
`evidence/ACCOUNT_CREATION_ACKNOWLEDGEMENT_SLICE.md`.

PR #50 docs `3c153c5` CI is running; PR #51 code CI `38688116687` queued at
capture, hosting failed separately and deployment/migration wrappers skip. Later
docs heads need fresh verification. UI slice adds no live calls/mutations or
deployment; the single live catalog-only read belongs to PR #50. Next verify latest
heads then resume auth/profile/org/partner/incoming-role/offboarding and original-
actor closure plus trusted claim/evidence/tenure revisions/common writer locks
before an atomic kernel. Preserve recovery/consent/native/OCR/mobile/owner/full-
media gates and the single recurring follow-up; do not deploy sparse artifacts.

Follow-up verification: PR #50 docs `3c153c5` and PR #51 docs `681e36c` now
passed all six CI gates (`38687811205` and `38688332298`). Hosting remains
separately failed, and migrations/production deployment were skipped. PR #51 is
the latest verified connected application-source slice (1,154 tests), not a
deployed release or end-to-end provisioning acceptance.

Draft PR #52 (code `e4e099d`) adds the separate fingerprint-only staff-partner
catalog frontier: nine relations/117 columns, with prior PR #50 facets unchanged
as subsets. It exposes real user-referral bounty/assignment attachments and the
nonempty intent frontier; no partner behavior or signup authority is proved by
these observations. Two successful READ ONLY catalog executions, one complete
retained privacy-reviewed artifact at `06:17:10.912953` UTC; no application data,
helper calls, raw definitions/expressions or mutation. Six focused tests and full
serial tooling 446 plus 10 receipt assets pass (456 separate-command total).
Independent query review/syntax/lint/format/diff pass. Evidence/next construction:
`evidence/STAFF_PARTNER_DEPENDENCY_FRONTIER.md`.

Code CI `38692637701` is running; hosting failed separately and deployment/
migration wrappers skip. Verify later docs heads. The subagent account limit was
recorded without retry loops or credit purchases; primary work continued, without
claiming another independent final API review. Next construct the actual bounded
partner wrapper, recover/map auth/org/member source and close nonempty referrals,
incoming/offboarding/original-actor/revision/lock dependencies. No migration,
deployment, baseline/parity/replay/release promotion or restriction replay.

Draft PR #53 (code `b140407`) now corrects the separate account API's row-evidence
gap: same role/profile writes request minimal returned identities; exact requested
roles and one matching profile id are required before normal acknowledgment.
Error/zero/NULL/malformed/wrong/extra/duplicate receipts and known post-Auth promise
failures remain generic partial/unknown, without retry/delete/rollback claims.
Normal 200 and existing 207 shapes remain caller-compatible. Auth/admin ordering,
exact requested writes/schema/domain/password behavior and known seller/NULL gaps
are retained, not new authority or atomic/idempotent provisioning.

53 new handler tests plus 41 unchanged caller cases pass (94 focused); final app
1,207/1,207 across 59 files (92.56s), full TypeScript passes. Serial tooling 446
plus 10 receipt assets pass separately (456 total); format/diff/primary review pass,
lint zero errors/four retained warnings. Subagent usage limits prevented another
independent final API review, not hidden by mock tests. Real HTTP/JWT/RLS/SQL/
trigger/authority/value/delivery/durable-audit/session/concurrency remain unverified.
Evidence/pins: `evidence/ACCOUNT_CREATION_ROW_EVIDENCE.md`.

PR #52 docs `0d925e2` has four gates passed/build+unit pending; PR #53 code CI
`38693453126` is running, hosting failed separately and migration/deployment
wrappers skipped. Later documentation heads need fresh checks. No live calls/
mutations or deployment for the API slice; only PR #52's two catalog-only reads
occurred this heartbeat. Next verify latest heads then complete actual partner/
auth/profile/org/member and nonempty referral/incoming/offboarding/original-
actor/revision/lock dependencies before model/atomic kernel adoption. Preserve
native/consent/recovery/receipt/mobile/owner/full-media gates and single continuation.

Follow-up: PR #52 docs `0d925e2` and PR #53 docs `c18cc62` now passed all six CI
gates (`38693190311`, `38693787258`). PR #53 is the latest verified connected
application-source slice (1,207 tests), not deployed or full provisioning proof.
Both separate hosting checks failed; migration/production wrappers skipped.

Draft PR #54 (`e4348cf`) now adds the actual staff-domain partner forward
composition around unchanged PR #50, with unchanged PR #52 fingerprints. Nine
real tables/117 columns/28 constraints/28 indexes/27 policies, fifteen actual
functions and twelve selected attachments match. The real partner wrapper SELECT
executes on an EMPTY actual user-referrals table; no intent-helper stub or nonempty
referral/writer-fanout coverage is claimed. Creation/reactivation/existing email/
application branches and late genuine partner NOT NULL/PK rollback/recovery pass.
Mismatched binding reactivation, permissive application claims and stale selected
offboarding remain unadopted behavior, not fixes. 29 focused and 485 tooling/assets
pass (475 serial plus separate 10), no failures/skips/cancellations. Dedicated CI,
primary review/syntax/lint/format/diff pass; quota-blocked agents were not retried.
Evidence: `evidence/STAFF_PARTNER_EMPTY_REFERRALS.md`. No live query, migration,
mutation, deployment, paid resource, data deletion or customer communication.

Next bounded dependency: map/recover auth/profile/org/member/settings/subscription/
member-sequence source and exact catalog, including missing original organization
DDL and creator-owner trigger provenance, before composing bootstrap. Separately
close nonempty referral intent/profile/admin-audit/bounty/assignment fanouts and
critical constraints, then original-actor/revision/lock/incoming/offboarding/native
authority before any atomic kernel adoption. Baseline/replay/parity/release flags
remain false; preserve all native/consent/private-history/receipt/mobile/owner/
full-media/recovery acceptance gates and the existing single continuation.

PR #54's fresh full application regression also passes, 1,207/1,207 in 59 files
(93.25 seconds), and full TypeScript passes. Code CI `38696532588` has OCR/lint/Parts passed, build/type/unit
pending; hosting `6f0e6469-b986-4938-bbaa-418a361b69ab` failed separately and
wrapper `38696532720` skipped migrations/production deployment. Verify later docs
HEAD separately; no passing build/preview wrapper constitutes deployment.

PR #54 docs `b415d4b` now passed all six CI gates (`38696845832`), verified on
the auth/bootstrap follow-up; hosting failed separately and migrations/production
deployment skipped. This supersedes its in-progress snapshot above.

Draft PR #55 (code `34cea88`) adds the bounded auth/bootstrap fingerprint and
retained-source frontier: six tables/123 columns/25 constraints/22 indexes/24
policies/15 triggers/29 functions/six enums and one exact-text sequence envelope.
25 public bodies match nineteen pinned source files; three original org helpers,
org/member/org-role DDL and external member-tier constraints remain explicit gaps.
Two READ ONLY executions, retained/privacy-reviewed at `07:22:41.479679` UTC;
first unpublished local bigint-rounded artifact discarded before exact-text
recapture. No application/auth rows/counts/helper/raw definition or sequence-current
reads, mutation, migration or deployment. Eleven focused and 496 tooling/assets
pass (486 serial plus separate 10), no failures/skips/cancellations. Syntax/lint/
source+Markdown formatting/canonical JSON/diff/primary review pass. No fresh app
run is claimed; PR #54's 1,207 tests, TypeScript and CI are parent evidence only.
Newest PR #55 checks need independent verification. Evidence and exact source
boundaries: `evidence/AUTH_BOOTSTRAP_DEPENDENCY_FRONTIER.md`.

Next prepare privacy-gated selected org definition recovery, not a general schema/
data dump or history adoption; compose actual no-referral bootstrap with all
critical profile/org/membership/plan/subscription/sequence/intent/admin-audit effects.
Independently close member-tier/nonempty-referral writers. Matched trial `<> ANY`
logic and staff NULL/enum mismatch remain uncorrected release blockers, not new
signup/production acceptance. Original actor/revisions/locks/offboarding/native/
consent/recovery/receipt/mobile/owner/full-media gates remain open; no sparse deploy,
helper restriction replay, paid resource, customer message, data deletion or
duplicate automation. Source/replay/baseline/parity/release flags stay unchanged.

PR #55 docs `ec8ea7a` now passed all six CI gates (`38699776700`); hosting
failed separately and migration/production deployment skipped. Draft PR #56
(code `51cb641`) then recovers exactly the three missing current org function
definitions behind pinned fingerprint/header/privacy guards. One successful READ
ONLY source recovery at `07:38:31.452256` UTC, reviewed before retention, no
app/auth rows/counts/helper/sequence/settings/config values or mutation. This
logical heartbeat totals three successful read-only diagnostic executions across
the two slices, not live application behavior. Eleven focused and 507 tooling/
receipt-assets pass (497 plus separate 10), zero failures/skips/cancellations;
syntax/lint/source+Markdown format/canonical JSON/diff/primary review pass.
No fresh application suite is claimed for these source-only changes; PR #54's
1,207 tests/TypeScript remain verified parent evidence. Newest PR #56 CI needs
its own verification. Evidence: `evidence/ORG_FUNCTION_SOURCE_RECOVERY.md`.

Current-source gap closed, original migration/DDL provenance still open: owner/
admin membership management and creator conflict UPDATE-to-owner are actual
source behavior, not authorized business/native authority. Next selected current
org/member/org-role structure and member-tier metadata/source, including actual
`common` tier default, then no-referral bootstrap with real critical constraints,
plans/subscriptions/sequence/intent/admin-audit effects. Do not re-recover the three
definitions, remove FKs or substitute helpers. Nonempty referrals, trusted actor/
revision/locks/offboarding/native/consent/private-history/recovery/receipt/mobile/
owner/full-media/release acceptance stay open. No deployment, migration, paid
resource, customer message, data deletion, PR merge, restriction replay or duplicate
automation; the existing single recurring continuation remains active.

PR #56 docs `7b46012` now passed all six CI gates (`38701375439`); hosting
failed separately, with production/migrations skipped. Draft PR #57 (`e859bed`)
recovers current org/member/tier structure: three tables/39 columns/10 critical
constraints/eight indexes/nine policies/three attachments/nine function envelopes/
four enums/78 guarded structural pieces. One READ ONLY execution at
`07:59:37.940729` UTC, privacy-reviewed before saving, no app/auth/config rows or
counts/helper calls/function bodies/settings/sequence values or mutation. Prior
org/member facets/functions/types are unchanged; actual tier CREATE/policy source
is selected/pinned without seeds/backfills. Current-catalog org/member reproduction
is explicitly not original migration source, accepted baseline or authority.

The empty disposable structure fixture matches columns/defaults/NOT NULL/PK/
UNIQUE/FKs/delete actions/indexes/enum/ACL/RLS exactly. Policies/functions/trigger
attachments are deliberately not installed and persistent writes violate the
fixture invariant. No helper stub or workflow acceptance. Twelve focused and 519
tooling/assets pass (509 serial plus separate 10), zero failures/skips/cancellations;
syntax/lint/source+Markdown format/canonical JSON/diff/primary review pass. No fresh
application run claimed; PR #54 1,207 tests/TypeScript remain parent evidence. New
PR #57 requires latest-head checks. Evidence: `evidence/ORG_TIER_STRUCTURE_RECOVERY.md`.

Next full profile/settings/plan/subscription structural recovery and actual ordinary
no-referral bootstrap with business-owner read, intent/admin-audit, tier/common,
member sequence and genuine critical constraints/defaults. Do not re-recover current
org/tier or the three org functions, invent success stubs, weaken FKs or adopt catalog
source as original history. Actor/revision/locks/offboarding/native/consent/private-
history/recovery/receipt/mobile/owner/full-media/release gates remain open. No live
migration/mutation/deploy, paid resource, customer communication, data deletion, PR
merge, restriction replay or duplicate automation; single continuation stays active.

PR #57 documentation head `27b3d70` now passed all six CI gates (`38704489116`);
hosting failed separately, migrations/production skipped. Draft PR #58 (`734d3b4`)
then recovers the remaining profiles/settings/plans/subscriptions structure:
4 tables/90 columns/17 critical constraints/16 indexes/16 policies/10 attachments/
29 function envelopes/5 enums/165 guarded pieces, all prior facets unchanged.
One READ ONLY diagnostic at `08:23:01.783433` UTC, reviewed before retention;
no app/Auth/config rows/counts, raw function bodies, helper/sequence operations,
settings values or mutation. No source history or authority adoption.

The new empty disposable fixture composes unchanged PR #57 org/member/tier
structure with the four core tables: seven tables/129 columns/27 critical
constraints/24 indexes and exact PR #55 sequence configuration/ownership/ACL.
All genuine defaults/NOT NULL/FKs/CHECKs/UNIQUEs remain; only validated backed
PG18 NOT NULL catalog normalization. No policies/helpers/attachments installed;
public and synthetic Auth tables must stay empty. No signup/authority acceptance
or single atomic production baseline is inferred. Thirteen focused and 532
tooling/assets pass (522 serial plus separate 10), zero failures/skips/cancellations;
syntax/lint/source+Markdown format/canonical JSON/diff/primary review pass. No fresh
application run claimed; PR #54's 1,207 tests/TypeScript remain parent evidence.
New PR #58 requires latest-head checks. Evidence:
`evidence/BOOTSTRAP_CORE_STRUCTURE_RECOVERY.md`. Zero migration/mutation/deployment.

Exact next dependency: close actual business-owner read and admin-audit metadata/
source, then compose ordinary no-referral Auth bootstrap with actual profile/org/
membership/subscription/intent/audit effects and tier/plan/sequence prerequisites.
Do not repeat completed core/org/tier/three-function recovery, erase FKs, replay
configuration seeds or substitute success helpers. Business-trial ANY logic and
staff seller NULL/enum mismatch stay uncorrected release blockers. Nonempty referral
writers, trusted actor/revisions/common writer locks/offboarding/native/consent/
private-history/recovery/receipt/mobile/owner/full-media/hosting acceptance remain
open; source/baseline/replay/parity/release flags unchanged. No sparse deploy,
helper replay, paid resource, customer message, data deletion, PR merge or duplicate
automation; existing single continuation remains active.

PR #58 docs `018fd26` now passed all six CI gates (`38706843133`); hosting
failed separately, migrations/production skipped. Draft PR #59 (`ed256f5`)
recovers full businesses/business_types/admin-audit structure: 79 columns,
11 critical constraints/23 indexes/12 policies/10 business attachments/18 function
envelopes/3 enums/147 gated pieces. Two READ ONLY diagnostics at `08:40:15.535109`
and `08:42:08.249322` UTC (metadata first, then hash/privacy-gated definitions),
reviewed before saving; no app/Auth/config rows/counts/raw function bodies/helper/
sequence/settings values or mutation. All between-capture facets and prior
critical constraints match. Current-catalog businesses DDL is not original history.

Actual selected retained type/audit DDL without seeds plus full current businesses
extends unchanged PR #58 to ten empty public tables/208 columns/38 critical
constraints/47 indexes and prior exact sequence configuration. No policies/helpers/
attachments installed; parent and child invariants retain exact structural facets
and empty declared tables. Business owner_id and audit actor UUIDs have no Auth FK;
their storage is characterized, not trusted actor/authority acceptance. Sixteen
focused and 548 tooling/assets pass (538 serial plus separate 10), zero failures/
skips/cancellations; syntax/lint/source+Markdown format/canonical JSON/diff/primary
review pass. No fresh app run claimed; PR #54 1,207 tests/TypeScript remain parent
evidence. New PR #59 requires latest-head checks. Evidence:
`evidence/BOOTSTRAP_BUSINESS_AUDIT_STRUCTURE.md`. Zero migration/mutation/deployment.

Next implement actual ordinary no-referral Auth bootstrap behavior using full
ten-table structures and retained actual functions/attachments, staff_referrals
rowtype, canonical manager initializer, tier/plan/sequence, business read and real
intent/admin-audit effects, with explicit synthetic provider/configuration limits
and genuine late-failure rollback. Do not repeat completed structural/function
recovery, strip constraints or stub helpers. Nonempty referrals, business writer
fanouts, original actor/revisions/common locks/offboarding/native/consent/private-
history/recovery/receipt/mobile/owner/full-media/hosting acceptance stay open;
trial ANY logic and staff seller NULL/enum mismatch remain release blockers.
Source/baseline/replay/parity/release flags unchanged. No live mutation/migration/
deploy, paid resource, customer message, data deletion, PR merge, restriction replay
or duplicate automation; existing single continuation stays active.

PR #59 docs `45b1971` now passed all six CI gates (`38709262357`); hosting failed
separately, production/migrations skipped. Draft PR #60 (`099b706`) executes actual
ordinary nonstaff/no-referral Auth→profile/org/owner/subscription/intent-audit
forward chain in discarded databases. Unchanged full ten-table structure plus
actual empty staff rowtype: eleven public tables/219 columns/42 critical constraints/
52 indexes, all 21 current full function envelopes and fifteen attachments exact.
No Auth uid or global-role/referral/partner success substitute, source replay or
live query/mutation. Provider Auth four-field support and tier/plan configuration
are explicitly synthetic; client policies/business/staff writer attachments are
omitted. This is not provider/API/trusted actor/native whole-workflow acceptance.

Runtime structural guards detect dropped FKs/unrestored defaults before outer
rollback can conceal drift. Missing tier, invalid metadata, real org UNIQUE and
late subscription NOT NULL failures restore all row snapshots and recover. Local
member sequence allocation does not roll back with rows; gaps are explicitly
tested, not hidden. Audit swallowing/target-as-actor, inactive Bronze grants,
trial ANY bug, editable org suppression and lab entitlement conflict suppression
remain characterized legacy behavior, not repairs/adopted policy.
Twenty-two focused and 570 tooling/assets pass (560 serial plus separate 10), zero
failures/skips/cancellations; syntax/lint/source+Markdown format/diff/primary review
pass. No fresh app run claimed; PR #54 1,207 tests/TypeScript remain parent evidence.
New PR #60 requires latest-head checks. Evidence: `evidence/AUTH_NO_REFERRAL_BOOTSTRAP.md`.
Zero live query/mutation/migration/deployment, paid resource or customer message.

Next actual nonempty user_referrals INSERT fanouts: reuse PR #52 metadata,
recover/match pp_user_signup_bounty/tg_auto_assign_sales_rep and real downstream
financial/assignment/intent constraints/functions/attachments before composition.
Then staff-domain Auth/platform-role/staff/partner integration with genuine
canonical org/manager inputs and trusted original actor/revisions/common locks/
offboarding/native acceptance. Do not repeat completed ordinary/full-schema/current
org-function recovery, strip constraints or stub dependencies. Source/baseline/
replay/parity/release flags unchanged; trial/staff enum, consent/private-history/
recovery/receipt/mobile/owner/full-media/hosting gates remain open. No sparse deploy,
restriction replay, data deletion, PR merge or duplicate automation; single
recurring continuation stays active.

PR #60 docs `3f48b40` now passed all six CI gates (`38713945751`); hosting failed
separately and migrations/production skipped. Draft PR #61, code `9cbd673`, closes
the bounded nonempty user_referrals INSERT bounty/assignment frontier using real
retained functions and full financial DDL. Two READ ONLY diagnostics at
`09:44:45.633371` / `09:45:26.830475` UTC recover/match 30 financial columns,
12 critical constraints/6 indexes/4 policies/1 attachment/7 function envelopes
and 57 reviewed hash/privacy-gated pieces; no data/Auth/config rows/counts, raw
function bodies, helper invocation or live sequence/settings values. Immutable
PR #54 extension retains 11 actual tables/139 columns/40 critical constraints/
34 indexes/31 policies/15 attachments/19 public function envelopes; synthetic
Auth/profile/GUC/role supports remain explicit, not full Auth or accepted actor.

Twenty-two focused tests pass (28.614 seconds); full serial tooling 582/582 passes
(435.252 seconds), then 10/10 receipt assets (0.333 seconds): 592 aggregate, zero
failures/skips/cancellations. Syntax/lint/format/canonical JSON/diff/primary review
pass. No fresh application run claimed; PR #54 remains parent evidence.
Late assignment failure restores earlier bounty/referral; drift checks precede
outer rollback. Recredit/NULL-source/case-variant credit, inactive/exact-sales
assignment and all-status/cross-partner/negative payout gaps are characterized,
not accepted financial or authority policy. Actual missing partner intent fails
without a stub. New PR #61 needs latest-head checks. Evidence:
`evidence/REFERRAL_FINANCIAL_FORWARD.md`. Zero live mutation/migration/deployment.

Next combine actual ordinary nonempty Auth referral and partner intent using
PR #60 full structures and this real source/fanout, retaining constraints and
genuine rollback/local sequence behavior. Recover actual provider Auth uid if
reached, not the synthetic GUC support. Then staff-domain Auth/roles/staff/partner/
canonical org/manager and original actor/revisions/common locks/offboarding/native
acceptance. Completed financial/ordinary/full-schema recovery need not repeat.
Source/baseline/replay/parity/release flags and receipt/mobile/owner/consent/private
history/recovery/full-media/hosting gates unchanged. No sparse deploy, approved
restriction replay, paid resource, customer message, data deletion, PR merge or
duplicate automation; single recurring continuation stays active.

PR #61 docs `e9de502` passed all six CI gates (`38717396103`); hosting failed
separately and production/migrations skipped. Draft PR #62, code `8906446`, now
composes actual ordinary nonstaff Auth INSERT through full profile/org/owner/
Bronze/intent-audit/referral/bounty/assignment and actual nonempty partner-intent
callbacks. Immutable PR #60/#61 source/structures yield 18 actual public tables,
322 columns/72 critical constraints/74 indexes/26 full public function envelopes/
22 attachments. No reduced profiles or Auth uid/JWT/has_role/intent success stub.
Four-field Auth/tier/plan supports and preexisting fixture referrer role/staff/
accreditation inputs remain explicit, not hosted provider/client/staff provisioning
or trusted/native authority. Zero live query/mutation/migration/deployment.

Twenty focused pass (36.407 seconds); full serial tooling 602/602 passes
(485.089 seconds), then 10/10 receipt assets (0.325 seconds): 612 aggregate, zero
failures/skips/cancellations. Syntax/lint/format/diff/primary review pass. No fresh
application suite claimed; PR #54 remains parent evidence. Late bounty/assignment
failures restore all eighteen public tables/Auth rows, local sequence gaps remain
visible and original configuration/defaults recover. Full-profile/Auth/FK/sequence/
ACL/attachment/policy/shim postflight guards precede rollback. Real partner rename
can leave old-code intent stale; DELETE cascades commission ledger while keeping
referral/assignment; audit target-as-actor/active-change mislabeled/audit swallowing
and previous financial/authority gaps remain blockers, not approved rules.
Evidence: `evidence/AUTH_REFERRAL_INTENT_BOOTSTRAP.md`. PR #62 needs latest checks.

Next actual staff-domain Auth/platform-role/staff/partner/canonical-org/manager
composition with genuine prerequisites and complete schemas/writer attachments.
Recover actual provider Auth uid if reached, not a GUC substitute; test genuine
late failures/rollback. Then original actor/revisions/common locks/offboarding/
native acceptance. Ordinary full Auth/referral/partner intent and financial/full-
schema/org recovery need not repeat. Static canonical admin/editable manager/staff
seller enum/trial ANY, source/baseline/replay/parity/release and receipt/mobile/
owner/consent/private-history/recovery/full-media/hosting gates remain open. No
sparse deploy, restriction replay, paid resource, customer message, data deletion,
PR merge or duplicate automation; single recurring continuation stays active.

PR #62 docs `9425099` passed all six CI gates (`38721062998`); hosting failed
separately and production/migrations skipped. Draft PR #63, code `d59b24e`,
recovers actual provider auth.uid() with one READ ONLY guarded source diagnostic
at `10:40:55.605099` UTC. Complete prior envelope plus independent privacy/size/
literal checks permit its reviewed 274-byte definition; exact header/body/owner/
ACL/effective execute match locally. No Auth/app/config rows/counts, settings/JWT/
sequence values or helper invocation read. Its schema grants/role flags and
unsigned request settings are explicit lab supports, not original-human/session
or whole provider/native authority proof, and not the earlier uid stub.

Separately, actual staff Auth SQL against unchanged PR #62 full schema confirms
genuine missing-manager FK/late subscription failure, complete eighteen-table/
Auth rollback, local sequence gaps and original-input/default recovery. Current
staff source can flag unconfirmed accounts, derive private/buyer/founding Bronze,
accept ordinary metadata-selected managers and leave roles/staff/partners absent
after confirmation. Earlier staff seller NULL/enum concern is not reproduced in
this current Auth branch, not a claim every variant fixed. These are policy/
authority/entitlement gaps, not accepted role provisioning. Twenty-six focused
pass (23.084 seconds), syntax/lint/format/canonical JSON/diff/primary review pass;
full serial tooling 628/628 passes (508.675 seconds), then 10/10 receipt assets
(0.298 seconds): 638 aggregate, zero failures/skips/cancellations. No fresh
application suite claimed; PR #54 remains parent evidence. Evidence:
`evidence/PROVIDER_UID_STAFF_AUTH_PREREQUISITES.md`. PR #63 needs latest checks.

Next compose remaining actual staff audit/sales profile/territory full schemas,
role/staff writer functions/attachments (PR #50/#54), full PR #62 Auth and now
recovered actual provider uid, retaining genuine canonical-manager/org inputs,
all constraints and late rollback/local sequence behavior. Do not repeat completed
source/prerequisite/ordinary/financial/full-schema recovery or adopt unsigned lab
subjects as actors. Real role provisioning is separate from confirmed staff Auth.
Then original actor/revisions/common locks/offboarding/native acceptance. Source/
baseline/replay/parity/release and all financial/consent/private-history/recovery/
receipt/mobile/owner/full-media/hosting gates unchanged. No live mutation/migration/
deploy, paid resource, customer message, data deletion, restriction replay, PR merge
or duplicate automation; single recurring continuation remains active.

Full staff writer follow-up, code `5e748d2`, branch
`security/full-staff-writer-composition`, based on PR #63 docs `a188571`:
actual provider uid and platform role/staff/audit/sales/territory writers now
compose with unchanged full PR #62 Auth/referral/partner intent. Verified 21 full
public tables/347 columns/78 critical constraints/81 indexes/37 public function
envelopes plus provider uid/30 complete attachments. Current ACLs preserved;
no client-policy adoption or identity/profile/intent substitutes. Genuine canonical
manager/org configuration, full constraints, late failures/all-row rollback and
local sequence gaps remain explicit. Twenty-three focused pass (31.604 seconds),
syntax/lint/format/diff/primary review pass; full serial tooling 651/651 passes
(524.422 seconds), then 10/10 receipt assets (0.365 seconds): 661 aggregate,
zero failures/skips/cancellations. Focused tests included, not double-counted.
Evidence: `evidence/FULL_STAFF_WRITER_COMPOSITION.md`. Zero live query/mutation/
migration/deployment; not original-human/JWT/native authority/provisioning/consent/
offboarding acceptance. Separate role creation can accredit unconfirmed staff;
removing sales role leaves active staff/partner/sales/territory/prior assignment
state. Staff audits read actual uid but real nonempty partner intent still uses
target-as-actor. These are blockers characterized, not professional policies adopted.

PR #63 docs `a188571` passed all six CI gates (`38724707790`); hosting failed
separately and migrations/production skipped. Verify the new publication HEAD's
own checks. Next actual claim/evidence/reviewer/ownership writer boundary recovery/
composition from PR #45/#47 on this full foundation, then trusted original actor/
revisions/common locks/idempotency/team/native/offboarding candidate. Internal-staff
caller acknowledgment/lifetime is independent safe app work, not new authority.
Do not repeat completed uid/prerequisite/ordinary/full-schema/financial/staff writer
recovery or promote unsigned lab subjects/service/global-admin positives. Source
404/423, nineteen unclassified; all source/baseline/replay/parity/release and
financial/consent/privacy/recovery/receipt/mobile/owner/full-media/hosting gates
unchanged. No sparse deploy, restriction replay, paid resources, customer messages,
production deletion, PR merge or duplicate automation; single continuation active.

Full claim/evidence/ownership follow-up: code `dfac9d9`, branch
`security/full-claim-evidence-composition`, based on PR #64 docs `5de2189`.
One READ ONLY metadata diagnostic at `11:41:19.388797` UTC recovers full three
claim tables, 31 columns/11 critical constraints/10 indexes/8 policies/4
attachments/8 function envelopes, with no app/Auth/config/storage rows/counts,
raw bodies/defaults/config/expressions, paths/content, helper calls or live settings/
sequence values. Current retained source/complete schema matches locally.
Full Auth/staff plus claim/evidence/owner UPDATE: 24 public tables/378 columns/
89 critical constraints/91 indexes/43 public function envelopes plus provider uid/
37 selected attachments. No projected business/Auth/profile/role/identity supports
or legacy client-policy/privileged-positive adoption. Seven non-owner business
attachments, native/team sync and storage custody remain excluded, not stubbed.
Twenty-five focused pass (36.094 seconds), syntax/lint/format/canonical JSON/diff/
primary review pass; full serial tooling 676/676 passes (598.845 seconds), then
10/10 receipt assets (0.283 seconds): 686 aggregate, zero failures/skips/cancellations.
Focused included, not double-counted. Evidence:
`evidence/FULL_CLAIM_EVIDENCE_COMPOSITION.md`. Late genuine failures restore all
24 public/Auth rows; zero-change approval, ignored pending/owner revisions,
repeated transfer/audit/retention and unaudited evidence changes remain blockers.
Actual uid/execute is not trusted original reviewer/session or confirmed mutation.

PR #64 docs `5de2189` passed all six CI gates (`38728141238`); hosting failed
separately, migrations/production skipped. Verify new publication HEAD. Next strict
separate unwired revision-fenced command contract/tests for claim attempt/evidence
set/owner tenure and payload-bound request identity; deny missing/unknown bindings.
Keep v1/generated middleware unchanged; no parsing/actor-equality authority claim.
Then trusted/fresh original actor, atomic pending/current-owner/version/idempotency
receipt, common locks/native-team/offboarding/private-object custody and recovery.
No repeated completed source/schema/staff/claim recovery or legacy authority adoption.
Source404/423, 19 unclassified; baseline/replay/parity/release and financial/consent/
privacy/recovery/receipt/mobile/owner/full-media/hosting gates unchanged. Zero
production write/migration/deploy, paid resource, customer communication, data
deletion, restriction replay, PR merge or duplicate automation; continuation active.

Revision-aware claim command follow-up: code `dce37b1`, branch
`security/claim-review-revision-contract`, based on PR #65 docs `a9987a5`.
Separate unwired v2 codec requires expected attempt UUID and exact canonical
decimal attempt/evidence-set/ownership-tenure revisions. It retains unchanged v1
text/scalar validation and generated middleware/legacy callers; source/test pins
prove v1 unchanged. Frozen key/payload/UTF-8 hash distinguish revision and ABA
changes but prove no original actor, freshness, locked state, mutation, receipt or
atomic ledger. Explicit zero is syntax only, not a trusted unknown-state fallback.
33 new/58 focused pass (28.74 seconds); fresh full app1,240/1,240 across60 files
passes (114.058 seconds), zero failures/pending/no quarantine needed. TypeScript/
lint/format/diff/primary review and10 fresh report/release guards (0.753 seconds)
pass. Parent PR #65's 676 tooling+10 assets are unchanged evidence, not rerun or
double-counted. Evidence: `evidence/CLAIM_REVIEW_REVISION_CONTRACT.md`.

PR #65 published/attached; CI `38733014822` five passed/unit pending at observation,
hosting failed separately, migrations/production skipped. Verify new HEAD's checks.
Next disposable revision/invalidation companion on full PR #65 tables across real
attempt/evidence/ownership writers, UPDATE/delete/recreate/ABA, unknown/unverified
initialization deny. Then trusted fresh original actor, atomic pending/current-
owner/revision/idempotency receipt/common locks, native/team/offboarding/private-
storage/runtime/independent-session/recovery gates. No v1/live wiring, fabricated
trusted zero or legacy privileged adoption. Source404/423,19 unclassified; all
baseline/replay/parity/release and existing acceptance gates stay open. Zero live
query/mutation/migration/deploy, paid resource, customer communication, deletion,
restriction replay, PR merge or duplicate automation; continuation active.

CI budget follow-up: PR #65's original unit job `116415203931`/run`38733014822`
cancelled after15m08s at12:28:38 UTC; annotation confirms15m0s maximum exceeded
before mandatory suites finished. Not passing or an assertion-failure diagnosis.
Only unit timeout is now25 minutes; all tests/quarantine/report/release gates
preserved. Isolated `360b1e0` cherry-picked onto PR #65 as `3040a1e` and merged
non-destructively into v2 branch (`cc54b94`), histories preserved; parent diff only
timeout and v2 runtime/test bytes unchanged. Ten release/report guards pass again
(0.529 seconds); YAML format/diff pass. PR #65 CI `38735096453` running, hosting
failed separately, wrapper`38735096472` preview passed/production-migrations skipped.
Verify latest PR #66 HEAD, superseding earlier`040599a` run, before claiming CI.
No paid resource/tier, production setting or source/authority/release flag changed.
Next companion revision/invalidation model remains as above; continuation active.

Disposable revision/invalidation follow-up: code `c03fede`, branch
`security/claim-revision-invalidation-model`, based on PR #66 `02cb49f`. The
UNWIRED private two-table/five-invoker-function/nine-attachment model now captures
actual full-fixture claim, evidence and owner metadata changes, reopen/reparent/
ABA/delete-recreate and legacy approval/transfer/sibling paths. Unknown preexisting
bindings remain NULL, never initialized to a fabricated trusted zero. Monotonic
tombstones and exact decimal bigint binding/snapshots survive genuine rollback;
unsupported rekeys/TRUNCATE and overflow fail closed. Twenty-five focused tests
pass (46.926 seconds), syntax/lint/format/diff/primary review pass. Full serial
tooling701/701 passes (761.866 seconds), then receipt assets10/10 (0.228 seconds):
711 aggregate, zero failures/skips/cancellations, focused included/not double-
counted. No fresh application run claimed; publication-head verification pending.
Disposable PostgreSQL18.6 is not live17.6/independent-session parity. Evidence:
`evidence/CLAIM_REVISION_INVALIDATION_MODEL.md`.

Private schema/ACL/invoker restrictions and isolated real-constraint rollback
checks follow the Supabase/PostgreSQL skills. This is not a migration, original-
human/fresh-session/role/tenant authorization, private evidence-byte attestation,
atomic executor/ledger or independent-session concurrency proof. Seven omitted
business attachments and bypass/verified epoch initialization still require closure.
Parent PR #65 `3040a1e` and PR #66 `02cb49f` now passed all six CI gates
(`38735096453`/`38735428535`); hosting failed separately, migration/production
deployment skipped. Verify this slice's publication HEAD separately.

Next trusted original-reviewer custody/fresh authority, all-writer/epoch/private-
object closure, then UNWIRED atomic pending/current-owner/attempt/evidence/tenure/
payload-ledger/audit-receipt executor and common lock protocol. Native/team/
offboarding/private-storage/recovery/runtime/independent-PostgreSQL-session and
all prior Customer 360 consent/history release gates remain open. Do not repeat
completed model/codec/recovery or adopt legacy positives. Safe internal-staff
caller acknowledgment/lifetime remains independent. Source404/423,19 unclassified;
all baseline/replay/parity/release flags unchanged. No live query/mutation/migration/
deploy, paid resource, customer communication, production deletion, restriction
replay, PR merge or duplicate automation; single continuation active.

Revision model publication: attached draft PR #67
`https://github.com/Hunting-Fishing/motorsales365/pull/67`, code `c03fede`, first
evidence HEAD `32a7fc9`; first CI `38739987913` started. Hosting build
`492db7e2-d4ad-40e7-bba7-1d14cdb0b7d7` failed separately, wrapper `38739987914`
started with migrations/production skipped. Verify the newest publication-record
HEAD next; this documentation-only commit supersedes the first check head.

## Seven-day integration candidate and staff workflow follow-up (2026-10-15)

Use branch `completion/365-seven-day-integration`, source `ece7e2a0288a9a70be58feeeaefdfe1922fde887`,
and the owner's `365_SEVEN_DAY_COMPLETION_PLAN.md` (target 22 October, 21:00 Manila).
The initial `365_RELEASE_ACCEPTANCE_LEDGER.md` distinguishes source inclusion,
staging, owner and live acceptance. It is not yet an exhaustive action-level map.
59/61 captured open PR heads are already ancestors, including CI #8; PR #9
cutover and PR #2 plan need separate content reconciliation, not a bulk merge.

The actual internal-staff view/handlers now confirm precise returned rows/provider
responses, fence stale private account/admin/snapshot/dialog results, and show
partial creation/sign-in-only acknowledgments. Unknown creation locks only its
mounted account scope, not a durable retry ledger. No original-human/fresh-role/
tenant, trusted team, atomic hierarchy, native provisioning or session-revocation
acceptance is inferred. Fresh full application 1,333/1,333 across 62 files passes
(93 new focused included); TypeScript/lint/build/report guards/assets pass as
bounded in `evidence/SEVEN_DAY_INTEGRATION_STAFF_ACKNOWLEDGMENT.md`.

Parent PR #67 latest `576fb17d` now passed all six CI gates; separate hosting
failure has no diagnostic text from GitHub. Provider logs/full media and recovery
remain open. Connected Supabase discovery finds no separate 365 staging target;
the default main branch is not isolated staging. Owner staging and pilot-account
questions are open; local Docker Linux engine is unavailable. Safe local work
continues on selective cutover/action-level inventory and trusted transaction
dependencies; no paid provisioning or live business request/migration/deploy.
No SQL/generated middleware changed. Source 404/423, 19 unclassified and all prior
Customer 360 consent/history/financial/release gates remain open. Reassess actual
deadline feasibility by Day 2; do not replace full acceptance with test counts.

Published/attached draft PR #68 stacks on PR #67 (`576fb17d`), code `ece7e2a0`,
first evidence head `76c5fa41`; CI `38748496533` running/queued, wrapper
`38748496539` preview in progress and migrations/production skipped. No upload,
new-head pass or live behavior is claimed. This publication-record commit
supersedes the first check head; verify the PR's exact newest head next.

## Complete local media and upload guard (2026-10-15)

Same integration branch/PR #68, source `75b2304fae26f9572041ff88d3cff86aeeaec5a0`.
The checkout is now non-sparse and all 214 tracked public files are restored.
Fresh full build, exact Git/source/copied-public checks and existing Worker/
OCR/PDF verification pass. 65 new/existing Node release/report/inventory tests
and 10 asset tests pass; app/SQL source is unchanged. The prior PR head `c5e4bf1a`
passed all six CI gates; new-head checks remain required. The new fail-closed
guard runs before CI packaging and both Actions uploads. It does not govern
independent Workers Builds/raw Wrangler or approve a release. Evidence:
`evidence/COMPLETE_PUBLIC_ASSET_RELEASE_GUARD.md`.

The owner's staging reply names production project `wjxaajgvddtrxxtocxen`, not
isolated staging. One follow-up asks about a separate-project cost quote in their
organization versus a different existing staging project. No target was created
or reassigned; no costs/charges confirmed. Pilot-account question and migration/
fresh-authority/native-team/claim/offboarding/private-object/recovery/hosting/
owner acceptance remain open. Local media completeness is cleared; it is not
production or consent/history/financial acceptance. No live SQL/business/Auth
mutation, deployment, restriction replay, paid resource or duplicate automation.

## Native Google handoff and sole hosted backend (2026-10-15)

Owner clarification supersedes the historical staging/cost follow-up above:
365 uses only hosted project `wjxaajgvddtrxxtocxen`, API
`https://wjxaajgvddtrxxtocxen.supabase.co`. The 366 AI project is separate and
untouched. Do not create another hosted target or repeat the cost/project question.
Prepare isolated local synthetic testing and a reviewed production-safe acceptance
path; actual API/role/private-storage/transaction/recovery gates still apply.
Docker Desktop is stopped/unavailable and the observed free RAM was 1.93 GiB;
no daemon, image download or local Supabase stack was started.

Same integration branch/PR #68, OAuth source `c3f6bb9cc11c46246c0662f2030a3056b2287854`.
URL/lifetime guard follow-up: `b3acef0e`.
Login/signup now request native Google authorization from the existing canonical
365 client, checking callback/provider URL before browser handoff. Duplicate and
cross-flow form dispatch is fenced; old account/return target/signup-input results
cannot navigate or toast after their context changes. Required signup details and
terms plus the existing pending-profile snapshot are preserved. No successful
authentication, role provisioning or customer/organization identity is inferred
from generating a URL. See `evidence/NATIVE_GOOGLE_OAUTH_HANDOFF.md` for tests and
the remaining live provider/session acceptance. This is selective PR #9 adoption,
not its complete provider/configuration/assets/migration cutover.
Fresh application suite passes 1,431/1,431 across 65 files (105.08s), including
98 new OAuth tests; report checker, full TypeScript and changed-line lint pass.
No live provider/session or Customer 360 identity/role acceptance is inferred.
Fresh complete build/Worker/214-file Git-source-output checks pass at formatting
follow-up `8e1be6ac`; release/report/inventory tests65/65 and assets10/10 pass
separately. Local artifact verification does not authorize upload or release.

Prior exact head `818651fd` passed all six CI gates (`38752315795`); independent
hosting build `ea623a17-3b0f-4bc0-ba4e-90f939f8a218` failed with no diagnostic
text. Upload/migrations/production remain skipped. Verify the new publication's
exact head. Source mapping is still 404/423 with 19 unclassified; no live SQL,
business/Auth write, provider change, restriction replay, paid resource or deploy.
Continue remaining PR #9/#2 and action-level migration/feature inventory, then
trusted actor/fresh role/native-team/claim/offboarding/private-custody/recovery
acceptance. The pilot shop/test-account question remains open, not repeated.

## Parts and provider reconciliation follow-up (2026-10-15)

Same integration branch/PR #68: `f46b048d` retires the now-unused cloud-auth
wrapper/dependency, `a420a44d` recovers the 11 missing PR #2 planning documents as
exact non-authoritative references, `2350e403` adds the typed remaining-source
ledger and CI guards. Current platform/Parts/RLS/Repair/History control plans
remain unchanged; draft G2 legal/finance does not replace active G2 security.
Do not repeat source recovery or treat these proposals as acceptance/authority.

The 19 entries outside exact source correspondence are 12 historical unresolved,
five recorded-unapplied candidates and two recorded embedded helper executions;
preserve 404/423 and all release/baseline/replay/parity flags. The two approved
restrictions must not be replayed. PR #9's legacy media rewrite remains absent,
outside 423 and unapproved for ingress. Full PR #9 scope is inventoried: 205 rename-
aware/211 physical paths; broader provider/MCP/assets/email/billing/build/data
cutover is not adopted. Existing native Google behavior remains unchanged here.

Fresh Node 119/119 (98 new + 21 existing), application 1,431/1,431 across 65 files,
report checker/full TypeScript/new-guard lint/format/diff pass. Full build/Worker/
214-file Git-source-output verification passes at `2350e403`. Prior published `06e21a2e`
passed all six CI gates (`38759812700`); independent hosting build `7f06007f-914b-4484-a3b7-66da30fc8f3b`
failed with no root-cause diagnostics. Verify the new publication's exact head.
Evidence: `evidence/PARTS_AND_PROVIDER_RECONCILIATION.md`; minimum Parts acceptance
groups are in the integrated release ledger. No SQL/business/Auth mutation,
history repair, restriction replay, provider change, paid resource or deploy.
Continue action-level acceptance, reviewed forward/recovery planning, bounded
native email readiness/signature tests and shared fresh authority/atomic writers.
Sole hosted backend/local test boundary and all Customer360/receipt/consent/
financial/private-custody/mobile/owner/recovery gates remain unchanged.

## Native email and opt-out acknowledgment boundary (2026-10-16)

Same integration branch/PR #68: verifier `5e5d5f8a`, unsubscribe acknowledgment/UI
`65475626`. The bounded raw-byte HMAC helper remains unwired and sends nothing;
133 focused actual-crypto/stream tests pass. The existing unsubscribe handler now
requires matching suppression evidence before acknowledgment, returns an honest
consumed-token conflict without reapplying old consent and removes raw diagnostics.
The page distinguishes HTTP failure/invalid/consumed results, suppresses stale
responses and acknowledges recorded opt-out rather than guaranteed delivery stop.
Sixty-two focused handler/page tests and separate independent reviews pass.
Fresh combined application 1,626/1,626 across 68 files (109.46s), report checker,
full TypeScript and changed-line lint pass; all 195 new tests included, zero
quarantine/new lint warnings. `3f829a6b` is a fixture type-only follow-up.
Fresh full build/Worker/214-file media checks pass at that head; source guards
103/103 and release/report/inventory/assets75/75 pass (five inventory checks overlap).
Local artifact verification is not application upload or live acceptance.
Combined integration results are in `evidence/NATIVE_EMAIL_WEBHOOK_VERIFIER.md`
and `evidence/UNSUBSCRIBE_ACKNOWLEDGMENTS.md`.

This does not enable Customer 360/reminder/transactional email. Original action/
tenant/fresh-authority, atomic consent/event/recipient ledgers, secure Auth payload/
URL mapping, current suppression, backlog/provider acknowledgments and sender/
project/recovery acceptance remain required. Token-first partial writes and
bounce/complaint reason overwrite are not repaired. No SQL/provider setting or
live email/data/Auth write, application upload or additional hosted backend.
Migration source mapping and approved restrictions remain unchanged.

Prior published exact head `e72553b6` passed all six CI gates (`38764688404`);
independent hosting build `e96dd8b6-cdb0-4211-bc13-db782a9badfb` failed without
diagnostic/root-cause text. New publication needs exact-head verification. Next
implement the nonactivated Auth payload-to-plan adapter and atomic delivery/consent
contracts, while continuing the shared authority/private-custody/transaction/
recovery path. Do not promote source tests to production readiness.

## Native Auth command planning and first email (2026-10-16)

Same integration branch/PR #68, source `0dfac563`. The inactive planner validates
actual verifier-instance provenance, explicit canonical policy, native payload/
API-base/website callback boundaries and secure current/new recipient/token/hash
mapping. Phone-only accounts with explicit empty current email receive a bounded
first-address plan in either configured mode; missing/null fields or partial
secure pairs do not downgrade policy. Actual HTML/plain-text rendering now has
correct first-address copy without an empty/from link, while both existing
recipient halves preserve current-to-new wording.

Plans have immutable stable event/recipient keys and raw-body/policy fingerprints.
Record compatibility is comparison only, not storage proof, atomic reservation,
enqueue or exactly-once delivery. Six existing actions are supported; eight other
documented actions, actual secret/project/provider/Auth settings, callback/cohort
coverage and consent/suppression/backlog/recovery remain activation gates. No
Customer 360, reminder or transactional-email authority is inferred.

Focused 352/352 (212 new planner + seven render + 133 existing verifier), fresh full
application 1,845/1,845 across 70 files (144.15s), report checker/full TypeScript/
targeted lint/format/diff and independent review pass. Source guards 103/103 and
release/report/inventory/assets 75/75 pass (five inventory tests overlap); no new
SQL or live write/provider setting/email/application upload. Artifact and exact-
head CI/hosting evidence: `evidence/NATIVE_AUTH_EMAIL_PLAN.md`. Continue atomic
delivery/consent and bounded fake-provider contracts alongside shared fresh
authority/native-team/private-custody/financial/recovery acceptance. The sole
hosted 365 backend and approved restrictions remain unchanged.
Fresh complete build/Worker/backend/OCR/PDF/browser-engine and all 214 tracked
public Git/source/output checks pass at `0dfac563`, with zero changed-line lint
errors/warnings. Existing build warnings and wider live acceptance gates remain.

## Native Auth delivery boundaries and financial action inventory (2026-10-16)

Same branch/PR #68, source `0271fc09`: inactive complete-recipient reservation
commands and exact queued-receipt comparison bind original event/subject/version
and immutable rendered provider bytes/key/fingerprint. The one-attempt provider
boundary has explicit injected transport, shared deadline and strict bounded
acknowledgments. It distinguishes provider acceptance from outcome unknown;
neither queue comparison nor fake HTTP proves durable storage or delivered mail.
198 new tests and combined email chain 550/550 pass; independent review/full
TypeScript/changed-line lint/format/diff pass. No SQL/hook/queue/provider activation,
live data/Auth write, email send or deploy. Integration/artifact results and
durable transaction/consent/backlog/recovery gates are in
`evidence/NATIVE_AUTH_EMAIL_DELIVERY_BOUNDARY.md`.

The release ledger now enumerates C3.01–C3.14 quote/work-order/invoice/payment/
approval/refund actions. Hardened Customer 360 summaries do not fix the separate
account-unscoped financial screens. Native payment and inventory-line follow-up
errors can be ignored; approval labels are not a connected refund executor.
Next safe source work is C3.10–C3.12 invoice-detail/payment acknowledgment and
account/target lifetimes, alongside authorized atomic monetary/stock writers,
fresh authority, private custody and isolated API/storage/recovery acceptance.
No financial, owner or live acceptance is claimed from this source scan.
Fresh full application 2,043/2,043 across 72 files (152.91s), full TypeScript and
report checker pass; all 198 new tests included, zero failures/skips/quarantine.
Fresh complete build/Worker/backend/OCR/PDF/server-boundary and all 214 tracked
public Git/source/output checks pass at `0271fc09`, with existing build warnings.
Local packaging does not satisfy runtime, financial, recovery or owner acceptance.

## Native invoice caller safety (2026-10-16)

Same branch/draft PR #68, source `0c23d336`: invoice list/detail now use signed-in
account and fresh mounted-view read lifetimes, matching bounded private children,
visible-row completeness and independent generic retry states. Payment and
inventory-line writers check exact returned rows and every retained follow-up,
with conservative numeric/status/stock preflight and a shared mounted-invoice
uncertainty hold. Account/invoice/editor changes cannot let late results update a
new draft or start the next write. Current Customer 360 invoice-summary invalidation
uses its actual account/customer key. Recorded payment entries and header totals
are not settlement, complete-ledger visibility or reconciliation; former false
outstanding/stock-success claims are removed.

133/133 focused route/real QueryClient tests (70 detail +63 list, 11.85s), full
application 2,176/2,176 across 74 files (129.13s), full TypeScript/report checker/
targeted lint/format/diff and independent review pass. Synthetic SDK acknowledgments
do not establish actual JWT/RLS/private storage, atomic money/stock/idempotency,
refund/adjustment/overpayment policy, recovery or phone/owner acceptance. Separate
financial writes are retained and uncertain holds are not durable across navigation.
No migration, live financial/Auth mutation, provider activation/email or deploy.
Verification/artifact/retained-trigger evidence and explicit compatibility gaps:
`evidence/NATIVE_INVOICE_ACKNOWLEDGMENTS.md`. Continue quote/work-order C3.01–C3.04
callers and actual authorized atomic writers, not repeated invoice/email proof.
Fresh complete build/Worker/canonical backend/OCR/PDF/server-boundary and all 214
tracked public Git/source/output checks pass at `0c23d336`; changed-line lint
has zero errors/warnings. Source guards 103/103 and release/report/inventory/assets
75/75 pass (five inventory tests overlap). Build warnings remain; no application
upload or live acceptance is inferred.

## Native commerce lists and confirmed relationship selection (2026-10-16)

Same branch/draft PR #68, source `8302c62d`: quote and work-order list readers now
require current signed-in/account/per-mount lifetimes, bounded visible counts,
generic manual retries and no stale/false-empty private records. Native UUID/
date/received amount handling is explicit; hidden nullable joins are unavailable,
not absent. Scoped work-order detail callbacks refresh current-account list
lifetimes and customer/vehicle histories. Four duplicated relationship names were
confirmed by read-only system-catalog metadata, and list/detail select explicit
existing FK hints. No SQL write, relationship removal or business/Auth data read.

138 new list tests (93 quote +45 work-order), focused integration 152/152 including
14 strengthened existing detail tests (11.03s), full application 2,314/2,314 across
76 files (124.92s), full TypeScript/report/format checks and independent review
pass. Six existing CI gates pin an OS family with two offline wiring guards;
release/migration freezes and provider settings unchanged. Selected column metadata
also confirms current quote-conversion labor/part payload mismatches and required
part_type omission. No conversion or live transaction was executed. This remains
next work alongside quote-detail/creation and original-human/fresh role/shop,
atomic money/stock/dedupe/recovery acceptance, not a complete financial flow.
Evidence/limits/next dependency: `evidence/NATIVE_COMMERCE_LIST_LIFETIMES.md` plus
its two canonical catalog JSON captures. New email modules remain inactive; other
projects are untouched. No staging/owner/live or whole-schema/replay claim follows.
Fresh complete build/Worker/canonical backend/OCR/PDF/server boundary and all 214
tracked public Git/source/output checks pass at `8302c62d`; seven-file changed-line
lint has zero errors/warnings, with 15 older findings outside changed lines.
Source guards 103/103, release/report/inventory/assets 75/75 and new CI wiring
guards 2/2 pass (five inventory tests overlap). Build/accessibility warnings and
real-role/financial/private-storage/recovery/owner acceptance remain open.

## Quote detail and explicit conversion release blocker (2026-10-16)

Owner's subsequent no-Docker directive is recorded in the primary checklist and
ledger and the existing follow-up. No Docker will be installed/started/used or
requested. Docker-free acceptance must retain real-role/API/private-storage/
transaction/restore gates. Reviewed native-PG17 Parts CI is committed at `166ff0c4`,
preserving adversarial SQL coverage. Published `bf091dc7` native Linux Parts CI
passes all 247 assertions on PostgreSQL 17.11 with successful scoped cleanup;
retained replay's 47 migration failures still prevent whole baseline/replay or
Supabase API/Auth/private-storage/restore acceptance.
Do not dispatch older containerized workflows. QA email nomination is received;
separate standard signup is prepared but credentials/Terms/creation/session and
trusted synthetic native-shop membership remain pending. Preserve existing
personal/staff identities; no secrets or personal email in GitHub evidence.

Same candidate/draft PR #68; exact source commit and final checks are in
`evidence/NATIVE_QUOTE_DETAIL_READINESS.md`. The detail now requires fresh matching
account/quote primary and item lifetimes, complete bound projections, qualified
101/100 visible-row counts and independent generic retries. Received numeric/date
text is preserved without inventing totals, expiry or accounting rules. The
108 focused tests use the actual route and real QueryClient with synthetic SDK
responses; TypeScript/lint/format and independent review pass, not actual API/RLS.

The old non-atomic browser conversion dispatch is removed from the unreleased
candidate; its disabled action explicitly awaits an authorized atomic writer.
Only current validated already-converted work orders remain navigable. C3.03 is
unfinished and release-blocking. The retained legacy RPC lacks safe caller/shop/
retry behavior and compatible shop/part mappings; no legacy reconnection or
invented inventory/part_type contract. Continue atomic C3.02-C3.04 and financial/
stock/recovery acceptance rather than repeating list/email reader proofs.

Authenticated hosting logs now identify automatic Bun frozen-lockfile installation
failure before npm build/upload. A tested source-entrypoint freeze blocks
WORKERS_CI presence, including ignore-scripts, but is neither install repair nor
raw-upload protection/release approval. No provider setting/lockfile change,
SQL/Auth/business write, live restriction, upload/deploy or email activation.
Local API/private-storage/restore, native authority/claim/team and owner/pilot
acceptance remain open under the sole hosted 365 backend requirement.

## Native quote and work order creation callers (2026-10-16)

Same branch/draft PR #68, source `bcc25350`: actual creation forms now scope
choices and draft/write outcomes to the current account/mount, revalidate the
selected customer/vehicle before dispatch, check complete returned identities/
values and hold unknown saves without blind resubmission. Quote field/type/tax
representation mismatches are corrected with exact decimal checks; invalid text
is rejected before any header save, and abandoned renders no longer abort a valid
committed save. Quote 84/84, work-order 89/89, combined creation/security 183/183
(18.68s), full TypeScript, changed-line lint, mandatory CI guards and independent
review pass. Exact artifact/publication results are in
`evidence/NATIVE_COMMERCE_CREATION_READINESS.md`.

Quote header/items remain separate writes; selected customer shop metadata is not
trusted native authority, and mounted locks are not durable retry protocols.
No SQL/ACL/business/Auth mutation, provider activation, email or deployment. Close
the authorized atomic C3.02 transaction first, then C3.03–C3.04 with shared fresh
authority, private-storage/transaction/restore and designated owner acceptance.

## Locked quote transaction and shop intent (2026-10-16)

Source `ad776aa8`, same draft PR #68, adds an unapplied/unconnected quote
transaction with prior expected-shop intent. PGlite 94/94 and offline CI/safety
guards 11/11 pass. A separate private native-PG17 concurrency path is implemented
and passed actual Linux execution/cleanup on publication `2cbf20a4`: native
PG17.11, six independent-session quote scenario groups and Parts247/247, with
47 retained replay failures. All six Actions gates pass, including locked quote
94/94 and application2,595/2,595. No UI hookup or production change;
trusted authority, durable retry, all-writer scope and real API/storage/recovery/
owner acceptance remain open. Exact evidence/resumption:
`evidence/NATIVE_QUOTE_ATOMIC_CANDIDATE.md`.

## Connected caller checks and private receipt opening (2026-10-16)

Source `9a4059bd`, same draft PR #68, adds captured caller/current Auth record
denial to the existing customer detail reader without changing generated
middleware or permissions. Private receipt opening now fences late responses
across account/target/logout/unmount and actual StrictMode cleanup; repeat reads
are synchronously held, with no mutation refresh or raw error exposure. Critical
tests192/192, full TypeScript, changed-line lint, mandatory CI guards and independent
review pass. Fresh complete build/214 public copies/Worker boundaries pass with
existing warnings. New-head publication/CI is separately
recorded in `evidence/NATIVE_CALLER_AND_RECEIPT_LIFETIMES.md`.

This is not strict session revocation, original-human/native-shop authorization,
private-storage or mutation/retry acceptance. Existing receipt list/editor/mutation
and current-role/session, tenant/team/offboarding, durable financial/stock writers,
restore and designated pilot/owner gates remain open. No deployment, live SQL/
Auth/business write, new hosted resource/cost, Docker or provider activation.

## Connected reader and receipt entry follow-up (2026-10-16)

Source `a56480a1`, same draft PR #68: existing commercial/communications handlers
now add the captured caller/current-user denial guard without changing native
primary visibility, projections, sort/caps or invoice TEXT values. Receipt entry
uses shared preflight, a synchronous cross-action latch, committed lifetime fences
and checked draft/upload/void-save acknowledgments. Unacknowledged writes hold
the mounted editor without deleting entries or blind retry. An acknowledged
upload followed by scan failure still supports manual saving to the same draft.

Final critical 533/533, full TypeScript, changed-line lint/review and CI guards
pass. Fresh complete build/214 public copies/Worker boundaries pass with existing
warnings. Publication checks are recorded separately in
`evidence/CUSTOMER_READERS_RECEIPT_ENTRY_SAFETY.md`. Null-save is not proof of
persisted financial values; path ack is not file-byte provenance. Mounted holds
do not cancel backend work or survive close/reopen, and new editor in-flight
StrictMode replay is not specifically tested. Receipt/shop-link read freshness,
bounded reader/caller contracts, remaining writers and durable retry/recovery are
next. Native authority and real API/private-storage/restore/pilot/owner acceptance
remain open. No migration, provider activation or deployment.

## Receipt reads and retail assignment follow up (2026-10-16)

Sources `eb90d15c`/`bd5e4b04`, same draft PR #68. Receipt/link per-mount reads hide
fetching, paused, failed and invalidated snapshots; current-query admission
guards preserve open editors, installation drafts and unknown holds through
ordinary refresh. Auth loading is separate teardown. Existing editor/opener/
installation bodies are unchanged, receipt101/101 passes.

The existing retail detail binds assignment to prior account/org/lead/assignee,
strict existing memberships and an exact returned row, with fresh member choices,
duplicate/stale-callback fences and mounted unknown-outcome holds. Lead151/151
and final combined703/703 pass; lint/review/CI guards pass. Full integrated
TypeScript/fresh build/214 assets/Worker boundaries pass with expected warnings.
Publication evidence is separately recorded in
`evidence/RECEIPT_PRIVATE_READ_LIFETIMES.md` and
`evidence/RETAIL_LEAD_ASSIGNMENT_SAFETY.md`. Native authority, server receipt DTO/
attachment completeness, atomic/durable writers, actual-role/private-storage/
restore/pilot/owner acceptance and complete retail/recruitment workflows remain
open. No SQL, signup, provider activation, customer send or deployment.
