
# Pre-Launch Inspection — 365 MotorSales

I audited routes, DB, storage, email, cron, SEO, and webhooks against the work already shipped in earlier batches. Below is everything still incomplete, missing, or risky — grouped by severity. Nothing here changes payments (per your earlier instruction).

---

## P0 — Must fix before going live

### 1. Canonical domain & OG image still wrong
- `src/routes/__root.tsx` still ships the staging `storage.googleapis.com` OG image and has **no `og:url` / canonical** at the root.
- Per-route head() updates from Batch 1 (`listing.$id`, `businesses.$slug`, `seller.$id`, `browse.$category`) need verification that they emit `https://www.365motorsales.com/...` URLs and that listing/business images flow into `og:image`.
- **Fix:** generate a branded 1200×630 PNG, host under `/og-default.png` in `public/`, point root `og:image` + `twitter:image` to `https://www.365motorsales.com/og-default.png`, and add `og:url` to root + every leaf route.

### 2. Payment webhook is dead code
- `src/routes/api/public/payment-events.tsx` is correctly hard-disabled, BUT `enqueueEmail()` calls `fetch("/lovable/email/transactional/send", "http://localhost")` — that URL is wrong for the Worker runtime and would 404 the moment payments are enabled.
- **Fix:** replace the inter-route HTTP hop with a direct `supabase.rpc('enqueue_email', { queue_name: 'transactional_emails', payload: {...} })` call (same pattern as `auth/webhook.ts`). Also enqueue with the suppression check.

### 3. Storage listing exposure (linter WARN #2–6)
- All 5 public buckets still have a broad `SELECT … USING (bucket_id='X')` policy, which lets anyone **list** every object path (privacy leak even though contents are public).
- **Fix:** replace public SELECT with a policy that only allows known prefixes the app actually serves (or move public access to signed URLs / `getPublicUrl`). At minimum, drop the broad SELECT on `avatars`, `business-logos`, `qr-codes` and re-allow per-known-path reads.

### 4. RLS Policy Always True (linter WARN #1)
- One INSERT/UPDATE/DELETE policy still has `USING (true)` / `WITH CHECK (true)`. Need to identify and tighten. **Action:** I'll grep migrations and pinpoint the offender, then write the targeted policy fix.

### 5. SECURITY DEFINER functions exposed to anon (linter WARN #7–12+)
- 6+ `security definer` functions are EXECUTE-able by `anon`/`public`. Several are expected (e.g. `has_role`), but each one needs to either:
  - have `REVOKE EXECUTE … FROM anon, public` + targeted GRANT to `authenticated`, or
  - be converted to `SECURITY INVOKER`.
- **Action:** I'll enumerate them, classify each, and ship one migration.

### 6. Auth hardening
- Confirm **leaked-password (HIBP)** protection is on (`supabase--configure_auth { password_hibp_enabled: true }`).
- Confirm email confirmation is **required** before login (no auto-confirm).
- Add password min length ≥ 8, set OTP expiry to ≤ 1 hour.

---

## P1 — Important, ship in first week

### 7. Cron jobs not scheduled
- `expire_stale_pending_sales()` exists but no cron job is calling it.
- No `refresh_fx_rates` function exists; `src/routes/api/public/fx/refresh.tsx` is unscheduled.
- `process-email-queue` cron created by `setup_email_infra` — needs re-verification it survived.
- **Fix:** schedule via `cron.schedule`:
  - `expire-stale-pending-sales` — daily 02:00 UTC
  - `refresh-fx-rates` — hourly hitting `/api/public/fx/refresh`
  - Verify `process-email-queue` still runs every 5s

### 8. Sitemap gaps
- `src/routes/sitemap[.]xml.ts` indexes static + categories, but missing routes: `/listing/$id`, `/businesses/$slug`, `/seller/$id`, `/r/$code`. Loader must pull from `listings` (active only), `businesses` (active only), `profiles` (sellers with active listings).
- BASE_URL is `https://365motorsales.com` — should be `https://www.365motorsales.com` to match primary canonical (or pick one and redirect the other).

### 9. SEO meta still default on these routes
Routes with NO `head()` override (default to root title — bad for SEO + share):
`about`, `contact`, `pricing`, `payments`, `advertise`, `sell`, `tow`, `guidelines`, `privacy`, `terms`, `refund-policy`, `businesses.index`, `businesses.submit`, `r.$code`.
- **Fix:** add per-route `head()` with title/description/og fields for each.

