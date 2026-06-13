import { useMemo, useState } from "react";
import { CAR_MAKES, HEAVY_TRUCK_MAKES, MOTORCYCLE_MAKES } from "@/data/vehicles";
import { listEnginesFor, resolveVehicleFromText } from "@/lib/vehicle-resolver";

type Value = {
  make: string;
  model: string;
  year?: number | null;
  engine_code?: string | null;
};

export function VehicleEnginePicker({
  value,
  onChange,
}: {
  value: Value;
  onChange: (v: Value) => void;
}) {
  const [freeText, setFreeText] = useState("");
  const makes = useMemo(
    () => [...CAR_MAKES, ...HEAVY_TRUCK_MAKES, ...MOTORCYCLE_MAKES],
    [],
  );
  const models = useMemo(
    () => makes.find((m) => m.make === value.make)?.models ?? [],
    [makes, value.make],
  );
  const engines = useMemo(
    () => listEnginesFor(value.make, value.model),
    [value.make, value.model],
  );
  const yearOpts = useMemo(() => {
    const y = new Date().getFullYear() + 1;
    const out: number[] = [];
    for (let i = y; i >= 1960; i--) out.push(i);
    return out;
  }, []);

  function smartParse() {
    if (!freeText.trim()) return;
    const r = resolveVehicleFromText(freeText);
    onChange({
      make: r.make ?? value.make,
      model: r.model ?? value.model,
      year: r.year ?? value.year,
      engine_code: r.engine_code ?? value.engine_code,
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium">
          Describe what you need (we'll fill in the fields)
        </label>
        <div className="flex gap-2">
          <input
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="e.g. engine for 91 pajero 4D56T"
            className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={smartParse}
            className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium"
          >
            Auto-fill
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium">Make</label>
          <select
            value={value.make}
            onChange={(e) =>
              onChange({ ...value, make: e.target.value, model: "", engine_code: null })
            }
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Select make…</option>
            {makes.map((m) => (
              <option key={m.make} value={m.make}>
                {m.make}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Model</label>
          <select
            value={value.model}
            onChange={(e) => onChange({ ...value, model: e.target.value, engine_code: null })}
            disabled={!value.make}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">Select model…</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Year</label>
          <select
            value={value.year ?? ""}
            onChange={(e) =>
              onChange({ ...value, year: e.target.value ? Number(e.target.value) : null })
            }
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Any year</option>
            {yearOpts.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Engine</label>
          {engines.length > 0 ? (
            <select
              value={value.engine_code ?? ""}
              onChange={(e) => onChange({ ...value, engine_code: e.target.value || null })}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Any / unknown</option>
              {engines.map((e) => (
                <option key={`${e.code}-${e.start}`} value={e.code ?? e.label}>
                  {e.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={value.engine_code ?? ""}
              onChange={(e) => onChange({ ...value, engine_code: e.target.value || null })}
              placeholder="e.g. 4D56T"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}
