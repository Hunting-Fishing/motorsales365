## Goal
Bring the `Hunting-Fishing/365_flashcards` flashcard game into this site under `/learn`, add a `/games` hub for future games, and put a "Designed by 365MotorSales" tag at the top of the `/learn` page.

## Approach
The repo is a self-contained vanilla JS/HTML/CSS app (no React). The fastest faithful integration is to copy the static `game/` folder into `public/flashcards/` and embed it via `<iframe>` from a new route. A React port would discard the upstream code and break parity with future updates to that repo.

## Steps

### 1. Copy the static game into `public/`
- Clone the repo into a temp dir, copy `game/` → `public/flashcards/` (no `.git`).
- Result: the game becomes reachable at `/flashcards/index.html`.

### 2. New flashcards route + hub card under /learn
- Add `src/routes/learn.flashcards.tsx` (`/learn/flashcards`) — `SiteLayout` shell with a full-bleed `<iframe src="/flashcards/index.html">` (responsive height, allow fullscreen). Includes `head()` meta and the designed-by tag.
- On `src/routes/learn.index.tsx`, add a "Flashcards" card linking to `/learn/flashcards` in the hero CTA row (next to the existing buttons).

### 3. "Designed by 365MotorSales" tag at top of /Learn
- Add a small centered pill at the very top of `src/routes/learn.index.tsx` and `src/routes/learn.flashcards.tsx`:
  `★ Designed by 365MotorSales ★` — uses `bg-primary/10 text-primary` styling, sits above the hero.

### 4. New /games hub route
- Add `src/routes/games.index.tsx` (`/games`) with:
  - "Designed by 365MotorSales" tag at top.
  - Hero: "365 Games — Learn. Play. Master."
  - Card grid: one live card ("365 Flashcards" → `/learn/flashcards`) and 2–3 "Coming soon" cards using the existing `ComingSoonSection`/`ComingSoonRow` amber-caution components (e.g., "Parts Match", "Diagnostic Sprint", "Engine ID Challenge").
  - `head()` meta for SEO.

### 5. Header nav
- Find the main header/nav component and add a `Games` link next to `Learn`. (Won't touch unrelated nav items.)

## Files
**Create**
- `public/flashcards/**` (copied from upstream `game/`)
- `src/routes/learn.flashcards.tsx`
- `src/routes/games.index.tsx`

**Edit**
- `src/routes/learn.index.tsx` — add designed-by tag + Flashcards CTA card.
- Header/nav component — add `/games` link.

## Notes / non-goals
- No React port of the flashcard engine — the upstream repo stays the source of truth. To pull updates later, re-copy `game/` → `public/flashcards/`.
- No backend changes, no schema changes, no auth gating on `/games` or `/learn/flashcards` (public, same as `/learn`).
- iframe is sandboxed to same-origin (`/flashcards/*` is served by our app), so links inside the game stay inside the iframe.
