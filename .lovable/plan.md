## Goal
Bring the `/parts` wizard's taxonomy up to industry standard by adopting the **complete Car-Part.com part-name list** (the de-facto standard used by every salvage yard in North America and widely mirrored in Asia), and clean up the miscategorizations (fuel injector currently sits under "Cooling & Fuel" instead of a Fuel system).

## Source
Pulled live from https://www.car-part.com/advsearch.htm — the `userPart` dropdown contains **~295 canonical part names** (A/C Assembly … Wiring Harness/Misc. Electric). This is the same list yards use for inventory tagging, so listings will line up with how sellers think.

## Scope

### 1. Rewrite `src/data/needed-parts-catalog.ts`
- Keep the existing types (`NeededPartOption`, `NeededPartGroup`) and exported names (`NEEDED_PARTS_GROUPS`, `NEEDED_PARTS_INDEX`, `USED_PARTS_GROUPS`) — no consumer changes.
- Replace the 10 current groups with **15 systems**, each populated from the Car-Part.com list:

  1. **Engine** — Engine, Engine Block, Cylinder Head, Camshaft, Crankshaft, Timing Cover, Valve Cover, Oil Pan, Harmonic Balancer, Flywheel/Flex Plate, Intake/Exhaust Manifold, Turbocharger/Supercharger, Intercooler, Vacuum Pump, etc.
  2. **Fuel System** — Fuel Pump, Fuel Tank, Fuel Injector Pump, Fuel Distributor, Carburetor, Throttle Body. *(fixes the "fuel injector under cooling" bug)*
  3. **Cooling** — Radiator, Radiator Core Support, Cooling Fan (Rad & Con), Fan Blade, Fan Clutch, Water Pump, Heater Core, Oil Cooler, Auto Trans Cooler, A/C Condensor.
  4. **A/C & Heater** — A/C Assembly, Compressor, Evaporator, Hose, Heater Assy/Motor, Heater/AC Control, Blower Motor.
  5. **Transmission & Drivetrain** — Transmission, Transfer Case, Torque Converter, Bellhousing, OD Unit, Trans Pan, Trans Computer, Clutch Master/Slave, Drive Shaft F/R, Differential, Carrier, Ring & Pinion, Axle Assy/Shaft/Housing, Hub, Lockout Hub.
  6. **Brakes** — Caliper, Rotor F/R, Master Cylinder, Power Brake Booster, ABS Computer, ABS Pump, Brake Lines.
  7. **Suspension & Steering** — Control Arms (F/R, U/L), Strut, Knee, Knuckle, Spindle, Coil Spring, Leaf Spring F/R, Shock Absorber, Stabilizer Bar, Steering Rack/Box, Steering Column, Power Steering Pump/Assy, Rear Suspension/Trailing/Locating Arms.
  8. **Wheels & Tires** — Wheel, Tire, Hub Cap/Wheel Cover.
  9. **Body — Exterior Panels** — Hood, Hood Hinge, Fender, Fender Ext, Inner Panel, Quarter Panel/Ext/Repair, Roof, Roof Panel, Cowl, Cab, Cab Clip, Rocker Moulding, Header Panel, Rear Body Panel, Rear Finish Panel, Frame, Frame Sections, Front End/Nose, Rear Clip, Pillar.
  10. **Bumpers & Trim** — Bumper Assy F/R, Reinforcement F/R, Bumper Guard, Bumper Shock, Spoiler F/R, Valence, Grille, Mouldings, Running Boards, Pickup Bed (all variants), Bed Liner.
  11. **Doors** — Front/Rear Door, Hinges, Handles, Mirrors, Mouldings, Regulators, Switches, Window/Vent Motors, Glass.
  12. **Glass** — Windshield, Back Glass, Quarter Window, Special Glass, Sun Roof/T-Top, Sun Roof Motor.
  13. **Tailgate/Trunk & Convertible** — Tailgate/Trunklid, Trunk Hinge, Rear Gate Motor, Conv Top Boot/Lift/Motor.
  14. **Lighting** — Headlight Assy, Headlight Door/Motor/Wiper, Tail Light, Backup Light, Fog/Park Lamps F/R, Marker Lights, License Lamp, Third Brake Light.
  15. **Electrical & Electronics** — Alternator, Starter, Generator, Voltage Regulator, Distributor, Ignition Switch/Module, Coil/Igniter, Engine Computer, Chassis/Cruise/Trans Computer, Body computers, Wiring Harness, Antenna, Radio/CD, Speedometer, Instrument Cluster, Window Motor, Door Motor, Wiper Motor F/R, Washer Motor/Reservoir, Wiper Linkage, Air Bag (+ Clockspring, Module, Sensor), Power Window Switch, Column Switch, Seat Belt Motor, Cruise Servo.
  16. **Interior** — Seat (Front/Rear/3rd), Seat Track, Seat Belt, Dash Panel, Interior Panels, Steering Wheel.
  17. **Fluids & Maintenance** (kept, all `serviceOnly: true`) — oil change, coolant flush, trans/diff fluid, alignment, balancing, brake fluid flush, timing belt service.

- Every Car-Part.com `option` becomes one `NeededPartOption` with:
  - `key`: snake-case slug derived from the label (stable; used in `attributes.part_keys`).
  - `label`: Car-Part.com display name, lightly cleaned (fix typos like "Condensor"→"Condenser", "Instument"→"Instrument", strip trailing "(See Also …)" hints into a comment — keep label searchable).
  - `category`: maps to the existing `parts_catalog.category` taxonomy (engine, drivetrain, brakes, suspension, body, electrical, cooling, fuel, interior, tires, wheels, glass, lighting, hvac, fluids). **Add `fuel`, `hvac`, `glass`, `lighting` if missing — they're already referenced loosely.**
  - `serviceOnly`: only on the Fluids & Maintenance group.

- De-duplicate Car-Part's redundant entries (e.g. "Front Bumper Assembly" vs "Bumper Assy (Front)", "Engine Cylinder Head" vs "Cylinder Head (Engine)"). Keep one canonical option per physical part; ~295 raw entries collapse to ~210 unique options.

### 2. No changes to wizard UI or DB
- `src/components/parts/parts-wizard.tsx` already iterates `USED_PARTS_GROUPS` and renders chips per `items[]`. New taxonomy renders automatically.
- `src/lib/parts-search.functions.ts` filters by `attributes.part_keys` (string array) — existing listings keep working; new keys just become matchable as sellers re-tag.
- No migration needed. Optional follow-up (not in this plan): a small one-time SQL to remap any listings still tagged with old keys (e.g. `fuel_injectors` → `fuel_injector_pump`).

### 3. Add a credit line
- In `src/routes/parts.tsx` info strip, add: *"Part names follow the Car-Part.com industry standard."* — short, non-promotional, sets expectation for sellers familiar with US yard taxonomy.

## Out of scope
- Importing live inventory from Car-Part.com (their data is licensed; we'd need a partnership).
- Per-make/model fitment auto-population.
- Changing seller `/sell` part picker (it uses the same catalog and will update automatically).
- Touching the `parts_catalog` table or `affiliate-parts-section.tsx`.

## Files
- Rewrite: `src/data/needed-parts-catalog.ts`
- Tiny edit: `src/routes/parts.tsx` (credit line)

## Validation
- Visual: open `/parts`, confirm 15 system tiles, confirm "Fuel Pump", "Fuel Injector Pump", "Fuel Tank" appear under **Fuel System** (not Cooling).
- Build: typecheck passes (no consumer signature changes).
- Spot-check `/sell` used-part form still shows the System dropdown with new groups.
