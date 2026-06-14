# Fix AdminLayout hook-order crash

## Problem

`src/routes/admin.tsx` (AdminLayout) crashes with:

> Rendered more hooks than during the previous render.

The `useAdminPendingCounts(hasAccess)` call is on line 359, **after** two early `return` blocks (lines 324 and 332). On the first render `mfaState === "checking"` so the component returns early and never calls that hook. Once MFA resolves, the component renders past the early returns and calls one extra hook — React detects the mismatch and throws, which is what's blowing up `/admin`.

## Fix

Move the `useAdminPendingCounts(hasAccess)` call up so it runs on **every** render, before any conditional `return`. Hooks must always be called in the same order.

Concretely, in `src/routes/admin.tsx`:

1. Delete the `const { data: pendingCounts } = useAdminPendingCounts(hasAccess);` line currently at line 359.
2. Re-add it near the top of `AdminLayout`, right after the other top-level hooks (e.g. just after the `useEffect` block that ends around line 316, and before the `if (loading || !user …)` early return on line 324).

The hook itself already accepts an `enabled` flag, so passing `hasAccess` continues to gate the actual network call — it just needs to be **called** unconditionally.

No other files need to change. No behavior change beyond fixing the crash.

## Verification

- Reload `/admin` — the "Something went wrong / Rendered more hooks…" error boundary should be gone.
- Sidebar / bell badges should still show pending counts for staff users, and stay at 0 / disabled for non-staff (since `enabled={hasAccess}` still gates the query).
