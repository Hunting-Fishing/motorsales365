# Plan: Business‑kind‑aware dashboards (Tow/Recovery first)

Right now every signed‑in account sees the same `/dashboard` (My listings, Rides, Saved, etc.) regardless of whether they signed up as a personal seller, a parts shop, or a tow company. We already have isolated pieces — `dashboard/tow`, `dashboard/dispatch`, `dashboard/staff`, `dashboard/team`, `seller-staff.functions` — but they're not wired into a cohesive business workspace and the sidebar/landing doesn't change per business kind.

This plan introduces a **per‑business "Business workspace"** that adapts its navigation, landing tiles, and modules to the business's `business_kind`, and ships the **Tow / Recovery** workspace end‑to‑end as the first vertical. Other kinds (repair shop, parts supplier, dealership, etc.) become straightforward follow‑ons reusing the same framework.

## Goals

- Tow companies land in a dashboard built for dispatching, not classified listings.
- Each business kind gets a tailored sidebar + landing, driven by config (not 23 separate dashboards).
- Owners can manage employees, roles, duties, and assets (trucks/equipment) per business.
- Personal sellers are unaffected.

---

## Phase 1 — Business workspace shell (foundation, kind‑agnostic)

1. **New route tree** under `/dashboard/business/$businessId/...`:
   - `dashboard.business.$businessId.tsx` — layout: loads business, asserts caller is owner/manager/staff, renders kind‑aware sidebar + `<Outlet/>`.
   - `dashboard.business.$businessId.index.tsx` — landing with kind‑specific tiles.
2. **Module registry** in `src/lib/business-workspace/modules.ts`:
   - Map each `business_kind` → ordered list of module ids (`overview`, `listings`, `dispatch`, `fleet`, `staff`, `inventory`, `bookings`, `analytics`, `billing`, `settings`).
   - Each module declares: label, icon, route path, allowed roles.
3. **"My businesses" entry point**: `dashboard/businesses` already lists them — add a "Open workspace" button that deep‑links to `/dashboard/business/<id>`. Top header's business switcher (the "365 Tow Company / 365 Towing" text) becomes a dropdown that routes here.
4. **Personal dashboard untouched** — existing `/dashboard` stays for personal selling activity.

## Phase 2 — Roles, staff, duties (shared by all kinds)

1. Reuse `organizations` + `seller-staff.functions` (already has owner/manager roles, seats).
2. Migration: add `business_staff` link table (`business_id`, `user_id`, `role`, `title`, `duties text[]`, `active`, timestamps) with RLS + GRANTs; helper `has_business_role(_user, _business, _role)` SECURITY DEFINER.
3. Roles enum: `owner`, `manager`, `dispatcher`, `driver`, `mechanic`, `clerk` (extensible).
4. UI: `business.$id.staff.tsx` — invite by email (magic link via existing flow), assign role, edit duties, deactivate. Owners/managers only.

## Phase 3 — Tow / Recovery vertical (the headline of this request)

Modules surfaced when `business_kind = 'towing'`:

### 3a. Overview tile dashboard
KPI cards: open jobs, jobs today, avg response time, active drivers, monthly revenue, subscription plan status. Live feed of incoming tow requests in the provider's service area.

### 3b. Dispatch (live queue)
- Promote `/dashboard/dispatch` into `business.$id.dispatch` scoped to this business.
- Add **driver assignment**: when accepting a job, pick a driver + truck from the business's fleet/staff.
- Job lifecycle states: `assigned → en_route → on_scene → towing → completed`, with timestamps and driver notes.
- Map view of active jobs (reuse existing map components).

### 3c. Fleet & assets
- New table `business_assets` (`business_id`, `kind` enum: `tow_truck`/`flatbed`/`wrecker`/`service_van`/`other`, `name`, `plate`, `capacity_kg`, `vin`, `status` active/maintenance/out_of_service, `assigned_driver_id`, `notes`, `photos jsonb`).
- CRUD UI with maintenance log (date, odometer, work done, cost, next due).
- Owner/manager edit; drivers read‑only on their assigned truck.

### 3d. Employees with tow roles
- Staff page with tow‑specific role presets (dispatcher, driver, mechanic) and duties checklist (drive flatbed, light‑duty wrecker, heavy‑duty, recovery, etc.).
- Driver availability toggle (on/off shift) feeds Dispatch.

### 3e. Inventory (consumables)
- Table `business_inventory_items` (`business_id`, `sku`, `name`, `category`: dolly/strap/fuel/spare‑part/other, `unit`, `qty_on_hand`, `reorder_at`, `cost`, `location`).
- Stock adjustments log (`+/- qty`, `reason`, `actor`, `job_id?` to deduct on completion).
- Low‑stock badges in Overview.

### 3f. Pricing & service area
- Existing `provider_tow_rates` UI moves under this workspace as "Rates & coverage".

### 3g. Billing
- Surfaces existing dispatch subscription (`dispatch_subscriptions`) + invoices/receipts for the business.

### 3h. Settings
- Business profile (already exists at `businesses.submit`/`businesses_.$id.edit`) re‑skinned as in‑workspace settings panel.

## Phase 4 — Make signup hand off into the new workspace

- After business signup approval, `/dashboard` shows a **"You signed up 365 Tow Company — open your tow workspace"** banner that deep‑links into `/dashboard/business/<id>`.
- First‑run checklist in the tow workspace: add first truck → add first driver → set service area → activate dispatch subscription.

## Phase 5 — Stubs for other kinds (so they're not broken)

For every non‑towing business kind, the workspace renders the shared modules only: Overview, Listings, Bookings (if applicable), Staff, Analytics, Billing, Settings. Each kind gets a 1‑line description of which deeper modules will follow (parts inventory for parts shops, bay scheduler for repair shops, fleet for rentals, etc.). No half‑built kind‑specific UI ships in this phase.

---

## Technical notes (for engineering)

- **DB migrations** (each with GRANTs + RLS + `has_business_role` policies):
  - `business_staff`, `business_assets`, `business_asset_maintenance`, `business_inventory_items`, `business_inventory_movements`, `tow_jobs_assignments` (driver_id, asset_id, lifecycle timestamps on existing `tow_requests`).
- **Server functions** (TanStack `createServerFn` + `requireSupabaseAuth`):
  - `business-workspace.functions.ts` (loadBusinessForWorkspace, listMyBusinesses)
  - `business-staff.functions.ts`, `business-assets.functions.ts`, `business-inventory.functions.ts`
  - Extend `dispatch.functions.ts` with `assignJobToDriver`, `updateJobLifecycle`.
- **Auth guard**: workspace layout is under `_authenticated/`; per‑route `beforeLoad` or in‑component check calls `has_business_role` to enforce role gating.
- **Reuse**: `seller-staff.functions`, `useDispatchProvider`, `dispatch.functions`, `provider_tow_rates`, existing map components. No duplication.
- **Email**: reuse existing magic‑link + team‑invite templates for staff invites.
- **No changes** to: personal `/dashboard/*`, signup flow, classifieds, public business directory.

## Suggested build order (after approval)

1. Phase 1 shell + module registry + business switcher.
2. Phase 2 staff/roles (needed before tow features can assign drivers).
3. Phase 3 tow vertical (3a → 3b → 3c → 3d → 3e → 3f/g/h).
4. Phase 4 signup hand‑off banner & checklist.
5. Phase 5 stub workspaces for other kinds.

Each phase is independently shippable. I recommend approving the whole plan and implementing in this order; if scope is too large to land at once, **Phase 1 + 2 + 3a/3b** is the minimum to make a tow signup feel "ready to dispatch" the day it lands.
