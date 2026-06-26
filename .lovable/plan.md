
# OEM Parts Search by VIN/Chassis — Phase 1

Add a real search experience to `/parts` that takes a VIN, JDM chassis code, or manual make/model, decodes it to make/model/year/engine, and shows partner outlets (from `parts_outlets`) that carry that brand in the selected country.

## User flow

```text
[Country selector: PH ▼]
[VIN or Chassis #________________] [Decode]
   ↳ "Toyota Corolla 2018 1.6L (decoded)"     [edit/clear]
   — or — switch to Manual: Make ▼ Model ▼ Year ▼

→ Results (live)
   "12 outlets in Philippines carry Toyota parts"
   [Outlet card] name · type badge · city · brands · D2C badge · Call · Website · "Request quote" → existing OemOrderForm prefilled
```

If VIN decode fails, surface the error inline and auto-offer the manual picker (keep the typed value as `chassis_or_vin` on the quote form).

## Pieces to build

### 1. VIN decoder server fn — `src/lib/vin-decode.functions.ts`
- `decodeVin({ value })` — public `createServerFn`.
- 17-char standard VIN → NHTSA free endpoint `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{VIN}?format=json` via `fetch` (no key, Worker-safe). Map to `{ make, model, year, engine, trim, source: "nhtsa" }`.
- JDM short chassis (regex like `^[A-Z0-9]{2,7}-?\d{3,7}$`, e.g. `JZX100`, `EK9`, `GC8`) → lookup against a seeded `jdm_chassis_codes` table (code, make, model, year_min, year_max, engine). Return same shape with `source: "jdm_table"`.
- Otherwise return `{ ok: false, reason: "unrecognized" }` so UI falls back to manual.
- Zod-validate input (3–20 chars, uppercase, alphanumerics + dash).

### 2. Catalog server fn — extend `src/lib/parts-catalog.functions.ts`
- `searchOemOutlets({ country, make, model?, year? })` — public. Reuses existing `parts_outlets` query, filters `country_code` + `is_verified DESC` + `brands @> [make]`. Returns same shape as `listPartsOutlets` plus an `outlet_match_score` (verified+d2c first).
- No new outlet inventory yet (per user's "show all active outlets for that brand" choice).

### 3. JDM chassis seed table
Migration `jdm_chassis_codes`:
- columns: `code` (PK, upper), `make`, `model`, `year_min`, `year_max`, `engine`, `notes`
- GRANT `SELECT` to `anon, authenticated`; `ALL` to `service_role`
- RLS on, single policy: public read
- Seed ~40 common PH grey-import codes (JZX100, JZA80, EK9, DC2/DC5, GC8/GD/GR, BNR32/33/34, S13/14/15, AE86, FD3S, EVO4–10, etc.) in a follow-up `supabase--insert`.

### 4. UI — new `src/components/parts/oem-search.tsx`
Replaces the static "Order OEM" tab content (keeps `OemOrderForm` as the quote-request CTA inside each outlet card and as the empty-state fallback).

Sections:
- **CountrySelect** (driven by `listPartsCountries`, defaults to PH, only `is_active` selectable; others render as disabled "coming soon").
- **VinInput** with `Decode` button + spinner; on success shows a confirmation chip with vehicle summary and `Edit`/`Clear`.
- **Manual fallback** (`Make` / `Model` / `Year`) — collapsible accordion, opens automatically on decode failure.
- **Results list**: outlet cards with `Phone`, `Website`, `Request quote` (opens `OemOrderForm` pre-filled with decoded VIN+vehicle+outlet name).
- Empty state: "No outlets yet for {Make} in {Country}. We'll notify you when one joins." → falls back to `OemOrderForm`.

### 5. Wire into `/parts`
- `src/routes/parts.tsx`: render `<OemSearch />` instead of `<OemOrderForm />` in the `order` tab. Tab label stays "Order OEM" (drop the "Soon" badge since search is live; outlets directory may still be small).

### 6. State / URL
Persist `country`, `vin`, `make`, `model`, `year` in the URL via `validateSearch` on the parts route so a result link is shareable (matches project convention).

## Out of scope (explicit, for later phases)
- Per-part OEM number lookup / catalog tree (PartSouq-style diagrams)
- Per-outlet pricing/inventory
- Paid VIN decoder fallback for JDM VINs that NHTSA can't read
- D2C cart / checkout

## Acceptance
- Entering `JTDBR32E720123456` (or any valid VIN) shows decoded Toyota + a filtered Toyota outlet list for PH.
- Entering `JZX100` shows Toyota Chaser/Mark II/Cresta 1996–2001 + Toyota outlets.
- Garbage input → inline error + manual picker visible.
- Switching country to Vietnam shows "coming soon" and empty results without errors.
- Lighthouse: no new console errors; SSR works (route still public, all reads use publishable-key client).

