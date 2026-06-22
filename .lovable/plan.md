
## Why the page feels slow today

`/learn/flashcards` and `/games` mount the game in an `<iframe>` pointing at `/flashcards/index.html`. The iframe boots an entirely separate document: re-parses HTML, re-fetches CSS, loads ~20 small script files sequentially (`taxonomy.js`, `card-db.js`, `manifest.js`, every per-section data file, then `app.js`), then runs through every section file calling `CardDB.register(...)`. That's the bulk of the perceived load time, not the network.

## Architectural blocker (important)

> A runtime "pull from GitHub and overwrite `public/flashcards/`" button is **not possible** on this stack. The app runs on Cloudflare Workers — `public/` is bundled at build time and served from CDN. There is no writable filesystem at runtime.

So the Update button has to write somewhere that *is* writable at runtime: **Lovable Cloud** (a `flashcards_content` table + Storage bucket for any binary assets the cards reference). The game then loads card data from Cloud instead of static `.js` files.

## Plan

### 1. Drop the iframe, mount natively (`/learn/flashcards` and `/games`)

- Convert the `index.html` markup into JSX inside each route component (header, screens, footer — all already in `public/flashcards/index.html`).
- Move `public/flashcards/css/styles.css` to `src/components/flashcards/flashcards.css` and import it from the route. Scope it under a `.flashcards-root` wrapper class to avoid leaking into the rest of the app.
- Move `public/flashcards/js/app.js` into `src/components/flashcards/engine.ts`. Wrap it as a single `mountFlashcards(rootEl, { loadCards, saveProgress, loadProgress })` function — `useEffect` calls it on mount, returns a cleanup that detaches listeners.
- Loader page shows a skeleton until `mountFlashcards` resolves.

Result: one document, one stylesheet load, no iframe handshake, scripts bundled by Vite (one chunk, parallel with the rest of the app).

### 2. Card data → Lovable Cloud

New tables:
- `flashcard_content` — single-row JSON blob (`sections`, `cards`, `taxonomy`, `manifest_version`, `updated_at`). Public `SELECT to anon` (cards are not sensitive).
- `flashcard_progress` — per-user progress (`user_id`, `card_id`, `confidence`, `last_seen_at`, `correct_count`, `wrong_count`, `points`).
- `flashcard_sessions` — optional per-session history for the existing History screen.

Seed `flashcard_content` from the current `public/flashcards/data/cards/*.js` files in the same migration (one-time import script reads them and inserts the JSON).

Server functions:
- `getFlashcardContent` (public, anon-key client) — returns the row, cached.
- `saveFlashcardProgress` (auth) — upserts a row.
- `getFlashcardProgress` (auth) — returns the user's rows.
- `recordFlashcardSession` (auth) — appends to sessions table.

Engine changes (`engine.ts`):
- Replace the `CardDB.register(...)` bootstrap with a single fetch of `getFlashcardContent`.
- Replace every `localStorage.getItem/setItem` for progress with the new server fns. Falls back to localStorage when signed out.

### 3. Admin "Update from GitHub" button

- New admin route `/admin/flashcards`.
- Server fn `syncFlashcardsFromGithub` (admin-only):
  1. Fetches the file tree from `https://api.github.com/repos/Hunting-Fishing/365_flashcards/contents/game/data/cards` (raw, no token needed for public repo; 60 req/hr unauthenticated is fine).
  2. Downloads each `*.js` section file and `taxonomy.js`.
  3. Parses them in a sandboxed VM-like way (the files call `CardDB.register({…}, [...])`; we shim `CardDB` with a collector).
  4. Writes the merged JSON into `flashcard_content` and bumps `manifest_version`.
  5. Returns counts for the admin UI (e.g. "Added 12 cards, updated 4, removed 0").
- UI: a single big "Pull latest from GitHub" button, last-sync timestamp, current version, a diff summary after each run.
- Progress is in a separate table keyed by `card_id` — never touched during sync, so all user progress survives.

### 4. Loading polish

- Suspense fallback with a skeleton (avoid the white flash).
- Preload the content fetch in the route loader (TanStack Query `ensureQueryData`).
- Tree-shake: the iframe pulled `/flashcards/*` regardless of route. After this change, the engine ships only when the route is visited (code-split).

## Out of scope (call out for later)

- Porting `app.js` to idiomatic React. The wrap-and-mount approach above is intentionally minimal — it eliminates the iframe overhead without rewriting ~1.5k lines of working game logic.
- Removing `public/flashcards/` entirely. After step 1+2 lands and is verified, a follow-up can delete it.

## Files I'll touch (rough)

- New: `src/components/flashcards/engine.ts`, `flashcards.css`, `markup.tsx`, `src/lib/flashcards.functions.ts`, `src/routes/admin.flashcards.tsx`.
- Edit: `src/routes/learn.flashcards.tsx`, `src/routes/games.index.tsx`, `src/components/site-header.tsx` (admin nav link).
- Migration: 3 new tables + grants + RLS + seed.

## Confirm before I start

1. Sound good to proceed with all of the above?
2. Anything you want cut for a first pass (e.g. skip History sync, ship admin button later)?
