import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import ogBrowse from "@/assets/og/browse.jpg";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, BookmarkPlus, Rocket, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getActiveDealerStatus } from "@/lib/seller-status.functions";
import { getBrowseListings, type BrowseFiltersInput } from "@/lib/browse-listings.functions";
import { getYearCountsForCategory } from "@/lib/year-counts.functions";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";

import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { AdCarousel } from "@/components/ads/ad-carousel";
import { SponsoredCategorySlot } from "@/components/ads/sponsored-category-slot";
import { MarketplaceToolbar, type ViewMode } from "@/components/marketplace/marketplace-toolbar";
import { ListingCardSkeletonGrid } from "@/components/marketplace/listing-card-skeleton";
import { ListingsMapView } from "@/components/marketplace/listings-map-view";
import { useGridDensity, densityGridClass } from "@/hooks/use-grid-density";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "@/components/location-picker";
import { VehiclePicker } from "@/components/vehicle-picker";
import {
  CategoryFilters,
  categoryHasDetails,
  categoryHasExtras,
  type CategoryFilterValue,
} from "@/components/browse/category-filters";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { buildTitleSearchTerms } from "@/lib/vehicle-aliases";
import { fuzzyFilter } from "@/lib/fuzzy";
import { useBlockedUserIds } from "@/hooks/use-blocked-users";

const optStr = () => z.string().optional();
const optBool = () =>
  z
    .union([z.literal("1"), z.literal("true"), z.boolean()])
    .optional()
    .transform((v) => (v === true || v === "1" || v === "true" ? true : undefined));
const optNum = () => z.coerce.number().optional();

const searchSchema = z.object({
  q: optStr(),
  region: optStr(),
  province: optStr(),
  city: optStr(),
  min: optNum(),
  max: optNum(),
  sort: z.enum(["recent", "price_asc", "price_desc"]).optional(),
  year: optNum(),
  make: optStr(),
  model: optStr(),
  engine: optStr(),
  // Car
  transmission: optStr(),
  fuel: optStr(),
  body_type: optStr(),
  drivetrain: z.enum(["fwd", "rwd", "awd", "4x4", "4x2"]).optional(),
  mileage_min: optNum(),
  mileage_max: optNum(),
  owner_status: optStr(),
  or_cr_status: optStr(),
  flood_history: optStr(),
  accident_history: optStr(),
  registered_owner: optStr(),
  deed_chain_available: optBool(),
  financing_available: optBool(),
  trade_accepted: optBool(),
  verified_documents_only: optBool(),
  // Motorcycle
  moto_type: optStr(),
  engine_cc_min: optNum(),
  engine_cc_max: optNum(),
  plate_status: optStr(),
  moto_condition: optStr(),
  delivery_available: optBool(),
  // Equipment
  equipment_type: optStr(),
  brand: optStr(),
  hours_min: optNum(),
  hours_max: optNum(),
  weight_min: optNum(),
  weight_max: optNum(),
  attachment_type: optStr(),
  rental_or_sale: optStr(),
  with_operator: optBool(),
  inspection_available: optBool(),
  // Boat
  boat_type: optStr(),
  hull_material: optStr(),
  boat_engine_type: optStr(),
  length_min: optNum(),
  length_max: optNum(),
  boat_registration_status: optStr(),
  boat_usage: optStr(),
  trailer_included: optBool(),
  // Airplane
  registration_no: optStr(),
  airworthiness: optStr(),
  maintenance_logs: optStr(),
  engine_hours_min: optNum(),
  engine_hours_max: optNum(),
  airport_code: optStr(),
  aircraft_seller: optStr(),
  inspection_required: optBool(),
});

