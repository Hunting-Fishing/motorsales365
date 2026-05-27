# Shop category grouping — Departments + cross-tags

## Goal

Today `/shop` shows 14 flat top-level categories. Major auto retailers (Summit Racing, RockAuto, FCP Euro, AutoZone, CARiD) group everything under 4–7 "departments" in a mega-menu, then categories, then sub-categories. We will do the same — without deleting anything we already have.

Reference patterns we're mirroring:
- **Summit Racing**: Engine, Drivetrain, Suspension, Brakes, Wheels & Tires, Exterior, Interior, Tools & Equipment.
- **RockAuto**: Body & Lamp, Brake, Engine, Heat & A/C, Suspension, Transmission, Wheel.
- **CARiD**: Performance, Wheels & Tires, Body, Interior, Lighting, Accessories.
- **AutoZone**: Parts, Fluids & Chemicals, Accessories, Tools & Equipment, Performance.

## New department layer

Six departments (top-level groupings). Each existing top-level category becomes a child of one department. Sub-categories stay where they are.

```
Performance Parts        ← Performance & Tuning, Exterior Mods (Body Kits, Spoilers, Wings)
Maintenance & Fluids     ← Lubricants & Fluids (Engine Oil, ATF/Gear, Brake Fluid, Coolant, Grease), Filters*, Belts & Hoses*
Repair & Replacement     ← Parts & Spares (Brakes, Suspension, Ignition, Cooling, Exhaust, Engine Internals)
Wheels, Tires & Brakes   ← Tires & Wheels (Tires, Wheels, TPMS), Brakes* (cross-tag from Parts)
Interior & Exterior      ← Accessories (Floor Mats, Seat Covers, Phone Mounts), Detailing, Window Tint*, Decals*
Tools & Garage           ← Mechanic Tools, Garage & Storage, Safety & Recovery
Electronics & Lighting   ← Electronics (Dashcams, Head Units, Speakers, Lighting, Cameras)
Specialty                ← Motorcycle Gear, Off-Road & Overland, EV & Hybrid
```

\* = appears in primary department but is **cross-tagged** to a second department via the new tag layer (see below).

## Cross-tag layer (phase 1)

Some categories naturally belong in two places (Brakes = Repair + Wheels/Tires/Brakes; Filters = Maintenance + Repair; Window Tint = Interior/Exterior + Performance-adjacent). We add a simple `cross_department_slugs text[]` on `shop_categories` so a category can surface under multiple department mega-menu columns and filter drawers — without duplicating rows. **No engine-to-fluid matching yet** — that's phase 2 as you noted.

## Changes

### 1. Schema (one small migration)
- `shop_departments` table: `slug pk`, `name`, `description`, `icon`, `sort_order`, `hero_image_url`, `seo_title`, `seo_description`.
- `shop_categories.department_slug text` (nullable; only top-level cats set it).
- `shop_categories.cross_department_slugs text[] default '{}'`.
- Seed 8 departments and assign every existing top-level category to one.
- No deletions. No URL changes. Existing `/shop/$category` and `/shop/categories` keep working.

### 2. Server (`src/lib/shop.functions.ts`)
- `listShopDepartments()` → departments + their top-level categories + sub-counts.
- Extend `listShopCategoryTree()` to group by department.
- Extend `listShopProducts` filter: accept `departmentSlug` (resolves to all categories in that department + cross-tagged ones).

### 3. UI

**Desktop header** — replace the single "Shop" link with a mega-menu dropdown: 8 department columns, each listing its top categories, with a "View all" link. Pattern matches Summit/CARiD.

**`/shop` index** — replace today's flat 14-tile "Shop by category" grid with 8 department cards (icon + name + 3–4 example sub-cats). Clicking a card → `/shop/department/$slug`.

**New route `/shop/department/$slug`** — department lander showing all child categories + cross-tagged categories, with the existing filter drawer scoped to the department.

**`/shop/categories`** — keep, but group the tree under department headings.

**Filter drawer (`shop-filter-drawer.tsx`)** — add a Department accordion at the top; selecting one narrows the category chips to that department.

**Breadcrumbs** — `Shop › {Department} › {Category} › {Sub-category}`.

### 4. Admin (`admin.shop.tsx`)
- Department picker on the category editor.
- Multi-select "Also show in" for cross-department tagging.

## Explicitly out of scope (phase 2)
- Engine-to-fluid matching (e.g. "2.0L Turbo → 5W-30 full synthetic").
- Maintenance-interval triggered recommendations.
- Department-specific hero artwork / SEO copy beyond defaults.
- Migrating affiliate-link UTM grouping by department.

## Files touched
- New migration (departments table + columns + seed).
- `src/lib/shop.functions.ts` (department queries + filter).
- `src/components/site-header.tsx` (mega-menu).
- `src/routes/shop.index.tsx` (department grid).
- `src/routes/shop.categories.tsx` (group by department).
- `src/routes/shop.department.$slug.tsx` (new).
- `src/components/shop/shop-filter-drawer.tsx` (department facet).
- `src/components/shop/shop-breadcrumbs.tsx` (department crumb).
- `src/routes/admin.shop.tsx` (department + cross-tag pickers).
