# Actual ordinary no-referral Auth bootstrap rehearsal

## Outcome and boundary

The ordinary nonstaff/no-referral Auth INSERT chain now executes unchanged
current functions and actual trigger attachments against the full schema
reproduction. It creates the expected profile, organization, owner membership,
founding entitlement and intent audit in discarded databases. Failure and
recovery tests retain genuine constraints and characterize legacy gaps.

This is **bounded behavioral evidence**, not production signup/provider Auth,
JWT/API/client-policy, trusted original actor, concurrent allocation, accepted
baseline/history or release proof. It changes **no application source or migration**.
No live database query, account creation, data/ACL/history mutation, deployment,
external billing or customer communication ran in this heartbeat.

## Exact composition and source correspondence

The unchanged PR #59/#58/#57 structural fixtures remain byte-pinned.
Ten complete public tables (208 columns/38 critical constraints/47 indexes)
are retained. The actual full staff_referrals rowtype adds eleven columns,
four critical constraints and five indexes: **eleven public tables, 219
columns, 42 critical constraints and 52 indexes**. Staff RLS/declared ACL and
column/default/NOT NULL/constraint/index facets match its prior captured metadata.

The staff table is deliberately empty and its three staff-write attachments are
not installed: no-referral code returns early before any staff/referral/partner
writer. The actual confirmed-email accreditation trigger is installed and
takes its genuine nonstaff branch. Its unchanged accreditation body is retained,
not replaced with a success stub; partner tables are absent and must not be
treated as covered.

Exactly **21 current function definitions** execute from twenty narrowly selected
unchanged retained functions across fourteen source files, plus the pinned
current-catalog creator-owner definition from PR #56. Selection hashes/body pins
are retained. No whole migration, historical seed, backfill or global DO block
executes. Both recompute overloads remain present; profile calls the actual
seven-argument one. The older incompatible has_role source is not loaded or used.

Current source is not automatically identical to current headers. The retained
Aug 5 search-path hardening supplies the exact selected setting for
is_internal_365_email only: public, shop_manager, pg_temp. Its whole-file LF pin is
d987fe1e83505eb4002529a5290361fba2ff4af994938986ced9006c1502b321
(8,738 bytes). The global hardening loop does not run.

For **all 21 functions**, runtime metadata matches the prior current capture
exactly: full pg_get_functiondef MD5/bytes, unchanged body MD5, owner, language,
kind, security mode, volatility, strict/set-returning flags, arguments/defaults,
configuration keys/hash, raw ACL and effective EXECUTE rights. This is stronger
than body-only correspondence but still not original history adoption.

All **15** selected current noninternal Auth/profile/org/subscription attachments
match exact names, timing/event bits, update columns, function identities,
arguments/WHEN and definition fingerprints. All three profile BEFORE and all
five INSERT-capable AFTER paths are installed, along with profile UPDATE timestamp,
three org attachments, subscription timestamp and both Auth attachments.
The ten business writer attachments remain omitted: signup reads businesses,
does not create/update one through this chain. The controlled preexisting-business
test is an explicit synthetic state seed, not a business-writer acceptance test.

There is **no auth.uid shim**, no public.user_roles/user_referrals or partner-table
success substitute and no installed client policy. Latest handle_new_user does
not insert a default global user role; the ordinary chain succeeds without a
user_roles table. That does not prove role provisioning or trusted native authority.

## Synthetic support and invariant boundaries

Provider Auth is an explicitly synthetic id-PK table with only the four observed
field definitions: id uuid, email varchar(255), email_confirmed_at timestamptz and
raw_user_meta_data jsonb, with matching nullability/default fingerprints.
Actual provider ordinals, remaining fields, Auth role/ACL/hooks/HTTP/JWT/session/
email delivery behavior are **not** reproduced. Inserts run in the disposable
database-owner lab, not a verified provider/API role.

Common tier and Bronze plan configuration are explicitly synthetic lab inputs.
No current live configuration was read or inferred and no historical seed replayed.
Tests vary absent tier, absent Bronze and inactive Bronze. No canonical org row,
trusted admin seed or manager binding is invented for ordinary signup.

