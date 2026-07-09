import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  Grid3x3,
  Recycle,
  Tag,
  ShoppingCart,
  Globe2,
  Handshake,
  ChevronDown,
  ChevronUp,
  Wrench,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { PartsWizard } from "@/components/parts/parts-wizard";
import { OemSearch } from "@/components/parts/oem-search";
import { PartnerProductsGrid } from "@/components/parts/partner-products-grid";
import { FitmentBar, loadStoredYmm } from "@/components/parts/fitment-bar";
import { PhTrustStrip } from "@/components/parts/ph-trust-strip";
import { CategoryMegaGrid } from "@/components/parts/category-mega-grid";
import { BrandRail } from "@/components/parts/brand-rail";
import { ListingCard, type ListingCardData } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { browseUsedParts } from "@/lib/parts-search.functions";
import { listPartsCountries } from "@/lib/parts-catalog.functions";
import { logPartsFilterEvent } from "@/lib/parts-analytics.functions";
import { PARTS_CATEGORIES } from "@/data/parts-categories";
import { MarketplaceToolbar, type ViewMode } from "@/components/marketplace/marketplace-toolbar";
import { ListingCardSkeletonGrid } from "@/components/marketplace/listing-card-skeleton";
import { ListingsMapView } from "@/components/marketplace/listings-map-view";
import { useGridDensity, densityGridClass } from "@/hooks/use-grid-density";

const TITLE = "Auto Parts Marketplace — 365 MotorSales Philippines";
const DESCRIPTION =
  "Shop OEM, aftermarket and used auto parts in the Philippines. Find exact-fit parts by vehicle, VIN or part number — from Shopee, Lazada, AliExpress and Banawe partners.";
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Auto parts categories",
          itemListElement: PARTS_CATEGORIES.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.title,
            url: `https://www.365motorsales.com/parts/c/${c.slug}`,
          })),
        }),
      },
    ],
  }),
  component: PartsHub,
});

