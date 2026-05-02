// Vehicle make aliases + helpers to expand a user query into search alternates.
// Stacks with fuzzy matching: aliases handle known variants ("VW" -> "Volkswagen"),
// fuzzy handles typos ("Toyta" -> "Toyota").

import { CAR_MAKES, MOTORCYCLE_MAKES } from "@/data/vehicles";
import { fuzzyScore, normalize } from "@/lib/fuzzy";

/**
 * Map of canonical make -> known aliases (lowercased, no punctuation needed —
 * matching is done after normalize()).
 */
export const MAKE_ALIASES: Record<string, string[]> = {
  Volkswagen: ["vw", "v dub", "vee dub"],
  "Mercedes-Benz": ["mercedes", "benz", "merc", "mercedez", "mercedes benz"],
  BMW: ["beemer", "bimmer", "bee em double you"],
  Chevrolet: ["chevy", "chev"],
  "Lynk & Co": ["lynk and co", "lynk co", "lynkco", "link and co"],
  Mitsubishi: ["mitsu"],
  Volvo: ["volvo cars"],
  "Mini": ["mini cooper"],
  "Land Rover": ["landrover", "land-rover", "rover"],
  "Range Rover": ["rangerover", "range-rover"],
  Porsche: ["porche"],
  Hyundai: ["hyu", "hyndai"],
  Kawasaki: ["kawa"],
  Yamaha: ["yam"],
  Suzuki: ["suzu"],
  Kymco: ["ky mco"],
};

const ALL_MAKES = [
  ...new Set([...CAR_MAKES.map((m) => m.make), ...MOTORCYCLE_MAKES.map((m) => m.make)]),
];

/**
 * Given a raw user query, return the canonical make names it could refer to,
 * via alias lookup. Empty array if none match.
 */
export function expandMakeQuery(q: string): string[] {
  const nq = normalize(q);
  if (!nq) return [];
  const out: string[] = [];
  for (const [canonical, aliases] of Object.entries(MAKE_ALIASES)) {
    if (normalize(canonical) === nq) {
      out.push(canonical);
      continue;
    }
    for (const a of aliases) {
      if (normalize(a) === nq) {
        out.push(canonical);
        break;
      }
    }
  }
  return out;
}

/**
 * Build a list of search alternates for a free-text vehicle query, combining:
 * - the original query
 * - alias expansions (canonical make for "vw" -> "Volkswagen")
 * - fuzzy-close make names from the dataset (typo handling)
 *
 * Capped to keep DB ilike `or()` filters reasonable.
 */
export function buildTitleSearchTerms(q: string, max = 6): string[] {
  const original = q.trim();
  if (!original) return [];
  const set = new Set<string>([original]);

  for (const c of expandMakeQuery(original)) set.add(c);

  // Fuzzy-close makes
  const scored: { name: string; score: number }[] = [];
  for (const name of ALL_MAKES) {
    const s = fuzzyScore(original, name);
    if (s !== Infinity && s > 0) scored.push({ name, score: s });
  }
  scored.sort((a, b) => a.score - b.score);
  for (const { name } of scored) {
    if (set.size >= max) break;
    set.add(name);
  }

  return Array.from(set).slice(0, max);
}
