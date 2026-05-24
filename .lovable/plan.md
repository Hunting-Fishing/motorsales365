# Mobile Responsiveness Sweep — Remaining Gaps

After the earlier rework, a scan of the codebase shows the global chrome (header, footer, layout, tab bar, PWA) is in good shape, but several routes still have raw desktop-only patterns that break at 360px. This plan addresses what's left.

## Findings & Fixes

### 1. Admin tables still desktop-only
Raw `<table>` with no horizontal scroll wrapper or `<md` card fallback:
- `admin.referrals.tsx` (3 tables, filter row uses fixed `w-[120/130/140/150/160/180px]` selects + `w-[150px]` date inputs — overflows 360px)
- `admin.redemptions.tsx` (2 tables) and `admin.redemptions_.$staffId.tsx`
- `admin.currencies.tsx`, `admin.audit.tsx`, `admin.shop.tsx` (3 tables), `admin.accounts.tsx` (filter selects `w-[130–150px]` row)
- `admin.users.tsx`, `admin.advertising.tsx`, `admin.verifications.tsx`, `admin.type-suggestions.tsx`, `admin.pricing.tsx`

Fix: wrap each `<table>` in `<div className="-mx-4 overflow-x-auto sm:mx-0">` with a `min-w-[640px]` on the inner table; collapse filter toolbars to `flex-wrap gap-2` with `w-full sm:w-[140px]` on each Select/Input so they stack cleanly under 640px.

### 2. Dashboard billing leftover tables
`dashboard.billing.tsx` still has three raw tables (invoices, payment methods detail, ledger) at lines 845/1088/1171. Convert to the same responsive-table pattern (scroll wrapper at `<md`, native table at `md+`), and ensure the invoice details drawer trigger row remains tappable (min 44px).

### 3. Payments receipt
`payments.$id.receipt.tsx` has two tables (line items, totals). Add horizontal scroll wrapper; ensure the print path is unaffected (`print:overflow-visible`).

### 4. Big user-facing routes — spot pass
Walk through and fix obvious overflows / multi-column grids that don't collapse, and stack toolbars:
- `sell.tsx` (1014 lines, stepper wizard)
- `dashboard.tow.tsx`, `dashboard.index.tsx`, `dashboard.profile.tsx`, `dashboard.verification.tsx`, `dashboard.messages.tsx` (thread list + conversation split)
- `businesses.submit.tsx`, `businesses.$slug.tsx`, `businesses.index.tsx`
- `listing.$id.tsx`, `listing.$id.edit.tsx`, `signup.tsx`, `seller.$id.tsx`, `rides.$slug.tsx`
- `map.tsx` — confirm the slide-up results sheet is in place at `<md`
- `pricing.tsx`, `advertise.tsx`, `index.tsx` (home hero)

Standard fixes per page: clamp hero/h1 with `text-3xl sm:text-4xl md:text-5xl`, switch `grid-cols-2/3/4` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`, full-width primary buttons under `sm`, stack two-column form rows.

### 5. Dialogs on small screens
Several dialogs use `max-w-md` / default width with no `<sm` adaptation (`admin.accounts EditAccountDialog`, `admin.type-suggestions`, edit/add user dialogs). Add `className="max-w-md sm:max-w-md w-[calc(100vw-2rem)]"` and `max-h-[90vh] overflow-y-auto` so long forms scroll inside the dialog instead of clipping the footer.

### 6. Components with fixed minimums
- `places-autocomplete.tsx` uses `min-w-[240px]` — drop to `min-w-0 flex-1` so it shrinks on 360px headers.
- `admin/import-places-panel.tsx` `min-w-[220px]` columns → `min-w-0`.
- `location-picker.tsx` popover `min-w-[260px]` is fine (popover, not inline).

### 7. Verification
Spot-check at 360×644 (current preview) and 768×1024 across: home, browse, listing detail, sell wizard step 1+2, dashboard billing (incl. invoice drawer), dashboard messages, admin referrals, admin redemptions, edit-account dialog. Confirm no horizontal scroll on `<body>` and that tab bar doesn't overlap CTAs (already padded via `pb-[calc(64px+env(safe-area-inset-bottom))]`).

## Out of scope
No business logic, server function, schema, or auth changes. No new pages. PWA manifest/icons unchanged.

## Technical notes
- Reusable wrapper: introduce `<TableScroll>` in `src/components/ui/table.tsx` (thin div wrapper) so admin pages stay terse.
- Toolbar pattern: `flex flex-wrap items-center gap-2 [&>*]:w-full sm:[&>*]:w-auto` applied to filter rows.
- Dialog pattern: extend `DialogContent` defaults? No — apply per-instance to avoid regressing existing dialogs already sized correctly.
