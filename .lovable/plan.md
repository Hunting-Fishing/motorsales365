## Problem

The `/map` page currently shows nothing (or almost nothing) because it filters `businesses` by `status = 'active' AND lat IS NOT NULL AND lng IS NOT NULL`. Current DB state:

- `active` with coords: **0**
- `active` (no coords): 2
- `archived`: 14 (mostly no coords)
- `rejected` with coords: **88** ← the bulk of signed-up shops (67 marked `claim_state='owned'`, 21 `unclaimed`), most look like real imported carwashes/shops, not moderation rejects

So two things are wrong: the map filter is too narrow, AND a large batch of legitimate businesses is stuck at `status='rejected'`.

## Plan

### 1. Data repair (migration)
Reset the mis-flagged discovered businesses so they are visible again:
- Move rows where `status='rejected'` AND `owner_id IS NULL` AND `claim_state IN ('owned','unclaimed')` AND they came from the discovery import → set `status='active'` (they are directory listings, not moderation rejects).
- Leave any truly admin-rejected rows alone (heuristic: keep rows that have a `business_claim_audit` entry with a rejection reason, or an `admin_audit_log` `reject_business` action — those are the real rejects).
- Add a short SQL comment documenting the backfill.

### 2. Map query widening (`src/routes/map.tsx`)
Change the businesses fetch to include every publicly listable record with coordinates:
- Filter `status IN ('active','pending')` instead of just `active`.
- Keep the `lat/lng NOT NULL` filter (map pins require coords).
- Bump the `.limit(500)` cap to `2000` so all PH businesses show at national zoom (still bounded).
- Show a small "Pending review" badge on the result card + pin popup for rows with `status='pending'` so users know it's not yet fully verified.

### 3. Businesses index parity (`src/routes/businesses.index.tsx`)
Apply the same `status IN ('active','pending')` widening so the directory list matches the map. (Single-line change; keeps the two surfaces consistent.)

### 4. Verify
- After the migration, re-run the count query and confirm ~100+ `active` rows with coords.
- Load `/map` in the preview, confirm pins render for the PH map at default zoom, and confirm a pending row shows the new badge.

## Technical notes

- No RLS change needed — the public SELECT policy on `businesses` already permits `status IN ('active','pending')` for anon reads (verified in existing policies).
- No new components; only `src/routes/map.tsx`, `src/routes/businesses.index.tsx`, and one SQL migration.
- The `BusinessesMap` / Leaflet layer already handles clustering for hundreds of pins — no perf work needed.

## Out of scope

- Backfilling missing lat/lng for the 2 `active` rows without coords (would need geocoding pass — separate task).
- Re-designing the map filter bar.