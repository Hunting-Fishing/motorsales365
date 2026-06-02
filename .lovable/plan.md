## Next repair to tackle

Pick one of the two remaining items from the prior shortlist (partial-day exceptions is done):

### Option A — Swap `window.confirm` → `AlertDialog`
Replace native `confirm()` calls across business/verification/dashboard flows with shadcn `AlertDialog`. Native dialogs are inconsistent with the rest of the UI, not styleable, and on mobile they look like a browser warning rather than an app action.

- Find call sites: `rg "window\.confirm\(|\bconfirm\(" src/`
- For each, replace with an `<AlertDialog>` driven by local state (`pendingAction`) — title, description, destructive `AlertDialogAction`, cancel.
- Most-used spots: archive/restore business, delete ride, cancel booking, revoke team invite, delete exception in bookings tab.
- No business-logic change; pure presentation.

### Option B — Remove dead `private_seller` paths
Signup now forces business/staff accounts, so any branch keyed on `account_type === "private_seller"` is unreachable. Strip:

- Conditional UI in dashboard, profile, listing forms.
- Server-fn guards that allow `private_seller`.
- Types/enums and data fixtures that still list it.
- Keep DB column untouched (existing rows may have it) — just stop branching on it in code and document the deprecation in a code comment.

Risk: higher than Option A — touches business logic, schemas, and several routes. Needs careful grep + manual smoke test of signup → submit flow.

### Recommendation
**Option A (AlertDialog swap)** — smaller blast radius, immediate UX win on mobile (current viewport is 360px wide where native `confirm()` looks worst), no server changes, no migration. Option B is worth doing but should be its own focused pass.

Which one should I implement?
