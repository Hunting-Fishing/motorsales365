## Goal

The vehicle dataset already covers 200+ Asian-market makes after the prior pass. This pass is a **targeted fill-in** — re-checked against Philkotse, automart.ph, CarGuide.PH listings — to add the specific nameplates still missing, not a full rewrite.

## File

- `src/data/vehicles.ts` (data only — no schema, helper, or filter changes)

## Additions to `CAR_MAKES`

**Toyota** — add: Caldina, Carina, Corona, Belta, Passo, Roomy, Tank, Pixis Epoch, Pixis Joy, Crown Kluger, Vios XLE, Yaris ATIV, Innova Kijang, Across (=RAV4 PHEV).

**Honda** — add: Stream, Domani, Logo, Life, Zest, That's, Vamos, City Turbo II, Civic Type R FL5, Mobilio RS.

**Nissan** — add: Note Aura, Note Aura Nismo, X-Trail T33, Skyline V37, Cima, Fuga, Wingroad, AD Van, Dayz, Roox.

**Mitsubishi** — add: eK Wagon, eK X, eK Cross, eK Cross EV, Town Box, Minicab, Minicab MiEV, Minicab EV, Pajero Sport 2024 Facelift.

**Mazda** — add: Verisa, Carol, Flair, Flair Crossover, Scrum, Bongo Brawny, Familia Van, CX-80 PHEV.

**Suzuki** — add: MR Wagon, Palette, Landy, Solio Bandit, Across, Spacia Custom, Spacia Gear, Wagon R Smile.

**Daihatsu** — add: Move Conte, Move Canbus ✓, Naked, Esse, Mira e:S, Cast, Wake, Thor, Tafuto, Bezza, Xenia, Sigra, Sirion ✓ (already), Ayla.

**Subaru** — add: Pleo Plus, Lucra, Trezia, Dex, Dias Wagon, Sambar Truck, Sambar Van.

**Hyundai** — add: Aura, i20 Active, Tucson NX4, Venue N Line, Verna Turbo, Stargazer Hybrid.

**Kia** — add: K3 GT Hatch, Niro Plus, Bongo III EV, Carens Clavis EV ✓, Tasman X-Pro.

**Genesis** — add: G70 Shooting Brake, GV80 Coupe Magma, Neolun.

**Tata** — add: Altroz Racer, Punch EV Long Range, Curvv ICE, Sumo Gold.

**Mahindra** — add: XUV 3XO ✓, BE 7, BE 9, Thar.e, Roxx 5-door.

**Maruti Suzuki** — add: Dzire 4th-gen, Swift Hybrid, Fronx Hybrid, eVX, Wagon R EV, YY8 (Frontx-EV preview).

**BYD** — add: Seal 06 DM-i, Sealion 5, Sealion 7 EV ✓, Fang Cheng Bao 5, Fang Cheng Bao 8, Denza N9, BYD U8 Premium.

**MG** — add: Cyber GTS, MG7 Trophy, IM L6 (MG-rebadged), MG ZS Hybrid+ ✓.

**Geely** — add: Galaxy Starshine 8, Galaxy E5 ✓, Riddara RD6, Lynk & Co 08 EM-P ✓ (move check), Geely EX5 Wing.

**Chery** — add: Fulwin A8, Fulwin T10, Tiggo 9 C-DM, iCar V23 ✓, iCar 03T.

**GAC** — add: Hyptec SSR, Aion Hyper GT, Aion ES Pro.

**Hongqi** — add: HQ9, Tiantian, E001, EH7 ✓.

**Wuling** — add: Cloud EV, Bingo S, Starlight, Xingguang.

**JAC** — add: JS9, T9 EV Hunter, iEV4, iEV7.

**Maxus** — add: Mifa 7, D60 Plus, T90 EV ✓.

**GWM** — add: Ora 7 ✓, Tank 700 ✓, Wey 80, Wey Lanshan ✓.

**Polestar** — add: Polestar 6, Polestar 7.

**Lexus** — add: LBX, LM 350h ✓, GX 550 Overtrail.

**Acura** — add: ADX, RSX EV (2025 reveal).

**Lynk & Co** — add: 900, Z10 ✓.

**NIO** — add: Onvo L90, Firefly, ET9 ✓.

**XPeng** — add: G7, P7+ ✓, MONA M03 Max.

