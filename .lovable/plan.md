
## Goal

Make the Services & Pricing editor capture the structured data we'll need later for client‑side filtering, sorting, and "nearest provider" search — without breaking the compact 1–2 row format users already like. Each row stays small; we just add a handful of high‑signal fields that map cleanly to filter facets.

## What we're adding (per service row)

These are the fields a Filipino shopper actually filters by:

| Field | Type | Why it matters | UI |
|---|---|---|---|
| `price_php` (existing) | numeric | "From" price | Inline input |
| `max_price_php` (new) | numeric, nullable | "To" price — common "₱X – ₱Y" pricing here | Inline input next to From |
| `unit` (existing) | text | per L / km / service / hour | Select |
| `price_label` → renamed in UI to **Note** (existing) | text | "+ fuel at pump", "BYOP" etc. | Inline input |
| `region_scope` (new) | enum text: `on_site`, `barangay`, `city`, `province`, `region`, `nationwide` | Coverage level used by the directory filter | Select |
| `service_radius_km` (new) | int, nullable | For tow/mobile/roadside — drives "within X km of me" sort | Inline input (only shown when relevant) |
| `eta_minutes` (new) | int, nullable | Typical response time — the #1 tow/roadside filter | Inline input |
| `tags` (new) | text[] | Free facets like `24/7`, `flatbed`, `wheel-lift`, `diesel`, `appointment-only`, `pickup-dropoff` | Chips row under the main row |
| `available_24_7` (new) | bool | Fast facet for emergency searches | Toggle (also auto‑adds `24/7` tag) |
| `active` / hidden (existing) | bool | Owner can hide without deleting | Eye toggle |

Existing `description`, `photo_url`, `sale_price_php`, `catalog_id`, `pending_suggestion_id`, `category`, `sort_order` stay as‑is.

## Database migration

Single migration adds the new columns + helpful indexes for the future filter UI:

```sql
ALTER TABLE public.business_services
  ADD COLUMN max_price_php numeric,
  ADD COLUMN region_scope text,
  ADD COLUMN service_radius_km int,
  ADD COLUMN eta_minutes int,
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN available_24_7 boolean NOT NULL DEFAULT false;

-- region_scope is a soft enum (text + trigger), not a CHECK, so it can evolve.
CREATE OR REPLACE FUNCTION public.validate_business_service_row()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.region_scope IS NOT NULL AND NEW.region_scope NOT IN
    ('on_site','barangay','city','province','region','nationwide') THEN
    RAISE EXCEPTION 'invalid region_scope: %', NEW.region_scope;
  END IF;
  IF NEW.max_price_php IS NOT NULL AND NEW.price_php IS NOT NULL
     AND NEW.max_price_php < NEW.price_php THEN
    RAISE EXCEPTION 'max_price_php must be >= price_php';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_business_service_row
  BEFORE INSERT OR UPDATE ON public.business_services
  FOR EACH ROW EXECUTE FUNCTION public.validate_business_service_row();

-- Indexes that the future filter/sort UI will lean on.
CREATE INDEX IF NOT EXISTS idx_bs_active_price ON public.business_services (active, price_php);
CREATE INDEX IF NOT EXISTS idx_bs_catalog_active ON public.business_services (catalog_id, active);
CREATE INDEX IF NOT EXISTS idx_bs_tags_gin ON public.business_services USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_bs_region_scope ON public.business_services (region_scope) WHERE region_scope IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bs_eta ON public.business_services (eta_minutes) WHERE eta_minutes IS NOT NULL;
```

No new table, no policy changes — existing RLS on `business_services` already gates owner‑editor writes and public reads.

## Server function

`src/lib/business-services-save.functions.ts` — extend `DraftServiceSchema` and the insert mapping:

```ts
const DraftServiceSchema = z.object({
  catalog_id: z.string().uuid().nullable(),
  pending_suggestion_id: z.string().uuid().nullable(),
  title: z.string().trim().min(1).max(120),
  description: z.string().max(500).nullable(),
  unit: z.string().max(20).nullable(),
  price_php: z.number().nullable(),
  max_price_php: z.number().nullable(),
  notes: z.string().max(500).nullable(),               // -> price_label
  region_scope: z.enum(['on_site','barangay','city','province','region','nationwide']).nullable(),
  service_radius_km: z.number().int().min(0).max(2000).nullable(),
  eta_minutes: z.number().int().min(0).max(10_080).nullable(),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  available_24_7: z.boolean().default(false),
});
```

Map the new fields straight through in the existing delete‑then‑insert flow. Auto‑inject `'24/7'` into `tags` when `available_24_7` is true; auto‑remove it when toggled off.

## Editor UI — `src/components/business/services-table.tsx`

Keep the spreadsheet table. Per service = **two compact rows** inside the same `<tbody>`:

Row 1 (always visible):

```
Service · From ₱ · – ₱ To · Unit · Note · Coverage · ETA · Market · Delete
```

Row 2 (always visible, lighter background, no header):

```
[chip] [chip] [chip] [+ tag]   ◯ 24/7   Radius ____ km   ☐ Hidden
```

Details:
- **From/To prices**: two narrow inputs (`w-20` each) with an en‑dash between. Leaving "To" empty = fixed price.
- **Coverage**: `<Select>` with the 6 enum labels, default from business primary location level when blank.
- **ETA**: small minute input; only meaningful for tow/roadside/mobile but offered to all.
- **Radius**: number input + "km" suffix, only relevant when `region_scope` is `on_site`/`barangay`/`city`; the field stays editable always but greys out otherwise.
- **Tags**: chip editor — type, press Enter, chip appears. Backspace removes. Suggested tags come from a small per‑business‑type tag list (e.g. tow → flatbed, wheel‑lift, heavy‑duty, motorcycle; fuel → diesel, gas, premium; carwash → hand‑wash, interior, engine‑bay).
- **24/7 toggle** and **Hidden toggle** sit on row 2.
- **Market** column keeps the popover from `getServicePriceStats` (count · avg · min–max).
- Autosave debounce stays at 500 ms via `saveBusinessServices`.

Suggested tag presets live in a small new map in `src/data/service-tags.ts` (file already exists per directory listing — extend it; no new file needed).

## Public‑side wiring (this turn = data only; one small change)

- `src/routes/businesses.$slug.tsx` — display "From ₱X – ₱Y / unit", a small "24/7" badge, an "ETA ~15 min" badge, and tag chips on each service row. No new server call; the data ships with the existing services payload.

The full filter/sort/"nearest tow yard" search UI is **out of scope this turn** — that becomes its own follow‑up that reads these new columns.

## Files to edit

- New migration (schema + trigger + indexes)
- `src/lib/business-services-save.functions.ts` — extend schema + insert mapping
- `src/components/business/services-table.tsx` — add the new columns + row 2 chips/toggles
- `src/data/service-tags.ts` — add per‑business‑type suggested tags
- `src/routes/businesses.$slug.tsx` — render the new fields on the public service row
- `src/routes/dashboard.businesses_.$id.edit.tsx` — map new fields when loading `initial` `DraftService[]`

## Memory policy follow‑up

Adding pricing‑display fields (From–To, ETA, Coverage, Tags) touches the directory + services/products catalog rules. After implementing, also bump `/terms` "Last updated" with one line noting expanded service metadata (per the project core rule).

## Out of scope

- Public directory filter/sort UI (next turn)
- Distance‑to‑user calculation (needs a "where are you?" prompt + business lat/lng query; next turn)
- Admin moderation of new tag values
- Products tab
