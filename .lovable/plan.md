## Goal
1. Make City/Province sortable in the franchise admin queue via a single "Location" header that cycles through four states.
2. Add "Franchise queue" navigation entries in the admin sidebar, top navbar (admin dropdown + mobile), user avatar menu, and admin dashboard.

## Changes

### 1. Sortable Location header — `src/routes/admin.franchise.tsx`
- Extend the sort cycle so clicking the "Location" header cycles:
  `province ↑ → province ↓ → city ↑ → city ↓ → province ↑ …`
- Update `SortHeader` (or add a small `LocationSortHeader` variant) to accept multiple `SortField`s and drive the 4-step cycle. Show the active field + arrow (e.g. `Province ▲`, `City ▼`) so the user can see which sub-field is active.
- Keep server params (`sortField`, `sortDir`) unchanged — `city` and `province` are already valid `SortField`s in `adminListApplications`.
- Preserve existing single-field behavior for the other headers (Business, Contact, Tier, Status, Applied).

### 2. Navigation entries — add "Franchise queue" link to:

**a. Top navbar (`src/components/site-header.tsx`)**
- Desktop admin section (~lines 585–596, inside `{isAdmin && …}`): add a `<Link to="/admin/franchise">Franchise queue</Link>` menu item next to "Sales reps" / "Admin console".
- Mobile menu admin block (~lines 940–955): mirror the same link.

**b. User avatar menu (`src/components/site-header.tsx`)**
- Near the existing "Franchise status" item (line 607), add "Franchise queue" gated on `isAdmin` so only admins see it.

**c. Admin dashboard (`src/routes/admin.index.tsx`)**
- The dashboard already links to `/admin/franchise` (line 158). Raise its visibility: promote it to a top-row primary card (or add a badge showing pending count reused from the existing Site Health card) so it's discoverable without scrolling.

**d. Admin sidebar**
- Check for an existing admin sidebar component. If one exists (e.g. `src/components/admin/*sidebar*`), add/confirm a "Franchise queue" item with an icon (e.g. `Store` from `lucide-react`) that highlights when the route matches `/admin/franchise`. If no sidebar component exists yet, skip this sub-item (the top navbar + dashboard + avatar menu cover discovery) rather than introducing a new layout.

## Out of scope
- No changes to server functions, RLS, or the sort logic in `adminListApplications` (city/province are already supported).
- No changes to other admin tables or unrelated queue behavior.
