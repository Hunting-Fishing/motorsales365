/* =====================================================================
 * 365 Flash Cards Training — SECTION TEMPLATE  (copy me to start a new
 * section, e.g. data/cards/aviation.js)
 * ---------------------------------------------------------------------
 * HOW TO ADD A SECTION
 *   1. Copy this file to data/cards/<your-section>.js
 *   2. Set the section id + name in CardDB.register({...}).
 *   3. Fill the array with cards using the schema below.
 *   4. Run:  node tools/build-index.js   (refreshes the manifest so the
 *      loader auto-discovers the new file).
 *
 * Files starting with "_" are ignored by the loader, so this never ships.
 *
 * ---------------------------------------------------------------------
 * CARD SCHEMA (v2)
 *   id          unique, stable, kebab-case. NEVER reuse an id.
 *   front       prompt shown first (a question OR a term)
 *   back        the answer / definition shown after the flip
 *   hint        OPTIONAL nudge revealed on demand
 *   industries  1+ ids from taxonomy.industries (automotive, marine-*, ...)
 *   fuels       1+ ids from taxonomy.fuels (gasoline, diesel, electric,
 *               hybrid, hydrogen, alt-gas, steam, or "any" = universal)
 *   systems     1+ ids from taxonomy.systems
 *   era         1 id  from taxonomy.eras (pioneer|vintage|classic|modern|emerging|obsolete)
 *   regions     1+ ids from taxonomy.regions
 *   level       1 id  from taxonomy.levels (pre-apprentice → master)
 *   tags        free-form search keywords (array of strings)
 *   regionValues OPTIONAL { imperial:"…", metric:"…" }
 *   media       OPTIONAL { image:"../assets/cards/<section>/<file>" }
 *   type        OPTIONAL "flash" (default) or "identify"
 *   engineProfile OPTIONAL (identify cards) { name, maker, years, config, displacement, notableFor }
 *   placeholder OPTIONAL true → tracked but kept OUT of gameplay
 *
 * Valid ids live in data/taxonomy.js. Unknown ids still load but warn.
 * ===================================================================== */
CardDB.register(
  { section: "template", name: "Template (example)", file: "cards/_template.js" },
  [
    {
      "id": "tpl-example-1",
      "front": "What does this field show? (front = the prompt)",
      "back": "The answer side. Replace with real content and remove the placeholder flag.",
      "hint": "Optional hint text appears on demand.",
      "industries": ["automotive"],
      "fuels": ["any"],
      "systems": ["engine-mechanical"],
      "era": "modern",
      "regions": ["global"],
      "level": "apprentice",
      "tags": ["example", "template"],
      "regionValues": { "imperial": "e.g. 90 lb-ft", "metric": "e.g. 122 N·m" },
      "media": { "image": "../assets/cards/template/placeholder-card.svg" },
      "placeholder": true
    },
    {
      "id": "tpl-identify-1",
      "type": "identify",
      "front": "Identify this engine: <clue without naming it>.",
      "back": "<Engine name> — short profile and why it matters.",
      "engineProfile": { "name": "<Engine name>", "maker": "<Maker>", "years": "<years>", "config": "<layout>", "displacement": "<size>", "notableFor": "<claim to fame>" },
      "industries": ["automotive"],
      "fuels": ["gasoline"],
      "systems": ["engine-mechanical"],
      "era": "classic",
      "regions": ["global"],
      "level": "technician",
      "tags": ["identify", "template"],
      "media": { "image": "../assets/cards/template/placeholder-card.svg" },
      "placeholder": true
    }
  ]
);
