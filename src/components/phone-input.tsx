import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRY_CODES, formatNational } from "@/data/country-codes";

type Props = {
  iso: string;
  national: string;
  onChange: (next: { iso: string; national: string }) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
};

export function PhoneInput({ iso, national, onChange, placeholder, id, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const country = useMemo(
    () => COUNTRY_CODES.find((c) => c.iso === iso) ?? COUNTRY_CODES[0],
    [iso],
  );

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-[130px] shrink-0 justify-between font-normal"
          >
            <span className="flex items-center gap-1.5">
              <span className="text-base leading-none">{country.flag}</span>
              <span className="text-sm tabular-nums">{country.dial}</span>
            </span>
            <ChevronDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search country…" />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {COUNTRY_CODES.map((c) => (
                  <CommandItem
                    key={c.iso}
                    value={`${c.name} ${c.dial} ${c.iso}`}
                    onSelect={() => {
                      onChange({ iso: c.iso, national });
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 size-4", c.iso === iso ? "opacity-100" : "opacity-0")}
                    />
                    <span className="mr-2 text-base leading-none">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                      {c.dial}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={placeholder ?? "917 123 4567"}
        value={formatNational(national)}
        disabled={disabled}
        onChange={(e) => onChange({ iso, national: e.target.value.replace(/\D/g, "") })}
        className="flex-1"
      />
    </div>
  );
}