const CATEGORY_LABEL: Record<string, string> = {
  car: "Cars",
  motorcycle: "Motorcycles",
  boat: "Boats",
  airplane: "Airplanes",
  equipment: "Heavy Equipment",
  towing: "Towing & Transport Services",
  carwash: "Car Wash",
  parts: "Parts & Accessories",
  drone: "Drones & Aerial",
  repair: "Repair Shops",
  bodyshop: "Body Shops",
  salvage: "Auto Salvage",
  other: "Other Transport",
};

function filtersFromSearch(
  category: string,
  search: z.infer<typeof searchSchema>,
): BrowseFiltersInput {
  return { category, ...search } as BrowseFiltersInput;
}

export const Route = createFileRoute("/browse/$category")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }): Promise<{ items: ListingCardData[]; userIds: string[] }> => {
    if (params.category === "towing") return { items: [], userIds: [] };
    return await getBrowseListings({ data: filtersFromSearch(params.category, deps) });
  },
  staleTime: 30_000,
  head: ({ params }) => {
    const label = CATEGORY_LABEL[params.category] ?? "Listings";
    const url = `https://www.365motorsales.com/browse/${params.category}`;
    const isTowing = params.category === "towing";
    const title = isTowing
      ? "Towing & Transport Services in the Philippines — 365 MotorSales"
      : `${label} for sale — 365 MotorSales Philippines`;
    const desc = isTowing
      ? "Find verified towing and vehicle transport providers across the Philippines. Flatbed, long-distance, heavy hauling, recovery, and 24/7 emergency tow requests."
      : `Browse ${label.toLowerCase()} for sale across the Philippines. Trusted private and business sellers on 365 MotorSales.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:image", content: `https://www.365motorsales.com${ogBrowse}` },
        { property: "twitter:image", content: `https://www.365motorsales.com${ogBrowse}` },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: BrowsePage,
});

