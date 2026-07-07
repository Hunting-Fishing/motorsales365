## Goal

Let admins create, edit, reorder, publish, and unpublish Staff Academy articles (including new infographics and scripts) from `/admin/staff-academy` — no code deploys needed. Existing in-repo articles keep working; DB articles are additive and can override by slug.

## What ships

### 1. Database

New table `public.staff_academy_articles`:

- `slug` (unique, url-safe)
- `title`, `description`
- `category` — same enum values as code: `playbook | feature | coming-soon | infographic | script | compliance`
- `tags` (text[])
- `status` — `active | coming-soon | draft`
- `hero_emoji`, `hero_image_url` (optional)
- `sections` (jsonb) — array of `{ heading?, body?, bullets?[], cta?: {label,to,external?} }` matching current Article shape
- `sort_order` (int, default 0)
- `updated_at`, `updated_by`, `created_at`

Access rules (plain English):
- Anyone signed in with a `@365motorsales.com` email OR any admin/moderator/support/sales role can read **published** articles (`status <> 'draft'`). Anon cannot read.
- Only admins can read drafts, insert, update, delete, and reorder.
- `service_role` full access.

Uses existing `is_staff(auth.uid())` helper for the staff read policy; admin writes use `has_role(uid,'admin')`.

### 2. Server functions (`src/lib/staff-academy.functions.ts`)

- `listStaffAcademyArticles()` — staff/admin: returns all visible rows ordered by `sort_order, updated_at desc`.
- `listAllStaffAcademyArticlesAdmin()` — admin only: includes drafts.
- `getStaffAcademyArticleBySlug({ slug })` — staff/admin.
- `upsertStaffAcademyArticle({...})` — admin, Zod-validated (slug regex, section shape, category enum).
- `deleteStaffAcademyArticle({ id })` — admin.
- `reorderStaffAcademyArticles({ ids: string[] })` — admin, assigns `sort_order = index`.

All use `requireSupabaseAuth`; admin gate via `has_role` RPC.

### 3. Reader integration

`src/content/staff-academy/index.ts` keeps the 8 seed articles. New helper `mergeArticles(dbRows, staticRows)`:
- Maps each DB row to the `Article` type.
- Drops static entries whose slug is overridden by a DB row.
- Filters out `draft` for non-admins.

`/staff/academy` and `/staff/academy/$slug` fetch DB rows via a Query loader and merge with the static array. Cache stale time 60s. If the DB fetch fails, fall back to static only (no blank page).

### 4. Admin editor

New routes under existing `_authenticated` layout, admin-gated in the component (matches other admin pages):

- `/admin/staff-academy` — list page
  - Table: title, category, status pill, tags, updated at, actions.
  - "New article" button.
  - Drag-handle reorder (uses `@dnd-kit/*` if already installed, else simple up/down arrows) → calls `reorderStaffAcademyArticles`.
  - Publish/unpublish toggle (status ↔ draft/active) and Delete confirm.
  - Filter chips by category + status.
- `/admin/staff-academy/new` and `/admin/staff-academy/$id` — editor
  - Form fields: slug (auto-derived from title, editable), title, description, category (select), status (select), tags (chips input), hero emoji, hero image URL.
  - Sections editor: repeatable blocks with heading, body (textarea), bullets (one per line), optional CTA `{label,to,external}`. Add / remove / drag-reorder sections.
  - Live preview panel on the right using the same section renderer as `/staff/academy/$slug`.
  - Save (upsert) + Save & Publish + Delete.

Sidebar entry "Staff Academy" added to admin nav (admin only) via the existing permissions catalog (`nav.staff-academy`) so it can also be granted to sales/support later if wanted.

### 5. Seed migration

Insert the current 8 static articles into `staff_academy_articles` as `status='active'` so editors have real content to start from. Static file stays as fallback + template reference; admins can safely delete DB rows to reveal the static version.

## Out of scope

- No rich-text/Markdown editor — sections structure stays JSON to keep parity with existing reader.
- No image uploads — hero uses URL string (upload can come later via existing storage bucket).
- No per-article ACLs (staff-wide read only).
- No history/audit view beyond `updated_by` + `updated_at`.

## Order of operations

1. Migration (table + RLS + seed).
2. Server functions + admin gate.
3. Reader merge + refactor `/staff/academy` pages to Query.
4. Admin list + editor routes.
5. Nav entry + permission key.

Reader page keeps working throughout — static seed remains until DB is populated.
