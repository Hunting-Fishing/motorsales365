
## Current state

- One profile exists in the database: **Jordi Bailey** (`a3999f39-…`), with only the `user` role. That's why nothing under `/admin` is unlocked.
- `useAuth` reads roles from `public.user_roles`. RLS on `user_roles` allows admins to manage and admin-only nav already exists at `/admin/users` (role toggles per user) and per-section role gating in `src/routes/admin.tsx`.
- There is **no** feature-flag / role-simulation system today.

## Goal

1. Make sure the signed-in account is a proper Admin in the database.
2. Give Admin a single Sandbox page to:
   - Simulate any role (admin / sales / moderator / support / advertising / user) for the current session, so they can preview every gated screen without changing the real DB role.
   - Toggle app feature flags on/off globally for testing.

## Step 1 — Grant admin to the current user (DB)

Insert the admin role for Jordi Bailey via a data insert (idempotent):

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('a3999f39-3641-4e16-a11b-f2b6563b8a8f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

After this they'll see the full admin nav on next page load.

## Step 2 — Role simulation in `useAuth`

Extend `src/hooks/use-auth.tsx`:

- Keep `realRoles` (from DB) and add `simulatedRoles` (from `localStorage["sandbox.roles"]`).
- Only the **real admin** is allowed to simulate. For anyone else, simulation is ignored.
- Exposed `isAdmin / isSales / …` reflect the **effective** roles (simulated if set, else real).
- Also expose `realIsAdmin`, `simulatedRoles`, `setSimulatedRoles(roles[] | null)` so the Sandbox UI can drive it.
- An on-screen banner ("Simulating: sales — exit") appears site-wide when simulation is active.

This is purely client-side; RLS in the DB is untouched, so simulation only changes what the UI renders / which admin pages are reachable. It does **not** grant DB privileges they don't really have.

## Step 3 — Feature flags

Create `src/lib/feature-flags.tsx`:

- A small `FeatureFlagProvider` + `useFeatureFlag(key)` hook.
- Default flags (e.g. `towing`, `referrals`, `multiCurrency`, `adsInquiry`, `boosts`, `pendingSaleAutoExpire`). All default `true`.
- Persisted in `localStorage["sandbox.flags"]`.
- Admin-only toggling. Other users read defaults.

Integration: wrap the app in `src/routes/__root.tsx` next to `CurrencyProvider`. Gate a few obvious entry points (e.g. nav links to Towing / Referrals) with `useFeatureFlag` so toggles are visibly testable. No business-logic changes beyond rendering gates.

## Step 4 — Admin Sandbox page

New route `src/routes/admin.sandbox.tsx` (admin-only via the existing gate):

- **Role simulator** — checkboxes for each role + "Reset to my real roles" button. Shows a warning that this is UI only.
- **Feature flags** — switch per flag with description. Buttons: "Enable all", "Reset to defaults".
- **My account** — shows current user id, real roles, effective roles, with a "Copy" helper.

Add it to the admin nav in `src/routes/admin.tsx`:

```ts
{ to: "/admin/sandbox", label: "Sandbox", Icon: FlaskConical, roles: ["admin"] }
```

## Files touched

- migration/insert: grant admin role
- `src/hooks/use-auth.tsx` — add simulation
- `src/lib/feature-flags.tsx` — new
- `src/routes/__root.tsx` — wrap with `FeatureFlagProvider`
- `src/routes/admin.tsx` — add Sandbox nav entry
- `src/routes/admin.sandbox.tsx` — new page
- `src/components/sandbox-banner.tsx` — small banner shown when simulating
- A couple of nav components updated to consume `useFeatureFlag` for demo gating

## Out of scope

- Persisting simulated roles or flags server-side (intentionally local-only).
- Changing RLS or backend role checks — simulation is UI-only by design.

Confirm and I'll implement.
