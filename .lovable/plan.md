## Goal
Make the resend cooldown on `/forgot-password` unmistakable to users by adding a prominent countdown indicator and explicit disabled-state messaging.

## Current behavior
- Buttons swap label text to show `Resend in 0:45` or `Try again in 0:45` when disabled.
- No visual distinction between "disabled because input is empty" and "disabled because cooldown is active."
- Cooldown reason is implied, not stated.

## Changes

### 1. Prominent cooldown timer (Email + SMS)
Add a small dedicated countdown chip/badge above the primary button, visible only while the cooldown is active:
- Shows `Resend available in 0:45` with a `Timer` (or `Clock`) icon.
- Uses `text-muted-foreground` so it does not compete with alerts.

### 2. Explicit disabled reasons
When a button is disabled solely because of cooldown, append a subtle line of helper text beneath the button:
- "You can request another link once the timer ends."
- This distinguishes cooldown from validation errors.

### 3. Clearer button states
- **Initial request button** while cooldown active:
  - Keep text `Try again in 0:45` (already present).
  - Add `cursor-not-allowed` and ensure the existing shadcn `disabled:opacity-50` is visible.
- **Success-panel resend button** while cooldown active:
  - Keep text `Resend in 0:45`.
  - Use `variant="outline"` instead of `secondary` so the disabled state is visually flatter and less inviting.

### 4. Rate-limit helper text
When the cooldown was triggered by a 429/rate-limit error, show an additional inline warning:
- "Too many requests. Please wait before trying again."
- Already present as an Alert; keep it, but ensure the cooldown timer chip also appears so the user sees exactly how long to wait.

## Files to edit
- `src/routes/forgot-password.tsx` — add cooldown timer chip, helper text, and refine button variants during cooldown.

## No new dependencies
Uses existing `lucide-react` icons and shadcn components.
