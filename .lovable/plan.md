
# /sell cleanup plan

Goal: turn the 2,183-line monolithic form into a guided, mobile-friendly wizard with less visual noise, clearer errors, and a calmer plan/boost step. Parts ships first as the pilot; the shared shell then wraps the other 13 categories without rewriting their fields.

## Phase 1 — Shared wizard shell (foundation)

Build the chrome once, reuse everywhere.

- New `src/components/sell/sell-wizard.tsx` — a 5-step shell:
  1. **Category** (skipped if `?category=` is in the URL)
  2. **Basics** (title, price, condition, photos primary upload)
  3. **Details** (category-specific fields)
  4. **Location & contact**
  5. **Review & publish** (with plan picker collapsed inline)
- Sticky mobile bottom bar with `Back` / `Next` / step indicator (1 of 5).
- Each step shows only the fields it owns; a single "Show optional fields" toggle hides anything not required to publish.
- Per-step validation: `Next` is enabled only when the step is valid; if disabled, a tooltip + small list under the button names what's missing (fixes "validation unclear").
- Progress saved to `sessionStorage` keyed by category so a refresh doesn't lose work.

## Phase 2 — Parts pilot (current screen)

Apply the shell to `category=parts` first.

- **Basics step**: Title, price, condition, OEM/Aftermarket, primary photo.
- **Details step**:
  - Required: Part type, brand, fits (vehicle picker).
  - Optional (collapsed): Stock qty, OEM part #, warranty days, fitment rows.
- **Location step**: Region/province/city + map picker, with contact phone underneath.
- **Review step**:
  - Summary cards of each step (tap to jump back).
  - Plan picker as 3 simple cards (Free / Standard / Upgraded) with one-line value props; boost moved to a "Boost after publishing?" toggle that defers to a post-publish dialog (fixes "plan & boost overwhelming").

## Phase 3 — Roll shell to other categories

Once Parts is validated, wrap each existing category block (car, motorcycle, towing, carwash, repair, bodyshop, salvage, drone, boat, airplane, equipment, used_part, other) in the same wizard. The category-specific JSX moves into the `Details` step as-is — no field logic changes, only layout and progressive disclosure.

- Cars/motorcycles: keep `VehicleQualityFields` + `CategoryAttributesEditor`, but split "Quality" into its own collapsible block under Details.
- Service categories (towing, carwash, repair, bodyshop): group hours/coverage/payments under a "Service details" disclosure.

## Phase 4 — Copy + density pass

- Strip duplicate help text; move long descriptions into popovers.
- Shorten labels (e.g. "Mileage (km)" → "Mileage"; unit shown as suffix inside the input).
- Tighten vertical rhythm: `space-y-4` → `space-y-3`, card padding `p-6` → `p-4` on mobile.
- Larger tap targets on mobile (min 44px), bigger radio cards for category/plan.

## Phase 5 — Visual direction

Per your pick, I'll capture the current `/sell?category=parts` screen and generate 3 rendered design directions (palette/typography/layout locked from your follow-up answers, varying composition and density). You pick one, I apply it to the shell only — fields stay the same.

## What does NOT change

- Submit logic, `submitListing` server function, uploads, pricing, boost products, plan limits, auth gating, SEO `head()`, ride prefill, VIN scan, fitment editor data shape.
- All existing validation rules (Zod schema, vehicle quality issues) — only their presentation.

## Technical notes

- New files:
  - `src/components/sell/sell-wizard.tsx` (shell, step state, sticky bar)
  - `src/components/sell/steps/basics-step.tsx`
  - `src/components/sell/steps/details-step.tsx` (renders category-specific block as children)
  - `src/components/sell/steps/location-step.tsx`
  - `src/components/sell/steps/review-step.tsx`
  - `src/components/sell/plan-picker-compact.tsx`
  - `src/components/sell/post-publish-boost-dialog.tsx`
- `src/routes/sell.tsx` shrinks to: state hooks + submit handler + `<SellWizard category={category}>{categoryFieldsForCategory}</SellWizard>`. Target ~500 lines.
- No DB changes, no server-function changes.

## Rollout order in build mode

1. Build shell + Parts wizard end-to-end, ship behind same route (no flag — it replaces inline form for parts only first).
2. Capture screenshot → design directions → you pick → apply to shell.
3. Wrap remaining categories one batch at a time (cars + motorcycles, then services, then long-tail).
4. Density/copy pass across all categories.

Ask before I start: any category you want me to skip the wizard for (e.g. keep "Other" as a single flat form)?
