import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Hash, Car, Search, Loader2, Phone, Globe, MapPin, ShieldCheck, Sparkles, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { decodeVin, type DecodeResult } from "@/lib/vin-decode.functions";
import { listPartsCountries, searchOemOutlets } from "@/lib/parts-catalog.functions";
import { OemOrderForm } from "./oem-order-form";

type Country = { code: string; name: string; is_active: boolean };
type Outlet = {
  id: string;
  country_code: string;
  name: string;
  slug: string;
  outlet_type: string;
  brands: string[] | null;
  region: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  is_verified: boolean | null;
  is_d2c_enabled: boolean | null;
};

type Vehicle = { make: string; model: string; year: number | null; engine: string | null; source: string; input: string };

export function OemSearch() {
  const fetchCountries = useServerFn(listPartsCountries);
  const decode = useServerFn(decodeVin);
  const search = useServerFn(searchOemOutlets);

  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState("PH");
  const [vin, setVin] = useState("");
  const [decoding, setDecoding] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [mMake, setMMake] = useState("");
  const [mModel, setMModel] = useState("");
  const [mYear, setMYear] = useState("");
  const [outlets, setOutlets] = useState<Outlet[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [quoteFor, setQuoteFor] = useState<Outlet | null>(null);

  useEffect(() => {
    fetchCountries().then((rows: any) => setCountries(rows ?? [])).catch(() => {});
  }, [fetchCountries]);

  const activeCountries = useMemo(() => countries.filter((c) => c.is_active), [countries]);
  const countryName = countries.find((c) => c.code === country)?.name ?? country;

  async function onDecode(e: React.FormEvent) {
    e.preventDefault();
    if (!vin.trim() || decoding) return;
    setDecoding(true);
    setDecodeError(null);
    try {
      const result = (await decode({ data: { value: vin } })) as DecodeResult;
      if (result.ok) {
        const v: Vehicle = {
          make: result.make, model: result.model, year: result.year,
          engine: result.engine, source: result.source, input: result.input,
        };
        setVehicle(v);
        setManualOpen(false);
        await runSearch(v.make, v.model, v.year ?? undefined);
      } else {
        setDecodeError(result.reason);
        setManualOpen(true);
        setVehicle(null);
        setOutlets(null);
      }
    } catch (err: any) {
      setDecodeError(err?.message ?? "Decode failed");
      setManualOpen(true);
    } finally {
      setDecoding(false);
    }
  }

  async function runSearch(make: string, model?: string, year?: number) {
    setSearching(true);
    setOutlets(null);
    try {
      const rows = (await search({ data: { country, make, model, year } })) as Outlet[];
      setOutlets(rows);
    } catch (err: any) {
      toast.error(err?.message ?? "Search failed");
      setOutlets([]);
    } finally {
      setSearching(false);
    }
  }

  async function onManualSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!mMake.trim()) return;
    const v: Vehicle = {
      make: mMake.trim(), model: mModel.trim(), year: mYear ? Number(mYear) : null,
      engine: null, source: "manual", input: "",
    };
    setVehicle(v);
    setDecodeError(null);
    await runSearch(v.make, v.model || undefined, v.year ?? undefined);
  }

  function clearVehicle() {
    setVehicle(null);
    setOutlets(null);
    setDecodeError(null);
    setVin("");
  }

  return (
    <div className="space-y-4">
      {/* Country + VIN bar */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Market:</span>
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              if (vehicle) runSearch(vehicle.make, vehicle.model, vehicle.year ?? undefined);
            }}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code} disabled={!c.is_active}>
                {c.name}{c.is_active ? "" : " — coming soon"}
              </option>
            ))}
            {countries.length === 0 && <option value="PH">Philippines</option>}
          </select>
          {activeCountries.length > 0 && (
            <span className="ml-auto hidden sm:inline">
              {activeCountries.length} active market{activeCountries.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <form onSubmit={onDecode} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              maxLength={20}
              placeholder="Enter VIN or chassis # (e.g. JZX100, JT2BG22K8X0123456)"
              className="w-full rounded-md border border-border bg-background py-2.5 pl-9 pr-3 text-sm font-mono tracking-wider"
            />
          </div>
          <button
            type="submit"
            disabled={decoding || !vin.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {decoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {decoding ? "Decoding…" : "Find OEM parts"}
          </button>
        </form>

        {decodeError && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{decodeError}</span>
          </div>
        )}

        {vehicle && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
            <Car className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">
              {vehicle.make} {vehicle.model}{vehicle.year ? ` ${vehicle.year}` : ""}
            </span>
            {vehicle.engine && <span className="text-xs text-muted-foreground">· {vehicle.engine}</span>}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {vehicle.source === "nhtsa" ? "VIN decoded" : vehicle.source === "jdm_table" ? "Chassis matched" : "Manual"}
            </span>
            <button type="button" onClick={clearVehicle} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        )}

        {/* Manual fallback */}
        <details
          className="mt-3"
          open={manualOpen}
          onToggle={(e) => setManualOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
            Don't have a VIN? Search by make &amp; model
          </summary>
          <form onSubmit={onManualSearch} className="mt-3 grid gap-2 sm:grid-cols-4">
            <input value={mMake} onChange={(e) => setMMake(e.target.value)} placeholder="Make (Toyota)" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <input value={mModel} onChange={(e) => setMModel(e.target.value)} placeholder="Model (Hilux)" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <input value={mYear} onChange={(e) => setMYear(e.target.value)} type="number" min={1900} max={2100} placeholder="Year" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <button type="submit" className="rounded-md bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80">
              Search outlets
            </button>
          </form>
        </details>
      </div>

      {/* Results */}
      {vehicle && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              {searching
                ? "Searching outlets…"
                : outlets === null
                ? ""
                : outlets.length === 0
                ? `No outlets yet carrying ${vehicle.make} parts in ${countryName}.`
                : `${outlets.length} outlet${outlets.length === 1 ? "" : "s"} in ${countryName} carry ${vehicle.make} parts`}
            </p>
          </div>

          {searching && (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-card p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!searching && outlets && outlets.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {outlets.map((o) => (
                <div key={o.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">{o.name}</h4>
                      <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                        {o.outlet_type.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {o.is_verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                      {o.is_d2c_enabled && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <Sparkles className="h-3 w-3" /> Ships direct
                        </span>
                      )}
                    </div>
                  </div>
                  {(o.city || o.region) && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {[o.city, o.region].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {o.brands && o.brands.length > 0 && (
                    <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                      Brands: <span className="text-foreground">{o.brands.join(", ")}</span>
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {o.phone && (
                      <a href={`tel:${o.phone}`} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-secondary">
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                    )}
                    {o.website && (
                      <a href={o.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-secondary">
                        <Globe className="h-3.5 w-3.5" /> Website
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setQuoteFor(o)}
                      className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      Request quote
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!searching && outlets && outlets.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-6">
              <p className="text-sm font-medium">No partner outlets yet for {vehicle.make} in {countryName}.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Submit your request below — we'll source it through our wider dealer network and email you back.
              </p>
              <div className="mt-4">
                <OemOrderForm />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quote modal — simple inline panel */}
      {quoteFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-2 sm:items-center sm:p-4" onClick={() => setQuoteFor(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Request quote — {quoteFor.name}</h3>
              <button onClick={() => setQuoteFor(null)} className="rounded-md p-1 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <OemOrderForm />
          </div>
        </div>
      )}

      {/* When no vehicle yet, show the existing quote form below as a fallback */}
      {!vehicle && !decodeError && (
        <div className="rounded-xl border border-dashed border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
          Enter a VIN or chassis # above to find OEM parts and matching outlets. Or{" "}
          <button onClick={() => setManualOpen(true)} className="text-primary hover:underline">browse by make &amp; model</button>.
        </div>
      )}
    </div>
  );
}
