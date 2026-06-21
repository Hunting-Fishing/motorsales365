/* =====================================================================
 * build-index.js — auto-discovery for the card database + card art,
 * with AUTO-CARD generation from dropped artwork.
 * ---------------------------------------------------------------------
 * Run:  node tools/build-index.js
 *
 * DROP-IN WORKFLOW (no coding):
 *   1. Rename your card images by a card id and front/back, e.g.
 *        auto-master-cylinder-front.png
 *        auto-master-cylinder-back.png
 *   2. Drop them in the folder for that category + system:
 *        assets/cards/<industry>/<system>/
 *      e.g. assets/cards/automotive/brakes/
 *   3. Run: node tools/build-index.js
 *
 * Any art whose card id is NOT already authored in a hand-written section
 * file gets a card auto-created in data/cards/imported-cards.js, with the
 * industry + system inferred from the folder path. The infographic image
 * IS the content; the text fields are just a searchable fallback you can
 * refine later (move the entry into a real section file to customize it).
 *
 * Writes: manifest.js, card-images.js, imported-cards.js, cards.json,
 *         cards.js, taxonomy.json
 * ===================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");
const cardsDir = path.join(dataDir, "cards");
const assetsCardsDir = path.join(root, "assets", "cards");
const IMPORTED = "imported-cards.js";

const PREFERRED = [
  "small-engines.js", "automotive.js", "motorcycle-powersports.js",
  "heavy-duty.js", "agricultural.js", "industrial.js",
  "marine-inboard.js", "marine-outboard.js", "engine-id.js"
];
const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

function loadTaxonomy() {
  const sb = { window: {} }; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(dataDir, "taxonomy.js"), "utf8"), sb);
  return sb.window.TAXONOMY;
}
function runRegistry(sectionFileNames) {
  const sb = { window: {}, document: { dispatchEvent() {}, createElement: () => ({}), head: { appendChild() {} } }, console: { log() {}, warn() {}, error() {} } };
  sb.CustomEvent = function () {}; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(dataDir, "taxonomy.js"), "utf8"), sb);
  vm.runInContext(fs.readFileSync(path.join(dataDir, "card-db.js"), "utf8"), sb);
  sb.CardDB = sb.window.CardDB;
  sectionFileNames.forEach(f => vm.runInContext(fs.readFileSync(path.join(cardsDir, f), "utf8"), sb));
  return sb.window.CardDB;
}
function listSectionFiles() {
  return fs.readdirSync(cardsDir).filter(f => f.endsWith(".js") && !f.startsWith("_"));
}
function orderFiles(files) {
  return files.slice().sort((a, b) => {
    const ia = PREFERRED.indexOf(a), ib = PREFERRED.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib);
    return a.localeCompare(b);
  });
}

// ---- Scan all card art recursively ----
function scanArt(industrySet, systemSet) {
  const images = {}, meta = {};
  let count = 0;
  function walk(dir, rel) {
    for (const e of fs.readdirSync(dir)) {
      const fp = path.join(dir, e), rp = rel ? rel + "/" + e : e, st = fs.statSync(fp);
      if (st.isDirectory()) { walk(fp, rp); continue; }
      const ext = path.extname(e).toLowerCase();
      if (!IMG_EXT.has(ext)) continue;
      if (path.basename(e, ext).toLowerCase().startsWith("placeholder-card")) continue;
      let stem = path.basename(e, ext), role = "sheet", id = stem;
      if (/-front$/i.test(stem)) { role = "front"; id = stem.replace(/-front$/i, ""); }
      else if (/-back$/i.test(stem)) { role = "back"; id = stem.replace(/-back$/i, ""); }
      (images[id] = images[id] || {})[role] = "assets/cards/" + rp;
      // infer industry + system from the path segments
      if (!meta[id]) meta[id] = { industry: null, system: null };
      rp.split("/").forEach(seg => {
        if (industrySet.has(seg)) meta[id].industry = seg;
        if (systemSet.has(seg)) meta[id].system = seg;
      });
      count++;
    }
  }
  if (fs.existsSync(assetsCardsDir)) walk(assetsCardsDir, "");
  return { images, meta, count };
}
function humanize(id) {
  return id.replace(/^(auto|se|hd|moto|ev|marine|ag|ind)-/, "").replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

const T = loadTaxonomy();
const industrySet = new Set(T.industries.map(i => i.id));
const systemSet = new Set(T.systems.map(s => s.id));

// ---- Pass A: authored cards (everything except the generated file) ----
const authoredFiles = listSectionFiles().filter(f => f !== IMPORTED);
const authoredDB = runRegistry(orderFiles(authoredFiles));
const authoredIds = new Set(authoredDB.cards.map(c => c.id));

// ---- Scan art, find orphans (art with no authored card) ----
const art = scanArt(industrySet, systemSet);
const orphanIds = Object.keys(art.images).filter(id => !authoredIds.has(id));

// ---- Generate imported-cards.js for orphan art ----
const importedCards = orphanIds.map(id => {
  const m = art.meta[id] || {};
  const ind = m.industry || "automotive", sys = m.system || "engine-mechanical";
  return {
    id: id,
    front: "Identify the component shown and state its function.",
    back: humanize(id),
    industries: [ind], fuels: ["any"], systems: [sys],
    era: "modern", regions: ["north-america"], level: "technician",
    tags: id.split("-").filter(Boolean)
  };
});
const importedBody = importedCards.map(c => "  " + JSON.stringify(c)).join(",\n");
fs.writeFileSync(path.join(cardsDir, IMPORTED),
  "/* AUTO-GENERATED by tools/build-index.js — cards created from dropped art.\n" +
  " * One card per <id>-front/<id>-back image that isn't authored elsewhere.\n" +
  " * The image is the content; to customize text/level/etc., move the entry\n" +
  " * into a hand-written section file (e.g. automotive.js) under the same id. */\n" +
  "CardDB.register(\n" +
  "  { section: \"imported\", name: \"Imported (from art)\", file: \"cards/" + IMPORTED + "\" },\n" +
  "  [\n" + importedBody + (importedBody ? "\n" : "") + "  ]\n);\n");

