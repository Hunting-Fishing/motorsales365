/* =====================================================================
 * 365 Flash Cards Training — SECTION: Industrial / Stationary
 * ---------------------------------------------------------------------
 * Self-registering card file. Schema: see data/cards/_template.js.
 * After adding files, run  node tools/build-index.js  to refresh the manifest.
 * ===================================================================== */
CardDB.register(
  { section: "industrial", name: "Industrial / Stationary", file: "cards/industrial.js" },
  [
  /* ---- PLACEHOLDER SLOT — replace with a real card or delete it. ----
     Marked placeholder:true so it is tracked but kept OUT of gameplay. */
  { "id": "ph-industrial", "front": "PLACEHOLDER — put your card prompt (question or term) here", "back": "PLACEHOLDER — put the answer/definition here, then remove placeholder:true (or delete this card).", "industries": ["industrial"], "fuels": ["any"], "systems": ["engine-mechanical"], "era": "modern", "regions": ["global"], "level": "pre-apprentice", "tags": ["placeholder"], "media": { "image": "../assets/cards/industrial/placeholder-card.svg" }, "placeholder": true }
  ]
);
