## Goal

Block business submission until the owner has set at least one open day in the weekly hours. Today, hours are only editable in the post-submission editor, so brand-new listings can go to "pending" with no schedule at all — which downstream booking, "open now" badges, and the public mini-site all assume exists.

## Scope

- Add a hours step to the public submit form (`/businesses/submit`).
- Gate the submit action on having ≥1 day with `mode: "open"` (with at least one valid range) or `mode: "24h"`.
- Persist the structured hours through the `submitBusiness` server function into `businesses.hours`.
- Add a shared `hasOpenDay()` helper in `src/lib/business-hours.ts` so the submit form, the editor, and any future verification gate share the same definition.

Out of scope: forcing already-pending/approved businesses without hours to backfill, partial-day exceptions, separate "store" vs "primary" schedules.

## Changes

1. **`src/lib/business-hours.ts`** — add:
   - `hasOpenDay(week: WeekSchedule): boolean` → true if any day is `mode: "24h"`, or `mode: "open"` with ≥1 range where `close > open` (both `HH:MM`).
   - `hasStructuredOpenDay(h: any): boolean` → `isStructuredHours(h) && hasOpenDay(h.primary)`.

2. **`src/lib/businesses.functions.ts`** — extend `submitBusiness`:
   - Add optional `hours` to the zod schema: an object `{ tz: string, primary: WeekSchedule }` with `mode ∈ {"open","closed","24h"}` and `ranges` of `{open, close}` `HH:MM` strings (max 3/day).
   - Reject the call if `hours` is missing or `hasStructuredOpenDay(hours)` is false → `throw new Error("Please set at least one open day in your business hours.")`.
   - Insert `hours: data.hours` along with the rest of the row.

3. **`src/routes/businesses.submit.tsx`**:
   - Import `WeekHoursEditor`, `emptyWeek`, `hasOpenDay`, `TZ` from existing helpers.
   - New state: `const [hours, setHours] = useState<WeekSchedule>(emptyWeek())`.
   - Render a "Business hours" section (Card) between Location and the Tags block.
   - In `submit()`, before calling the server fn:
     - `if (!hasOpenDay(hours)) { toast.error("Set at least one open day in your hours."); return; }`
   - Pass `hours: { tz: TZ, primary: hours }` to `submitFn`.

4. **`src/routes/dashboard.businesses_.$id.edit.tsx` (HoursTab)** — swap its local "any open day" check (if it has one) for the shared `hasOpenDay()` so error copy matches; no behavioral change beyond consistency.

## Validation

- Manual: open `/businesses/submit`, fill required fields, leave all days closed → submit shows the toast and never reaches the server. Mark Mon open 09:00–17:00 → submit succeeds, `businesses.hours` populated, public mini-site shows "Open now" / "Closed" correctly.
- `bunx tsc --noEmit` after the edit.

## Files

- edit: `src/lib/business-hours.ts`
- edit: `src/lib/businesses.functions.ts`
- edit: `src/routes/businesses.submit.tsx`
- edit (small): `src/routes/dashboard.businesses_.$id.edit.tsx`

No DB migration, no policy/terms change (hours are not a fee/data-handling change).
