## Audit findings for `/sell` (Post a Listing)

I read `src/routes/sell.tsx` end‑to‑end (2,259 lines) and inspected the rendered page. Here is what I found and what I want to change.

### 1. "Form appears 3× / repeating"

There is **only one `<form>`** on the page (confirmed via DOM query — `formCount: 1`). What is happening is:

- The form is split into **4 stacked `<section>` blocks** for the tabs `Details`, `Location & Seller`, `Plan & Boost`, `Photos` — but **all four sections are always rendered** and only visually hidden via a `hidden` class (line 1002, 1806, 1846, 1905). Under some conditions (e.g. Tailwind class order edge cases, print view, screen readers, or if `activeTab` briefly desyncs) more than one appears at once.
- The Plan tab renders **two separate `<section data-tab="plan">` blocks back‑to‑back** (Plan cards + Boost accordion) — this reads as "the section repeats".
- The Photos/Media tab contains a "Review before publishing" summary card that duplicates fields already shown in earlier tabs (title, price, region…), reinforcing the "repeat" perception.
- The sticky top tab bar + sticky bottom footer + the review card together produce 3 near‑identical fee/summary chips.

**Fix:** stop rendering inactive tabs at all (conditional render, not `hidden`), merge the two `plan` sections into one, and dedupe the review summary so it appears in exactly one place (the sticky footer). One visible pane per step, one summary.

### 2. "Failure to publish" error

`handleSubmit` (lines 650–886) has several failure paths that surface as a generic `"Failed to publish listing"` toast because `err.message ?? …` swallows Supabase error codes/hints:

- The `listings` insert throws the raw PostgREST error; `err.message` is often empty when RLS rejects, so users see the fallback string with no clue why.
- If any photo/video upload fails, it silently returns and shows `"Some uploads failed"` without indicating which item.
- `plan === "free"` with a stripe boost path navigates before verifying the listing row is actually `active`.
- `expires_at` / `status` / `seller_type` are set client‑side; any table schema drift (added NOT NULL column) breaks the insert with a cryptic message.

**Fix:** 
- Surface the real error: include `error.code`, `error.details`, `error.hint` in the toast + `console.error` the full payload.
- Preflight: after `supabase.auth.getUser()`, validate required RLS pre‑conditions (user id present, region+city+category+plan values in expected enums) and produce a specific message.
- Wrap the insert in a typed helper that maps Postgres error codes (`23502` missing column, `23514` check violation, `42501` RLS denied) to human copy.
- On upload failure, list the exact filenames that failed and keep the listing row (already created) so the user can retry without losing data.

### 3. Video upload has no thumbnail and no progress

Confirmed in code (lines 2110–2172):

- Photos generate a preview via `URL.createObjectURL(file)` on selection (line 2052). Videos do **not** — only the filename is shown.
- Photo AND video uploads are deferred until form submit (`uploadOnePhoto` / `uploadOneVideo` are called from `handleSubmit` at lines 849–858). So the progress bar block at lines 2147–2151 only appears during the final submit, not while the user is still filling the form. Since the video row shows nothing except a filename before that, it looks broken.
- The video `<input>` is disabled while any upload is running but there is no visual state for "queued".

**Fix:**
- Generate a poster thumbnail from the selected video: `<video src={URL.createObjectURL(file)} preload="metadata" muted playsInline>` seeked to `~0.5s`, drawn once to a canvas → data URL. Show it in the same tile style as photos.
- Kick off the upload **immediately on file selection** (matching what photos should do too), so the Progress bar appears right away. Submit becomes a no‑op for items already `status: "done"`.
- Add explicit `queued` / `uploading` / `done` / `error` chips so the state is visible even at 0%.
- Show duration + file size next to the thumbnail.

### Scope of changes (frontend only)

Files touched:
- `src/routes/sell.tsx` — collapse tab rendering, merge the two `plan` sections, dedupe review summary, add video thumbnail + eager upload, richer error surfacing.
- `src/lib/storage-upload.ts` — no change (already supports progress).
- Small new helper `src/lib/video-thumbnail.ts` — extracts a poster frame from a `File`.

No backend / DB / RLS / server function changes. No copy changes outside the affected UI.

### Verification

- `tsgo` typecheck.
- Live preview: sign in, select 1 photo + 1 video, confirm both show thumbnails + upload immediately with progress. Submit and confirm redirect.
- Force a failure (e.g. remove `region`) and confirm the toast now names the missing field.
- Force an upload failure (offline) and confirm the exact filename is called out with a Retry button.
