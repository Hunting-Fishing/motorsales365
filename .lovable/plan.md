## Goal

Give business owners a proper weekly Hours editor, show an "Open now / Closing soon / Opening soon / Closed" badge on the public page, and let fuel stations set a separate schedule for an on-site convenience / Sari-Sari store when it differs from pump hours.

## 1. Storage (no schema change)

`businesses.hours` is already `jsonb`. Use a structured shape, backward-compatible with the existing free-text map:

```json
{
  "tz": "Asia/Manila",
  "primary": {
    "mon": { "mode": "open", "ranges": [{"open":"06:00","close":"22:00"}] },
    "tue": { "mode": "24h" },
    "sun": { "mode": "closed" }
  },
  "store": { "mon": { "mode":"open", "ranges":[{"open":"05:00","close":"23:00"}] }, ... }
}
```

- `mode`: `"open" | "closed" | "24h"`.
- `ranges`: 1–2 ranges per day (handles split lunch closures).
- `store` is optional; only persisted for fuel_station / repair_shop / dealer / parts when the owner enables "Different hours for store".
- When loading old data with plain `{ monday: "9-5" }`, treat it as display-only legacy until the user re-saves.

## 2. Dashboard editor (`dashboard.businesses_.$id.edit.tsx`)

New `HoursTab` in the existing Tabs, placed after Tags.

- Timezone display (locked to `Asia/Manila`; show as read-only chip).
- 7 day rows. Each row: Day name · mode toggle (Open / 24 hours / Closed) · two time pickers per range · "+ Add split range" (max 2 ranges).
- "Copy Monday to all weekdays" and "Copy to weekend" helpers.
- For `fuel_station` only: checkbox "Convenience store / Sari-Sari Store has different hours". When on, a second collapsible block edits `store` with the same controls and a "Copy from station hours" button.
- Use shadcn `Input type="time"` (no datepicker needed — time only).
- Save writes the full JSON to `businesses.hours` via existing owner UPDATE policy.

## 3. Public page status badge (`businesses.$slug.tsx`)

New helper `src/lib/business-hours.ts` exporting:
- `getStatus(hours, now, key='primary')` → `{ state: 'open'|'closing_soon'|'opening_soon'|'closed', nextChangeAt: Date, label: string }`.
- `closing_soon` = currently open, closes within 30 min.
- `opening_soon` = currently closed, opens within 60 min today.
- Computes against `Asia/Manila` regardless of viewer timezone.
- Recomputes client-side every 60s so badge updates without a refresh.

Render:
- Replace current static "Hours" list with a grouped block:
  - Status pill at top (color-coded: open=green, closing_soon=amber, opening_soon=blue, closed=muted).
  - Weekly grid showing each day with its ranges (or "24 hours" / "Closed").
- For fuel stations with a `store` schedule, show two pills/blocks side by side: "Pumps" and "Store / Sari-Sari".
- Legacy free-text map: keep current renderer as fallback when JSON isn't in the new shape.

## 4. Submit form (`businesses.submit.tsx`)

Out of scope this pass — owners can set hours after creation from the dashboard. (Adding to submit can come later; keeps signup short.)

## Files touched

- `src/lib/business-hours.ts` (new) — types, normalize legacy data, status calculator.
- `src/components/business/hours-editor.tsx` (new) — reusable weekly editor used by HoursTab.
- `src/routes/dashboard.businesses_.$id.edit.tsx` — add `HoursTab` and tab trigger.
- `src/routes/businesses.$slug.tsx` — replace existing hours block with status pill + dual-schedule renderer; keep legacy fallback.

## Out of scope

- No DB migration. No changes to admin moderation, search, or filters.
- No holiday / special-hours overrides (can be added later as `overrides: [{date, mode, ranges}]` without breaking the shape).
