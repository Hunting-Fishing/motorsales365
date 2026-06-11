## Problem

On `/browse/$category`, the Filters panel currently renders as a tall, full-width card above the listings on anything narrower than `lg` (1024px). At the user's 1015px viewport this means a ~1000px-tall stack of inputs (keyword, vehicle picker, ~15 selects/ranges/checkboxes from `CategoryFilters`, location picker, price range, sort, two buttons) shows before a single listing is visible. Even at desktop the 280px sticky sidebar is dense and overwhelming.

## Goal

Keep every filter and every saved-search field intact. Just present them in a way that doesn't dominate the page.

## Changes (UI only — no logic, no schema changes)

### 1. Lower the breakpoint and slim the sidebar
- `src/routes/browse.$category.tsx`
  - Change the grid from `lg:grid-cols-[280px_1fr]` to `md:grid-cols-[260px_1fr]` so the sidebar appears side-by-side starting at 768px instead of 1024px.
  - On screens below `md`, hide the `<aside>` entirely and show a compact "Filters" trigger button (using existing shadcn `Sheet`) at the top of the results column. Active-filter count badge on the trigger.
  - The Sheet renders the exact same `<form>` so no fields are lost.

### 2. Group filters into collapsible sections
Use the existing shadcn `Accordion` component (already in `src/components/ui/`). Inside the form, restructure into accordion sections that are collapsed by default except "Keyword & price":

```text
[ Keyword + Price + Sort ]   ← always visible (the 80% case)
▸ Vehicle (year/make/model/engine)   — cars & motorcycles only
▸ Location (region/province/city)
▸ Category details                    — wraps <CategoryFilters />
▸ Documents & extras                  — booleans only
[ Apply filters ] [ Save search ]
```

This drops first-paint height from ~1000px to ~280px without removing anything.

### 3. Compact `CategoryFilters`
- `src/components/browse/category-filters.tsx`
  - Split each category block into two arrays internally: "details" (selects/ranges) and "extras" (the booleans / docs).
  - Move the bool checklist into a separate sub-section so the new "Documents & extras" accordion item can host it.
  - Reduce vertical rhythm: `space-y-3` → `space-y-2`, drop the outer card border (the accordion provides framing), shrink labels to `text-[11px]`.
  - At `sm+`, lay selects out in a 2-column grid (`grid grid-cols-2 gap-2`) so e.g. cars' 9 selects fit in ~5 rows instead of 9.

### 4. Results column
- Above the results, add a one-line "active filters" summary as removable chips (keyword, location, price, vehicle, any non-empty category filter). Clicking the × on a chip clears that field and re-applies. No new deps — uses existing `Badge` + lucide `X`.

## What is NOT changing
- No filter is removed.
- URL/search-param schema (`searchSchema`), the loader, `getBrowseListings`, save-search payload, and analytics all stay byte-identical.
- No new npm packages required — `Sheet`, `Accordion`, `Badge` are already in `src/components/ui/`.

## Files touched
1. `src/routes/browse.$category.tsx` — restructure the aside into accordion + mobile Sheet; add active-filter chips above results; lower breakpoint.
2. `src/components/browse/category-filters.tsx` — split details vs extras, 2-col grid at `sm+`, tighter spacing, no outer card.

## Verification
- Load `/browse/car` at 1015px: filters render as a compact 260px sidebar (md breakpoint), listings visible immediately.
- Load at 600px: only a "Filters (N)" button shows above listings; tapping it opens the bottom Sheet with the full form.
- Apply / Save search still navigate with the same query params.
- Switch to `/browse/motorcycle`, `/browse/equipment`, `/browse/boat`, `/browse/airplane` — category-specific accordion section swaps correctly.
