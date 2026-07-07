## Goal

The mobile dashboard dropdown reads as one long white scroll. Give each hub section its own colored "card" inside the menu so groups feel visually distinct.

## Change

`src/routes/dashboard.tsx` → `MobileNavMenu` only. No other files, no logic changes.

Per hub, replace the flat separator + label pattern with a tinted, rounded block:

- Wrap each hub's label + items in a rounded container with a soft tinted background, a subtle left accent stripe, and a small gap between hubs (removes the need for `<DropdownMenuSeparator />`).
- Assign each hub a color from a small palette (cycled by index, or keyed by `hub.key` so it's stable): e.g. primary/amber/emerald/sky/violet/rose. Use existing tailwind color utilities at low opacity (`bg-primary/5`, `bg-amber-500/10`, etc.) so it works in light + dark mode.
- Hub label header gets the accent color at higher contrast (`text-primary`, `text-amber-600`, etc.) plus the icon in the same tone, so scanning the menu reveals section boundaries at a glance.
- Active item keeps the current `Check` treatment; inactive items stay on the tinted background with the same hover behavior.
- Admin entry at the bottom gets its own tinted block (red/rose) for the same treatment.

Container padding is tightened by ~2px so total menu height doesn't grow.

## Out of scope

- Desktop sidebar (`aside`) — not what the screenshot shows.
- Hub content, ordering, or item labels.
- Any color-token additions to `styles.css` — using existing Tailwind palette classes is sufficient here.
