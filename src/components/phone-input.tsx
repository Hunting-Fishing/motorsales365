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
import {
  COUNTRY_CODES,
  findCountryByDial,
  formatNational,
  parseE164,
} from "@/data/country-codes";

type Props = {
  iso: string;
  national: string;
  onChange: (next: { iso: string; national: string }) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
};

// Per-country max digits — keep loose upper bound so we never block a valid
// number, but stop runaway typing/pasting beyond E.164's 15-digit ceiling.
const MAX_NATIONAL_DIGITS: Record<string, number> = {
  PH: 10, US: 10, CA: 10, GB: 10, AU: 9, NZ: 10, SG: 8, MY: 10, ID: 12,
  TH: 9, VN: 10, JP: 10, KR: 10, CN: 11, HK: 8, TW: 9, IN: 10, PK: 10,
  BD: 10, AE: 9, SA: 9, QA: 8, KW: 8, BH: 8, OM: 8, IL: 9, TR: 10, ZA: 9,
  NG: 10, KE: 9, EG: 10, DE: 11, FR: 9, ES: 9, IT: 11, NL: 9, BE: 9,
  CH: 9, AT: 11, SE: 10, NO: 8, DK: 8, FI: 10, IE: 9, PT: 9, GR: 10,
  PL: 9, CZ: 9, RO: 9, RU: 10, UA: 9, MX: 10, BR: 11, AR: 11, CL: 9,
  CO: 10, PE: 9,
};

function sanitizeInput(
  raw: string,
  currentIso: string,
): { iso: string; national: string } {
  // Handle full E.164 paste ("+63917...") or trunk-prefixed ("0917...")
  const trimmed = raw.trim();
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
    const normalized = trimmed.startsWith("00")
      ? `+${trimmed.slice(2)}`
      : trimmed;
    const parsed = parseE164(normalized);
    if (parsed.iso && parsed.national) return parsed;
    const match = findCountryByDial(normalized.replace(/[^\d+]/g, ""));
    if (match) {
      return {
        iso: match.iso,
        national: normalized
          .replace(/\D/g, "")
          .slice(match.dial.replace(/\D/g, "").length),
      };
    }
  }
  // Otherwise strip non-digits, drop leading trunk zero, cap length.
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  const cap = MAX_NATIONAL_DIGITS[currentIso] ?? 14;
  if (digits.length > cap) digits = digits.slice(0, cap);
  return { iso: currentIso, national: digits };
}

export function PhoneInput({
  iso,
  national,
  onChange,
  placeholder,
  id,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const country = useMemo(
    () => COUNTRY_CODES.find((c) => c.iso === iso) ?? COUNTRY_CODES[0],
    [iso],
  );

  return (
    <div className="flex w-full gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-label={`Country: ${country.name} (${country.dial})`}
            disabled={disabled}
            className="w-[76px] shrink-0 justify-between gap-1 px-2 font-normal"
          >
            <span className="flex min-w-0 items-center gap-1">
              <span className="hidden text-base leading-none md:inline" aria-hidden>
                {country.flag}
              </span>
              <span className="truncate text-sm tabular-nums">
                {country.dial}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[min(92vw,300px)] p-0"
          align="start"
          sideOffset={4}
        >
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
                      // Re-cap digits to the new country's max
                      const cap = MAX_NATIONAL_DIGITS[c.iso] ?? 14;
                      const trimmed = national.replace(/\D/g, "").slice(0, cap);
                      onChange({ iso: c.iso, national: trimmed });
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        c.iso === iso ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="mr-2 text-base leading-none" aria-hidden>
                      {c.flag}
                    </span>
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
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder={placeholder ?? "917 123 4567"}
        value={formatNational(national, iso)}
        disabled={disabled}
        onChange={(e) => {
          const next = sanitizeInput(e.target.value, iso);
          onChange(next);
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (/^\s*(\+|00)/.test(text)) {
            e.preventDefault();
            const next = sanitizeInput(text, iso);
            onChange(next);
          }
        }}
        className="min-w-0 flex-1 tabular-nums"
        aria-label="Mobile number"
      />
    </div>
  );
}
