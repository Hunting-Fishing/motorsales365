import { Banknote, Smartphone, Truck, RotateCcw, ShieldCheck } from "lucide-react";

const ITEMS = [
  { icon: Banknote, label: "COD available", sub: "At select outlets" },
  { icon: Smartphone, label: "GCash & Maya", sub: "Digital payments" },
  { icon: Truck, label: "Ships nationwide", sub: "Lalamove / J&T" },
  { icon: RotateCcw, label: "7-day returns", sub: "On defects" },
  { icon: ShieldCheck, label: "Verified partners", sub: "Vetted suppliers" },
];

/**
 * PH-local trust cues shown as a compact icon row beneath the fitment bar.
 * Wording-only — no backend behavior tied to these badges.
 */
export function PhTrustStrip() {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border/60 sm:grid-cols-3 md:grid-cols-5">
      {ITEMS.map(({ icon: Icon, label, sub }) => (
        <div key={label} className="flex items-center gap-2.5 bg-card px-3 py-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-foreground">
              {label}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
