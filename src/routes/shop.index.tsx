import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteLayout } from "@/components/site-layout";
import { AdCarousel } from "@/components/ads/ad-carousel";
import { listShopCategories, listShopProducts, listShopBrands } from "@/lib/shop.functions";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VehicleFitmentPicker } from "@/components/shop/vehicle-fitment-picker";
import { ShopFilterDrawer } from "@/components/shop/shop-filter-drawer";
import { ShopFavoriteButton } from "@/components/shop/shop-favorite-button";
import { useGarage, formatVehicle } from "@/lib/garage";
import { X } from "lucide-react";

const shopSearch = z.object({
  make: fallback(z.string(), "").default(""),
  model: fallback(z.string(), "").default(""),
  year: fallback(z.number().optional(), undefined).default(undefined),
  brand: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/shop/")({
  component: ShopIndex,
  validateSearch: zodValidator(shopSearch),
  head: () => ({
    meta: [
      { title: "Shop — Car detailing, tools & parts | 365 MotorSales" },
      { name: "description", content: "Curated car detailing products, mechanic tools, parts and accessories. Search by your vehicle's make and model to find parts that fit." },
      { property: "og:title", content: "365 MotorSales Shop" },
      { property: "og:description", content: "Detailing, tools, parts and accessories — best prices from top PH marketplaces." },
    ],
    links: [{ rel: "canonical", href: "https://365motorsales.com/shop" }],
  }),
});

