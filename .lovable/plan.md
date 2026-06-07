## Goal

Replace the empty / partially-covered engine catalog with **verified, source-cited engine and transmission lists for every make + model + year range** currently listed in `src/data/vehicles.ts` (Asia/PH market). When the picker shows an engine, it must be a real one the manufacturer actually sold for that model-year — never a guess.

## Scope reality check

`src/data/vehicles.ts` has **~348 makes** across 6 categories. `vehicle-engines.ts` currently has factual data for ~15 car makes and ~4 motorcycle makes. Completing the rest is a large research effort (each entry needs manufacturer spec-sheet verification). I'll ship it in **phases**, each phase a self-contained, reviewable commit, so you can see progress and the shop stays usable throughout.

## Phasing (priority = PH market share + listing volume)

```text
Phase 1 — Top Japanese cars (highest PH volume)
  Toyota (expand), Mitsubishi (expand), Honda (expand), Nissan (expand),
  Isuzu (expand), Mazda (expand), Suzuki (expand), Subaru, Lexus

Phase 2 — Korean + American + remaining mainstream cars
  Hyundai, Kia, Ford (expand), Chevrolet (expand), Geely, MG, Chery,
  Changan, BYD, GAC, Foton, Jeep, Dodge, Ram

Phase 3 — European cars
  BMW, Mercedes-Benz, Audi, Volkswagen, Volvo, Peugeot, Mini,
  Porsche, Land Rover, Jaguar

Phase 4 — Motorcycles (full Asia coverage)
  Honda, Yamaha, Suzuki, Kawasaki (expand all 4) +
  KTM, Ducati, BMW Motorrad, Harley-Davidson, Royal Enfield,
  Vespa, SYM, Kymco, Rusi, Motorstar, CFMoto, Benelli, Aprilia

Phase 5 — Heavy Truck / Bus
  Isuzu, Hino, Fuso, UD, Foton, Hyundai HD, Daewoo, Higer, Yutong, Volvo, Scania

Phase 6 — ATV / UTV
  Polaris, Can-Am, Honda, Yamaha, Kawasaki, Suzuki, CFMoto, Arctic Cat, Kymco

Phase 7 — Marine
  Yamaha, Suzuki, Honda, Mercury, Tohatsu, Evinrude, Volvo Penta

Phase 8 — Heavy Equipment
  Caterpillar, Komatsu, Hitachi, Kubota, Kobelco, Volvo CE, JCB, Hyundai HCE, Sany, XCMG
```

Each phase: I read the make's models from `vehicles.ts`, research the engine + transmission options actually offered per model-year in Asia (PH/JP/TH/ID/IN/MY market trims), then write the entries to `VEHICLE_ENGINES` and `TRANSMISSIONS_BY_CATEGORY`.

## Sources I'll use

- Manufacturer regional press kits & spec sheets (toyota.com.ph, mitsubishi-motors.com.ph, hondaph.com, etc.)
- Wikipedia model-generation pages (cross-checked against manufacturer data, never as sole source)
- Local outlets for trim history (autodeal.com.ph, carmudi.com.ph, paultan.org for ASEAN)

Entries that can't be cleanly verified get **omitted** — the picker already falls back to free-text for uncovered models, which is the honest UX.

## Per-make output format

For each model, an array of `EngineSpec` entries with `{ label, code, start, end }` already supported by the file. Example shape (Suzuki Ertiga):

```text
Ertiga: [
  { label: "1.4L Gasoline (K14B)", code: "K14B", start: 2012, end: 2019 },
  { label: "1.5L Gasoline (K15B)", code: "K15B", start: 2019 },
]
```

Transmissions stay category-level (MT / AT / CVT / DCT / AMT) — those are universal types and already correct.

## Technical notes

- **No schema changes.** All work lives in `src/data/vehicle-engines.ts`.
- **No UI changes** beyond what's already shipped (free-text fallback works correctly).
- I'll spawn read-only research subagents per make-batch so I can verify many models in parallel without polluting my own context with raw research output.
- After each phase I'll run a quick lint pass to confirm no duplicate model keys and no overlapping year ranges within a single engine entry.

## How I'll deliver

- **Phase 1 first**, as one commit you can review. If the format and quality match what you want, I continue through Phase 8 in subsequent commits.
- After every phase, a one-line status: "Phase N done — X makes, Y models, Z engine variants added."
- Final phase ends with a coverage report (% of nameplates in vehicles.ts that now have at least one curated engine).

## What I need from you before starting

Just a go-ahead. If you'd rather I do all 8 phases back-to-back without pausing for review between them, say so and I'll batch them.