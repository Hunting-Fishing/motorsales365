# 365 Flash Cards Training

Digital flash-card training game for **365motorsales.com** -- engine and vehicle
mastery from small engines to heavy duty, marine, automotive, and EV; from the
first engines in history to emerging and future technology, plus an **Identify
the Engine** challenge for history preservation and fun.

Plain static HTML/CSS/JS -- no build step, no server, no dependencies. Drops onto
the website and later wraps into iOS/Android.

## Run it

Open `index.html` in any browser, or serve `game/` from any static host.

```
cd game
python -m http.server 8000     # then visit http://localhost:8000
```

## The six classification dimensions

Every card is tagged on six independent dimensions:

1. **Industry / Application** -- small engine, automotive, motorcycle & powersports,
   heavy-duty/commercial, marine inboard, marine outboard, agricultural, industrial.
2. **Fuel / Power type** -- gasoline, diesel, electric (BEV), hybrid, hydrogen,
   LPG/CNG, steam, or **any** (universal). This is the "engine type" most picture.
3. **System** -- cooling, electrical, fuel, ignition, air/intake, exhaust &
   emissions, lubrication, drivetrain, steering & suspension, brakes, HVAC,
   diagnostics, safety, engine mechanical.
4. **Era** -- pioneer (first engines) -> vintage -> classic -> modern ->
   emerging/future, plus an **obsolete** bucket (carburetors, points).
5. **Region / Standard** -- global, North America, Europe, Asia-Pacific, UK.
6. **Skill level** -- Pre-Apprentice -> Apprentice -> Technician -> Journeyman ->
   Master (Dealer-Trained).

## Home page and game flow

1. **Choose a mode** (Study / Quiz / Identify) at the top.
2. **Pick a category** from the deck gallery (one card per industry, plus All Engines).
3. Tapping a category **routes into a detail screen**: choose a **sub-category
   (system)** -- shown as image cards (cooling, ignition, drivetrain...) -- or All
   Systems, and a **difficulty level** (Pre-Apprentice to Master, or All Levels).
4. **Start** launches that exact deck in your chosen mode.

## Points and history

Quiz and Identify award **points for correct answers**, weighted by difficulty
(Pre-Apprentice 5 -> Master 25). The running total shows in the header (star
badge). Every wrong answer is saved to a **Mistakes history** -- open it with the
**History** button for points, accuracy, and a reviewable list of misses (newest
first), with a Clear button. Progress persists via browser storage, with an
in-memory fallback when storage is unavailable.

## Game modes

- **Study** -- flip flash cards, reveal hints, self-rate (Again/Good/Easy).
- **Quiz** -- multiple choice on flash cards, scored, review-missed at the end.
- **Identify the Engine** -- name famous/historic engines (Slant-6, Flathead V8,
  Small-Block, Cummins 6BT, VW flat-4, Model T, Detroit 6-71, Honda B-series).

## What's inside

```
game/
|-- index.html            Shell: header, hero, mode picker, screens
|-- css/styles.css        Rugged industrial theme (brand vars in :root)
|-- js/app.js             Engine: modes, routing, filters, points, history
|-- data/
|   |-- taxonomy.js       The six dimensions + skill levels
|   |-- card-db.js        In-browser database (registry + validation)
|   |-- manifest.js       AUTO-GENERATED list of section files
|   |-- card-images.js    AUTO-GENERATED card-id -> art map
|   |-- loader.js         Reads manifest, assembles all sections on load
|   |-- cards/            <- THE CARD DATABASE (one file per section)
|   |   |-- small-engines.js  automotive.js  motorcycle-powersports.js
|   |   |-- heavy-duty.js  agricultural.js  industrial.js
|   |   |-- marine-inboard.js  marine-outboard.js  engine-id.js
|   |   |-- imported-cards.js  AUTO-GENERATED from dropped art
|   |   `-- _template.js       Copy to start a section (ignored by loader)
|   `-- cards.js / cards.json / taxonomy.json   AUTO-GENERATED mirrors
|-- assets/
|   |-- categories/       Cover cards: <industry>.* and sys-<industry>-<system>.*
|   |-- cards/<industry>/<system>/   Card art (auto-detected by id). See FOLDER-MAP.md
|   `-- brand/            365 logo (drop logo-365.png here)
`-- tools/build-index.js  Scans cards + art, auto-creates cards, refreshes mirrors
```

## Card schema (v2)

```js
{
  id:         "id-slant6",                 // unique, stable, never reused
  front:      "Prompt / question / clue",
  back:       "Answer / definition / profile",
  hint:       "optional nudge",
  industries: ["automotive"],              // 1+ from taxonomy.industries
  fuels:      ["gasoline"],                // 1+ from taxonomy.fuels ("any" = universal)
  systems:    ["engine-mechanical"],       // 1+ from taxonomy.systems
  era:        "classic",                   // 1 from taxonomy.eras
  regions:    ["north-america"],           // 1+ from taxonomy.regions
  level:      "technician",                // 1 from taxonomy.levels
  tags:       ["slant-6","mopar"],
  // OPTIONAL:
  regionValues: { imperial:"...", metric:"..." },
  type:       "identify",                  // "flash" (default) | "identify"
  engineProfile: { name, maker, years, config, displacement, notableFor }
}
```

