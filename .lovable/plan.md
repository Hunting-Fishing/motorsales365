# Expand Asian vehicle make/model dataset

## Scope

Extend `src/data/vehicles.ts` (the only source of truth for the make/model pickers) so it matches what users see on Philkotse's brand index, automart.ph filters, and CarGuide.PH coverage. Focus is **Asian makes** (JP, KR, CN, IN, MY, VN, TH) plus filling missing models on already-listed Asian makes. No schema changes — pure data additions, kept alphabetical inside each region block.

Out of scope: Year-range entries in `CAR_MODEL_YEARS` (kept as-is — unmapped models simply stay visible across all years per existing logic).

## What's already covered

Cars: 13 Japanese, 6 Korean, ~38 Chinese, ~9 Indian, Proton/Perodua, VinFast.
Motorcycles: Big-4 JP, KTM/Ducati/Triumph/Aprilia/Vespa, CFMOTO/Benelli/QJ/Zontes/SYM/Kymco/Royal Enfield/Bajaj/TVS/Hero plus PH-local (Rusi, Motorstar, Skygo, Kawayama, Euro Pony).

## Gaps to fill

### New Asian car makes to add

Sourced from Philkotse brand index + CarGuide.PH 2024–2026 launches:

- **NETA** (Hozon) — V, X, GT, S, Aya, L
- **WEY** (GWM premium) — VV5, VV6, VV7, Coffee 01, Coffee 02, Tank-line crossovers
- **Avatr** (Changan/Huawei/CATL) — 11, 12, 07
- **IM Motors / Zhiji** — L7, LS6, LS7, L6
- **Roewe** (SAIC) — RX5, RX9, i5, i6, Marvel R, D7
- **Baojun** (SAIC-GM-Wuling) — Yep, Yep Plus, KiWi EV, 510, 530, Valli
- **Trumpchi** (GAC sub-brand listed separately on Philkotse) — GS3, GS4, GS8, M6, M8, Empow, E9
- **JMC (Jiangling)** — Vigus, Yuhu, Territory, Baodian, Carrying
- **Soueast** — DX5, DX7, DX8S, V5, V6
- **Karry** (Chery commercial) — Youjin, Youya, K50, K60
- **Mitsuoka** (JP specialty often imported grey-market) — Viewt, Galue, Buddy, Rock Star, Himiko, Orochi
- **LDV** (Maxus rebadge sold by some PH dealers) — T60, T60 Max, D90, G10, V80, eDeliver
- **Higer**, **Yutong**, **Zhongtong**, **King Long** (buses sometimes filtered) — keep King Long (already), add Higer/Yutong/Zhongtong with common coach/minibus models
- **Shacman**, **Sinotruk (Howo)**, **FAW Jiefang**, **Beiben** — heavy-duty trucks listed on automart.ph commercial section
- **Sany** — heavy trucks (PH presence)

### New Asian motorcycle makes / sub-brands

- **Sundiro Honda**, **Wuyang Honda** (China-made Honda sub-brands occasionally imported)
- **Haojue** (Suzuki China)
- **Mash China models** already present — fine
- **Aima**, **Tailg**, **Yamasaki**, **Senke**, **Jincheng** (Chinese e-scooter / small bikes seen on Philkotse)
- **Honda Big Bike** PH-only nameplates: confirm Hornet 2.0, NX500, Rebel 1100T already present (will add NX500, Hornet 2.0, CB350, GB350)
- **Royal Alloy** (UK-Indian retro scooter)

### Missing models on existing Asian makes

Cross-checked against each brand's current PH lineup pages:

- **Toyota**: add Innova HyCross Hybrid trims, GR Yaris MY24, Hilux GR Sport II, Land Cruiser 250 Prado, Yaris Cross Hybrid, Vios GR-S, Crown Signia, Crown Estate, Camry XV80 Hybrid.
- **Honda**: add Civic RS Turbo (PH spec), CR-V e:HEV RS, ZR-V e:HEV, Elevate, WR-V VX, Pilot 2024, BR-V S 7-seater.
- **Nissan**: add Ariya, Leaf 2nd-gen, Qashqai e-Power (when sold here grey-market), Patrol Y63 (2026), Skyline Crossover, Pino, Roox.
- **Mitsubishi**: add Outlander PHEV 2024, Xpander Cross HEV, Triton 2024 (6th-gen), Pajero 2024 concept.
- **Mazda**: add CX-60 PHEV, CX-80, MX-30 R-EV, Mazda EZ-6, Mazda Arata.
- **Suzuki**: add Fronx Hybrid, eVitara, Jimny Nomade 5-door, Swift 2024 (4th-gen).
- **Isuzu**: add D-Max RT50, mu-X 2024 facelift, ELF EV, Traga.
- **Hyundai**: add Ioniq 9, Santa Fe MX5 (5th-gen), Tucson NX4 PFL, Inster, Casper, Mufasa.
- **Kia**: add EV3 GT-Line, EV5, Carnival Hybrid 2024, Tasman pickup, Syros.
- **BYD**: add Sealion 05 EV, Sealion 07 EV, Yangwang U8/U9, Denza N9, Atto 1, Sea Lion 7, Song L, M9 (export name).
- **MG**: add MG ES5, Cyberster, MGS5 EV, MG7 PHEV, IM L6 (rebadge clarity).
- **GAC**: add Aion RT, Aion UT, Hyptec HT, Hyptec GT, M8 Master, GS3 Power.
- **Geely**: add EX5, Galaxy Starship 7, Starray EM-i facelift, Atlas 8.
- **Chery**: add Tiggo 9 PHEV, Arrizo 8 Hybrid, iCar 03, iCar V23.
- **Haval**: add Raptor (Hi4-T), H6 GT PHEV, H7 facelift.
- **GWM**: add Tank 400 Hi4-T, Tank 500 Hi4-T, Tank 700 Hi4-T, Tank 800, Cannon Alpha PHEV, Wingle 7 EV.
- **Foton**: add Tunland V9 Pro, View CS2, Toano, Mannar.
- **JAC**: add JS3 Pro, JS6 Pro, T9 Hunter, eJS1, JS4 EV.
- **Changan**: add Deepal G318 (move under Deepal), CS75 Plus Champion, UNI-Z, Hunter K50.
- **JETOUR**: add T2 i-DM, X70 PLUS Champion, Traveller T2.
- **Jaecoo**: add J5 EV, J7 Plus, J8 PHEV.
- **Lynk & Co**: add 06 EM-P, 08 EM-P facelift.
- **Omoda**: add Omoda 9, Omoda C5 PHEV.
- **NIO/XPeng/Li/ZEEKR/Voyah/Leapmotor**: add 2025 trims (NIO Onvo L60, ET9; XPeng X9, P7+, Mona M03; Li L6, MEGA Home; ZEEKR 7X, Mix; Voyah Free 2024; Leapmotor B10, C16 EV).
- **Tata**: add Punch EV, Curvv ICE, Sierra (2025), Avinya.
- **Mahindra**: add XEV 9e, BE 6, Thar Roxx 5-door, Bolero Neo Plus.
- **Maruti Suzuki**: add eVX, Fronx Strong Hybrid.
- **Proton**: add e.MAS 7 (EV), X90 Flagship.
- **Perodua**: add Ativa Hybrid, EMO-1 EV concept (skip concepts).
- **VinFast**: add VF 3 LFP, VF Wild pickup, Limo Green.
- **SsangYong / KG Mobility**: add Torres EVX, Actyon 2024 (3rd-gen), Musso EV.
- **Daihatsu**: add Rocky Hybrid, Move Canbus, Atrai EV.

### Missing motorcycle models

- **Honda**: NX500, Hornet 2.0, CB350, GB350, GB350S, ADV160 e:HEV, Forza 350 2024.
- **Yamaha**: MT-07 2024, R9, Tenere 700 World Raid, Aerox 155 Turbo (PH).
- **Suzuki**: GSX-8R, GSX-8S, V-Strom 800RE, Burgman Street EX 125.
- **Kawasaki**: Eliminator 500, Ninja 7 Hybrid, Ninja ZX-4RR, KLX230 SM.
- **Royal Enfield**: Guerrilla 450, Bear 650, Classic 650, Goan Classic 350, Shotgun 650 (some present, audit).
- **Bajaj**: Pulsar NS400Z, Freedom 125 CNG, Chetak EV.
- **TVS**: Apache RTR 310, Jupiter 110, X EV, iQube.
- **CFMOTO**: 450NK, 675SR-R, 800NK Sport, 800MT-X, Papio Racer.
- **KTM**: 390 Adventure R, 390 SMC R, 990 Duke R, 1390 Super Duke R Evo.
- **Husqvarna**: Vitpilen 801, Norden 901 Expedition (have), 250 Enduro.

## Implementation steps

1. **Edit `src/data/vehicles.ts`** in a single pass:
   - In `CAR_MAKES`, append new makes alphabetically inside the appropriate region block (Chinese / Indian / "More Asian-market makes"), and merge new models into existing makes' arrays. Preserve order; no duplicates (case-insensitive).
   - In `MOTORCYCLE_MAKES`, append new makes under the appropriate region comment and append models to the Big-4 + already-listed brands.
2. **Sanity dedupe**: Within each `models: [...]` array, ensure no exact-string repeats (the picker tolerates them but we keep it clean).
3. **No changes** to `CAR_MODEL_YEARS` / `MOTORCYCLE_MODEL_YEARS` — unmapped models continue to show across all years per `getModelsForYear`.
4. **No changes** to `vehicle-aliases.ts` — alias stack is independent and already handles common typos / chassis codes.
5. **No code changes** in `src/components/vehicle-picker.tsx` or callers — they read from the same exports.

## Validation

- Project builds (typecheck) — file is plain data, no type changes.
- Spot-check picker on `/sell` and `/browse/car`: select Toyota → see new entries (Crown Signia, Camry XV80 Hybrid); select NETA / Avatr / Roewe → models appear.
- No runtime impact: dataset is bundled at compile-time, render cost is negligible.

## Files touched

- `src/data/vehicles.ts` — only file edited.
