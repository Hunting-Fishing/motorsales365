import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { REGION_OPTIONS, provincesOf, citiesOf } from "@/lib/psgc";

export type LocationValue = {
  region: string | null;
  province: string | null;
  city: string | null;
  barangay: string | null;
};

export function LocationDrilldown({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}) {
  const provinces = provincesOf(value.region);
  const cities = citiesOf(value.region, value.province);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Select
        value={value.region ?? "__all__"}
        onValueChange={(v) =>
          onChange({
            region: v === "__all__" ? null : v,
            province: null,
            city: null,
            barangay: null,
          })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All regions</SelectItem>
          {REGION_OPTIONS.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.province ?? "__all__"}
        onValueChange={(v) =>
          onChange({ ...value, province: v === "__all__" ? null : v, city: null, barangay: null })
        }
        disabled={!value.region || provinces.length === 0}
      >
        <SelectTrigger>
          <SelectValue placeholder={provinces.length === 0 ? "—" : "Province"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All provinces</SelectItem>
          {provinces.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.city ?? "__all__"}
        onValueChange={(v) =>
          onChange({ ...value, city: v === "__all__" ? null : v, barangay: null })
        }
        disabled={!value.region || cities.length === 0}
      >
        <SelectTrigger>
          <SelectValue placeholder={cities.length === 0 ? "—" : "City / Municipality"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All cities</SelectItem>
          {cities.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Barangay (optional)"
        value={value.barangay ?? ""}
        onChange={(e) => onChange({ ...value, barangay: e.target.value || null })}
        disabled={!value.city}
      />
    </div>
  );
}
