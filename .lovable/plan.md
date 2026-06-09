# Phase 3 #17 — Learn Monetization

## Current state

- Schema is fully built: `courses`, `course_modules`, `course_lessons`, `course_quizzes`, `course_enrollments`, `course_certificates`, `training_partners` (with `tier` + `sponsored_until`), `training_partner_clicks`.
- Routes exist: `/learn`, `/learn/$slug`, `/learn/$slug/watch/$lessonId`, `/partner-training`, `/dashboard/learning`, `/c/$code` (certificates).
- `FeaturedTrainingRail` already renders sponsored partners on `/learn`.
- **Tables are empty** — 0 courses, 0 training partners. So the monetization features look invisible in preview.
- No "Hire a trained mechanic" surface on business profiles. No course-completion badge shown on `/b/$slug`. No sponsor-school field on courses.

## What ships this batch

### A. Seed real content (data-only, no schema change)
1. Seed **6 published courses** across categories (Buying Used Cars in PH, OR/CR & LTO Basics, Motorcycle Maintenance 101, Diesel Truck Pre-Purchase, EV Ownership in PH, Selling Your Car Safely). Each gets 2–3 modules, 3–5 lessons, 1 quiz, hero image (use existing royalty-free / generated). 2 courses marked paid (have `price_php`), 4 free.
2. Seed **8 training partners** (mix of `standard` and `featured` tiers; 3 with `sponsored_until` in future).

### B. Course completion badge on business profile (#17 sub-item)
3. Add a "Certified Training" section on `/b/$slug` that lists course certificates earned by the business owner (`profiles.id == businesses.owner_id`). Query `course_certificates` joined to `courses` for that user, show badge + course title + issue date, link to `/c/$code`.

### C. "Hire a trained mechanic" directory (#17 sub-item)
4. Add a new route `/learn/mechanics` listing businesses whose owner has at least one mechanic-category course certificate. Filter by city, link to `/b/$slug`. Add a link card from `/learn` index ("Need help? Hire a trained mechanic →").

### D. Sponsored course slot (#17 sub-item)
5. Add `sponsor_partner_id` (uuid, nullable, FK → `training_partners`) and `sponsored_until` (timestamptz, nullable) to `courses`. When set + active, the course detail page (`/learn/$slug`) shows a "Sponsored by <Partner>" ribbon linking to partner site (`rel="nofollow sponsored"`). Admin can manage from existing `admin.education.tsx`.

### E. Admin surface
6. Extend `src/routes/admin.education.tsx` with a "Sponsorship" tab/column to set `sponsor_partner_id` + `sponsored_until` on a course, and to bump a training partner to `featured` with a sponsorship end date.

## Out of scope (separate batches)
- Stripe checkout for paid courses (schema has `price_id` — existing Stripe boost/subscription pattern can be reused later).
- Mechanic certification exam flow (current quiz/certificate flow already works; we just surface the badge).
- #9 PH payments expansion — next batch after this one.

## Technical details

- **Migration**: add 2 columns to `courses`:
  ```sql
  ALTER TABLE public.courses
    ADD COLUMN sponsor_partner_id uuid REFERENCES public.training_partners(id) ON DELETE SET NULL,
    ADD COLUMN sponsored_until timestamptz;
  ```
  No new tables, no new grants needed.
- **Seed**: use `supabase--insert` for courses, modules, lessons, quizzes, partners. No code path changes for seeding.
- **Files touched**:
  - `src/lib/education.functions.ts` — add `listMechanicBusinesses()`, `listOwnerCertificates(ownerId)`.
  - `src/routes/learn.mechanics.tsx` — new route.
  - `src/routes/b.$slug.tsx` — add Certified Training section (read-only display).
  - `src/routes/learn.$slug.tsx` — render sponsor ribbon when `sponsor_partner_id` + future `sponsored_until`.
  - `src/routes/learn.index.tsx` — add link card to `/learn/mechanics`.
  - `src/routes/admin.education.tsx` — sponsorship controls.
  - `src/components/learn/featured-training-rail.tsx` — no change (already works once partners exist).
- **Terms/Privacy**: sponsorship surfaces are paid placements → bump `/terms` "Last updated" and add a one-line disclosure under the Advertising section. No `/privacy` change.

## Execution order

1. Migration: add `sponsor_partner_id` + `sponsored_until` to `courses`.
2. Seed training_partners (8 rows) + courses with modules/lessons/quizzes (6 courses).
3. Build `/learn/mechanics` + `listMechanicBusinesses` + link from `/learn`.
4. Add Certified Training section to `/b/$slug`.
5. Add sponsor ribbon to `/learn/$slug`.
6. Extend admin.education with sponsorship controls.
7. Bump `/terms` Last updated.
8. Smoke-test in preview.
