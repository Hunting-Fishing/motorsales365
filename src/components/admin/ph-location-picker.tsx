import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PSGC, regionLabel, citiesOf } from "@/lib/psgc";

const ANY = "__any__";

/**
 * Region + City dropdowns powered by the bundled PSGC dataset.
 * Values are the human-readable strings (regionLabel like
 * "NCR — National Capital Region" and the bare city name), matching how the
 * rest of the discover/auto-sync code already stores them.
 */
export function PhLocationPicker({
  region,
  city,
  onChange,
  compact = false,
}: {
  region: string;
  city: string;
  onChange: (next: { region: string; city: string }) => void;
  compact?: boolean;
}) {
  const regionOptions = useMemo(
    () => PSGC.map((r) => regionLabel(r)).sort((a, b) => a.localeCompare(b)),
    [],
  );

  const cityOptions = useMemo(() => {
    if (!region) return [];
    const r = PSGC.find((x) => regionLabel(x) === region);
    if (!r) return [];
    const all = new Set<string>(r.cities);
    for (const p of r.provinces) for (const c of p.cities) all.add(c);
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [region]);

  return (
    <>
      <div>
        {!compact && <Label className="text-xs">Region</Label>}
        <Select
          value={region || ANY}
          onValueChange={(v) =>
            onChange({ region: v === ANY ? "" : v, city: "" })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Any region" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ANY}>Any region</SelectItem>
            {regionOptions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        {!compact && <Label className="text-xs">City / Municipality</Label>}
        <Select
          value={city || ANY}
          onValueChange={(v) => onChange({ region, city: v === ANY ? "" : v })}
          disabled={!region}
        >
          <SelectTrigger>
            <SelectValue placeholder={region ? "Any city" : "Pick a region first"} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ANY}>Any city</SelectItem>
            {cityOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
