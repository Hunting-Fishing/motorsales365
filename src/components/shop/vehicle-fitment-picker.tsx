import { useMemo, useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CAR_MAKES,
  MOTORCYCLE_MAKES,
  VEHICLE_CATEGORY_LABELS,
  getMakesForYear,
  getModelsForYear,
  getYearOptions,
  type VehicleCategory,
} from "@/data/vehicles";
import { getEnginesFor, getTransmissionsFor } from "@/data/vehicle-engines";
import type { GarageVehicle } from "@/lib/garage";

interface Props {
  initial?: GarageVehicle | null;
  onSubmit: (v: GarageVehicle) => void;
  submitLabel?: string;
  showCategory?: boolean;
  compact?: boolean;
}

const ENGINE_CUSTOM = "__custom__";
const ENGINE_ANY = "__any__";

export function VehicleFitmentPicker({
  initial,
  onSubmit,
  submitLabel = "Find parts that fit",
  showCategory = true,
  compact = false,
}: Props) {
  const [category, setCategory] = useState<VehicleCategory>(initial?.category ?? "car");
  const [year, setYear] = useState<string>(initial?.year ? String(initial.year) : "");
  const [make, setMake] = useState<string>(initial?.make ?? "");
  const [model, setModel] = useState<string>(initial?.model ?? "");
  const [engine, setEngine] = useState<string>(initial?.engine ?? "");
  const [engineMode, setEngineMode] = useState<"select" | "custom">("select");
  const [transmission, setTransmission] = useState<string>(initial?.transmission ?? "");

  const years = useMemo(() => getYearOptions(), []);
  const yearNum = year ? Number(year) : undefined;
  const makes = useMemo(() => getMakesForYear(category, yearNum), [category, yearNum]);
  const models = useMemo(
    () => (make ? getModelsForYear(category, make, yearNum) : []),
    [category, make, yearNum],
  );
  const engines = useMemo(
    () => getEnginesFor(category, make, model, yearNum),
    [category, make, model, yearNum],
  );

  // If model/make/year changes and the current engine is no longer offered
  // (and we're not in custom mode), drop it so we don't carry a stale label.
  useEffect(() => {
    if (engineMode === "custom") return;
    if (!engine) return;
    if (engines.length && !engines.some((e) => e.label === engine)) setEngine("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [make, model, yearNum]);

  const canSubmit = make && model;

  return (
    <div
      className={
        compact ? "flex flex-wrap items-end gap-2" : "grid gap-3 sm:grid-cols-2 md:grid-cols-4"
      }
    >
      {showCategory && (
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v as VehicleCategory);
              setMake("");
              setModel("");
              setEngine("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(VEHICLE_CATEGORY_LABELS) as VehicleCategory[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {VEHICLE_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">Year</Label>
        <Select
          value={year}
          onValueChange={(v) => {
            setYear(v);
            setModel("");
            setEngine("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Make</Label>
        <Select
          value={make}
          onValueChange={(v) => {
            setMake(v);
            setModel("");
            setEngine("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select make" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {makes.map((m) => (
              <SelectItem key={m.make} value={m.make}>
                {m.make}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Model</Label>
        <Select
          value={model}
          onValueChange={(v) => {
            setModel(v);
            setEngine("");
          }}
          disabled={!make}
        >
          <SelectTrigger>
            <SelectValue placeholder={make ? "Select model" : "Pick make first"} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {models.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Engine — only renders meaningfully once model is picked. Optional. */}
      <div className={compact ? "space-y-1" : "space-y-1 sm:col-span-2 md:col-span-2"}>
        <Label className="text-xs">Engine (optional)</Label>
        {engineMode === "custom" || (model && engines.length === 0) ? (
          <div className="flex gap-2">
            <Input
              value={engine}
              placeholder="e.g. 2.4L Diesel (2GD-FTV)"
              onChange={(e) => setEngine(e.target.value)}
            />
            {engines.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEngineMode("select");
                  setEngine("");
                }}
              >
                Use list
              </Button>
            )}
          </div>
        ) : (
          <Select
            value={engine || ENGINE_ANY}
            onValueChange={(v) => {
              if (v === ENGINE_CUSTOM) {
                setEngineMode("custom");
                setEngine("");
                return;
              }
              setEngine(v === ENGINE_ANY ? "" : v);
            }}
            disabled={!model}
          >
            <SelectTrigger>
              <SelectValue placeholder={model ? "Any engine" : "Pick model first"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ENGINE_ANY}>Any engine</SelectItem>
              {engines.map((e) => (
                <SelectItem key={e.label} value={e.label}>
                  {e.label}
                </SelectItem>
              ))}
              <SelectItem value={ENGINE_CUSTOM}>Other / custom…</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className={compact ? "" : "sm:col-span-2 md:col-span-2"}>
        <Button
          type="button"
          className="w-full md:w-auto"
          disabled={!canSubmit}
          onClick={() =>
            onSubmit({ category, make, model, year: yearNum, engine: engine || undefined })
          }
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

// Re-export for convenience
export { CAR_MAKES, MOTORCYCLE_MAKES };
