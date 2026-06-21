/* =====================================================================
 * 365 Flash Cards Training — CARD DATABASE (registry)
 * ---------------------------------------------------------------------
 * In-browser "database". Each section file in data/cards/ calls
 * CardDB.register(...) as it loads, so the database fills itself from
 * whatever section files are present — no central list to maintain.
 *
 * The loader (loader.js) pulls the section files in, then exposes the
 * assembled result as window.CARDS / window.CARD_SECTIONS for the game.
 * ===================================================================== */
(function () {
  "use strict";

  var T = window.TAXONOMY || null;
  function vIdx(dim) { return (T && T._index && T._index[dim]) ? T._index[dim] : null; }

  var CardDB = {
    sections: [],          // [{ id, name, count, file }]
    cards: [],             // flattened, every card tagged with __section
    warnings: [],
    _ids: Object.create(null),

    /**
     * Register one section's cards.
     * @param {Object} meta  { section:'automotive', name:'Automotive', file:'cards/automotive.js' }
     * @param {Array}  cards array of card objects (standard schema)
     */
    register: function (meta, cards) {
      meta = meta || {};
      var sectionId = meta.section || "uncategorized";
      var sectionName = meta.name || sectionId;
      var added = 0;

      (cards || []).forEach(function (card, i) {
        var label = sectionId + "[" + i + "] " + (card && card.id ? card.id : "(no id)");
        if (!card || !card.id) { CardDB.warnings.push(label + ": missing id — skipped"); return; }
        if (CardDB._ids[card.id]) { CardDB.warnings.push(label + ": duplicate id — skipped"); return; }
        if (!card.front || !card.back) { CardDB.warnings.push(label + ": missing front/back"); }

        var inIdx = vIdx("industries"), fuIdx = vIdx("fuels"), syIdx = vIdx("systems"),
            erIdx = vIdx("eras"), lvIdx = vIdx("levels"), rgIdx = vIdx("regions");
        if (erIdx && card.era && !erIdx[card.era]) CardDB.warnings.push(label + ": unknown era '" + card.era + "'");
        if (lvIdx && card.level && !lvIdx[card.level]) CardDB.warnings.push(label + ": unknown level '" + card.level + "'");
        (card.industries || []).forEach(function (x) { if (inIdx && !inIdx[x]) CardDB.warnings.push(label + ": unknown industry '" + x + "'"); });
        (card.fuels || []).forEach(function (x) { if (fuIdx && !fuIdx[x]) CardDB.warnings.push(label + ": unknown fuel '" + x + "'"); });
        (card.systems || []).forEach(function (x) { if (syIdx && !syIdx[x]) CardDB.warnings.push(label + ": unknown system '" + x + "'"); });
        (card.regions || []).forEach(function (x) { if (rgIdx && !rgIdx[x]) CardDB.warnings.push(label + ": unknown region '" + x + "'"); });

        if (!card.type) card.type = "flash";   // flash | identify
        card.__section = sectionId;
        CardDB._ids[card.id] = true;
        CardDB.cards.push(card);
        added++;
      });

      CardDB.sections.push({ id: sectionId, name: sectionName, count: added, file: meta.file || null });
      return added;
    },

    realCards: function () { return this.cards.filter(function (c) { return !c.placeholder; }); },

    report: function () {
      return {
        sections: this.sections.length,
        cards: this.cards.length,
        placeholders: this.cards.filter(function (c) { return c.placeholder; }).length,
        identify: this.cards.filter(function (c) { return c.type === "identify" && !c.placeholder; }).length,
        bySection: this.sections.map(function (s) { return s.name + ": " + s.count; }),
        warnings: this.warnings.length
      };
    }
  };

  window.CardDB = CardDB;
})();
