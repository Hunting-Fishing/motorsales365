## Goal

Right now the Details tab renders as **three separate cards** ("Basics", "What do you offer?", and a generic "Details" block that also hosts VIN + VehiclePicker + Mileage/Trans/Fuel + Description + VehicleQualityFields + CategoryAttributesEditor). It reads as messy because the same logical concept (the listing's identity + specs + condition) is split across three bordered cards, while unrelated concepts (asking price vs. VIN vs. category filters) sit next to each other inside the same card.

This plan collapses the Details tab into **one card** with clearly labeled sub‑sections (no extra borders, just `<h3>` dividers), reorders fields so they match how buyers actually scan a marketplace listing, and tightens spacing. Nothing is removed.

## New single-card structure (Details tab)

One `<section data-tab="details">` card. Inside, sub-sections separated by a thin `border-t` divider and a small uppercase `text-[11px] text-muted-foreground` eyebrow — no nested cards.

```
┌─ DETAILS card ──────────────────────────────────────────────┐
│ Header row: "Listing details"            [Pull from Rides ▾]│
├─ LISTING ───────────────────────────────────────────────────┤
│ Title (full width)                                          │
│ Category │ Condition │ Registration* │ Seller type          │  (lg:grid-cols-4)
├─ PRICE ─────────────────────────────────────────────────────┤
│ Asking price │ ☐ Negotiable  ☐ Hide price (inline)          │  (1 input + inline checks)
├─ VEHICLE  (only for car / motorcycle) ──────────────────────┤
│ VIN / chassis  [Scan]                                       │  (full width, helper text)
│ Year │ Make │ Model │ Trim/Engine                           │  (VehiclePicker, kept as-is)
│ Mileage │ Transmission │ Fuel                               │  (lg:grid-cols-3)
├─ CATEGORY DETAILS  (only when applicable) ──────────────────┤
│ Renders the category-specific block currently inside the    │
│ third card: repair/bodyshop, carwash, parts, used_part,     │
│ drone, towing, OR generic Make/Model/Year for non-vehicle   │
│ categories. Same fields, same grid, just no nested border.  │
├─ CONDITION & QUALITY  (only car / motorcycle) ──────────────┤
│ <VehicleQualityFields …/> — unchanged internals             │
├─ FILTERS  (only for isAttrCategory) ────────────────────────┤
│ "Buyers filter by these" + <CategoryAttributesEditor/>      │
├─ DESCRIPTION ───────────────────────────────────────────────┤
│ Textarea, rows={4}, full width                              │
└─────────────────────────────────────────────────────────────┘
```

Why this order: Listing identity first (what is it / who's selling), then price (the #1 buyer scan), then the spec block (vehicle facts), then condition/quality, then category-specific filter attributes, then the long-form prose at the bottom. Matches the order a buyer reads a listing card → detail page.

Moves:
- "Seller type" RadioGroup leaves the Location tab and joins the LISTING row as a 4th cell (compact `Select` instead of two radio cards — same two options "Private" / "Business / Dealer"). The Location tab keeps Phone + LocationPicker only.
- "What do you offer?" (service TagPicker for repair/bodyshop/salvage/etc.) becomes a CATEGORY DETAILS sub-section inside the same card, rendered above the category-specific grid for service categories. No more separate bordered card.
- VIN/chassis moves out of the "car/motorcycle" branch into a dedicated VEHICLE sub-section so it visually sits above Year/Make/Model (matches the earlier "VIN above make/model" request).
- Description moves to the bottom of the card (it's the longest field; keeping it last stops it from pushing structured fields below the fold).
- Drop the `<h2>` headings on the inner blocks; use `<h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">` as section eyebrows so the whole card reads as one surface.

## Density pass (Details card only)

- Card padding stays `p-3 sm:p-4` so the single card has breathing room, but inner `space-y-2` between sub-sections and `gap-2` inside grids.
- All `<Label>` → `text-xs`; all `<Input>`/`<SelectTrigger>` → `h-9 text-sm` (already the pattern in the Basics row, extend to the vehicle + category grids which currently use the default `h-10`).
- Replace nested bordered wrappers (`rounded-md border border-border/60 bg-background/40 p-4` on CategoryAttributesEditor, `rounded-lg border border-border bg-muted/20 p-3` on FitmentEditor) with plain `pt-2` since they now live inside a single card.
- Sub-section divider: `border-t border-border/60 pt-2 mt-2` (no horizontal padding change).
- Drop the standalone "Title" row width — keep full width but move it into the LISTING grid as `lg:col-span-4` so the 4-up row underneath aligns.

## Out of scope

- Location, Plan & Boost, Photos tabs (the user called out the Details page specifically).
- VehiclePicker, VehicleQualityFields, CategoryAttributesEditor, TagPicker, FitmentEditor internals — only their wrapper styling changes.
- Validation, submit logic, what gets saved.
- Tab strip / progress bar.

## Files

- `src/routes/sell.tsx` — restructure lines ~1003–1678 into one section; move Seller-type RadioGroup out of the Location section at ~1694–1717 into the new LISTING grid (replace with a compact `Select`); minor spacing tweaks on the Location section header.

No other files touched.
