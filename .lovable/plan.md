## Goals

1. Stop wiping the signup form when the user changes account type (e.g. switching to/from Tow & Recovery).
2. Require a confirm-password field that must match before submission.

## Changes (all in `src/routes/signup.tsx`)

### 1. Don't wipe state on intent change

- Remove the `useEffect` that resets `businessKind` whenever `intent` changes (lines 244–247).
- Instead, only clear `businessKind` when the new intent's `BUSINESS_KIND_OPTIONS` list does not contain the currently-selected kind (i.e. the previous value is invalid for the new category). Personal/customer intents stay as-is — `isBusinessLike` already gates whether the field is rendered/submitted, so the stored value is harmless when hidden and is preserved if the user toggles back.
- All other fields (name, email, phone, address, location, password, agreed, ref code) are already independent of intent and will naturally persist across the switch.

### 2. Confirm password field

- Add state: `const [confirmPassword, setConfirmPassword] = useState("")` and include it in the `stashPendingProfile` restore/save round-trip so it survives the verify-email round-trip too.
- Render a new `<Input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password">` directly below the existing password field, with the same show/hide toggle behavior (single toggle controls both).
- Validation in the existing `Issue[]` builder:
  - If `confirmPassword` is empty → `{ field: "confirm-password", label: "Confirm password", message: "Re-enter your password." }`.
  - Else if `confirmPassword !== password` → `{ field: "confirm-password", message: "Passwords do not match." }`.
- Add `confirm-password` to the touched-field tracking and `errorFor` / `invalidCls` wiring so the inline error appears on blur and on submit, matching the pattern already used for `password`.
- Include `confirmPassword` in the dependency array of the validation `useMemo` so the error clears live as the user types.

### 3. No other behavioral changes

- Submit flow, server call, redirect, and "already registered" handling are unchanged.
- No backend / server-fn changes.