**Zeekr** — add: Mix ✓, 7X ✓, 9X.

**Aito** — add: M9 EV, M5 Ultra.

**Li Auto** — add: i8, i6.

**Voyah** — add: Zhiyin ✓, Lan, Cha.

**KG Mobility / SsangYong** — add: Torres EVX ✓, Musso EV ✓, Actyon 2024 ✓, O100 (Korando successor).

**Proton** — add: X50 RC, S70, e.MAS 7 ✓.

**Perodua** — add: Ativa EV concept, Aruz 2024.

## Additions to `MOTORCYCLE_MAKES`

**Honda** — add: NX500 ✓, Hornet 2.0 ✓, Forza 750 ✓, ADV 350 ✓, CB350 RS, GB350 C.

**Yamaha** — add: NMAX Turbo, Aerox Alpha ✓, FZ-X, MT-15 v2, R9 ✓, Tenere 700 World Raid ✓.

**Suzuki** — add: GSX-8R ✓, GSX-8S ✓, e-Burgman, Avenis 125, V-Strom 800RE ✓.

**Kawasaki** — add: Eliminator 500 ✓, Ninja 7 Hybrid ✓, Z7 Hybrid ✓, KLX230 SM ✓.

**Royal Enfield** — add: Bear 650 ✓, Guerrilla 450 ✓, Goan Classic 350 ✓, Classic 650.

**Hero** — add: Mavrick 440 ✓, Karizma XMR ✓, Xtreme 250R, Xpulse 210.

**Bajaj** — add: Pulsar NS400Z ✓, Pulsar N250 ✓, Freedom 125 CNG ✓, Chetak 3201.

**TVS** — add: Apache RTR 310 ✓, Ronin ✓, X EV ✓, Jupiter 110 ✓.

**CFMOTO** — add: 675SR-R ✓, 800NK Sport ✓, 450MT ✓, Papio XO ✓.

## Year-range map (`CAR_MODEL_YEARS`)

Add `start` years for the most-searched **new** nameplates we are introducing (so they don't get filtered out in the year picker for older years). Examples:

- Toyota: `Innova HyCross: 2022`, `Land Cruiser 250: 2024`, `Crown Signia: 2024`, `Across: 2020`.
- Honda: `Civic Type R FL5: 2022`, `e:N1: 2023`, `WR-V (PH-spec): 2023`.
- Nissan: `Note Aura: 2021`, `X-Trail T33: 2022`.
- Hyundai: `Inster: 2024`, `Casper: 2021`, `Santa Fe MX5: 2024`.
- Kia: `EV3: 2024`, `EV5: 2024`, `Tasman: 2024`, `Syros: 2025`.
- BYD: `Sealion 6: 2023`, `Sealion 7: 2024`, `Seal 06: 2024`, `Yangwang U8: 2024`.
- MG: `Cyberster: 2023`, `MG3 Hybrid+: 2024`, `MGS5 EV: 2024`.
- Geely: `Starray: 2024`, `Galaxy E5: 2024`.
- GWM: `Tank 500: 2022`, `Tank 700: 2024`.
- Chery: `Tiggo 9: 2023`, `iCar V23: 2024`.
- Mitsubishi: `Xforce: 2023`, `Triton (6th-gen): 2024`.
- Suzuki: `Fronx: 2023`, `Jimny 5-door: 2023`, `Swift (4th-gen): 2024`.
- Maruti: `Invicto: 2023`, `eVX: 2025`.
- Tata: `Curvv: 2024`, `Punch EV: 2024`, `Harrier EV: 2025`.
- Mahindra: `XUV 3XO: 2024`, `BE 6: 2024`, `XEV 9e: 2024`, `Thar Roxx: 2024`.
- VinFast: `VF 3: 2024`, `VF 6: 2024`, `VF 7: 2023`.

## Constraints

- Pure data additions; no changes to types, helpers, ordering of existing entries, or filter behavior.
- Keep alphabetical-ish grouping within each make's `models` array (newest at end is fine — matches current style).
- No duplicates — each addition is checked against the existing array first.
- Year-map entries are optional; unmapped models stay visible all years (existing behavior).

## Out of scope

- Removing legacy/discontinued models.
- Restructuring categories (trims vs. nameplates).
- UI/picker changes.
