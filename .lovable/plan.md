# Seeded business directory + claim flow

Goal: make the map feel populated on day one by importing real Philippine motoring businesses (dealers, parts shops, service centers, tow operators, etc.) from Google Maps Platform — and let the real owner claim the entry to take it over.

## Source strategy

- **Primary: Google Places API (New)** via the existing Google Maps Platform connector. It's the most reliable source: name, address, lat/lng, phone, website, hours, photos, rating, `place_id`. We already use the gateway elsewhere.
- **Secondary (best-effort): Facebook Pages** via the linked Firecrawl connector. FB aggressively blocks scraping, so we treat FB as an *enrichment* step (paste a page URL → pull name/cover/about) rather than a bulk crawler. Bulk seeding stays on Google.
- We map each Google "type" (e.g. `car_dealer`, `car_repair`, `car_wash`, `gas_station`, `auto_parts_store`) to one of our existing `business_types.slug` values; anything unmapped goes to a fallback type for staff to triage.

Dedup: `businesses_source_external_id_unique` already enforces uniqueness on `(source, source_external_id)` — we use `source='google_places'` + `place_id`, and `source='facebook'` + page id.

## Claim flow

Three new statuses + a request table:
- New `business_status` value: `'unclaimed'` — shown on the directory/map but visually marked "Unclaimed — Is this yours?".
- New table `business_claim_requests` (business_id, claimant_user_id, contact_method `email|phone|document`, contact_value, evidence_url, status `pending|approved|rejected`, reviewed_by, notes).
- On the public business page (`/businesses/$slug`), an "Is this your business? Claim it" CTA appears only when `status='unclaimed'` and `owner_id IS NULL`.
- Two paths to approval:
  1. **Auto-verify** — if the claimant's verified account email/phone matches the listed `email`/`phone`, the request auto-approves: we set `owner_id = auth.uid()`, flip `status` to `'active'`, and send the welcome email.
  2. **Staff review** — otherwise it goes to `/admin/claims` with the evidence (business permit photo, OR receipt, branded social link) for `can_moderate` staff to approve/reject.

## Admin seeding UI

New page `/admin/seed-businesses`:
- Pick a region/province/city (uses the existing PSGC dataset) and one or more Google types.
- Server fn calls `places/v1/places:searchText` and `places:searchNearby` through the gateway, paginates, dedupes against `businesses` by `place_id`.
- Preview table → "Import selected" inserts rows with `status='unclaimed'`, `source='google_places'`, `source_external_id=<place_id>`, `owner_id=NULL`.
- Photos: store up to 3 Google photo references (we proxy via a signed server fn that fetches the photo media URL from the gateway, then uploads to the `business-gallery` bucket under a special `seed/<place_id>/...` path — *not* under a business id, so the existing storage policy doesn't apply; we use the admin client server-side).
- Rate-limited and audited via `admin_audit_log`.

## Map / directory presentation

- Map markers for unclaimed businesses use a muted/outline pin and a "Claim" chip in the popover.
- Directory list shows an "Unclaimed" badge and a faint "Listed from public sources" note for transparency.
- A site-wide toggle (admin feature flag `directory_show_unclaimed`) so we can hide them later if the directory fills with real signups.

## Technical details

Migration:
- `ALTER TYPE business_status ADD VALUE 'unclaimed';`
- `CREATE TABLE public.business_claim_requests (...)` + GRANTs + RLS:
  - INSERT: authenticated users can create a claim for a business where `owner_id IS NULL`.
  - SELECT: claimant sees own requests; `can_moderate` sees all.
  - UPDATE: `can_moderate` only (status, reviewed_by, notes).
- Tighten the existing `Owners update listings`-style policy on `businesses`: add a clause that when `status='unclaimed'`, only staff or the auto-approve server fn (service role) can change `owner_id` / `status`.
- Storage: allow admin client writes to `business-gallery/seed/*` (server-side only; the existing public-read still applies).

Server functions:
- `src/lib/business-seed.functions.ts` (admin-only via `can_moderate`):
  - `searchGooglePlaces({ region, city, types, pageToken? })` — gateway call to Places API (New).
  - `previewSeedCandidates({ placeIds })` — fetch place details + dedupe.
  - `importSeedCandidates({ candidates })` — bulk insert + photo proxy.
- `src/lib/business-claims.functions.ts`:
  - `submitClaim({ businessId, contactMethod, contactValue, evidenceUrl? })` — runs auto-verify, otherwise queues for staff.
  - `reviewClaim({ id, decision, notes })` — staff-only.

Routes:
- `src/routes/admin.seed-businesses.tsx` — seeding UI.
- `src/routes/admin.claims.tsx` — claim review queue.
- Update `src/routes/businesses.$slug.tsx` to render the claim CTA + a `<ClaimDialog>` component.
- Update `src/routes/map.tsx` and `src/routes/businesses.index.tsx` for the unclaimed badge/marker variant.

Compliance:
- We store only the data Google's Places terms allow us to cache (name, address, types, place_id, contact); photos are re-hosted with attribution string saved alongside.
- A short "Listed from public sources — claim or request removal" notice on every unclaimed page, plus a "Request removal" link that opens a support ticket.
- Update `/terms` and `/privacy` to disclose the seeded-listings practice and removal process (per the project's terms-sync rule).

## Out of scope (can follow later)

- Bulk Facebook page crawling (FB ToS + anti-scraping makes this unreliable).
- Auto-refresh of seeded data on a schedule (we can add a `pg_cron` re-sync job once we see how stale entries get).
- Showing seeded reviews — we only store rating count/avg for the badge; review text stays on Google.
