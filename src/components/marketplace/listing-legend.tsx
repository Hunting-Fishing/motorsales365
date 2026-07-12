import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ENTRIES: { color: string; label: string; desc: string }[] = [
  { color: "ring-emerald-500/70", label: "New (48h)", desc: "Freshly posted in the last 48 hours." },
  { color: "ring-sky-500/60", label: "Just updated", desc: "Seller updated details in the last 24h." },
  { color: "ring-emerald-500/70", label: "Price drop", desc: "Asking price went down recently." },
  { color: "ring-rose-500/70", label: "Price up", desc: "Asking price went up recently." },
  { color: "ring-orange-500/70", label: "Pending sale", desc: "Seller marked it reserved/pending." },
  { color: "ring-orange-400/70", label: "Promo", desc: "Seller is running a limited promo." },
  { color: "ring-accent/70", label: "Boosted", desc: "Paid boost — higher visibility." },
  { color: "ring-amber-500/70", label: "Reported", desc: "Under community review. Buy with extra caution." },
];

/**
 * Small popover explaining the colored ring around each listing card,
 * plus a short "how to view" tip. Presentational only.
 */
export function ListingLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Card colors and viewing tips"
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Legend</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="mb-2">
          <p className="text-sm font-semibold">Card colors</p>
          <p className="text-[11px] text-muted-foreground">
            The ring around a card tells you its status at a glance.
          </p>
        </div>
        <ul className="space-y-1.5">
          {ENTRIES.map((e) => (
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
