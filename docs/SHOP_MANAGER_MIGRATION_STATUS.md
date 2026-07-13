# Shop Manager Migration Status

Last updated: 2026-07-13

## Where we are

The former separate `shop-manager/` sub-project (Vite + react-router-dom, its
own Supabase project `oudkbrnvommbvtuispla`) has been **dissolved into this
repo**. All 3,244 source files are now under `src/shop-manager/` with imports
rewritten to the `@sm/*` path alias (`@sm/*` → `src/shop-manager/*`).

- Physical folder: `shop-manager/` **deleted**.
- SQL, README, and route audit preserved under `docs/shop-manager-legacy/`.
- Stale Supabase client (`src/shop-manager/integrations/supabase/client.ts`)
  now re-exports the main app's client — any query that runs from the moved
  code will use this project's DB.
- SSO handoff removed (`src/lib/shop-manager-sso.server.ts`,
  `docs/shop-manager-sso.md`, the diagnostic card, and the JWT-mint server
  function are all gone).
- `OpenShopManagerButton` is now a plain in-app `<Link to="/shop">`.

## Build safety

The moved tree references ~60 npm packages that root doesn't yet have
(Sentry, MUI, Mapbox, react-router-dom, semantic-ui, chart.js, mapbox, etc.).
To keep the build green while porting is incremental, `src/shop-manager/**`
is **excluded from `tsconfig.json`**. Nothing routes into it yet, so
Vite/Rollup does not bundle it either.

To port a page, do this per page:

1. Copy or import the components/hooks/lib you need from `src/shop-manager/**`.
2. Install any missing runtime deps in root (e.g. `bun add react-helmet-async i18next`).
3. Create a TanStack route file under `src/routes/_authenticated/shop.<slug>.tsx`.
4. Replace `react-router-dom` symbols with `@tanstack/react-router` equivalents
   (`useParams`, `useNavigate`, `<Link>`, `<Navigate>`).
5. Replace `<Helmet>` with route `head()`.
6. Point queries at `smSupabase = supabase.schema("shop_manager")` (helper to
   be added under `src/lib/shop-manager/db.ts` when the first schema query lands).
7. Remove that file from the exclude list once it typechecks.

## Outstanding work

### Database
- Apply `06_policies_01.sql`, `06_policies_02.sql`, `06_policies_03.sql` from
  `/mnt/documents/curated/` — 138 tables in `shop_manager` still have RLS
  enabled with **zero policies** (locked to `service_role`).
- Add a first-visit trigger to provision `shop_manager.profiles` for the
  authed user from their `businesses` row.
- Regenerate `src/integrations/supabase/types.ts` with the `shop_manager`
  schema included.

### Routing (Phase 2 — incremental)
- 198 pages under `src/shop-manager/pages/*.tsx` — one native TanStack route
  per page, gated under `_authenticated/shop.*`.
- 247 `<Route>` declarations in `src/shop-manager/App.tsx` — the canonical
  reference for URL structure while porting.

Priority order:
1. Dashboard
2. Work Orders (list + `$id` detail + create)
3. Customers (list + detail)
4. Vehicles (detail with service history)
5. Inventory (list + item detail + purchase orders)
6. Invoices + Quotes
7. Calendar
8. Everything else

### Dependencies
When porting a page that needs any of these, add to root `package.json`:
`react-helmet-async`, `i18next`, `react-i18next`, `react-router-dom` (only
temporarily as a compat shim), `@mui/material`, `chart.js`, `react-chartjs-2`,
`recharts`, `mapbox-gl`, `jspdf`, `jspdf-autotable`, `xlsx`, `dompurify`,
`react-dropzone`, `react-hotkeys-hook`, `react-signature-canvas`, `zustand`,
`recoil`, `dnd-kit/modifiers`, `@formkit/auto-animate`, `framer-motion`,
`@sentry/react`, `file-saver`, `html2canvas`, `uuid`, `web-vitals`,
`@fontsource/plus-jakarta-sans`, `@turf/turf`, and a handful more.
See `docs/shop-manager-legacy/route-audit.md` for the full inventory.

### Deferred
- Removing MUI in favor of shadcn once native ports land.
- Removing `react-router-dom` compat entirely once codemod on ported pages
  is complete.
- Merging shop-manager's `NotificationsContext` with the app's existing
  `NotificationsListener`.
- Merging shop-manager's i18n dictionary if/when the main app grows a
  translation surface.
- Auditing `shop_manager.*` tables against existing app tables and dropping
  duplicates (customers vs `profiles`, etc.).

## Phase 2 progress — 2026-07-13

- ✅ Shop-scoped RLS policies applied to the Phase 2 core tables:
  `profiles`, `shops`, `user_roles`, `customers`, `vehicles`, `work_orders`,
  `invoices`, `invoice_items`, `quotes`, `quote_items`, `appointments`,
  `inventory_items`. All other `shop_manager.*` tables remain locked to
  `service_role` and receive policies as their page ports.
- ✅ Auto-provisioning function `shop_manager.ensure_profile_for(uuid)` seeds
  a shop_manager profile from the user's first `public.businesses` row so
  `get_current_user_shop_id()` resolves without a manual setup step.
- ✅ Schema-scoped client helper: `src/lib/shop-manager/db.ts` exports
  `smSupabase` — the only supported way to query `shop_manager.*` from
  native TanStack routes.
- ✅ First native routes ported:
  - `/shop/work-orders` — list (`shop.work-orders.tsx`).
  - `/shop/work-orders/$id` — read-only detail (`shop.work-orders.$id.tsx`)
    with customer, vehicle, complaint/scope, schedule, and totals blocks.
  - `/shop/customers` — searchable customer directory
    (`shop.customers.tsx`).
  All three route through `smSupabase` against `shop_manager.*`.

### Next up
1. ✅ `/shop/work-orders/new` — native create form.
2. `/shop/work-orders/$id/edit` — inline status + notes editor.
3. ✅ `/shop/customers/$id` — detail with vehicles + work-order history.
4. ✅ `/shop/vehicles/$id` — vehicle detail with full service history.
5. `/shop/inventory` — inventory list + item detail.
6. Add policies for `work_order_line_items`, `work_order_notes`,
   `payments`, `payment_allocations` when detail views port.