function BrowsePage() {
  const { category } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user } = useAuth();

  if (category === "towing") {
    return (
      <Navigate
        to="/tow"
        replace
        search={{
          listing: (search as any).listing,
          provider: (search as any).provider,
        }}
      />
    );
  }



  const [keyword, setKeyword] = useState(search.q ?? "");
  const [region, setRegion] = useState<string | null>(search.region ?? null);
  const [province, setProvince] = useState<string | null>(search.province ?? null);
  const [city, setCity] = useState<string | null>(search.city ?? null);
  const [minPrice, setMinPrice] = useState(search.min?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(search.max?.toString() ?? "");
  const [sort, setSort] = useState(search.sort ?? "recent");
  const [vYear, setVYear] = useState(search.year ? String(search.year) : "");
  const [vMake, setVMake] = useState(search.make ?? "");
  const [vModel, setVModel] = useState(search.model ?? "");
  const [vEngine, setVEngine] = useState(search.engine ?? "");
  const [catFilters, setCatFilters] = useState<CategoryFilterValue>(() => {
    const init: CategoryFilterValue = {};
    const keys = [
      "transmission","fuel","body_type","drivetrain","mileage_min","mileage_max","owner_status",
      "or_cr_status","flood_history","accident_history","registered_owner","deed_chain_available",
      "financing_available","trade_accepted","verified_documents_only",
      "moto_type","engine_cc_min","engine_cc_max","plate_status","moto_condition","delivery_available",
      "equipment_type","brand","hours_min","hours_max","weight_min","weight_max",
      "attachment_type","rental_or_sale","with_operator","inspection_available",
      "boat_type","hull_material","boat_engine_type","length_min","length_max",
      "boat_registration_status","boat_usage","trailer_included","registration_no",
      "airworthiness","maintenance_logs","engine_hours_min","engine_hours_max",
      "airport_code","aircraft_seller","inspection_required",
    ] as const;
    for (const k of keys) {
      const v = (search as any)[k];
      if (v === undefined || v === null || v === "") continue;
      init[k] = typeof v === "number" ? String(v) : v;
    }
    return init;
  });
  const loaderData = Route.useLoaderData() as { items: ListingCardData[]; userIds: string[] };
  const { items: loaderItems, userIds } = loaderData;
  const { ids: blockedIds } = useBlockedUserIds();

  // Overlay dealer/business badge once it loads — doesn't block first paint.
  const dealersQuery = useQuery({
    queryKey: ["browse-dealers", userIds],
    enabled: userIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const res = await getActiveDealerStatus({ data: { userIds } });
        return res.dealers;
      } catch {
        return {} as Record<string, { planName: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; status: string }>;
      }
    },
  });
  const dealers = dealersQuery.data ?? {};

  // Per-year listing counts for the year dropdown — refetches when region changes.
  const showVehiclePicker = category === "car" || category === "motorcycle";
  const yearCountsQuery = useQuery({
    queryKey: ["browse-year-counts", category, region],
    enabled: showVehiclePicker,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        return await getYearCountsForCategory({ data: { category, region } });
      } catch {
        return {} as Record<string, number>;
      }
    },
  });
  const yearCounts = yearCountsQuery.data ?? {};

  const items = useMemo(
    () =>
      loaderItems
        .filter((l) => !l.seller_user_id || !blockedIds.has(l.seller_user_id))
        .map((l) => {
          const uid = l.seller_user_id;
          if (!uid || !dealers[uid]) return l;
          return {
            ...l,
            seller_dealer_plan: dealers[uid].planName,
            seller_dealer_period_end: dealers[uid].currentPeriodEnd,
            seller_dealer_cancel_at_period_end: dealers[uid].cancelAtPeriodEnd,
          } as ListingCardData;
        }),
    [loaderItems, blockedIds, dealers],
  );
  const loading = false;


  const [filtersOpen, setFiltersOpen] = useState(false);
  const [density, setDensity] = useGridDensity(3);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const gridClass = densityGridClass(density);
  const promotedGridClass = densityGridClass(density === 4 ? 4 : 3);

  const applyFilters = (e?: React.FormEvent) => {
    e?.preventDefault();
    navigate({
      to: "/browse/$category",
      params: { category },
      search: {
        q: keyword || undefined,
        region: region ?? undefined,
        province: province ?? undefined,
        city: city ?? undefined,
        min: minPrice ? Number(minPrice) : undefined,
        max: maxPrice ? Number(maxPrice) : undefined,
        sort,
        year: vYear ? Number(vYear) : undefined,
        make: vMake || undefined,
        model: vModel || undefined,
        engine: vEngine || undefined,
        ...(Object.fromEntries(
          Object.entries(catFilters).filter(([, v]) => v !== undefined && v !== "" && v !== false),
        ) as any),
      },
    });
    setFiltersOpen(false);
  };

  // Active filter chips (excluding sort/keyword which have own visible inputs on desktop).
  type Chip = { key: string; label: string; clear: () => void };
  const chips: Chip[] = [];
  if (keyword) chips.push({ key: "q", label: `“${keyword}”`, clear: () => setKeyword("") });
  if (vYear || vMake || vModel || vEngine) {
    const label = [vYear, vMake, vModel, vEngine].filter(Boolean).join(" ");
    chips.push({
      key: "vehicle",
      label,
      clear: () => {
        setVYear("");
        setVMake("");
        setVModel("");
        setVEngine("");
      },
    });
  }
  if (region || province || city) {
    chips.push({
      key: "loc",
      label: [city, province, region].filter(Boolean).join(", "),
      clear: () => {
        setRegion(null);
        setProvince(null);
        setCity(null);
      },
    });
  }
  if (minPrice || maxPrice) {
    chips.push({
      key: "price",
      label: `₱${minPrice || "0"}–${maxPrice || "∞"}`,
      clear: () => {
        setMinPrice("");
        setMaxPrice("");
      },
    });
  }
  for (const [k, v] of Object.entries(catFilters)) {
    if (v === undefined || v === "" || v === false) continue;
    chips.push({
      key: k,
      label: `${k.replace(/_/g, " ")}: ${v === true ? "yes" : v}`,
      clear: () => {
        const next = { ...catFilters };
        delete next[k];
        setCatFilters(next);
      },
    });
  }
  const activeCount = chips.length;

  const clearAll = () => {
    setKeyword("");
    setRegion(null);
    setProvince(null);
    setCity(null);
    setMinPrice("");
    setMaxPrice("");
    setVYear("");
    setVMake("");
    setVModel("");
    setVEngine("");
    setCatFilters({});
  };

  const resetAll = () => {
    clearAll();
    setTimeout(() => applyFilters(), 0);
  };


  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);

  const openSaveDialog = () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setSaveName(`${CATEGORY_LABEL[category] ?? category}${keyword ? ` — ${keyword}` : ""}`);
    setSaveDialogOpen(true);
  };

  const confirmSaveSearch = async () => {
    const name = saveName.trim();
    if (!name || !user) return;
    setSavingSearch(true);
    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      name,
      category_slug: category,
      query: {
        q: keyword || null,
        region: region ?? null,
        province: province ?? null,
        city: city ?? null,
        min: minPrice ? Number(minPrice) : null,
        max: maxPrice ? Number(maxPrice) : null,
        sort,
        year: vYear ? Number(vYear) : null,
        make: vMake || null,
        model: vModel || null,
        engine: vEngine || null,
        ...catFilters,
      },
    });
    setSavingSearch(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSaveDialogOpen(false);
    toast.success("Search saved. Find it in your dashboard.");
  };

  return (
    <SiteLayout>
      <div className="border-b border-border bg-secondary/40">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>{" "}
            <span>/</span>
            <span>Browse</span> <span>/</span>
            <span className="text-foreground">{CATEGORY_LABEL[category] ?? category}</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">
            {CATEGORY_LABEL[category] ?? "Listings"} for sale
          </h1>
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-4 py-6 md:grid-cols-[260px_1fr] md:py-8">
        {/* Filters — desktop sidebar */}
        <aside className="hidden md:block">
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] md:sticky md:top-20">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Filters</h2>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              )}
            </div>
            <FiltersForm
              category={category}
              keyword={keyword}
              setKeyword={setKeyword}
              vYear={vYear}
              vMake={vMake}
              vModel={vModel}
              vEngine={vEngine}
              setVYear={setVYear}
              setVMake={setVMake}
              setVModel={setVModel}
              setVEngine={setVEngine}
              region={region}
              province={province}
              city={city}
              setRegion={setRegion}
              setProvince={setProvince}
              setCity={setCity}
              minPrice={minPrice}
              maxPrice={maxPrice}
              setMinPrice={setMinPrice}
              setMaxPrice={setMaxPrice}
              sort={sort}
              setSort={setSort as any}
              catFilters={catFilters}
              setCatFilters={setCatFilters}
              onSubmit={applyFilters}
              onSave={openSaveDialog}
              onReset={resetAll}
              yearCounts={yearCounts}
            />
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0">
          {/* Mobile filter trigger + active chips */}
          <div className="mb-4 flex flex-wrap items-center gap-2 md:mb-3">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 md:hidden">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {activeCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[92vh] overflow-y-auto p-4 sm:max-w-lg sm:mx-auto">
                <SheetHeader className="text-left">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-3">
                  <FiltersForm
                    category={category}
                    keyword={keyword}
                    setKeyword={setKeyword}
                    vYear={vYear}
                    vMake={vMake}
                    vModel={vModel}
                    vEngine={vEngine}
                    setVYear={setVYear}
                    setVMake={setVMake}
                    setVModel={setVModel}
                    setVEngine={setVEngine}
                    region={region}
                    province={province}
                    city={city}
                    setRegion={setRegion}
                    setProvince={setProvince}
                    setCity={setCity}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    setMinPrice={setMinPrice}
                    setMaxPrice={setMaxPrice}
                    sort={sort}
                    setSort={setSort as any}
                    catFilters={catFilters}
                    setCatFilters={setCatFilters}
                    onSubmit={applyFilters}
                    onSave={openSaveDialog}
                    onReset={resetAll}
                    yearCounts={yearCounts}
                  />
                </div>
              </SheetContent>
            </Sheet>
            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {chips.map((c) => (
                  <Badge
                    key={c.key}
                    variant="secondary"
                    className="gap-1 pl-2 pr-1 py-0.5 text-xs font-normal"
                  >
                    <span className="max-w-[180px] truncate">{c.label}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${c.key}`}
                      onClick={() => {
                        c.clear();
                        setTimeout(() => applyFilters(), 0);
                      }}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {chips.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearAll();
                      setTimeout(() => applyFilters(), 0);
                    }}
                    className="ml-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>


          <SponsoredCategorySlot categorySlug={category} className="mb-6" />
          <AdCarousel placement="browse_top" className="mb-6" />
          {(() => {
            const now = Date.now();
            const promoted = items.filter(
              (l) => l.boost_until && new Date(l.boost_until).getTime() > now,
            );
            const organic = items.filter(
              (l) => !l.boost_until || new Date(l.boost_until).getTime() <= now,
            );
            return (
              <>
                {promoted.length > 0 && viewMode === "grid" && (
                  <section className="mb-6">
                    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <Rocket className="h-3.5 w-3.5 text-primary" />
                      <span>Promoted listings</span>
                      <span className="ml-auto text-[10px] normal-case tracking-normal">
                        Sponsored
                      </span>
                    </div>
                    <div className={promotedGridClass}>
                      {promoted.slice(0, density === 4 ? 4 : 3).map((l) => (
                        <ListingCard key={l.id} listing={l} />
                      ))}
                    </div>
                  </section>
                )}

                <MarketplaceToolbar
                  resultCount={organic.length + promoted.length}
                  loading={loading}
                  view={viewMode}
                  onViewChange={setViewMode}
                  density={density}
                  onDensityChange={setDensity}
                />

                {loading ? (
                  <div className={gridClass}>
                    <ListingCardSkeletonGrid count={density === 4 ? 8 : 6} />
                  </div>
                ) : viewMode === "map" ? (
                  <ListingsMapView listings={[...promoted, ...organic]} />
                ) : organic.length === 0 && promoted.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                    No listings match your filters yet.
                  </div>
                ) : (
                  <div className={gridClass}>
                    {organic.map((l) => (
                      <ListingCard key={l.id} listing={l} />
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this search</DialogTitle>
            <DialogDescription>
              Give it a name so you can find it later in your dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="saved-search-name">Name</Label>
            <Input
              id="saved-search-name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g. Toyota Hilux under 1M"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmSaveSearch();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={savingSearch}
            >
              Cancel
            </Button>
            <Button onClick={confirmSaveSearch} disabled={savingSearch || !saveName.trim()}>
              {savingSearch ? "Saving…" : "Save search"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}

interface FiltersFormProps {
  category: string;
  keyword: string;
  setKeyword: (v: string) => void;
  vYear: string;
  vMake: string;
  vModel: string;
  vEngine: string;
  setVYear: (v: string) => void;
  setVMake: (v: string) => void;
  setVModel: (v: string) => void;
  setVEngine: (v: string) => void;
  region: string | null;
  province: string | null;
  city: string | null;
  setRegion: (v: string | null) => void;
  setProvince: (v: string | null) => void;
  setCity: (v: string | null) => void;
  minPrice: string;
  maxPrice: string;
  setMinPrice: (v: string) => void;
  setMaxPrice: (v: string) => void;
  sort: "recent" | "price_asc" | "price_desc";
  setSort: (v: "recent" | "price_asc" | "price_desc") => void;
  catFilters: CategoryFilterValue;
  setCatFilters: (v: CategoryFilterValue) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onSave: () => void;
  onReset?: () => void;
  yearCounts?: Record<string, number>;
}

function FiltersForm(p: FiltersFormProps) {
  const showVehicle = p.category === "car" || p.category === "motorcycle";
  const hasDetails = categoryHasDetails(p.category);
  const hasExtras = categoryHasExtras(p.category);

  return (
    <form onSubmit={p.onSubmit} className="space-y-3">
      {/* Always-visible quick filters */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="kw" className="text-xs">
            Keyword
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="kw"
              value={p.keyword}
              onChange={(e) => p.setKeyword(e.target.value)}
              placeholder="Make, model…"
              className="h-9 pl-8 pr-8"
            />
            {p.keyword && (
              <button
                type="button"
                onClick={() => {
                  p.setKeyword("");
                  setTimeout(() => p.onSubmit(), 0);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full hover:bg-muted-foreground/20 p-0.5"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Min ₱</Label>
            <Input
              type="number"
              min="0"
              value={p.minPrice}
              onChange={(e) => p.setMinPrice(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Max ₱</Label>
            <Input
              type="number"
              min="0"
              value={p.maxPrice}
              onChange={(e) => p.setMaxPrice(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Sort</Label>
          <Select value={p.sort} onValueChange={(v: any) => p.setSort(v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="price_asc">Price (low to high)</SelectItem>
              <SelectItem value="price_desc">Price (high to low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Collapsible deep filters */}
      <Accordion type="multiple" className="w-full">
        {showVehicle && (
          <AccordionItem value="vehicle">
            <AccordionTrigger className="py-2 text-sm">Vehicle</AccordionTrigger>
            <AccordionContent className="pt-1">
              <VehiclePicker
                category={p.category as "car" | "motorcycle"}
                stacked
                yearCounts={p.yearCounts}
                year={p.vYear}
                make={p.vMake}
                model={p.vModel}
                engine={p.vEngine}
                onChange={(v) => {
                  p.setVYear(v.year);
                  p.setVMake(v.make);
                  p.setVModel(v.model);
                  p.setVEngine(v.engine ?? "");
                }}
              />
            </AccordionContent>
          </AccordionItem>
        )}
        <AccordionItem value="location">
          <AccordionTrigger className="py-2 text-sm">Location</AccordionTrigger>
          <AccordionContent className="pt-1">
            <LocationPicker
              asFilter
              stacked
              showBarangay={false}
              value={{ region: p.region, province: p.province, city: p.city }}
              onChange={(v) => {
                p.setRegion(v.region ?? null);
                p.setProvince(v.province ?? null);
                p.setCity(v.city ?? null);
              }}
            />
          </AccordionContent>
        </AccordionItem>
        {hasDetails && (
          <AccordionItem value="details">
            <AccordionTrigger className="py-2 text-sm">
              {p.category === "car"
                ? "Car details"
                : p.category === "motorcycle"
                  ? "Motorcycle details"
                  : p.category === "equipment"
                    ? "Equipment details"
                    : p.category === "boat"
                      ? "Boat details"
                      : "Aircraft details"}
            </AccordionTrigger>
            <AccordionContent className="pt-1">
              <CategoryFilters
                category={p.category}
                value={p.catFilters}
                onChange={p.setCatFilters}
                section="details"
              />
            </AccordionContent>
          </AccordionItem>
        )}
        {hasExtras && (
          <AccordionItem value="extras">
            <AccordionTrigger className="py-2 text-sm">Documents & extras</AccordionTrigger>
            <AccordionContent className="pt-1">
              <CategoryFilters
                category={p.category}
                value={p.catFilters}
                onChange={p.setCatFilters}
                section="extras"
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <div className="space-y-2 pt-1">
        <Button type="submit" className="w-full">
          Apply filters
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={p.onSave}>
          <BookmarkPlus className="mr-2 h-4 w-4" />
          Save search
        </Button>
      </div>
    </form>
  );
}