function ShopIndex() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const [garage, setGarageState] = useGarage();

  // Sync URL <-> garage
  const activeVehicle = search.make && search.model
    ? { category: "car" as const, make: search.make, model: search.model, year: search.year }
    : garage;

  const { data: catData } = useQuery({ queryKey: ["shop-cats"], queryFn: () => listShopCategories() });
  const { data: brandData } = useQuery({
    queryKey: ["shop-brands", search.category],
    queryFn: () => listShopBrands({ data: search.category ? { categorySlug: search.category } : {} }),
  });
  const filterArgs = {
    ...(activeVehicle ? { make: activeVehicle.make, model: activeVehicle.model, year: activeVehicle.year } : {}),
    ...(search.brand ? { brand: search.brand } : {}),
    ...(search.category ? { categorySlug: search.category } : {}),
  };
  const { data: featData } = useQuery({
    queryKey: ["shop-featured", filterArgs],
    queryFn: () => listShopProducts({ data: { featured: true, limit: 12, ...filterArgs } }),
  });
  const { data: latestData } = useQuery({
    queryKey: ["shop-latest", filterArgs],
    queryFn: () => listShopProducts({ data: { limit: 24, ...filterArgs } }),
  });

  const cats = catData?.categories ?? [];
  const brands = brandData?.brands ?? [];
  const featured = featData?.products ?? [];
  const latest = latestData?.products ?? [];

  const onPickVehicle = (v: { category: "car" | "motorcycle"; make: string; model: string; year?: number }) => {
    setGarageState(v);
    navigate({ search: (prev: any) => ({ ...prev, make: v.make, model: v.model, year: v.year }) });
  };

  const clearVehicle = () => {
    setGarageState(null);
    navigate({ search: (prev: any) => ({ ...prev, make: "", model: "", year: undefined }) });
  };

  const onApplyFilters = (next: { categorySlug: string; brand: string; vehicle: typeof activeVehicle }) => {
    if (next.vehicle) setGarageState(next.vehicle);
    else setGarageState(null);
    navigate({
      search: () => ({
        category: next.categorySlug,
        brand: next.brand,
        make: next.vehicle?.make ?? "",
        model: next.vehicle?.model ?? "",
        year: next.vehicle?.year,
      }),
    });
  };

  const hasAnyFilter = !!(search.brand || search.category || activeVehicle);

  return (
    <SiteLayout>
      <section className="border-b bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <Badge className="mb-3">Shop</Badge>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight">Tools, parts &amp; detailing</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Curated picks from Shopee, Lazada and AliExpress. Buy direct from the seller — we earn a small commission so the site stays free for you.
          </p>

          <div className="mt-6 hidden rounded-xl border bg-card p-4 shadow-sm md:block">
            <p className="mb-3 text-sm font-semibold">🔧 Shop by your vehicle</p>
            <VehicleFitmentPicker initial={activeVehicle} onSubmit={onPickVehicle} />
            {activeVehicle && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary" className="max-w-full gap-1">
                  <span className="truncate">Showing parts for: <strong>{formatVehicle(activeVehicle)}</strong></span>
                </Badge>
                <Button size="sm" variant="ghost" onClick={clearVehicle}><X className="h-4 w-4" /> Clear</Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sticky mobile filter bar */}
      <div className="sticky top-14 z-30 border-b bg-background/95 backdrop-blur md:hidden">
        <div className="container mx-auto flex items-center gap-2 px-4 py-2">
          <ShopFilterDrawer
            categories={cats}
            brands={brands}
            value={{ categorySlug: search.category, brand: search.brand, vehicle: activeVehicle }}
            onApply={onApplyFilters}
            triggerClassName="flex-1 justify-center"
          />
          {hasAnyFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setGarageState(null);
                navigate({ search: () => ({ make: "", model: "", year: undefined, brand: "", category: "" }) });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {hasAnyFilter && (
          <div className="container mx-auto flex flex-wrap gap-1.5 px-4 pb-2">
            {search.category && (
              <Badge variant="secondary" className="text-[10px]">
                {cats.find((c) => c.slug === search.category)?.name ?? search.category}
              </Badge>
            )}
            {search.brand && <Badge variant="secondary" className="text-[10px]">{search.brand}</Badge>}
            {activeVehicle && (
              <Badge variant="secondary" className="text-[10px]">{formatVehicle(activeVehicle)}</Badge>
            )}
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-8 space-y-12">
        <AdCarousel placement="shop_top" />

        {cats.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold">Shop by category</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {cats.map((c) => (
                <Link key={c.id} to="/shop/$category" params={{ category: c.slug }}
                  search={activeVehicle ? { make: activeVehicle.make, model: activeVehicle.model, year: activeVehicle.year } : {}}
                  className="group rounded-xl border bg-card p-5 transition hover:border-primary hover:shadow-md">
                  <p className="font-semibold group-hover:text-primary">{c.name}</p>
                  {c.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {featured.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold">Featured</h2>
            <ProductGrid products={featured} vehicle={activeVehicle} />
          </section>
        )}

        <section>
          <h2 className="mb-4 text-xl font-semibold">{activeVehicle ? "Matching products" : "Latest products"}</h2>
          {latest.length === 0
            ? <p className="text-muted-foreground">
                {hasAnyFilter ? "No products match your filters. Try clearing some." : "No products yet — check back soon."}
              </p>
            : <ProductGrid products={latest} vehicle={activeVehicle} />}
        </section>

        <p className="rounded-md border bg-muted/40 p-4 text-xs text-muted-foreground">
          Disclosure: 365 MotorSales earns a commission on qualifying purchases. Prices and availability are set by the seller.
        </p>
      </div>
    </SiteLayout>
  );
}

export function ProductGrid({ products, vehicle }: { products: any[]; vehicle?: { make: string; model: string; year?: number } | null }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <div key={p.id} className="group relative">
          <ShopFavoriteButton
            productId={p.id}
            className="absolute right-2 top-2 z-10"
            size="md"
          />
          <Link to="/shop/p/$slug" params={{ slug: p.slug }} className="block">
          <Card className="overflow-hidden transition hover:shadow-lg">
            {p.image_url ? (
              <ImageWithSkeleton src={p.image_url} alt={p.title} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
            ) : (
              <div className="aspect-square w-full bg-muted" />
            )}
            <CardContent className="p-3">
              <p className="line-clamp-2 text-sm font-medium group-hover:text-primary">{p.title}</p>
              {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
              <div className="mt-1 flex items-center justify-between gap-1">
                {p.price_php ? <p className="text-sm font-bold">₱{Number(p.price_php).toLocaleString()}</p> : <span />}
                {vehicle && !p.universal_fit && <Badge variant="secondary" className="text-[10px]">Fits {vehicle.model}</Badge>}
                {p.universal_fit && <Badge variant="outline" className="text-[10px]">Universal</Badge>}
              </div>
            </CardContent>
          </Card>
          </Link>
        </div>
      ))}
    </div>
  );
}
