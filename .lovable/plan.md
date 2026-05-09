# Launch Readiness — 365 MotorSales Philippines

Below is what the site is still missing before you can confidently advertise and open it to the public in the Philippines. I've grouped items by priority so we can tackle them in passes.

---

## 1. Legal & Trust (REQUIRED before any paid ads)

Ad networks (Meta, Google, TikTok) will reject a marketplace without these, and the Philippines' **Data Privacy Act (RA 10173)** legally requires them.

- **Terms of Service** page (`/terms`) — listing rules, prohibited items, dispute policy, fees.
- **Privacy Policy** page (`/privacy`) — DPA-compliant, names a Data Protection Officer contact.
- **Cookie / consent banner** (simple accept/decline).
- **Acceptable Use / Community Guidelines** (`/guidelines`) — no stolen vehicles, no scams, ID verification rules.
- **Refund & Boost policy** (linked from `/pricing`).
- **Contact page upgrade** — physical address or registered business name, support email, PH mobile number.
- Footer links to all of the above on every page.

## 2. Payments (currently missing)

`/pricing` shows plans but there is no checkout. Decide and wire one of:

- **PayMongo** or **Xendit** (PH-native: GCash, Maya, cards, bank transfer) — recommended for PH market.
- **Stripe** (cards only, no GCash) — easier but loses ~70% of PH buyers who prefer e-wallets.

Needed flows: pay-to-post, boost a listing, subscribe to a plan, receipts/invoices, refund handling.

## 3. Identity & Anti-Fraud

A vehicle marketplace lives or dies on trust.

- **Seller verification** beyond email — phone OTP (PH numbers), optional government ID upload (already partially scaffolded under `dashboard.verification`).
- **Report listing / report user** flow visible on every listing.
- **Admin moderation queue** for new listings (you have `admin.listings` — confirm "pending review" gate works before going live).
- **Rate limiting** on signup, listing creation, and messages to stop spam.
- **Block list / shadow-ban** for repeat offenders.

## 4. Communication

- **In-app messaging** between buyer and seller (`dashboard.messages` exists — verify it actually sends + notifies).
- **Email notifications** (new message, listing approved, boost expiring, password reset). Needs an email domain + sender setup.
- **SMS OTP** for PH phone verification (Semaphore or Movider are cheapest in PH).

## 5. Discoverability & SEO

- **Per-category meta tags** on `browse.$category.tsx` (currently uses root meta).
- **Per-listing meta tags + og:image** = the cover photo on `listing.$id.tsx`. Critical for Facebook/Messenger shares, which is how 80% of PH buyers share listings.
- **sitemap.xml** generated from active listings.
- **robots.txt** allowing crawl, blocking `/dashboard`, `/admin`.
- **JSON-LD** `Vehicle` / `Product` / `LocalBusiness` schema on listing and service pages.
- **Canonical tags** on listing pages.

## 6. Content for Launch

You have categories but no listings (`SELECT count(*) FROM listings` → 0).

- **Seed 30–100 demo listings** across cars, motorcycles, parts, car wash, repair shops, etc. so the homepage and category pages don't look empty on day one. Mark them clearly as demo or partner with 2–3 real dealers/shops to post first.
- **Featured cities**: pre-fill Metro Manila, Cebu, Davao, Iloilo, Cagayan de Oro on the homepage.
- **About page** needs a real story, team, and mission (current copy is one paragraph).

## 7. Analytics & Ops

- **Analytics**: Google Analytics 4 + Meta Pixel (you'll need the Pixel for FB/IG ads).
- **Error monitoring**: Sentry or similar.
- **Backups**: confirm Lovable Cloud backups are on.
- **Uptime monitoring**: UptimeRobot ping on the homepage.

## 8. Mobile & Performance

- Re-test all flows at 360px width — most PH traffic is mobile.
- Image optimization on uploads (resize to ≤1600px, WebP) — saves data on PH mobile plans.
- Lazy-load listing images on browse pages.
- PWA install prompt (optional but high impact in PH where users avoid app stores).

## 9. Marketing Assets (for the ads themselves)

- **Logo** in SVG + PNG (square + horizontal).
- **Open Graph share image** (1200×630) for the homepage and each major category.
- **Favicon set** + Apple touch icon.
- **Brand kit**: 1 paragraph tagline, 5 short value props for ad copy.
- **Landing pages** per ad campaign (e.g. `/sell-your-car`, `/find-a-mechanic`) — higher conversion than sending traffic to `/`.
- **Demo video** (15–30s) for Reels/TikTok.

## 10. Business Setup (offline)

- DTI / SEC business registration in PH if collecting payments.
- BIR registration for invoices.
- Bank account for payout reconciliation.
- Customer support channel: at minimum a Messenger inbox (PH default), ideally also email.

---

## Suggested order of work

1. **Pass 1 (this week)**: Terms, Privacy, Cookie banner, footer links, Contact upgrade, robots/sitemap, per-listing OG image. → unlocks ad approval.
2. **Pass 2**: Payments (PayMongo), email notifications, phone OTP, seed listings.
3. **Pass 3**: Analytics + Pixel, demo video, landing pages, PWA.

---

## Questions before I start building

1. Which payment provider do you want — **PayMongo**, **Xendit**, or **Stripe**?
2. Do you have a registered business name + address to put in the footer and Privacy Policy, or should I use placeholders?
3. Want me to start with **Pass 1 (legal + SEO)** so you can submit ads, or jump straight to **payments**?

Pick what you want and I'll build it.
