## Goal

Collapse three sidebar entries — **Ad Inquiries**, **Ad Campaigns**, **Promotions & Discounts** — into one **Advertisements** entry in the admin sidebar, with the three pages becoming tabs inside a single Advertisements workspace. This tightens the sidebar and groups related advertising tools together as the platform grows.

## Sidebar (before → after)

Before (Sales section):
```text
Sales Hub
Accounts
Analytics
Ad Inquiries            <-- remove
Ad Campaigns            <-- remove
Promotions & Discounts  <-- remove
Affiliate Shop
Referrals
My QR / Share Kit
Lead Marketplace
```

After:
```text
Sales Hub
Accounts
Analytics
Advertisements          <-- new (tabs: Inquiries · Campaigns · Promotions)
Affiliate Shop
Referrals
My QR / Share Kit
Lead Marketplace
```

## Advertisements page layout

New route `/admin/advertisements` (layout route) with three children rendered as tabs:

```text
┌─ Advertisements ──────────────────────────────────────┐
│ [ Inquiries ] [ Campaigns ] [ Promotions ]            │
├───────────────────────────────────────────────────────┤
│  <Outlet />  (active tab content)                     │
└───────────────────────────────────────────────────────┘
```

Tabs map to existing pages — no business logic changes, just relocation:

| Tab        | Route                                  | Source page (moved)            |
| ---------- | -------------------------------------- | ------------------------------ |
| Inquiries  | `/admin/advertisements/inquiries`      | current `/admin/advertising`   |
| Campaigns  | `/admin/advertisements/campaigns`      | current `/admin/ad-campaigns`  |
| Promotions | `/admin/advertisements/promotions`     | current `/admin/promotions`    |

Default tab = Inquiries (redirect `/admin/advertisements` → `/admin/advertisements/inquiries`).

Role gating preserved per tab (admin/advertising/sales as today). Tabs the current user can't access are hidden, not disabled.

## Technical changes

1. **New layout route** `src/routes/admin.advertisements.tsx`
   - Header + tab bar using shadcn `Tabs` linked to the active child route (via `useRouterState` pathname), renders `<Outlet />`.
   - Index redirect to `/admin/advertisements/inquiries`.

2. **New child routes** (thin wrappers re-exporting existing page components):
   - `src/routes/admin.advertisements.inquiries.tsx`
   - `src/routes/admin.advertisements.campaigns.tsx`
   - `src/routes/admin.advertisements.promotions.tsx`

3. **Refactor existing page files** to export their content as components from `src/components/admin/advertisements/` (or keep in place and import). The old routes (`/admin/advertising`, `/admin/ad-campaigns`, `/admin/promotions`) become redirects to the new tab URLs so any saved links / emails keep working.

4. **Sidebar (`src/routes/admin.tsx`)**: remove the three NAV entries, add one consolidated `Advertisements` entry (Icon: `Megaphone`, roles: union of the three = `["admin", "advertising", "sales"]`, `info` summarising all three).

5. **Sales Hub (`src/routes/admin.sales.tsx`)**: update the tile links to point at the new tab URLs (Ad Inquiries → `/advertisements/inquiries`, etc.) so the hub stays consistent.

## Out of scope

- No changes to the underlying inquiry / campaign / promotion data, schemas, or component logic.
- No visual redesign of the individual pages — only the wrapping shell and navigation.
