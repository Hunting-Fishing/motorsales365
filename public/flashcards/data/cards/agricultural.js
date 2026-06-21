/* =====================================================================
 * 365 Flash Cards Training — SECTION: Agricultural
 * ---------------------------------------------------------------------
 * Self-registering card file. Schema: see data/cards/_template.js.
 * After adding files, run  node tools/build-index.js  to refresh the manifest.
 * ===================================================================== */
CardDB.register(
  { section: "agricultural", name: "Agricultural", file: "cards/agricultural.js" },
  [
  /* ---- PLACEHOLDER SLOT — replace with a real card or delete it. ----
     Marked placeholder:true so it is tracked but kept OUT of gameplay. */
  { "id": "ph-agricultural", "front": "PLACEHOLDER — put your card prompt (question or term) here", "back": "PLACEHOLDER — put the answer/definition here, then remove placeholder:true (or delete this card).", "industries": ["agricultural"], "fuels": ["any"], "systems": ["engine-mechanical"], "era": "modern", "regions": ["global"], "level": "pre-apprentice", "tags": ["placeholder"], "media": { "image": "../assets/cards/agricultural/placeholder-card.svg" }, "placeholder": true }
  ]
);
