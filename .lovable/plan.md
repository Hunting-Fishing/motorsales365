## Goal
Cut scrolling on `/sell` by turning the Details tab's stacked sub-sections into a collapsible accordion, without hiding any inputs or changing form logic.

## Scope (Details tab only, for this pass)
The Details tab in `src/routes/sell.tsx` currently renders 6 stacked `<h3>` sub-sections in one long scroll:

1. Listing (title, category, condition, registration)
2. Price (price, negotiable, currency)
3. Vehicle (VehiclePicker, VIN, mileage, transmission, fuel)  — car/motorcycle/truck only
4. Category attributes (`CategoryAttributesEditor`) — car/motorcycle/equipment/boat/airplane
5. Condition & quality (`VehicleQualityFields`) — vehicle categories
6. Description

The other tabs (`location`, `plan`, `media`) already fit on one screen — leave them as-is.

## Changes

### 1. Wrap sub-sections in shadcn `Accordion`
- Use existing `@/components/ui/accordion` (Radix-based, already in the project).
- `type="multiple"` so users can open more than one; `defaultValue` opens the two most-important groups on first render:
  - `["listing", "vehicle"]` for vehicle categories
  - `["listing", "price"]` for non-vehicle categories
- Persist open state in `sessionStorage` under `sell:details:open` so navigating away and back doesn't collapse everything.

### 2. Header design
Each `AccordionTrigger` shows on one line:
- Section title (was `<h3>`, keep same copy and uppercase style)
- Right-aligned compact status: filled-field count (e.g. `4/6`) plus a red dot when a required field in that group is empty and the user has already tried to publish.

That means the user can see completeness without expanding each group. Reuse the counting logic already in `VehicleQualityFields` (`completeness.filled / completeness.total`) and add trivial counters for Listing / Price / Vehicle / Description (count non-empty controlled values already in state).

### 3. Validation-driven auto-open
On publish failure (existing `handleSubmit` error path), if any required field is empty, force-open the offending accordion item(s) and scroll the first one into view. Hook into the current per-field error state; no new validation rules.

### 4. Keep tab shell intact
Do not replace the top-level `activeTab` tabs (`details / location / plan / media`) — only the interior of the `data-tab="details"` section becomes an accordion. This preserves the existing publish flow, mobile step nav, and the `.hidden` toggling.

### 5. Non-goals
- No change to `src/routes/listing.$id.edit.tsx` this turn. If the pattern lands well, the same wrapper can be lifted into a shared component in a follow-up.
- No schema, RLS, or server-function changes.
- No copy changes; same labels, same field order inside each group.
- No change to the Photos/Video, Location, or Plan tabs.

## Technical notes
- File touched: `src/routes/sell.tsx` only.
- New import: `Accordion, AccordionItem, AccordionTrigger, AccordionContent` from `@/components/ui/accordion`.
- Trigger styling override: `py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline` so headers match the current `<h3>` visual weight.
- Content padding: `pt-1 pb-2` to keep the tightened spacing from the previous pass.
- Each `AccordionItem` gets a stable `value` (`listing`, `price`, `vehicle`, `attributes`, `quality`, `description`) used for both defaults and the auto-open-on-error map.

## Verification
- Typecheck.
- Load `/sell` as `car`, `motorcycle`, `parts`, `carwash`, `service`: correct groups appear, none duplicated, defaults open as specified.
- Collapse all → Details tab is < 200 px tall (just headers + Publish bar); expand each and confirm every previously visible field is still present and editable.
- Trigger a publish with empty required fields: the accordion containing the first missing field auto-opens and scrolls into view.
- Reload after collapsing a group → collapsed state persists via `sessionStorage`.
- Screenshot desktop + mobile before/after; target another ~30–40 % vertical reduction on first paint of the Details tab.
