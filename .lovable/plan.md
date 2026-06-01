
# Education Portal Plan

Adds a new `/learn` section to 365 Motorsales: admin-published video courses with quizzes and completion certificates, sold individually or unlocked via existing subscription tiers, plus a separate `/partner-training` page for sponsored external schools.

## Routes

- `/learn` — course catalog (categories: Repair, Detailing, Bodywork, Business, etc.), filters, search
- `/learn/$slug` — course landing page: overview, curriculum, instructor, price, "Buy" or "Start learning" CTA
- `/learn/$slug/watch/$lessonId` — gated player (video + lesson notes), sidebar with lesson list & progress
- `/learn/$slug/quiz/$quizId` — quiz taker (multiple choice, pass threshold gates next module)
- `/learn/$slug/certificate` — completion certificate page (printable, shareable, verifiable via short code)
- `/dashboard/learning` — user's enrolled courses + progress + certificates
- `/partner-training` — sponsored external training facilities directory (clearly marked as paid placements)
- `/admin/education` — admin: CRUD courses, modules, lessons, quizzes, enrollments, certificates, partners
- `/c/$code` — public certificate verification page

## Data model (new tables)

- `courses` — slug, title, summary, description, hero_image, category, level, duration_minutes, instructor_name, price_id (nullable for subscription-only), included_in_tiers (array of plan slugs), status, published_at
- `course_modules` — course_id, position, title
- `course_lessons` — module_id, position, title, video_url (Mux/Cloudflare Stream playback id), duration_seconds, content_md (notes/resources), is_preview
- `course_resources` — lesson_id, label, file_url
- `course_quizzes` — module_id (or course_id for final), title, pass_threshold (e.g. 80)
- `course_quiz_questions` — quiz_id, position, prompt, choices (jsonb), correct_index, explanation
- `course_enrollments` — user_id, course_id, source ('purchase' | 'subscription' | 'admin_grant'), payment_id (nullable), enrolled_at
- `course_lesson_progress` — enrollment_id, lesson_id, completed_at, watch_seconds
- `course_quiz_attempts` — enrollment_id, quiz_id, score, passed, answers (jsonb), attempted_at
- `course_certificates` — enrollment_id, code (short public id), issued_at, pdf_url (nullable, generated on demand)
- `training_partners` — slug, name, logo_url, website_url, description, location, specialties, tier ('featured' | 'standard'), sponsored_until, click_count, active
- `training_partner_clicks` — partner_id, visitor_id, created_at (for affiliate-style tracking, like existing `shop_clicks`)

All tables get RLS:
- Public reads on `courses` (status='published'), `course_modules`, `course_lessons` (preview-only fields when not enrolled), `training_partners` (active=true), `course_certificates` by `code`.
- Authenticated users read/write their own `course_enrollments`, `course_lesson_progress`, `course_quiz_attempts`.
- Admin/moderator full CRUD via existing `can_moderate()` / `has_role('admin')` helpers.
- Explicit GRANTs to anon/authenticated/service_role per public-schema rules.

## Access logic

Server function `getCourseAccess(courseId)`:
1. If user owns an active `course_enrollments` row → access granted.
2. Else if course is included in a tier AND user has an active subscription on that tier → auto-create enrollment (source='subscription') → access granted.
3. Else → access denied (show buy CTA).

Certificate is issued by a server function after the final quiz passes and all required lessons are marked complete.

## Payments

- Each paid course gets a one-time Stripe price via `payments--create_product` (snake_case `course_<slug>_onetime`, PHP currency to match existing plans, single quantity).
- Checkout reuses the existing embedded Stripe flow (`StripeEmbeddedCheckout` + `createCheckoutSession`) — no new infra.
- Webhook handler (`/api/public/payments/webhook`) adds a `checkout.session.completed` branch: if metadata.kind === 'course', insert `course_enrollments` (source='purchase').
- Subscription tiers (Bronze/Silver/Gold/Platinum/Business) get a configurable "included courses" mapping in admin — drives auto-enrollment in step 2 above.
- Tax handling: ask the user before wiring (per Stripe rules) — for digital courses, Lovable-managed compliance handling (+3.5%) is recommended; will confirm at build time.

## Sponsored partners (`/partner-training`)

- Standalone public page, separate from `/learn` so course catalog stays uncluttered.
- Card grid: logo, name, location, specialties, "Visit website" button → routes through `/api/public/training-partners/$id/click` to log + redirect (mirrors existing `resolveShopRedirect` pattern).
- Admin CRUD with `sponsored_until` date and `tier` flag controlling sort.
- Clearly labeled "Sponsored" on each card; "These are paid placements" disclosure at top + in `/terms`.

## Admin tooling (`/admin/education`)

- Tabs: Courses, Partners, Enrollments, Certificates.
- Course editor: tabbed form (Details / Curriculum / Quizzes / Pricing / Publish).
- Lesson media: upload to existing Supabase storage bucket (new `course-media` bucket) or paste Mux playback id.
- Enrollments table: search, manual grant, revoke.
- Partner editor: name, logo upload, website, sponsorship dates.

## Navigation & SEO

- Add "Learn" link to `site-header.tsx` desktop nav + mobile tab bar.
- Each route defines its own `head()` with title/description/og.
- Sitemap (`/sitemap.xml`) extended to include published courses and active partners.
- JSON-LD `Course` schema on `/learn/$slug` for SEO.

## Policy updates (per project memory)

- `/terms` — new section covering course purchases, refund window for courses, subscription-included access, sponsored partner disclosure; bump "Last updated".
- `/refund-policy` — course refund rules (e.g. 7-day if <20% watched).
- `/privacy` — note progress/quiz data collection; bump date.

## Out of scope (explicit)

- Live streaming / cohort classes.
- Instructor marketplace / revenue share (admin-only publishing for now).
- DRM beyond signed playback URLs.
- Mobile native app changes.

## Build order

1. DB migrations (tables + RLS + GRANTs + storage bucket).
2. Server functions (course access, enrollment, progress, quiz scoring, certificate issuance, partner click tracking).
3. Public routes (`/learn`, `/learn/$slug`, watch/quiz/certificate, `/partner-training`, `/c/$code`).
4. User dashboard tab (`/dashboard/learning`).
5. Admin `/admin/education` panels.
6. Stripe product seeding helper (admin button → creates Stripe product/price for a course) + webhook branch.
7. Header/footer/sitemap/SEO + policy page updates.
