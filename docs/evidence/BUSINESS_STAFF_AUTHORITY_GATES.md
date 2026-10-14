# Staff roster authority: prerequisite to native CRM writes

Updated 2026-10-15 Asia/Manila. Status: **reproduced offline, not mitigated live**.
Converter-only containment is already applied; it authorizes no roster/profile
change. See `INVOICE_CONVERTER_CONTAINMENT_RELEASE.md`.

## Verified boundary and limits

Read-only catalog inspection at 2026-10-14 18:06:46 UTC confirmed
`public.business_staff` has RLS enabled, not forced, and authenticated UPDATE on
every column. Its UPDATE USING and WITH CHECK both allow a matching self
`user_id` independently of manager authority. The enabled postgres-definer
bridge fires AFTER INSERT, DELETE, or UPDATE OF role/title/active. The dated
metadata export is `business-staff-authority-metadata-2026-10-15.json`.

Five inspected live function bodies match the retained functions loaded into
the disposable tests by CR-normalized body MD5: owner/member/manager helpers,
member bridge and trigger function. The original SQL is additionally pinned by
full-file and extracted-section SHA-256. These scoped observations do not prove
full schema parity, customer-data integrity, existing poisoned bindings, JWT/API
reachability or the behavior of other triggers. No staff/customer row was read
or mutated and no business function was invoked live.

## Disposable proof

`scripts/ci/business-staff-authority.test.mjs`: six tests, five sequential
memory-only PGlite databases, always closed; 20-second test, 3-second statement
and 1-second lock limits. Synthetic supporting tables are deliberately minimal.
The test is not a new-install or full offboarding rehearsal.

- A real non-superuser/NOBYPASSRLS authenticated driver starts with only its
  existing roster/native binding. Direct native profile/role mutation and direct
  member-bridge EXECUTE are denied with 42501 in this fixture.
- The unchanged roster policy nevertheless permits the actor's own row to move
  to another business and set role=owner. The definer trigger changes the native
  profile shop and native role, even though authoritative business ownership
  remains false. Merely hardening native profile ACLs cannot close this path.
- An inactive actor can reactivate its own roster and regain native binding.
- A shift-only UPDATE does not fire the column-targeted bridge, but role=role
  does, despite no role-value change. A diff-only self-write guard would miss
  this trigger side effect and cannot by itself establish trusted shop choice.
- Legitimate authoritative-owner roster updates work; an unrelated actor changes
  zero rows. Legacy native profile id distinct from auth user id is preserved.

Run `node --test scripts/ci/business-staff-authority.test.mjs` without credentials,
an external database or a new dependency. The suite is included in CI.

## Required forward-candidate contract

1. Protect both direct native authority and indirect provisioning. Restrict
   browser profile writes to explicitly harmless self-service columns; remove
   arbitrary-user bootstrap and native role-DML paths after auditing their
   consumers. There is no retained native `profiles.role` authority column:
   roles live in `shop_manager.user_roles`.
2. Freeze roster identity (`id`, `business_id`, `user_id`, `created_at`) for
   untrusted updates. Ordinary staff self-service may toggle only on_shift under
   a narrow authenticated/active-row contract; it must not reactivate, promote,
   retarget, edit invitation provenance or rebind the single native profile.
3. Preserve reviewed manager invitation/upsert and role/title/duties/active/
   shift operations. Existing `has_business_role(manager)` includes active staff
   owner/manager/assistant_manager, not just `businesses.owner_id`. Explicitly
   define delegation and who may assign owner-equivalent roles; do not label
   every current manager predicate authoritative ownership.
4. Account for no-op UPDATE target-list triggers, multiple existing rosters,
   inactive staff cleanup and redundant actual-owner rows. A trigger runs under
   its security context, so blindly trusting current_user=postgres is not a
   caller-authorization design. Audit every callable definer writer and bridge
   entry before treating its writes as trusted.
5. Keep legacy id/user_id distinctions and standalone shops valid without guessed
   business/organization linkage. No automatic tenant/backfill repair or silent
   active-shop switch is approved. Fail closed on conflicting authority.
6. Test self, manager, assistant_manager, authoritative owner, unrelated, inactive,
   revoked, legacy and service/operator paths, including no-op targets and
   transaction rollback. Preserve legitimate self-shift and manager server
   workflows in `src/lib/business-staff.functions.ts` with integration tests.
7. Only after the trusted binding contract passes should an atomic/idempotent
   invoice writer use it. Keep due date, line mapping, tax/status, stock posting,
   concurrency and retry policy as explicit invoice acceptance gates.

The next implementation is an **offline forward guard candidate plus tests**,
not a live ACL/RLS adjustment. Fresh provenance/complete grants/policies/writers,
impact analysis, scoped recovery and separately explicit owner release authority
are required before production changes. Existing compromised-state detection and
repair, if needed, require their own reviewed read/data scope.

## Privileged writer inventory follow-up

Retained source identifies `ensure_profile_for(uuid)` as another prerequisite:
it accepts a supplied user ID, has no caller check, and can INSERT a native
profile despite direct table/column restrictions. It resolves existing profiles
by id only and can assign an owned business ID as shop_id. No verified app caller
was found. A fresh bounded live catalog check confirms postgres SECURITY DEFINER,
definition MD5 `77cb775bfedfb78996b31fcbdd3ada4c`, ACL
`{=X/postgres,postgres=X/postgres,service_role=X/postgres}` and effective anon/
authenticated/service execution. It was not invoked or modified.

The same catalog check confirms direct anon/authenticated execution is denied for
the member bridge and its trigger function; service execution remains available.
That does not stop automatic trigger invocation from permitted roster writes.
Only these three functions matched the bounded native-schema literal-write/name
search. Dynamic SQL, unqualified names and other-schema indirect call paths can
escape it; this is not a complete live writer inventory.

Retained server roster upsert/update/delete use the authenticated context client;
the admin client there is only for the bounded email lookup. Business claim
approval changes public business ownership via a privileged path and needs its
own authorization/ownership audit; associate enrollment and organization invites
are not native profile/roster provisioning. Names in `sm_functions.txt` without
retained definitions are not proof of callable writers or permission to alter them.

Exact next test dependency: hash-pin and reproduce bootstrap self/other-user,
null-JWT, legacy-ID and distinct business/shop-ID behavior under locked native
ACLs, then contrast fixture-only client denial with retained operator/service
provisioning. Close or replace untrusted definer entry paths before treating
native profile writes as trusted; production action still needs separate approval.
