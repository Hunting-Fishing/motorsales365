## Goal

When a user is selecting a vehicle Make or Model and what they want isn't in our database (e.g. "Ford", "Supra"), let them type it in and add it on the spot. As they type, our list should smart-filter — typing "F" only shows makes starting with/containing F; typing "S" only shows matching models; more letters = tighter results.

## Current state

`src/components/vehicle-picker.tsx` already:
- Renders Year / Make / Model as combo boxes with type-ahead.
- Uses `fuzzyScore` (prefix → substring → edit distance) so each keystroke narrows results.
- Has an "Add missing make / Add model" action — but it's hidden at the **bottom** of the list and only appears in `CommandEmpty` when there are zero matches. Users typing "Ford" while we still have a partial match (or scrolling past results) often miss it.
- Has an "Other / not in list" escape hatch that swaps to three free-text inputs.

So the smart-search behavior the user describes already works; the real gap is **discoverability of "add custom"** while results are still showing.

## Changes

### 1. `src/components/vehicle-picker.tsx` — promote the Add action

- Move the "Add `{trimmed}`" `CommandItem` from the bottom of the list to a **sticky group at the top** of `CommandList`, shown whenever the user has typed something that isn't an exact match (regardless of whether other results are visible).
- Keep the same affordance inside `CommandEmpty` for the zero-results case, styled in primary color.
- Remove the now-redundant bottom Add group + `CommandSeparator`.
- Keep `getKeywords` (aliases) wired so "chevy" still surfaces "Chevrolet" before the Add prompt.

Result: typing "For" with Ford absent shows matching makes (if any) and a top "Add missing make: 'For'" row. Typing "Supra" under Toyota with Supra absent shows matching models plus a top "Add model: 'Supra'" row. Pressing Enter on the Add row commits the typed value into the form.

### 2. Copy tweaks

- Change the helper text under the picker to mention the new behavior:
  "Can't find your vehicle? Just type it — we'll add it to your listing."
- Keep the existing "Other / not in list" link as a fallback for users who want all three fields free-text.

## Out of scope

- No database/schema change. Custom values are still stored as plain text in `listings.attributes` (year/make/model) the same way the picker already commits them.
- No global "submit new make to catalog" workflow — that would be a separate admin moderation feature.

## Files to edit

- `src/components/vehicle-picker.tsx` (only file)

## Technical notes

- `Command` from cmdk re-runs the custom `filter` on every keystroke, so smart-search narrowing is automatic — no extra logic needed.
- `showAdd = trimmed.length > 0 && !exactMatch` already gates the Add action correctly; we only change where it renders.
- Sticky positioning uses `sticky top-0 z-10 bg-popover` inside the scrollable `CommandList` so the Add row stays visible while the user scrolls long lists.
