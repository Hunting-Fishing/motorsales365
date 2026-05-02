"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
import { getMakes, type VehicleCategory } from "@/data/vehicles";
import { fuzzyScore } from "@/lib/fuzzy";
import { MAKE_ALIASES } from "@/lib/vehicle-aliases";

type Props = {
  category: VehicleCategory;
  make: string;
  model: string;
  onChange: (next: { make: string; model: string }) => void;
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
  getKeywords?: (option: string) => string[];
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

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
            // cmdk wants higher = better, in (0, 1].
            return 1 / (1 + best);
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              {allowCustom && query.trim() ? (
                <button
                  type="button"
                  className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onSelect(query.trim());
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  Use “{query.trim()}”
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
                  onSelect={() => {
                    onSelect(opt);
                    setOpen(false);
                    setQuery("");
                  }}
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

export function VehiclePicker({ category, make, model, onChange }: Props) {
  const makes = React.useMemo(() => getMakes(category), [category]);
  const makeNames = React.useMemo(() => makes.map((m) => m.make), [makes]);
  const modelOptions = React.useMemo(() => {
    const found = makes.find((m) => m.make.toLowerCase() === make.toLowerCase());
    return found?.models ?? [];
  }, [makes, make]);

  const isOtherMake = make.toLowerCase() === "other";
  const isOtherModel = model.toLowerCase() === "other";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Make</span>
          {make && (
            <button
              type="button"
              onClick={() => onChange({ make: "", model: "" })}
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
          onSelect={(v) => onChange({ make: v, model: "" })}
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Model</span>
          {model && (
            <button
              type="button"
              onClick={() => onChange({ make, model: "" })}
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
            onChange={(e) => onChange({ make, model: e.target.value })}
          />
        ) : (
          <Combo
            value={model}
            options={modelOptions}
            disabled={!make}
            placeholder={make ? "Select model" : "Pick a make first"}
            searchPlaceholder="Search model…"
            emptyText="No models found"
            onSelect={(v) => onChange({ make, model: v })}
          />
        )}
        {isOtherModel && !isOtherMake && (
          <Input
            value={model === "Other" ? "" : model}
            placeholder="Type custom model"
            onChange={(e) => onChange({ make, model: e.target.value })}
            className="mt-2"
          />
        )}
      </div>
    </div>
  );
}
