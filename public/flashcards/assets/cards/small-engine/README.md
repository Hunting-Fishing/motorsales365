# Card art — Small Engines

Card images for the **Small Engines** category, organized by system.
Drop each card's art into the subfolder for its system, named by the card id:

```
<card-id>-front.png    front face   (recommended)
<card-id>-back.png     back face    (recommended)
<card-id>.png          combined (front left / back right) — auto-split
```

Then run `node tools/build-index.js`. Art is auto-detected by card id no matter
which subfolder it sits in, so the folders are purely for keeping things tidy.

## System folders
- `engine-mechanical/` — Engine Mechanical
- `cooling/` — Cooling System
- `lubrication/` — Lubrication
- `fuel/` — Fuel System
- `ignition/` — Ignition
- `air-intake/` — Air & Intake
- `exhaust-emissions/` — Exhaust & Emissions
- `electrical/` — Electrical
- `diagnostics/` — Diagnostics & Tools
- `safety/` — Safety & Shop
