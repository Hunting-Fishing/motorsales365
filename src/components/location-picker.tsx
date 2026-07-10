import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { PSGC, regionLabel, provincesOf, citiesOf, resolvePsgc, ALL_PH_REGION } from "@/lib/psgc";

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
  /** Show "All …" / clear options for use as filters. Defaults to false. */
  asFilter?: boolean;
  className?: string;
  /** Lay out fields in a single column. Defaults to false (responsive grid). */
  stacked?: boolean;
};

type ComboProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  value: string | null | undefined;
  options: string[];
  disabled?: boolean;
  asFilter?: boolean;
  clearLabel?: string;
  onChange: (v: string | null) => void;
};

function Combo({
  label,
  placeholder,
  searchPlaceholder,
  emptyText,
  value,
  options,
  disabled,
  asFilter,
  clearLabel,
  onChange,
}: ComboProps) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
          >
            <span className="truncate">{value ?? placeholder}</span>
            <span className="ml-2 flex items-center gap-1 shrink-0">
              {value && !disabled && (
                <X
                  className="h-4 w-4 opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(null);
                  }}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[--radix-popover-trigger-width] min-w-[260px]"
          align="start"
        >
          <Command
            filter={(itemValue, search) =>
              itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="max-h-72">
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {asFilter && value && (
                  <CommandItem
                    value={clearLabel ?? "All"}
                    onSelect={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    {clearLabel ?? "All"}
                  </CommandItem>
                )}
                {options.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", value === opt ? "opacity-100" : "opacity-0")}
                    />
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function LocationPicker({
  value,
  onChange,
  showBarangay = true,
  asFilter = false,
  className,
  stacked = false,
}: Props) {
  const regionOpts = useMemo(() => [ALL_PH_REGION, ...PSGC.map((r) => regionLabel(r))], []);
  const provinces = useMemo(() => provincesOf(value.region), [value.region]);
  const cities = useMemo(
    () => citiesOf(value.region, value.province),
    [value.region, value.province],
  );

  const grid = stacked ? "space-y-4" : "grid gap-4 sm:grid-cols-2";
  const [locating, setLocating] = useState(false);

  async function resolveFromCoords(latitude: number, longitude: number, viaIp: boolean) {
    const url = `/api/public/reverse-geocode?lat=${latitude}&lng=${longitude}&zoom=12`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Reverse geocoding failed");
    const data = await res.json();
    const a = (data.address ?? {}) as Record<string, string>;
    return { a, viaIp };
  }

  async function ipFallback(): Promise<{ a: Record<string, string>; viaIp: boolean } | null> {
    try {
      const res = await fetch("/api/public/ip-location", { headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      const j = (await res.json()) as { lat?: number; lng?: number; countryCode?: string };
      if (typeof j.lat !== "number" || typeof j.lng !== "number") return null;
      if (j.countryCode && j.countryCode.toLowerCase() !== "ph") {
        toast.error("Detected location is outside the Philippines.");
        return null;
      }
      return await resolveFromCoords(j.lat, j.lng, true);
    } catch {
      return null;
    }
  }

  async function useMyLocation() {
    if (typeof window === "undefined") {
      toast.error("Geolocation isn't supported on this device.");
      return;
    }
    setLocating(true);
    try {
      let resolved: { a: Record<string, string>; viaIp: boolean } | null = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 12000,
              maximumAge: 60000,
            });
          });
          resolved = await resolveFromCoords(pos.coords.latitude, pos.coords.longitude, false);
        } catch (err: any) {
          // Permission denied / unavailable — fall back to IP lookup so the
          // feature still works inside embedded previews where the
          // Permissions-Policy blocks the Geolocation API.
          resolved = await ipFallback();
          if (!resolved) {
            const code = err?.code;
            if (code === 1)
              toast.error("Location permission blocked. Pick your region manually below.");
            else if (code === 2) toast.error("Position unavailable. Try again outdoors.");
            else if (code === 3) toast.error("Location request timed out.");
            else toast.error(err?.message ?? "Couldn't get your location.");
            return;
          }
        }
      } else {
        resolved = await ipFallback();
      }
      if (!resolved) {
        toast.error("Couldn't determine your location.");
        return;
      }
      const { a, viaIp } = resolved;
      if (a.country_code && String(a.country_code).toLowerCase() !== "ph") {
        toast.error("Location is outside the Philippines.");
        return;
      }
      const matched = resolvePsgc({
        region: a.region ?? a.state ?? null,
        province: a.province ?? a.state_district ?? null,
        city: a.city ?? null,
        municipality: a.municipality ?? null,
        town: a.town ?? a.village ?? a.suburb ?? null,
      });
      if (!matched.region && !matched.province && !matched.city) {
        toast.error("Couldn't match your location to a Philippine region.");
        return;
      }
      onChange({
        region: matched.region,
        province: matched.province,
        city: matched.city,
        barangay: a.neighbourhood ?? a.suburb ?? value.barangay ?? null,
      });
      const summary = [matched.city, matched.province, matched.region]
        .filter(Boolean)
        .join(", ");
      toast.success(
        viaIp ? `Approximate location set: ${summary}` : `Location set: ${summary}`,
      );
    } catch (err: any) {
      const code = err?.code;
      if (code === 1) toast.error("Permission denied. Enable location access and try again.");
      else if (code === 2) toast.error("Position unavailable. Try again outdoors.");
      else if (code === 3) toast.error("Location request timed out.");
      else toast.error(err?.message ?? "Couldn't get your location.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className={className}>
      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useMyLocation}
          disabled={locating}
        >
          {locating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="mr-2 h-4 w-4" />
          )}
          Use my location
        </Button>
      </div>
      <div className={grid}>
        <Combo
          label="Region"
          placeholder={asFilter ? "All regions" : "Select region"}
          searchPlaceholder="Search region…"
          emptyText="No region found."
          value={value.region}
          options={regionOpts}
          asFilter={asFilter}
          clearLabel="All regions"
          onChange={(v) =>
            onChange({
              region: v,
              province: null,
              city: null,
              barangay: value.barangay ?? null,
            })
          }
        />

        <Combo
          label="Province"
          placeholder={
            !value.region
              ? "Pick a region first"
              : value.region === ALL_PH_REGION
                ? "Nationwide — no province"
                : provinces.length === 0
                  ? "No provinces (HUC/NCR)"
                  : asFilter
                    ? "All provinces"
                    : "Select province"
          }
          searchPlaceholder="Search province…"
          emptyText="No province found."
          value={value.province}
          options={provinces}
          disabled={!value.region || provinces.length === 0}
          asFilter={asFilter}
          clearLabel="All provinces"
          onChange={(v) => onChange({ ...value, province: v, city: null })}
        />

        <Combo
          label="City / Municipality"
          placeholder={
            !value.region
              ? "Pick a region first"
              : value.region === ALL_PH_REGION
                ? "Nationwide — no city"
                : cities.length === 0
                  ? "Pick a province first"
                  : asFilter
                    ? "All cities"
                    : "Select city"
          }
          searchPlaceholder="Search city or municipality…"
          emptyText="No city or municipality found."
          value={value.city}
          options={cities}
          disabled={!value.region || cities.length === 0}

          asFilter={asFilter}
          clearLabel="All cities"
          onChange={(v) => onChange({ ...value, city: v })}
        />

        {showBarangay && (
          <div>
            <Label>
              Barangay <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={value.barangay ?? ""}
              onChange={(e) => onChange({ ...value, barangay: e.target.value || null })}
              placeholder="e.g. Poblacion"
            />
          </div>
        )}
      </div>
    </div>
  );
}
