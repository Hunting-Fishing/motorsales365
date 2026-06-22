## Auto-sync flashcards from GitHub

Add an optional scheduled auto-sync for the flashcards content, plus admin UI to configure it. Manual "Pull latest" button stays.

### Schema (new migration)

Extend `flashcard_content` (singleton row id=1) with:
- `auto_sync_enabled boolean not null default false`
- `auto_sync_interval text not null default 'daily'` — one of `daily | weekly | biweekly | monthly`
- `auto_sync_last_run_at timestamptz`
- `auto_sync_last_status text` — `success | error`
- `auto_sync_last_error text`

No new table, no new RLS surface.

### Cron endpoint

New public route `src/routes/api/public/hooks/flashcards-autosync.ts` (POST). Verifies `apikey` header == project anon key, then:
1. Reads `flashcard_content` row via `supabaseAdmin`.
2. If `auto_sync_enabled` is false → returns `{ skipped: "disabled" }`.
3. Computes due window from `auto_sync_interval` vs `auto_sync_last_run_at`:
   - daily ≥ 23h, weekly ≥ 7d, biweekly ≥ 14d, monthly ≥ 30d
4. If not due → `{ skipped: "not-due" }`.
5. If due → runs the same fetch+upsert logic factored out of `syncFlashcardsFromGithub` (shared helper `runFlashcardSync()` in `src/lib/flashcards.server.ts`), then writes `auto_sync_last_run_at` + status. Errors are caught and stored, never thrown to caller.

Scheduled via `pg_cron` to run **daily at 00:00 UTC**, hitting the published stable URL `project--0738c881-614d-4885-8d75-1b7c90e0835e.lovable.app/api/public/hooks/flashcards-autosync` with `apikey` header. The endpoint itself decides whether the interval is due, so a single daily cron handles all four intervals.

### Server functions

In `src/lib/flashcards.functions.ts`:
- Extend `FlashcardContent` type with the new auto-sync fields and include them in `getFlashcardContent`.
- New `updateFlashcardAutoSync` (admin-only, `requireSupabaseAuth` + `can_moderate` check) with input `{ enabled: boolean; interval: 'daily'|'weekly'|'biweekly'|'monthly' }`. Writes via `supabaseAdmin`.
- Refactor `syncFlashcardsFromGithub` to call the shared `runFlashcardSync()` helper.

### Admin UI (`src/routes/admin.flashcards.tsx`)

Add a new "Auto-sync" card above the manual pull card:
- Toggle (Switch) — Enabled / Disabled
- Interval selector (Select): Daily (midnight UTC) / Weekly / Every 14 days / Every 30 days
- Save button (mutation → `updateFlashcardAutoSync`, then invalidate query)
- Status line: "Last auto-run: {relative time} · {success|error}"; on error show the message in red

The existing manual sync, snapshot card, and result feedback are unchanged.

### Technical notes

- All new code paths use the existing `supabaseAdmin` import-inside-handler pattern.
- Cron SQL is run via `supabase--insert` (per `schedule-jobs-modern` guidance) after the migration is approved, since the URL/anon-key live outside migration files.
- No client bundle changes to the flashcards game itself — `loader.js` still reads `/api/public/flashcards/content` and picks up whatever the latest snapshot is.
