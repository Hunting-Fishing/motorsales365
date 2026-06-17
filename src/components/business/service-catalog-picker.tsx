import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Search, Plus, X, Pencil, Lightbulb, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FUEL_STATION_CATALOG, UNIT_OPTIONS, type CatalogItem } from "@/data/fuel-station-catalog";
import { blankService, type ServiceFormValue } from "./service-catalog-picker.utils";
import {
  listCatalogForType,
  submitServiceSuggestion,
  type CatalogEntry,
} from "@/lib/service-catalog.functions";

// Re-export the helpers from the colocated utils module so existing call sites
// importing them from this file continue to work.
// eslint-disable-next-line react-refresh/only-export-components -- back-compat re-exports for existing call sites
export { blankService, fromCatalogItem, formatServicePrice } from "./service-catalog-picker.utils";
export type { ServiceFormValue } from "./service-catalog-picker.utils";

/* ---------------- Catalog picker (search + groups) ---------------- */

export function CatalogPicker({
  existingKeys,
  onPick,
  onCustom,
  typeSlug,
  businessId,
}: {
  existingKeys: Set<string>;
  onPick: (item: CatalogItem) => void;
  onCustom: () => void;
  /** Business type slug — loads the DB-backed catalog tailored to that type. */
  typeSlug?: string | null;
  /** Used when submitting a "suggest a new item" request. */
  businessId?: string | null;
}) {
  return (
    <DbCatalogPicker
      typeSlug={typeSlug ?? null}
      businessId={businessId ?? null}
      existingKeys={existingKeys}
      onPick={onPick}
      onCustom={onCustom}
    />
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

/* ---------------- DB-backed catalog picker (non-fuel types) ---------------- */

function entryToCatalogItem(e: CatalogEntry): CatalogItem {
  return {
    key: e.key,
    title: e.title,
    description: e.description ?? undefined,
    unit: e.default_unit ?? undefined,
    category: e.business_type_slug,
  };
}

function DbCatalogPicker({
  typeSlug,
  businessId,
  existingKeys,
  onPick,
  onCustom,
}: {
  typeSlug: string | null;
  businessId: string | null;
  existingKeys: Set<string>;
  onPick: (item: CatalogItem) => void;
  onCustom: () => void;
}) {
  const [q, setQ] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [proposedTitle, setProposedTitle] = useState("");
  const [proposedUnit, setProposedUnit] = useState<string>("none");
  const [proposedDesc, setProposedDesc] = useState("");

  const enabled = !!typeSlug;
  const { data, isLoading } = useQuery({
    queryKey: ["service-catalog", typeSlug],
    queryFn: () => listCatalogForType({ data: { businessTypeSlug: typeSlug! } }),
    enabled,
    staleTime: 5 * 60_000,
  });

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const title = proposedTitle.trim();
      if (title.length < 2) throw new Error("Title is too short");
      return submitServiceSuggestion({
        data: {
          businessTypeSlug: typeSlug!,
          proposedTitle: title,
          proposedUnit: proposedUnit === "none" ? null : proposedUnit,
          proposedDescription: proposedDesc.trim() || null,
          submitterBusinessId: businessId ?? null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Suggestion sent to admins for review.");
      setSuggestOpen(false);
      setProposedTitle("");
      setProposedUnit("none");
      setProposedDesc("");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not submit suggestion.");
    },
  });

  const entries = data ?? [];
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(term) ||
        (e.description ?? "").toLowerCase().includes(term),
    );
  }, [entries, q]);

  return (
    <Card className="overflow-hidden border-primary/30">
      <div className="border-b border-border bg-muted/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Pick from the catalog</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSuggestOpen((v) => !v)}>
              <Lightbulb className="mr-1 h-4 w-4" /> Suggest new
            </Button>
            <Button size="sm" variant="outline" onClick={onCustom}>
              <Plus className="mr-1 h-4 w-4" /> Custom item
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search services & products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {suggestOpen && (
        <div className="space-y-2 border-b border-border bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">
            Don't see what you offer? Suggest a new item — admins will review and add it to the
            catalog for everyone.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Service / product name *</Label>
              <Input
                placeholder="e.g. Brake fluid flush"
                value={proposedTitle}
                onChange={(e) => setProposedTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <Label className="text-xs">Default unit</Label>
              <Select value={proposedUnit} onValueChange={setProposedUnit}>
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
          </div>
          <div>
            <Label className="text-xs">Short description (optional)</Label>
            <Textarea
              rows={2}
              placeholder="What does this service include?"
              value={proposedDesc}
              onChange={(e) => setProposedDesc(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSuggestOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => suggestMutation.mutate()}
              disabled={suggestMutation.isPending || proposedTitle.trim().length < 2}
            >
              {suggestMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="mr-1 h-4 w-4" />
              )}
              Send suggestion
            </Button>
          </div>
        </div>
      )}

      <div className="max-h-80 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {entries.length === 0
              ? "No catalog entries yet for this business type."
              : "No matches."}{" "}
            <button className="text-primary underline" onClick={onCustom}>
              Add a custom item
            </button>{" "}
            or{" "}
            <button className="text-primary underline" onClick={() => setSuggestOpen(true)}>
              suggest a new one
            </button>
            .
          </div>
        ) : (
          <div className="grid gap-1 sm:grid-cols-2">
            {filtered.map((e) => {
              const item = entryToCatalogItem(e);
              return (
                <CatalogRow
                  key={e.id}
                  item={item}
                  disabled={existingKeys.has(item.key)}
                  onPick={onPick}
                />
              );
            })}
          </div>
        )}
      </div>
    </Card>
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
