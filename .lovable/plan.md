## Fix phone input proportions on /signup

Rebalance the `PhoneInput` component so the country selector is compact and the number field takes the remaining space.

### Changes
- `src/components/phone-input.tsx`
  - Shrink country trigger: `w-[130px]` → `w-[104px]`, reduce inner gap, keep flag + dial code visible, tighten right chevron padding.
  - Ensure the number `Input` fills remaining width (`flex-1 min-w-0`).
  - Bump placeholder to a fuller sample (`917 123 4567`) so the field looks appropriately sized.
  - No logic changes — same props, same `onChange` shape, same `formatNational` formatting, same country list.

### Verification
- Visual check on /signup at 1122px and mobile (<400px): country trigger stays on one line, number input is clearly the dominant field.
- `tsgo --noEmit` clean.
