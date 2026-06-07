## Goal

Replace the abstract blue SVG wireframes in the `/advertise` Placement Catalog with realistic, page-accurate mini-snapshots of each target surface (Marketplace home, Category, Listing, Browse, Rides, Shop, Learn, Businesses, Newsletter, Custom) with a clearly marked **"Your advertisement here"** placeholder occupying the exact slot the ad would fill.

## What changes

Only the visual preview component used inside each catalog card. No data model, no form, no admin, no DB changes. Pure presentation work in `src/components/advertise/`.

## Approach

Rewrite `src/components/advertise/placement-preview.tsx` from tiny 160×80 abstract SVGs into per-section **mock page snapshots** built with Tailwind + real theme tokens, sized to fit the existing card slot (roughly `aspect-[16/10]`, full card width).

Each preview will render:
- A faux browser chrome bar (3 traffic dots + URL pill showing the relevant path, e.g. `365motorsales.com/learn`)
- A faux site header strip (logo block + nav pills) using `bg-card` / `text-muted-foreground`
- Page-specific content silhouettes that match the real route's layout (hero, category grid, listing detail two-column, rides feed cards, shop product grid, learn course rail, newsletter email frame, business directory list, etc.) — drawn with neutral `bg-muted` blocks so they read as "a page"
- An **ad slot overlay** placed exactly where that placement appears, styled with:
  - Dashed `border-primary` border
  - `bg-primary/10` fill
  - Centered label: **"Your advertisement here"** + a small `text-[10px]` sub-label naming the format (e.g. "Banner · 970×250", "Sidebar tile · 300×600", "Carousel slide", "Newsletter slot", "Academy card")
  - Subtle pulse animation (`animate-pulse` on the border) so the eye lands on it

Per-section ad-slot positions:
- `marketplace_home` — full-width banner above the featured carousel
- `marketplace_category` — top banner above the category grid
- `marketplace_listing` — right-column sidebar tile next to the listing gallery
- `browse` — top banner above the search results list
- `rides` — top banner above the rides feed cards
- `export` — top banner above the export inquiry table
- `shop` — top banner + a secondary sidebar tile (show both, with the banner as the primary highlight)
- `learn` — sponsored Academy card inside the course rail (highlighted card among siblings)
- `businesses` — featured row at the top of the directory list
- `newsletter` — full-width slot inside an email envelope frame (keep the email-shaped outer card)
- `custom` — generic page with a centered dashed slot and "Custom partnership" label

## Files touched

- `src/components/advertise/placement-preview.tsx` — full rewrite. Same exported API (`<PlacementPreview section={...} />`) so `advertise.tsx` keeps working without changes.
- `src/routes/advertise.tsx` — only if the current card markup forces a fixed small height on the preview slot; in that case relax to `aspect-[16/10]` and ensure `overflow-hidden rounded-md`. No other changes.

## Out of scope

- No changes to the form, sections data, formats, tiers, admin, dashboard, timeline, or DB.
- No real screenshots of the live site — these are styled mock snapshots using theme tokens, so they stay on-brand and don't go stale when pages change.
- No new dependencies.

## Open question

Do you want the ad-slot label to stay generic **"Your advertisement here"** on every card, or should it also show the **tier badge** (Starter / Growth / Premium) inside the slot? Default if unanswered: generic label only, tier badge stays on the card header where it already is.
