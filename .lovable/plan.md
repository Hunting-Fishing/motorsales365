On the /dispatch page, add a side-by-side comparison table that maps every feature row against the three tiers so a visitor can instantly see what is included at Starter, Pro, and Fleet.

### What will be built
- A clean feature-comparison table section placed below the existing pricing cards on `/dispatch`.
- Rows cover: Directory listing, Dispatch inbox (web + PWA), Alerts (email / in-app / SMS+push), Job volume, Regions / drivers, Priority queue placement, Accept/decline + auto-route, Public profile badge, GPS live tracking, Multi-branch accounts, White-label customer link, API + webhooks.
- Each row shows a green check or a dash for the tier that does / does not include it.
- The table will be responsive: desktop = full grid; mobile = stacked cards or horizontal-scroll.

### Technical details
- Edit only `src/routes/dispatch.tsx`.
- Reuse existing design tokens (`border-border`, `bg-card`, `text-muted-foreground`, `text-primary`, `font-display`, etc.) and shadcn primitives already imported.
- No backend changes; features are hardcoded to match the already-listed perks in the pricing cards.
- Add an in-page anchor (e.g., `#compare`) and a small "Compare all features" link/button near the pricing cards that scrolls to the table.

### Out of scope
- No changes to Stripe products, database schema, checkout flow, or `/pricing`.
- No new pages or routes.