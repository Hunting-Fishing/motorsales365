## Bookings tab redesign — round 2

Three focused changes to `src/components/business-page/bookings-tab.tsx` (no schema or server changes).

### 1. Bookable Services → compact data table

Replace the current oversized two‑column card grid with a single `Table` (using `@/components/ui/table`):

| Service | Duration | Buffer | Lead time | Max/slot | Status | Actions |
|---|---|---|---|---|---|---|
| Oil Change | 30m | 10m | 2h | 1 | Active | Edit · Disable · Delete |

- Row click (or "Edit" button) opens an inline drawer/dialog with the existing full form (Basics + Scheduling Rules) — keeps advanced fields off the main screen.
- "Add service" toolbar above the table with two entry points:
  - **Select from catalog** — dropdown sourced from `src/data/service-tags.ts` (already used elsewhere). Picking one prefills name + sensible defaults (duration 30m, buffer 10m, lead 2h, max 1).
  - **Add manually** — opens the same dialog with empty fields.
- Empty state inside the table: one row explaining "No bookable services yet" + the two add buttons.
- Mobile: wrap in `TableScroll` so it stays usable on narrow screens.

Result: the section collapses from a full‑screen grid to ~1 screen row per service.

### 2. Real Booking Calendar

Replace the current "calendar view" (which just highlights days) with a proper month calendar that shows every booking and request on its day.

- Use existing `Calendar` from `@/components/ui/calendar` in `mode="single"` with a custom `DayButton` component that renders:
  - the date number
  - up to 2 colored dots / mini‑pills per booking on that day (color = status: amber=pending, emerald=confirmed, slate=completed, rose=cancelled)
  - "+N" overflow indicator
- Selecting a day reveals a right‑hand panel (or below on mobile) listing that day's bookings sorted by time, each with: time range, customer name, service, status badge, assignee, and the existing action buttons (Confirm / Decline / Complete / Assign).
- Top of the calendar: legend + status filter chips (All · Pending · Confirmed · Completed · Cancelled) and a month nav.
- Keeps the existing List view as a toggle (`List | Calendar`) — Calendar becomes the default when there are >5 bookings.

### 3. Tighten overall layout

- Collapse "How it works" overview card into a single slim banner with the public booking link + 3 inline stats (services / pending / confirmed this week).
- Bookable Services, Hours sync, Holidays & Overrides, and Inbox each become a `Card` with `py-4` padding (currently `py-6`+) and `text-sm` body copy.
- Move Scheduling Rules out of the always‑visible form into the edit dialog (point 1).

### Files touched

- `src/components/business-page/bookings-tab.tsx` — all UI changes above.
- No new files, no migrations, no server‑function changes.

### Out of scope

- Drag‑to‑reschedule on the calendar.
- Week / day calendar views (month only for this pass).
- Editing booking time after creation.
