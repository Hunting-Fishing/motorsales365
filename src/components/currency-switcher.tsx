import { Check, ChevronDown, Globe } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const { code, setCode, currencies, current, loading } = useCurrency();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 px-2 text-muted-foreground hover:text-foreground"
          aria-label="Change display currency"
        >
          <Globe className="h-4 w-4" />
          {!compact && <span className="font-mono text-xs">{code}</span>}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">
          Display currency
          <div className="mt-0.5 font-normal text-muted-foreground">
            Prices are billed in PHP.
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</div>
        ) : (
          currencies.map((c) => (
            <DropdownMenuItem
              key={c.code}
              onClick={() => setCode(c.code)}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                <span className="w-6 font-mono text-xs">{c.symbol}</span>
                <span className="font-mono text-xs">{c.code}</span>
                <span className="truncate text-xs text-muted-foreground">{c.name}</span>
              </span>
              {c.code === current.code && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