### 10. JSON-LD structured data missing
- `__root.tsx`: add Organization schema (name, url, logo, sameAs).
- `listing.$id.tsx`: add `Vehicle` / `Product` schema with offers + image.
- `businesses.$slug.tsx`: add `LocalBusiness` schema with geo + address.
- Major win for Google rich results on a marketplace.

### 11. Error & not-found boundaries
- Root has `notFoundComponent` ✓.
- Routes with loaders (`listing.$id`, `businesses.$slug`, `seller.$id`, `browse.$category`, `r.$code`) need `errorComponent` + `notFoundComponent` so a bad ID doesn't crash to a blank page.
- Router needs `defaultErrorComponent`.

### 12. Email infra finishing touches
- `payment-events.tsx` → wire to queue (see P0 #2).
- Verify `process-email-queue` pg_cron job exists (re-run `setup_email_infra` if not — idempotent).
- Suppression-list webhook (`/lovable/email/suppression`) — confirm provider is sending bounces here.
- Add a sandbox-only banner check so password reset emails in preview don't accidentally hit real users.

### 13. Robots.txt
- Already disallows admin/dashboard/api — good.
- Missing: `Disallow: /listing/*/edit`, `Disallow: /email/`, `Disallow: /r/` (referral codes shouldn't be indexed since they redirect + set cookies).

---

## P2 — Nice to have for launch polish

### 14. Analytics + monitoring (still open from earlier list)
- No analytics provider wired. Pick one: GA4 (script in `__root.tsx`), Plausible, or PostHog (also gives funnels/replays).
- No error monitoring. Recommend Sentry — DSN as a secret, init in `src/router.tsx` + worker entry.

### 15. Cookie banner
- `src/components/cookie-banner.tsx` exists — verify it's mounted in `__root.tsx` (I don't see it). Required for PH Data Privacy Act compliance if you ship GA4.

### 16. Performance
- Root preloads Google Fonts via `<link rel="stylesheet">` (render-blocking). Switch to `<link rel="preload" as="style" onload>` pattern, or self-host via `@fontsource`.
- Listing/business pages — confirm hero images use `loading="eager" fetchpriority="high"` and below-fold use `loading="lazy"`.

### 17. Sandbox banner in production
- `<SandboxBanner />` is always mounted. Verify it only renders when `import.meta.env.MODE !== 'production'` or behind a feature flag — otherwise it ships to real users.

### 18. Test pages on the production sitemap?
- `/admin.sandbox`, `/admin.performance` are dev-only — confirm they're behind `requireAdmin` AND not indexed (covered by `/admin` disallow ✓).

### 19. Missing public pages typical for a marketplace
- No `/faq`, `/help`, `/safety-tips`, `/how-it-works`. SEO + trust impact. Optional but recommended.

### 20. Email DNS still pending action
- `notify.365motorsales.com` is **Verified** ✓ — no action needed.

---

## Proposed execution order

1. **P0 batch (this loop after approval):**
   - Branded OG image (gen + host) + root canonical/og:url
   - Fix `payment-events.tsx` enqueue
   - Storage SELECT lockdown migration
   - Identify + fix the `USING (true)` policy
   - Audit + revoke EXECUTE on SECURITY DEFINER functions
   - `configure_auth`: HIBP on, OTP expiry, min length

2. **P1 batch:**
   - Cron jobs (expire + fx + verify email-queue)
   - Sitemap dynamic loaders + BASE_URL fix
   - Per-route `head()` on the ~14 static pages
   - JSON-LD on root + listing + business
   - Error/not-found boundaries on loader routes

3. **P2 batch (after you pick analytics + monitoring providers):**
   - GA4/Plausible/PostHog wiring
   - Sentry wiring
   - Cookie banner mount + font perf
   - Sandbox banner gating

---

## Open questions before I start P0

1. **Analytics provider** — GA4, Plausible, or PostHog? (needed for P2)
2. **Sentry** — yes/no? If yes, I'll request the DSN secret.
3. **Canonical host** — `www.365motorsales.com` or apex `365motorsales.com`? I'll standardize sitemap, canonicals, and og:url to whichever you pick.
4. **OG image style** — branded logo on dark gradient with tagline, or hero photo of a vehicle? I'll generate either at 1200×630.

Approve and I'll start the P0 batch (analytics/Sentry can wait for your answers on #1–2).
