# Mobile Responsiveness — Car Domain & Admin Pass

Targeted audit of `listing.*`, `sell.*`, `browse.*`, `seller.*`, and all `admin.*` routes. Most pages are already mobile-clean (tables wrapped in `overflow-x-auto`, grids use `sm:`/`md:` breakpoints, headers use `flex-wrap`). Remaining gaps:

## Car domain

Verified clean: `listing.$id.tsx`, `listing.$id.edit.tsx`, `sell.tsx`, `sell.import.tsx`, `browse.$category.tsx`, `seller.$id.tsx`. No fixes needed — gallery thumb strips scroll horizontally, photo grids step `grid-cols-3 sm:grid-cols-5`, filter sidebars stack on mobile, title/price wrap.

## Admin fixes

### 1. `admin.shop.tsx` — Affiliate networks table missing overflow wrapper
Line 318: `<table className="w-full min-w-[640px] text-sm">` sits directly inside `CardContent` with no scroll container. At 360px the 640px min-width pushes the whole page sideways.

**Fix:** Wrap with `<div className="overflow-x-auto">…</div>` (matches pattern used on the other two tables in the same file).

### 2. `admin.reports.tsx` — Header row doesn't wrap
Line 54: `<div className="mb-6 flex items-center justify-between">` holds H1 "Reports" + a 3-button filter chip group. At 360px the chip group can overflow.

**Fix:** `flex flex-wrap items-center justify-between gap-3`.

### 3. `admin.sandbox.tsx` — Section headers don't wrap (×3)
Lines 46, 95, 148: each section uses `flex items-center justify-between` for a heading + description block next to a Reset / Enable-all button group. The heading wraps internally but the right-side button is forced onto the same row, clipping at 360px (esp. line 148 with three buttons).

**Fix:** Change each to `flex flex-wrap items-center justify-between gap-3`.

## Verification

After edits, re-check at 360×644:
- `/admin/shop` → "Affiliate networks" card scrolls its table internally, no page-level horizontal scroll.
- `/admin/reports` → filter pills sit below the H1 if needed instead of clipping.
- `/admin/sandbox` → each section's action buttons wrap below the heading on narrow widths.

## Out of scope
No business logic, route, copy, or auth changes. No restructuring of layouts already verified clean.
