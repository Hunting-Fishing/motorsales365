# Full-app readiness audit — what's left

I swept the codebase end-to-end (113 routes, 112 public tables, all helpers, migrations, docs, plan files, and `coming soon` / `TODO` markers). Below is the complete remaining-work list, grouped by severity. Nothing destructive — this is a checklist, not an edit.

## 1. Launch blockers (must do before "done")

**A. Go live on Stripe** — backend is fully wired in sandbox, but live money is gated on out-of-code steps owned by you (see `docs/STRIPE_GOLIVE.md`):
1. Claim Stripe sandbox account in Connectors → Payments.
2. Run Stripe activation wizard (business, bank, 2FA).
3. Copy sandbox products to live, install Lovable app on live account.
4. Lovable auto-provisions `STRIPE_LIVE_API_KEY` + `PAYMENTS_LIVE_WEBHOOK_SECRET`.
5. Publish project → `pk_live_...` is written to `.env.production` → orange test-mode banner disappears.

No code changes required. Until step 5, every checkout is sandbox.

**B. Pricing page copy lies a little** — `src/routes/pricing.tsx:549` still says *"Live card payments are coming soon."* That string should flip the moment live keys land. Either remove it now or gate it on `import.meta.env.PROD && !VITE_PAYMENTS_CLIENT_TOKEN.startsWith("pk_live")`.

## 2. Coming-soon surfaces still in production UI

`src/routes/payments.tsx` advertises 5 methods as `soon` and 5 as `planned`. Each is a real product decision:

| Method | Status | What "shipping" means |
|---|---|---|
| Maya wallet | soon | Stripe PH supports it — enable PaymentMethod in Stripe Dashboard, add `"maya"` to checkout method list |
| QR Ph | soon | Same — flip in Stripe + checkout config |
| ShopeePay | planned | Not on Stripe PH yet; either remove card or wait |
| InstaPay / PESONet | planned | Needs a bank-transfer rail (Xendit/Maya Business). Out-of-scope for Stripe-only stack |
| Online banking (BPI/BDO/UnionBank) | planned | Same as above |
| 7-Eleven / Cebuana / M Lhuillier | planned | Needs Dragonpay/Xendit OTC rail |
| Manual bank deposit | planned | Build upload-proof flow + admin approval queue |

Recommendation: ship Maya + QR Ph this week (5-min Stripe toggles), and either build or hide the rest. Leaving "planned" cards live looks unfinished.

**Other coming-soon strings:**
- `src/routes/learn_.$slug.watch.$lessonId.tsx:133` — *"Video coming soon."* fallback when a lesson has no `video_url`. Fine as fallback, but no admin UI to bulk-fill missing videos.
- `src/components/business/service-catalog-picker.tsx:75` — curated catalog message for business types you haven't seeded yet. Either expand `src/data/` catalogs or remove copy.
- `src/components/listing-card.tsx:96` / `listing.$id.tsx:386` — *"Vehicle photo coming soon"* alt text when no cover. Harmless.

## 3. Half-built / inconsistent

**A. `src/components/ui/confirm-dialog.tsx:40` falls back to `window.confirm()`.** Means somewhere a Promise-based confirm is being used outside a Dialog provider context, and silently degrades to a native browser prompt. Should always render the dialog.

**B. Payment-events email webhook is opt-in.** `STRIPE_GOLIVE.md` §6 says `/api/public/payment-events` only fires when `PAYMENT_WEBHOOK_ENABLED=1`. If you actually want receipt / refund / failure emails on live, set that secret.

**C. Ops alerting persisted, but no email/Slack escalation.** `ops_alerts` table + `/admin/alerts` page exist; nobody gets paged. Options: (i) Supabase pg cron job that emails admins when `unacknowledged_count > 0`, (ii) re-introduce optional Slack webhook fed from the same `alertOps()` helper.

**D. Security memory.** `docs/SECURITY.md` documents 18 accepted linter warnings but the in-product `@security-memory` may be stale. Worth a re-scan + memory update once live keys are in.

## 4. Operational gaps (not breaking, but visible)

- **No instance-size guidance.** With 112 public tables and growing traffic, Cloud → Overview → Advanced should be bumped before launch. Free-tier instance will throttle on the first marketing burst.
- **No published-domain canonical check.** Project has `motorsales365.lovable.app` AND `www.365motorsales.com` AND apex. Verify `<link rel="canonical">` in `__root.tsx` resolves to apex on every route; otherwise SEO splits.
- **Sitemap / robots** exist (`src/routes/sitemap[.]xml.ts`, `api/robots[.]txt.tsx`). Worth running an SEO scan to confirm coverage of the 113 routes.
- **Service worker** (`public/sw.js`, `service-worker-register.tsx`) — confirm cache-busting on deploy or users get stale shell after publish.
- **PWA install** (`install-app-button.tsx`) — manifest exists, but no audit of icon sizes / Apple touch icons / theme color across light/dark.

## 5. Stuff I checked and is actually done

For completeness so you know I looked:

- Auth (email/password + Google OAuth, role table, `has_role`, RLS everywhere) ✅
- Stripe webhook signature verify + subscription/boost/listing/course flows ✅
- Email infra (transactional + auth templates, pgmq queue, suppression list) ✅
- Rides + listings + businesses + shop + learn + tow + advertise CRUD ✅
- Admin: users, accounts, listings, businesses, verifications, audit, performance, alerts, sandbox, currencies, education, shop, reports, type-suggestions, redemptions, referrals, pricing, advertising, inquiries, analytics ✅
- Geocoding proxied through `/api/public/{geocode,reverse-geocode,geo-search}` ✅
- Marker clustering + geolocation on both rides map and businesses map ✅
- Ops alerts table + admin viewer ✅
- Security: helper-function whitelist documented, RLS on every public table I sampled ✅

## Recommended next move

Pick one of these to scope into a build:
1. **Flip the live-payments switch** — finish Stripe steps 1-5, then I clean up the pricing-page string and Maya/QR Ph toggles. ~30 min of code.
2. **Tighten the "coming soon" UI** — collapse the planned payment-method cards into a "Roadmap" expander so the page stops feeling half-shipped. ~20 min.
3. **Escalation for ops alerts** — add a pg_cron summary email to admins for any unack'd alert > 15 min. ~45 min.
4. **Pre-launch hardening** — instance-size bump prompt + canonical-domain audit + SEO scan + PWA icon audit. Mostly verification, not code.

Tell me which (or "all of 1-3") and I'll switch to build and execute.
