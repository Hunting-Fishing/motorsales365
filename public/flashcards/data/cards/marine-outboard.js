/* =====================================================================
 * 365 Flash Cards Training — SECTION: Marine — Outboard
 * ---------------------------------------------------------------------
 * Self-registering card file. Schema: see data/cards/_template.js.
 * After adding files, run  node tools/build-index.js  to refresh the manifest.
 * ===================================================================== */
CardDB.register(
  { section: "marine-outboard", name: "Marine — Outboard", file: "cards/marine-outboard.js" },
  [
  { "id": "se-2stroke-oil", "front": "Why does a typical 2-stroke small engine need oil mixed into its fuel?", "back": "It has no separate sump/oil pump. The fuel-oil mix lubricates the crankcase, bearings, and cylinder as it passes through before combustion.", "industries": ["small-engine","marine-outboard"], "fuels": ["gasoline"], "systems": ["lubrication","fuel"], "era": "classic", "regions": ["global"], "level": "apprentice", "tags": ["2-stroke","premix","oil ratio"] },
  { "id": "cool-marine-raw", "front": "Difference between a raw-water and a closed (freshwater) cooling system on a boat?", "back": "Raw-water draws outside water directly through the engine. Closed cooling circulates coolant in the engine and uses a heat exchanger cooled by raw water — protecting internal passages from salt/corrosion.", "industries": ["marine-inboard","marine-outboard"], "fuels": ["any"], "systems": ["cooling"], "era": "modern", "regions": ["global"], "level": "journeyman", "tags": ["raw water","heat exchanger","marine","corrosion"] },
  { "id": "cool-impeller", "front": "On most outboards, what pumps cooling water and what is a key maintenance item?", "back": "A rubber impeller (water pump) in the lower unit. The impeller wears and must be replaced periodically; a missing 'telltale' stream signals a failed impeller or blockage.", "industries": ["marine-outboard"], "fuels": ["any"], "systems": ["cooling"], "era": "modern", "regions": ["global"], "level": "technician", "tags": ["impeller","water pump","telltale","outboard"] },
  { "id": "fuel-injector", "front": "What does a fuel injector do in an EFI engine?", "back": "An electrically-controlled valve that sprays a precise, atomized amount of fuel into the intake or cylinder, timed and metered by the ECU.", "industries": ["automotive","motorcycle","marine-outboard"], "fuels": ["gasoline"], "systems": ["fuel"], "era": "modern", "regions": ["global"], "level": "apprentice", "tags": ["injector","efi","atomize"] },
  /* ---- PLACEHOLDER SLOT — replace with a real card or delete it. ----
     Marked placeholder:true so it is tracked but kept OUT of gameplay. */
  { "id": "ph-marine-outboard", "front": "PLACEHOLDER — put your card prompt (question or term) here", "back": "PLACEHOLDER — put the answer/definition here, then remove placeholder:true (or delete this card).", "industries": ["marine-outboard"], "fuels": ["any"], "systems": ["cooling"], "era": "modern", "regions": ["global"], "level": "pre-apprentice", "tags": ["placeholder"], "media": { "image": "../assets/cards/marine-outboard/placeholder-card.svg" }, "placeholder": true }
  ]
);
