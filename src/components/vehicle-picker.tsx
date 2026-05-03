"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  getMakesForYear,
  getModelsForYear,
  getYearOptions,
  type VehicleCategory,
} from "@/data/vehicles";
import { fuzzyScore } from "@/lib/fuzzy";
import { MAKE_ALIASES, getModelAliases } from "@/lib/vehicle-aliases";

type Props = {
  category: VehicleCategory;
  year: string;
  make: string;
  model: string;
  onChange: (next: { year: string; make: string; model: string }) => void;
};

function Combo({
  value,
  options,
  onSelect,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  allowCustom = true,
  addLabel,
  getKeywords,
}: {
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
  allowCustom?: boolean;
  addLabel: string;
  getKeywords?: (option: string) => string[];
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const trimmed = query.trim();
  const exactMatch = trimmed
    ? options.some((o) => o.toLowerCase() === trimmed.toLowerCase())
    : false;
  const showAdd = allowCustom && trimmed.length > 0 && !exactMatch;

  const commit = (v: string) => {
    onSelect(v);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
          )}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command
          filter={(itemValue, search, keywords) => {
            if (!search.trim()) return 1;
            const candidates = [itemValue, ...(keywords ?? [])];
            let best = Infinity;
            for (const c of candidates) {
              const s = fuzzyScore(search, c);
              if (s < best) best = s;
            }
            if (best === Infinity) return 0;
            return 1 / (1 + best);
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-72">
            {showAdd && (
              <CommandGroup
                heading="Not in list?"
                className="sticky top-0 z-10 border-b border-border bg-popover"
              >
                <CommandItem
                  value={`__add__${trimmed}`}
                  onSelect={() => commit(trimmed)}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {addLabel}: “{trimmed}”
                </CommandItem>
              </CommandGroup>
            )}
            <CommandEmpty>
              {showAdd ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-accent"
                  onClick={() => commit(trimmed)}
                >
                  <Plus className="h-4 w-4" />
                  {addLabel}: “{trimmed}”
                </button>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  keywords={getKeywords?.(opt)}
                  onSelect={() => commit(opt)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function VehiclePicker({ category, year, make, model, onChange }: Props) {
  // "Other" mode = three free-text inputs (escape hatch).
  const [otherMode, setOtherMode] = React.useState(false);

  const yearNum = year && /^\d{4}$/.test(year) ? parseInt(year, 10) : undefined;
  const yearOptions = React.useMemo(
    () => getYearOptions().map((y) => String(y)),
    [],
  );

  const filteredMakes = React.useMemo(
    () => getMakesForYear(category, yearNum),
    [category, yearNum],
  );
  const makeNames = React.useMemo(
    () => filteredMakes.map((m) => m.make),
    [filteredMakes],
  );

  const modelOptions = React.useMemo(
    () => (make ? getModelsForYear(category, make, yearNum) : []),
    [category, make, yearNum],
  );

  const isOtherMake = make.toLowerCase() === "other";
  const isOtherModel = model.toLowerCase() === "other";

  // When year changes, drop a model that's no longer valid for that year.
  React.useEffect(() => {
    if (!yearNum || !make || !model) return;
    if (!modelOptions.some((m) => m.toLowerCase() === model.toLowerCase())) {
      onChange({ year, make, model: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearNum]);

  if (otherMode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Vehicle (free text)</span>
          <button
            type="button"
            onClick={() => setOtherMode(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Use list instead
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            value={year}
            onChange={(e) => onChange({ year: e.target.value, make, model })}
            placeholder="Year (e.g. 2019)"
            inputMode="numeric"
          />
          <Input
            value={make}
            onChange={(e) => onChange({ year, make: e.target.value, model })}
            placeholder="Make"
          />
          <Input
            value={model}
            onChange={(e) => onChange({ year, make, model: e.target.value })}
            placeholder="Model"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Year */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Year</span>
            {year && (
              <button
                type="button"
                onClick={() => onChange({ year: "", make, model })}
                className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 h-3 w-3" /> Clear
              </button>
            )}
          </div>
          <Combo
            value={year}
            options={yearOptions}
            placeholder="Select year"
            searchPlaceholder="Search year…"
            emptyText="No years"
            addLabel="Use year"
            onSelect={(v) => onChange({ year: v, make, model })}
          />
        </div>

        {/* Make */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Make</span>
            {make && (
              <button
                type="button"
                onClick={() => onChange({ year, make: "", model: "" })}
                className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 h-3 w-3" /> Clear
              </button>
            )}
          </div>
          <Combo
            value={make}
            options={makeNames}
            placeholder="Select make"
            searchPlaceholder="Search make…"
            emptyText="No makes found"
            addLabel="Add missing make"
            getKeywords={(opt) => MAKE_ALIASES[opt] ?? []}
            onSelect={(v) => onChange({ year, make: v, model: "" })}
          />
        </div>

        {/* Model */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Model</span>
            {model && (
              <button
                type="button"
                onClick={() => onChange({ year, make, model: "" })}
                className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 h-3 w-3" /> Clear
              </button>
            )}
          </div>
          {isOtherMake ? (
            <Input
              value={model}
              placeholder="Type model"
              onChange={(e) => onChange({ year, make, model: e.target.value })}
            />
          ) : (
            <Combo
              value={model}
              options={modelOptions}
              disabled={!make}
              placeholder={make ? "Select model" : "Pick a make first"}
              searchPlaceholder="Search model…"
              emptyText={
                yearNum && make
                  ? `No models match ${yearNum}. Try clearing the year.`
                  : "No models found"
              }
              addLabel="Add model"
              getKeywords={(opt) => getModelAliases(opt)}
              onSelect={(v) => onChange({ year, make, model: v })}
            />
          )}
          {isOtherModel && !isOtherMake && (
            <Input
              value={model === "Other" ? "" : model}
              placeholder="Type custom model"
              onChange={(e) => onChange({ year, make, model: e.target.value })}
              className="mt-2"
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Pick year first to filter models like a parts catalog. Models without a
          known year stay visible.
        </p>
        <button
          type="button"
          onClick={() => setOtherMode(true)}
          className="inline-flex items-center text-xs text-primary hover:underline"
        >
          <Plus className="mr-1 h-3 w-3" /> Other / not in list
        </button>
      </div>
    </div>
  );
}
