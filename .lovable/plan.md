## Goal

On `/admin/advertisements/share-kit` (and matching dashboard page), group every ad (built-in + uploaded custom) into collapsible categories, with **4 cards per row on tablet & desktop**, **2 per row on mobile**. Categories are auto-detected from the image and editable by admins.

## Categories (with sub-categories)

Top-level — Services, Sales, Marketing, Other:

```text
Service & Repair Shop
  ├── Auto Repair / Mechanic
  ├── Detailing & Carwash
  ├── Upholstery & Interior
  ├── Tow & Roadside
  ├── Inspection & Testing
  └── Tire / Wheel / Alignment
Sales & Service
  ├── Vehicles For Sale
  ├── Parts & Accessories
  └── Fuel / Lubricants
Insurance / Finance
  ├── Insurance
  └── Financing & Loans
Advertising 365
  ├── Social Posts
  ├── Stories & Reels
  └── Print & Wearables
Other
```

Stored as two columns: `category` (top-level) + `subcategory`.

## Schema changes

New migration:
- `ALTER TABLE share_kit_custom_templates ADD COLUMN category text, ADD COLUMN subcategory text;`
- New table `share_kit_builtin_categories(template_id text PK, category text, subcategory text, updated_by uuid, updated_at timestamptz)` for admin overrides of built-in template categories (read by `authenticated`, write by `admin`).
- Standard GRANTs + RLS policies.

## Auto-detect (AI vision)

New server fn `classifyShareKitTemplate` (admin-only) in `src/lib/share-kit-classify.functions.ts`:
- Input: `{ imageUrl, width, height }`
- Calls Lovable AI (`google/gemini-3-flash-preview`) with the image + a strict prompt listing the allowed `(category, subcategory)` pairs and returns `Output.object({ category, subcategory, confidence })`.
- Used by:
  - `upsertShareKitCustomTemplate` (on upload) — best-effort, swallow errors.
  - A new `classifyAllUncategorized` server fn that loops over uploads + built-ins missing a category (concurrency 3).

New UI button next to "Smart fit all ads": **"Auto-categorize all"** (admin only). Persists results.

## Admin override

Each card gains a compact category picker (popover with two `<Select>`s: category → subcategory) saved via:
- `setShareKitCustomCategory({ id, category, subcategory })` for uploads
- `setShareKitBuiltinCategory({ templateId, category, subcategory })` for built-ins

## Built-in template seed categories

Update `TEMPLATES` in `src/lib/share-kit/templates.ts` to use the new `(category, subcategory)` shape, mapping the existing tags:
- `rear-shirt`, `arm-band` → Advertising 365 / Print & Wearables
- `square-social`, `banner-1200` → Advertising 365 / Social Posts
- `story-reel` → Advertising 365 / Stories & Reels
- `tow-247` → Service & Repair Shop / Tow & Roadside
- `buy-cars` → Sales & Service / Vehicles For Sale
- `parts-shop` → Sales & Service / Parts & Accessories

## UI refactor (admin + dashboard share-kit pages)

Replace the flat grid with a list of collapsible top-level categories. Inside each top-level group, sub-headers (h4) split the cards by subcategory. Empty categories are hidden.

Grid: `grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-3` (was `sm:grid-cols-2 xl:grid-cols-3`). Card max-width removed so cards fill the column. Admin action row becomes icon-only buttons (Trash / Eye / Tag) to keep cards compact.

Open/closed state persisted in `localStorage` under `share-kit-open-cats-v2`. First category open by default.

Files touched:
- `supabase/migrations/<ts>_share_kit_categories.sql` (new)
- `src/lib/share-kit/types.ts` — add `subcategory`, update `category` enum
- `src/lib/share-kit/templates.ts` — re-tag all built-ins
- `src/lib/share-kit/categories.ts` (new) — central category tree + helpers
- `src/lib/share-kit-classify.functions.ts` (new) — vision classifier + bulk
- `src/lib/share-kit-templates.functions.ts` — extend upsert + add `setShareKitCustomCategory`, return category fields, include built-in overrides in list payload
- `src/components/share-kit/category-picker.tsx` (new)
- `src/routes/admin.advertisements.share-kit.tsx` — collapsible grouped layout + 2/4/4 grid + auto-categorize button + per-card picker
- `src/routes/dashboard.share-kit.tsx` — same grouping/grid (read-only, no picker)

## Out of scope

- Renaming/removing categories at runtime — fixed taxonomy in code for v1.
- Per-category sort order beyond the order defined in `categories.ts`.
