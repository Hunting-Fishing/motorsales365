/* =====================================================================
 * 365 Flash Cards Training — SECTION: Small Engines
 * ---------------------------------------------------------------------
 * Self-registering card file. Schema: see data/cards/_template.js.
 * After adding files, run  node tools/build-index.js  to refresh the manifest.
 * ===================================================================== */
CardDB.register(
  { section: "small-engine", name: "Small Engines", file: "cards/small-engines.js" },
  [
  { "id": "se-4stroke-cycle", "front": "Name the four strokes of a 4-stroke engine cycle, in order.", "back": "Intake, Compression, Power (combustion), Exhaust. Two crankshaft revolutions complete one cycle.", "hint": "\"Suck, squeeze, bang, blow.\"", "industries": ["small-engine","automotive"], "fuels": ["gasoline"], "systems": ["engine-mechanical"], "era": "modern", "regions": ["global"], "level": "pre-apprentice", "tags": ["otto cycle","strokes","fundamentals"] },
  { "id": "se-gap-spark", "front": "What does a spark plug gap that is too wide cause?", "back": "A weak or intermittent spark (the coil may not reliably jump the larger gap), leading to misfire, hard starting, and rough running.", "industries": ["small-engine","automotive"], "fuels": ["gasoline"], "systems": ["ignition"], "era": "modern", "regions": ["global"], "level": "apprentice", "tags": ["spark plug","gap","misfire"] },
  { "id": "se-governor", "front": "What is the job of a governor on a small engine?", "back": "It automatically adjusts the throttle to hold a target engine speed (RPM) under changing load — preventing overspeed and stalling.", "industries": ["small-engine"], "fuels": ["gasoline"], "systems": ["fuel","engine-mechanical"], "era": "modern", "regions": ["global"], "level": "technician", "tags": ["governor","rpm","load"] },
  { "id": "se-flooded", "front": "A small engine is 'flooded.' What does that mean and a first fix?", "back": "Excess fuel has wet the spark plug so it can't ignite. Stop choking, hold throttle wide open and crank to clear it, or remove and dry the plug.", "industries": ["small-engine"], "fuels": ["gasoline"], "systems": ["fuel","ignition"], "era": "modern", "regions": ["global"], "level": "pre-apprentice", "tags": ["flooded","choke","no start"] },
  { "id": "carb-venturi", "front": "How does a carburetor's venturi draw fuel into the airstream?", "back": "Air speeding through the narrowed venturi drops in pressure (Bernoulli). The low pressure pulls fuel from the float bowl through the jet into the air.", "hint": "Think pressure vs. velocity.", "industries": ["automotive","small-engine"], "fuels": ["gasoline"], "systems": ["fuel"], "era": "obsolete", "regions": ["global"], "level": "technician", "tags": ["carburetor","venturi","bernoulli","obsolete"] },
  { "id": "carb-choke", "front": "What does the choke do on a carbureted engine during cold start?", "back": "It restricts incoming air to enrich the air-fuel mixture, helping a cold engine start and run until it warms up.", "industries": ["small-engine","automotive"], "fuels": ["gasoline"], "systems": ["fuel"], "era": "obsolete", "regions": ["global"], "level": "pre-apprentice", "tags": ["choke","cold start","carburetor"] },
  /* ---- PLACEHOLDER SLOT — replace with a real card or delete it. ----
     Marked placeholder:true so it is tracked but kept OUT of gameplay. */
  { "id": "ph-small-engine", "front": "PLACEHOLDER — put your card prompt (question or term) here", "back": "PLACEHOLDER — put the answer/definition here, then remove placeholder:true (or delete this card).", "industries": ["small-engine"], "fuels": ["any"], "systems": ["engine-mechanical"], "era": "modern", "regions": ["global"], "level": "pre-apprentice", "tags": ["placeholder"], "media": { "image": "../assets/cards/small-engine/placeholder-card.svg" }, "placeholder": true }
  ]
);
