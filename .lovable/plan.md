## Pre-Launch Readiness — 365 MotorSales

Audit of routes, RLS, storage, email, cron, SEO and webhooks against current state. Grouped by severity. Payments untouched (per your earlier note).

---

### P0 — Block go-live

**1. Payment webhook is broken code (will break first payment)**
`src/routes/api/public/payment-events.tsx` enqueues email via `fetch("/lovable/email/transactional/send", "http://localhost")` — invalid in the Worker runtime, will 404 the moment payments are enabled. Replace with direct `supabase.rpc('enqueue_email', ...)` (same pattern as auth webhook) and add suppression check.

**2. Storage buckets allow listing (privacy leak)**
All 5 public buckets (`listing-photos`, `listing-videos`, `avatars`, `business-logos`, `qr-codes`) have broad `SELECT USING (bucket_id='X')`. Anyone can list every file path. Replace with scoped policies (path-prefix or signed URLs).

**3. RLS policy always-true (linter WARN #1)**
One non-SELECT policy uses `USING (true)` / `WITH CHECK (true)`. Identify and tighten in a single migration.

**4. SECURITY DEFINER functions exposed to `anon`/`authenticated` (linter WARN #3–12+)**
10+ definer functions executable by anon/public. Audit each; for non-public ones, `REVOKE EXECUTE FROM anon, public` and grant only where needed (or switch to INVOKER).

**5. Auth hardening — verify before launch**
- Confirm leaked-password protection (HIBP) is ON
- Confirm email confirmation required (no auto-confirm)
- OTP expiry ≤ 1 hour, password min 8

**6. Canonical / OG at root**
`__root.tsx` has only 1 occurrence of `og:url|canonical` — add both with `https://www.365motorsales.com` consistently. Verify per-route leafs already emit www.

---

### P1 — Important, week 1

**7. Cron jobs not scheduled**
- `expire_stale_pending_sales()` — exists, never called. Schedule daily 02:00 UTC.
- FX rate refresh route exists but unscheduled. Schedule hourly.
- Verify `process-email-queue` (5s) still active.

**8. SEO meta missing on ~14 routes**
Routes without per-route `head()` (fall back to root): `payments`, `sell`, `refund-policy`, `businesses.submit`, `r.$code`. Add title/description/og.

**9. JSON-LD structured data**
- Root: `Organization` schema
- `listing.$id`: `Vehicle`/`Product` with offers + image
- `businesses.$slug`: `LocalBusiness` with address/geo
Major win for Google rich results on a marketplace.

**10. Error & not-found boundaries on loaders**
Loader routes (`listing.$id`, `businesses.$slug`, `seller.$id`, `browse.$category`, `r.$code`) need `errorComponent` + `notFoundComponent`. Router needs `defaultErrorComponent`.

**11. Sitemap gaps**
`src/routes/sitemap[.]xml.ts` missing dynamic entries for active listings, businesses, sellers. BASE_URL should match canonical host (www).

**12. Robots.txt**
Add `Disallow: /listing/*/edit`, `Disallow: /email/`, `Disallow: /r/` (referral redirects shouldn't be indexed).

**13. Suppression webhook**
Verify the provider is wired to `/lovable/email/suppression`. Without it, bounces/complaints never populate `suppressed_emails`.

---

### P2 — Polish

**14. Cookie banner mounted?**
Component exists at `src/components/cookie-banner.tsx`. Confirm it's actually rendered in `__root.tsx` (required for PH Data Privacy Act if you add analytics later).

**15. Sandbox banner leaks to prod**
Gate `<SandboxBanner />` on `import.meta.env.MODE !== 'production'`.

**16. Performance**
Google Fonts loaded via render-blocking `<link rel="stylesheet">`. Move to preload-then-load pattern or self-host via `@fontsource`. Confirm listing/business hero images use `fetchpriority="high"` and below-fold use `loading="lazy"`.

**17. Account types (open from earlier convo)**
You haven't yet decided on the Organizations model (corporate / business teams / multi-user accounts). Not strictly launch-blocking — current single-user "private | business" model works for v1 — but worth deciding before marketing the corporate use case.

---

### What's already good ✅
- Auth flow with email + Google
- Email queue infra (pgmq + cron dispatcher) wired
- Admin/dashboard RLS roles in place
- Verification workflow + business kinds
- Referral/QR attribution system
- Listing expiry/pending-sale logic
- Cookie banner & legal pages exist
- Robots.txt blocks admin/dashboard/api

---

### Recommended order
1. P0 #1 (payment webhook) + P0 #2 (storage policies) + P0 #3-5 (RLS/SECDEF/auth) — one migration batch
2. P0 #6 (OG/canonical) — single file edit
3. P1 #7 (cron) + #13 (suppression) — backend hardening
4. P1 #8-11 (SEO batch) — single sweep across routes
5. P2 polish

Want me to proceed with the P0 batch first?