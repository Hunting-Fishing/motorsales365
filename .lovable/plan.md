# Reset-password UX polish

Add explicit loading/success/error UI, expired-token guidance, and a cooldown-gated resend.

## `/forgot-password`

- Add `status: 'idle' | 'sending' | 'sent' | 'error'` and `errorMsg` state for the **Email link** tab (toasts stay as a supplement).
- After a successful send, replace the form with a **success panel**: green check icon, "Reset link sent to <email>. It expires in 1 hour. Check spam if you don't see it." plus a **Resend reset link** button.
- **Cooldown timer**: when a link is sent (initial or resend), start a 60s cooldown stored in `useState` + `useEffect` interval. The Resend button shows `Resend in 0:45` and is disabled until the timer ends. Persist the cooldown deadline in `sessionStorage` keyed by email so a refresh keeps the timer honest.
- Error state shows an inline destructive alert (in addition to the toast) with the Supabase message and a Retry hint; on rate-limit errors (`status 429` / "rate limit" in message), force the cooldown to ~60s and show "Too many requests — try again in X seconds".
- SMS tab gets the same `status` model: spinner-labeled buttons, success/error alerts inline, and a 30s "Resend OTP" cooldown on the OTP step.

## `/reset-password`

- Replace the boolean `mode` with `state: 'verifying' | 'request' | 'set' | 'updating' | 'success' | 'invalid' | 'expired'`.
- While exchanging the token (`verifyOtp` / `exchangeCodeForSession`) show a centered **spinner + "Verifying your reset link…"** card so users don't see a flash of the request form.
- On Supabase errors, classify the message:
  - "expired", "otp_expired", "Token has expired" → `expired` state.
  - everything else (invalid, already used, bad code) → `invalid` state.
- `expired` / `invalid` panels show: destructive icon, plain-English explanation, and a **primary CTA "Request a new reset link"** that links to `/forgot-password`, plus a secondary "Back to sign in" link.
- `updating` disables the form and shows a spinner button label.
- `success` state shows a green panel "Password updated" and auto-redirects to `/dashboard` after a 1.5s delay (with a manual "Go to dashboard" button as fallback).
- Password mismatch / length errors stay as inline field errors (already present), augmented with `aria-live="polite"` on the error region for accessibility.

## Files

- **Edit** `src/routes/forgot-password.tsx` — status states, success panel, cooldown timer (Email + SMS), inline alerts.
- **Edit** `src/routes/reset-password.tsx` — state machine, verifying spinner, expired/invalid panels with CTA back to `/forgot-password`, success panel.

No backend, schema, or new dependency changes — uses existing shadcn `Button`, `Alert` (or local destructive panel), `Input`, sonner toasts, and lucide icons.
