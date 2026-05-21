# Import from Facebook Marketplace

Let signed-in users paste a Facebook Marketplace listing (or FB profile) link, extract the data, verify they actually own that FB profile, and create a draft listing under their account.

## User flow

1. On `/sell` (and "New listing" in dashboard), add an **"Import from Facebook"** button next to the manual form.
2. User pastes a FB Marketplace item URL (e.g. `facebook.com/marketplace/item/123…`) **or** a FB profile/page URL.
3. Backend scrapes the page → returns `{ title, price, description, location, photos[], sellerProfileUrl, sellerName }` for preview.
4. **Ownership verification** (must pass before publishing — anti-scammer gate):
   - **Option A — Verification code:** We generate a short code (e.g. `MS365-AB12CD`). User must add it to their FB profile bio / intro / a public post for ~2 minutes. We re-scrape the profile and confirm the code is present.
   - **Option B — Profile link match:** User adds a link to their motorsales365 profile in their FB "About" section; we verify it points back to their account.
   - User picks one. Once verified, we store `profiles.fb_profile_url` + `fb_verified_at` so future imports from the same FB profile skip re-verification (valid 90 days).
5. Preview screen: user reviews extracted fields, edits, picks category, sets PHP price, confirms location → **Publish**.
6. Listing is created under their `user_id` with a `source: 'facebook_import'` tag and a link back to the original FB post (admin-visible only).

## What we extract

- Title, description, price (converted to PHP if needed), condition guess, photos (downloaded → uploaded to `listing-photos` bucket), seller name, seller profile URL, posted-at date, FB location string (mapped to PSGC region/province/city via fuzzy match → user confirms).

## Scraping approach

- **Firecrawl connector** (already documented in this stack) — `scrape` with `formats: ['markdown','html','json']` and a JSON schema for the marketplace fields. Falls back to OG/meta tags for profile pages.
- Server function `importFacebookListing` (`src/lib/facebook-import.functions.ts`) protected by `requireSupabaseAuth`, calls Firecrawl with `FIRECRAWL_API_KEY` from env.
- Rate-limit per user (e.g. 10 imports/day) to control Firecrawl spend.

## Anti-abuse rules

- Verification required **once per FB profile per user** (re-verify after 90 days or if FB URL changes).
- Same FB profile cannot be claimed by two different users — first verified wins; second user sees "This FB profile is already linked to another account. Contact support."
- Admin can revoke verification from `/admin/verifications`.
- Imported listings get a small **"Imported from Facebook · Verified seller"** badge on the listing card.
- Listings are flagged for moderation if photos fail to download or price seems off (>10× category median).

## Database changes (new migration)

- `profiles`: add `fb_profile_url text`, `fb_profile_id text unique`, `fb_verified_at timestamptz`, `fb_verification_method text`.
- `listings`: add `source text default 'manual'` (values: `manual`, `facebook_import`), `source_url text` (admin-visible).
- `fb_import_jobs` table — track scrape attempts, status, error, for debugging and rate limiting (`user_id`, `url`, `status`, `extracted_payload jsonb`, `error`, `created_at`).
- RLS: users see only their own `fb_import_jobs`; profiles' FB fields readable by owner + admins; `fb_profile_id` unique constraint enforces "one FB profile, one account".

## Files to add/change

- `src/lib/facebook-import.functions.ts` — `startFbImport`, `verifyFbOwnership`, `finalizeFbImport` server fns.
- `src/lib/facebook-import.server.ts` — Firecrawl call + HTML parsing helpers.
- `src/routes/sell.import.tsx` — new wizard route (paste URL → verify → preview → publish).
- `src/components/sell/fb-import-button.tsx` — entry button on `/sell`.
- `src/routes/dashboard.profile.tsx` — show "Facebook profile: verified ✓" once linked.
- New migration (above).
- Firecrawl connector link (`standard_connectors--connect` with `connector_id: firecrawl`).

## Out of scope for v1

- Importing entire FB profile/page in bulk (only one listing at a time).
- Importing from FB Groups (private content, blocked).
- Auto-syncing future edits from FB back to motorsales365.

---

## Questions before I build

1. **Verification method** — offer both A (code in bio) and B (link in About), or pick one to ship first?
2. **Bulk import** — start with one-listing-at-a-time, or do you want "import all my active FB Marketplace listings" from day one?
3. **Profile pages** — should pasting a *profile* URL list all that seller's marketplace items for them to pick, or only accept direct item URLs?
4. **Firecrawl** — OK to add the Firecrawl connector (paid per scrape) as the extraction backend?
