import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CAR_MAKES,
  MOTORCYCLE_MAKES,
  getMakesForYear,
  getModelsForYear,
  getYearOptions,
  type VehicleCategory,
} from "@/data/vehicles";
import type { GarageVehicle } from "@/lib/garage";

interface Props {
  initial?: GarageVehicle | null;
  onSubmit: (v: GarageVehicle) => void;
  submitLabel?: string;
  showCategory?: boolean;
  compact?: boolean;
}

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

  const years = useMemo(() => getYearOptions(), []);
  const yearNum = year ? Number(year) : undefined;
  const makes = useMemo(() => getMakesForYear(category, yearNum), [category, yearNum]);
  const models = useMemo(
    () => (make ? getModelsForYear(category, make, yearNum) : []),
    [category, make, yearNum],
  );

  const canSubmit = make && model;

  return (
    <div className={compact ? "flex flex-wrap items-end gap-2" : "grid gap-3 sm:grid-cols-2 md:grid-cols-4"}>
      {showCategory && (
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={category} onValueChange={(v) => { setCategory(v as VehicleCategory); setMake(""); setModel(""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="car">Car / Truck</SelectItem>
              <SelectItem value="motorcycle">Motorcycle</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">Year</Label>
        <Select value={year} onValueChange={(v) => { setYear(v); setModel(""); }}>
          <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Make</Label>
        <Select value={make} onValueChange={(v) => { setMake(v); setModel(""); }}>
          <SelectTrigger><SelectValue placeholder="Select make" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {makes.map((m) => <SelectItem key={m.make} value={m.make}>{m.make}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Model</Label>
        <Select value={model} onValueChange={setModel} disabled={!make}>
          <SelectTrigger><SelectValue placeholder={make ? "Select model" : "Pick make first"} /></SelectTrigger>
          <SelectContent className="max-h-72">
            {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className={compact ? "" : "sm:col-span-2 md:col-span-4"}>
        <Button
          type="button"
          className="w-full md:w-auto"
          disabled={!canSubmit}
          onClick={() => onSubmit({ category, make, model, year: yearNum })}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

// Re-export for convenience
export { CAR_MAKES, MOTORCYCLE_MAKES };
