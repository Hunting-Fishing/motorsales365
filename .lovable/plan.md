## Goal

Every link that leaves the app (auth email, password reset, referral, invite, QR code, share image, sitemap, OG tag) must point at **`https://www.365motorsales.com`** — never the `*.lovableproject.com` preview host. Right now seven auth calls and several share/invite links use bare `window.location.origin`, so anything you do while previewing inside Lovable bakes the preview URL into emails, QR codes, and DB rows.

The site is already published at `www.365motorsales.com` and `365motorsales.com`. This change only affects how URLs are *constructed* in the app — no DNS, no domain changes.

---

## Step 1 — Add a single source of truth for the canonical site URL

New file `src/lib/site-config.ts` exporting:

- `CANONICAL_HOSTS = ["www.365motorsales.com", "365motorsales.com"]`
- `SITE_URL = "https://www.365motorsales.com"` (primary)
- `siteOrigin()` — returns `window.location.origin` only when the hostname is in `CANONICAL_HOSTS`; otherwise returns `SITE_URL`. Use this anywhere a runtime origin is needed.
- `siteUrl(path)` — convenience: `${siteOrigin()}${path}`.

This replaces every ad-hoc `window.location.origin || "https://365motorsales.com"` pattern with one helper that ignores `lovableproject.com`, `lovable.app`, `localhost`, and sandbox hosts.

## Step 2 — Fix the seven auth flows (the real source of "lovable" leaking into emails)

Replace `window.location.origin` with `siteOrigin()` in:

- `src/routes/signup.tsx` — `emailRedirectTo` on signUp and `redirect_uri` on Google OAuth
- `src/routes/verify-email.tsx` — `emailRedirectTo` on resend OTP
- `src/routes/forgot-password.tsx` — `redirectTo` on `resetPasswordForEmail`
- `src/routes/reset-password.tsx` — `redirectTo` on `updateUser`
- `src/routes/login.tsx` — `redirect_uri` on Google OAuth
- `src/routes/dashboard.profile.tsx` — `emailRedirectTo` on email-change

Result: every confirmation, reset, magic-link, and OAuth callback email goes back to `www.365motorsales.com/...` even if the action was triggered while previewing in Lovable.

## Step 3 — Fix share / invite / QR / poster links

Swap bare `window.location.origin` for `siteOrigin()` in:

- `src/routes/dashboard.referral.tsx`, `dashboard.share-kit.tsx`, `admin.referrals.tsx`, `my-qr.tsx`, `r.$code.poster.tsx`
- `src/components/listing-qr.tsx` (QR encodes the listing URL)
- `src/routes/dashboard.team.members.tsx` (invite-token link copied to clipboard)
- `src/routes/listing.$id.tsx` (WhatsApp share)
- `src/routes/advertise.tsx` (`source_url` saved with lead)
- `src/routes/r.$code.tsx` (`_landing` sent with referral tracking)

After this, a staff member previewing the app, copying their referral link, or generating a QR poster always gets `https://www.365motorsales.com/r/...` — never `lovableproject.com`.

## Step 4 — Unify SEO / canonical / sitemap on the same host

Inconsistency today: `__root.tsx`, `sitemap.xml`, and Stripe use `www.`; `robots.txt`, `llms.txt`, many route `canonical`/`og:url` tags, and `organizations.functions.ts` use the apex. Pick **`www.`** as canonical (matches root layout, sitemap, and Stripe), then:

- Import `SITE_URL` and replace the per-file hardcoded strings in: `sitemap[.]xml.ts`, `robots[.]txt.tsx`, `llms[.]txt.tsx`, `organizations.functions.ts`, `lib/email-templates/_styles.ts`.
- Update the non-www canonical/og:url strings in: `rides.index.tsx`, `map.tsx`, `support.tsx` + four `support_.*.tsx`, `browse.$category.tsx`, `businesses.$slug.tsx`, `businesses.$slug.book.tsx`, `listing.$id.tsx`, `seller.$id.tsx`, `rides.$slug.tsx`, `shop.index.tsx`, `shop.categories.tsx`, `shop.brand.$slug.tsx`, `passport.$slug.tsx`, `privacy.tsx`, `terms.tsx`, `affiliate-disclosure.tsx`.
- Fix the two email templates that bypass `SITE_URL`: `email-templates/business-archived.tsx` and `business-restored.tsx`.

The apex (`365motorsales.com`) keeps working — Lovable already 301-redirects the non-primary domain to the primary — but every link we *generate* will use the canonical host so social cards, sitemap, and analytics don't double-count.

## Step 5 — Configure Supabase auth Site URL & Redirect URLs

In Lovable Cloud → Authentication → URL Configuration, set:

- **Site URL**: `https://www.365motorsales.com`
- **Additional Redirect URLs**: `https://365motorsales.com/**`, `https://www.365motorsales.com/**`, plus the existing preview entries so dev still works.

This is what Supabase falls back to when `emailRedirectTo` is missing or filtered, and it's the final guarantee that auth emails can never contain a lovable URL. I'll prompt you to do this step in the Cloud dashboard once the code is in.

---

## Out of scope (not changing)

- DNS, custom domain setup, SSL — already live.
- Staff-email checks like `@365motorsales.com` (access control, not URLs).
- Brand text inside share-kit SVG ads ("365motorsales.com" baked into the art) — that's a print mark, not a clickable URL, and it's already correct.
- Lovable badge on the published site — toggled separately in publish settings if you want it hidden (Pro plan).

## Technical details

- `siteOrigin()` runs safely on SSR (no `window`) and on the client. Hostname check is case-insensitive and strips a trailing dot, so it tolerates `WWW.365motorsales.com.` too.
- No new env vars — the canonical host is a code constant. If you later want preview/staging URLs, we add a `VITE_SITE_URL` override and `siteOrigin()` reads it; not needed today.
- No database migration. No edge function redeploy unless we also touch `auth-email-hook` (we aren't in this pass).
- Estimated ~25 files edited, no behavioural changes for end users — only the URL string changes.