All behavior, synthetic support/configuration and rows live within an outer local
transaction, rolled back before the unchanged parents recheck their empty exact
structure. Inside that transaction, **before and after each callback**, the real
column/default/NOT NULL/ACL/RLS/constraint/index/enum facets are also rechecked.
Actual function envelopes/attachment sets, no undeclared function/policy substitutes,
full empty staff rowtype and four synthetic Auth field definitions are verified.
Only validated, single-column, attnotnull-backed PG18 NOT NULL catalog constraints
are normalized. Dropped FKs or unrestored altered defaults fail before outer
rollback can conceal drift.

The query fragments used for these local assertions are pinned WITH/SELECT bodies
only; no diagnostic BEGIN/ROLLBACK wrapper executes inside the outer rehearsal.
A first local metadata assertion printed unqualified regprocedure names under the
default search path; the inspection context was corrected to the same trusted
catalog path as the captures. No function body was rewritten to make it pass.

Savepoint attempts compare complete row snapshots across Auth, staff and all ten
public source tables. The final parent invariants require no persisted rows or
behavior objects after rollback. These are local database transaction results,
not cross-request/idempotent/distributed recovery or customer-data migrations.

## Verified actual behavior, not adopted policy

- A no-metadata ordinary signup creates a private/buyer profile with common tier,
  direct source, member/founding number 1, a dealership-kind org and owner
  membership. Bronze yields an active complimentary sandbox subscription with
  no Stripe IDs or finite end date. This does not establish production billing.
- Real derive reads full businesses owner storage, not a helper stub. Business
  signup metadata alone is reset to buyer if no business is owned; controlled
  synthetic preexisting ownership yields business. Signup never creates that
  business. Auto-org still uses dealership even for repair metadata.
- Audit identifies target user as actor, records source/profile/seller-type
  context and skips unchanged intent. Audit insertion errors are swallowed by
  the actual function: an explicit lab default fault leaves signup successful
  with **no audit row**. Durable attribution remains unaccepted.
- Without Bronze, signup succeeds with no subscription. An inactive Bronze still
  grants a founding subscription because the actual SELECT ignores active.
- With an actual synthetic Business Trial plan and no Bronze, repair_shop,
  insurance and dealership signups get no trial through the current ANY guard.
  This dynamically characterizes the known bug; it is not repaired or accepted.
- Editable metadata is_staff_account=true suppresses auto-org for ordinary email
  while profile staff/parent/manager remain false/NULL; malformed boolean text
  aborts the real AFTER trigger. Neither metadata flag nor stored intent is
  adopted authorization. Staff-domain and nonempty-referral paths are scope-
  rejected rather than given fabricated partial success.
- Missing common tier (FK), invalid intent (CHECK), org slug collision (UNIQUE)
  and an explicit late subscription environment-default fault (NOT NULL) abort
  atomically and restore every row snapshot. Faults are lab-only changes to
  defaults, **not weakened constraints or observed production incidents**.
  Fault defaults are restored before successful retry/structural postflight.
- A simulated subscription ID-default collision is swallowed by actual ON
  CONFLICT DO NOTHING: a second signup can have no new entitlement. This is a
  deliberate local fault scenario, not a claimed production UUID collision.
- Duplicate Auth ID is an error, not idempotent success; row and sequence state
  stay unchanged. Sequential distinct signups allocate 1/2 but do not prove
  concurrent founding MAX+1 safety or the 1,000-member capacity boundary.

The member-number sequence advances during failed inserts and **does not roll
back with data**. Recovery consumes number 2 while founding number returns to 1.
Only the local in-memory sequence relation/current state is read for this proof;
no live sequence value is queried or altered. Outer rollback/DB disposal contains
the lab allocation. Nontransactional gaps, global live state, fresh provider
requests and concurrent allocation remain separate acceptance gates.

## Validation and immutable artifacts

**22 focused tests pass (21.193 seconds)**, including source/current full function/
header/ACL/attachment parity, full constraints and real staff rowtype, no-stub scope,
ordinary chain, intent/business reads, configuration variants, current trial/audit/
metadata behaviors, genuine late rollback/recovery, local sequence gaps,
duplicate/sequential allocation, actual nonstaff accreditation return, scope
rejection, runtime drift rejection and legacy conflict suppression.

A dedicated never-quarantined serial CI step is added. Syntax, ESLint zero
warnings, source/CI format and diff checks pass. Full serial tooling **560/560**
passes (422.040 seconds), followed separately by receipt assets **10/10** (0.352
seconds): **570** aggregate, zero failures/skips/cancellations. No fresh full
application run is claimed for this test-only slice; PR #54's 1,207 tests/59 files
and TypeScript remain verified parent application evidence, not this bootstrap's
provider/production acceptance. Primary review only; the recorded independent
agent quota condition was not repeatedly retried.

