/* =====================================================================
 * 365 Flash Cards Training — SECTION: Motorcycle & Powersports
 * ---------------------------------------------------------------------
 * Self-registering card file. Schema: see data/cards/_template.js.
 * After adding files, run  node tools/build-index.js  to refresh the manifest.
 * ===================================================================== */
CardDB.register(
  { section: "motorcycle", name: "Motorcycle & Powersports", file: "cards/motorcycle-powersports.js" },
  [
  { "id": "ign-points", "front": "What were breaker points and why are they obsolete?", "back": "A mechanical switch that opened/closed the ignition primary circuit to fire the coil. Replaced by electronic/transistorized ignition — no wear, no periodic adjustment.", "industries": ["automotive","motorcycle"], "fuels": ["gasoline"], "systems": ["ignition"], "era": "obsolete", "regions": ["global"], "level": "technician", "tags": ["breaker points","dwell","distributor","obsolete"] },
  { "id": "ign-timing-advance", "front": "Why is ignition timing 'advanced' as RPM increases?", "back": "Combustion takes time. Firing the spark earlier (before TDC) at high RPM ensures peak cylinder pressure occurs just after TDC for maximum power.", "industries": ["automotive","motorcycle"], "fuels": ["gasoline"], "systems": ["ignition"], "era": "modern", "regions": ["global"], "level": "journeyman", "tags": ["timing advance","tdc","spark"] },
  { "id": "moto-chain-slack", "front": "Why must motorcycle drive-chain slack be set to spec — not too tight, not too loose?", "back": "Too tight stresses sprockets and the countershaft bearing as the swingarm moves; too loose can skip, snap, or derail. Spec slack accounts for suspension travel.", "industries": ["motorcycle"], "fuels": ["any"], "systems": ["drivetrain"], "era": "modern", "regions": ["global"], "level": "apprentice", "tags": ["chain","slack","sprocket","swingarm"] },
  { "id": "moto-countersteer", "front": "What is countersteering and why does it turn a motorcycle at speed?", "back": "Pressing the bar toward the turn direction (e.g. push left to go left) momentarily steers the front wheel out, leaning the bike into the turn via gyroscopic and geometric effects.", "industries": ["motorcycle"], "fuels": ["any"], "systems": ["steering-suspension"], "era": "modern", "regions": ["global"], "level": "technician", "tags": ["countersteer","lean","handling"] },
  /* ---- PLACEHOLDER SLOT — replace with a real card or delete it. ----
     Marked placeholder:true so it is tracked but kept OUT of gameplay. */
  { "id": "ph-motorcycle", "front": "PLACEHOLDER — put your card prompt (question or term) here", "back": "PLACEHOLDER — put the answer/definition here, then remove placeholder:true (or delete this card).", "industries": ["motorcycle"], "fuels": ["any"], "systems": ["engine-mechanical"], "era": "modern", "regions": ["global"], "level": "pre-apprentice", "tags": ["placeholder"], "media": { "image": "../assets/cards/motorcycle/placeholder-card.svg" }, "placeholder": true }
  ]
);
