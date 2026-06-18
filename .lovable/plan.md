## Goal

When a flyer is uploaded, automatically find the white "SCAN HERE" panel and place the QR inside it — correctly sized and centered — no matter where the panel sits on the image. Provide a one-click "Auto-fit QR" for flyers already in the library.

## How it works (plain language)

Each flyer is scanned in the browser as it's added. The code looks for the biggest clean white rectangle on the image (the "SCAN HERE" plate). It then:

1. Centers the QR on that rectangle.
2. Sizes the QR to fill ~90% of the rectangle's shorter side (so it always fits with a small breathing margin).
3. Saves those coordinates with the flyer so every user's personal QR lands in the right spot.

If no convincing white panel is found (e.g. the image is dark all over), it falls back to the current defaults and flags the flyer so an admin can tweak it with the existing layout editor.

## What changes for the user

- **Upload dialog**: each file row gets a small "QR auto-fit ✓" or "QR not detected — using default" badge so it's obvious what happened before clicking Upload.
- **Admin card actions**: a new "Auto-fit QR" button on each custom template runs the same detector against the stored image and saves the result. Useful for the 50+ flyers already uploaded.
- **Bulk action** at the top of the admin Share-Kit grid: "Auto-fit QR on all custom templates" — runs detection on every custom flyer in one pass.

## Technical section

**New module** `src/lib/share-kit/detect-qr-slot.ts`
- `detectQrSlot(image: HTMLImageElement | Blob): Promise<{ cx: number; cy: number; size: number; confidence: number } | null>`
- Steps: draw image into an offscreen canvas downscaled to ~300px on the long edge → build a binary mask where `R>235 && G>235 && B>235` (near-white) → run the classic largest-rectangle-in-binary-matrix algorithm (per-row histogram + monotonic stack) to find the biggest axis-aligned white rectangle → translate back to normalized (0–1) coords on the original image.
- `cx`, `cy` = rectangle center. `size` = `0.9 * min(rectW, rectH) / imageWidth` (kept in template-width units to match existing schema). `confidence` = rect area / total image area; treat `<0.025` as "not detected".
- Pure client-side, no server work, ~20–60 ms per image.

**Upload integration** `src/components/share-kit/template-upload-dialog.tsx`
- After `loadImage` resolves for an item (existing flow that captures `width`/`height`), also call `detectQrSlot` and store `qrCx`, `qrCy`, `qrSize`, `qrDetected` on the `Item`.
- Render a badge per row using those flags.
- In `uploadOne`, replace the hard-coded `QR_DEFAULTS.*` with the detected values (or defaults when `qrDetected === false`).

**Admin re-detect**
- Add `redetectQrSlot(templateId)` UI in `src/routes/admin.advertisements.share-kit.tsx`: load the image via the existing signed URL, run `detectQrSlot`, and call the existing `upsertCustomShareKitTemplate` server function with the new `qr_cx/cy/size`.
- New "Auto-fit QR on all" button iterates over `customTemplates` with a small concurrency limit (4) and a toast progress counter.
- No DB migration needed — reuses existing `qr_cx`, `qr_cy`, `qr_size` columns.

**Existing manual editor untouched**
- The "Edit layout" slider stays as the fine-tune / fallback path for the rare image where detection picks the wrong rectangle.

## Out of scope

- Server-side detection / image processing (kept fully client-side for cost and simplicity).
- Detecting non-rectangular or rotated panels (the current flyers all use axis-aligned plates).
- Changing the QR's color or styling.