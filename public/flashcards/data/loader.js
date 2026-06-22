/* =====================================================================
 * 365 Flash Cards Training — CARD LOADER
 * ---------------------------------------------------------------------
 * Section files are now inlined as <script defer> tags in index.html so
 * the browser downloads them in parallel and executes in order. By the
 * time this script runs (also defer), every section has self-registered
 * into CardDB. We just publish the assembled database and fire the
 * "cards-ready" event so the game can start.
 *
 * Legacy fallback: if for some reason no cards registered yet but a
 * window.CARD_MANIFEST is present, fall back to the old sequential
 * <script> injection so older index.html layouts keep working.
 * ===================================================================== */
(function () {
  "use strict";

  function publish() {
    window.CARDS = window.CardDB.cards;
    window.CARD_SECTIONS = window.CardDB.sections;
    var rpt = window.CardDB.report();
    console.log("[365 CardDB] Loaded " + rpt.cards + " cards across " + rpt.sections + " sections.");
    console.log("[365 CardDB] " + rpt.bySection.join("  |  "));
    if (rpt.placeholders) console.log("[365 CardDB] " + rpt.placeholders + " placeholder card(s) present.");
    if (rpt.warnings) {
      console.warn("[365 CardDB] " + rpt.warnings + " validation warning(s):");
      window.CardDB.warnings.forEach(function (w) { console.warn("   - " + w); });
    }
    document.dispatchEvent(new CustomEvent("cards-ready", { detail: rpt }));
  }

  if (!window.CardDB) {
    console.error("[365 CardDB] card-db.js must load before loader.js");
    return;
  }

  // Fast path: section scripts were inlined with defer and have already
  // registered themselves. Publish immediately.
  if (window.CardDB.cards.length > 0 || (window.CardDB.sections || []).length > 0) {
    publish();
    return;
  }

  // Legacy fallback: sequential script injection from window.CARD_MANIFEST.
  var manifest = window.CARD_MANIFEST || [];
  if (!manifest.length) {
    console.warn("[365 CardDB] manifest is empty and no inline sections registered.");
    publish();
    return;
  }
  var BASE = "data/";
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
  loadNext(0);
})();
