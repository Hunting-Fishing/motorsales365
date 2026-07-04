
## Goal

When a club owner lands on `/clubs/apply/success?club=<id>` and the fetched status is `rejected` ("Needs changes"), give them an inline way to upload replacement accreditation documents and resubmit — without leaving the page or emailing back and forth.

## UX

Inside the existing "What to expect next" card (rejected branch) on `src/routes/clubs.apply.success.tsx`, add a new "Submit updated documents" section, visible only when `status === "rejected"` and the user owns the club (the server fn already enforces owner scoping).

Section contents:
- Reviewer notes reminder (already shown above; kept as-is).
- Doc kind selector (LTO accreditation / SEC / DTI / Other) — same list as `/clubs/apply`.
- Multi-file picker (PDF/JPG/PNG, up to 6 files total across the resubmission, mirroring apply page).
- Staged file list with per-row remove.
- Primary button: **Resubmit for review** (disabled until at least one file is staged).
- Secondary link: "Open in dashboard for a full edit" → `/dashboard/clubs_/$id`.
- On success: toast, clear staged files, `refetch()` the status query — the badge flips back to **Pending review** and the "What to expect next" content automatically switches to the pending copy.

## Server

Add two things to `src/lib/clubs.functions.ts`:

1. `resubmitClubApplication` — `createServerFn({ method: "POST" })` + `requireSupabaseAuth`.
   - Input: `{ club_id: uuid, documents: [{ kind, storage_path, original_filename? }] (1..6) }`.
   - Handler:
     - Load the club, confirm `owner_id === userId` and `status === "rejected"` (else throw).
     - Insert the new rows into `club_documents` (owner-scoped RLS).
     - Update the club: `status = 'pending'`, `review_notes = null`, `reviewed_at = null`, `reviewed_by = null`, `updated_at = now()`.
   - Returns `{ ok: true }`.

2. Reuse the existing client-side upload pattern from `clubs.apply.tsx` (`supabase.storage.from("club-docs").upload("<clubId>/<uuid>.<ext>")`) — no storage/RLS changes needed, path prefix stays `<club_id>/…`.

## Client

Edit `src/routes/clubs.apply.success.tsx`:

- Add local state for staged files (`Array<{ file: File; kind: DocKind }>`), current picker `kind`, and `submitting` boolean.
- Add `useServerFn(resubmitClubApplication)` alongside the existing `getMyClubStatus`.
- New `<ResubmitDocumentsPanel />` sub-component (kept in the same file to match project conventions) rendered only when `data?.status === "rejected"`.
- On submit: upload each staged file to `club-docs`, call `resubmitClubApplication`, toast success, clear staged list, then `refetch()` the status query so the whole page updates in place.
- Keep the existing "What to expect next" rejected copy above the new panel so the user still sees why they're resubmitting.

## Out of scope

- No changes to `/clubs/apply` (initial submission), `/dashboard/clubs_/$id`, admin review flow, storage bucket config, or email templates.
- No new schema/migrations.
- No changes to status semantics beyond the existing `pending`/`rejected` transition.
