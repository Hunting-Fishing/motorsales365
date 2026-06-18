# Smart fit all ads — one action

Replace the current admin "Smart auto-fit (AI)" button (which only touches custom uploads) with a single **Smart fit all ads** action that runs Smart auto-fit across every advertisement on the page in one step.

## Scope of "every ad"

| Ad type | Image source | Persisted to | Action |
| --- | --- | --- | --- |
| Custom uploads (`signedRows`) | `row.image_url` | `share_kit_custom_templates.qr_cx/cy/size` via `updateShareKitTemplateQrPlacement` | Vision → heuristic fallback (today's `smartFitOne`) |
| Built-in `kind: "image"` (rear-shirt, arm-band, …) | `template.imageUrl` | `share_kit_layouts` per-user override via `upsertShareKitLayout` (templateId = built-in id) | Vision only (no pixel heuristic for remote PNGs) |
| Built-in `kind: "svg"` | n/a — QR slot is hard-coded in the SVG | — | Skipped (already correctly placed) |

Built-in image ads need a per-user override path because their default `qr` coords ship in `TEMPLATES` and are not editable globally. The existing `share_kit_layouts` table + `upsertShareKitLayout` server function already handle this.

## UI changes (`src/routes/admin.advertisements.share-kit.tsx`)

- Rename the toolbar button to **Smart fit all ads** (keep `Sparkles` icon, keep admin-only gate).
- Drop the `confirm()` dialog — single click runs immediately, progress + result are shown via toast.
- Disabled state: `bulkFitting || totalEligible === 0`.
- Tooltip: "AI-detects the Scan Here panel on every flyer and snaps the QR into it."
- Remove the per-card "Smart fit" button to commit to one action (per-card layout editor stays).

## Logic changes

Extend `smartFitOne` into a polymorphic `smartFitAny(target)` where `target` is either:

```ts
{ kind: "custom"; row: CustomTemplateRow }
{ kind: "builtin-image"; template: ShareTemplate }
```

- `custom` branch persists with `updateQrFn` (unchanged).
- `builtin-image` branch persists with `useServerFn(upsertShareKitLayout)` passing `{ templateId: template.id, qrCx, qrCy, qrSize }`.
- Both branches still call vision first, then the heuristic for customs, and run `assessQrReadability` for the toast summary.
- SVG built-ins are filtered out before queueing.

Replace `smartFitAll(rows)` with `smartFitAllAds()`:

1. Build `targets = [...customs.map(custom), ...visibleBuiltins.filter(kind==='image').map(builtinImage)]`.
2. Worker pool, concurrency 3 (vision-bound).
3. Toast loading: `Smart-fitting N / total — A AI · H heuristic · R review`.
4. On finish, invalidate both `["share-kit-custom-templates"]` and `["share-kit-layouts"]` so the cards re-render with the new placements.
5. Hard-stop on `credits exhausted` / `LOVABLE_API_KEY` errors (already implemented).

## Technical notes

- No DB migration. `share_kit_layouts` already exists with the `templateId` regex `^[a-z0-9_:-]+$/i` that accepts built-in ids.
- No schema or API contract changes; reuses existing `detectScanHereWithVision`, `updateShareKitTemplateQrPlacement`, `upsertShareKitLayout`.
- No change to upload dialog, vision function, or readability assessor.

## Files

- Edit: `src/routes/admin.advertisements.share-kit.tsx`

No new files, no migrations, no env vars.
