## Goal
Make the Specifications grid read top-to-bottom by column, with a fixed left-column order and an importance-ranked right column.

## Order

**Left column (in order):**
1. Mileage (Km)
2. Year
3. Make
4. Model
5. Trim
6. Body Type
7. Transmission
8. Drivetrain
9. Fuel
10. Owner Status

**Right column (importance order):**
1. OR/CR Status
2. Accident History
3. Flood History
4. Registered Owner
5. Financing Available
6. Deed Chain Available
7. Inspection Available
8. Trade Accepted
9. ...any remaining attributes appended after

## Implementation
In `src/routes/listing.$id.tsx`, inside the Specifications `SectionCard`:

1. Build two ordered key lists (LEFT_KEYS, RIGHT_KEYS) matching common attribute key variants (`mileage_km`/`mileage`/`odometer`, `body_type`/`body`, `or_cr_status`/`orcr`, etc.).
2. From `specEntries`, pull entries matching LEFT_KEYS in order → `leftCol`. Pull RIGHT_KEYS in order → `rightCol`. Append any leftover entries to `rightCol`.
3. Pad the shorter column with `null` so both have equal length (keeps column-major rendering aligned).
4. Interleave for row-major CSS grid: build `ordered = []` where for each row i, push `leftCol[i]` then `rightCol[i]`. Skip nulls when rendering.
5. Keep existing `grid grid-cols-1 sm:grid-cols-2` + `SpecRow` rendering — interleaved order makes each grid row show [left, right] correctly.

No styling changes, no other files touched.
