## Add Towing & Trucking category

Two parts: a new marketplace category where towing/trucking providers list their service, and a "Request a tow" quick-action so buyers can arrange transport for a vehicle they're buying (to home, to a mechanic, between regions).

### 1. Database (migration)

- Insert new row in `categories`:
  - `slug = 'towing'`, `name = 'Towing & Trucking'`, `icon = 'truck'`, `sort_order = 6` (bump `other` to 7).
- No schema changes needed — towing service listings reuse `listings` with `category_slug = 'towing'` and store service details in `attributes` JSON:
  - `service_type` (flatbed / wheel-lift / heavy wrecker / self-loader / box-truck / lowboy)
  - `vehicle_capacity` (sedan / SUV / motorcycle / heavy equipment / boat trailer)
  - `coverage_regions` (string[])
  - `base_rate_php`, `per_km_rate_php`
  - `available_24_7` (bool), `response_time_minutes`
- Optional new table `tow_requests` (so requests aren't lost in the messages thread):

```text
tow_requests
  id uuid pk
  requester_id uuid (auth.uid)
  provider_id uuid null     -- null = broadcast/open request
  listing_id uuid null      -- the vehicle being towed, if from a listing page
  pickup_region/province/city/address text
  dropoff_region/province/city/address text
  vehicle_summary text       -- "2018 Civic, non-running"
  needed_at timestamptz null
  notes text
  status text default 'open' -- open / accepted / completed / cancelled
  created_at, updated_at
```

RLS:
- Requester can SELECT/UPDATE/DELETE own rows.
- Provider (if `provider_id = auth.uid()`) can SELECT and UPDATE status.
- INSERT: `auth.uid() = requester_id`.
- Open broadcast requests (`provider_id is null` and `status = 'open'`) are SELECTable by users with a published towing listing (verified via EXISTS on listings).

### 2. Frontend

**Category wiring (`car`-like everywhere):**
- `src/routes/index.tsx` — add `{ slug: "towing", name: "Towing & Trucking", Icon: Truck }` to category grid.
- `src/components/site-header.tsx` — add nav entry.
- `src/components/site-footer.tsx` — add Browse link.
- `src/routes/sell.tsx` — add `{ slug: "towing", name: "Towing & Trucking" }`. When selected, hide the VehiclePicker (year/make/model) and show towing-specific fields (service type, capacity, coverage regions multi-select, rates, 24/7 toggle).
- `src/routes/browse.$category.tsx` — already param-driven; add a small filter group when `category === 'towing'` (service type, coverage region) reading from `attributes`.

**New route `src/routes/tow.tsx`** — "Request a tow" landing page:
- Form: pickup + dropoff (LocationPicker), vehicle summary, needed-by date/time, notes.
- Optional: pick a specific provider (links from a provider listing pre-fill `provider_id`) or broadcast.
- On submit → insert into `tow_requests`; also create a `messages` row to the provider (if specific) so it appears in their inbox.
- Show user's own past requests with status.

**"Request a tow" CTA on listing detail (`src/routes/listing.$id.tsx`):**
- Below the contact-seller block, add "Need this towed?" button → links to `/tow?listing=<id>` with that listing prefilled (pickup = seller location, dropoff blank, vehicle_summary = listing title).

**Provider dashboard tab `src/routes/dashboard.tow.tsx`:**
- Lists incoming `tow_requests` (direct + open broadcasts matching their coverage regions).
- Accept / decline / mark completed actions.
- Add link in `src/routes/dashboard.tsx` sidebar visible only when user has at least one active towing listing.

### 3. Listing card / vehicle data

- `src/data/vehicles.ts` is unchanged — towing listings don't go through VehiclePicker.
- `src/components/listing-card.tsx` — when `category_slug === 'towing'`, show service type + coverage regions instead of year/mileage chips (if those exist).

### 4. Out of scope (for now)

- No payments/escrow for tow jobs — coordination happens via existing messages.
- No live driver tracking / map routing.
- No automatic price quoting — providers quote in chat.

### Files to touch

```text
supabase migration: add categories row + tow_requests table & RLS
src/routes/index.tsx
src/components/site-header.tsx
src/components/site-footer.tsx
src/routes/sell.tsx
src/routes/browse.$category.tsx
src/routes/listing.$id.tsx
src/routes/tow.tsx                (new)
src/routes/dashboard.tow.tsx      (new)
src/routes/dashboard.tsx
src/components/listing-card.tsx
```
