# Year → Make → Model cascading picker (Asian-market focus)

Goal: behave like a parts catalog lookup (RockAuto / PartsAvatar style) — pick **Year first**, then **Make**, then **Model**, where the model list is filtered to nameplates actually sold that year. Cover Asian-market makes/models exhaustively, with explicit "Other" + add-missing affordances.

## Scope

1. Expand `src/data/vehicles.ts` to include **year ranges per model** (Asian market — JDM, PH, Thai/Indo CKD, Indian, Chinese, Korean, Malaysian).
2. Reshape the picker into a 3-step cascade: Year → Make → Model.
3. Filter Make + Model lists by the selected Year.
4. Keep "Add missing make / Add model / Other" affordances at every step.
5. Hook the new Year value into `sell.tsx` (replace its free-text Year input) and `listing.$id.edit.tsx` if it has the same flow.

No DB migration needed — `year` already lives in `listings.attributes.year` (free text today). We just upgrade the input.

## Data shape change

`src/data/vehicles.ts` — replace `models: string[]` with `models: ModelEntry[]`:

```ts
export type ModelEntry = {
  name: string;
  /** Year the nameplate was first sold in any Asian market. */
  startYear: number;
  /** Last year sold; omit/null = still in production. */
  endYear?: number | null;
  /** Optional: market tags for future filters ("PH","JDM","IN","CN","TH","KR","MY"). */
  markets?: string[];
};

export type MakeModels = {
  make: string;
  models: ModelEntry[];
};
```

Backwards-compat helper:

```ts
export function getModelsForYear(make: string, category, year?: number): string[]
export function getMakesForYear(category, year?: number): string[]
```

When `year` is undefined, return everything (so the picker still works without a year).

### Coverage targets (sourced again from autodeal.com.ph, philkotse.com, carguide.ph, automart.ph top-15, plus market history):

- **Japanese (Toyota, Honda, Nissan, Mazda, Mitsubishi, Suzuki, Subaru, Isuzu, Daihatsu, Lexus, Infiniti, Acura, Datsun)** — every PH-CBU/CKD nameplate + JDM grey-import staples (Mark X, Crown Athlete, Stagea, Cefiro A31/A32/A33, Laurel C33/C34/C35, Skyline R32–R35, Silvia S13–S15, Cresta, Chaser, Soarer, Aristo, Celsior, Caldina, Wingroad, AD Van, Probox, Succeed, Bongo, Bongo Friendee, Delica, etc.) with accurate generation years.
- **Korean (Hyundai, Kia, Genesis, SsangYong/KGM, Daewoo)** — Eon, i10, i20, Reina, Stargazer, Stargazer X, Staria, Casper, Creta, Venue, Alcazar, Exter, Ioniq 5/6/9, Sonata, Stonic, Carens, EV5/EV6/EV9, Tasman, Mohave, Carnival/Sedona generations, Sportage MK1–MK5, Sorento, Telluride, Picanto/Morning, Rio, Soul, Cerato/Forte/K3, K5/Optima, K8, K9/Quoris, Ray, Bongo, Frontier, etc.
- **Chinese (BYD, MG, Geely, Chery, GAC, Haval, GWM, Foton, JAC, Maxus, BAIC, Changan, DFSK, Dongfeng, JETOUR, Jaecoo, Omoda, Forthing, Leapmotor, Xpeng, NIO, Zeekr, Hongqi, Hozon Neta, Lynk & Co, IM Motors, Smart, Voyah)** — full current PH/SE-Asia lineups with launch years (Atto 3 2022→, Seal 2023→, M6 2023→, Coolray 2019→, GS3 Emzoom 2023→, Tiggo 2/4/5/7/8 series, Jolion 2021→, H6 2021→, Tank 300/500, etc.).
- **Indian (Tata, Mahindra, Maruti Suzuki, Force, Bajaj/Bajaj Auto, Premier, Hindustan)** — Nexon, Punch, Harrier, Safari, Curvv, Tiago, Tigor, Altroz, Sumo, Indica/Indigo legacy; Mahindra XUV300/400/700, Scorpio/Scorpio-N, Thar, Bolero, Marazzo, KUV, TUV, Alturas G4; Maruti Swift/Dzire/Baleno/Brezza/Ertiga/XL6/Grand Vitara/Jimny/Fronx/Ignis/Eeco/Wagon R/Celerio/S-Presso/Alto K10.
- **Malaysian (Proton, Perodua)** — Saga MK1–MK4, Persona, Iriz, Exora, X50, X70, X90, S70, e.MAS 7; Myvi, Bezza, Axia, Ativa, Aruz, Alza.
- **Indonesian/Thai-CKD specials** — Toyota Avanza/Veloz/Rush/Raize/Yaris Cross AC200, Daihatsu Xenia/Terios/Sigra/Ayla/Rocky, Wuling Air EV/Almaz/Confero/Alvez, DFSK Glory.

