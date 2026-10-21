# Preserve the selected shop during staff maintenance

20 October 2026. Follow-up to CLIENT_STAFF_BOUNDARY_AND_LIFECYCLE.md.
Staged source only; no migration, live data change, grant or deployment.

## Connected repair composition

The retained active staff bridge previously overwrote a user's single native
profile and account-global native roles on a roster role/title update in any
business. The revised lifecycle builder preserves an existing different-shop
binding. A guarded ON CONFLICT update only admits a null or matching shop, and
native role changes only follow a confirmed matching profile. Missing/suppressed
same-shop writes are rejected rather than mistaken for an intentional other-shop
no-op. Final role witnesses reject suppressed inserts or removals.

The retained inactive repairs remain: only the selected shop's shifts/tills are
closed, unknown cash remains unknown, historical records remain, and another
shop's profile and roles are preserved. Original constraints are not relaxed.

## Validation actually executed

- 13/13 boundary groups on the unchanged boundary SQL.
- 14/14 retained lifecycle groups rerun against the revised builder.
- 5/5 new selected-shop groups: A role changes preserve B; selected A changes
  still synchronize; suppressed profile UPDATE and role INSERT/DELETE roll back.

These are real selected SQL operations in disposable PGlite databases with
synthetic Auth subjects. They do not establish signed sessions, native PG17 staff
races, every privileged writer, or a complete multi-shop role model. Existing
stock native-PG17 tests remain separate evidence, not staff-test substitutes.

The 137 focused invoice/inventory tests, seven stock-source checks, 21 operation
replay/setup tests, 27 original staff groups and native stock concurrency passed
on predecessor 905fe72d in supplemental run 39417835404. Its full CI still needed
its final unit result at capture. This new source needs its own exact-head checks.

## Read-only hosted correspondence

A catalog-only READ ONLY query on the sole 365 project observed PostgreSQL170006.
No Auth/business rows, identifiers, counts, credentials or private files were
read. The two selected current function bodies match the pinned retained source:

| Function | Normalized body MD5 |
| --- | --- |
| `public.trg_staff_sync_team_thread()` | `b6c1d106f82fc26edef65f28189a3470` |
| `shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)` | `3953299c83e7f20a19f4a7f60b12ba84` |

The current chat CHECK allows invited/active/left; shift CHECK allows
on_shift/on_break/completed/manager_closed. Current function execution remains
postgres/service_role only. The three current roster trigger attachments match
the retained timestamp, team-chat and targeted native-bridge attachments.
This is selected metadata correspondence, not full catalog, grants or recovery
acceptance. The first metadata query used the wrong chat table name and failed
42P01; the corrected query used retained public.chat_thread_members and succeeded.
Both attempts were read-only. No restriction was applied or replayed.

## Remaining release gates

Historical memberships, direct native profile/role authorization, explicit safe
shop switching, session revocation, complete stock/financial transaction wiring,
inter-store journeys, migrations/recovery, staging and client/device acceptance
remain unresolved. The application's manual stock adjustment is still interlocked.
Main and production are not promoted by this source checkpoint.
