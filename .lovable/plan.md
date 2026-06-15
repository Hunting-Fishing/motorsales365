## Goal

`/browse/towing` currently renders the full `TowingServicesPage` (hero + filters + provider grid + tow request form). It feels cluttered and duplicates the dedicated `/tow` "Request a tow" page. Merge everything into a single, cleaner page at `/tow`, and redirect `/browse/towing` to it.

## Changes

### 1. Make `/tow` the single home for towing

Rewrite `src/routes/tow.tsx` so the page flows top-to-bottom as:

1. **Compact hero** — Truck icon, "Request a tow / Find a towing provider" title, short subtitle, CTAs (List your towing company, Join 365 Dispatch).
2. **Filter card** (the layout from the uploaded screenshot — service chips on top row, then a tight grid: Province coverage (Use my location + Region/Province/City), Accepts payment, and right-aligned 24/7 + Verified-only toggles).
3. **Provider grid** — Promoted row + organic grid (`ProviderCard`), reacts live to filters.
4. **Request a tow** anchor section (`#emergency-tow`) — keeps the existing `TowRequestForm`, with the "request a specific provider" search slot. Pre-selected region/city from the filter bar above is passed into the form's location fields when empty.
5. Trust strip (Verified PH providers / 24/7 / Flatbed-wheel-lift-heavy-duty) + footer link.

Implementation: import `TowingServicesPage` and refactor it to accept `seedListingId` / `requestedProviderId` from the route search params so we don't duplicate the filter+grid+form logic. Move the filter chip strip into the same card as the location/payment/toggle row (as in the screenshot) — currently the chip strip is on its own line, but the screenshot wants them grouped in one card. Tighten spacing (`p-5` → keep, but collapse the extra heading above the form, since the hero already labels the page).

### 2. Redirect `/browse/towing` → `/tow`

In `src/routes/browse.$category.tsx`, replace the `if (category === "towing") return <TowingServicesPage />` branch with a `<Navigate to="/tow" replace />` (preserving any `?listing=` / `?provider=` search params). This removes the duplicate surface and any inbound links keep working.

### 3. Filter card visual cleanup (matches uploaded image)

- Service chips and Province/Payment/Toggles all live inside one rounded card.
- On `md+`: grid `[minmax(260px,1fr)_minmax(180px,220px)_auto]` so Region/Province/City sit beside Accepts payment beside the toggle stack — same proportions as the screenshot.
- On mobile: stack vertically, chips wrap, toggles drop below.
- Replace the old `flex-wrap` chip row that takes too much vertical space with a single wrapping row capped at 2 lines.

## Technical notes

- `TowingServicesPage` becomes the body of `/tow`; export a small `TowPageHeader` (or inline) so the hero stays cohesive.
- Keep the existing direct-provider combobox (`providerSearchSlot`) — only the surrounding chrome changes.
- No DB / functions / RLS changes. Pure frontend reorganization.
- Update internal links that point to `/browse/$category` with `category: "towing"` (footer, tow.tsx bottom link) to point to `/tow` instead.

## Files touched

- `src/routes/tow.tsx` — becomes the single towing landing/request page.
- `src/routes/browse.$category.tsx` — redirect `towing` to `/tow`.
- `src/components/towing/towing-services-page.tsx` — tighten filter card layout to match the screenshot; accept `seedListingId` / `requestedProviderId` props from the route.
- `src/components/site-footer.tsx` (and any other `to="/browse/$category"` with `towing`) — repoint to `/tow`.
