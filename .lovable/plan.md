## Why sign-in feels slow

The auth bootstrap does more work than it needs to on every page load, and the header's "Signing you in…" pill is shown for the entire duration:

1. **Blocking `getUser()` network revalidation.** After the Supabase client already emits `INITIAL_SESSION` from localStorage (fast, local), we still call `supabase.auth.getUser()` — a full round‑trip to the Auth server — before we set `authLoading = false`. For signed‑in users on a slow network that's 300–1500 ms of a spinner where the UI could already be rendered as signed‑in.
2. **Redundant `getSession()` before the listener resolves.** The listener already delivers the session on subscribe; the extra pre‑fetch in the IIFE just adds latency and log noise.
3. **`authLoading` starts `true`.** Anyone visiting anonymously sees the "Signing you in…" pill flash even though there's no token to check.
4. **Home listings use `useEffect` + `useState`.** No cache — every visit refetches the two 12‑row queries (with the heavy `profiles/vehicles/listing_media` embeds) from scratch, so back‑nav and re‑visits feel just as slow as a cold load.

## What to change

### 1. Trust `INITIAL_SESSION`; drop the blocking `getUser()`
In `src/hooks/use-auth.tsx`, replace the whole bootstrap IIFE with a listener‑only bootstrap:

- Remove the `getSession()` → `getUser()` chain.
- The `onAuthStateChange` handler already runs on subscribe with `INITIAL_SESSION`. Use that single event to set the session and flip `authLoading = false`.
- If the persisted refresh token is bad, supabase‑js auto‑refreshes in the background and fires `TOKEN_REFRESHED` (no session) or `SIGNED_OUT` — we already handle both to surface the "Session expired" toast. No functional loss, ~300–1500 ms saved.
- Keep the 8s safety timer, but the common path now resolves in <50 ms.

### 2. Anonymous visitors: no spinner at all
Because `authLoading` will flip to `false` inside the first `INITIAL_SESSION` tick, the "Signing you in…" pill for signed‑out users effectively disappears. Additionally in `src/components/site-header.tsx`, if `!user && loading`, render the plain "Sign in" button instead of the spinner — a stale button is harmless, and it removes the perceived hang.

### 3. Cache the home‑page listings via TanStack Query
In `src/routes/index.tsx`, replace the `useEffect` + `useState` loader with two `useQuery` calls keyed on `["home","featured"]` and `["home","recent"]`, `staleTime: 60_000`. Result: instant paint on back‑nav / re‑visit, and the queries run in parallel with auth bootstrap (they already don't depend on auth).

### 4. Keep `loadRoles` off the critical path (already true, verify)
`loadRoles` runs inside `setTimeout(…, 0)` and only affects `rolesLoading`. The header pill is gated on `authLoading` only, so this is fine — no change needed. Just confirm nothing on `/` reads `isAdmin`/`salesTier` in a way that blocks rendering.

## Files touched

- `src/hooks/use-auth.tsx` — remove the `getSession()`+`getUser()` bootstrap block; release `authLoading` from the `INITIAL_SESSION` branch of the listener.
- `src/components/site-header.tsx` — for anon + loading, render the "Sign in" button rather than the spinner pill (spinner stays for the transient signed‑in→role‑ready case only if we want; otherwise drop it entirely).
- `src/routes/index.tsx` — swap the `useEffect` loader for two `useQuery` calls with a 60 s `staleTime`.

## Trade‑offs / risks

- We stop actively revalidating the persisted token on boot. A revoked/expired refresh token still gets caught (auto‑refresh fires `SIGNED_OUT`/`TOKEN_REFRESHED`), but the UI may briefly show the previous user's name before the toast appears. Acceptable and matches how most SPAs behave.
- Home listings become cached for 60 s; new listings won't show up instantly on repeat visits within that window (existing behavior was "refetch every mount", which nobody asked for).

## Expected result

- Signed‑out visitors: no auth spinner at all; header shows "Sign in" immediately, Latest/Featured listings load in parallel with (and independently of) auth.
- Signed‑in visitors: header switches to the account menu within one tick of `INITIAL_SESSION` (typically <50 ms), instead of after a full `getUser()` round‑trip.
- Repeat visits to `/`: listings render from cache instantly.