# Smart AI QR auto-fit

Replace the brittle "largest white rectangle" heuristic with a Gemini vision agent that reads each flyer and returns the exact Scan Here panel — per template, in one step, with built-in readability validation. Removes the manual "Apply placement to all" workflow you didn't want.

## What changes for you

- One toolbar button: **Smart auto-fit (AI)** — processes every custom template through the vision model in one batch.
- Per-card **Smart fit** button replaces the old Auto-fit / Apply-to-all pair.
- Live progress toast: `Smart-fitting 12 / 53 — 11 placed, 1 needs review`.
- Each result is auto-validated against the readability thresholds (module size + contrast) and flagged on the card if the AI placement is borderline.
- Removed: the "Apply placement to all" button (wrong solution — flyers have Scan Here panels in different physical locations).

## How it works (technical)

**New server function** `detectScanHereWithVision` (`src/lib/share-kit-vision.functions.ts`):
- Uses Lovable AI Gateway via the existing `createLovableAiGatewayProvider` helper.
- Model: `google/gemini-2.5-flash` (vision-capable, fast, cheap — ~50 calls is well within budget).
- Sends the signed image URL + a tight prompt asking for the QR target panel bounding box.
- Uses AI SDK `generateText` with `Output.object` + Zod schema:
  ```
  { found: boolean, cx: number, cy: number, width: number,
    height: number, confidence: number, reasoning: string }
  ```
  Coords are normalized 0–1. Server converts width/height to the square QR `size` (= min/template-width with the existing inset).
- Prompt is anchored on the visible "SCAN HERE" / "Scan Me" label, ignores brand logos, decorative white space, vehicle bodies, etc.
- Returns `null` when `found=false` or `confidence < 0.6` so the caller can fall back to the existing heuristic detector.

**Updated admin route** `src/routes/admin.advertisements.share-kit.tsx`:
- Replace `autoFitOne` with `smartFitOne` which:
  1. Calls the vision agent.
  2. Falls back to `detectQrSlotFromUrl` if AI returns null.
  3. Clamps with the existing guardrails (min readable size, inside-rect inset).
  4. Persists via `updateShareKitTemplateQrPlacement`.
  5. Runs `assessQrReadability` and returns `{ source: 'ai'|'heuristic'|'none', readable, reasons }`.
- Replace both existing buttons ("Auto-fit QR" per card, "Auto-fit QR on all", "Apply placement to all") with a single **Smart fit** per card and **Smart auto-fit (AI)** in the toolbar.
- Bulk worker uses concurrency 3 (vision calls are heavier than canvas pixel scans).
- Final toast: `Smart-fit done — 48 AI-placed, 4 heuristic fallback, 1 manual review, 0 failed`.

**Upload dialog** `src/components/share-kit/template-upload-dialog.tsx`:
- After file selection, kicks off vision detection per image in the background (max 3 concurrent), updates the row badge from "Detecting…" → "AI-placed" / "Heuristic" / "Manual review".
- Already-detected placement is used at upload time so new flyers ship correctly without a follow-up admin pass.

**Schema/budget guardrails:**
- Schema is intentionally small (7 properties, no nested objects) to stay well under Gemini's structured-output state limit.
- Each request includes only one image; no batching inside a single model call (keeps token usage predictable and isolates failures).
- 429 / 402 errors surfaced as user-facing toasts per the AI gateway rules.

## What stays the same

- `detectQrSlot` heuristic — kept as a fallback when the AI is unavailable, throws, or returns low confidence.
- `assessQrReadability` thresholds (≥4 px modules, ≥3.5:1 contrast) — every AI placement still has to pass.
- Manual "Edit layout" slider — untouched; remains the last-resort fine-tune.
- `share_kit_layouts` per-user overrides — untouched.

## Out of scope

- Re-running the vision pass automatically on every new upload from non-admins (admins trigger the bulk action).
- Caching prior AI results — each Smart fit click is a fresh call, since admins typically run it once after bulk upload.
- Detecting rotated / non-rectangular panels.

## Files touched

- New: `src/lib/share-kit-vision.functions.ts` (server function + Zod schema + prompt)
- Edit: `src/routes/admin.advertisements.share-kit.tsx` (replace buttons + bulk worker)
- Edit: `src/components/share-kit/template-upload-dialog.tsx` (background vision pass on upload)
- No DB migration, no new tables, no new env vars (uses existing `LOVABLE_API_KEY`).
