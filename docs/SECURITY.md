# Security Notes

## Accepted Supabase linter warnings

After the function-hardening migration, three `SECURITY DEFINER` linter
warnings remain. They come from two functions that **must** stay executable
by their respective callers for the app to work. They are intentional and
reviewed.

### 1. `public.has_role(_user_id uuid, _role app_role)`

- **Warning:** `0029 — Signed-In Users Can Execute SECURITY DEFINER Function`
- **Why it's `SECURITY DEFINER`:** it reads `public.user_roles`, which is
  locked down by RLS. Without definer rights, RLS would recurse (policies
  on `user_roles` themselves call `has_role`).
- **Why `authenticated` must keep EXECUTE:** every protected RLS policy
  on `listings`, `profiles`, `subscriptions`, `payments`, `user_roles`,
  `account_audit_log`, etc. evaluates `has_role(auth.uid(), 'admin')` or
  `has_role(auth.uid(), 'sales')`. PostgreSQL requires the calling role
  to hold EXECUTE on the function before it can run, even inside a policy.
  Revoking from `authenticated` would lock every signed-in user out of
  RLS-protected reads and writes.
- **Why this is safe:** the function only returns a boolean derived from
  the caller's own `auth.uid()`. It cannot be used to read other users'
  roles in bulk, change data, or escalate privileges. It is `STABLE` and
  has `SET search_path = public`.

### 2. `public.increment_listing_view(_listing_id uuid, _viewer_id uuid)`

- **Warning:** `0028 — Public Can Execute SECURITY DEFINER Function` and
  `0029 — Signed-In Users Can Execute SECURITY DEFINER Function`
- **Why it's `SECURITY DEFINER`:** it writes to `public.listing_views` and
  bumps `listings.view_count`. Both tables are RLS-protected so visitors
  cannot insert rows directly — the function does it on their behalf.
- **Why `anon` and `authenticated` must keep EXECUTE:** the listing detail
  page calls it on every page load to track impressions for owner
  analytics. Most viewers are not signed in.
- **Why this is safe:** the function only accepts a listing ID plus an
  optional viewer ID, only ever inserts one view row, and only increments
  one counter. It cannot read or modify anything else. It has
  `SET search_path = public`.

## Functions that are NOT public

Every other `SECURITY DEFINER` function in `public` has had EXECUTE revoked
from `PUBLIC`, `anon`, and `authenticated`. They run only as triggers, as
`service_role` (queue workers, edge functions), or via `pg_cron`. See
`supabase/migrations/` for the exact REVOKE statements.

## How to re-verify

1. `supabase--linter` — should return exactly 3 warnings, all matching the
   two functions above.
2. `SELECT proname, has_function_privilege('anon', oid, 'EXECUTE'),
   has_function_privilege('authenticated', oid, 'EXECUTE')
   FROM pg_proc WHERE pronamespace='public'::regnamespace AND prosecdef;`
   — only `has_role` (auth only) and `increment_listing_view` (anon + auth)
   should show `true`.
