import { useState } from "react";
import { Info, Layers, X } from "lucide-react";
import { TYPE_COLORS } from "./map-utils";
import { BUSINESS_KIND_OPTIONS } from "@/data/business-kinds";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const LABELS: Record<string, string> = Object.fromEntries(
  BUSINESS_KIND_OPTIONS.map((o) => [o.value, o.label]),
);

/**
 * Floating map overlay: a collapsible color legend and an Info button
 * that opens a dialog explaining pins, clusters, and radius.
 */
export function MapLegend() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(false);

  return (
    <>
      <div className="pointer-events-none absolute right-2 top-2 z-[500] flex flex-col items-end gap-2">
        <div className="pointer-events-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle map legend"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background/95 px-3 text-xs font-medium shadow-md backdrop-blur hover:bg-secondary"
          >
            <Layers className="h-3.5 w-3.5" />
            Legend
          </button>
          <button
            type="button"
            onClick={() => setInfo(true)}
            aria-label="Map info"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/95 shadow-md backdrop-blur hover:bg-secondary"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        {open && (
          <div className="pointer-events-auto max-h-[60%] w-56 overflow-y-auto rounded-lg border border-border bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">Pin colors</span>
              <button
                type="button"
                aria-label="Close legend"
                onClick={() => setOpen(false)}
                className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ul className="space-y-1.5">
              {Object.entries(TYPE_COLORS).map(([slug, color]) => (
                <li key={slug} className="flex items-center gap-2">
                  {slug === "fuel_station" ? (
                    <span
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white shadow"
                      style={{ background: color }}
                      aria-hidden
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="3" y1="22" x2="15" y2="22" />
                        <line x1="4" y1="9" x2="14" y2="9" />
                        <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
                        <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
                      </svg>
                    </span>
                  ) : (
                    <svg
                      className="shrink-0"
                      width="12"
                      height="17"
                      viewBox="0 0 24 34"
                      aria-hidden
                    >
                      <path
                        d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22C24 5.4 18.6 0 12 0z"
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <circle cx="12" cy="12" r="4" fill="#ffffff" opacity="0.95" />
                    </svg>
                  )}
                  <span className="truncate">{LABELS[slug] ?? slug}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-yellow-400 bg-primary" />
                Featured (thicker ring)
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  12
                </span>
                Cluster (zoom to expand)
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={info} onOpenChange={setInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>How the map works</DialogTitle>
            <DialogDescription>
              Quick guide to reading pins, clusters, and the search radius.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold">Pins</p>
              <p className="text-muted-foreground">
                Each colored pin is a business. Colors match the business type — open the Legend
                for the full key.
              </p>
            </div>
            <div>
              <p className="font-semibold">Featured</p>
              <p className="text-muted-foreground">
                Featured businesses appear slightly larger with a yellow outline.
              </p>
            </div>
            <div>
              <p className="font-semibold">Clusters</p>
              <p className="text-muted-foreground">
                Numbered circles group nearby pins. Click one or zoom in to expand it.
              </p>
            </div>
            <div>
              <p className="font-semibold">Radius search</p>
              <p className="text-muted-foreground">
                Set a location and radius above the map to limit results to that circle. Use
                "Use my location" for a quick search around you.
              </p>
            </div>
            <div>
              <p className="font-semibold">Tips</p>
              <ul className="ml-4 list-disc text-muted-foreground">
                <li>Tap a pin to see business details and open its page.</li>
                <li>Click a result card to highlight its pin.</li>
                <li>Data © OpenStreetMap contributors.</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
