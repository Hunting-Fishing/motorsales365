## Shop Manager migration — status snapshot

### Done (native, live in this app)
- Portal shell `/shop`
- Work Orders: list, detail `$id`, create `new`
- Customers: list, detail `$id`, create `new`
- Vehicles: detail `$id` with service history
- Core RLS on 12 tables (profiles, shops, user_roles, customers, vehicles, work_orders, invoices, invoice_items, quotes, quote_items, appointments, inventory_items)
- `shop_manager.ensure_profile_for()` auto-provisioning
- `smSupabase` schema-scoped client
- Legacy sub-project dissolved; SSO removed; `OpenShopManagerButton` points to `/shop`

### Remaining to be "fully working"

**Priority routes to port (~15 core pages of 198 legacy pages)**
1. `/shop` dashboard (KPIs, recent WOs, alerts)
2. `/shop/work-orders/$id/edit` (status + notes + line items)
3. `/shop/work-orders/$id` line items, notes, payments sub-blocks
4. `/shop/inventory` list + `$id` detail + adjustments
5. `/shop/inventory/purchase-orders` list + detail + receive
6. `/shop/invoices` list + `$id` detail + PDF + payment
7. `/shop/quotes` list + `$id` detail + convert-to-WO
8. `/shop/appointments` calendar view
9. `/shop/vehicles` list (detail already done)
10. `/shop/customers/$id/edit`
11. `/shop/settings` (shop profile, tax, roles, staff)
12. `/shop/reports` (sales, technician, inventory)

Remaining ~180 legacy pages are secondary (marketing pages, duplicate variants, admin utilities) and can port on demand.

**Database**
- Apply the three remaining policy batches (`06_policies_01/02/03.sql`) so the other 126 `shop_manager` tables aren't locked to `service_role`.
- Add RLS for `work_order_line_items`, `work_order_notes`, `payments`, `payment_allocations`, `purchase_orders`, `purchase_order_items`, `inventory_movements`, `appointment_participants` (needed as detail views port).
- Regenerate `src/integrations/supabase/types.ts` to include `shop_manager` schema (so we get typed queries).
- Audit `shop_manager.customers` vs `public.profiles` — decide keep-both or unify (deferred).

**Dependencies / cleanup**
- Legacy tree `src/shop-manager/**` still excluded from tsconfig; keep excluded until each page is ported, then drop from exclude list.
- Remove `react-router-dom` compat and MUI once ports are complete.
- Merge legacy `NotificationsContext` into app `NotificationsListener`.

### Rough completion estimate
- Core operational surface (the 12 priority routes above) — **~30% done** (5/12 route groups shipped).
- Full 198-page parity — **~5% done**, but most of the remaining 180 are non-essential.
- Database policy coverage — **~9% done** (12/138 tables have real policies).

### Suggested next batch (one turn)
Port `/shop` dashboard + `/shop/inventory` list + `/shop/invoices` list, and apply RLS to `work_order_line_items`, `work_order_notes`, `payments`, `inventory_movements`, `purchase_orders`.

Say "proceed" to start that batch, or name a different area to prioritize (invoices, inventory, calendar, settings).