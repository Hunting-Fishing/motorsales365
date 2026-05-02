// Lightweight fuzzy matching utilities (no dependencies).
// Used for vehicle make/model search to tolerate typos like "Toyta" -> "Toyota".

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compact(s: string): string {
  return normalize(s).replace(/\s+/g, "");
}

/**
 * Damerau–Levenshtein distance with early-exit when distance exceeds `max`.
 */
export function damerauLevenshtein(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const prevPrev = new Array<number>(bl + 1);
  const prev = new Array<number>(bl + 1);
  const curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let val = Math.min(
        curr[j - 1] + 1, // insertion
        prev[j] + 1, // deletion
        prev[j - 1] + cost, // substitution
      );
      if (
        i > 1 &&
        j > 1 &&
        a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
      ) {
        val = Math.min(val, prevPrev[j - 2] + 1); // transposition
      }
      curr[j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= bl; j++) {
      prevPrev[j] = prev[j];
      prev[j] = curr[j];
    }
  }
  return prev[bl];
}

export function fuzzyThreshold(len: number): number {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  return 2;
}

/**
 * Score a candidate against a query. Lower = better.
 *  0 = exact (normalized)
 *  1 = prefix
 *  2 = substring (word-aware)
 *  3+ = edit distance + 2 (so distance 1 -> score 3)
 *  Infinity = no match
 */
export function fuzzyScore(query: string, candidate: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const c = normalize(candidate);
  if (!c) return Infinity;

  if (q === c) return 0;
  if (c.startsWith(q)) return 1;
  if (c.includes(q)) return 2;

  // Word-level prefix/substring (e.g. "civic" matches "Honda Civic")
  const words = c.split(" ");
  for (const w of words) {
    if (w.startsWith(q)) return 1.5;
    if (w.includes(q)) return 2.5;
  }

  // Compact (ignore spaces) — lets "lynkandco" match "lynk and co"
  const qc = q.replace(/\s+/g, "");
  const cc = c.replace(/\s+/g, "");
  if (qc === cc) return 0.5;
  if (cc.startsWith(qc)) return 1.2;
  if (cc.includes(qc)) return 2.2;

  // Fuzzy by edit distance — compare against best of full and per-word.
  const threshold = fuzzyThreshold(qc.length);
  if (threshold === 0) return Infinity;

  let best = damerauLevenshtein(qc, cc, threshold);
  for (const w of words) {
    const wc = w.replace(/\s+/g, "");
    if (Math.abs(wc.length - qc.length) <= threshold) {
      const d = damerauLevenshtein(qc, wc, threshold);
      if (d < best) best = d;
    }
  }
  if (best <= threshold) return 3 + best;
  return Infinity;
}

export function fuzzyMatch(query: string, candidate: string): boolean {
  return fuzzyScore(query, candidate) !== Infinity;
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string | string[],
): T[] {
  if (!query.trim()) return items;
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const texts = getText(item);
    const arr = Array.isArray(texts) ? texts : [texts];
    let best = Infinity;
    for (const t of arr) {
      const s = fuzzyScore(query, t);
      if (s < best) best = s;
    }
    if (best !== Infinity) scored.push({ item, score: best });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.map((s) => s.item);
}

export { compact };
