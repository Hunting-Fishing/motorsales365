## Goal

Replace the current "Emergency tow request" form on `/towing` with a friendlier, more capable "Request a Tow" flow that captures everything a tow operator needs to dispatch correctly, including a precise map pin.

## UX changes (single page: `src/components/towing/towing-services-page.tsx`)

1. **Rename + tone**
   - Hero CTA: "Request emergency tow" → **"Request a tow"** (keep red/urgent visual only when the user selects Emergency below).
   - Form header: "Emergency tow request" → **"Request a tow"** with subtext: "Tell us what's wrong and where you are — nearby 365 Dispatch providers will respond."

2. **New top fields (above Vehicle section)**
   - **Urgency** (radio pills, required): `Emergency now` · `Time sensitive (within a few hours)` · `Scheduled` (when Scheduled is chosen, show a datetime picker → saved to `needed_at`).
   - **Situation** (radio pills, required): `Breakdown` · `Accident` · `Flat tire / won't start` · `Out of fuel` · `Stuck / needs winch` · `Other`.

3. **My Rides picker (Vehicle section)**
   - If signed in, fetch the user's `rides` (own + published). Show a horizontal selector "Use a vehicle from My Rides" with thumbnail (`cover_photo_url`), name, year/make/model.
   - Selecting a ride pre-populates: vehicle type (from `vehicle_type`), year/make/model/trim, engine, transmission, **drivetrain**, and attaches the cover photo URL to the request.
   - Empty state: link "Add a ride" → `/dashboard/rides/new` (existing route).

4. **Vehicle fields (always editable, pre-filled when ride selected)**
   - Vehicle type (existing).
   - Year / Make / Model / Trim (compact row).
   - **Drivetrain** select: `FWD` · `RWD` · `AWD` · `4x4 / 4WD` · `Unknown`.
   - Transmission select: `Automatic` · `Manual` · `Unknown`.
   - Free-text "Other details".

5. **Condition & damage**
   - "Can the vehicle roll / steer / brake?" — three Yes/No/Unknown toggles (helps operator choose flatbed vs dolly).
   - **Damage / scene photos**: multi-photo uploader (up to 5) using existing `single-file-uploader` pattern → uploaded to `tow-requests` storage bucket, stored as URL array on the request.

6. **Pickup location with map pin**
   - Keep `LocationPicker` for region/province/city.
   - Add a **map pin** step: embedded Google Map (Google Maps Platform connector, browser key already supported in repo) with a draggable marker + "Use my current location" button (geolocation). Stores `pickup_lat`, `pickup_lng`, and reverse-geocoded `pickup_address`.
   - Dropoff: same controls but pin is optional.

7. **Contact + payment** — unchanged.

8. **Provider-side directions**
   - On the provider's accepted-job view, render a "Get directions" button that opens `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` (or address fallback). (Surface this in the existing tow request detail UI on the provider dashboard — a small follow-up edit to the provider job card, not a new page.)

## Data changes

Add columns to `public.tow_requests` (migration):
- `urgency text` (`emergency` | `time_sensitive` | `scheduled`), default `emergency`
- `situation text` (breakdown/accident/flat/no_start/no_fuel/winch/other)
- `vehicle_year int`, `vehicle_make text`, `vehicle_model text`, `vehicle_trim text`
- `vehicle_drivetrain text`, `vehicle_transmission text`
- `vehicle_photo_url text` (cover from Ride or first damage photo)
- `ride_id uuid references public.rides(id) on delete set null`
- `damage_photo_urls text[] not null default '{}'`
- `can_roll boolean`, `can_steer boolean`, `can_brake boolean`
- `pickup_lat double precision`, `pickup_lng double precision`
- `dropoff_lat double precision`, `dropoff_lng double precision`

Storage:
- Create public bucket `tow-request-photos` with RLS: owner can insert/delete their folder (`<auth.uid()>/...`); anyone (incl. matched providers) can read since URLs go in the tow request row.

No changes to existing RLS on `tow_requests` (additive columns).

## Files to touch

- `src/components/towing/towing-services-page.tsx` — form rewrite (sections above).
- New `src/components/towing/tow-request-form.tsx` — extract the form to keep the page file readable.
- New `src/components/towing/ride-picker.tsx` — fetches `rides` for the signed-in user.
- New `src/components/towing/tow-map-pin.tsx` — Google Maps JS pin picker (uses `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`; gateway used for reverse geocoding via a small server fn `src/lib/tow-geo.functions.ts`).
- `supabase/migrations/*` — schema + storage bucket + policies.
- Provider job card (existing tow dashboard component) — add a "Directions" button that uses `pickup_lat/lng`.

## Out of scope (confirm if you also want)

- Editing the provider dashboard layout beyond adding the Directions button.
- SMS/Push notifications to providers on new urgency levels.
- Live ETA tracking on a map.
