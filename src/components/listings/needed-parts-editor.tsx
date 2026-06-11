import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Plus, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { NEEDED_PARTS_GROUPS, NEEDED_PARTS_INDEX } from "@/data/needed-parts-catalog";
import { getTireSpec } from "@/lib/parts-fulfillment.functions";

export type NeededPart = {
  key: string;
  label: string;
  category: string;
  qty?: number;
};

interface Props {
  value: NeededPart[];
  onChange: (next: NeededPart[]) => void;
  tireSize: string;
  onTireSizeChange: (s: string) => void;
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
}

// Accepts metric (185/60R15, 225/45ZR17), light truck (LT265/70R17), and flotation (31x10.5R15).
const TIRE_SIZE_RE =
  /^(LT|P)?\d{2,3}(\/\d{2,3}|x\d{1,2}(\.\d)?)[ZR]?R?\d{2}(\s?\d{2,3}[A-Z])?$/i;

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "none" }
  | { status: "uncertain"; candidates: any[]; match: any | null }
  | { status: "matched"; match: any };

export function NeededPartsEditor({
  value,
  onChange,
  tireSize,
  onTireSizeChange,
  make,
  model,
  year,
  engine,
}: Props) {
  const [custom, setCustom] = useState("");
  const [touched, setTouched] = useState(false);
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });
  const fetchSpec = useServerFn(getTireSpec);

  useEffect(() => {
    if (!make || !model) {
      setLookup({ status: "idle" });
      return;
    }
    let cancelled = false;
    setLookup({ status: "loading" });
    fetchSpec({ data: { make, model, year, engine } })
      .then((r: any) => {
        if (cancelled || !r) return;
        if (r.status === "matched") setLookup({ status: "matched", match: r.match });
        else if (r.status === "uncertain")
          setLookup({ status: "uncertain", candidates: r.candidates ?? [], match: r.match });
        else setLookup({ status: "none" });
      })
      .catch(() => {
        if (!cancelled) setLookup({ status: "none" });
      });
    return () => {
      cancelled = true;
    };
  }, [make, model, year, engine, fetchSpec]);

  const trimmed = tireSize.trim();
  const formatOk = trimmed === "" || TIRE_SIZE_RE.test(trimmed);
  const matchedFront =
    lookup.status === "matched" ? (lookup.match?.front_size as string | null) : null;
  const matchedRear =
    lookup.status === "matched" ? (lookup.match?.rear_size as string | null) : null;
  const expectedSet = new Set(
    [matchedFront, matchedRear].filter((s): s is string => !!s).map((s) => s.toUpperCase()),
  );
  const mismatchesFactory =
    lookup.status === "matched" && trimmed !== "" && !expectedSet.has(trimmed.toUpperCase());

  const toggle = (key: string) => {
    const opt = NEEDED_PARTS_INDEX[key];
    if (!opt) return;
    if (value.find((v) => v.key === key)) {
      onChange(value.filter((v) => v.key !== key));
    } else {
      onChange([...value, { key, label: opt.label, category: opt.category }]);
    }
  };

  const addCustom = () => {
    const t = custom.trim();
    if (!t) return;
    const key = `custom:${t.toLowerCase().replace(/\s+/g, "-")}`;
    if (value.find((v) => v.key === key)) return;
    onChange([...value, { key, label: t, category: "custom" }]);
    setCustom("");
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-xs font-medium">Tire size (factory or installed)</label>
        <div className="flex items-center gap-2">
          <input
            value={tireSize}
            onChange={(e) => onTireSizeChange(e.target.value)}
            placeholder="e.g. 185/60R15"
            className="w-40 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          {suggested && suggested !== tireSize && (
            <button
              type="button"
              onClick={() => onTireSizeChange(suggested)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Use suggested: {suggested}
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Buyers see this to get a tire quote. Override if your car has a non-stock size.
        </p>
      </div>

      {value.length > 0 && (
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {value.length} item{value.length === 1 ? "" : "s"} flagged
          </div>
          <div className="flex flex-wrap gap-1.5">
            {value.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => onChange(value.filter((x) => x.key !== v.key))}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                {v.label} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {NEEDED_PARTS_GROUPS.map((g) => (
        <div key={g.key}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {g.label}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map((opt) => {
              const active = !!value.find((v) => v.key === opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggle(opt.key)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <label className="mb-1 block text-xs font-medium">Add custom item</label>
        <div className="flex items-center gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="e.g. Power steering pump"
            className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={addCustom}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
