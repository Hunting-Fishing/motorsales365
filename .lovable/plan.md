# Service Locations + Service Tags

Expand the marketplace to support automotive service businesses posting their **locations** with selectable **tags** describing what they do or sell. Builds on the existing Car Wash / Parts / Drones pattern.

## 1. New categories

Add 3 new categories alongside existing ones (carwash, parts already exist):

| Slug | Name | Icon |
|---|---|---|
| `repair` | Repair Shop | wrench |
| `bodyshop` | Body Shop | spray-can |
| `salvage` | Auto Salvage | recycle |

DB: insert into `categories`, push "Other" to sort 13.

## 2. Service tag system (the core idea)

Instead of a fixed dropdown per category, every service-type listing gets a **multi-select tag picker** grouped by theme. One unified tag library, but each category shows a relevant default group expanded.

**Tag groups (chips, alphabetized within each group):**

- **Parts sold** — Wiper blades, Tires, Wheels, Batteries, Brake pads, Filters, Belts & hoses, Lights & bulbs, Spark plugs, Fluids & oils, Body panels, Glass, Mirrors, Bumpers, Engines, Transmissions, Suspension, Exhaust, Electrical, Interior trim
- **Vehicle scope** — Cars, Motorcycles, Trucks, SUVs, Vans, Heavy duty / Commercial, Diesel, EV / Hybrid, Boats, Heavy equipment
- **Repair services** — Oil change, Tune-up, Brake service, Tire mounting & balancing, Wheel alignment, AC service, Battery service, Diagnostics, Engine repair, Transmission, Electrical, Suspension, Exhaust, Pre-purchase inspection, Roadside assist
- **Body & paint** — Collision repair, Dent removal (PDR), Painting, Bumper repair, Frame straightening, Glass replacement, Detailing, Ceramic coating, Window tinting, Rust repair
- **Wash services** — (existing carwash list, kept as a tag group)
- **Salvage / parts sourcing** — Used parts, OEM, Aftermarket, Rebuilt, Core buyback, Vehicle buyback, Parts shipping, Pick-a-part yard

Stored on `listings.attributes.tags` as a flat string array. The grouping is purely UI — searchable as one set.

**Default expanded group per category:**
- repair → Repair services + Vehicle scope
- bodyshop → Body & paint + Vehicle scope
- parts → Parts sold + Vehicle scope
- salvage → Salvage / parts sourcing + Parts sold
- carwash → Wash services
- All groups remain available via "+ Show more" so a parts store can also tag repair services it offers.

## 3. Sell form changes (`src/routes/sell.tsx`)

- Add 3 categories to `CATEGORIES` array.
- New constant `TAG_GROUPS` (keyed by group label → tag array).
- For service-type categories (`repair`, `bodyshop`, `salvage`, plus existing `carwash`, `parts`), render a single **TagPicker** component:
  - Shows default groups expanded as clickable chips (toggle on/off).
  - Other groups behind a "Show more services" link.
  - Selected tags shown as a row of removable chips at the top with a count.
  - Clean, minimal — matches existing form styling (no new design tokens).
- Repair / Body Shop / Salvage details: business hours, walk-ins (boolean), starting price (optional), brands serviced (free text), warranty (free text). Skip vehicle make/model picker.
- Submit handler writes `attributes.tags = [...]` and category-specific fields.

## 4. Browse + cards

- `browse.$category.tsx`: extend `CATEGORY_LABEL` with the 3 new entries.
- `index.tsx`: add 3 new entries to `CATEGORIES` with `Wrench`, `SprayCan`, `Recycle` icons.
- `listing-card.tsx`:
  - Extend `CATEGORY_META` with the 3 categories.
  - Extend `summarizeAttributes` so service-type listings show first 2-3 tags (e.g. "Brake service • Tires +4").
- `listing.$id.tsx`: render the full tag list as chips when `attributes.tags` is present.

## 5. Browse filtering by tag (lightweight)

On `browse.$category.tsx` for service categories, render the relevant tag groups as filter chips above the grid. Selecting one or more filters the query client-side using `attributes->tags ?| array[...]` via `.contains()` / `.overlaps()`. No new indexes — existing dataset is small. Out of scope: full-text tag search across all categories.

## Technical details

- DB migration: 3 `INSERT INTO categories`, update sort_order for "other".
- New file `src/components/tag-picker.tsx` — controlled component, props: `groups`, `defaultExpanded`, `value`, `onChange`. Pure Tailwind + existing Badge/Button.
- Tag library lives in `src/data/service-tags.ts` (single source of truth shared by sell, browse, listing-card).
- Tags stored as `string[]` in `listings.attributes.tags`. No schema change to listings — `attributes` is already jsonb.
- Listings `select(...)` already pulls `attributes` (added in prior step), so cards/detail pages get tags for free.

## Files to be touched

- DB migration (3 categories, sort_order shuffle)
- `src/data/service-tags.ts` (new — tag library + groups)
- `src/components/tag-picker.tsx` (new)
- `src/components/listing-card.tsx` (extend `CATEGORY_META` + `summarizeAttributes`)
- `src/routes/sell.tsx` (3 categories + TagPicker integration + service details fields)
- `src/routes/browse.$category.tsx` (extend `CATEGORY_LABEL` + tag filter chips)
- `src/routes/index.tsx` (3 home tiles)
- `src/routes/listing.$id.tsx` (render tag chips when present)

## Out of scope

- Booking / quote / appointment flows
- Multi-location management for one business (each location = one listing)
- Inventory / SKU search inside parts stores
- Map view of service locations
