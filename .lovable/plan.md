
## Goal

Replace the static "What to expect next" list on `/clubs/apply/success` with a real approval timeline anchored to the milestone dates already returned by `getMyClubStatus` (`created_at`, `updated_at`, `reviewed_at`), plus a status-aware "what happens next" step at the end.

## Data (already available, no server changes)

From `getMyClubStatus`:
- `created_at` → **Submitted**
- `reviewed_at` (when set) → **Reviewed** (admin decision timestamp)
- `updated_at` → **Last updated** (any change: resubmission, admin edit, etc.)
- `status` → drives the final "next" step + review-notes rendering
- `document_count` → shown on the Submitted row as sub-detail

## UX — new `<ApprovalTimeline />` in `src/routes/clubs.apply.success.tsx`

Vertical timeline rendered inside a new card that replaces the current "What to expect next" section. Each milestone is a row with an icon-in-circle marker, a connecting line to the next row, a title, an absolute date + relative "x days ago", and a short sub-line.

Milestone rows (in order):

1. **Submitted** — always shown, `completed`.
   - Date: `created_at`.
   - Sub: `"{document_count} document{s} attached"`.
   - Icon: `FileText`.

2. **Under review** — always shown.
   - `completed` when `status === "active" | "rejected" | "suspended"`; `current` when `status === "pending"`.
   - Date: `reviewed_at` when completed; "In progress" text when current.
   - Sub (pending): `"Typically 1–3 business days"`.
   - Icon: `Clock` (current) / `ShieldCheck` (completed).

3. **Decision** — shown once `reviewed_at` is set OR status is terminal.
   - `active` → title "Approved & live", green, `ShieldCheck`, sub: "Your club page is live. Verified members get the 5% Club Member Discount."
   - `rejected` → title "Needs changes", destructive, `XCircle`, sub: reviewer notes (fallback: "Check the reviewer notes above and resubmit updated documents below.").
   - `suspended` → title "Suspended", destructive, `ShieldX`, sub: "Contact support for next steps."

4. **Last updated** — shown only when `updated_at` differs from both `created_at` and `reviewed_at` (i.e. there's been a meaningful change after review, e.g. after resubmission).
   - Sub: `"Awaiting re-review"` when status is back to `pending` post-review; otherwise `"Details updated"`.
   - Icon: `RefreshCw`.

5. **Next step** — always the final row, `upcoming` styling (dashed marker), tailored to status:
   - `pending` → "We'll email you the decision" (`Mail`).
   - `active` → "Add logo, cover & first post" with a link to `/dashboard/clubs_/$id` (`LayoutDashboard`).
   - `rejected` → "Resubmit updated documents" pointing to the existing resubmit panel below (`Upload`).
   - `suspended` → "Contact support" (`Mail`).

## Formatting

- Add a small helper `formatDate(iso)` → `Intl.DateTimeFormat("en", { dateStyle: "medium" })` (e.g. "Jul 4, 2026").
- Add `relativeFromNow(iso)` → `Intl.RelativeTimeFormat("en", { numeric: "auto" })` producing "2 days ago" / "today".
- Both helpers live at module scope in the same file — no new deps.

## Visuals

- Card matches existing rounded-2xl / border / bg-card style.
- Marker circles: 8×8, colored per state (`muted` for upcoming, `primary/10` for current, `emerald/15` for completed-positive, `destructive/10` for negative).
- Vertical connector: 2px line via `border-l` on a padded column, hidden on the last row.
- `aria-live="polite"` on the timeline so refetches (after resubmission) announce updates.
- Skeleton state while `isLoading` (three greyed rows).
- Error state: fallback to the current concise "What to expect next" copy so the page still helps if the fetch fails.

## Out of scope

- No new server fn, no schema/migration, no changes to the resubmit panel or CTAs at the bottom.
- No history table — timeline uses only the three timestamps we already have.
- No changes to `/dashboard/clubs_/$id` or admin flows.
