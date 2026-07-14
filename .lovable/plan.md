# Promote & polish the Features hub

## 1. Surface `/features` in strategic places

**Footer** (`src/components/site-footer.tsx`)
- Add `{ to: "/features", label: "All features" }` to the "Sell" (or new "Product") column, placed above "Pricing & plans" so the pair reads Features → Pricing.

**Header** (`src/components/site-header.tsx`)
- Desktop nav: add a `Features` link next to `Pricing` (both in the primary nav row and any dropdowns that already contain Pricing).
- Mobile sheet: add a `Features` `SheetClose`+`Link` block directly above the existing `/pricing` block (line ~804).

**Homepage** (`src/routes/index.tsx`)
- Add a slim "Explore every feature →" CTA strip beneath the hero (or in the existing highlights section) linking to `/features`.

**Pricing page** (`src/routes/pricing.tsx`)
- Add a top-of-page callout: "See the full feature list →" linking to `/features`. Reciprocal link from `/features` → `/pricing` already exists.

**Franchise & Shop Manager landing pages** (`/franchise`, `/shop-manager` if present)
- Add a "Compare all features" secondary button in the hero CTA cluster.

**Support page** (`src/routes/support.tsx`)
- Add a "Not sure what a feature does? Browse all features" card at the top of the help topics grid.

## 2. UI/UX upgrade of `/features`

Refresh `src/routes/features.tsx` and its subcomponents for a more premium, modern feel:

**Hero**
- Replace flat header with a gradient/aurora hero: `bg-gradient-to-br from-primary/15 via-background to-secondary/40` with a subtle grid or radial glow.
- Add animated counters (live/roadmap/modules) using framer-motion; keep the sparkle badge.
- Add two primary CTAs in the hero: "Jump to comparison" and "Start free" instead of only the outline button below.

**Sticky sub-nav**
- Convert the module quick-nav chips into a sticky bar (top-16 under header) that highlights the active module on scroll (IntersectionObserver). Include a persistent search input inside the sticky bar so users can filter without scrolling back up.

**Module sections** (`src/components/features/module-section.tsx`)
- Replace plain accordion list with a card grid at md+ (2 columns of expandable cards) that collapses to a single stacked accordion on mobile.
- Each card gets: colored module accent bar (per module), icon in gradient tile, status badge in top-right, hover lift (`hover:-translate-y-0.5 hover:shadow-lg`).
- Add subtle border-gradient on hover for "live" features; muted styling for "roadmap".

**Feature row** (`src/components/features/feature-row.tsx`)
- Restructure expanded content into three columns at lg+: "How it works", "Why it's useful", "Vs competition" — each with its own icon header (Cog / Sparkles / Trophy).
- Add a "Open live page →" prominent button and, when screenshot asset exists, show it in a rounded frame with border + drop-shadow (lazy-loaded).
- Add copy-link button per feature (anchors `#feature-id`) for shareable deep links.

**Filters & search**
- Add module chips as toggleable filters (multi-select) beside the search input.
- Add status filter (All / Live / Beta / New / Roadmap) as segmented control.
- Persist filter+search in URL (`?q=&module=&status=`) so links are shareable.
- Show "No matches" empty state with a reset button when filters return zero.

**Comparison tables** (`src/components/features/comparison-table.tsx`)
- Pin the first column and the 365 column on horizontal scroll (`sticky left-0`).
- Highlight the 365 column with a subtle primary tint background and a "You are here" ribbon.
- Convert Check/Minus/X icons into pill chips with color+label for scannability at a glance.
- Add category row headers to group capabilities (Marketplace, Ops, Payments, etc.) when the matrix supports it.

**Roadmap section**
- Turn the roadmap cards into a horizontally scrollable "coming soon" rail on mobile with snap points; grid at md+. Add ETA badges if available in data.

**Global polish**
- Framer-motion `whileInView` fade-in for module sections (staggered).
- Add breadcrumb ("Home / Features") at top for orientation.
- Add JSON-LD `ItemList` structured data listing all live features (SEO win).
- Update `head()` `og:image` to a generated hero cover for `/features`.

## Technical notes

- New files: none required, but may split filter bar into `src/components/features/filter-bar.tsx` and sticky nav into `src/components/features/module-nav.tsx` for clarity.
- Reuse `framer-motion` (already used in this codebase for motion) and `useSearchParams`/TanStack `useSearch` for URL-synced filters.
- Keep all colors as semantic tokens (`primary`, `secondary`, `muted`, `emerald-500`, `amber-500` already in use).
- Ensure the sticky sub-nav has `md:hidden` fallback that collapses to a `<select>` on mobile to save vertical space.
- No backend changes; catalog remains in `src/data/features-catalog.ts`. Optional: add `eta?: string` field to roadmap entries.
