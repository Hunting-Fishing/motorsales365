# Unapplied single draft receipt-line transaction candidate

16 October2026. Source `34a9093045543526b6e3d6ee1450353f0eda3373`, same integrated
branch/draft PR68. This is a private memory-only mechanical SQL prerequisite for
safe101+ review/edit, NOT an enabled app editor, migration or accepted native API.

## Why a separate operation

Retained `save_receipt` locks the parent, deletes ALL existing children and inserts
only1–100 replacement lines with new IDs and omitted installation/provenance/
consent metadata. The complete-line viewer remains read-only; its DTO is not an
edit-authority or full-state witness. No pages are accumulated into legacy save,
no100-row bound is raised and no direct SDK UPDATE privilege is added.

`receipt_line_candidate.edit_draft_line` is SECURITY INVOKER in a new private
laboratory schema. PUBLIC/anon/authenticated/service_role have neither schema
USAGE nor function EXECUTE. A schema-owner/current-subject equality guard is
explicitly synthetic, not original-human/strict-session/native-shop authority.
Unexpected default FUNCTION or SCHEMA grantees and existing-schema collisions
fail publication transactionally; no CREATE OR REPLACE or permission workaround.
DBA/superuser/inherited-owner powers remain outside this direct ACL boundary.

## Statement boundary

Typed arguments bind account, receipt, item, exactly ONE selected vehicle or
shop-vehicle target, expected shop for the latter, full observed receipt/item
snapshots and exactly seven writable fields. Stored parent records may have BOTH
vehicle FKs; the other link is preserved, not silently required NULL. The writer
does not require receipt creator=current account, inventing no creator-only policy.

The candidate locks parent, then selected customer/native vehicle or selected
public owner-vehicle, then item by id AND receipt_id. After waits it rechecks
selected bindings, exact prior state, subject, retained TRUE-only legacy access,
draft status, empty selected installation metadata and absence of linked expense.
Full prior receipt JSON includes both target links and every header field, not
updated_at alone. Item CAS covers all16 retained fields. Native NUMERIC and item
integer values become SQL text before JSON, preserving observed scale and values
without JavaScript number coercion, rounding, trimming or defaulting.

Only description/category/brand/part_number/quantity/total/reviewed are updated.
No header, UUID, receipt parent, confidence, order, installation actor/origin/date/
odometer or public-summary consent field changes. It never inserts/deletes items
or explicitly invokes legacy save/history synchronization. A persisted reread,
not RETURNING alone, must equal old item plus exactly the requested seven fields;
header, target/legacy access and expense absence are rechecked before return.
Suppression, target/protected-field/header/selected-shop rewrites deny and roll
back the whole statement in the selected model.

Full row CAS is NOT an ABA/revision epoch or durable operation receipt. A changed
request's stale prior snapshot is refused, not treated as successful replay.
An exact no-op returns observed statement state, not an exactly-once guarantee.
The acknowledgment is not an external COMMIT/HTTP, automatic retry or reopen-
reconciliation contract. Canonical nonnegative plain decimal changes of at most
512 characters and65,536-byte snapshot/change envelopes are this candidate's
explicit bounded compatibility cohort; not universal native NUMERIC/text support.

## Retained-source fixture and tests

The new fixture wraps unchanged expense parent98db65cf with statusdraft/no items,
retaining its22 selected spans/seven immutable sources and all limitations. Seven
additional exact spans from unchanged receipt73de34ce supply real link/item DDL,
indexes, ownership/access helpers, RLS/table grants/read policies. The link table
is required by the unmodified receipt_access branch; no missing table/helper/FK
is stubbed or stripped. Selected original service-role table/default helper
grants are laboratory metadata, not current hosted ACL parity or happy authority.

Extended snapshots include all selected item/link/identity/support/financial rows,
exact numeric text and receipt-graph fields/defaults/column/table/effective ACL/
RLS/FK/index/policy/internal+user trigger/helper ownership/config/definition
facets, plus parent snapshots and candidate/default-ACL facets. This is not every
database object, all history/private objects or a complete baseline inventory.
Engine is PGlitePG18.6. Auth.uid/test.user/native/module/manager supports remain
synthetic; no actual Auth/session/current native-team protocol is exercised.