Same depth for **motorcycles**: Honda (Wave 100/110/125/Alpha, XRM 110/125/150/RS, TMX 125/155, CG125, Click 125/150/160, ADV 150/160/350, BeAT, Genio, Vario, PCX 125/150/160, Air Blade, Super Cub, CBR series, CB series, CRF series, X-ADV, Forza, Gold Wing, Africa Twin), Yamaha (Mio family, Sniper, NMAX, Aerox, XSR, MT, YZF-R, FZ, Tracer, Tenere, Bolt, FZR), Suzuki (Raider J/R150/R150 Fi, Skydrive, Smash, Burgman, Hayabusa, GSX, V-Strom, Jixxer), Kawasaki (Barako II, Rouser NS series, CT100, Bajaj Pulsar rebadges, Ninja 250/300/400/650/ZX-6R/ZX-10R, Z series, Versys, KLR, KX), plus KTM, Husqvarna, Ducati, BMW Motorrad, Triumph, Royal Enfield, Bajaj, TVS, Hero, CFMOTO, Benelli, QJ Motor, GPX, Keeway, Kymco, Lambretta, Vespa with nameplate years.

Volume: roughly 2–3× current model count, ~1500–2200 entries total. Done in chunks per region to keep the file reviewable.

## Picker UX

`src/components/vehicle-picker.tsx`:

```text
┌───────── Vehicle ─────────┐
│ [ Year ▾ ]  [ Make ▾ ]  [ Model ▾ ]   [ + Other ]
└───────────────────────────┘
```

- `<Props>` becomes `{ year, make, model, onChange({year,make,model}) }`.
- **Year combo**: list 1980 → currentYear+1 (newest first). Always allows free-text custom year. Includes an "Older" option for pre-1980.
- **Make combo**: filtered to makes that have ≥1 model produced in the selected year. If no Year picked, show all. Persistent "Add missing make" footer.
- **Model combo**: filtered to models whose `[startYear, endYear ?? +∞]` covers the year. Persistent "Add model" footer.
- Selecting Year clears Model if the current Model is out-of-range; same when Make changes.
- Top-level **"Other / Not in list"** button switches the whole row into 3 free-text inputs (Year/Make/Model) and stays editable. This satisfies the "Add Other button" ask.

Search/filter still uses the existing `fuzzyScore` + alias keywords (Civic FE, Micra K14, etc.).

## Caller updates

- `src/routes/sell.tsx`:
  - Drop the standalone `<Input>` Year field at line 366/379.
  - Pass `year` through `VehiclePicker` and into `attributes.year` (already there at line 228).
  - Free-text fallback path (the `Other`/non-vehicle category branch at 373–379) keeps its plain inputs.
- `src/routes/listing.$id.edit.tsx`: same change if it mirrors sell.tsx (will verify and update during implementation).
- Browse filter (`browse.$category.tsx`) is unaffected — still filters via title/attributes search; we can wire a Year filter in a follow-up.

## Files touched

- `src/data/vehicles.ts` — new `ModelEntry` shape, expanded data, `getMakesForYear` / `getModelsForYear` helpers.
- `src/lib/vehicle-aliases.ts` — minor: alias keys keyed by string still work (no shape change required).
- `src/components/vehicle-picker.tsx` — 3-step cascade, year combo, "Other" toggle.
- `src/routes/sell.tsx` — pass year through picker, remove duplicate year input.
- `src/routes/listing.$id.edit.tsx` — same wiring.

## Out of scope (call out for later if wanted)

- Trims/sub-models per year (e.g. Civic RS vs E vs V for 2024 PH spec). Could be a 4th column.
- Browse-page Year facet filter.
- Server-side year validation.
