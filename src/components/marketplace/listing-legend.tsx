import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const CARD_ENTRIES: { color: string; label: string; desc: string }[] = [
  { color: "ring-fuchsia-500/80", label: "New (48h)", desc: "Hot pink — freshly posted in the last 48 hours." },
  { color: "ring-teal-400/80", label: "Just updated", desc: "Teal — seller updated details in the last 24h." },
  { color: "ring-emerald-500/80", label: "Price drop", desc: "Green — asking price went down recently." },
  { color: "ring-rose-500/80", label: "Price up", desc: "Rose — asking price went up recently." },
  { color: "ring-orange-500/80", label: "Pending sale", desc: "Safety orange — seller marked it reserved/pending." },
  { color: "ring-yellow-400/90", label: "Promo", desc: "Safety yellow — seller is running a limited promo." },
  { color: "ring-violet-500/80", label: "Boosted", desc: "Violet sparkle glow — paid boost, higher visibility." },
  { color: "ring-red-600/80", label: "Reported", desc: "Red alarm — under community review. Buy with extra caution." },
];

// Marker legend for the Map view of the marketplace.
const MAP_ENTRIES: { swatch: React.ReactNode; label: string; desc: string }[] = [
  {
    swatch: <PinSwatch fill="#2563eb" />,
    label: "Single listing",
    desc: "Exact location shared by the seller.",
  },
  {
    swatch: <PinSwatch fill="#0ea5e9" />,
    label: "Region group",
    desc: "Multiple listings without exact coords — grouped at region centroid.",
  },
  {
    swatch: (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
        5
      </span>
    ),
    label: "Cluster",
    desc: "Nearby pins bundled together. Click or zoom to expand.",
  },
  {
    swatch: <PinSwatch fill="#2563eb" ring />,
    label: "Selected",
    desc: "The listing highlighted from the results list.",
  },
];

function PinSwatch({ fill, ring }: { fill: string; ring?: boolean }) {
  return (
    <svg width="12" height="17" viewBox="0 0 24 34" aria-hidden className="shrink-0">
      <path
        d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22C24 5.4 18.6 0 12 0z"
        fill={fill}
        stroke={ring ? "#facc15" : "#ffffff"}
        strokeWidth={ring ? 3 : 2}
      />
      <circle cx="12" cy="12" r="4" fill="#ffffff" opacity="0.95" />
    </svg>
  );
}

/**
 * Popover explaining both the colored ring around each listing card AND
 * the map marker legend for the Map view. Presentational only.
 */
export function ListingLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Card colors, map markers and viewing tips"
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Legend</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-80 overflow-y-auto p-3">
        <div className="mb-2">
          <p className="text-sm font-semibold">Card colors</p>
          <p className="text-[11px] text-muted-foreground">
            The ring around a card tells you its status at a glance.
          </p>
        </div>
        <ul className="space-y-1.5">
          {CARD_ENTRIES.map((e) => (
            <li key={e.label} className="flex items-start gap-2">
              <span
                className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded-md ring-2 ${e.color}`}
                aria-hidden
              />
              <div className="min-w-0 text-xs">
                <span className="font-medium">{e.label}</span>
                <span className="text-muted-foreground"> — {e.desc}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t border-border pt-2">
          <p className="text-sm font-semibold">Map markers</p>
          <p className="mb-1.5 text-[11px] text-muted-foreground">
            What each pin means in Map view.
          </p>
          <ul className="space-y-1.5">
            {MAP_ENTRIES.map((e) => (
              <li key={e.label} className="flex items-start gap-2">
                <span className="mt-0.5">{e.swatch}</span>
                <div className="min-w-0 text-xs">
                  <span className="font-medium">{e.label}</span>
                  <span className="text-muted-foreground"> — {e.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">Viewing tips</p>
          <ul className="ml-4 list-disc space-y-0.5">
            <li>Tap a card to open the full listing.</li>
            <li>Use Grid density (2/3/4) to fit more per row.</li>
            <li>Switch to Map to see nearby listings.</li>
            <li>Always meet in public and inspect docs before paying.</li>
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
