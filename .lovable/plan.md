## Goal

Dissolve the `shop-manager/` sub-project. Move every file into its natural home inside this app's existing folder structure, rewire imports, share the main auth session, and point all queries at this project's `shop_manager` Supabase schema. Delete `shop-manager/` when done.

## Why this over the bridge-mount approach

Bridge mount (MemoryRouter under a splat route) is fast but leaves two routers, two auth contexts, and 198 pages using a foreign `react-router-dom` API forever. Merging costs more this pass but gives you a single-stack app: one router, one auth, one Supabase client, one design system trajectory. It also lets us delete duplication (both apps have their own `Layout`, `AuthContext`, `supabase/client`, i18n, notifications).

## Target folder mapping

| From `shop-manager/src/…` | To `src/…` |
|---|---|
| `pages/*.tsx` (198 files) | `routes/shop.<slug>.tsx` — one TanStack route per page |
| `components/**` | `components/shop-manager/**` (namespaced to avoid collisions with existing `src/components/`) |
| `hooks/**` | `hooks/shop-manager/**` |
| `lib/services/**`, `lib/**` | `lib/shop-manager/**` |
| `utils/**` | `lib/shop-manager/utils/**` |
| `types/**` | `types/shop-manager/**` |
| `context/**`, `contexts/**` | `lib/shop-manager/context/**` (merged; there are both spellings today) |
| `i18n/**` | `lib/shop-manager/i18n/**` |
| `constants/**`, `config/**`, `data/**`, `domain/**`, `schemas/**` | `lib/shop-manager/<same>/**` |
| `integrations/supabase/**` | **discarded** — replaced by re-export from main client |
| `styles/mobile.css`, `App.css` | merged into `src/styles.css` (curated, not verbatim) |
| `main.tsx`, `App.tsx`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `package.json`, `postcss.config.js`, `tailwind.config.ts`, `eslint.config.js` | **deleted** — root config wins |
| `supabase/functions/**`, `supabase/config.toml` | **deleted** — external project artifacts |
| `sql/*.sql` | copied into `/mnt/documents/curated/` alongside existing chunks for later migration |
| `public/manifest.json`, `public/offline.html`, `public/robots.txt`, `public/placeholder.svg` | **discarded** — root has its own |

New TS path alias for the sub-app's own `@/…` imports:
- `@sm/*` → `src/{components,hooks,lib,types}/shop-manager/*`
- Codemod `shop-manager/src/**` files: rewrite `@/components/...` → `@sm/components/...`, `@/hooks/...` → `@sm/hooks/...`, etc. (only for files being moved).
- `@/integrations/supabase/client` in moved files → keep as-is; it now resolves to the main client (see next section).

## Routing conversion (react-router-dom → TanStack file routes)

`shop-manager/src/App.tsx` declares 247 `<Route>`s. Convert to file routes under `src/routes/shop.*.tsx`:

- `/` (in shop-manager) → `src/routes/shop.index.tsx`
- `/work-orders` → `src/routes/shop.work-orders.index.tsx`
- `/work-orders/:id` → `src/routes/shop.work-orders.$id.tsx`
- `/customers`, `/customers/:id`, `/vehicles/:id`, `/invoices`, `/inventory`, etc. — same pattern.
- Nested layout pages (Layout wrapper) → `src/routes/shop.tsx` as pathless-ish parent renders `<ShopLayout><Outlet /></ShopLayout>` and every child lives under it.
- All shop-manager pages sit under `src/routes/_authenticated/` if they require sign-in (they do), so URL becomes `/shop/work-orders/$id` gated by the existing managed auth layout. Final URL prefix: **`/shop/*`** (matches marketing landing at `/shop-manager` which will link into `/shop`).

Inside each page component:
- `useParams` from `react-router-dom` → `Route.useParams()` (or `useParams({ from: '/…' })`).
- `useNavigate` from `react-router-dom` → `useNavigate` from `@tanstack/react-router`.
- `<Link to="...">` → typed `<Link to="/shop/…" params={…}>`.
- `<Helmet>` → route `head()`.

This is a mechanical codemod, one pass per import symbol. Not every one of the 198 files needs hand-editing; a scripted rewrite handles ~90%.

## Supabase — repoint + schema

- `shop-manager/src/integrations/supabase/client.ts` (which currently hard-codes `oudkbrnvommbvtuispla`) is **deleted**. Any moved file that does `import { supabase } from "@/integrations/supabase/client"` now resolves to the main app's client automatically.
- Create `src/lib/shop-manager/db.ts` exporting `smSupabase = supabase.schema("shop_manager")`. Codemod every `.from("<known_shop_table>")` in moved files to use `smSupabase` (allow-list of 138 tables generated from the migration).
- Discard `shop-manager/src/integrations/supabase/types.ts` (stale, from the old project). Regenerate main app's `types.ts` with `shop_manager` schema included via Supabase types tool after the codemod so all moved code typechecks.

