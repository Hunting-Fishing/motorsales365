## Problem
Users are getting logged out too often. Digging in, three things are working against long sessions:

1. **`src/routes/_authenticated/route.tsx:65`** — every navigation into a protected route calls `supabase.auth.getUser()`, which hits `/auth/v1/user`. Any transient network hiccup (spotty wifi, backend cold-start, momentary 5xx) returns `error`, so we `throw redirect({ to: "/auth" })`. Session is still valid — we just kicked them out.
2. **`src/hooks/use-auth.tsx:622-635`** — a single unexpected `SIGNED_OUT` (which supabase-js can emit for one failed refresh attempt, e.g. tab wake from sleep) is treated as a hard sign-out immediately, with no retry.
3. **`src/hooks/use-auth.tsx` + `client.ts`** — no session-length policy. Refresh happens purely on Supabase's default JWT expiry, and once refresh fails once we teardown.

The refresh-token lifetime itself is already 30 days on Supabase's default, so 7-day web / indefinite PWA is achievable — the issue is we abandon the session too eagerly.

## Goal
- **Web (browser tab):** stay signed in as long as the browser has a valid refresh token; only sign the user out if they've been away 7+ days OR they explicitly log out OR the refresh token is definitively revoked by the server.
- **PWA (installed as app / standalone display-mode):** stay signed in indefinitely — never auto-redirect to `/auth` on a transient failure; show an inline reconnect banner instead.

## Changes

### 1. Stop kicking users out on transient `getUser()` failure
`src/routes/_authenticated/route.tsx`:
- Drop the `getUser()` call from `beforeLoad`. Keep the cheap local `getSession()` check — if there's no session, redirect to `/auth`. If there is a session, trust it and let `<AuthenticatedGuard />` react to a real `SIGNED_OUT` via `useAuth`.
- In `AuthenticatedGuard`, only redirect when `authError === "refresh_failed"` AND we've retried once, OR the user has been absent (no session) for the whole bootstrap window. Never redirect on the first tick of a transient loss.

### 2. Retry once before treating a `SIGNED_OUT` as terminal
`src/hooks/use-auth.tsx` (lines ~606-640):
- When we see an unexpected `SIGNED_OUT` (had a user, we didn't call signOut), don't immediately null the session. Call `supabase.auth.refreshSession()` once. If it returns a session → keep the user logged in and clear `authError`. If it fails → then proceed with the existing teardown.
- Same treatment for `TOKEN_REFRESHED` with no session: attempt one manual `refreshSession()` before flipping to `authError = "refresh_failed"`.

### 3. Track "last active" and enforce the 7-day web idle policy
Add a small helper (co-located in `use-auth.tsx` or `src/lib/session-policy.ts`):
- On every `SIGNED_IN` / `TOKEN_REFRESHED` / user interaction (piggyback on a lightweight `visibilitychange` + `focus` listener), write `Date.now()` to `localStorage["auth:lastActiveAt"]`.
- On bootstrap, if `!isStandalonePWA()` AND `Date.now() - lastActiveAt > 7 * 24h`, call `signOut({ scope: "local" })` before the listener fires and land the user on `/auth?reason=idle_7d`.
- If `isStandalonePWA()` — skip the idle check entirely. Installed app = indefinite.

`isStandalonePWA()`:
```ts
window.matchMedia("(display-mode: standalone)").matches ||
(navigator as any).standalone === true
```

### 4. Reconnect banner instead of redirect (PWA only)
When `isStandalonePWA()` is true and `authError` becomes `"refresh_failed"`:
- Do NOT navigate to `/auth`.
- Render a slim top banner ("You've been disconnected — tap to sign back in") that calls `retryAuth()`. Keep the current view mounted so the user doesn't lose form state.
- Web (non-standalone) keeps today's redirect-to-`/auth` behavior, but only after the retry in change #2 fails.

### 5. Extend Supabase refresh-token lifetime (indefinite-ish for PWA)
Supabase's default refresh token is 30 days. To honor "indefinite" for the PWA, request the auth settings bump:
- Set JWT expiry to 1 hour (default, keep).
- Set refresh token lifetime to the maximum available on our plan (e.g. 1 year), with rotation enabled and reuse interval 10s so multi-tab refreshes don't invalidate each other.
- This is a Cloud auth-settings change — I'll flag it in the same turn but note it can't be toggled from code (no `configure_auth` field for it); we'll adjust via the Cloud auth settings UI.

### 6. Don't nuke session on multi-tab refresh races
Confirm `src/lib/currency.tsx:116` and `src/lib/garage.ts:116` `onAuthStateChange` subscribers don't call `signOut` on transient events. They currently just refetch, which is fine — no change expected, just verify.

## Verification
- **Web (Chrome, non-standalone):**
  - Sign in, close all tabs, come back after 1 hour → still signed in.
  - Sign in, come back after 6 days → still signed in.
  - Sign in, come back after 8 days → redirected to `/auth?reason=idle_7d`.
  - Sign in, throttle network to Offline in DevTools, navigate between protected pages → stays on the page, no redirect to `/auth`. Restore network → session refreshes silently.
- **PWA (installed on iOS/Android home screen):**
  - Sign in, force-close app, reopen after 30 days → still signed in (assuming Cloud refresh-token lifetime is bumped).
  - Sign in, go airplane mode, tap around → reconnect banner shows, no redirect.
- **Regression suite:** run `bun x vitest run src/__tests__/auth-*.test.tsx` — update the "unexpected SIGNED_OUT" and "refresh failure" tests to expect a retry before teardown.
- **Manual:** sign out via header button → still lands on `/auth` cleanly (explicit signOut path unchanged).

## Non-goals
- No changes to the login/signup UX.
- No changes to `_authenticated` route composition beyond the `beforeLoad` / guard behavior.
- No new dependencies.