## Card art -- infographic cards (your CARD 77 style)

Cards can be full infographic images instead of plain text; the game auto-detects
the art by card id, organized by category then system (see `assets/cards/FOLDER-MAP.md`).

**Drop-in = instant card (no coding).** Rename your art by a card id and drop it
in the right system folder; `build-index` AUTO-CREATES the card, inferring the
category and system from the folder:

1. Rename the two halves: `auto-master-cylinder-front.png` and
   `auto-master-cylinder-back.png` (any short, unique id).
2. Drop them in `assets/cards/<industry>/<system>/`, e.g.
   `assets/cards/automotive/brakes/`.
3. Run `node tools/build-index.js`.

The card now appears in-game showing your infographic, filed under Automotive >
Brakes. Auto-created cards default to "technician" level with generic text (the
image is the real content). To customize text/level, move the entry from the
generated `data/cards/imported-cards.js` into a hand-written section file under
the same id.

**One file instead of two:** a single combined `<id>.png` (front left / back
right) is auto-split 50/50. Two files give sharper results.

`png / jpg / webp / svg` all work. The official logo goes in `assets/brand/`.

## Cover cards (gallery + system pages)

The home gallery and the system picker look for cover images and fall back to a
styled tile if none are found:

- Industry cover: `assets/categories/<industry>.png` (e.g. `automotive.png`).
- System cover:   `assets/categories/sys-<industry>-<system>.png`
  (e.g. `sys-automotive-cooling.png`).

`png / jpg / webp / svg` are tried in that order. Drop a file in and it appears.

## Tooling -- `build-index.js`

```
cd game
node tools/build-index.js
```

Scans `data/cards/` and `assets/cards/` (recursively), auto-creates cards from
new art, and rewrites `manifest.js`, `card-images.js`, `imported-cards.js`, and
the flat mirrors. Prints per-section and per-system counts plus warnings.

## Roadmap

- Grow content toward 365+ via the drop-in workflow; add cover art per category/system.
- Commerce: gate behind a Shopify product (see DEPLOY.md).
- Mobile: wrap the same code for iOS/Android.
- Backend (optional): swap loader.js to fetch cards from an API/CMS.

See `DEPLOY.md` for site-embedding and Shopify/commerce options.

## Catalog code system (card numbering)

Every card has a professional catalog code (its id), so the library stays clean
and each section grows independently -- no more "card 54 engine, card 55 cooling":

```
CAT - SYS - LVL - NNNN        e.g.  AUT-COOL-TE-0054
 |     |     |     |                Automotive / Cooling / Technician / #54
 |     |     |     `-- 4-digit sequence, runs PER category+system (0001..9999+)
 |     |     `-------- level: PA AP TE JM MA
 |     `-------------- system: ENG COOL LUBE FUEL IGN AIR EXH ELEC DRV SUS BRK HVAC DIAG SAFE
 `-------------------- category: AUT SML MOT HVY MRI MRO AGR IND
```

Ids/filenames are the lowercase code, e.g. `aut-cool-te-0054-front.png`. The
number runs separately for each category+system, so Cooling has its own 1..N,
Electrical its own 1..N, etc. -- unlimited per section, always sortable, and the
code alone tells you exactly what a card is. Great for SKUs, decks, and print.

## Developer Portal (split, code & import)

`Card-Developer-Portal.html` (project root) turns your combined card images into
coded game cards. Each image holds the FRONT (left) and BACK (right) with a gap.

1. Open in Chrome/Edge over a local server (needed for one-click export):
   from the project root run `python -m http.server 8000` and open
   `http://localhost:8000/Card-Developer-Portal.html`.
2. (Optional) **Connect game folder** so new card numbers continue from whatever
   is already in `assets/cards/` -- never collides as you expand.
3. Drag in all your combined images, click **Split & read cards**. The portal
   finds the gap, splits front/back, OCR-reads the card number, the TITLE (from
   the back heading), and the question, then assigns the catalog code and guesses
   System + Level from the title.
4. Review each card (nudge the gold split line if needed, fix Title/Category/
   System/Level -- the code updates live), then tick **Approve**.
5. **Export approved -> game folder**: writes split `<code>-front.png` /
   `<code>-back.png` into `assets/cards/<category>/<system>/` and a
   `data/cards/portal-import.js` carrying titles, levels, and codes.
6. Run `node tools/build-index.js`.

Nothing exports until you Approve it. First scan downloads the OCR engine once.
