import { createFileRoute, Link } from "@tanstack/react-router";
import ogBrowse from "@/assets/og/browse.jpg";
import { useEffect, useState } from "react";
import { Search, BookmarkPlus, Rocket } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getActiveDealerStatus } from "@/lib/seller-status.functions";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { TowingServicesPage } from "@/components/towing/towing-services-page";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { AdCarousel } from "@/components/ads/ad-carousel";
import { SponsoredCategorySlot } from "@/components/ads/sponsored-category-slot";
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
import { CategoryFilters, type CategoryFilterValue } from "@/components/browse/category-filters";
import { buildTitleSearchTerms } from "@/lib/vehicle-aliases";
import { fuzzyFilter } from "@/lib/fuzzy";

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
  mileage_min: optNum(),
  mileage_max: optNum(),
  owner_status: optStr(),
  or_cr_status: optStr(),
  flood_history: optStr(),
  accident_history: optStr(),
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

export const Route = createFileRoute("/browse/$category")({
  validateSearch: searchSchema,
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
      <SiteLayout>
        <TowingServicesPage />
      </SiteLayout>
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
      "transmission","fuel","body_type","mileage_min","mileage_max","owner_status",
      "or_cr_status","flood_history","accident_history","financing_available",
      "trade_accepted","verified_documents_only","moto_type","engine_cc_min",
      "engine_cc_max","plate_status","moto_condition","delivery_available",
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
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      const baseSelect =
        "id,title,price_php,region,city,seller_type,boost_until,status,category_slug,view_count,attributes,user_id,listing_media(url,type),profiles:user_id(verification_status)";
      const buildBase = () => {
        let q = supabase
          .from("listings")
          .select(baseSelect)
          .in("status", ["active", "pending_sale"])
          .eq("category_slug", category);
        if (search.region && search.region !== "all") q = q.eq("region", search.region);
        if (search.province) q = q.eq("province", search.province);
        if (search.city) q = q.eq("city", search.city);
        if (search.min) q = q.gte("price_php", search.min);
        if (search.max) q = q.lte("price_php", search.max);
        // Vehicle attributes are stored as JSON. Match the seller-entered
        // string casing-insensitively when possible.
        if (search.year) q = q.eq("attributes->>year", String(search.year));
        if (search.make) q = q.ilike("attributes->>make", search.make);
        if (search.model) q = q.ilike("attributes->>model", search.model);
        if (search.engine) q = q.ilike("attributes->>engine", search.engine);
        // Category-specific filters — all live in listings.attributes.
        const eq = (k: string, v?: string) => {
          if (v) q = q.eq(`attributes->>${k}`, v);
        };
        const ilike = (k: string, v?: string) => {
          if (v) q = q.ilike(`attributes->>${k}`, `%${v}%`);
        };
        const gte = (k: string, v?: number) => {
          if (v != null && !Number.isNaN(v))
            q = q.gte(`attributes->>${k}::numeric` as any, v);
        };
        const lte = (k: string, v?: number) => {
          if (v != null && !Number.isNaN(v))
            q = q.lte(`attributes->>${k}::numeric` as any, v);
        };
        const isTrue = (k: string, v?: boolean) => {
          if (v) q = q.eq(`attributes->>${k}`, "true");
        };
        // Cars
        eq("transmission", search.transmission);
        eq("fuel", search.fuel);
        eq("body_type", search.body_type);
        gte("mileage_km", search.mileage_min);
        lte("mileage_km", search.mileage_max);
        eq("owner_status", search.owner_status);
        eq("or_cr_status", search.or_cr_status);
        eq("flood_history", search.flood_history);
        eq("accident_history", search.accident_history);
        isTrue("financing_available", search.financing_available);
        isTrue("trade_accepted", search.trade_accepted);
        if (search.verified_documents_only) {
          q = q.eq("attributes->>or_cr_status", "complete");
        }
        // Motorcycles
        eq("moto_type", search.moto_type);
        gte("engine_cc", search.engine_cc_min);
        lte("engine_cc", search.engine_cc_max);
        eq("plate_status", search.plate_status);
        eq("moto_condition", search.moto_condition);
        isTrue("delivery_available", search.delivery_available);
        // Equipment
        eq("equipment_type", search.equipment_type);
        ilike("brand", search.brand);
        gte("hours", search.hours_min);
        lte("hours", search.hours_max);
        gte("operating_weight_tons", search.weight_min);
        lte("operating_weight_tons", search.weight_max);
        ilike("attachment_type", search.attachment_type);
        eq("rental_or_sale", search.rental_or_sale);
        isTrue("with_operator", search.with_operator);
        isTrue("inspection_available", search.inspection_available);
        // Boats
        eq("boat_type", search.boat_type);
        eq("hull_material", search.hull_material);
        eq("boat_engine_type", search.boat_engine_type);
        gte("length_ft", search.length_min);
        lte("length_ft", search.length_max);
        eq("boat_registration_status", search.boat_registration_status);
        eq("boat_usage", search.boat_usage);
        isTrue("trailer_included", search.trailer_included);
        // Airplanes
        ilike("registration_no", search.registration_no);
        eq("airworthiness", search.airworthiness);
        eq("maintenance_logs", search.maintenance_logs);
        gte("engine_hours", search.engine_hours_min);
        lte("engine_hours", search.engine_hours_max);
        ilike("airport_code", search.airport_code);
        eq("aircraft_seller", search.aircraft_seller);
        isTrue("inspection_required", search.inspection_required);

        if (search.sort === "price_asc") q = q.order("price_php", { ascending: true });
        else if (search.sort === "price_desc") q = q.order("price_php", { ascending: false });
        else
          q = q
            .order("boost_until", { ascending: false, nullsFirst: false })
            .order("published_at", { ascending: false, nullsFirst: false });
        return q;
      };

      // Build alias/fuzzy alternates for the keyword (handles "VW", "Toyta", etc.)
      const terms = search.q ? buildTitleSearchTerms(search.q, 6) : [];
      const escape = (s: string) => s.replace(/[%,()]/g, " ").trim();

      let q = buildBase();
      if (search.q && terms.length > 0) {
        const orExpr = terms.map((t) => `title.ilike.%${escape(t)}%`).join(",");
        q = q.or(orExpr);
      }

      let { data } = await q.limit(60);

      // Fallback: if very few hits and a keyword was provided, fetch a wider
      // pool and apply fuzzy matching client-side to catch typos/variants.
      if (search.q && (!data || data.length < 6)) {
        const fb = await buildBase().limit(200);
        if (fb.data) {
          const fuzz = fuzzyFilter(fb.data as any[], search.q, (r) => r.title ?? "");
          const seen = new Set((data ?? []).map((r: any) => r.id));
          for (const r of fuzz) {
            if (!seen.has((r as any).id)) {
              (data ??= []).push(r as any);
              if (data.length >= 60) break;
            }
          }
        }
      }

      const userIds = Array.from(
        new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean)),
      );
      let dealers: Record<string, { planName: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; status: string }> = {};
      if (userIds.length > 0) {
        try {
          const res = await getActiveDealerStatus({ data: { userIds } });
          dealers = res.dealers;
        } catch {
          /* ignore */
        }
      }
      const mapped = (data ?? []).map((r: any) => {
        const photos = (r.listing_media ?? []).filter((m: any) => m.type === "photo");
        const videos = (r.listing_media ?? []).filter((m: any) => m.type === "video");
        return {
          id: r.id,
          title: r.title,
          price_php: Number(r.price_php),
          region: r.region,
          city: r.city,
          seller_type: r.seller_type,
          boost_until: r.boost_until,
          category_slug: r.category_slug,
          view_count: r.view_count ?? 0,
          cover_url: photos[0]?.url ?? null,
          photo_count: photos.length,
          has_video: videos.length > 0,
          seller_verified: r.profiles?.verification_status === "verified",
          seller_dealer_plan: dealers[r.user_id]?.planName ?? null,
          seller_dealer_period_end: dealers[r.user_id]?.currentPeriodEnd ?? null,
          seller_dealer_cancel_at_period_end: dealers[r.user_id]?.cancelAtPeriodEnd ?? false,
          status: r.status,
          attributes: r.attributes,
        } as ListingCardData;
      });
      setItems(mapped);
      setLoading(false);
    };
    fetchListings();
  }, [
    category,
    search.q,
    search.region,
    search.province,
    search.city,
    search.min,
    search.max,
    search.sort,
    search.year,
    search.make,
    search.model,
    search.engine,
    // Include the entire category-filter blob as a single JSON dep so any
    // change re-runs the query.
    JSON.stringify({
      transmission: search.transmission, fuel: search.fuel, body_type: search.body_type,
      mileage_min: search.mileage_min, mileage_max: search.mileage_max,
      owner_status: search.owner_status, or_cr_status: search.or_cr_status,
      flood_history: search.flood_history, accident_history: search.accident_history,
      financing_available: search.financing_available, trade_accepted: search.trade_accepted,
      verified_documents_only: search.verified_documents_only,
      moto_type: search.moto_type, engine_cc_min: search.engine_cc_min,
      engine_cc_max: search.engine_cc_max, plate_status: search.plate_status,
      moto_condition: search.moto_condition, delivery_available: search.delivery_available,
      equipment_type: search.equipment_type, brand: search.brand,
      hours_min: search.hours_min, hours_max: search.hours_max,
      weight_min: search.weight_min, weight_max: search.weight_max,
      attachment_type: search.attachment_type, rental_or_sale: search.rental_or_sale,
      with_operator: search.with_operator, inspection_available: search.inspection_available,
      boat_type: search.boat_type, hull_material: search.hull_material,
      boat_engine_type: search.boat_engine_type, length_min: search.length_min,
      length_max: search.length_max, boat_registration_status: search.boat_registration_status,
      boat_usage: search.boat_usage, trailer_included: search.trailer_included,
      registration_no: search.registration_no, airworthiness: search.airworthiness,
      maintenance_logs: search.maintenance_logs, engine_hours_min: search.engine_hours_min,
      engine_hours_max: search.engine_hours_max, airport_code: search.airport_code,
      aircraft_seller: search.aircraft_seller, inspection_required: search.inspection_required,
    }),
  ]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
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

      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <aside className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-20 lg:self-start">
          <h2 className="font-display text-lg font-semibold">Filters</h2>
          <form onSubmit={applyFilters} className="space-y-4">
            <div>
              <Label htmlFor="kw">Keyword</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="kw"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Make, model…"
                  className="pl-8"
                />
              </div>
            </div>
            {(category === "car" || category === "motorcycle") && (
              <div className="rounded-md border border-border/60 bg-background/60 p-3">
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Vehicle
                </Label>
                <VehiclePicker
                  category={category as "car" | "motorcycle"}
                  year={vYear}
                  make={vMake}
                  model={vModel}
                  engine={vEngine}
                  onChange={(v) => {
                    setVYear(v.year);
                    setVMake(v.make);
                    setVModel(v.model);
                    setVEngine(v.engine ?? "");
                  }}
                />
              </div>
            )}
            <LocationPicker
              asFilter
              stacked
              showBarangay={false}
              value={{ region, province, city }}
              onChange={(v) => {
                setRegion(v.region ?? null);
                setProvince(v.province ?? null);
                setCity(v.city ?? null);
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Min ₱</Label>
                <Input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>
              <div>
                <Label>Max ₱</Label>
                <Input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Sort</Label>
              <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="price_asc">Price (low to high)</SelectItem>
                  <SelectItem value="price_desc">Price (high to low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              Apply filters
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={openSaveDialog}>
              <BookmarkPlus className="mr-2 h-4 w-4" />
              Save search
            </Button>
          </form>
        </aside>

        {/* Results */}
        <div>
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
                {promoted.length > 0 && (
                  <section className="mb-6">
                    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <Rocket className="h-3.5 w-3.5 text-primary" />
                      <span>Promoted listings</span>
                      <span className="ml-auto text-[10px] normal-case tracking-normal">
                        Sponsored
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {promoted.slice(0, 3).map((l) => (
                        <ListingCard key={l.id} listing={l} />
                      ))}
                    </div>
                  </section>
                )}
                <div className="mb-4 text-sm text-muted-foreground">
                  {loading
                    ? "Loading…"
                    : `${organic.length} result${organic.length === 1 ? "" : "s"}`}
                </div>
                {!loading && organic.length === 0 && promoted.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                    No listings match your filters yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
