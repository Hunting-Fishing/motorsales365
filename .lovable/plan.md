# Affiliate categorization — admin UI + consolidation

## Goal
Make the keyword→subcategory mapping editable from the admin, re-categorize already-imported products on demand, and route every affiliate flow through a single matcher.

## 1. Database

New table `shop_category_keywords`:
- `category_id uuid` → `shop_categories(id)` on delete cascade
- `keyword text` (lowercased, trimmed, unique per category)
- standard `id`, `created_at`, `created_by`
- unique `(category_id, keyword)`
- GRANTs: `authenticated` select; `service_role` all
- RLS: public read (active categories), write gated by `can_manage_shop(auth.uid())`

Seed migration inserts every entry from the current hardcoded `CATEGORY_KEYWORDS` map in `src/lib/shop.functions.ts`, resolved by category slug.

## 2. Server: single source of truth

In `src/lib/shop.functions.ts`:
- Delete the hardcoded `CATEGORY_KEYWORDS` constant.
- New helper `loadCategoryKeywordMap()` → reads `shop_categories` + `shop_category_keywords` once, returns `{ cats, keywordsBySlug }`.
- `fuzzyCategoryMatch` stays the same algorithm (subcategory-preferred, scored by keyword length, with name/slug + token fallback) but takes the loaded map.
- `scrapeShopUrl` uses the new loader instead of the const.

New server functions (all gated by `requireDomainRole("shop_manager", ...)`):
- `adminListCategoryKeywords()` → returns categories grouped with their keywords + counts.
- `adminAddCategoryKeyword({ category_id, keyword })`
- `adminDeleteCategoryKeyword({ id })`
- `adminBulkSetCategoryKeywords({ category_id, keywords: string[] })` (replace-all for textarea editor)
- `adminRecategorizeProducts({ scope: "all" | "uncategorized" | "category", categoryId? })` →
  - Loads keyword map, iterates `shop_products` in batches (id, title, brand, description, category_id).
  - Computes new `category_id` from title+brand+description.
  - Updates `shop_products.category_id` only when it actually changes; refreshes primary + parent rows in `shop_product_categories` using the same logic that already lives in `adminUpsertProduct` (extracted into a shared `syncProductCategoryLinks` helper so import + re-run + manual edit all behave identically).
  - Returns `{ scanned, updated, unmatched }`.

## 3. Admin UI

New tab in `src/routes/admin.shop.tsx` → "Category mapping":
- Left column: category tree (parents grouped, subcategories indented). Click a category to edit.
- Right pane:
  - Header with the category name + product count.
  - Textarea ("one keyword per line") backed by `adminBulkSetCategoryKeywords`.
  - Inline list of current keywords with delete buttons.
  - "Add keyword" input + button.
- Toolbar above the tab:
  - "Re-categorize" dropdown: All products / Only uncategorized / Just this category.
  - Runs `adminRecategorizeProducts`, shows toast with `scanned / updated / unmatched`.
  - Confirm dialog before "All products".

## 4. Consolidation

Three callers now share the same code path:
1. `scrapeShopUrl` (new product import).
2. `adminUpsertProduct` (manual save).
3. `adminRecategorizeProducts` (bulk re-run).

All call `syncProductCategoryLinks(productId, categoryId)` for the join-table write, and all match through the DB-backed keyword map. No hardcoded mapping remains in code.

## Technical notes

- Matcher behaviour is unchanged — only the data source moves from const to table, so existing imports keep working without re-run.
- Re-categorization batches in groups of 500 to stay within edge-function memory; uses `supabaseAdmin` inside the handler.
- Keywords stored lowercase; UI normalizes on save.
- Terms/Privacy do not need updates — this is internal tooling, no user-facing policy change.

## Files

- New migration: `shop_category_keywords` table, grants, RLS, seed.
- Edit `src/lib/shop.functions.ts`: remove const, add loader + 5 new server fns + shared `syncProductCategoryLinks`.
- Edit `src/routes/admin.shop.tsx`: add "Category mapping" tab + re-categorize toolbar.
- New `src/components/admin/category-keyword-editor.tsx` (presentational).
