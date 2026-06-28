import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Grid3x3, Wrench, Recycle, Car, Tag, ShoppingCart, Globe2, Handshake } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { PartsWizard } from "@/components/parts/parts-wizard";
import { OemOrderForm } from "@/components/parts/oem-order-form";
import { OemSearch } from "@/components/parts/oem-search";
import { AffiliateShopRow } from "@/components/parts/affiliate-shop-row";
import { PartnerProductsGrid } from "@/components/parts/partner-products-grid";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { browseUsedParts } from "@/lib/parts-search.functions";
import { listPartsCountries } from "@/lib/parts-catalog.functions";
import { MarketplaceToolbar, type ViewMode } from "@/components/marketplace/marketplace-toolbar";
import { ListingCardSkeletonGrid } from "@/components/marketplace/listing-card-skeleton";
import { ListingsMapView } from "@/components/marketplace/listings-map-view";
import { useGridDensity, densityGridClass } from "@/hooks/use-grid-density";

const TITLE = "Used Auto Parts Marketplace — 365 MotorSales Philippines";
const DESCRIPTION =
  "Find used auto parts in the Philippines: engines, transmissions, body panels, lights, wheels, interior parts. Browse Banawe salvage yards and parters-out, or post a wanted ad.";
const URL = "https://www.365motorsales.com/parts";

export const Route = createFileRoute("/parts")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PartsHub,
});

type Tab = "find" | "browse" | "order";

function PartsHub() {
  const [tab, setTab] = useState<Tab>("find");
  const browse = useServerFn(browseUsedParts);
  const fetchCountries = useServerFn(listPartsCountries);
  const [browseRows, setBrowseRows] = useState<ListingCardData[] | null>(null);
  const [density, setDensity] = useGridDensity(3);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [countries, setCountries] = useState<Array<{ code: string; name: string; is_active: boolean }>>([]);
  const [vehicleCtx, setVehicleCtx] = useState<{ make: string; model: string; year: string }>({ make: "", model: "", year: "" });
  const partnerQuery = [vehicleCtx.make, vehicleCtx.model, "parts"].filter(Boolean).join(" ").trim() || "auto parts";

  useEffect(() => {
    fetchCountries().then(setCountries as any).catch(() => {});
  }, [fetchCountries]);

  useEffect(() => {
    if (tab !== "browse" || browseRows !== null) return;
    browse({ data: { limit: 30 } })
      .then((r) => setBrowseRows(r.listings as ListingCardData[]))
      .catch(() => setBrowseRows([]));
  }, [tab, browseRows, browse]);

  const gridClass = densityGridClass(density);

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">

        {/* Hero */}
        <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
          <div className="flex items-start gap-3">
            <Wrench className="h-7 w-7 shrink-0 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">Used Auto Parts</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Engines, transmissions, body panels, lights, wheels, interior — from Banawe
                salvage yards, parters-out, and private sellers across the Philippines.
                Quote-style messaging, no platform fees.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="default" size="sm">
              <Link to="/parts/search">
                <Search className="mr-1 h-4 w-4" /> Search parts by VIN
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/sell" search={{ category: "parts" } as any}>
                <Tag className="mr-1 h-4 w-4" /> Sell a part
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm">
              <Link to="/businesses">
                <Recycle className="mr-1 h-4 w-4" /> Salvage yards directory
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/wanted">
                <Car className="mr-1 h-4 w-4" /> Post a wanted ad
              </Link>
            </Button>
            <Button asChild variant="default" size="sm">
              <Link to="/partners/parts">
                <Handshake className="mr-1 h-4 w-4" /> Sell on 365 (partners)
              </Link>
            </Button>
          </div>
        </div>

        {/* Market availability strip */}
        {countries.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/60 px-4 py-2 text-xs">
            <Globe2 className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">Available markets:</span>
            {countries.filter((c) => c.is_active).map((c) => (
              <span key={c.code} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                {c.name}
              </span>
            ))}
            {countries.some((c) => !c.is_active) && (
              <>
                <span className="text-muted-foreground">· coming soon:</span>
                {countries.filter((c) => !c.is_active).map((c) => (
                  <span key={c.code} className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {c.name}
                  </span>
                ))}
              </>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => setTab("find")}
            className={`flex-1 min-w-[140px] rounded-md px-3 py-2 text-sm font-medium inline-flex items-center justify-center gap-1.5 ${
              tab === "find" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Search className="h-4 w-4" /> Find a part (wizard)
          </button>
          <button
            onClick={() => setTab("browse")}
            className={`flex-1 min-w-[140px] rounded-md px-3 py-2 text-sm font-medium inline-flex items-center justify-center gap-1.5 ${
              tab === "browse" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Grid3x3 className="h-4 w-4" /> Browse all
          </button>
          <button
            onClick={() => setTab("order")}
            className={`flex-1 min-w-[140px] rounded-md px-3 py-2 text-sm font-medium inline-flex items-center justify-center gap-1.5 ${
              tab === "order" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <ShoppingCart className="h-4 w-4" /> Order OEM
            <span className="ml-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Soon
            </span>
          </button>
        </div>


        {/* Affiliate shop row — hidden until at least one supplier is active in admin */}
        <div className="mb-4">
          <AffiliateShopRow
            query={partnerQuery}
            make={vehicleCtx.make || null}
            model={vehicleCtx.model || null}
            year={vehicleCtx.year ? Number(vehicleCtx.year) : null}
            title="Search these partners"
          />
        </div>

        {/* Real product tiles from ingested partner feeds (Shopee/Lazada/AliExpress PH) */}
        <div className="mb-4">
          <PartnerProductsGrid
            query={partnerQuery}
            make={vehicleCtx.make || null}
            model={vehicleCtx.model || null}
            year={vehicleCtx.year || null}
            onClearFilters={() => setVehicleCtx({ make: "", model: "", year: "" })}
            title={vehicleCtx.make ? `Parts for ${[vehicleCtx.year, vehicleCtx.make, vehicleCtx.model].filter(Boolean).join(" ")}` : "Trending parts from our partners"}
          />
        </div>


        {tab === "find" && <PartsWizard onContextChange={setVehicleCtx} />}
        {tab === "order" && <OemSearch />}




        {tab === "browse" && (
          <div className="space-y-2">
            <MarketplaceToolbar
              resultCount={browseRows?.length ?? 0}
              loading={browseRows === null}
              view={viewMode}
              onViewChange={setViewMode}
              density={density}
              onDensityChange={setDensity}
            />
            {browseRows === null ? (
              <div className={gridClass}>
                <ListingCardSkeletonGrid count={density === 4 ? 8 : 6} />
              </div>
            ) : browseRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
                <Wrench className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No parts listed yet.</p>
                <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                  Be the first — list parts you have, or post a wanted ad to attract sellers.
                </p>
              </div>
            ) : viewMode === "map" ? (
              <ListingsMapView listings={browseRows} />
            ) : (
              <div className={gridClass}>
                {browseRows.map((l) => (
                  <ListingCard key={l.id} listing={l} compact />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info strip */}
        <div className="mt-8 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">How it works:</span> Use the wizard
            to narrow by vehicle, system, and exact parts. Results are ranked by fitment
            quality (exact year+make+model first), and you can filter by OEM vs aftermarket
            or search by OEM part number. We also show OEM-equivalent catalog references with
            typical retail prices so you can compare. Found nothing? Post a wanted ad and
            salvage yards reach out.
          </p>
          <p className="mt-2 text-xs">
            Part names follow the Car-Part.com industry standard used by salvage yards worldwide.
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}