// ---- Build manifest (all section files incl. imported) ----
const allFiles = orderFiles(listSectionFiles());
fs.writeFileSync(path.join(dataDir, "manifest.js"),
  "/* AUTO-GENERATED by tools/build-index.js — do not edit by hand. */\n" +
  "window.CARD_MANIFEST = [\n" + allFiles.map(f => "  " + JSON.stringify("cards/" + f)).join(",\n") + "\n];\n");

// ---- Pass B: full DB (authored + imported) for mirrors + report ----
const db = runRegistry(allFiles);
const real = db.realCards();

// ---- card-images.js ----
fs.writeFileSync(path.join(dataDir, "card-images.js"),
  "/* AUTO-GENERATED by tools/build-index.js — card-id -> art images. */\n" +
  "window.CARD_IMAGES = " + JSON.stringify(art.images, null, 2) + ";\n");

// ---- mirrors ----
const tax = Object.assign({}, T); delete tax._index;
fs.writeFileSync(path.join(dataDir, "taxonomy.json"), JSON.stringify(tax, null, 2));
function strip(c) { const o = Object.assign({}, c); delete o.__section; return o; }
const flat = real.map(strip);
fs.writeFileSync(path.join(dataDir, "cards.json"), JSON.stringify(flat, null, 2));
fs.writeFileSync(path.join(dataDir, "cards.js"),
  "/* AUTO-GENERATED flattened mirror (real cards only). */\n" +
  "window.CARDS = " + JSON.stringify(flat, null, 2) + ";\n");

// ---- report ----
const sysName = {}; (T.systems || []).forEach(s => sysName[s.id] = s.name);
const sysCount = {}; real.forEach(c => (c.systems || []).forEach(s => sysCount[s] = (sysCount[s] || 0) + 1));
console.log("Sections discovered: " + allFiles.length);
db.sections.forEach(s => console.log("  - " + s.name + " (" + s.count + ")  [" + s.file + "]"));
console.log("Total cards: " + db.cards.length + "  |  real: " + real.length + "  |  placeholders: " + (db.cards.length - real.length));
console.log("Auto-created from art: " + importedCards.length + " card(s).");
console.log("By system:");
Object.keys(sysName).forEach(id => { if (sysCount[id]) console.log("  - " + (sysName[id] || id) + ": " + sysCount[id]); });
console.log("Card art: " + art.count + " file(s) covering " + Object.keys(art.images).length + " card id(s).");
if (db.warnings.length) { console.log("Warnings (" + db.warnings.length + "):"); db.warnings.forEach(w => console.log("  ! " + w)); }
console.log("Wrote: manifest.js, card-images.js, " + IMPORTED + ", cards.json, cards.js, taxonomy.json");