Final serial **54/54 across four files,45.847s**, no failures/skips/cancellations/
todo:20 new candidate cases,20 retained expense-operation cases,12 retained posting
cases and2 CI guards. The new candidate's final20 include FUNCTION+SCHEMA default
grantee/default-ACL restoration controls; earlier standalone20/20 in6.896s preceded
that strengthening. Root and independent final frozen reviews are clear. Full
three-JS-file ESLint, changed-line lint, four-file formatting, Node syntax and
diff checks pass, zero new/retained lint findings. Normal25-minute unit timeout,
six CI jobs, quarantine, PG17 and cleanup coverage are unchanged. New candidate
step is unconditional single-concurrency and never quarantined.

The successful committed memory edit of line101 leaves150 item IDs, all149 other
rows, full header, selected immutable metadata and all selected financial/catalog
state unchanged. Valid negative/duplicate sort order, high-scale decimals and an
unseen installation-bearing sibling remain intact. Other cohorts cover selected
owner/noncreator-shop/dual targets, wrong account/subject/parent/item/shop, full
scale-sensitive CAS, stale repeat, confirmed/four installation fields, NULL legacy
predicate, strict writable keys/types/bounds, real retained CHECK failures,
nullable money/no-op, BEFORE suppression/protected rewrite, AFTER target/header/
shop rewrite, outer rollback and transactional publication refusal.

Initial run18/20 had one invalid seed: the unchanged expense guard correctly
rejected posting a draft. Test-only repair creates a valid confirmed posting,
then explicitly privileged synthetic corruption returns its parent to draft to
exercise linked-expense denial. No guard/constraint/permission was weakened; no
app reversal or legitimate draft posting is implied.

LF SHA256 pins:

- Fixture: `adff91f94089ceae158cad82df436127087d3581b9460a140d4c468e08bd7ad3`.
- SQL: `78c9eff2bfc62c2897be0e22a510d9a552dc1fa48a19cfb0822d610be3ca609b`.
- Tests: `baa67196c9f9126a320414d7aacc5896bcbb352e6831f6953f11ade021774a67`.
- Workflow: `d482899e6031cf1cfb3d5e4a9a448ac9f6b03809cfb8c988d4b681710cda39a4`.
- CI guard: `7643f02d10453107c2253b8d35121dfd36e24d3cac497a517af4c90a5a5c84b0`.

## Parent evidence, impact and exact next action

Parent380beb40/sourcef53c8ea8 now passes all six Actions38922330671. Actual
unit117045110299 reports4,863/4,863 across93 files74.31s, zero unexpected/
quarantined failures. Returned120,000-character log is truncated: final unit
summary is present, earlier individual staff-composition markers/count are not
independently visible. Job succeeds with the unchanged25min timeout and guarded
unconditional composition command; do not invent a separately read Linux10/10.
Fresh build final guards/complete CI merge-tree equality and untruncated native
PG17.11/Parts247/quotes/expense/bounded recovery/cleanup pass;47 replay failures
remain, tiny62/61/185ms not RTO. Preview confirms config skip/no upload;
production/migrations/Supabase Preview skip. Workers865be24a… fails, fresh cause
unverified. New candidate head still requires its own actual CI result.

No app/generated middleware/Worker/package/public media/SQL migration/legacy
writer or existing candidate changes.214 tracked assets and existing-output
Worker/canonical365/15 OCR/202 PDF/server-boundary guards pass; no fresh local
app build/typecheck is claimed for this scripts-only slice. No hosted query/write,
real account, grant, Docker, charge, provider activation, deployment, merge or
main change. C1.07/C1.08/R2/R3 remain unaccepted; safe101+ review/edit is not enabled.

Next verify new exact-head CI, then Docker-free native PG17 independent-session
wait/stale-CAS/outer commit/rollback and selected binding/constraint tests.
Before connecting a dedicated handler/dialog, require reviewed compatible current
catalog/trigger/all-writer locks, trusted owned ingress/strict session/native
role/team/tenant authority, durable request/reopen recovery and reviewed DTO/UI
lifetimes. Legacy save/sharing lock parent first; install locks item first and
history visibility locks history first. Direct writers/arbitrary sibling/history/
financial triggers/expense phantoms are not covered by this selected postflight.
API/Auth/private originals/full recovery/owner/pilot/release and Cloudflare gates
remain. Preserve QA credential/Terms handoff; no new account question. Target
22 October21:00 Asia/Manila remains at risk,17 October feasibility review retained.

Reference: [Supabase function security/privileges](https://supabase.com/docs/guides/database/functions)
and [PostgreSQL17 default privileges](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html).
