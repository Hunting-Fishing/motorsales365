## Summary
Add a "Wanted" chip to the existing "Shop by category" row on the homepage, placed after "Other". No new row. Skip inspection, tow, export, and lead marketplace links.

## Changes
- `src/routes/index.tsx`: Insert a `<Link to="/wanted">` chip with the `Megaphone` icon immediately after the `VEHICLE_CATEGORIES.map()` output inside the "Shop by category" flex container.