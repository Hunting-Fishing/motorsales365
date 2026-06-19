# Add Password Management to User Profile

Add a new "Password" card to `src/routes/dashboard.profile.tsx` (placed near the Account email card) with two clear flows.

## 1. Change password (knows current password)

A form with three inputs:
- Current password
- New password (min 8)
- Confirm new password

Behavior:
- Validate new === confirm and length ≥ 8 client-side (zod + toast errors).
- Reauthenticate by calling `supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })`. If it fails, show "Current password is incorrect."
- On success, call `supabase.auth.updateUser({ password: newPassword })`.
- Toast success, clear fields.

## 2. Forgot current password (auto-logged-in user)

A secondary action: "I don't remember my current password — email me a reset link."

- Button calls `supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${siteOrigin()}/reset-password` })`.
- Toast: "Reset link sent to {email}. Check your inbox."
- Reuses the existing public `/reset-password` route (already implemented, handles `token_hash=recovery` / PKCE / hash flows and lets user set a new password).

## UI / placement

- New `<section>` block in `dashboard.profile.tsx` matching the existing card style (same `rounded-2xl border bg-card p-6` pattern used by the Account email card).
- Heading "Password", short helper text describing both options.
- Inputs use shadcn `Input` + `Label`, `Button` for actions, with `autoComplete="current-password"` / `"new-password"`.
- Loading states with disabled buttons during submission.

## Files

- **Edit** `src/routes/dashboard.profile.tsx` — add state, handlers, and the new Password card. No backend or migration changes; both flows use existing Supabase auth methods and the existing `/reset-password` page.