## Auth — one session

- Delete `shop-manager/src/context/AuthContext.tsx`.
- Create `src/lib/shop-manager/auth-adapter.ts` that re-exports the main app's `useAuth` under the shape shop-manager pages expect (`user`, `session`, `loading`, `signOut`).
- Codemod imports: `from "@/context/AuthContext"` → `from "@sm/lib/auth-adapter"`.
- Delete `src/lib/shop-manager-sso.server.ts`, `docs/shop-manager-sso.md`, receiver route files, and the `OpenShopManagerButton` server-fn call; replace the button with a plain `<Link to="/shop">`.
- Remove Cloud secrets `SHOP_MANAGER_SSO_SECRET`, partner-Supabase URL/key (list them for you to clear).

## Providers wiring

Shop-manager needs Helmet, i18n, Notifications, Company, CustomerData, Impersonation, InventoryView, WeldingSettings, Language contexts around its pages. Wrap them once in a `src/routes/_authenticated/shop.tsx` layout route so every `/shop/*` page gets them without touching individual pages. QueryClient is already provided at the root — do not add a second one.

## Styling

- Merge `shop-manager` tailwind theme tokens into root `src/styles.css`'s `@theme` block (only tokens not already defined). Keep the "modern-card" utility classes shop-manager uses.
- Keep `@fontsource/plus-jakarta-sans` and MUI as-is for now — Phase 2 will strip MUI when native ports happen.
- `src/styles/mobile.css` content folded into `src/styles.css`.

## Dependencies

Diff `shop-manager/package.json` against root, add missing runtime deps to root: `react-router-dom` (temporary — some deeply nested pages may still import it during transition; remove once codemod is complete), MUI, i18next + react-i18next, react-helmet-async, @dnd-kit/*, @formkit/auto-animate, sentry, plus any charting/PDF libs shop-manager uses. Delete `shop-manager/package.json` after.

## RLS policies

Apply the outstanding `06_policies_01/02/03.sql` chunks from `/mnt/documents/curated/` via `supabase--migration`. Add a first-visit trigger that provisions `shop_manager.profiles` for the authed user from their `businesses` row so scoped policies resolve.

## Execution order (this build pass)

1. **Move & rename** — bulk `mv shop-manager/src/<X>` → `src/**/shop-manager/*`. No code edits yet.
2. **Alias + codemod** — add `@sm/*` in `tsconfig.json` + `vite.config.ts`; run scripted rewrite of moved-file imports (`@/components/*` → `@sm/components/*`, etc.).
3. **Repoint Supabase + auth adapter** — delete stale integrations, add `smSupabase` wrapper, codemod `.from(...)` on known shop tables, codemod `AuthContext` imports.
4. **Router conversion** — generate 198 route files under `src/routes/_authenticated/shop.*.tsx` that each re-export the moved page + provide a small `Route = createFileRoute(...)` shell. Codemod `react-router-dom` symbols to TanStack equivalents.
5. **Layout** — create `src/routes/_authenticated/shop.tsx` with providers + `<Outlet />`.
6. **Chrome** — replace `OpenShopManagerButton` with `<Link to="/shop">`. Delete SSO server-fn + receiver + docs.
7. **Migrations** — apply 06_policies_01/02/03 + `shop_manager.profiles` bridge trigger.
8. **Regenerate Supabase types** with `shop_manager` schema included.
9. **Delete `shop-manager/` folder entirely.**
10. **Smoke test** `/shop` → dashboard, `/shop/work-orders`, `/shop/work-orders/$id`, one create + list write path.

**Rough blast radius:** ~350 file moves, ~200 route files created, ~800 codemod hits, 3 SQL migrations, root `package.json` gains ~15 deps, `shop-manager/` deleted.

## Deferred to Phase 2 (explicit, so you know what's not free)

- Removing MUI, react-router-dom compat imports, and dedup-ing shop-manager's `<Layout>` against `SiteLayout`.
- Native shadcn ports of the top-10 pages for SSR/SEO of any public-facing shop pages (none currently public).
- Merging shop-manager's Notifications context with the app's existing `NotificationsListener` / `user_notifications` pipeline.
- Merging shop-manager's i18n dictionary with any app-side translations you eventually add.
- Deleting `shop_manager` tables whose functionality is already covered by existing app tables (audit list to be produced during Phase 2).

## Open questions I'll assume unless you say otherwise

- **URL prefix**: `/shop/*` (short, matches the marketing landing `/shop-manager`, which will redirect to `/shop`).
- **All shop-manager pages require sign-in** — placed under `_authenticated/`.
- **No public shop-manager pages** need SSR/SEO in Phase 1.
- **`react-router-dom` stays installed** during transition; removed in Phase 2 once codemod is verified.
- **MUI stays** for Phase 1.