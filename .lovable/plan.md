## Header fixes (`src/components/site-header.tsx`)

### 1. Quick-link bar overlap
At the current viewport (~1162px) the desktop nav appears at `lg` (1024px) but the right-side action cluster (Currency, Help, Post a listing, Account/Sign up, menu) is too wide, so "Map / Shop" visually collide with the Currency pill and Post a listing button.

Fix:
- Promote the desktop nav from `lg:flex` → `xl:flex` (and the mobile menu trigger from `lg:hidden` → `xl:hidden`) so the inline nav only appears when there's actually room. Between `lg` and `xl` users get the hamburger sheet (which already lists every link).
- Tighten the right cluster gap (`gap-1.5 sm:gap-2` → keep, but drop the now-removed Currency switcher — see #3).
- Reduce nav inner gap from `gap-1` plus `px-3` to `px-2.5` so it still fits comfortably at `xl`.

### 2. Sign up → Sign in / Sign up combined control
Replace the single "Sign up" outline button (lines 186–188) with a two-button group for guests on desktop:

```text
[ Sign in ]  [ Sign up ]
```

- "Sign in" → `variant="ghost"` linking to `/login`
- "Sign up" → `variant="outline"` linking to `/signup`
- Wrapped in a `hidden md:flex items-center gap-1` container so both appear together on desktop and the mobile sheet (which already has both) stays unchanged.

### 3. Currency control: header → profile only
The profile page already has a `CurrencyPreferenceCard` (built last round) that writes to the same `useCurrency()` store, so every listing already reflects the chosen currency via `<ListingPrice>`. The header switcher is now redundant and contributes to the overlap.

Fix:
- Remove the `<CurrencySwitcher />` block from the desktop header (lines 108–110).
- Remove the `<CurrencySwitcher />` block from the mobile sheet (lines 264–266).
- Keep `CurrencySwitcher` component file untouched (still used in profile preview indirectly via the same context; component itself isn't removed in case it's reused).
- No change to `ListingPrice` — it already reads from `useCurrency()` which is fed by the profile setting (or localStorage default `PHP` for guests).

### Out of scope
- No changes to `ListingPrice`, currency context, listing pages, or profile page — the wiring is already correct from the previous round.
- No backend or schema changes.

## Files touched
- `src/components/site-header.tsx` — nav breakpoint bump, Sign in/Sign up pair, remove header CurrencySwitcher (desktop + sheet).
