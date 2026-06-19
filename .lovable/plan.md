## Goal
Restrict admin-only UI in the site header to users whose real role is `admin`. Non-admin staff (sales, moderator, support, advertising) keep only the controls their role actually grants.

## Problem
In `src/components/site-header.tsx`, two admin-only controls are gated by `isStaff` instead of `isAdmin`, so any staff role currently sees:
- The "Admin" portal button (line 243) — links to `/admin`
- The "View as: …" seller-type simulator (line 259) — admin-only debug tool

The "Role simulator" already correctly uses `realIsAdmin`.

## Changes

### `src/components/site-header.tsx`
- Line 243 (desktop Admin button): change `{user && isStaff && (` → `{user && isAdmin && (`.
- Line 259 ("View as:" seller-type dropdown): change `{user && isStaff && (` → `{user && realIsAdmin && (`. Use `realIsAdmin` (not `isAdmin`) so the control disappears when an admin simulates a non-admin role, matching the existing Role simulator gate on line 296.

### Leave as-is (already role-correct)
- Lines 443–489 (desktop avatar menu) and 755–811 (mobile sheet): the `isStaff` group header is fine because the inner items are already gated — `isSales` shows lead/referral/performance links, `isAdmin` shows "Manage sales reps" and "Admin console". Non-admin sales reps see only their own items.
- Line 296 Role simulator: already gated by `realIsAdmin`.

## Out of scope
No changes to route-level guards (`/admin/*` already protected server-side), no changes to permissions logic in `useAuth`, no backend changes.

## Files
- `src/components/site-header.tsx` — two one-line gating changes.
