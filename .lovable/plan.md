# /sell — clarify the "Listing details" attribute sections

## What's actually happening
The fields the user is questioning are not a buyer search/filter form leaking into the post-listing flow. They are the seller's own **category attribute pickers** (e.g. for `category=parts`: part type, fitment, brand). The copy mentions that buyers will use them to filter results on the marketplace, which makes it read as if a buyer-filter form is embedded in the form.

Two confusing strings in `src/routes/sell.tsx`:
1. Line 1715 (H3): `{CATEGORY_LABEL_MAP[category] ?? "Details"} — buyers filter by these`
2. Line 1251 (helper paragraph above service `TagPicker`): `Pick everything that applies — buyers filter by these tags.`

No other "buyer filter" UI is rendered inside the seller form.

## Change

Rename the section heading and demote the buyer-filter mention to a small muted hint that sits *below* the heading, not inside it. Wording will make clear these are the seller's listing details.

### Section heading (line ~1715)
Before:
```
Parts — buyers filter by these
```
After:
```
Parts details
```
With a small `text-[11px] text-muted-foreground` line under it:
```
These attributes help buyers find your listing in search and filters.
```

Same treatment applies to every attribute category (uses `CATEGORY_LABEL_MAP[category] ?? "Details"`), so result becomes `<Label> details` consistently.

### Service tag helper (line ~1251)
Before:
```
Pick everything that applies — buyers filter by these tags.
```
After:
```
Pick everything that applies. These tags help buyers find your service.
```

## Out of scope
- No functional changes, no field changes, no validation changes.
- No styling/density changes beyond the new helper line.
- "Buyers message you directly", "Reach buyers across the Philippines", and the textarea placeholder "Tell buyers what makes this listing stand out…" stay — they correctly address the seller.

## Files touched
- `src/routes/sell.tsx` (two string edits + one added helper paragraph)
