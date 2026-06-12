## Goal
The banner image at the top of every page (`src/assets/banner.webp`, rendered by `SiteLayout`) shows 8 category tiles — **Cars, Motorcycles, Trucks, Heavy Equipment, Parts, Tires, Repair Shops, Related Businesses** — but those tiles are baked into the image. The whole banner is currently a single `<a href="/">` so clicking any tile just reloads the home page.

We'll overlay invisible, percentage-positioned `<Link>` hotspots on each tile so they route correctly.

## Routes per tile
| Tile | Destination |
|---|---|
| CARS | `/browse/car` |
| MOTORCYCLES | `/browse/motorcycle` |
| TRUCKS | `/browse/truck` |
| HEAVY EQUIPMENT | `/browse/equipment` |
| PARTS | `/parts` |
| TIRES | `/browse/tires` |
| REPAIR SHOPS | `/browse/repair` |
| RELATED BUSINESSES | `/businesses` |

(Per your answer, `Tires` and `Repair Shops` use `/browse/$category`. The `/browse/$category` route accepts any slug, so empty categories still render properly with the existing "no results" state.)

## Implementation

Edit only `src/components/site-layout.tsx`:

1. Remove the outer `<a href="/">` wrapper around the banner.
2. Replace with a `relative` wrapper:
   - `<img>` keeps its current responsive sizing.
   - 8 absolutely-positioned `<Link>` elements, each sized as a percentage of the banner's width/height so hotspots stay aligned on mobile and desktop.
   - Each hotspot gets `aria-label`, `title`, transparent background, focus ring for a11y, and subtle hover highlight (`hover:bg-white/10`).
3. Add a small "Home" link area on the logo region (left side of banner) so users don't lose the click-banner-to-go-home behavior.

### Hotspot coordinates (normalized %, measured from the banner)
Tile strip sits at roughly `top: 76.6%` to `89%`. Approximate x ranges:

```text
CARS              left  9.3%  width  9.2%
MOTORCYCLES       left 18.8%  width  9.2%
TRUCKS            left 28.3%  width  9.5%
HEAVY EQUIPMENT   left 38.1%  width  9.5%
PARTS             left 47.8%  width  9.3%
TIRES             left 57.4%  width  9.5%
REPAIR SHOPS     left 67.1%  width  9.6%
RELATED BUSINESS  left 76.9%  width 16.2%
```

Logo "Home" hotspot: `left 24% top 8% width 28% height 60%` (covers the 365 MOTOR SALES logo half).

## Out of scope
- No DB or route changes (`/browse/$category` already accepts arbitrary slugs).
- No changes to the home page hero CTAs or category chip strip — those already route correctly.
- No new `/tires` or `/repair-shops` landing pages.

## Validation
Open `/`, hover each tile — cursor changes, focus ring visible on tab. Click each tile and confirm the URL becomes `/browse/car`, `/browse/motorcycle`, `/browse/truck`, `/browse/equipment`, `/parts`, `/browse/tires`, `/browse/repair`, `/businesses` respectively. Resize to mobile width and re-verify hotspots stay aligned over the tiles.
