# Pre-launch closure plan (items 1–10)

Each step is independently shippable. We do them in priority order so the highest-impact gaps land first. Every step ends with a quick verification.

---

## 1. Make listing edit feature-complete (BLOCKER)

**Goal:** Sellers can edit every field they set in `sell.tsx`, including videos.

- Extend `src/routes/listing.$id.edit.tsx` form with: `make`, `model`, `year`, `mileage_km`, `transmission`, `trim`, `engine`, `vehicle_type`, `category_slug`, `tags`.
- Reuse `VehiclePicker`, `TagPicker`, category select from `sell.tsx`.
- Add video section: list existing videos with remove button; allow uploading 1 (free/standard) or 3 (upgraded) using the same `plan-limits.ts` caps and `uploadWithRetry` flow as sell.
- Enforce server-side photo/video caps on update (already present for create) — extend the existing trigger/RPC to cover edits.
- Validation: re-use the Zod-style checks from `sell.tsx`.

**Verify:** Edit a listing, change make/model/tags, add a video, remove a photo, save → reload → all changes persisted.

---

## 2. Wire real support contact link

- Replace `href="#"` at `src/routes/support.tsx:282` with the actual Messenger/WhatsApp URL.
- Pull the number/handle from existing config (likely `pricing_settings` or a new `support_settings` row) so admins can change it without a deploy.
- Add the same link to the floating help widget for consistency.

**Verify:** Click the CTA on `/support` → opens Messenger/WhatsApp deep link.

---

## 3. Add `alt` text to gallery images

- `src/routes/listing.$id.tsx:398` → `alt={`${listing.title} — photo ${i + 1}`}`.
- `src/routes/businesses.$slug.tsx:459, 574` → `alt={`${business.name} — ${album.title} photo ${i + 1}`}` (or similar contextual text).
- Sweep `rg 'alt=""'` under `src/routes` and `src/components` for any other empty alts.

**Verify:** Lighthouse a11y on `/listing/$id` and `/businesses/$slug` → no "image missing alt" warnings.

---

## 4. Per-page `og:image` on key index routes

Add `og:image` (+ `twitter:image`, `og:image:width`, `og:image:height`) to:
- `src/routes/rides.index.tsx`
- `src/routes/map.tsx`
- `src/routes/businesses.index.tsx`
- `src/routes/browse.$category.tsx`

Generate 4 hero share images (1200×630) tuned per route and store under `src/assets/og/`. For `browse.$category`, derive from category slug (one image per top-level category, fallback to default).

**Verify:** `curl` each route, grep for `og:image`; preview on Facebook sharing debugger.

---

## 5. Persist garage vehicle to Supabase

- New table `user_garage_vehicles` (id, user_id, make, model, year, trim, engine, created_at). RLS: user CRUDs own rows.
- Replace `src/lib/garage.ts` localStorage singleton with a hook `useGarageVehicle()` backed by a server fn (`getGarageVehicle`, `setGarageVehicle`, `clearGarageVehicle`).
- Keep a localStorage cache for anonymous browsing; on login, migrate the cached vehicle into the table once.
- Update fitment filters (shop, parts, browse) to read from the new hook so SSR can use it via cookie or query param.

**Verify:** Set garage vehicle on device A, log in on device B → same vehicle appears; fitment filter still works for anonymous users.

---

## 6. Marker clustering + geolocation on the map

- Add `react-leaflet-cluster` (or `leaflet.markercluster` + a tiny wrapper) and group business pins in `google-business-map.tsx`.
- On `src/routes/map.tsx` mount, request `navigator.geolocation` (gated behind a user gesture/toast to avoid Safari nags); fall back to PH center.
- Add a "Use my location" button so users can opt in later.
- Server-side: convert the client `supabase.from("businesses")` to a server fn with a `limit + bbox` filter so we only fetch pins inside the current viewport.

**Verify:** Map shows clusters that expand on zoom; opting into geolocation centers the map; network panel shows bounded queries.

---

## 7. Proxy Nominatim through a server function

- Create `src/lib/geocode.functions.ts` with `geocodeAddress(q)` and `reverseGeocode(lat,lng)`.
- Server fn calls the Google Maps connector via the gateway (`/maps/api/geocode/json` and `/places/v1/places:searchText` for autocomplete) — we already have the connector wired.
- Replace direct Nominatim calls in `src/components/businesses/places-autocomplete.tsx` and any other browser-side OSM callers.
- Add a 24h server-side cache (Supabase `geocode_cache` table keyed by normalized query) to keep costs low.

**Verify:** Network tab shows requests to our own `_serverFn` endpoint, not `nominatim.openstreetmap.org`; autocomplete still works.

---

## 8. Bundle Leaflet marker icons locally

- Import `marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png` from `leaflet/dist/images/` (already in `node_modules`) and pass URLs via Vite's `?url` suffix.
- Update `src/components/businesses/location-picker-inner.tsx` and any other `L.Icon.Default.mergeOptions` call to use the bundled URLs.
- Remove all `unpkg.com` references.

**Verify:** Block `unpkg.com` in DevTools → markers still render.

---

## 9. Delete-ride action

- Add a destructive "Delete ride" item to the row menu on `src/routes/dashboard.rides.tsx`.
- Confirm dialog (shadcn `AlertDialog`).
- Server fn `deleteRide(id)` — verifies ownership, cascades photos/service logs, removes storage objects in `ride-photos` bucket.
- Update like_count / public ride pages to 404 cleanly after delete (already handled if route uses `notFound()`).

**Verify:** Create test ride → delete → confirm row gone, storage objects removed, `/rides/$slug` returns 404.

---

## 10. Webhook alerting for silent error branches

- In `src/routes/api/public/payments/webhook.ts`, replace each `console.error(...)` metadata-missing branch with a call to a shared `reportWebhookIncident({ event, reason, meta })` helper.
- Helper inserts a row into a new `webhook_incidents` table (kind, stripe_event_id, reason, payload_snippet, created_at) AND sends an email via the existing transactional template registry (new template `webhook-incident.tsx` to ops inbox).
- Surface incidents in `src/routes/admin.audit.tsx` (or new `admin.webhook-incidents.tsx`) with a "resolved" toggle.

**Verify:** Send a malformed test Stripe event → row appears, ops email arrives, admin page lists it.

---

## Cross-cutting checklist (do once at the end)

- Update `/terms`, `/refund-policy`, `/privacy` if any of steps 1, 5, 7, or 10 change data collection or fees. Bump "Last updated".
- Run `bunx tsc --noEmit` and `bunx eslint .` after each step.
- Smoke-test the seller journey end-to-end: create → pay → edit → boost → delete.

---

## Execution notes

- Steps are sequenced by user impact. We can pause and ship after any step.
- Steps 1, 5, 9, 10 require Supabase migrations — each is small and independent.
- Steps 6 and 7 share the Google Maps connector setup; doing 7 first means 6 can reuse the cache table.
- Estimated effort: step 1 is the largest (~half a day); 2/3/8/9 are < 1 hour each; the rest are 1–3 hours.

Once you approve, I'll start with **step 1 (listing edit completeness)** and stop after it lands so you can sanity-check before I move to step 2.