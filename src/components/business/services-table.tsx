import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listCatalogForType,
  submitServiceSuggestion,
  getServicePriceStats,
  type CatalogEntry,
} from "@/lib/service-catalog.functions";

export type DraftService = {
  /** Catalog id, or null when this row is a pending suggestion. */
  catalog_id: string | null;
  pending_suggestion_id: string | null;
  title: string;
  description: string | null;
  unit: string | null;
  price_php: number | null;
  notes: string | null;
};

export function ServicesTable({
  typeSlug,
  value,
  onChange,
  businessId,
}: {
  typeSlug: string;
  value: DraftService[];
  onChange: (next: DraftService[]) => void;
  /** When editing an existing business, used to exclude self from price comparison. */
  businessId?: string | null;
}) {
  const listFn = useServerFn(listCatalogForType);
  const suggestFn = useServerFn(submitServiceSuggestion);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [sTitle, setSTitle] = useState("");
  const [sUnit, setSUnit] = useState("service");
  const [sDesc, setSDesc] = useState("");
  const [sPrice, setSPrice] = useState("");
  const [sSubmitting, setSSubmitting] = useState(false);

  useEffect(() => {
    if (!typeSlug) return;
    setLoading(true);
    listFn({ data: { businessTypeSlug: typeSlug } })
      .then((rows) => setCatalog(rows))
      .catch(() => setCatalog([]))
      .finally(() => setLoading(false));
  }, [typeSlug, listFn]);

  const usedCatalogIds = useMemo(
    () => new Set(value.map((v) => v.catalog_id).filter(Boolean) as string[]),
    [value],
  );

  const addFromCatalog = (entry: CatalogEntry) => {
    if (usedCatalogIds.has(entry.id)) {
      toast.info(`"${entry.title}" is already in your list`);
      return;
    }
    onChange([
      ...value,
      {
        catalog_id: entry.id,
        pending_suggestion_id: null,
        title: entry.title,
        description: entry.description,
        unit: entry.default_unit,
        price_php: null,
        notes: null,
      },
    ]);
  };

  const removeAt = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const patchAt = (idx: number, patch: Partial<DraftService>) =>
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const submitSuggestion = async () => {
    const title = sTitle.trim();
    if (title.length < 2) {
      toast.error("Service name is too short");
      return;
    }
    setSSubmitting(true);
    try {
      const priceNum = sPrice.trim() === "" ? null : Number(sPrice);
      const res = await suggestFn({
        data: {
          businessTypeSlug: typeSlug,
          proposedTitle: title,
          proposedUnit: sUnit || null,
          proposedDescription: sDesc.trim() || null,
          samplePricePhp: priceNum && !Number.isNaN(priceNum) ? priceNum : null,
          submitterBusinessId: businessId ?? null,
        },
      });
      onChange([
        ...value,
        {
          catalog_id: null,
          pending_suggestion_id: res.id,
          title,
          description: sDesc.trim() || null,
          unit: sUnit || null,
          price_php: priceNum && !Number.isNaN(priceNum) ? priceNum : null,
          notes: null,
        },
      ]);
      toast.success("Sent for review — your service is listed now and goes live once an admin approves it.");
      setSuggestOpen(false);
      setSTitle("");
      setSDesc("");
      setSPrice("");
      setSUnit("service");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit suggestion");
    } finally {
      setSSubmitting(false);
    }
  };

  if (!typeSlug) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Choose a business type first to load services.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 p-3">
        <div>
          <h3 className="text-sm font-semibold">Services & pricing</h3>
          <p className="text-xs text-muted-foreground">
            Add each service you offer with its price. Customers can compare prices across providers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" type="button" disabled={loading}>
                {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                Add service
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-96 w-72 overflow-y-auto">
              <DropdownMenuLabel>Pick a service</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {catalog.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  No catalog entries yet. Use “Suggest new” below.
                </div>
              )}
              {catalog.map((entry) => {
                const used = usedCatalogIds.has(entry.id);
                return (
                  <DropdownMenuItem
                    key={entry.id}
                    disabled={used}
                    onSelect={() => addFromCatalog(entry)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="text-sm font-medium">
                      {entry.title}
                      {entry.default_unit && (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          /{entry.default_unit}
                        </span>
                      )}
                      {used && <span className="ml-2 text-[10px] text-muted-foreground">added</span>}
                    </span>
                    {entry.description && (
                      <span className="line-clamp-1 text-[11px] text-muted-foreground">
                        {entry.description}
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setSuggestOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Add custom service…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {value.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          No services yet. Click <strong>Add service</strong> to pick one.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Service</th>
                <th className="px-3 py-2">Your price (₱)</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Market</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {value.map((row, idx) => (
                <tr key={`${row.catalog_id ?? row.pending_suggestion_id ?? "row"}-${idx}`} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.title}</div>
                    {row.description && (
                      <div className="line-clamp-2 text-xs text-muted-foreground">{row.description}</div>
                    )}
                    {row.pending_suggestion_id && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        Pending review
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      inputMode="decimal"
                      className="w-28"
                      value={row.price_php ?? ""}
                      placeholder="e.g. 200"
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        patchAt(idx, { price_php: v === "" ? null : Number(v) });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="w-20"
                      value={row.unit ?? ""}
                      placeholder="unit"
                      onChange={(e) => patchAt(idx, { unit: e.target.value || null })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="min-w-[10rem]"
                      value={row.notes ?? ""}
                      placeholder='e.g. "+ fuel at pump"'
                      onChange={(e) => patchAt(idx, { notes: e.target.value || null })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {row.catalog_id ? (
                      <MarketStats catalogId={row.catalog_id} excludeBusinessId={businessId ?? null} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => removeAt(idx)}
                      aria-label="Remove service"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a custom service</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Your service is added to your list right away. It goes to admin review and, once
            approved, becomes available in the +Add menu for all businesses of this type.
          </p>
          <div className="grid gap-3">
            <div>
              <Label>Service name</Label>
              <Input
                value={sTitle}
                onChange={(e) => setSTitle(e.target.value)}
                placeholder="e.g. Battery Jump Start"
                maxLength={100}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Your fee (₱)</Label>
                <Input
                  inputMode="decimal"
                  value={sPrice}
                  onChange={(e) => setSPrice(e.target.value)}
                  placeholder="e.g. 125"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={sUnit}
                  onChange={(e) => setSUnit(e.target.value)}
                  placeholder="service / km / L"
                  maxLength={20}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={sDesc}
                onChange={(e) => setSDesc(e.target.value)}
                placeholder="What does this service include?"
                maxLength={500}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => setSuggestOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitSuggestion} disabled={sSubmitting}>
              {sSubmitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Submit for review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function MarketStats({
  catalogId,
  excludeBusinessId,
}: {
  catalogId: string;
  excludeBusinessId: string | null;
}) {
  const statsFn = useServerFn(getServicePriceStats);
  const [s, setS] = useState<{
    count: number;
    avg: number | null;
    min: number | null;
    max: number | null;
    samples: { businessId: string; name: string; slug: string; price: number; unit: string | null }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    statsFn({ data: { catalogId, excludeBusinessId } })
      .then(setS)
      .catch(() => setS(null))
      .finally(() => setLoading(false));
  }, [catalogId, excludeBusinessId, statsFn]);

  if (loading) return <span className="text-xs text-muted-foreground">…</span>;
  if (!s || s.count === 0) return <span className="text-xs text-muted-foreground">No data</span>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <BarChart3 className="h-3.5 w-3.5" />
          {s.count} · avg ₱{s.avg}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="text-xs font-semibold mb-2">
          {s.count} businesses · ₱{s.min} – ₱{s.max} (avg ₱{s.avg})
        </div>
        {s.samples.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sample list hidden until 3+ providers price this service.
          </p>
        ) : (
          <ul className="space-y-1 text-xs max-h-48 overflow-y-auto">
            {s.samples
              .slice()
              .sort((a, b) => a.price - b.price)
              .map((sm) => (
                <li key={sm.businessId} className="flex justify-between gap-2">
                  <span className="truncate">{sm.name}</span>
                  <span className="font-medium">
                    ₱{sm.price}
                    {sm.unit ? `/${sm.unit}` : ""}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
