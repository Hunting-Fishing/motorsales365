## Goal
When a user hits "Report" from inside a marketplace listing, `/report` should automatically know **what** they're reporting — no manual URL pasting — and show a clear preview of that listing so the user can confirm they're reporting the right item before filling in details.

## Problems today
- The listing → report links pass `listing_id` in the URL, but the form still shows an empty "Link to the listing…" input with the generic `365motorsales.com/listing/…` placeholder. Users have to figure out and paste the URL themselves.
- The report page never fetches or shows the listing being reported, so users can't visually confirm context (title, price, seller, thumbnail) before hitting submit.
- Business / seller / profile reports have the same gap — no way to pass structured context.

## Plan

### 1. Extend inbound context on `/report`
Broaden the search-schema in `src/routes/report.tsx` to accept the full set of report targets:
- `listing_id` (existing)
- `business_id`
- `seller_id` (user profile id)
- keep `target_type`, `category`, `target_url`, `details` fallbacks

Whichever id is present auto-selects the matching `target_type` and locks it (with a subtle "Change" link to switch to a generic report).

### 2. Auto-fetch and preview the target
Add a `ReportTargetPreview` card rendered above the form. It runs a lightweight query based on which id came in:
- listing → `listings` (title, price, thumbnail via `listing_media`, city, seller name)
- business → `businesses` (name, city, logo, slug)
- seller → `profiles` (display name, member number, avatar)

The card shows:
- Thumbnail + title/name
- Key facts (price, location, seller)
- A "View original" link opening in a new tab
- A small "Not the right item?" link that clears the context and reveals the manual URL field

### 3. Auto-fill + hide the URL field
- When a target is auto-detected, compute the canonical URL server-side style (`/listing/{id}`, `/business/{slug}`, `/u/{id}`), stash it in state as `target_url`, and **hide** the free-text URL input (still submitted with the payload).
- Only show the manual URL input when `target_type = "other"` or the user clicked "Not the right item?".

### 4. Update inbound links
Ensure the three entry points on `src/routes/listing.$id.tsx` already pass `listing_id` (they do). Add equivalent structured params to:
- Business detail page report links → `business_id`
- Seller/profile report links (kebab `ListingActionsMenu`) → `seller_id`

(Scope-limit: only touch existing report links that currently pass nothing or just `target_url`.)

### 5. Better default reason & details prefill
When `target_type = "listing"` and category is unset, keep "Scam / fraud attempt" default but also prefix the details textarea with a small helper line (only when empty) like `Reporting listing: {title} — ` so the reviewer immediately has context. User can delete it.

### 6. Submission payload
Include the resolved `listing_id` / `business_id` / `seller_id` (add columns only if missing — the `reports` table already has `listing_id`; check for `business_id` / `reported_user_id`. If missing, either drop them into `details` metadata or add a follow-up note — I'll inspect the schema during build to decide, no migration unless truly needed).

## Files to change
- `src/routes/report.tsx` — schema, auto-fetch, preview card, conditional URL field, prefill
- `src/components/report-target-preview.tsx` — new small component
- Possibly minor tweaks to business / profile "Report" entry points to pass structured ids (only if they exist and currently pass nothing)

## Out of scope
- Redesigning the reports admin queue
- Any DB migration unless a required column is missing (will flag before adding)
- Changing the report categories or moderation workflow
