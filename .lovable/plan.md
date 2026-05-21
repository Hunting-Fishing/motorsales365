## Goal

Reclassify **Parts Shop** as a Service Provider category. Rental stays under Business / Dealer (it lists vehicles). Dealership stays under Business / Dealer.

## Result after change

- **Business / Dealer** → Dealership, Rental
- **Service Provider** → Parts shop, Repair shop, Towing, Body shop, Carwash, Salvage

## Changes

### 1. `src/routes/signup.tsx` — `BUSINESS_KIND_OPTIONS`
Change `parts_shop` from `forIntent: "business"` to `forIntent: "service_provider"`. One-line edit; the existing `kindOptions` filter handles the rest, and the Category dropdown updates automatically based on which card the user picks.

### 2. `src/components/signup/account-type-grid.tsx` — copy refresh
Update the two card descriptions so users can self-select correctly:

- **Business / Dealer** description → "Dealership or vehicle rental — sell or rent out cars, trucks, and equipment."
- **Service provider** description → "Parts shop, repair, towing, body shop, carwash, or salvage specialist."

Also tweak the matching `note` strings (the "Heads up" blurb shown under the cards) to match the new scope.

### 3. No DB / schema changes
`business_kind` is a free-form enum on `profiles` — the value `parts_shop` already exists and remains valid. Existing accounts are untouched; only the signup picker shifts where the option appears.

### 4. No changes to
- `POST_SIGNUP_ROUTE` (still `/businesses/submit` for both)
- `businesses.submit.tsx` flow
- `business_types` table seed (separate concept — used for directory listings, not signup intent)

## Out of scope

- Merging the two cards entirely (rejected — Rental needs the vehicle-listing path)
- Renaming intents in the DB
- Changes to the public directory or business submission flow
