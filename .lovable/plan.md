## Goal

Turn `/features` into the definitive "everything 365 does" page — inspired by garage360.io/auto-repair-software-comparison — showing every module (Marketplace, Shop Manager, Parts Network, Franchise, Partner Program, Clubs, Learning, Dispatch/Tow, QR/Referrals, Document Check, etc.), an Upcoming Roadmap, and side-by-side comparisons vs. shop-software rivals AND PH/SEA marketplace rivals.

## Structure of `/features`

```text
Hero  ── "One app. Every side of the motor business."
        CTA: Sign up · Book demo · Jump to comparison

Sticky tab bar (anchors)
  ▸ Marketplace   ▸ Shop Manager   ▸ Parts Network
  ▸ Franchise     ▸ Partner Program  ▸ Clubs
  ▸ Learning      ▸ Dispatch & Tow   ▸ QR / Referrals
  ▸ Trust & Safety  ▸ Roadmap        ▸ vs Competitors

Per module section
  ├─ Module intro (1 sentence, icon, count of sub-features)
  └─ Feature rows (accordion)
       Row collapsed:  [icon] Feature name · one-line pitch · "New / Beta / Live / Roadmap" badge · ▾
       Row expanded:
         ├─ Screenshot (auto-captured from live preview route)
         ├─ How it works (2–3 sentences)
         ├─ Why it's useful (bullet list, user benefit)
         ├─ How we match / beat competition (named callouts)
         └─ Deep link → the actual route in-app

Upcoming Roadmap
  Same accordion pattern, badge = "Roadmap"
  Uses existing roadmap assets already in repo

Comparison section (two tables, tabbed)
  Tab 1 — Shop software:   365 vs Shopmonkey · Tekmetric · Mitchell1 · AutoLeap · Garage360
  Tab 2 — PH/SEA market:   365 vs Carousell · OLX · AutoDeal · Philkotse · Facebook Marketplace
  Rows = capability, cells = ✓ / ✗ / partial with hover tooltip

Footer CTA — Sign up · Contact sales · View pricing
```

## Implementation

### 1. Feature inventory (single source of truth)
Create `src/data/features-catalog.ts` — one array grouped by module. Each entry:
```ts
{ id, module, name, pitch, howItWorks, whyUseful[], vsCompetition[], route, status: "live"|"beta"|"new"|"roadmap", screenshot }
```
Seed from the actual route list (already inventoried) — ~120 features across 11 modules + ~15 roadmap items.

### 2. Screenshot pipeline
Playwright script `scripts/capture-feature-screenshots.mjs`:
- Reads `features-catalog.ts`
- Signs into the preview using injected Supabase session (available for authed routes)
- Visits each `route`, waits for network idle, screenshots viewport at 1440×900
- Saves PNGs to `/tmp`, then runs `lovable-assets create` per file → writes `.asset.json` pointers under `src/assets/features/<id>.png.asset.json`
- Catalog references `import shot from "@/assets/features/<id>.png.asset.json"`
- Roadmap items reuse existing `roadmap-*.png.asset.json` files in repo
- Script is re-runnable to refresh shots later

### 3. Routes / components
```text
src/routes/features.tsx                    # main hub (rewrites the missing route)
src/components/features/
  ├─ features-hero.tsx
  ├─ module-section.tsx        # renders a module + its accordion rows
  ├─ feature-row.tsx           # collapsible row (uses shadcn Accordion)
  ├─ roadmap-section.tsx
  ├─ comparison-tabs.tsx       # tabs wrapper
  ├─ comparison-table.tsx      # generic ✓/✗/partial matrix
  └─ status-badge.tsx
src/data/features-catalog.ts
src/data/competitors-shop-software.ts      # rows + which competitor supports which
src/data/competitors-marketplace.ts
```

### 4. SEO / head
`head()` on `/features` — title "Every Feature — 365 Motor Sales", targeted meta description, og:title/description, og:image (hero screenshot). Add JSON-LD `ItemList` of top features for rich results.

### 5. Nav wiring
- Footer: add "Features" link
- Top nav (if not present): add "Features" between Home and Pricing
- Cross-link from `/pricing`, `/shop-manager`, `/about`

### 6. Competitor matrix content
Rows include: Marketplace listings, Shop management, VIN-based parts catalog, Live network stock, Franchise program, Partner/affiliate program, Clubs, Learning hub, Dispatch & Tow, QR referrals, LTO/Doc verification, Bookings, Invoicing, Inventory, Loyalty, Automation, PH-local payments, Multi-language, Mobile-first, etc. Each competitor cell: ✓ / partial / ✗ with a short factual tooltip. Values sourced from each competitor's public marketing pages (documented in file comments).

## Out of scope (this pass)
- Admin CMS UI for editing the catalog (data file is fine for now)
- Localization of comparison copy
- A/B tests, analytics events beyond a single `features_row_expanded` GA event

## Deliverables
1. `/features` page fully populated from `features-catalog.ts`
2. Playwright capture script + generated screenshot assets
3. Two competitor comparison tables with tooltips
4. Roadmap section with existing roadmap assets
5. Nav + footer links, SEO metadata, JSON-LD
