# Native companion authority: proposed offline contract

2026-10-15 Asia/Manila. **Full authority contract: not adopted, implemented, applied or
release-ready.** This document defines the next bounded offline dependency after
the selected staff/chat/profile/module proofs and application command-confirmation
work. It is not permission to change production, repair bindings, introduce a
privileged bypass, replay historical SQL or accept a baseline. No production
records/counts, new schema, migration, credentials or customer communications are
introduced here.

## Reuse evidence; do not infer complete authority

Use the immutable source/section pins, actual critical constraints and explicitly
synthetic support boundaries already recorded in:

- `BUSINESS_STAFF_AUTHORITY_GATES.md` and
  `NATIVE_STAFF_TRIGGER_COMPOSITION_PROOF.md`: self-retarget/reactivation, native
  no-op target effects, all three staff triggers, invalid offboarding statuses,
  actual-owner deletion divergence and user-wide cleanup.
- `NATIVE_PROFILE_RESOLUTION_PROOF.md`, `NATIVE_BOOTSTRAP_AUTHORITY_PROOF.md` and
  `NATIVE_ACCESS_COMPOSITION_PROOF.md`: legacy/null-shadow resolution, distinct
  native shop/business identities, arbitrary-target bootstrap and module/receipt
  boundaries. Read helpers and module visibility are not write delegation.
- `NATIVE_CHAT_MEMBERSHIP_POLICY_PROOF.md` and
  `NATIVE_CHAT_WRITER_COMPOSITION_PROOF.md`: raw no-read self UPDATE reentry and
  retarget controls, actual writer guards, void/no-op outcomes and real message/
  notification side effects.

Those proofs combine selected retained declarations with separate dated catalog
snapshots. They are not one live consistent snapshot, full role/writer closure,
current data assertions, hosted JWT/API acceptance or concurrent-session proof.
Do not rerun completed characterization merely to relabel it a guard. Matching
source hashes do not establish applied history. All baseline/replay/parity/release
flags remain unchanged and false.

## Observable authority requirements

1. **Freeze identity values, not harmless unchanged upsert keys.** Normal roster
   UPDATE must not change `id`, `business_id`, `user_id` or `created_at`. Preserve
   legitimate existing `(business_id,user_id)` conflict keys when an authorized
   upsert submits the same values. A real identity transfer requires its own
   explicit workflow; it is not an UPDATE escape hatch. Retain native profile
   IDs where `id <> user_id`; never canonicalize them or guess that a public
   business UUID is a native shop UUID. No profile `shop_id` FK is invented.

2. **Authorize privileged targets even when their values do not change.** An
   untrusted self request targeting `role`, `title`, `duties`, `active` or
   invitation provenance is not made safe by `role=role` or an empty diff.
   Existing native `UPDATE OF role,title,active` and every-UPDATE chat/timestamp
   attachments make the target list consequential. A candidate must demonstrate
   its boundary for actual SQL target shapes, not just one application patch.

3. **Keep active self-shift genuinely harmless.** Only the authenticated subject's
   already-active, unambiguously scoped row may use the narrow self `on_shift`
   operation. Toggle and no-op controls must not reactivate chat membership,
   rebind a native profile, remap roles, provision a shop/register/location or
   broaden access. Inactive/absent/revoked subjects receive no implicit recovery.
   Coordinate downstream writers; a roster-only value guard is insufficient.

4. **Separate actual ownership from mutable roles.** Evaluate the relevant
   `public.businesses.owner_id` independently of a roster's `role='owner'`, native
   roles or the existing manager helper. Its provenance is itself conditional on
   ownership-writer closure. Manager/assistant-manager predicates currently
   include mutable roster authority and cannot bootstrap trusted delegation.
   Owner recovery, deletion of redundant owner rosters, owner-equivalent role
   assignment and delegation remain explicit decisions below, not permissions
   supplied by this document.

