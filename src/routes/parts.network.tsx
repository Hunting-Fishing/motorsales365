import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, MapPin, Radio, Package, X, SlidersHorizontal } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  searchNetworkStock,
  getNetworkStockFacets,
  type NetworkStockRow,
} from "@/lib/network-stock.functions";
import { NetworkPartInquiryDialog } from "@/components/parts/network-part-inquiry-dialog";

const TITLE = "Network parts stock — Live availability across 365 shops";
const DESCRIPTION =
  "Search live parts inventory across the 365 shop network in the Philippines. Filter by category, brand, and vehicle compatibility, see which shop has it in stock, and request it in one click.";
const URL = "https://www.365motorsales.com/parts/network";

const ALL = "__all__";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "").default(""),
  brand: fallback(z.string(), "").default(""),
  make: fallback(z.string(), "").default(""),
  model: fallback(z.string(), "").default(""),
  year: fallback(z.number().int(), 0).default(0),
  province: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/parts/network")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: NetworkStockPage,
});

function NetworkStockPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/parts/network" });
  const searchFn = useServerFn(searchNetworkStock);
  const facetsFn = useServerFn(getNetworkStockFacets);
  const qc = useQueryClient();
  const [query, setQuery] = useState(search.q);
  const [inquiry, setInquiry] = useState<NetworkStockRow | null>(null);

  // Keep the search input synced with URL state (e.g. back/forward or reset).
  useEffect(() => setQuery(search.q), [search.q]);

  const filters = useMemo(
    () => ({
      query: search.q || undefined,
      category: search.category || undefined,
      brand: search.brand || undefined,
      make: search.make || undefined,
      model: search.model || undefined,
      year: search.year && search.year > 0 ? search.year : undefined,
      province: search.province || undefined,
    }),
    [search],
  );

  const PAGE_SIZE = 20;
  const {
    data,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["network-stock", filters],
    queryFn: ({ pageParam }) =>
      searchFn({ data: { ...filters, limit: PAGE_SIZE, offset: pageParam as number } }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    staleTime: 15_000,
  });
  const rows = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.rows),
    [data],
  );
  const total = data?.pages?.[0]?.total ?? null;

  const { data: facets } = useQuery({
    queryKey: ["network-stock-facets"],
    queryFn: () => facetsFn(),
    staleTime: 60_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("network-stock-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "business_inventory_items" },
        () => qc.invalidateQueries({ queryKey: ["network-stock"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const setParam = (patch: Record<string, string | number>) => {
    navigate({ search: (prev: any) => ({ ...prev, ...patch }) });
  };
  const resetAll = () =>
    navigate({
      search: { q: "", category: "", brand: "", make: "", model: "", year: 0, province: "" },
    });

  const activeCount = [
    search.category, search.brand, search.make, search.model, search.province,
  ].filter(Boolean).length + (search.year > 0 ? 1 : 0);

  return (
    <SiteLayout>
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto max-w-6xl px-4 py-12">
          <Badge variant="secondary" className="mb-3">
            <Radio className="mr-1 h-3 w-3" /> Live network stock
          </Badge>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Find parts in stock across the 365 network
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Search live inventory from 365 Franchise and Partner shops that opted in.
            Filter by category, brand, or your vehicle to find matching parts faster.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setParam({ q: query.trim() });
            }}
            className="mt-6 flex flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Part name, SKU, brand, or category (e.g. brake pad, 04465-02220)"
                className="pl-9"
                aria-label="Search network stock"
              />
            </div>
            <Button type="submit" size="lg">Search stock</Button>
            <Button asChild type="button" size="lg" variant="outline">
              <Link to="/parts/my-requests">My requests</Link>
            </Button>
          </form>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-8 grid gap-6 lg:grid-cols-[260px,1fr]">
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </p>
              {activeCount > 0 && (
                <button
                  onClick={resetAll}
                  className="text-xs text-primary hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <FilterSelect
              label="Category"
              value={search.category}
              options={facets?.categories ?? []}
              onChange={(v) => setParam({ category: v })}
            />
            <FilterSelect
              label="Brand"
              value={search.brand}
              options={facets?.brands ?? []}
              onChange={(v) => setParam({ brand: v })}
            />
            <FilterSelect
              label="Province"
              value={search.province}
              options={facets?.provinces ?? []}
              onChange={(v) => setParam({ province: v })}
            />

            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Vehicle fit
              </p>
              <FilterSelect
                label="Make"
                value={search.make}
                options={facets?.makes ?? []}
                onChange={(v) => setParam({ make: v, model: "" })}
              />
              <div>
                <Label className="text-xs">Model</Label>
                <Input
                  value={search.model}
                  onChange={(e) => setParam({ model: e.target.value })}
                  placeholder="e.g. Vios, Civic"
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Year</Label>
                <Input
                  type="number"
                  min={1900}
                  max={2100}
                  value={search.year || ""}
                  onChange={(e) => setParam({ year: Number(e.target.value) || 0 })}
                  placeholder="e.g. 2018"
                  className="h-8"
                />
              </div>
            </div>
          </Card>

          {activeCount > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {search.category && <Chip label={`Category: ${search.category}`} onRemove={() => setParam({ category: "" })} />}
              {search.brand && <Chip label={`Brand: ${search.brand}`} onRemove={() => setParam({ brand: "" })} />}
              {search.make && <Chip label={`Make: ${search.make}`} onRemove={() => setParam({ make: "" })} />}
              {search.model && <Chip label={`Model: ${search.model}`} onRemove={() => setParam({ model: "" })} />}
              {search.year > 0 && <Chip label={`Year: ${search.year}`} onRemove={() => setParam({ year: 0 })} />}
              {search.province && <Chip label={`Province: ${search.province}`} onRemove={() => setParam({ province: "" })} />}
            </div>
          )}
        </aside>

        <div>
          {isFetching && rows.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">Loading network stock…</Card>
          ) : rows.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">
                {search.q || activeCount > 0
                  ? "No matching parts in the network."
                  : "No listings yet."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try widening your filters, or ask the network to source it.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {activeCount > 0 && (
                  <Button variant="outline" onClick={resetAll}>Clear filters</Button>
                )}
                <Button asChild variant="ghost">
                  <Link to="/parts">Browse parts catalog</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Showing {rows.length}
                {total != null ? ` of ${total}` : ""} live listing
                {(total ?? rows.length) === 1 ? "" : "s"}
                {search.q ? ` for "${search.q}"` : ""}
              </p>
              {rows.map((r) => (
                <StockRow
                  key={r.id}
                  row={r}
                  onInquire={setInquiry}
                  filterMake={search.make}
                  filterModel={search.model}
                  filterYear={search.year}
                />
              ))}
              {hasNextPage && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <NetworkPartInquiryDialog
        row={inquiry}
        onClose={() => setInquiry(null)}
        onSubmitted={() => toast.success("Request sent to shop")}
      />
    </SiteLayout>
  );
}

function FilterSelect({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select
        value={value || ALL}
        onValueChange={(v) => onChange(v === ALL ? "" : v)}
      >
        <SelectTrigger className="h-8">
          <SelectValue placeholder={`All ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1">
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label}`} className="ml-1">
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

function StockRow({
  row, onInquire,
}: {
  row: NetworkStockRow;
  onInquire: (r: NetworkStockRow) => void;
}) {
function StockRow({
  row, onInquire, filterMake, filterModel, filterYear,
}: {
  row: NetworkStockRow;
  onInquire: (r: NetworkStockRow) => void;
  filterMake: string;
  filterModel: string;
  filterYear: number;
}) {
  const price = row.price != null ? `₱${Number(row.price).toLocaleString()}` : null;
  const hasFitmentData =
    !!(row.compatible_makes?.length || row.compatible_models?.length || row.year_min || row.year_max);

  const norm = (s: string) => s.trim().toLowerCase();
  const makes = row.compatible_makes ?? [];
  const models = row.compatible_models ?? [];

  const wantMake = filterMake ? norm(filterMake) : "";
  const wantModel = filterModel ? norm(filterModel) : "";
  const wantYear = filterYear && filterYear > 0 ? filterYear : 0;
  const hasVehicleFilter = !!(wantMake || wantModel || wantYear);

  const makeMatch = wantMake ? makes.some((m) => norm(m) === wantMake) : null;
  const modelMatch = wantModel ? models.some((m) => norm(m) === wantModel) : null;
  const yearInRange = wantYear
    ? (row.year_min == null || row.year_min <= wantYear) &&
      (row.year_max == null || row.year_max >= wantYear)
    : null;
  const yearRangeOnly = wantYear && yearInRange && row.year_min == null && row.year_max == null;

  // Overall fit tier vs. active vehicle filter.
  type Tier = "exact" | "partial" | "year-only" | "universal" | "unknown" | "mismatch" | null;
  let tier: Tier = null;
  if (hasVehicleFilter) {
    const required = [makeMatch, modelMatch, yearInRange].filter((v) => v !== null) as boolean[];
    const matched = required.filter(Boolean).length;
    if (!hasFitmentData) tier = "universal";
    else if (matched === 0) tier = "mismatch";
    else if (matched === required.length) {
      // Full match; downgrade to "year-only" if make/model weren't asserted by the shop
      const shopAssertsMakeModel =
        (makes.length > 0 && wantMake) || (models.length > 0 && wantModel);
      tier = shopAssertsMakeModel || !wantYear ? "exact" : "year-only";
    } else tier = "partial";
  } else if (!hasFitmentData) {
    tier = "universal";
  } else {
    tier = "unknown";
  }

  const tierBadge: Record<Exclude<Tier, null>, { label: string; cls: string }> = {
    exact: { label: "Exact fit", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    partial: { label: "Partial fit", cls: "bg-amber-100 text-amber-800 border-amber-300" },
    "year-only": { label: "Year range only", cls: "bg-amber-100 text-amber-800 border-amber-300" },
    universal: { label: "Universal fit", cls: "bg-sky-100 text-sky-800 border-sky-300" },
    unknown: { label: "Fitment listed", cls: "bg-secondary text-muted-foreground border-border" },
    mismatch: { label: "May not fit", cls: "bg-rose-100 text-rose-800 border-rose-300" },
  };

  const renderTokens = (items: string[], want: string, matchAll: boolean) =>
    items.map((item, i) => {
      const hit = want && norm(item) === want;
      return (
        <span key={`${item}-${i}`}>
          {i > 0 && ", "}
          <span
            className={
              hit
                ? "rounded bg-emerald-100 px-1 text-emerald-900 font-medium"
                : matchAll
                  ? "text-foreground"
                  : ""
            }
          >
            {item}
          </span>
        </span>
      );
    });

  return (
    <Card
      className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
        tier === "exact"
          ? "border-emerald-300 ring-1 ring-emerald-200"
          : tier === "mismatch"
            ? "opacity-80"
            : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold">{row.name}</p>
          {row.sku && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              SKU {row.sku}
            </span>
          )}
          {row.brand && (
            <Badge variant="outline" className="text-[10px]">{row.brand}</Badge>
          )}
          {tier && (
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${tierBadge[tier].cls}`}
            >
              {tierBadge[tier].label}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          <Link
            to="/b/$slug"
            params={{ slug: row.business_slug }}
            className="hover:underline"
          >
            {row.business_name}
          </Link>
          {(row.city || row.province) && (
            <span className="ml-2 inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {[row.city, row.province].filter(Boolean).join(", ")}
            </span>
          )}
          {row.category && <span className="ml-2">· {row.category}</span>}
        </p>
        {hasFitmentData ? (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Fits: </span>
            {makes.length > 0 && (
              <>{renderTokens(makes, wantMake, !!makeMatch)}</>
            )}
            {models.length > 0 && (
              <>
                {makes.length > 0 && " · "}
                {renderTokens(models, wantModel, !!modelMatch)}
              </>
            )}
            {(row.year_min || row.year_max) && (
              <>
                {(makes.length > 0 || models.length > 0) && " · "}
                <span
                  className={
                    yearInRange
                      ? "rounded bg-emerald-100 px-1 text-emerald-900 font-medium"
                      : wantYear
                        ? "text-rose-700"
                        : ""
                  }
                >
                  {row.year_min ?? "…"}–{row.year_max ?? "…"}
                  {wantYear && yearInRange ? ` (incl. ${wantYear})` : ""}
                </span>
              </>
            )}
            {yearRangeOnly && (
              <span className="ml-1 italic">
                — no make/model listed, confirm with shop
              </span>
            )}
          </p>
        ) : hasVehicleFilter ? (
          <p className="mt-1 text-xs italic text-muted-foreground">
            No fitment info listed — confirm with shop that it fits your{" "}
            {[filterYear || null, filterMake, filterModel].filter(Boolean).join(" ")}.
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-lg font-bold text-primary">
            {Number(row.available_qty ?? row.qty_on_hand)}
          </p>
          <p className="text-[10px] uppercase text-muted-foreground">
            {row.unit} available
          </p>
          {row.reserved_qty && Number(row.reserved_qty) > 0 ? (
            <p className="text-[10px] text-amber-600">
              {Number(row.reserved_qty)} on hold
            </p>
          ) : null}
        </div>
        {price && (
          <div className="text-right">
            <p className="font-semibold">{price}</p>
            <p className="text-[10px] uppercase text-muted-foreground">per {row.unit}</p>
          </div>
        )}
        <Button size="sm" onClick={() => onInquire(row)}>Request</Button>
      </div>
    </Card>
  );
}
