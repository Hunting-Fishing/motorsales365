## Scope
Update the "Coming soon" partner-services section on the listing detail page (`src/routes/listing.$id.tsx`).

## Changes
1. **Remove per-row badges** — Delete the "Soon" pill from each service row; keep only the header-level "Coming soon" badge.
2. **Orange caution styling** — Change the section container from `bg-card`/`border-border` to a light amber/orange background and border (e.g. `bg-amber-50`, `border-amber-200`, with dark-mode equivalents). Add a caution icon (`AlertTriangle` or `Construction` from lucide-react) beside the header badge.
3. **Text fit & professionalism** — Verify all labels wrap cleanly without overflow (`break-words`, adequate line-height). Keep the header text and subtext readable at current sizes.
4. **Subtext cleanup** — Keep the current "Sweet! These will be Awesome Future Services!" copy (already concise).

## Technical details
- Edit only `src/routes/listing.$id.tsx` lines ~950–1003.
- Use Tailwind amber/orange semantic utilities (not hardcoded hex) for theming consistency.
- No backend or business-logic changes.