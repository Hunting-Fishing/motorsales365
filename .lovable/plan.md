## Status after exploration

Most of Phase 2 is already shipped:

- **#1 Seed listings** — 12 sample listings live in DB ✓
- **#10 Shop affiliate products** — 48 products live ✓
- **#11 Business directory seeds** — 14 sample businesses live ✓
- **#12 Public seller landing** — `start-selling.tsx` (294 lines) exists ✓
- **#2 SSR fallback** — `tow.tsx`, `businesses.index.tsx`, `map.tsx` are 400–510-line route components, not "Loading…" stubs ✓

Genuinely open items in Phase 2:

- **#7 PH buyer document checklist** — no component exists; listing detail only references an `or_cr` inquiry type
- **#13 Structured listing fields** — sell form does not collect OR/CR status, flood/accident, registered-owner status, plate ending, fuel type, variant, financing/trade-accepted, negotiable. Listings table uses JSONB `attributes`, so no migration needed — just form + display fields

## This batch (Phase 2, slim)

### A. Buyer Document Checklist (#7)

1. Create `src/components/buyer-document-checklist.tsx` — collapsible card with 10 PH-specific items: OR/CR present, registered owner matches seller, deed of sale ready, valid IDs ready, chassis # matches CR, engine # matches CR, plate # matches, no encumbrance / chattel mortgage, flood/accident disclosed, HPG clearance recommended for high-value units. Each item is a checkbox (purely client-side / `useState`) so the buyer can tick them off during inspection. Link to `/verified` and `/guidelines` at the bottom.
2. Mount it on `src/routes/listing.$id.tsx` for category `car` / `motorcycle` / `truck` (not parts). Render in the sidebar below the seller card on desktop, full-width below gallery on mobile.

### B. Structured listing fields (#13)

3. Extend the sell form (`src/routes/sell.tsx`) vehicle-attributes section with new optional fields stored in `attributes` JSONB:
   - `fuel_type` (Gasoline / Diesel / Hybrid / EV / LPG)
   - `or_cr_status` (Complete / OR only / CR only / Lost — duplicate available / None)
   - `registered_owner_status` (1st owner / 2nd / 3rd+ / Casa-released / Auction)
   - `plate_ending` (free text)
   - `flood_history` / `accident_history` (Yes-disclosed / No / Unknown)
   - `negotiable` (boolean)
   - `financing_available` (boolean)
   - `trade_accepted` (boolean)
   - `last_registration_date` (date)
   - `variant` (free text, e.g. "1.5G CVT")
4. Display the same fields on `src/routes/listing.$id.tsx` in the existing specs grid; show "—" when not provided.
5. Update `mem://index.md` rule reference if needed — not changing fees/payments, so no Terms/Privacy bump required.

### Out of this batch

Phase 3 items (#9 Maya/QR Ph, #16 ad rate card content depth, #17 learn monetization, #19 wanted enhancements, #20 inspection upsells) — separate batch.

## Execution order

1. Build BuyerDocumentChecklist component → wire into listing page.
2. Add 10 attribute fields to sell form + listing detail display.
3. Smoke-test in preview (open a listing, open /sell as an existing user, check field renders).