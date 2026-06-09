import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardCheck, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type Item = { id: string; label: string; hint?: string };

const ITEMS: Item[] = [
  {
    id: "orcr",
    label: "Original OR and CR are present",
    hint: "Ask for the latest LTO Official Receipt and Certificate of Registration.",
  },
  {
    id: "owner_matches",
    label: "Registered owner matches the seller's valid ID",
    hint: "If not, ask for the open Deed of Sale chain and previous owner's ID.",
  },
  {
    id: "deed_of_sale",
    label: "Deed of Sale is ready (notarised)",
  },
  {
    id: "valid_id",
    label: "Seller can show 2 valid government IDs",
  },
  {
    id: "chassis_match",
    label: "Chassis number matches the CR and the unit",
  },
  {
    id: "engine_match",
    label: "Engine number matches the CR and the unit",
  },
  {
    id: "plate_match",
    label: "Plate / conduction sticker matches the CR",
  },
  {
    id: "no_encumbrance",
    label: "No encumbrance / chattel mortgage on the CR",
    hint: "If marked 'Encumbered,' ask for the bank's release of mortgage.",
  },
  {
    id: "history_disclosed",
    label: "Flood, accident, and rebuild history disclosed in writing",
  },
  {
    id: "hpg_clearance",
    label: "HPG / PNP clearance done (recommended for high-value units)",
    hint: "Highway Patrol Group macro-etching confirms the unit is not stolen.",
  },
];

export function BuyerDocumentChecklist() {
  const [open, setOpen] = useState(true);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold">
              PH buyer document checklist
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tick these before you hand over any payment. {done}/{ITEMS.length} done.
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <>
          <ul className="mt-4 space-y-3">
            {ITEMS.map((item) => {
              const isOn = !!checked[item.id];
              return (
                <li key={item.id} className="flex items-start gap-3">
                  <Checkbox
                    id={`bdc-${item.id}`}
                    checked={isOn}
                    onCheckedChange={(v) =>
                      setChecked((prev) => ({ ...prev, [item.id]: v === true }))
                    }
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={`bdc-${item.id}`}
                      className={`block text-sm font-medium leading-snug ${
                        isOn ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {item.label}
                    </label>
                    {item.hint && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-foreground/90">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p>
              Never pay before you see the original documents and the unit in person. 365
              MotorSales is a marketplace — we do not hold funds or guarantee any unit's
              condition. See{" "}
              <Link to="/verified" className="font-medium text-primary hover:underline">
                365 Verified explained
              </Link>{" "}
              and our{" "}
              <Link to="/guidelines" className="font-medium text-primary hover:underline">
                community guidelines
              </Link>
              .
            </p>
          </div>
        </>
      )}
    </section>
  );
}
