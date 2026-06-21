/* =====================================================================
 * 365 Flash Cards Training — CARD LOADER
 * ---------------------------------------------------------------------
 * Reads window.CARD_MANIFEST (the list of section files, in data/) and
 * loads them in order. Each file self-registers into CardDB. When all
 * are loaded, it publishes the assembled database and fires "cards-ready"
 * so the game can start.
 *
 * Uses <script> injection (not fetch), so it works from a local file
 * OR any static host with zero configuration and no CORS issues.
 *
 * If a section file is missing or fails, it's logged and skipped — the
 * rest of the database still loads. This is the "auto-update" behavior:
 * whatever section files exist and are listed get discovered at load.
 * ===================================================================== */
(function () {
  "use strict";

  var BASE = "data/";
  var manifest = window.CARD_MANIFEST || [];

  function publish() {
    // Expose the assembled database to the game.
    window.CARDS = window.CardDB.cards;
    window.CARD_SECTIONS = window.CardDB.sections;

    var rpt = window.CardDB.report();
    console.log("[365 CardDB] Loaded " + rpt.cards + " cards across " + rpt.sections + " sections.");
    console.log("[365 CardDB] " + rpt.bySection.join("  |  "));
    if (rpt.placeholders) console.log("[365 CardDB] " + rpt.placeholders + " placeholder card(s) present — replace with real content.");
    if (rpt.warnings) {
      console.warn("[365 CardDB] " + rpt.warnings + " validation warning(s):");
      window.CardDB.warnings.forEach(function (w) { console.warn("   - " + w); });
    }

    document.dispatchEvent(new CustomEvent("cards-ready", { detail: rpt }));
  }

  function loadNext(i) {
    if (i >= manifest.length) { publish(); return; }
    var s = document.createElement("script");
    s.src = BASE + manifest[i];
    s.onload = function () { loadNext(i + 1); };
    s.onerror = function () {
      console.warn("[365 CardDB] Could not load section file: " + manifest[i] + " (skipped)");
      loadNext(i + 1);
    };
    document.head.appendChild(s);
  }

  if (!window.CardDB) {
    console.error("[365 CardDB] card-db.js must load before loader.js");
    return;
  }
  if (!manifest.length) {
    console.warn("[365 CardDB] manifest is empty — no section files to load.");
    publish();
    return;
  }
  loadNext(0);
})();
