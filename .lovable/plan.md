## Goal
Surface reports publicly (counts + admin-curated summaries) to add user-side transparency, mark listing cards when reports exist, and give the admin panel proper unread-count notifications across every moderation queue (including a global bell).

## 1. Database

New migration:
- `reports`: add `public_summary text`, `made_public_at timestamptz`, `made_public_by uuid`. Add index on `(listing_id, status)`.
- Public RPC `get_listing_report_summary(listing_id uuid)` → `SECURITY DEFINER`, returns `{ open_count, resolved_count, total, categories: jsonb, public_notes: [{category, summary, made_public_at}] }`. Granted to `anon, authenticated`. Only rows with `public_summary IS NOT NULL` contribute to `public_notes`; counts come from all rows. No reporter identity, no raw `details`, ever.
- New view/RPC `admin_pending_counts()` → `SECURITY DEFINER`, gated by `can_support(auth.uid())`, returns one row of unread counts per area (reports_open, verifications_pending, claims_pending, payments_pending, inquiries_open, location_corrections_pending, type_suggestions_pending, ad_campaigns_pending, ops_alerts_unack, support_tickets_open, discover_queue_pending, lead_offers_pending).

No new tables — counts come from existing tables, so no GRANT issues beyond the RPCs.

## 2. Public-facing UI

- `ListingReportBadge` component on `ListingCard` (top-left near image, distinct from the existing `ListingActionsMenu`): small ⚠️ icon + count when `open_count > 0`. Tooltip: "N user report(s) on this listing — tap for details". Tap opens the listing page anchored to the new section.
- `ListingReportsSection` on `/listing/$id` page, placed under price/description and above "Report this listing" CTA. Shows:
  - Total counts (open / resolved) with category breakdown chips.
  - Admin-curated public summaries (one card per public note: category, summary text, date). Empty state: "No admin-reviewed concerns yet."
  - Plain-English disclaimer: counts include unverified user reports; only admin-reviewed notes shown in detail.
- Card data fetched via batch RPC `get_listing_report_summaries(ids uuid[])` so feeds stay efficient — added alongside the per-listing RPC.

## 3. Admin notifications

- `useAdminPendingCounts()` hook polls `admin_pending_counts()` every 60s (and on focus). Cached via TanStack Query.
- Sidebar items in `admin.tsx` (group tabs) get a red pill badge with the count for their area.
- New `AdminNotificationBell` in the admin header: dropdown listing every area with `count > 0`, each as a link. Total badge on the bell icon.
- New admin tool on `admin.reports.tsx` per report: textarea + "Publish public summary" / "Unpublish" buttons writing `public_summary`, `made_public_at`, `made_public_by`. Logged via `logAdminAudit`.

## 4. Policy pages

- `/terms`: add short clause that listing pages display report counts and admin-reviewed summaries; reporter identity is never published. Bump "Last updated".
- `/privacy`: note that reporter identity and free-text details remain private; only admin-curated summaries are public. Bump "Last updated".

## Technical details

- Files to add: `supabase/migrations/<ts>_public_report_summaries_and_admin_counts.sql`, `src/lib/reports.functions.ts` (wrappers for the two RPCs — public is unauthenticated `createServerFn` calling `supabaseAdmin` server-side projection, admin counts uses `requireSupabaseAuth`), `src/components/listings/listing-report-badge.tsx`, `src/components/listing/listing-reports-section.tsx`, `src/components/admin/admin-notification-bell.tsx`, `src/hooks/use-admin-pending-counts.ts`.
- Files to edit: `src/components/listing-card.tsx` (badge), `src/routes/listing.$id.tsx` (section), `src/routes/admin.tsx` (bell + sidebar badges), `src/routes/admin.reports.tsx` (publish summary controls), `src/components/admin/admin-group-tabs.tsx` (accept count slot), `src/routes/terms.tsx`, `src/routes/privacy.tsx`.
- Memory rule for terms/privacy sync already covers the policy bumps.
