
# Phone OTP + Lifecycle Emails

Two related additions: (1) optional phone-number 2FA that is **required** for password recovery, using Supabase's built-in phone auth backed by Twilio, and (2) branded transactional emails for signup welcome plus all critical payment events. No payment provider is wired yet, so payment emails will be triggered from the webhook handler we add when Stripe/PayMongo lands — this plan stubs the trigger points so they're ready.

## What you'll get

**Phone (optional 2FA, required for recovery)**
- Profile → Security panel: "Add phone number" with PH format helper (`+63 9XX XXX XXXX`), sends 6-digit OTP, verifies, stores on `auth.users.phone`.
- New `profiles.phone_verified_at` + `phone_e164` mirror columns for display.
- Password recovery flow change: if a user has a verified phone, `/forgot-password` requires SMS OTP (not just email link). If no phone on file, falls back to email link with a banner suggesting they add a phone after recovery.
- Login stays email+password; phone OTP is **not** required at login (user picked "optional 2FA"). A future toggle "Require OTP at every login" is left as a TODO comment.
- Rate-limited: max 3 OTP sends per phone per hour (enforced via a small `otp_send_log` table + RLS check).

**Emails (Lovable Emails on your domain)**
Templates created and registered:
1. `signup-welcome` — sent after email verification completes, intros the marketplace, links to first-listing flow.
2. `payment-receipt` — successful payment (boost, featured, subscription charge). Includes amount, listing, invoice ID.
3. `payment-failed` — declined card / insufficient funds. CTA to update payment method.
4. `refund-issued` — refund processed. Amount + reason.
5. `subscription-renewed` — recurring renewal receipt.
6. `subscription-cancelled` — cancellation confirmed, end-of-period date.

All templates inherit the site's brand (Plus Jakarta Sans display, Inter body, primary token from `styles.css`), white body background, and the system-managed unsubscribe footer.

Trigger wiring:
- `signup-welcome` fires from a Supabase auth webhook on `email_confirmed`.
- Payment templates fire from a single `payment-events` server route that the future Stripe/PayMongo webhook will POST to. Each event maps 1:1 to a template via `idempotencyKey = ${provider}-${event_id}`.

## What I need from you before building

1. **Sender domain** — you said you'd specify a different one. Reply with the exact domain (e.g. `mail.yourbrand.ph`) so I can kick off DNS setup. Templates and triggers can be built in parallel; emails just won't send until DNS verifies.
2. **Twilio credentials** — Supabase phone auth needs your Twilio Account SID, Auth Token, and a Messaging Service SID (or sender number). I'll request them via the secrets prompt when implementation starts. Twilio PH SMS runs ~$0.05–0.08 per message; budget accordingly. I'll also flag SMS Pumping Protection + Geo Permissions (PH-only) in your Twilio console — critical to avoid fraud bills.

## Technical details

- **Phone verification**: `supabase.auth.updateUser({ phone })` → triggers Supabase to send OTP via Twilio → `supabase.auth.verifyOtp({ phone, token, type: 'phone_change' })`.
- **Recovery via SMS**: custom server fn `requestPhoneRecovery({ phone })` sends OTP via `signInWithOtp({ phone })`; on verify, issues a short-lived session and redirects to `/reset-password`.
- **Auth config**: `supabase--configure_auth` to enable phone provider; Twilio creds entered in Cloud → Auth (or via secrets if we proxy through an edge function).
- **Email infra**: `setup_email_infra` then `scaffold_transactional_email`; templates added to `src/lib/email-templates/registry.ts`; `sendTransactionalEmail` helper at `src/lib/email/send.ts`.
- **Auth email hook**: `scaffold_auth_email_templates` so the existing email-confirmation email is also branded.
- **Payment webhook stub**: `src/routes/api/public/payment-events.ts` with HMAC verification placeholder — concrete signature check added when payment provider is chosen.
- **New tables**: `otp_send_log(user_id, phone, sent_at)` with RLS (users can only see their own).

## Files touched

```
src/routes/dashboard.profile.tsx              — phone add/verify UI
src/routes/login.tsx                          — "Forgot password?" → /forgot-password
src/routes/forgot-password.tsx                — NEW (email or SMS choice)
src/routes/reset-password.tsx                 — accept SMS-issued session
src/lib/email-templates/                      — 6 new .tsx templates + registry
src/lib/email-templates/registry.ts           — register all 6
src/lib/email/send.ts                         — NEW helper
src/routes/api/public/payment-events.ts       — NEW webhook stub
src/routes/unsubscribe.tsx                    — NEW branded unsubscribe page
supabase/migrations/...                       — otp_send_log + profiles.phone_e164
```

## Out of scope (for this pass)

- Choosing/wiring an actual payment provider — separate Pass 2 task.
- TOTP/authenticator-app 2FA.
- SMS notifications for messages/listings (only auth + payments here).
