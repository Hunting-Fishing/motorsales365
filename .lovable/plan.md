# Forgot/Reset Password — Already Implemented

Both pages exist and are fully wired end to end.

## `/forgot-password` (`src/routes/forgot-password.tsx`, 150 lines)
- Tabbed UI: **Email link** + **SMS OTP (PH mobile)**.
- Email tab: `supabase.auth.resetPasswordForEmail(email, { redirectTo: <site>/reset-password })`.
- SMS tab: `signInWithOtp({ phone })` → `verifyOtp` → navigates to `/reset-password` in recovery mode.
- Linked from `/login` ("Forgot?").

## `/reset-password` (`src/routes/reset-password.tsx`, 198 lines)
- Detects all three Supabase recovery flows:
  - `?token_hash=…&type=recovery` → `verifyOtp({ token_hash, type: 'recovery' })` (works cross-device).
  - `?code=…` (PKCE) → `exchangeCodeForSession`.
  - `#access_token=…&type=recovery` (legacy hash).
- Also listens for `PASSWORD_RECOVERY` on `onAuthStateChange`.
- Shows a "Set new password" form (new + confirm, min 8 chars) and calls `supabase.auth.updateUser({ password })`, then redirects to `/dashboard`.
- Renders clear errors for invalid/expired/already-used links and lets the user request a new one inline.

## Backend
- Branded recovery email is already wired through `src/routes/lovable/email/auth/webhook.ts` + `src/lib/email-templates/recovery.tsx`, sending from the verified `notify.365motorsales.com` domain with a `token_hash` link to `/reset-password`.

## Recommendation
No code changes needed. If you want any polish on top, tell me which:
- Resend cooldown / rate-limit on the "Send reset link" button.
- Password strength meter on `/reset-password`.
- Post-reset confirmation email ("Your password was changed").
