# Restructure Post a Listing Form

Tighten the tabbed Sell form: remove unused finance fields, merge Basics into Details, move phone to Location & Seller, and add a "Pull from my Rides" picker that auto-populates fields and links back to the Rides page.

## Tab restructure

New tab order (4 tabs instead of 5):

1. **Details** — title, description, price (+ negotiable / hide price), condition, registration status, category-specific fields, vehicle quality, fitment, etc. (Everything currently in Basics + Details merged here.)
2. **Location & Seller** — LocationPicker, seller type (private/business), and the `PhoneInput` moved here from Basics.
3. **Plan & Boost** — unchanged.
4. **Photos** — unchanged.

Update the `TABS` array, the `order` used by Back/Next, the progress bar denominator (now `/4`), and every `data-tab="basics"` section — fold its contents into the Details section. Remove the now-unused `activeTab === "basics"` branch.

## Remove finance fields

- Delete the **Monthly payment (₱/mo)** and **Down payment (₱)** inputs from the price block.
- Remove the `monthly` and `downPayment` `useState` hooks.
- Remove `monthly_php` and `down_payment_php` from the insert payload around line 756 (send `null`/omit so DB stays compatible).

## Auto-populate from Rides

Add a **"Pull from my Rides"** action at the top of the Details tab (only shown when the signed-in user has at least one ride):

- On mount, query `rides` filtered by `owner_id = user.id` (id, name, year, make, model, vehicle_type) and store in state.
- If results exist, show a compact `Select` "Prefill from your Rides" above the title field with each ride as an option, plus a hint "Adds photos & a link back to your Rides page."
- On select, reuse the existing `from_ride` prefill logic (extract it into a `prefillFromRide(rideId)` helper so both the URL param effect and the picker call it).
- After prefill, append a line to the description: `More photos & build details: https://www.365motorsales.com/rides/<id>` (only if not already present), and store `source_ride_id` in component state to include in the listing insert payload as a new column reference — if the column does not exist yet, just embed the link in the description (no schema change in this plan).

The existing `?from_ride=<id>` URL flow keeps working unchanged.

## Auto-populate other fields

- Phone: when empty, prefill from `profile.phone` / `profile.contact_phone` (already loaded via `useAuth` if available; otherwise fetch from `profiles` once).
- Location: when empty, prefill region/province/city/barangay from the user's profile defaults.
- Seller type: already synced from `effectiveSellerType` — leave as is.

## Files touched

- `src/routes/sell.tsx` — all changes above.

No database migration, no other component changes.
