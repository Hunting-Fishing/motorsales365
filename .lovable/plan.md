## Goal

On `/signup`, the three account-type tabs are visible but unresponsive for several seconds. Make them hydrate and respond immediately, without changing any signup logic or visual design.

## Diagnosis

`src/routes/signup.tsx` (1153 lines) is one big component. It statically imports a lot of heavy code that has nothing to do with picking an account type:

- `LocationPicker` → pulls in `src/lib/psgc.ts` → **`src/data/psgc.json` (~47 KB)** plus Command/Popover UI
- `PhoneInput` → pulls in `src/data/country-codes.ts` (~350 lines of country/dial data)
- `BUSINESS_KIND_OPTIONS` from `src/data/business-kinds.ts`
- Full form state, validation, and submit logic

All of that ships in the same route chunk, so React can't hydrate the segmented control until the entire bundle is parsed and executed. That's the "buttons visible but unresponsive" gap the user is seeing.

TanStack Router already code-splits the component per route, so the fix is inside `signup.tsx`: split the heavy sub-tree out of the initial chunk.

## Plan

Edit only `src/routes/signup.tsx` (frontend/presentation only, no logic change):

1. **Extract the form body into a separate component file** `src/components/signup/signup-form-body.tsx` containing everything that renders *below* the account-type segmented control: name pair, phone/email, password, location picker, business fields, terms checkbox, submit button, and their state/validation. It receives `intent` as a prop.
2. **Lazy-load it** in `signup.tsx` with `React.lazy(() => import("@/components/signup/signup-form-body"))` and render inside `<Suspense fallback={<FormSkeleton />}>`. The account-type radio group, header, and side panel stay in the critical route chunk so they hydrate immediately.
3. **Warm the chunk on idle** — after mount, call `requestIdleCallback(() => import("@/components/signup/signup-form-body"))` (with `setTimeout` fallback) so the lazy chunk is usually ready by the time the user picks a tab. Also warm on first `pointerdown`/`focus` of any account-type button as a belt-and-braces preload.
4. **Skeleton fallback** — a lightweight placeholder that matches the form's vertical rhythm so there's no layout jump when the real form swaps in.
5. **Keep the existing "disabled until intent chosen" behavior** — the wrapper that sets `opacity-50 pointer-events-none` when `!intent` moves into the lazy body unchanged.

No changes to:
- Auth flow, submit endpoint, or validation rules
- Copy, colors, spacing, or the segmented control markup
- `useAuth`, currency fetches, or any other global provider

## Verification

- Confirm the account-type tabs respond to clicks within the first paint (Playwright: navigate to `/signup`, immediately click "Buyer", assert `aria-checked="true"` within <500 ms of `domcontentloaded`).
- Check the built chunk graph: the initial `/signup` chunk should no longer contain `psgc.json` or `country-codes` — those should be in the lazy chunk.
- Visual diff: form looks identical after the skeleton swap.

## Out of scope

- The repeated `currencies` fetches in the network log (separate issue; not blocking signup interactivity).
- Any redesign of the account-type control or form layout.