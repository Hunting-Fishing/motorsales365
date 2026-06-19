# Password Reset Backend — Already Wired

After auditing the codebase, the tokenized password reset flow is fully implemented end-to-end. No changes are needed.

## What's already in place

1. **Request a reset link**
   - `/forgot-password` (public) — calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: <site>/reset-password })`.
   - `/login` — "Forgot?" link goes to `/forgot-password`.
   - `/dashboard/profile` — "Email me a reset link" button calls the same API for the signed-in user.

2. **Branded confirmation email** (Lovable Emails, domain `notify.365motorsales.com` is verified)
   - Auth email hook: `src/routes/lovable/email/auth/webhook.ts` intercepts Supabase recovery events.
   - Template: `src/lib/email-templates/recovery.tsx` (subject: "Reset your password").
   - The hook builds a **tokenized** link using `token_hash`:
     `https://365motorsales.com/reset-password?token_hash=…&type=recovery`
     (works from any device/browser — not PKCE-locked).

3. **Reset page**
   - `/reset-password` (public): reads `token_hash` + `type=recovery`, calls `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` to establish a recovery session, then `supabase.auth.updateUser({ password })` to set the new password.
   - Also handles PKCE (`?code=`) and legacy hash (`#access_token`) flows as fallbacks.
   - Shows clear errors for expired/invalid/already-used links and lets the user request a new one.

## Recommendation

No code changes. If you'd like, I can add one of the following polish items — say which:
- A dedicated post-reset "Password changed" confirmation email.
- Rate-limit guard / cool-down on the "Send reset link" buttons.
- Audit-log entry in `admin_audit_log` when a user completes a password reset.
