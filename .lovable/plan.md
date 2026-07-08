# Mobile signup parity with new web layout

The new `/signup` (src/routes/signup.tsx) was tuned for desktop. Mobile still uses the desktop DOM with cramped tap targets, no hero context, and a submit button that requires scrolling past long forms (especially Business/Dealer + Service Provider). This plan brings the mobile experience up to the new web version, keeping a single source of truth.

## Scope

Only `src/routes/signup.tsx` (presentation). No changes to form logic, validation, attribution, server functions, or the DB.

## Changes

1. **Compact mobile hero (above form, hidden on `md:`)**
   - Replace the tiny logo+wordmark line with a slim navy hero card at the top of the form column:
     - Brand row (logo + "MotorSales").
     - One-line pitch: "Join the Philippines' trusted motor marketplace."
     - Inline 3-chip trust row: Verified inventory · Secure transactions · Nationwide reach (icons + short labels, no descriptions).
   - Desktop unchanged — still uses the full left navy panel.

2. **Segmented account-type control — mobile tuned**
   - Keep 3-way segmented control (same as web) but on mobile:
     - Increase height to `h-11` (44px min tap target).
     - Two-line labels allowed: primary label + tiny sublabel (e.g., "Buyer" / "& Private Seller", "Business" / "Dealer", "Service" / "Provider") so text no longer squeezes at 360px.
     - Selected state gets a stronger ring + navy text for legibility.
   - `sm:` and up revert to current single-line compact pills.

3. **Bigger touch targets across the form (mobile only)**
   - Inputs: `h-11` on mobile, current size at `sm:`.
   - Buttons (Create account, Google, region/province/city triggers, phone country selector): min `h-11` on mobile.
   - Increase base input font-size to `text-base` on mobile (prevents iOS zoom-on-focus), `sm:text-sm` above.
   - Section labels: bump from `text-[11px]` to `text-xs` on mobile.
   - Terms checkbox: enlarge hit area with `py-2` wrapper.

4. **Sticky submit on mobile**
   - Wrap Submit + Google buttons in a `sticky bottom-0` bar on mobile only:
     - `md:static md:p-0 md:bg-transparent md:border-0`
     - Mobile: `sticky bottom-0 -mx-4 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] bg-white/95 backdrop-blur border-t border-slate-200`
   - Keeps CTA reachable during long Business/Service Provider forms.
   - Add bottom padding to the form container so sticky bar doesn't cover the terms row.

5. **Spacing/scroll polish**
   - Outer container: drop `min-h-[720px]` on mobile (already `md:min-h-…`), and remove the extra card padding on phones (`p-3 sm:p-4 md:p-10`) so the form uses full width.
   - Section dividers (`border-t border-slate-100`) get `pt-3` on mobile so field groups breathe.
   - "Or register with" divider tightened on mobile.

6. **Header row**
   - "Create your account" stays `text-xl` on mobile; add "Step 1 of 1 — takes ~1 minute" subline (matches new web helpful microcopy on desktop) collapsed to a single line on phones.

## Out of scope

- No changes to validation, server calls, attribution payload, Google OAuth flow.
- No revival of the old numbered sections/large card layout — user chose "Same as new web, mobile-tuned".
- No changes to `AccountTypeGrid` component (still unused; leaving in place).

## Verification

- Visual: Playwright at 360×780 and 414×896 — screenshots of empty state, Business/Dealer selected (long form), and error state; confirm sticky CTA and no horizontal scroll.
- Interaction: tab through fields, ensure iOS no-zoom (font-size ≥16px) and 44px tap targets.
- Regression: existing smoke matrix + Playwright specs (`smoke:signup:matrix`, `test:e2e:signup`) still pass — no logic changed.

## Files touched

- `src/routes/signup.tsx` (single file, presentation only).
