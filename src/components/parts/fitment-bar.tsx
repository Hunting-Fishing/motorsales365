import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Car, ScanBarcode, Hash, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CAR_MAKES, getYearOptions, getMakes } from "@/data/vehicles";

const STORAGE_KEY = "365_parts_ymm";

type Ymm = { make: string; model: string; year: string };
type Mode = "ymm" | "vin" | "pn";

export function loadStoredYmm(): Ymm {
  if (typeof window === "undefined") return { make: "", model: "", year: "" };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { make: "", model: "", year: "" };
    const p = JSON.parse(raw);
    return {
      make: typeof p.make === "string" ? p.make : "",
      model: typeof p.model === "string" ? p.model : "",
      year: typeof p.year === "string" ? p.year : "",
    };
  } catch {
    return { make: "", model: "", year: "" };
  }
}

export function saveStoredYmm(v: Ymm) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

interface Props {
  onContextChange?: (ctx: Ymm) => void;
}

/**
 * Unified fitment bar: three tabs for Vehicle / VIN / Part Number lookup.
 * Persists YMM to sessionStorage so it survives navigation across /parts routes.
 */
export function FitmentBar({ onContextChange }: Props) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("ymm");
  const [ymm, setYmm] = useState<Ymm>({ make: "", model: "", year: "" });
  const [vin, setVin] = useState("");
  const [pn, setPn] = useState("");

  // Hydrate from sessionStorage after mount (avoids SSR/CSR mismatch).
  useEffect(() => {
    const s = loadStoredYmm();
    if (s.make || s.model || s.year) {
      setYmm(s);
      onContextChange?.(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const years = useMemo(() => getYearOptions(), []);
  const makes = useMemo(() => CAR_MAKES.map((m) => m.make), []);
  const models = useMemo(() => {
    if (!ymm.make) return [];
    const found = getMakes("car").find((m) => m.make.toLowerCase() === ymm.make.toLowerCase());
    return found?.models ?? [];
  }, [ymm.make]);

  function updateYmm(patch: Partial<Ymm>) {
    setYmm((prev) => {
      const next = { ...prev, ...patch };
      if (patch.make !== undefined && patch.make !== prev.make) next.model = "";
      saveStoredYmm(next);
      onContextChange?.(next);
      return next;
    });
  }

  function submitYmm() {
    if (!ymm.make && !ymm.model && !ymm.year) return;
    navigate({
      to: "/parts/search",
      search: {
        mk: ymm.make || undefined,
        md: ymm.model || undefined,
        yr: ymm.year ? Number(ymm.year) : undefined,
      } as any,
    });
  }

  function submitVin() {
    const v = vin.trim().toUpperCase();
    if (!v) return;
    navigate({ to: "/parts/search", search: { vin: v } as any });
  }

  function submitPn() {
    const v = pn.trim();
    if (!v) return;
    navigate({ to: "/parts/search", search: { q: v } as any });
  }

  return (
    <section
      aria-label="Find parts for your vehicle"
      className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white shadow-xl"
    >
      <div className="flex flex-col lg:flex-row">
        {/* Tabs — horizontal on mobile, vertical rail on desktop */}
        <div className="flex shrink-0 border-b border-white/10 lg:w-48 lg:flex-col lg:border-b-0 lg:border-r lg:border-white/10">
          {(
            [
              { id: "ymm" as Mode, label: "By Vehicle", Icon: Car },
              { id: "vin" as Mode, label: "By VIN", Icon: ScanBarcode },
              { id: "pn" as Mode, label: "Part number", Icon: Hash },
            ]
          ).map(({ id, label, Icon }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                aria-pressed={active}
                className={`flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold uppercase tracking-widest transition lg:justify-start lg:border-l-4 ${
                  active
                    ? "bg-white/5 text-white lg:border-primary"
                    : "text-white/50 hover:bg-white/5 hover:text-white lg:border-transparent"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 p-4 sm:p-5">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h1 className="font-display text-lg font-bold sm:text-xl">Find exact-fit parts</h1>
            <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-white/40 sm:inline">
              Philippines · PHP
            </span>
          </div>

          {mode === "ymm" && (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <select
                value={ymm.year}
                onChange={(e) => updateYmm({ year: e.target.value })}
                className="rounded-md border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                aria-label="Year"
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                value={ymm.make}
                onChange={(e) => updateYmm({ make: e.target.value })}
                className="rounded-md border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                aria-label="Make"
              >
                <option value="">Make</option>
                {makes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={ymm.model}
                onChange={(e) => updateYmm({ model: e.target.value })}
                disabled={!ymm.make}
                className="rounded-md border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                aria-label="Model"
              >
                <option value="">Model</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={submitYmm}
                className="col-span-2 bg-primary text-primary-foreground hover:bg-primary/90 md:col-span-1"
              >
                <Search className="mr-1.5 h-4 w-4" /> Search
              </Button>
            </div>
          )}

          {mode === "vin" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitVin()}
                placeholder="Enter 17-character VIN"
                maxLength={17}
                className="border-white/10 bg-slate-950 uppercase tracking-widest text-white placeholder:text-white/30 focus-visible:border-primary focus-visible:ring-primary"
              />
              <Button
                type="button"
                onClick={submitVin}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ScanBarcode className="mr-1.5 h-4 w-4" /> Decode VIN
              </Button>
            </div>
          )}

          {mode === "pn" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={pn}
                onChange={(e) => setPn(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitPn()}
                placeholder="OEM or aftermarket part number (e.g. 90915-YZZD4)"
                className="border-white/10 bg-slate-950 text-white placeholder:text-white/30 focus-visible:border-primary focus-visible:ring-primary"
              />
              <Button
                type="button"
                onClick={submitPn}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Search className="mr-1.5 h-4 w-4" /> Find part
              </Button>
            </div>
          )}

          <p className="mt-3 text-[11px] text-white/50">
            Guaranteed fitment via YMM · VIN decoding for PH-market vehicles · OEM cross-reference
          </p>
        </div>
      </div>
    </section>
  );
}