function PartsHub() {
  const browse = useServerFn(browseUsedParts);
  const fetchCountries = useServerFn(listPartsCountries);
  const [browseRows, setBrowseRows] = useState<ListingCardData[] | null>(null);
  const [density, setDensity] = useGridDensity(3);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [countries, setCountries] = useState<
    Array<{ code: string; name: string; is_active: boolean }>
  >([]);
  const [vehicleCtx, setVehicleCtx] = useState<{ make: string; model: string; year: string }>({
    make: "",
    model: "",
    year: "",
  });
  const [showWizard, setShowWizard] = useState(false);
  const [showUsed, setShowUsed] = useState(false);
  const [showOem, setShowOem] = useState(false);

  const partnerQuery =
    [vehicleCtx.make, vehicleCtx.model, "parts"].filter(Boolean).join(" ").trim() || "auto parts";

  useEffect(() => {
    fetchCountries()
      .then(setCountries as any)
      .catch(() => {});
  }, [fetchCountries]);

  // Hydrate initial vehicle context from stored fitment (matches FitmentBar).
  useEffect(() => {
    const s = loadStoredYmm();
    if (s.make || s.model || s.year) setVehicleCtx(s);
  }, []);

  // Debounced filter-event logging.
  const logFilter = useServerFn(logPartsFilterEvent);
  useEffect(() => {
    if (!vehicleCtx.make && !vehicleCtx.model && !vehicleCtx.year) return;
    const t = setTimeout(() => {
      let sid: string | undefined;
      try {
        sid = sessionStorage.getItem("365_sid") ?? undefined;
        if (!sid) {
          sid = (crypto.randomUUID?.() ?? String(Date.now())).slice(0, 32);
          sessionStorage.setItem("365_sid", sid);
        }
      } catch {
        /* ignore */
      }
      logFilter({
        data: {
          make: vehicleCtx.make || undefined,
          model: vehicleCtx.model || undefined,
          year: vehicleCtx.year || undefined,
          session_id: sid,
        } as any,
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [vehicleCtx.make, vehicleCtx.model, vehicleCtx.year, logFilter]);

  useEffect(() => {
    if (!showUsed || browseRows !== null) return;
    browse({ data: { limit: 30 } })
      .then((r) => setBrowseRows(r.listings as ListingCardData[]))
      .catch(() => setBrowseRows([]));
  }, [showUsed, browseRows, browse]);

  const gridClass = densityGridClass(density);

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 md:py-8">
        {/* 1. Fitment hero */}
        <FitmentBar onContextChange={setVehicleCtx} />

        {/* 2. PH trust strip */}
        <PhTrustStrip />

        {/* 3. Category mega-grid */}
        <CategoryMegaGrid />

        {/* 4. Brand rail (auto-hides if partner feed has no brands yet) */}
        <BrandRail country="PH" />

        {/* 5. Product grid — vehicle-scoped when fitment set, otherwise trending */}
        <PartnerProductsGrid
          query={partnerQuery}
          make={vehicleCtx.make || null}
          model={vehicleCtx.model || null}
          year={vehicleCtx.year || null}
          onClearFilters={() => setVehicleCtx({ make: "", model: "", year: "" })}
          title={
            vehicleCtx.make
              ? `Parts for ${[vehicleCtx.year, vehicleCtx.make, vehicleCtx.model].filter(Boolean).join(" ")}`
              : "Trending parts from our partners"
          }
        />

        {/* 6. Secondary utilities: guided finder, used/salvage, OEM order — collapsed by default */}
        <div className="space-y-3">
          <SecondarySection
            open={showWizard}
            onToggle={() => setShowWizard((v) => !v)}
            icon={<Search className="h-4 w-4" />}
            title="Guided finder"
            subtitle="Not sure of the part name? Answer a few questions and we'll match listings."
          >
            <PartsWizard onContextChange={setVehicleCtx} />
          </SecondarySection>

          <SecondarySection
            open={showUsed}
            onToggle={() => setShowUsed((v) => !v)}
            icon={<Recycle className="h-4 w-4" />}
            title="Used & salvage parts (Banawe network)"
            subtitle="Engines, transmissions, panels and interior parts from salvage yards and parters-out."
          >
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
                  <p className="text-sm font-medium">No used parts listed yet.</p>
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
          </SecondarySection>

          <SecondarySection
            open={showOem}
            onToggle={() => setShowOem((v) => !v)}
            icon={<ShoppingCart className="h-4 w-4" />}
            title="Order OEM (dealer network)"
            badge="Soon"
            subtitle="Order genuine parts from accredited OEM dealers in the Philippines."
          >
            <OemSearch />
          </SecondarySection>
        </div>

        {/* 7. Quick actions row */}
        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/sell" search={{ category: "parts" } as any}>
              <Tag className="mr-1 h-4 w-4" /> Sell a part
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/parts/network">
              <Recycle className="mr-1 h-4 w-4" /> Live network stock
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/businesses">
              <Recycle className="mr-1 h-4 w-4" /> Salvage yards directory
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/wanted">
              <Grid3x3 className="mr-1 h-4 w-4" /> Post a wanted ad
            </Link>
          </Button>
          <Button asChild variant="default" size="sm" className="ml-auto">
            <Link to="/partners/parts">
              <Handshake className="mr-1 h-4 w-4" /> Sell on 365 (partners)
            </Link>
          </Button>
        </div>

        {/* 8. Market availability strip */}
        {countries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/60 px-4 py-2 text-xs">
            <Globe2 className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">Available markets:</span>
            {countries
              .filter((c) => c.is_active)
              .map((c) => (
                <span
                  key={c.code}
                  className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300"
                >
                  {c.name}
                </span>
              ))}
            {countries.some((c) => !c.is_active) && (
              <>
                <span className="text-muted-foreground">· coming soon:</span>
                {countries
                  .filter((c) => !c.is_active)
                  .map((c) => (
                    <span
                      key={c.code}
                      className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
                    >
                      {c.name}
                    </span>
                  ))}
              </>
            )}
          </div>
        )}

        {/* 9. How-it-works footer note */}
        <p className="rounded-xl border border-border bg-card/60 p-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">How it works:</span> Set your vehicle
          once above and every list is filtered to exact-fit parts. Results rank by fitment
          quality (exact YMM first) with OEM cross-references and typical retail prices. Nothing
          matches? Post a wanted ad — salvage yards reach out. Part names follow the Car-Part.com
          industry standard.
        </p>
      </div>
    </SiteLayout>
  );
}

function SecondarySection({
  open,
  onToggle,
  icon,
  title,
  subtitle,
  badge,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-secondary/40"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            {badge && (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </section>
  );
}