| Artifact                                                   | UTF-8 LF bytes | SHA256                                                           |
| ---------------------------------------------------------- | -------------: | ---------------------------------------------------------------- |
| scripts/ci/fixtures/auth-no-referral-bootstrap-fixture.mjs |         18,235 | 83498e136bc10fc04af9d15e91af160169d68220e091443bcfc4e4272a7419ac |
| scripts/ci/auth-no-referral-bootstrap.test.mjs             |         22,346 | afa6aaccb9830e2722f565b155294df3741fe3a162a8b869ab6c57c3f52e089b |

PR #59 documentation head **45b1971** now passed all six CI gates
(**38709262357**), verified this heartbeat. Hosting
a1bf9314-7f00-4a0c-b7a1-9b9d38b80c80 failed separately; wrapper 38709262572 skipped
migrations/production deployment. New work needs its own latest-head checks.

Supabase safety guidance kept all execution disposable and separate from trusted
Auth/metadata/session authority. Current [Auth/user-data guidance](https://supabase.com/docs/guides/auth/managing-user-data),
[TLS](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) and
[PG17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
release considerations were checked. No upgrade, reindex, encrypted-row scan,
Auth configuration or live diagnostic ran.

## Exact next dependency and blockers

Ordinary no-referral bootstrap and full structural recovery need not be repeated.
Next close the **nonempty user_referrals INSERT forward frontier**: reuse PR #52's
current row/attachment metadata, recover/match actual pp_user_signup_bounty and
tg_auto_assign_sales_rep definitions plus their actual downstream financial/assignment/
intent inputs, full constraints and downstream attachments before composition.
Never turn absent downstream tables into successful no-ops or invent referral
credit/assignment authority. Then compose staff-domain Auth plus the actual
platform-role/staff/partner chain with real canonical org/manager prerequisites,
rather than promoting the separate ordinary and partner proofs to one workflow.

Keep a separate trusted original-actor/revision/common-lock/offboarding/native
authority contract before privileged positives or atomic provisioning adoption.
Staff seller NULL/enum mismatch and trial ANY logic remain uncorrected release
blockers; inactive-plan grants, editable org suppression, audit swallowing and
entitlement conflict suppression need explicit kernel decisions, not silent
production changes. Original org/member/org-role provenance, owner/consent/
private-history/recovery/receipt/mobile/owner pilot/full-media/hosting gates remain
open. Source classification stays **404/423**, nineteen unclassified;
baseline/history-replay/parity/release flags false.

Preserve all three approved restrictions without replay; quote conversion remains
outside those approvals. Zero migrations, production query/mutation/deployment,
paid resources, customer messages, data deletion or PR merge. No sparse checkout
deployment or duplicate automation. Existing single recurring continuation stays
active; 365 is not complete or release-ready.

## Published checkpoint

Draft [PR #60](https://github.com/Hunting-Fishing/motorsales365/pull/60), code
`099b7067253759506ea5ba76cea505d9710c1c28`, branch
`security/auth-no-referral-bootstrap`, stacked on PR #59 docs `45b1971`.
Twenty-two focused and 570 tooling/assets pass; syntax/lint/format/diff/primary
review pass. All 21 current function envelopes and fifteen selected attachments
match exactly. Genuine rollback/recovery and local sequence gaps are tested,
without adopting legacy bugs, authority or provider/live behavior. PR #59 passed
all six CI gates (`38709262357`); this PR needs its own latest-head verification.
Migration impact **zero**, live query/mutation **none**, deployment **none**.

Next recover/compose actual nonempty-referral INSERT fanouts using existing PR #52
metadata, then staff-domain Auth/role/partner integration and trusted original
actor/revision/locking/offboarding gates. Do not repeat ordinary/full-schema or
current three-org-function recovery, drop real constraints or stub dependencies.
Source/baseline/replay/parity/release flags remain unchanged; single continuation active.

Initial code CI `38713714379` has lint/Parts/OCR passed, build/type/unit pending.
Hosting `2fbd33ad-9577-4585-8420-bd90631fbe88` failed separately; wrapper
`38713714291` skipped migrations and production deployment. Verify the later
documentation HEAD separately; neither this initial snapshot nor parent green
checks substitute for its acceptance evidence.
