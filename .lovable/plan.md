## Goal
Turn the long single-card "List your business" form (`src/routes/businesses.submit.tsx`) into a polished, tabbed multi-step experience. Keep **every existing field, validation rule, upload, geocode flow, services table, tag picker, hours editor, and submit logic** — only the layout, navigation, and visual polish change.

## Tab structure
Five tabs, in this order, rendered as a horizontal stepper at the top (numbered pills + label, current tab highlighted, completed tabs get a check, click to jump). On mobile it scrolls horizontally; on desktop it sits as a sticky bar above the card.

1. **Basics** — Business name, logo upload, business type (with "+ Add" suggest dialog), tags (inline popular + Browse all dialog), brands carried (conditional), description.
2. **Services** — `ServicesTable` (unchanged).
3. **Contact** — Phone, Email, Website, Messenger.
4. **Location** — Street address, postal code, `LocationDrilldown`, "Find on map"/"Use my location" buttons, `LocationPicker`, lat/lng inputs.
5. **Hours & Review** — `WeekHoursEditor`, then a compact summary card (name, type, # tags, # services, city, has-hours), feedback link, and the **Submit for review** button.

Each tab has a footer row with `Back` / `Continue` buttons. The final tab swaps `Continue` for `Submit for review` (same `submit()` handler, same disabled/loading state, same toasts, same navigate-on-success).

## Validation surfacing
- Required-field checks stay in `submit()` exactly as today (name, type, at least one open day).
- Add lightweight per-tab "completeness" indicators (green check on the tab pill) computed from existing state — purely visual, never blocks navigation between tabs.
- The "Claim a business" callout card stays above the tabs, unchanged.

## Visual polish (no new dependencies)
- Wrap the page in a soft gradient background band behind the card (using existing `--primary` / `--muted` tokens, no hardcoded colors) for a more premium feel.
- Card gets a slightly larger radius, subtle ring, and section headings inside each tab with a one-line helper sentence.
- Inputs/labels keep current shadcn styling; tighten spacing and group related fields with subtle dividers.
- Logo block becomes a friendlier dashed drop-zone-style tile (still uses the same `onLogoChange` handler — no drag-drop logic added, just better visuals around the existing file input).
- Sticky bottom action bar on mobile so `Back`/`Continue`/`Submit` is always reachable.
- All colors via semantic tokens in `src/styles.css` (no `text-white`, no `bg-[#...]`).

## What does NOT change
- No schema/db/server-function/route changes.
- No change to `submitBusiness`, `saveBusinessServices`, tag fetching, PSGC resolver, geocode endpoints, dynamic meta/JSON-LD, or auth gating.
- No change to `ServicesTable`, `LocationDrilldown`, `LocationPicker`, `WeekHoursEditor`, `PhoneInput`, or the tag-browser dialog component contents.
- Route path, SEO `head()`, and the existing "Claim a business" CTA remain.

## Files
- `src/routes/businesses.submit.tsx` — restructure JSX into tabs + stepper + review summary; add small local `Stepper` and `ReviewSummary` components in the same file (kept private to avoid new files unless needed).

## Open question
None blocking — confirming you want the **stepper-style numbered pills** look (vs. plain shadcn `<Tabs>`). If you'd rather have the standard tab bar look, say the word and I'll use shadcn `Tabs` instead.