# Finish-the-app plan

Tackled in dependency order so each step unblocks the next. Each phase is independently shippable.

## Phase 1 — Email domain + transactional emails
Without this, receipts, inquiry notifications, verification approvals, and team invites fail-soft (logged, not delivered).

1. Open the email domain setup dialog so you can pick a sender domain (e.g. `notify.365motorsales.com`) and add the NS records at your registrar.
2. Once set, scaffold Lovable Emails infra (queue, suppression, unsubscribe) and the auth email templates so password reset / verification / magic links use the project's branding.
3. Wire the existing transactional templates (ad inquiry, payment receipt, refund, subscription renewed/cancelled, support ticket, team invite, verification approve/reject) into the queue via `sendTransactionalEmail`.
4. Add an admin notification on verification approve/reject (currently missing).

## Phase 2 — Auth hardening
1. Enable Google sign-in via `configure_social_auth` (providers: ["google"]) and add a "Continue with Google" button on `/login` and `/signup` using the Lovable broker.
2. Turn on **leaked password protection (HIBP)** via `configure_auth`.
3. Keep email/password as-is (no auto-confirm). Make sure verification email uses the new branded template.
4. Leave TOTP 2FA optional for users, but **enforce** it for accounts with the `admin` role (block admin-area routes until enrolled).

## Phase 3 — Phone / WhatsApp verification (currently broken)
Supabase doesn't send WhatsApp OTPs natively. Two viable paths — pick one:
- **A (recommended, cheap):** Replace "WhatsApp verify" with a Twilio SMS OTP via the Twilio connector, server-fn issued + verified, stored on the profile.
- **B:** Twilio WhatsApp Business sender (needs business verification, longer setup).

Plan assumes A unless you say otherwise. Includes rate-limit + cooldown to prevent SMS pumping.

## Phase 4 — Stripe go-live
Code is already wired for sandbox/live switching. Steps are user-driven in Stripe:
1. Claim the sandbox account from **Connectors → Lovable Cloud → Payments**.
2. Complete Stripe activation (business, bank, 2FA, submit).
3. Install Lovable app on the live account (copy from sandbox includes it).
4. Lovable auto-provisions `STRIPE_LIVE_API_KEY` + `PAYMENTS_LIVE_WEBHOOK_SECRET` and writes `pk_live_…` to `.env.production` on next publish — test-mode banner disappears automatically.
5. Run the readiness check from the Payments tab.
6. **Optional, recommended:** enable end-to-end tax/compliance (`managed_payments: { enabled: true }`) in `createCheckoutSession` for digital products (subscriptions, boosts). Adds +3.5% but Stripe handles VAT/filing/disputes/receipts globally. Set proper Stripe tax codes on the 5 subscription products + boost product first.

## Phase 5 — Analytics + error monitoring
1. Add **Plausible** (privacy-friendly, simple) via a small script in `__root.tsx`, gated on cookie consent.
2. Add **Sentry** for browser + server-fn error monitoring (DSN via secret).
3. Tie cookie banner consent to analytics gating (currently banner exists but doesn't actually block).

## Phase 6 — SEO / PWA polish
1. Verify `sitemap.xml` includes every real route (browse, businesses, rides, shop categories, support pages).
2. Add an offline fallback service worker (manifest already exists, install prompt already exists).
3. Audit `<title>` / meta on top-traffic routes (`/`, `/pricing`, `/businesses`, `/shop`, `/sell`).

## Phase 7 — Policy refresh (memory rule)
After Phases 1–4 land, bump "Last updated" on `/terms`, `/privacy`, `/refund-policy` to reflect: new auth methods (Google, TOTP, SMS), Stripe live processing, analytics provider, email sender domain.

---

### What I need from you before building
1. **Phone verification path** — confirm Twilio SMS (path A) or WhatsApp Business (path B)?
2. **Stripe compliance handling** — enable `managed_payments` on subscriptions/boosts (+3.5%, Stripe handles tax globally), or stick with calculation-only (+0.5%) for now?
3. **Analytics** — Plausible (recommended), PostHog (product analytics + session replay), or GA4?
4. **Build order** — do all phases now, or just Phase 1 + 2 first and pause?