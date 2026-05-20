# Grant full privileges to "Admin Business & Private Seller"

## What changes

Insert the missing staff roles for the user account labeled **Admin Business & Private Seller** so it matches the full-privilege set already held by Jordi Bailey.

Roles to grant (in addition to the existing `user` role):
- `admin`
- `sales`
- `support`
- `moderator`
- `advertising`

## How

A single data insert into `public.user_roles` adding the five missing rows for that user's `user_id`. The table's unique constraint on `(user_id, role)` makes this safe — any role that somehow already exists will be ignored via `ON CONFLICT DO NOTHING`.

No schema changes, no code changes, no UI changes.

## Verification

After the insert, re-query `user_roles` for that user and confirm all six roles (`user`, `admin`, `sales`, `support`, `moderator`, `advertising`) are present. The account will immediately see the admin/sales/support/moderator/advertising sections on next page load (roles are checked server-side via `has_role`).

## Note

This is a privileged grant. Once approved, the account will have full backend access including user management, payments visibility, and pricing controls. Confirm this is intended before approving.
