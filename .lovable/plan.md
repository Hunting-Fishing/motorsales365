
## Goal

Consolidate the QR / Share Kit into the **Advertisements** tabbed workspace (also keep it in the side nav for quick access), lock advertisement upload/delete to the **admin** role only, and add a permanent **History** log of all advertisements/promotions for legal recordkeeping.

---

## 1. Share Kit as an Advertisements tab

- Add a new tab to `src/routes/admin.advertisements.tsx`:
  - `{ to: "/admin/advertisements/share-kit", label: "My QR / Share Kit", icon: QrCode, roles: ["admin","sales","advertising"] }`
- Create `src/routes/admin.advertisements.share-kit.tsx` that renders the existing Share Kit UI (reuse the component currently used at `/admin/sales` for screenshot/QR). No business-logic change — pure relocation/wrap.
- Side nav (`src/routes/admin.tsx`): keep a top-level **My QR / Share Kit** link pointing to `/admin/advertisements/share-kit` so it remains one click away while still living under Advertisements.
- Sales hub (`admin.sales.tsx`): update the "My QR" tile to point to the new path.

## 2. Admin-only upload / delete on Advertisements

Restrict mutation on the **Campaigns** tab (the upload/delete surface) so only users with the `admin` role can create or remove ads. `sales` and `advertising` roles get read-only access.

- `src/routes/admin.advertisements.campaigns.tsx`: hide the "Upload / New Ad" button and the per-row Delete action unless `useAuth().isAdmin`. Replace with a disabled tooltip ("Admin only") for visibility.
- `src/lib/ads.functions.ts`: tighten `upsertAd` and `deleteAd` server-side — require `has_role(userId,'admin')`, not just any admin-domain role. Returns 403 otherwise. This is the authoritative check; the UI gate is convenience.

## 3. Advertisement history log (legal record)

New append-only table that captures every create / update / delete / status change on `advertisements`, plus snapshots from `ad_inquiries` and `promotions` so the business has one durable timeline.

### Schema (migration)

```text
public.advertisement_history
  id uuid pk
  ad_id uuid null            -- nullable so deletions retain the snapshot
  source text not null       -- 'advertisement' | 'ad_inquiry' | 'promotion'
  action text not null       -- 'created' | 'updated' | 'deleted' | 'status_changed'
  snapshot jsonb not null    -- full row at time of event
  changed_by uuid null       -- auth.uid()
  changed_at timestamptz default now()
  note text null
```

- GRANT SELECT to `authenticated`, ALL to `service_role`.
- RLS: SELECT allowed to `admin` role only (legal record). No UPDATE/DELETE policies → effectively append-only from the app.
- Triggers on `public.advertisements`, `public.ad_inquiries`, `public.promotions` (AFTER INSERT/UPDATE/DELETE) that write a row with the full `OLD`/`NEW` snapshot.

### UI

- New tab **History** in the Advertisements layout, admin-only: `/admin/advertisements/history`.
- `admin.advertisements.history.tsx` lists entries newest-first with filters (source, action, date range, ad id) and an expandable JSON snapshot viewer. Read via a new `listAdHistory` server fn (admin-gated).

## 4. Files touched

**Created**
- `src/routes/admin.advertisements.share-kit.tsx`
- `src/routes/admin.advertisements.history.tsx`
- `src/lib/ad-history.functions.ts` (admin `listAdHistory`)
- Migration for `advertisement_history` table + triggers

**Edited**
- `src/routes/admin.advertisements.tsx` (add Share Kit + History tabs, role filter)
- `src/routes/admin.advertisements.campaigns.tsx` (hide upload/delete unless admin)
- `src/routes/admin.tsx` (sidebar: keep "My QR / Share Kit" pointing to new path)
- `src/routes/admin.sales.tsx` (update My QR tile link)
- `src/lib/ads.functions.ts` (require `admin` role on `upsertAd`/`deleteAd`)
- `src/hooks/use-admin-pending-counts.ts` (no count for share-kit/history; just route map entries)

## Technical notes

- The campaigns tab stays visible to `sales`/`advertising` for review and reporting; only the mutation controls are gated. Server fns enforce the same rule so a crafted request can't bypass the UI.
- Triggers use `SECURITY DEFINER` with `set search_path = public` and insert into `advertisement_history` regardless of caller role, so RLS on source tables doesn't block logging.
- No changes to the Terms/Privacy pages — this is internal recordkeeping, not a user-facing data-handling change.
