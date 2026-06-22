/* =====================================================================
 * 365 Flash Cards Training — CARD LOADER
 * ---------------------------------------------------------------------
 * Section files are inlined as <script defer> tags in index.html so the
 * browser downloads them in parallel and executes them in order. By the
 * time this script runs (also defer), every bundled section has
 * self-registered into CardDB.
 *
 * Before publishing, we try to fetch the cloud snapshot from
 *   /api/public/flashcards/content
 * If it returns a non-empty `cards` array, that snapshot overrides the
 * bundled cards so the live game reflects whatever an admin last pulled
 * via the "Pull latest from GitHub" button — no rebuild required.
 *
 * If the fetch fails (offline, server error, empty snapshot), we silently
 * keep the bundled cards so the game always works.
 * ===================================================================== */
(function () {
  "use strict";

  if (!window.CardDB) {
    console.error("[365 CardDB] card-db.js must load before loader.js");
    return;
  }

  function publish() {
    window.CARDS = window.CardDB.cards;
    window.CARD_SECTIONS = window.CardDB.sections;
    var rpt = window.CardDB.report();
    console.log(
      "[365 CardDB] Loaded " + rpt.cards + " cards across " + rpt.sections + " sections."
    );
    if (rpt.placeholders)
      console.log("[365 CardDB] " + rpt.placeholders + " placeholder card(s) present.");
    if (rpt.warnings)
      console.warn("[365 CardDB] " + rpt.warnings + " validation warning(s).");
    document.dispatchEvent(new CustomEvent("cards-ready", { detail: rpt }));
  }

  function applyCloudSnapshot(snap) {
    if (!snap || !Array.isArray(snap.cards) || snap.cards.length === 0) return false;
    // Replace bundled cards with the cloud snapshot. Sections are derived
    // from the cards' __section / section / industries fields so the home
    // gallery still groups correctly.
    var bySection = Object.create(null);
    var cards = [];
    var seen = Object.create(null);
    snap.cards.forEach(function (c) {
      if (!c || !c.id || seen[c.id]) return;
      seen[c.id] = true;
      if (!c.type) c.type = "flash";
      var sec = c.__section || c.section || (c.industries && c.industries[0]) || "uncategorized";
      c.__section = sec;
      cards.push(c);
      bySection[sec] = (bySection[sec] || 0) + 1;
    });
    window.CardDB.cards = cards;
    window.CardDB.sections = Object.keys(bySection).map(function (id) {
      return { id: id, name: id.charAt(0).toUpperCase() + id.slice(1), count: bySection[id], file: null };
    });
    if (snap.taxonomy && typeof snap.taxonomy === "object") {
      // Only override if the bundled taxonomy is missing — keeping the
      // bundled one is safer because it includes the `_index` lookup the
      // game relies on.
      if (!window.TAXONOMY) window.TAXONOMY = snap.taxonomy;
    }
    if (snap.cardImages && typeof snap.cardImages === "object") {
      window.CARD_IMAGES = Object.assign({}, window.CARD_IMAGES || {}, snap.cardImages);
    }
    console.log(
      "[365 CardDB] Cloud snapshot applied: " +
        cards.length +
        " cards (version " +
        (snap.version || 0) +
        ")"
    );
    return true;
  }

  function fetchCloud() {
    return fetch("/api/public/flashcards/content", { credentials: "omit" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // 2.5s budget so a slow/dead endpoint doesn't block the game.
  var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 2500); });
  Promise.race([fetchCloud(), timeout]).then(function (snap) {
    try { applyCloudSnapshot(snap); } catch (e) {
      console.warn("[365 CardDB] cloud snapshot failed:", e);
    }
    publish();
  });
})();
