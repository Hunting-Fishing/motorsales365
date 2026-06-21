/* =====================================================================
 * 365 Flash Cards Training — SECTION: Engine ID Challenge
 * ---------------------------------------------------------------------
 * History-preservation + fun. These are type:"identify" cards: the front
 * gives clues (and an image slot), the answer is the engine's name. They
 * power the "Identify the Engine" game mode (name-the-engine multiple
 * choice) and also flip to reveal a full profile in Study.
 *
 * Identify-card schema adds:
 *   type:"identify"   (required for this mode)
 *   engineProfile: { name, maker, years, config, displacement, notableFor }
 *   media.image      front silhouette/photo slot (drop art in
 *                    assets/cards/engine-id/<id>.png and update the path)
 *
 * Grow this with regional & industry icons (tractors, outboards, bikes...).
 * ===================================================================== */
CardDB.register(
  { section: "engine-id", name: "Engine ID Challenge", file: "cards/engine-id.js" },
  [
    { "id": "id-slant6", "type": "identify",
      "front": "Identify this engine: an inline-six canted ~30° to one side, built by a Detroit automaker from 1959–2000 and famous for being almost indestructible.",
      "back": "Chrysler Slant-6 — the 30°-tilted inline-six (1959–2000). The lean allowed a lower hood line and long, tuned intake runners; legendary for reliability in Dodge/Plymouth cars and trucks.",
      "engineProfile": { "name": "Chrysler Slant-6", "maker": "Chrysler", "years": "1959–2000", "config": "Inline-6, OHV, canted 30°", "displacement": "170 / 198 / 225 cu in", "notableFor": "Near-indestructible durability; iconic Mopar workhorse." },
      "industries": ["automotive"], "fuels": ["gasoline"], "systems": ["engine-mechanical"], "era": "classic", "regions": ["north-america"], "level": "technician",
      "tags": ["slant-6","mopar","inline-6","history"], "media": { "image": "../assets/cards/engine-id/placeholder-card.svg" } },

    { "id": "id-flathead-v8", "type": "identify",
      "front": "Identify this engine: the first affordable mass-produced V8, a side-valve (L-head) design introduced in 1932 that founded hot-rodding.",
      "back": "Ford Flathead V8 — the side-valve V8 (1932–1953) that put eight cylinders in reach of ordinary buyers and launched the hot-rod movement.",
      "engineProfile": { "name": "Ford Flathead V8", "maker": "Ford", "years": "1932–1953", "config": "Side-valve (L-head) 90° V8", "displacement": "221–337 cu in", "notableFor": "First affordable mass-produced V8; hot-rod cornerstone." },
      "industries": ["automotive"], "fuels": ["gasoline"], "systems": ["engine-mechanical"], "era": "vintage", "regions": ["north-america"], "level": "technician",
      "tags": ["flathead","ford","v8","history","hot rod"], "media": { "image": "../assets/cards/engine-id/placeholder-card.svg" } },

    { "id": "id-sbc", "type": "identify",
      "front": "Identify this engine: a compact 90° OHV V8 introduced in 1955, one of the most-produced engines in history and endlessly modifiable.",
      "back": "Chevrolet Small-Block V8 — debuted 1955 (265 cu in). Over 100 million built; light, compact, and the backbone of American performance for decades.",
      "engineProfile": { "name": "Chevrolet Small-Block V8", "maker": "Chevrolet", "years": "1955–2003 (Gen I)", "config": "OHV 90° V8", "displacement": "265–400 cu in", "notableFor": "100M+ built; the definitive swappable, buildable V8." },
      "industries": ["automotive"], "fuels": ["gasoline"], "systems": ["engine-mechanical"], "era": "classic", "regions": ["north-america"], "level": "technician",
      "tags": ["small block","chevy","sbc","v8","history"], "media": { "image": "../assets/cards/engine-id/placeholder-card.svg" } },

    { "id": "id-cummins-6bt", "type": "identify",
      "front": "Identify this engine: a 5.9 L inline-six turbo-diesel, the '12-valve' with mechanical Bosch P7100 injection that earned a cult following in 1989–98 pickups.",
      "back": "Cummins 6BT 5.9 (12-valve) — inline-six turbo-diesel used in the Dodge Ram from 1989. Mechanical injection, huge low-end torque, famous for going hundreds of thousands of miles.",
      "engineProfile": { "name": "Cummins 6BT 5.9 (12-valve)", "maker": "Cummins", "years": "1989–1998 (12-valve)", "config": "Inline-6 turbo-diesel, 12-valve OHV", "displacement": "5.9 L (359 cu in)", "notableFor": "Mechanical P7100 pump; legendary diesel longevity." },
      "industries": ["heavy-duty","automotive"], "fuels": ["diesel"], "systems": ["engine-mechanical","fuel"], "era": "modern", "regions": ["north-america"], "level": "journeyman",
      "tags": ["cummins","12 valve","diesel","6bt","history"], "media": { "image": "../assets/cards/engine-id/placeholder-card.svg" } },

    { "id": "id-vw-flat4", "type": "identify",
      "front": "Identify this engine: an air-cooled, horizontally-opposed flat-four mounted at the rear, with no radiator — it powered a famous 'people's car' for decades.",
      "back": "Volkswagen air-cooled flat-4 (boxer) — rear-mounted, fan-cooled, no radiator. Powered the Beetle, Bus and Karmann Ghia from 1938 into the 2000s.",
      "engineProfile": { "name": "VW Air-Cooled Flat-4", "maker": "Volkswagen", "years": "1938–2006", "config": "Air-cooled horizontally-opposed (boxer) flat-4", "displacement": "1.1–1.6 L", "notableFor": "Rear-mounted, fan-cooled simplicity; the Beetle's heart." },
      "industries": ["automotive"], "fuels": ["gasoline"], "systems": ["engine-mechanical","cooling"], "era": "classic", "regions": ["europe","global"], "level": "technician",
      "tags": ["volkswagen","boxer","air-cooled","beetle","history"], "media": { "image": "../assets/cards/engine-id/placeholder-card.svg" } },

    { "id": "id-model-t", "type": "identify",
      "front": "Identify this engine: a 177 cu in flathead inline-four making about 20 hp (1908–1927), with a detachable head, that could run on gasoline or ethanol and put the world on wheels.",
      "back": "Ford Model T inline-4 — the 2.9 L flathead four (1908–1927) that powered the first mass-produced, affordable automobile. Simple, repairable, multi-fuel.",
      "engineProfile": { "name": "Ford Model T Inline-4", "maker": "Ford", "years": "1908–1927", "config": "Inline-4, flathead, detachable head", "displacement": "177 cu in (2.9 L), ~20 hp", "notableFor": "Engine of the car that motorized the masses." },
      "industries": ["automotive"], "fuels": ["gasoline"], "systems": ["engine-mechanical"], "era": "pioneer", "regions": ["north-america","global"], "level": "apprentice",
      "tags": ["model t","ford","history","pioneer"], "media": { "image": "../assets/cards/engine-id/placeholder-card.svg" } },

    { "id": "id-detroit-6-71", "type": "identify",
      "front": "Identify this engine: a Roots-blown TWO-stroke inline-six diesel with an unmistakable high-pitched scream — '71' refers to 71 cu in per cylinder. Found in trucks, buses, boats and gensets.",
      "back": "Detroit Diesel 6-71 — a supercharged two-stroke diesel (1938–1995). The 71 = cubic inches per cylinder. Iconic sound and ubiquity across on- and off-highway use.",
      "engineProfile": { "name": "Detroit Diesel 6-71", "maker": "Detroit Diesel (GM)", "years": "1938–1995", "config": "Two-stroke inline-6 diesel, Roots-blown", "displacement": "426 cu in (6.98 L)", "notableFor": "Two-stroke diesel scream; trucks, buses, marine, gensets." },
      "industries": ["heavy-duty","marine-inboard","industrial"], "fuels": ["diesel"], "systems": ["engine-mechanical","air-intake"], "era": "classic", "regions": ["north-america"], "level": "journeyman",
      "tags": ["detroit diesel","two-stroke","6-71","history"], "media": { "image": "../assets/cards/engine-id/placeholder-card.svg" } },

    { "id": "id-honda-b", "type": "identify",
      "front": "Identify this engine: a high-revving DOHC inline-four with a variable valve-timing system (debuting around 1989) that defined the import tuner era with big power from a small naturally-aspirated four.",
      "back": "Honda B-series (e.g. B18C / VTEC) — DOHC inline-four, 1989–2001. Remarkable specific output and sky-high redline made it the icon of 1990s tuning.",
      "engineProfile": { "name": "Honda B-series (VTEC)", "maker": "Honda", "years": "1989–2001", "config": "DOHC inline-4 with VTEC", "displacement": "1.6–1.8 L", "notableFor": "High-revving VTEC; benchmark of NA tuner performance." },
      "industries": ["automotive"], "fuels": ["gasoline"], "systems": ["engine-mechanical","ignition"], "era": "modern", "regions": ["asia-pacific","global"], "level": "technician",
      "tags": ["honda","vtec","b-series","tuner","history"], "media": { "image": "../assets/cards/engine-id/placeholder-card.svg" } }
  ]
);
