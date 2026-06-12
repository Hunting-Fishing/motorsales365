"use client";

import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Search, Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { USED_PARTS_GROUPS } from "@/data/needed-parts-catalog";
import { CAR_MAKES, getYearOptions, getMakes } from "@/data/vehicles";
import { searchUsedParts } from "@/lib/parts-search.functions";
import { ListingCard, type ListingCardData } from "@/components/listing-card";

type Step = 1 | 2 | 3 | 4;

export function PartsWizard() {
  const navigate = useNavigate();
  const runSearch = useServerFn(searchUsedParts);

  const [step, setStep] = useState<Step>(1);
  const [year, setYear] = useState<string>("");
  const [make, setMake] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [systems, setSystems] = useState<string[]>([]);
  const [partKeys, setPartKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ListingCardData[] | null>(null);

  const years = useMemo(() => getYearOptions(), []);
  const carMakes = useMemo(() => CAR_MAKES.map((m) => m.make), []);
  const models = useMemo(() => {
    if (!make) return [];
    const found = getMakes("car").find((m) => m.make.toLowerCase() === make.toLowerCase());
    return found?.models ?? [];
  }, [make]);

  const visibleGroups = useMemo(() => USED_PARTS_GROUPS, []);
  const selectedGroupItems = useMemo(() => {
    if (systems.length === 0) return visibleGroups.flatMap((g) => g.items);
    return visibleGroups.filter((g) => systems.includes(g.key)).flatMap((g) => g.items);
  }, [systems, visibleGroups]);

  function toggle(arr: string[], v: string): string[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  async function submit() {
    setLoading(true);
    try {
      const r = await runSearch({
        data: {
          make: make || null,
          model: model || null,
          year: year ? Number(year) : null,
          systems,
          partKeys,
          limit: 60,
        },
      });
      setResults(r.listings as ListingCardData[]);
      setStep(4);
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    setStep(1);
    setResults(null);
    setPartKeys([]);
    setSystems([]);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
      {/* Progress */}
      <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                step >= n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background"
              }`}
            >
              {n}
            </span>
            <span className={step === n ? "text-foreground" : ""}>
              {n === 1 ? "Vehicle" : n === 2 ? "System(s)" : "Part(s)"}
            </span>
            {n < 3 && <ChevronRight className="h-3 w-3" />}
          </div>
        ))}
      </div>

      {/* Step 1 — vehicle */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold">What vehicle is it for?</h2>
            <p className="text-sm text-muted-foreground">
              You can skip any field — we'll show broader results.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Year">
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              >
                <option value="">Any year</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Make">
              <select
                value={make}
                onChange={(e) => {
                  setMake(e.target.value);
                  setModel("");
                }}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              >
                <option value="">Any make</option>
                {carMakes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Model">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!make}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm disabled:opacity-50"
              >
                <option value="">Any model</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — system */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Which system?</h2>
            <p className="text-sm text-muted-foreground">
              Select one or more. Skip to see all parts.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleGroups.map((g) => {
              const on = systems.includes(g.key);
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setSystems(toggle(systems, g.key))}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-secondary"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(3)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — specific parts */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Which part(s)?</h2>
            <p className="text-sm text-muted-foreground">
              Pick as many as you need. Skip to search by system only.
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-border bg-background/40 p-3">
            {visibleGroups
              .filter((g) => systems.length === 0 || systems.includes(g.key))
              .map((g) => (
                <div key={g.key} className="mb-3 last:mb-0">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map((it) => {
                      const on = partKeys.includes(it.key);
                      return (
                        <button
                          key={it.key}
                          type="button"
                          onClick={() => setPartKeys(toggle(partKeys, it.key))}
                          className={`rounded-full border px-2.5 py-1 text-xs transition ${
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:bg-secondary"
                          }`}
                        >
                          {it.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={submit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Searching…
                </>
              ) : (
                <>
                  <Search className="mr-1 h-4 w-4" /> Find parts
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 — results */}
      {step === 4 && results && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-semibold">
                {results.length} match{results.length === 1 ? "" : "es"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {[year, make, model].filter(Boolean).join(" ") || "Any vehicle"}
                {partKeys.length > 0 ? ` • ${partKeys.length} part(s)` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={startOver}>
                New search
              </Button>
              {results.length === 0 && (
                <Button
                  onClick={() =>
                    navigate({
                      to: "/wanted",
                      search: {
                        prefill: JSON.stringify({
                          year,
                          make,
                          model,
                          systems,
                          partKeys,
                        }),
                      } as any,
                    })
                  }
                >
                  Post a wanted ad
                </Button>
              )}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background/50 p-8 text-center">
              <Wrench className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No parts listed yet that match.</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                Try removing filters, browse all parts below, or post a wanted ad and let
                salvage yards & sellers come to you.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/browse/$category" params={{ category: "parts" }}>
                    Browse all parts
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/businesses">Find a salvage yard</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
