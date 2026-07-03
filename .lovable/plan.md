
## Problem

Users (Jocelyn, and you) see the header pill "Signing you in…" stuck indefinitely on `/login` and other pages.

The network log confirms the cause:

```
POST /auth/v1/token?grant_type=refresh_token
→ 400 { "code": "refresh_token_not_found" }
```

The browser has a persisted Supabase session whose refresh token is no longer valid on the server (rotated/expired/revoked). Our current bootstrap in `src/hooks/use-auth.tsx` cannot recover from that:

1. `onAuthStateChange` fires `INITIAL_SESSION` with the stale session — we set `rolesLoading = true` and fire `loadRoles`.
2. Those PostgREST calls use the expired access token. `supabase-js` tries to auto-refresh, the refresh 400s, and the pending queries end up waiting on the internal refresh lock — they never resolve.
3. `loading = authLoading || (user && rolesLoading)` stays `true`. The pill spins forever.

There is no timeout, no "refresh failed → sign out locally" recovery, and no safety net if `getUser()` / `getSession()` themselves stall.

## Fix

Only touch `src/hooks/use-auth.tsx`. No schema or UI changes.

1. **Detect and clear a dead session on boot.**
   In the bootstrap effect, when `getUser()` returns an auth error OR `getSession()` returns null while local storage still holds a token, call `supabase.auth.signOut({ scope: "local" })`. That wipes the bad token from `localStorage` without a network round-trip, then let `handleSession(null)` + `setAuthLoading(false)` render the signed-out UI.

2. **Listen for refresh failures at runtime.**
   Also treat the `SIGNED_OUT` event and any `INITIAL_SESSION` / `TOKEN_REFRESHED` event that arrives with `newSession === null` as a hard reset: `handleSession(null)`, `setAuthLoading(false)`, `setRolesLoading(false)`.

3. **Safety timeouts (belt & suspenders).**
   - `authLoading` — force `false` after 8s if the bootstrap has not resolved (network stall).
   - `rolesLoading` — race `loadRoles`'s queries against an 8s timeout so a hung PostgREST call can't wedge the UI; on timeout we set roles to `[]` and log a warning. The real values will populate on the next successful fetch (query invalidation on next auth event).

4. **Don't gate the "Signing you in…" pill on `rolesLoading` alone.**
   Change the derived `loading` to `authLoading` only. Roles arriving late shouldn't keep showing "Signing you in…" — that message is misleading once the session is confirmed. Role-gated routes already check `rolesLoading` separately (`/admin` route redirect logic) so this doesn't loosen access control; it only fixes the header UX.

## Files touched

- `src/hooks/use-auth.tsx` — bootstrap effect, `handleSession`, `loading` derivation, add timeouts.

## Verification

- Reproduce: in DevTools, edit the persisted `sb-…-auth-token` refresh_token to gibberish, reload → header should settle into signed-out state within ~1s, not spin forever.
- Normal signed-in refresh: reload while logged in → pill briefly shows, then resolves to the account chip.
- Signed-out cold load: no pill flash beyond initial mount.
- No regression on `/admin` (role gate still waits for roles before deciding).

## Out of scope

- Not changing any RLS, migrations, or the sign-in flow itself.
- Not touching the persona switcher or protected routes.