5. **Define invitation provenance before freezing it.** The current
   `addBusinessStaffByEmail` upsert in `src/lib/business-staff.functions.ts`
   overwrites `invited_by` on reinvitation. Decide whether that stored value means
   original inviter or latest invitation actor. An original-inviter contract must
   preserve it on conflict and separately account for the later authorized action;
   it cannot silently discard attribution or pretend the current adapter already
   does so. No new audit column/table is specified here.

6. **Fail closed on ambiguous authority; do not repair it.** Resolve canonical,
   legacy and NULL-shadow identities without silently selecting whichever helper
   sorts first. Multiple rosters, conflicting native shop bindings and auth-ID
   versus profile-ID role consumers require explicit rules. A global native role
   row is not proof of tenant-scoped permission. Removing one roster must not
   erase another tenant's still-authorized role, shift or register session, choose
   an active shop automatically or reconcile existing data as a side effect.

7. **Treat business-team membership as a separate trusted boundary.** Offboarding
   cannot be implemented solely by writing `left`: the selected raw constant
   UPDATE proof reactivates or retargets an own membership without reading columns
   or RETURNING. Filtered/RETURNING negative controls must remain too. A thread's
   `kind`, `business_id`, title, creator or membership alone is not trusted
   classification until all relevant creation/update/retarget writers are closed.
   Define authoritative team linkage and authorized recovery, preserving regular
   private-group create/invite/respond/leave semantics. Do not convert all private
   groups into business-controlled rooms or grant a business owner blanket access.

8. **Make offboarding one valid, attributable outcome.** Use statuses permitted by
   the actual chat/shift/register CHECKs; do not widen them to admit source
   `inactive`/`clocked_out`. Specify roster, chat, native binding/roles, affected
   shift/register and audit outcomes together. Existing operations-ledger hooks
   are not complete staff/profile/role/offboarding audit coverage. Preserve the
   original actor independently of definer execution context; `current_user`,
   `session_user`, a role GUC or a NULL auth subject alone is not a trusted bypass.

## Separately gated decisions and remaining closure

Before enabling privileged positive cases, review who may invite/remove/promote
each role, assign owner-equivalent access, delegate/revoke management, recover a
team for the actual owner and operate across multiple rosters. Until resolved,
these cases are blocked, not implemented with permissive stubs. Owner-only DELETE
RLS and a broader application manager check must not be assumed equivalent.

Native ownership, role assignment, profile/bootstrap/provisioning, ownership
claim/transfer and operator/service writer closure remains open. Inventory direct
table/column access, definer/invoker wrappers, trigger paths, dynamic/unqualified
writers and role inheritance before claiming a companion guard is comprehensive.
Standalone native shops remain valid; no automatic business-link backfill is
authorized. Decisions about existing anomalous records, recovery and private
diagnostic results require their own scope, not a runtime cleanup branch.

## Transaction, recovery and concurrency contract

The eventual writer must bind authority and all affected scopes in the mutation
transaction, lock a reviewed deterministic dependency set in a consistent order,
and revalidate authorization/bindings after waits before applying effects.
Identify competing ownership, delegation, roster, native-profile/role and chat
writers; a preflight read, a BEFORE guard or `FOR KEY SHARE` alone does not prove
revocation safety. Define stale/conflict responses and bounded lock/statement
timeouts without automatic mutation retry. No unreviewed lock mode/order is
adopted here.

Any failure must roll back earlier trigger/provisioning/audit effects. A transport
failure after dispatch is an unknown outcome, not proof of rollback; returned
rows/void acknowledgements are not substitutes for stored-state verification.
Plan scoped backup/recovery and idempotent operator actions separately, preserving
legacy IDs and unrelated tenant state. Test competing transactions with independent
real PostgreSQL sessions; a single-session PGlite proof cannot establish this.
No PostgreSQL service, new grant or paid resource is provisioned by this plan.

## Bounded candidate test matrix

