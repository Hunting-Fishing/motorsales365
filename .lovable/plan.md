
## Problem

Nobody could sign up from the public site today. Jocelyn reported "Database error saving new user"; what the user actually saw was the toast "Signup failed (404)." — the client parses a 404 HTML page and falls back to a generic message.

Verified today:

- `POST https://365motorsales.com/api/public/auth/signup` → **404** (custom domain and `motorsales365.lovable.app`).
- `POST https://365motorsales.com/api/public/payment-events` → 200, `POST /api/public/hooks/dispatch-expand` → 200. So the deployed Worker is healthy — only the `auth/signup` route is missing.
- Supabase auth logs: **0** `/signup` POSTs in the last 24 h — requests never reach Supabase Auth.
- Postgres logs: no `handle_new_user` / trigger errors in the last 72 h.
- `signup_failure_events` table is empty (server-side audit never runs because the route never runs).
- Last successful profile insert: **July 5**. The `src/routes/api/public/auth/signup.tsx` route was introduced after that, so the currently-published Worker predates it.

Everything else about signup is fine — `handle_new_user`, `profiles` RLS, the tightened `is_staff_account` policy from today's security migration all pass a simulated insert cleanly.

## Fix

Two-part fix. Rebuild + republish restores the route immediately; the follow-up hardening makes the same class of failure visible next time instead of silently showing "Signup failed (404)".

### 1. Republish the site (primary fix)

- Trigger a fresh build + publish so the deployed Worker picks up `src/routes/api/public/auth/signup.tsx` (already registered in `routeTree.gen.ts`).
- Verify after publish:
  - `curl -sSL -o /dev/null -w "%{http_code}\n" -X POST https://365motorsales.com/api/public/auth/signup -H 'content-type: application/json' -d '{}'` → expects **422** (schema_invalid), not 404.
  - Attempt a real signup end-to-end from `https://365motorsales.com/signup` with a throwaway email; expect the verify-email screen.
- Confirm one row lands in `public.signup_failure_events` from the empty-body probe, and one confirmed row in `public.profiles` from the real signup.

### 2. Guardrails so this failure mode is loud next time (small code change)

Add two low-risk safeguards in `src/routes/signup.tsx`:

- When `res.status === 404` (or `res.status >= 500` with no JSON body), show a clearer toast: "Signup service is temporarily unavailable. Please try again in a minute." and `console.error` the response text.
- On any non-OK response where `body` is `null` (JSON parse failed), post a small beacon to `ops_alerts` via the existing `/api/public/hooks/*` pattern is out of scope; instead just `console.error({ status, text })` so it shows up in the browser console + ClickHouse worker logs when a user reports it.

No RLS, DB, or trigger changes. No changes to `handle_new_user`. No changes to the signup validator or route logic itself.

## Out of scope

- Rewriting the signup route.
- Touching `profiles` RLS or the trigger chain (already verified healthy).
- Retro-notifying users who couldn't sign up.

## Verification checklist

- [ ] Production `POST /api/public/auth/signup` returns 422 with empty body (route exists).
- [ ] Real signup from the site reaches `/verify-email`.
- [ ] `signup_failure_events` receives probe rows.
- [ ] Jocelyn's tester receives the confirmation email.
