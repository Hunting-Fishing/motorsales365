## Goal
Restructure the listing page right rail into a compact "Buyer resource" stack (like the reference screenshot) and back the PH Buyer Checklist with a database + downloadable PDF guides.

## 1. Sidebar restructure — `src/routes/listing.$id.tsx`
Introduce a new compact sidebar card component `BuyerResourcesCard` rendered directly under the Seller card (and above the map/ads). It groups short entries — each a small icon + label + chevron — that expand inline or link out:
- LTO / OR-CR verification status (reads existing `vehicle_passport_verifications` / LTO doc verification badges — link to `/verified`)
- Insurance quote (existing coming-soon row)
- Pre-purchase inspection (existing coming-soon row)
- Financing (existing coming-soon row)
- Parts & Accessories for this car (new link to `/parts?make={make}&model={model}&year={year}` prefilled from `listing.attributes`)
- More from this seller (link to `/seller/$id`)
- PH Buyer Document Checklist (opens the interactive checklist in a Dialog/Sheet, sourced from DB — see §3)
- Safety tips & guides (links to downloadable PDFs — see §4)

Visual: mirrors the reference — `p-3` card, `text-sm` label rows with `h-8` icon squares, `divide-y` separators, no big headings. Replaces the current large "Need inspection or insurance" `ComingSoonSection` block (delete it from the sidebar).

Move the existing bottom-of-main `<BuyerDocumentChecklist />` mount out of the main column; the sidebar entry becomes the single entry point (dialog).

## 2. Component work
- New `src/components/listing/buyer-resources-card.tsx` — the compact stacked card. Props: `listing`, `seller`. Uses `Collapsible` for inline expansions (Inspection/Insurance/Financing) and `Dialog` for the full checklist.
- Update `src/components/buyer-document-checklist.tsx`:
  - Accept optional `items` prop; when omitted, fall back to hard-coded list (keeps current callers safe).
  - Add checked-state persistence keyed by `listingId` using `localStorage` (guest) or `buyer_checklist_progress` table (auth users, see §3).
  - Add a "Download PDF" button linking to the guide for the vehicle category.
- Remove the sidebar "Need inspection or insurance" `Collapsible` block from `src/routes/listing.$id.tsx` (~L1007-1031) — its rows migrate into `BuyerResourcesCard`.
- Remove the bottom-of-main `<BuyerDocumentChecklist />` render (~L833). Checklist opens from sidebar dialog instead.

## 3. Database (migration)
Create tables so checklists and progress are data-driven and admin-editable later:

```sql
-- Master library of checklists (one per vehicle category, plus a default)
create table public.buyer_checklists (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                 -- e.g. 'ph-used-car', 'ph-used-motorcycle'
  title text not null,
  category_slug text,                        -- nullable → applies to all
  pdf_url text,                              -- optional downloadable guide
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.buyer_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.buyer_checklists(id) on delete cascade,
  position int not null default 0,
  label text not null,
  hint text
);

-- Per-user checked state per listing (auth users only; guests keep localStorage)
create table public.buyer_checklist_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  item_id uuid not null references public.buyer_checklist_items(id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (user_id, listing_id, item_id)
);
```

GRANTs + RLS:
- `buyer_checklists`, `buyer_checklist_items`: `GRANT SELECT` to `anon, authenticated`; `ALL` to `service_role`. RLS: public read where `is_active`, admin write via `has_role`.
- `buyer_checklist_progress`: `GRANT SELECT, INSERT, UPDATE, DELETE` to `authenticated`; RLS scoped to `auth.uid() = user_id`.

Seed one default `ph-used-car` checklist matching the current 10 items in `buyer-document-checklist.tsx`, plus stub rows for `ph-used-motorcycle`, `ph-used-truck`.

## 4. PDF resources
- New Supabase Storage bucket `buyer-guides` (public read).
- Upload initial guides referenced from `buyer_checklists.pdf_url`: `ph-used-car-checklist.pdf`, `or-cr-inspection-guide.pdf`, `test-drive-guide.pdf`. Actual PDF authoring is out of scope for this turn — the plan wires the schema + a "Download guide" button that hides when `pdf_url` is null so we can drop PDFs in later without code changes.
- Add a `<Link>` list in `BuyerResourcesCard` → "Safety guides (PDF)" that opens a small dialog listing all active guides with `pdf_url`.

## 5. Data loading
In `listing.$id.tsx` loader (or a new server fn `getBuyerChecklist({ categorySlug })`), fetch the matching checklist + items by `category_slug` (fall back to the row with `category_slug is null`). Pass to `BuyerResourcesCard`.

## Out of scope
- Actually authoring PDF content.
- Admin UI to edit checklists (schema is ready; UI can follow).
- Wiring real inspection/insurance/financing partners.

## Files touched
- `src/routes/listing.$id.tsx` (remove old sidebar block + bottom checklist mount, add `BuyerResourcesCard`, fetch checklist)
- `src/components/listing/buyer-resources-card.tsx` (new)
- `src/components/buyer-document-checklist.tsx` (accept items, persist progress, PDF button)
- `src/lib/buyer-checklist.functions.ts` (new server fn)
- New migration: `buyer_checklists`, `buyer_checklist_items`, `buyer_checklist_progress` + seed
- New storage bucket `buyer-guides`
