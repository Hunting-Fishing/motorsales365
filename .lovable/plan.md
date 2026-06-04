## Share Kit QR Editor

Add an in-page editor to `/dashboard/share-kit` so staff can drag and resize their referral QR on every template, preview the result live, and have the layout saved per-user so downloads/shares always use their custom placement.

### UX

For each template card:
- New **Edit layout** button opens an inline editor panel (replaces the static preview).
- Editor shows the template at a scaled-down size with the composed QR overlaid as a draggable + resizable handle.
  - Drag anywhere on the QR to reposition (constrained to canvas bounds).
  - Corner handle to resize (min 8% of width, max 60%).
  - Live re-render of the caption position (caption stays anchored under the QR).
- Controls: **Save**, **Reset to default**, **Cancel**.
- Saving writes the new `{cx, cy, size}` to the database and re-renders the preview + any subsequent Download / Share / native-share / social-link export uses the saved values.
- Existing Download / Share / Copy / Facebook / WhatsApp buttons keep working unchanged — they just consume the saved overrides.

### Data

New table `share_kit_layouts`:
- `user_id uuid` (FK auth.users, on delete cascade)
- `template_id text`
- `cx numeric` `cy numeric` `size numeric` (all 0–1 relative)
- `updated_at timestamptz`
- PK `(user_id, template_id)`
- RLS: user can select/insert/update/delete only their own rows. Grants for `authenticated` + `service_role`.

### Server functions (new `src/lib/share-kit-layouts.functions.ts`)

- `listShareKitLayouts()` → returns `Record<templateId, {cx,cy,size}>` for current user. Uses `requireSupabaseAuth`.
- `upsertShareKitLayout({ templateId, cx, cy, size })` → validates with Zod (numbers in 0–1, size 0.08–0.6), upserts row.
- `deleteShareKitLayout({ templateId })` → reset to default.

### Client wiring

- `src/lib/share-kit/compose.ts`: extend `composeTemplate(template, ctx, overrides?)` so when an override exists, it replaces `template.qr.cx/cy/size` before drawing. No other template field changes.
- `src/routes/dashboard.share-kit.tsx`:
  - On mount, call `listShareKitLayouts` via `useQuery`; pass the layouts map into each `<TemplateCard>` as `override`.
- `src/components/share-kit/template-card.tsx`:
  - Accept `override?: {cx,cy,size}` and pass to `composeTemplate`.
  - Add `editing` state that swaps the static preview for a new `<TemplateEditor>` component.
  - When editor saves → call `upsertShareKitLayout` (TanStack mutation) → invalidate the layouts query → exit editor.
  - Reset button → `deleteShareKitLayout` → invalidate.
- New `src/components/share-kit/template-editor.tsx`:
  - Renders the base art via the same compose pipeline but WITHOUT the QR (new `composeBaseOnly` helper) at a scaled CSS size.
  - Renders the draggable QR as an absolutely-positioned `<img>` (data URL of QR only, generated once via `qrcode`).
  - Pointer-event handlers for drag (whole QR) and resize (bottom-right handle), with bounds clamping. Touch-friendly.
  - Emits `{cx, cy, size}` on Save.

### A11y

- Drag handle: `role="slider"` style is overkill; use keyboard arrows on a focused QR to nudge by 1% per arrow press, Shift+arrow by 5%. `+` / `-` keys to resize. `aria-label` describes current position.
- Buttons get visible labels (Edit layout / Save / Reset / Cancel).

### Out of scope

- Editing caption text or colors.
- Per-template QR styling (kept consistent).
- Sharing custom layouts across users / admin templates.
- Photo-based templates' caption box position (only QR is editable; caption follows QR).
- Terms / Privacy updates (no data-handling change beyond storing a layout preference; covered by existing account data section).

### Files

**New**
- `supabase/migrations/<ts>_share_kit_layouts.sql` (via migration tool)
- `src/lib/share-kit-layouts.functions.ts`
- `src/components/share-kit/template-editor.tsx`

**Edited**
- `src/lib/share-kit/compose.ts` (add override param + `composeBaseOnly`)
- `src/components/share-kit/template-card.tsx` (override, editor toggle, mutations)
- `src/routes/dashboard.share-kit.tsx` (load layouts, pass overrides)
