## 365 MotorSales — Go-Live Readiness Audit

Excluding payments (already known TODO), here is what's still missing or risky before public launch. Items are grouped by severity.

---

### 🔴 Blockers (must fix before launch)

1. **No sitemap.xml / robots.txt**
   - No `src/routes/sitemap[.]xml.ts` and no `public/robots.txt`.
   - Google can't discover listings, businesses, or category pages → no organic traffic.
   - Need a server-route sitemap that includes static pages + dynamic rows from `listings`, `businesses`, `browse.$category`.

2. **Email infrastructure not finished**
   - Templates exist (`src/lib/email-templates/*`) and `enqueue_email` triggers fire on signup, ad-inquiries, etc., but the comment in `src/lib/email/send.ts` says: *"emails will fail-soft (logged) until that's done"*.
   - Need: verified custom email domain (DNS), `setup_email_infra`, and `scaffold_auth_email_templates` so password reset / signup confirmation actually land in inboxes.

3. **Payment webhook signature verification is a stub**
   - `src/routes/api/public/payment-events.tsx:48` — *"TODO: replace with real Stripe / PayMongo signature verification"*. Even if payments are out of scope, this endpoint is publicly callable and will accept forged events. Either lock it down or remove it until payments ship.

4. **Production domain still unverified for SEO assets**
   - `og:image` points to `storage.googleapis.com/gpt-engineer-file-uploads/...` (Lovable staging asset). Will work but is unbranded and could break. Move to a CDN/Supabase storage URL under your domain.
   - Custom domains `www.365motorsales.com` / `365motorsales.com` listed — confirm they're actually pointed and SSL is active.

---

### 🟠 High priority (launch quality)

5. **Auth hardening**
   - Verify HIBP leaked-password protection is enabled (`configure_auth password_hibp_enabled: true`).
   - Confirm email auto-confirm is **off** (users must verify) — required since the schema relies on `auth.users.email`.
   - Google OAuth: confirm it's actually enabled in the provider config (the codebase has the `lovable.auth.signInWithOAuth("google")` wiring).
   - Password-reset route `/reset-password` exists ✅ — re-test end-to-end once email domain is live.

6. **SEO per-route metadata audit**
   - Root `__root.tsx` has good defaults, but leaf routes (`listing.$id`, `businesses.$slug`, `browse.$category`, `seller.$id`) need to derive `title`, `description`, and `og:image` from loader data. Listing detail page must use the cover photo as `og:image` (per `tanstack-start` rules). Without this, social shares look generic.

7. **Cron / scheduled jobs**
   - `expire_stale_pending_sales()` and listing expiry exist as SQL functions but I see no pg_cron schedule wiring them. Listings will accumulate stale status without it.
   - Currency FX refresh (`api/public/fx/refresh`) — confirm a cron is hitting it.

8. **Storage bucket policies**
   - `verification-docs` is private ✅. But re-verify RLS on `listing-photos`, `listing-videos`, `avatars`, `business-logos`, `qr-codes` — they're public buckets; ensure upload paths are scoped to `user_id` so users can't overwrite each other's files.

9. **Run the full security scan**
   - `security--run_security_scan` + `supabase--linter` haven't been re-run in context. Required before publishing to catch missing RLS, overly permissive policies, exposed SECURITY DEFINER funcs beyond the 3 documented in `docs/SECURITY.md`.

10. **Rate limiting & abuse**
    - No rate limiting on: signup, login, contact form, ad-inquiry submission, tow request creation, messages. PH spam will arrive day one. Add per-IP / per-user throttling either at the DB (trigger counting recent rows) or in front of `createServerFn` handlers.

---

### 🟡 Medium priority (polish & ops)

11. **Legal / compliance**
    - `/privacy`, `/terms`, `/refund-policy`, `/guidelines` routes exist — confirm content is final (not placeholder lorem ipsum), reflects PH Data Privacy Act 2012 (NPC), and lists the data controller.
    - Cookie banner (`src/components/cookie-banner.tsx`) is present ✅ — verify it actually blocks non-essential scripts until consent.

12. **Error monitoring & logs**
    - No Sentry / error tracking wired. `console.warn`/`console.error` in email send paths just disappear in production.
    - Add a structured logger or at least a server route that records uncaught errors.

13. **Analytics**
    - `admin.analytics.tsx` exists but no GA4 / Plausible / Posthog tag is in `__root.tsx`. You'll launch blind on funnel data.

14. **Performance**
    - Leaflet maps (`business-map`, `location-picker`) are eagerly loaded on routes that use them — check they're code-split.
    - Font is loaded via blocking `<link rel="stylesheet">` to Google Fonts — switch to `preload` + `display=swap` or self-host to improve LCP.
    - No `og:image` on leaf routes means scrapers also hit a 1MB social image; add per-route smaller variants.

15. **Admin operational tools**
    - No CSV/Excel export on admin listings/users/audit pages. Useful for audits.
    - Audit log exists ✅ but no retention policy.

16. **Backup & recovery**
    - Confirm Supabase point-in-time recovery is enabled at the chosen instance size, and document the restore runbook.

17. **404 / empty states**
    - Root `notFoundComponent` ✅. Verify dynamic routes (`listing.$id`, `businesses.$slug`, `seller.$id`) have `notFoundComponent` that handles "row not found" cleanly instead of crashing the loader.

18. **Mobile QA pass**
    - Viewport-specific testing on `sell.tsx`, listing detail gallery, business map, dashboard sidebar collapse — these are the heavy pages.

---

### 🟢 Nice-to-have (post-launch)

- Saved-search email digests (`dashboard.searches` exists; no scheduled email).
- Push / web-push notifications for new messages and tow bids.
- Image optimization pipeline (WebP/AVIF variants for listing photos at upload time).
- Sitemap ping on new listing publish.
- A/B framework for pricing page.
- Multi-language (PH locale + Tagalog/Cebuano).

---

### Recommended launch sequence

1. Fix blockers 1–4 (sitemap, email domain, webhook stub, og:image).
2. Run `security--run_security_scan` + `supabase--linter`; resolve everything ≥ warn.
3. Wire pg_cron for `expire_stale_pending_sales` and FX refresh.
4. Add per-route SEO metadata on the four dynamic routes.
5. Smoke-test full flows on the custom domain: signup → email verify → list → message → admin moderate.
6. Enable analytics + error monitoring.
7. Publish.

Want me to start executing this list (e.g. begin with the sitemap + per-route SEO + security scan)? I can tackle them in small batches.