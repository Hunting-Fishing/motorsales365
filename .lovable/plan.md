## Goal
Group the Share Kit templates into collapsible categories and shrink the card size so many templates fit on screen.

## Categories (derived from existing templates + metadata)
Each built-in template gets a `category` tag in `src/lib/share-kit/templates.ts`:
- **Social Posts** — `square-social`, `banner-1200`
- **Stories & Reels** — `story-reel`
- **Print & Wearables** — `rear-shirt`, `arm-band`
- **Vehicles For Sale** — `buy-cars`
- **Parts & Accessories** — `parts-shop`
- **Services (Tow / Roadside)** — `tow-247`
- **Custom Uploads** — all `custom:*` rows (admin-uploaded)

Custom templates get an optional `category` column later if needed; for now they all land in "Custom Uploads".

## UI changes in `src/routes/dashboard.share-kit.tsx`
1. Replace the single flat grid with a list of category sections rendered via the existing shadcn `Collapsible` component.
2. Each section header shows: category name, count badge, chevron. Sections default **open** for the first one and **collapsed** for the rest (remember open/closed state in `localStorage` so it sticks per user).
3. Shrink card cell: change grid track from `minmax(140px,1fr)` → `minmax(96px,1fr)`, and per-cell `max-w-[180px]` → `max-w-[120px]`. Tighten gaps (`gap-3` → `gap-2`) and admin action buttons become compact icon-only buttons under each card.
4. Archived/history section keeps the same compact grid but stays in its own collapsible.

## Technical details
- Add `category?: string` to `ShareTemplate` in `src/lib/share-kit/types.ts`.
- Tag each entry in `TEMPLATES` (templates.ts) with its category string.
- In the route, `useMemo` to group `allTemplates` by category, preserving a fixed display order (`CATEGORY_ORDER` constant).
- Use `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` from `@/components/ui/collapsible`.
- Persist open state via `useState` seeded from `localStorage["share-kit-open-cats"]`.
- No backend, RLS, or data-model changes.

## Out of scope
- Drag-and-drop reordering.
- Per-user pinning/favorites.
- Adding a `category` column to the custom-templates table (defer until needed).