These are proposed acceptance cases, not passing results or production findings.
Reuse the selected actual CHECKs/FKs/indexes and all enabled scoped attachments;
keep auth/session/platform supports explicitly synthetic. Assert stored state,
affected-row behavior and catalog/ACL preservation, not toast or array length alone.

| Boundary                  | Minimum positive and negative controls                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity/upsert           | Authorized unchanged conflict keys and legacy ID preserved; changed identity/created_at rejected without partial effects.                                                                                                                  |
| Self shift                | Active own toggle/no-op succeeds without authority/chat changes; inactive, absent, other-user and NULL subjects denied.                                                                                                                    |
| Privileged target         | Untrusted `role=role`, active/title/duties/provenance no-ops denied; manager positives gated on the reviewed delegation matrix.                                                                                                            |
| Actual owner              | Mutable roster owner is not authoritative; redundant-owner deletion/recovery follows the separately decided contract without losing legacy identity.                                                                                       |
| Invitation provenance     | New invitation versus conflict/reinvitation retains the chosen original/latest semantics and records the actual authorized actor.                                                                                                          |
| Ambiguous/multi-roster    | Ambiguous NULL-shadow/legacy-role combinations and conflicting multi-business bindings fail closed; legitimate multi-roster positives remain gated on the separate decision matrix. Unrelated shop roles/sessions/bindings stay unchanged. |
| Team versus private group | Business-team raw no-read reentry/retarget denied after offboarding; WHERE/RHS/RETURNING contrasts retained; legitimate private-group operations still work.                                                                               |
| Atomic offboarding        | Existing/absent chat member, open shift/register and no-open controls use valid statuses; real constraint failure explicitly rolls back all earlier effects.                                                                               |
| Direct/indirect writers   | Direct native DML/EXECUTE denial does not mask roster/bootstrap/trigger paths; no NULL-subject or definer-context bypass.                                                                                                                  |
| Independent sessions      | Revoke/transfer/delegate versus mutation, duplicate invitation/provisioning and overlapping offboarding exercise lock waits, revalidation, conflict and rollback without cross-tenant cleanup.                                             |

## Exact next implementation order

1. Independently review this contract and mark the owner/delegation/provenance/
   multi-roster decisions as unresolved inputs. No live business diagnostic is
   needed to build the local negative controls.
2. Build one disposable companion-candidate fixture around the existing pinned
   staff/native/chat composition. First implement identity-value freeze and
   harmless active-self-shift controls, with all three staff attachments retained
   and privileged no-op target negatives. Keep historical SQL unchanged and the
   candidate separate from migration history; do not repeat old proofs as fixes.
3. Close trusted team-classification/reentry and native provisioning/role writer
   dependencies before claiming the candidate establishes authority. Add valid
   atomic offboarding controls; leave unresolved privileged branches denied or
   explicitly unimplemented, never accepted via supporting stubs.
4. After the separately reviewed decision matrix and writer inventory are ready,
   add owner/delegation/reinvitation/multi-roster positives and original-actor
   attribution, then independently review the complete transaction/recovery plan.
5. Rehearse independent-session PostgreSQL concurrency and retained application
   adapter compatibility, including returned-row confirmation and unknown-outcome
   handling. Add real authenticated API/role/session controls in an approved
   disposable environment; mocks and browser caps are not database authorization.
6. Only then prepare a separately reviewed forward release candidate with verified
   migration provenance, impact/rollback/recovery readiness and explicit production
   authority. Existing bootstrap/totals decisions, baseline/private-storage,
   consent/ownership-tenure/retention, receipt/mobile pilot and hosting gates remain
   open. Do not deploy the sparse checkout or promote any completion flag here.

The original proposal changed documentation only. The first separate self-shift-only
memory research subset is now implemented/tested in `NATIVE_SELF_SHIFT_CANDIDATE.md`,
not adopted as the full contract. It denies privileged branches instead of choosing
owner/delegation/provenance/multi-roster policy. No migration, production action,
data repair or authority adoption is supplied by this proposal or research subset.
