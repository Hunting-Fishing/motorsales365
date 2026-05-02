import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PSGC, regionLabel, provincesOf, citiesOf } from "@/lib/psgc";

export type LocationValue = {
  region?: string | null;
  province?: string | null;
  city?: string | null;
  barangay?: string | null;
};

type Props = {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  /** Show the optional barangay free-text input. Defaults to true. */
  showBarangay?: boolean;
  /** Show "All …" entries for use as filters. Defaults to false. */
  asFilter?: boolean;
  className?: string;
  /** Lay out fields in a single column. Defaults to false (responsive grid). */
  stacked?: boolean;
};

const ALL = "__all__";

export function LocationPicker({
  value, onChange, showBarangay = true, asFilter = false, className, stacked = false,
}: Props) {
  const regionOpts = useMemo(() => PSGC.map((r) => regionLabel(r)), []);
  const provinces = useMemo(() => provincesOf(value.region), [value.region]);
  const cities = useMemo(() => citiesOf(value.region, value.province), [value.region, value.province]);

  const grid = stacked ? "space-y-4" : "grid gap-4 sm:grid-cols-2";

  return (
    <div className={`${grid} ${className ?? ""}`}>
      <div>
        <Label>Region</Label>
        <Select
          value={value.region ?? undefined}
          onValueChange={(v) => onChange({
            region: v === ALL ? null : v,
            province: null, city: null, barangay: value.barangay ?? null,
          })}
        >
          <SelectTrigger><SelectValue placeholder={asFilter ? "All regions" : "Select region"} /></SelectTrigger>
          <SelectContent className="max-h-72">
            {asFilter && value.region && <SelectItem value={ALL}>All regions</SelectItem>}
            {regionOpts.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Province</Label>
        <Select
          value={value.province ?? undefined}
          disabled={!value.region || provinces.length === 0}
          onValueChange={(v) => onChange({
            ...value, province: v === ALL ? null : v, city: null,
          })}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !value.region ? "Pick a region first" :
              provinces.length === 0 ? "No provinces (HUC/NCR)" :
              asFilter ? "All provinces" : "Select province"
            } />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {asFilter && value.province && provinces.length > 0 && <SelectItem value={ALL}>All provinces</SelectItem>}
            {provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>City / Municipality</Label>
        <Select
          value={value.city ?? undefined}
          disabled={!value.region || cities.length === 0}
          onValueChange={(v) => onChange({ ...value, city: v === ALL ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !value.region ? "Pick a region first" :
              cities.length === 0 ? "Pick a province first" :
              "Select city"
            } />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {asFilter && cities.length > 0 && <SelectItem value={ALL}>All cities</SelectItem>}
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {showBarangay && (
        <div>
          <Label>Barangay <span className="text-muted-foreground">(optional)</span></Label>
          <Input
            value={value.barangay ?? ""}
            onChange={(e) => onChange({ ...value, barangay: e.target.value || null })}
            placeholder="e.g. Poblacion"
          />
        </div>
      )}
    </div>
  );
}
