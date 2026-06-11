# Plan: Collapsible specs + standardize on the enhanced tow form

Two small, focused changes on the listing page and the `/tow` route.

## 1. Make Specifications collapsible on the listing page

File: `src/routes/listing.$id.tsx` (the `Specifications` block around lines 575–598)

- Wrap the spec list in a `<Collapsible>` (from `@/components/ui/collapsible`, already used elsewhere).
- Header row: the existing `Specifications` title + a chevron button on the right showing item count (e.g. `12 specs`).
- Default state: **collapsed on mobile, expanded on desktop ≥ md** (so power users on a laptop still see everything at a glance, mobile users get a tidier page).
- Smooth chevron rotation; keep the rounded card chrome unchanged.
- No data or sorting changes — same key/value rows.

## 2. Standardize `/tow` on the enhanced TowRequestForm

The site has two tow request flows today:

- `/tow` (file `src/routes/tow.tsx`) — old, simpler form. This is what every "Request a tow" CTA links to (listing page, footer, etc.).
- `TowingServicesPage` mounted at `/browse/towing` — already uses the enhanced `TowRequestForm` from `src/components/towing/tow-request-form.tsx` (urgency, situation, drivetrain, can-roll/steer/brake, map pin, photos, ride picker, payment method).

### Rewrite `src/routes/tow.tsx` so it renders `TowRequestForm`

- Keep the route, head meta, and `?listing=…` / `?provider=…` search schema.
- Replace the inline form (location pickers, plain textareas, submit handler) with a layout that mirrors the `#emergency-tow` block of `TowingServicesPage`:
  - Page header ("Request a tow" + supporting copy).
  - `FeaturedTowProviders` rail above the form (already on `/tow` today — keep it).
  - `<TowRequestForm requestedProviderId={…} requestedProviderName={…} onClearRequestedProvider={…} providerSearchSlot={…} />`.
- Hydrate `requestedProvider` from `?provider=…` by querying `businesses` for `id, name` (same query the services page uses) so the CTA from a tow provider's listing pre-selects them.
- For `?listing=…`, extend `TowRequestForm` props with an optional `seedListingId?: string | null` and, when provided, fetch the listing once and pre-fill `vehicleType / vYear / vMake / vModel / vTrim` from `listings.attributes` (and rideId stays empty — this is a marketplace vehicle, not the user's ride). Show a small "Towing the vehicle from this listing" chip with a remove (×) button at the top of the vehicle section.
- Delete the now-unused state, helpers, and submit handler in `tow.tsx` — the enhanced form owns submission.

### Tighten the listing-page CTAs

File: `src/routes/listing.$id.tsx` (around lines 831 and 838)

- Both `Link to="/tow"` CTAs stay, but the labels/intent get distinguished:
  - When the listing **is a tow provider** (`category_slug === "towing"`): single CTA → `/tow?provider={listing.id}` ("Request a tow from this provider").
  - When the listing **is a vehicle for sale/transport** (cars, motorcycles, trucks, heavy equipment): CTA → `/tow?listing={listing.id}` ("Request a tow for this vehicle").
- No other call sites change (footer "Request a tow" still goes to bare `/tow`).

## 3. Polish & consistency

- Sitemap, `llms.txt`, footer, and Terms references to `/tow` stay valid — same URL, upgraded form.
- No DB or pricing changes, so no `/terms` or `/refund-policy` update needed.

## Technical notes

```text
src/routes/listing.$id.tsx
  └─ Specifications block → <Collapsible defaultOpen={mdUp}>
  └─ Tow CTAs → branch on category_slug, pass listing vs provider param

src/routes/tow.tsx (rewritten thin shell)
  └─ Loads requestedProvider from ?provider
  └─ <TowRequestForm seedListingId={search.listing ?? null} ...requestedProvider />

src/components/towing/tow-request-form.tsx
  └─ New optional prop `seedListingId`
  └─ useEffect: on mount, if seedListingId, fetch listing + prefill vehicle fields
  └─ Small dismissible chip showing "From listing: <title>"
```

No new dependencies. Existing `Collapsible`, `LocationPicker`, `TowMapPin`, `RidePicker`, and `FeaturedTowProviders` are reused.

## Out of scope

- Redesigning the enhanced form itself.
- Changing dispatch routing/pricing/payments.
- Touching `dashboard.tow.tsx` (the operator-side inbox).
