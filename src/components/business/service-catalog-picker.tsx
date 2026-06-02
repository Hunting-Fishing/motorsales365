import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Plus, X, Pencil } from "lucide-react";
import { FUEL_STATION_CATALOG, UNIT_OPTIONS, type CatalogItem } from "@/data/fuel-station-catalog";
import { blankService, type ServiceFormValue } from "./service-catalog-picker.utils";

// Re-export the helpers from the colocated utils module so existing call sites
// importing them from this file continue to work.
export { blankService, fromCatalogItem, formatServicePrice } from "./service-catalog-picker.utils";
export type { ServiceFormValue } from "./service-catalog-picker.utils";

/* ---------------- Catalog picker (search + groups) ---------------- */

export function CatalogPicker({
  existingKeys,
  onPick,
  onCustom,
  typeSlug,
}: {
  existingKeys: Set<string>;
  onPick: (item: CatalogItem) => void;
  onCustom: () => void;
  /** Business type slug. Only "fuel_station" gets the fuel catalog;
   * everything else gets an "Add custom item" panel. */
  typeSlug?: string | null;
}) {
  const useFuelCatalog = typeSlug === "fuel_station";
  const [q, setQ] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>(FUEL_STATION_CATALOG[0].key);

  const filtered = useMemo(() => {
    if (!useFuelCatalog) return null;
    const term = q.trim().toLowerCase();
    if (!term) return null;
    const hits: { group: string; item: CatalogItem }[] = [];
    for (const g of FUEL_STATION_CATALOG) {
      for (const it of g.items) {
        if (it.title.toLowerCase().includes(term) || it.description?.toLowerCase().includes(term)) {
          hits.push({ group: g.label, item: it });
        }
      }
    }
    return hits.slice(0, 40);
  }, [q, useFuelCatalog]);

  // Non-fuel businesses: simple custom-only panel (no curated catalog yet).
  if (!useFuelCatalog) {
    return (
      <Card className="overflow-hidden border-primary/30">
        <div className="border-b border-border bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Add a service or product</h3>
            <Button size="sm" variant="default" onClick={onCustom}>
              <Plus className="mr-1 h-4 w-4" /> Add custom item
            </Button>
          </div>
        </div>
        <div className="p-4 text-sm text-muted-foreground">
          Describe each service or product you offer (title, price, optional photo and description).
          A curated catalog for this business type is coming soon — for now, add items manually.
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-primary/30">
      <div className="border-b border-border bg-muted/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Pick from the fuel-station catalog</h3>
          <Button size="sm" variant="outline" onClick={onCustom}>
            <Plus className="mr-1 h-4 w-4" /> Custom item
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search fuels, lubricants, car wash, store items…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered ? (
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No matches.{" "}
              <button className="text-primary underline" onClick={onCustom}>
                Add a custom item
              </button>
              .
            </div>
          ) : (
            <div className="grid gap-1">
              {filtered.map(({ group, item }) => (
                <CatalogRow
                  key={item.key}
                  item={item}
                  groupLabel={group}
                  disabled={existingKeys.has(item.key)}
                  onPick={onPick}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <Tabs value={activeGroup} onValueChange={setActiveGroup}>
          <div className="overflow-x-auto">
            <TabsList className="m-2 inline-flex w-max">
              {FUEL_STATION_CATALOG.map((g) => (
                <TabsTrigger key={g.key} value={g.key} className="text-xs">
                  {g.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {FUEL_STATION_CATALOG.map((g) => (
            <TabsContent key={g.key} value={g.key} className="m-0">
              {g.description && (
                <p className="px-4 pb-1 pt-1 text-xs text-muted-foreground">{g.description}</p>
              )}
              <div className="grid max-h-72 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
                {g.items.map((item) => (
                  <CatalogRow
                    key={item.key}
                    item={item}
                    disabled={existingKeys.has(item.key)}
                    onPick={onPick}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </Card>
  );
}

function CatalogRow({
  item,
  groupLabel,
  disabled,
  onPick,
}: {
  item: CatalogItem;
  groupLabel?: string;
  disabled?: boolean;
  onPick: (item: CatalogItem) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(item)}
      className="group flex items-start gap-2 rounded-md border border-transparent p-2 text-left transition hover:border-primary/40 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Plus className="mt-0.5 h-4 w-4 shrink-0 text-primary opacity-60 group-hover:opacity-100" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium">{item.title}</span>
          {item.unit && (
            <Badge variant="outline" className="text-[10px]">
              {item.unit}
            </Badge>
          )}
          {disabled && (
            <Badge variant="secondary" className="text-[10px]">
              Added
            </Badge>
          )}
          {groupLabel && <span className="text-[10px] text-muted-foreground">· {groupLabel}</span>}
        </div>
        {item.description && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
        )}
      </div>
    </button>
  );
}

/* ---------------- Pricing fields ---------------- */

export function PricingFields({
  value,
  onChange,
}: {
  value: ServiceFormValue;
  onChange: (patch: Partial<ServiceFormValue>) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-3">
      <div className="sm:col-span-1">
        <Label className="text-xs">Price (₱) — optional</Label>
        <Input
          inputMode="decimal"
          placeholder="e.g. 65.50"
          value={value.price_php ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            onChange({ price_php: v === "" ? null : Number(v) });
          }}
        />
      </div>
      <div className="sm:col-span-1">
        <Label className="text-xs">Promo price (₱)</Label>
        <Input
          inputMode="decimal"
          placeholder="optional"
          value={value.sale_price_php ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            onChange({ sale_price_php: v === "" ? null : Number(v) });
          }}
        />
      </div>
      <div className="sm:col-span-1">
        <Label className="text-xs">Unit</Label>
        <Select
          value={value.unit ?? "none"}
          onValueChange={(v) => onChange({ unit: v === "none" ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— none —</SelectItem>
            {UNIT_OPTIONS.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-3">
        <Label className="text-xs">
          Custom price label (overrides price + unit on the public page)
        </Label>
        <Input
          placeholder='e.g. "From ₱500" or "Market price"'
          value={value.price_label ?? ""}
          onChange={(e) => onChange({ price_label: e.target.value || null })}
          maxLength={60}
        />
      </div>
    </div>
  );
}

/* ---------------- Public price formatter ---------------- */

export function formatServicePrice(svc: {
  price_label?: string | null;
  price_php?: number | null;
  sale_price_php?: number | null;
  unit?: string | null;
}): string | null {
  if (svc.price_label && svc.price_label.trim()) return svc.price_label;
  const p = svc.sale_price_php ?? svc.price_php;
  if (p == null) return null;
  const unit = svc.unit ? `/${svc.unit}` : "";
  return `₱${Number(p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit}`;
}
