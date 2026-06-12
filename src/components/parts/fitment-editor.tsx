import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FitmentRow = {
  make: string;
  model: string;
  year_min: string;
  year_max: string;
  trim: string;
};

export const EMPTY_FITMENT: FitmentRow = {
  make: "",
  model: "",
  year_min: "",
  year_max: "",
  trim: "",
};

type Props = {
  value: FitmentRow[];
  onChange: (rows: FitmentRow[]) => void;
};

export function FitmentEditor({ value, onChange }: Props) {
  const update = (i: number, patch: Partial<FitmentRow>) => {
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { ...EMPTY_FITMENT }]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Label className="text-base">Fits these vehicles</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Add every make / model / year range this part fits. Buyers using the parts
            search will only see your listing if the fitment matches their vehicle.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
          No fitment added yet. Click "Add" to specify which vehicles this part fits.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-2 rounded-md border border-border bg-background p-2"
            >
              <div className="col-span-12 sm:col-span-3">
                <Input
                  placeholder="Make *"
                  value={row.make}
                  onChange={(e) => update(i, { make: e.target.value })}
                />
              </div>
              <div className="col-span-12 sm:col-span-3">
                <Input
                  placeholder="Model *"
                  value={row.model}
                  onChange={(e) => update(i, { model: e.target.value })}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  inputMode="numeric"
                  placeholder="Year from"
                  value={row.year_min}
                  onChange={(e) => update(i, { year_min: e.target.value })}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  inputMode="numeric"
                  placeholder="Year to"
                  value={row.year_max}
                  onChange={(e) => update(i, { year_max: e.target.value })}
                />
              </div>
              <div className="col-span-3 sm:col-span-1">
                <Input
                  placeholder="Trim"
                  value={row.trim}
                  onChange={(e) => update(i, { trim: e.target.value })}
                />
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(i)}
                  aria-label="Remove fitment row"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Filter to rows with required fields, normalize, and validate year range. */
export function normalizeFitmentRows(rows: FitmentRow[]): {
  ok: { make: string; model: string; year_min: number | null; year_max: number | null; trim: string | null }[];
  error: string | null;
} {
  const out: ReturnType<typeof normalizeFitmentRows>["ok"] = [];
  for (const r of rows) {
    const make = r.make.trim();
    const model = r.model.trim();
    if (!make && !model && !r.year_min && !r.year_max && !r.trim) continue; // skip empty
    if (!make || !model) return { ok: [], error: "Fitment rows need a make and model." };
    const yMin = r.year_min ? Number(r.year_min) : null;
    const yMax = r.year_max ? Number(r.year_max) : null;
    if (yMin !== null && (!Number.isInteger(yMin) || yMin < 1900 || yMin > 2100))
      return { ok: [], error: "Invalid 'year from' value." };
    if (yMax !== null && (!Number.isInteger(yMax) || yMax < 1900 || yMax > 2100))
      return { ok: [], error: "Invalid 'year to' value." };
    if (yMin !== null && yMax !== null && yMin > yMax)
      return { ok: [], error: "'Year from' must be ≤ 'year to'." };
    out.push({ make, model, year_min: yMin, year_max: yMax, trim: r.trim.trim() || null });
  }
  return { ok: out, error: null };
}
