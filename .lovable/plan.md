# Admin Business Discovery (Google + Facebook) with Map-Ready Addresses

Goal: give admins a single place to discover, preview, and import auto/motor businesses from **Google Places** and **Facebook Pages** into the 365 Motorsales directory — with verified street addresses and lat/lng so every imported business shows correctly on `/map`.

## What exists today

- `admin.seed-businesses.tsx` — Google Places text search → multi-select → import (already works, types mapped, photos pulled).
- `facebook-import.functions.ts` — only imports **marketplace listings** for end users. No admin path, no Page/business import.
- `businesses` table already has `lat`, `lng`, `street_address`, `source`, `source_external_id`, `import_metadata`, `cover_url`, `photos`.
- `/map` reads from `businesses` and needs `lat` + `lng` to plot a pin.

## What changes

### 1. New unified admin page: `/admin/discover-businesses`

Replaces (and absorbs) `admin.seed-businesses.tsx`. Two tabs:

- **Google Places** — current flow, kept as-is but with the address-quality improvements below.
- **Facebook Pages** — paste a Page URL, paste a list of Page URLs, or search by keyword + city. Admin reviews extracted data and imports.

Both tabs feed the same review/import table so admin can mix sources in one batch.

### 2. Facebook Page import (admin-only)

New server fns in `src/lib/facebook-business-import.functions.ts` (separate from the existing user-listing flow):

- `scrapeFbPageForAdmin({ url })` — staff-gated. Uses Firecrawl to scrape the Page, parses name, category, About/address text, phone, website, hours, profile + cover photo, page id.
- `searchFbPagesForAdmin({ query, city })` — staff-gated. Uses Firecrawl search restricted to `site:facebook.com` for keyword + city, returns candidate Page URLs.
- `importFbPagesForAdmin({ candidates })` — staff-gated. Upserts into `businesses` with `source='facebook'`, `source_external_id=<page id>`, `import_metadata={ fb_url, fb_about, fb_hours_raw }`. Re-imports are idempotent via the existing `(source, source_external_id)` unique constraint.

Photos are downloaded to Supabase Storage the same way Google photos are handled.

### 3. Address → map-ready coordinates (the "shows on the map" piece)

This is the core upgrade. New helper `ensureGeocoded(business)` used by both Google and Facebook import paths:

- **Google**: already returns lat/lng — keep as-is, also store the formatted address in `street_address`.
- **Facebook**: Pages rarely include lat/lng. Pipeline:
    1. Take the best available address string (About → "Address" line, or the page location text).
    2. If admin selected a city in the search form, append it.
    3. Call existing `geocodePlace` (Google Geocoding via the Maps connector) to resolve to lat/lng + a clean `street_address`.
    4. If geocoding fails or returns low confidence, mark the candidate with a yellow "Needs address" badge in the admin table.

In the admin review table, every row shows:

- Resolved `street_address`
- A small map thumbnail (or "No coordinates" warning)
- An inline "Fix address" field — admin can paste/edit the address and click **Re-geocode** before importing.

Import is blocked for rows with no lat/lng, with a clear inline message. This guarantees nothing lands in `businesses` without map coordinates.

### 4. Duplicate detection across sources

Before insert, for each candidate:

- Check `source + source_external_id` (already enforced).
- Check name + lat/lng within ~100m of an existing business (reuse the logic in `places.functions.ts › findNearbyForImport`).
- If a match is found, show "Possible duplicate of <name>" with a link, and offer **Merge** (attach `fb_url` / `google_place_id` to the existing row instead of creating a new one).

### 5. Small UX polish in admin

- Bulk **Select all importable**, **Select all with coordinates only**.
- Filter chips: Source (Google/FB), Has coordinates, Has photo, Already imported.
- After import: toast with counts per source + "View on map" link that opens `/map` filtered to the just-imported set.

## Out of scope for this plan

- Scheduled/automatic crawling — manual admin-triggered only.
- Public-facing Facebook claim flow for owners (separate work, the existing user FB verification flow stays untouched).
- Bulk CSV upload (can be added later if helpful).

---

## Technical notes (for the implementer)

- New file: `src/lib/facebook-business-import.functions.ts` + `.server.ts` helpers (Firecrawl scrape, Page parser, photo downloader — mirror the Google helpers).
- New file: `src/routes/admin.discover-businesses.tsx`. Keep `admin.seed-businesses.tsx` as a redirect for one release, then remove.
- Reuse `geocodePlace` from `src/lib/places.functions.ts` for FB rows; add a `confidence` field to its return so the UI can flag low-confidence results.
- All new server fns gated by `requireAdminRoleAudited("businesses.discover.*")` for the audit trail.
- No DB schema changes required — `businesses.source` already accepts arbitrary strings; we'll use `'facebook'` for the new source. `import_metadata` (jsonb) absorbs FB-specific fields.
- Firecrawl is already wired; ensure the connection is linked before first Facebook import (admin will see a clear error if not).
- `/map` needs no changes — once rows have `lat`/`lng`, pins appear automatically.
