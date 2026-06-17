# Plan

## 1. Better phone number formatting

**File:** `src/components/business-page/gallery-contact-tabs.tsx` (+ small helper in `src/data/country-codes.ts`).

- Add a `formatNationalNumber(iso, digits)` helper that inserts dashes per country:
  - PH (10 digits): `XXX-XXX-XXXX` (e.g. `917-555-1234`).
  - US/CA (10): `XXX-XXX-XXXX`.
  - GB (10–11): `XXXX-XXXXXX`.
  - JP (9–10): `XX-XXXX-XXXX`.
  - AU (9): `XXX-XXX-XXX`.
  - Default: group 3-3-rest.
- Wire it into the `PhoneField` input so the user sees dashes as they type (controlled value = formatted, stored value = digits only). The stored channel value remains E.164 (`+63 917-555-1234` only for display).
- Display the formatted version in the contact-channels table and on the public business page (`public-sections.tsx` where phone is rendered).
- Reuse the same helper in the Bookings inbox so the customer's phone is shown formatted, and in `businesses.$slug.book.tsx` for the customer phone input.

## 2. Bookings respect business open hours

Today, weekly availability for bookings is stored separately in `business_availability` and is unrelated to the "Hours" tab (`businesses.hours` JSON via `business-hours.ts`).

Changes in `src/components/business-page/bookings-tab.tsx` → `WeeklyHoursSection`:

- Add a toggle **"Use my business open hours"** (on by default when no custom rows exist).
- When on: derive availability rows from `businesses.hours.primary` (one row per day per open range, weekday number 0=Sun…6=Sat), show them read-only with a banner "Synced from your Hours tab — edit there to change", and persist them on Save via the existing `replaceWeeklyAvailability`.
- When off: keep the existing custom editor (per-day ranges, "Custom hours"), so users can override (e.g. shorter booking window than store hours).
- Add a "Re-sync from Hours" button that re-imports the current open hours into custom mode for fine-tuning.
- `24h` days map to a single `00:00–23:59` window; `closed` days produce no rows.

Slot computation (`business-bookings-slots.ts`) already consumes `availability` rows + exceptions, so no change needed there.

## 3. Booking calendar view in the dashboard

**File:** `src/components/business-page/bookings-tab.tsx` → `BookingsInboxSection`.

- Add a **List / Calendar** toggle above the inbox.
- Calendar view: month grid (using existing `@/components/ui/calendar`) with day badges showing booking counts. Clicking a day reveals that day's bookings grouped by time, with the same status filter and action buttons (confirm / decline / complete / no-show).
- Each booking row shows: time, service title, customer name + formatted phone, status badge, and the assigned staff member (see #4).
- Keep the existing list view as default for accessibility.

## 4. Assign bookings to approved staff / owner

**Schema migration** (new file in `supabase/migrations/`):

- Add `assigned_user_id uuid null references auth.users(id)` to `public.business_bookings`.
- Index on `(business_id, assigned_user_id)`.
- Update existing RLS so owners and staff with booking access can update `assigned_user_id`; the assignee can also see/update bookings assigned to them.
- Regenerate types after approval (automatic).

**Server functions** (`src/lib/business-bookings.functions.ts`):

- Extend `updateBookingStatus` (or add `assignBooking`) to accept `assigned_user_id`.
- Extend `listBookings`/`getBookingConfig` to return staff list (owner + entries from `business_staff` whose role allows bookings and whose `accepted_at` is not null).

**UI** in `BookingsInboxSection` (both list and calendar):

- Per-booking **Assign** dropdown populated with owner + approved staff.
- Reassigning sends a toast and triggers `onChange()` to refetch.
- Optional filter "Assigned to: anyone / me / unassigned".

**Email/notification:** out of scope for this pass (existing `booking-owner` email already fires; we can add an assignee notification in a follow-up).

## 5. Public booking page – pick a staff member (optional)

**File:** `src/routes/businesses.$slug.book.tsx`.

- If the bookable item has more than one approved staff member available, show an optional "Preferred staff" select (defaults to "No preference"). Selection is stored as `assigned_user_id` on creation; owner can still reassign from the inbox.

## Technical notes

- All phone formatting stays presentation-only; canonical storage remains E.164. Validation rules in `PhoneField` (`buildE164`/`parseE164`) are unchanged.
- Syncing hours → availability happens client-side on Save; we do not duplicate data automatically on the Hours tab to avoid surprise writes.
- The calendar dashboard reuses the already-fetched `bookings` array; no new server call.
- Staff list comes from existing `business_staff` table; no new role plumbing.
- Migration follows the required order: CREATE column → GRANT (already in place for table) → policy updates.

## Out of scope (call out for follow-up)

- SMS/WhatsApp reminders to the customer.
- ICS calendar export / Google Calendar sync for the assignee.
- Per-staff working hours (currently hours are business-wide).
