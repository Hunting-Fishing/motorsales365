## Step 9 — Delete-ride action

Let an owner permanently delete one of their rides from `/dashboard/rides`. Cleans up DB rows and storage objects.

### Server function `deleteRide` in `src/lib/rides.functions.ts`

- Method `POST`, `requireSupabaseAuth`, input `{ id: uuid }`.
- Verify the ride belongs to `userId`. If not, throw "Not your ride".
- Collect storage paths for cleanup:
  - `ride_photos.storage_path` where `ride_id = id`
  - `ride_service_log_photos.storage_path` for every log on this ride
  - The ride's own `cover_storage_path` if present
- Call `supabase.storage.from('ride-media').remove([...paths])` (best-effort: log on error, don't block the row delete).
- `delete from rides where id = $1 and user_id = auth.uid()`. Child rows (`ride_photos`, `ride_service_logs`, `ride_service_log_photos`, `ride_likes`) are removed by existing FK `on delete cascade`.
- Return `{ ok: true }`.

### UI `src/routes/dashboard.rides.tsx`

- Add a destructive "Delete" button on each ride card (next to Edit / Publish), using `Trash2` icon and `variant="outline"` with destructive text class.
- Wrap it in shadcn `AlertDialog`:
  - Title: "Delete this ride?"
  - Body: "This permanently removes \"{ride.name}\", its photos, and service history. This cannot be undone."
  - Cancel + destructive "Delete ride" confirm.
- On confirm: call `deleteRide({ data: { id } })` via `useServerFn`, toast success/error, then `load()` (or optimistic remove from local state).

### Out of scope
- No DB migration (FK cascade already exists).
- No bulk-delete; single-row only.
- `/rides/$slug` already returns 404 for missing slugs — nothing to change there.

### Files touched
- `src/lib/rides.functions.ts` (add `deleteRide`)
- `src/routes/dashboard.rides.tsx` (wire AlertDialog + call)
