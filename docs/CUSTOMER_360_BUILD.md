# Native Customer 360: first delivery slice

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
