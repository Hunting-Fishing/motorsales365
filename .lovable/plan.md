# Plan: Fuzzy Typo Matching for Vehicle Search

## Goal
Make vehicle make/model search tolerant of small typos (e.g., "Toyta" → "Toyota", "Hondaa" → "Honda", "Mitusbishi" → "Mitsubishi") so users still find listings when they misspell brand or model names.

## Approach
Implement a small, dependency-free fuzzy matcher based on **Damerau–Levenshtein distance** (handles 1-char insert/delete/substitute and adjacent transpositions like "Toyta"↔"Toyota"). This stacks on top of the alias matching from the previous plan — aliases handle known variants ("VW"→"Volkswagen"), fuzzy handles typos.

Match policy (prevents bad matches on short strings):
- Length 1–3: exact only (no fuzzy)
- Length 4–6: distance ≤ 1
- Length 7+: distance ≤ 2
- Always prefer: exact > prefix/substring > alias > fuzzy

## Files

### Add: `src/lib/vehicle-aliases.ts`
- `MAKE_ALIASES`: map of canonical make → alias array (VW→Volkswagen, Benz/Mercedes→Mercedes-Benz, Chevy→Chevrolet, Lynk and Co→Lynk & Co, BMW M, Beemer, Bimmer, etc.).
- `normalize(s)`: lowercase, strip punctuation/`&`/`-`, collapse spaces.
- `expandMakeQuery(q)`: returns array of canonical candidates from alias map.

### Add: `src/lib/fuzzy.ts`
- `damerauLevenshtein(a, b)`: small DP implementation (~40 lines), early-exit when distance exceeds threshold.
- `fuzzyThreshold(len)`: returns 0 / 1 / 2 per policy above.
- `fuzzyMatch(query, candidate)`: boolean — true if normalized query matches by exact, substring, alias, or distance ≤ threshold.
- `fuzzyScore(query, candidate)`: numeric rank (0=exact, 1=prefix, 2=substring, 3+ =distance) for sorting.
- `fuzzyFilter<T>(items, query, getText)`: utility to filter+sort an array by best score.

### Edit: `src/components/vehicle-picker.tsx`
- Replace the `Command`'s `filter` prop with a custom function that uses `fuzzyMatch` against the option string (also matching aliases for makes).
- Update the "No makes/models found" empty state still offers "Use {query}" for custom values.
- Sort visible results by `fuzzyScore` so the closest match floats to the top (e.g. typing "Toyta" puts "Toyota" first).

### Edit: `src/routes/browse.$category.tsx`
The current Supabase query uses `ilike("title", "%q%")`, which won't catch typos server-side. Two-layer approach:
1. **Server side**: when the query looks like a make/model, expand it via aliases + close fuzzy matches against the known make/model list (`getMakes`) and build an `or(title.ilike.%alt1%,title.ilike.%alt2%,…)` filter (cap at ~8 alternates) so DB filtering still helps.
2. **Client side**: after results return, if the user's `q` didn't match many rows (<6) and looks like a vehicle term, run a second fetch without the title filter (still scoped by category/region/etc.) and apply `fuzzyFilter` on `title` client-side, capped at 60 rows. This preserves typo tolerance without scanning the entire DB.

A small helper `buildTitleSearchTerms(q)` lives in `src/lib/vehicle-aliases.ts` and produces the alternates list (canonical make + its aliases + fuzzy-close makes/models from the dataset).

## Technical details
- Pure TS, zero new dependencies.
- Damerau–Levenshtein with early termination keeps cost trivial for small candidate lists (~80 makes, a few hundred models).
- All matching runs on **normalized** strings (lowercased, punctuation/spaces stripped) so "Lynk & Co" / "lynkandco" / "lynk co" all align.
- Fuzzy is only applied to vehicle make/model search — not general text fields — to avoid surprising matches in unrelated places.
- Existing listings and stored data are untouched; this is purely a search/UX layer.

## Out of scope
- Phonetic matching (Soundex/Metaphone). Damerau–Levenshtein already covers the common Filipino-keyboard typos.
- Server-side trigram/`pg_trgm` index. Can add later if listing volume makes the fallback fetch too costly.
- Fuzzy matching on city/region names.

Approve and I'll implement.
