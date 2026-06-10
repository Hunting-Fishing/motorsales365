import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteLayout } from "@/components/site-layout";
import { AdCarousel } from "@/components/ads/ad-carousel";
import {
  listShopCategories,
  listShopProducts,
  listShopBrands,
  getShopBreadcrumb,
} from "@/lib/shop.functions";
import { ProductGrid } from "./shop.index";
import { useGarage, formatVehicle } from "@/lib/garage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopFilterDrawer } from "@/components/shop/shop-filter-drawer";
import { ShopMobileCtaBar } from "@/components/shop/shop-mobile-cta-bar";
import { ShopBreadcrumbs } from "@/components/shop/shop-breadcrumbs";
import { ShopifyStoreBanner } from "@/components/shop/shopify-store-banner";
import { ShopSortBar, type ShopSort, type ShopNetwork } from "@/components/shop/shop-sort-bar";

import { X } from "lucide-react";

const catSearch = z.object({
  make: fallback(z.string(), "").default(""),
  model: fallback(z.string(), "").default(""),
  year: fallback(z.number().optional(), undefined).default(undefined),
  engine: fallback(z.string(), "").default(""),
  brand: fallback(z.string(), "").default(""),
  sort: fallback(
    z.enum(["featured", "price_asc", "price_desc", "popular", "newest"]),
    "featured",
  ).default("featured"),
  network: fallback(z.enum(["", "shopee", "lazada", "aliexpress"]), "").default(""),
});

export const Route = createFileRoute("/shop/$category")({
  component: ShopCategory,
  validateSearch: zodValidator(catSearch),
  head: ({ params }) => ({
    meta: [
      { title: `${params.category} — Shop | 365 MotorSales` },
      {
        name: "description",
        content: `Browse ${params.category} products curated for Filipino car enthusiasts.`,
      },
    ],
  }),
});

function ShopCategory() {
  const { category } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop/$category" });
  const [garage, setGarageState] = useGarage();
  const activeVehicle =
    search.make && search.model
      ? {
          category: "car" as const,
          make: search.make,
          model: search.model,
          year: search.year,
          engine: search.engine || undefined,
        }
      : garage;

  const { data: catData } = useQuery({
    queryKey: ["shop-cats"],
    queryFn: () => listShopCategories(),
  });
  const cat = catData?.categories.find((c) => c.slug === category);
  const { data: brandData } = useQuery({
    queryKey: ["shop-brands", category],
    queryFn: () => listShopBrands({ data: { categorySlug: category } }),
  });
  const brands = brandData?.brands ?? [];

  const filterArgs = {
    ...(activeVehicle
      ? {
          make: activeVehicle.make,
          model: activeVehicle.model,
          year: activeVehicle.year,
          engine: activeVehicle.engine,
        }
      : {}),
    ...(search.brand ? { brand: search.brand } : {}),
    ...(search.network ? { network: search.network } : {}),
    sort: search.sort,
  };
  const { data } = useQuery({
    queryKey: ["shop-cat", category, filterArgs],
    queryFn: () => listShopProducts({ data: { categorySlug: category, limit: 60, ...filterArgs } }),
  });
  const products = data?.products ?? [];

  const hasAnyFilter = !!(search.brand || activeVehicle || search.network);

  const onApplyFilters = (next: {
    categorySlug: string;
    brand: string;
    vehicle: typeof activeVehicle;
  }) => {
    if (next.vehicle) setGarageState(next.vehicle);
    else setGarageState(null);
    navigate({
      search: (prev: any) => ({
        ...prev,
        brand: next.brand,
        make: next.vehicle?.make ?? "",
        model: next.vehicle?.model ?? "",
        year: next.vehicle?.year,
        engine: next.vehicle?.engine ?? "",
      }),
    });
  };

  const setSort = (s: ShopSort) =>
    navigate({ search: (prev: any) => ({ ...prev, sort: s }) });
  const setNetwork = (n: ShopNetwork) =>
    navigate({ search: (prev: any) => ({ ...prev, network: n }) });

  return (
    <SiteLayout>
      {/* Sticky mobile filter bar */}
      <div className="sticky top-14 z-30 border-b bg-background/95 backdrop-blur md:hidden">
        <div className="container mx-auto flex items-center gap-2 px-4 py-2">
          <ShopFilterDrawer
            categories={catData?.categories ?? []}
            brands={brands}
            value={{ categorySlug: category, brand: search.brand, vehicle: activeVehicle }}
            onApply={onApplyFilters}
            lockCategory
            triggerClassName="flex-1 justify-center"
          />
          {hasAnyFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setGarageState(null);
                navigate({
                  search: () => ({ brand: "", make: "", model: "", year: undefined, engine: "" }),
                });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {hasAnyFilter && (
          <div className="container mx-auto flex flex-wrap gap-1.5 px-4 pb-2">
            {search.brand && (
              <Badge variant="secondary" className="text-[10px]">
                {search.brand}
              </Badge>
            )}
            {activeVehicle && (
              <Badge variant="secondary" className="text-[10px]">
                {formatVehicle(activeVehicle)}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <BreadcrumbForCategory slug={category} />
        <ShopifyStoreBanner />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">{cat?.name ?? category}</h1>
          <div className="hidden md:block">
            <ShopFilterDrawer
              categories={catData?.categories ?? []}
              brands={brands}
              value={{ categorySlug: category, brand: search.brand, vehicle: activeVehicle }}
              onApply={onApplyFilters}
              lockCategory
            />
          </div>
          {activeVehicle && <Badge variant="secondary">Fits: {formatVehicle(activeVehicle)}</Badge>}
        </div>
        {cat?.description && <p className="text-muted-foreground">{cat.description}</p>}

        <AdCarousel placement="shop_top" />

        <ShopSortBar
          sort={search.sort}
          network={search.network}
          onSortChange={setSort}
          onNetworkChange={setNetwork}
        />

        {products.length === 0 ? (
          <p className="text-muted-foreground">
            {hasAnyFilter
              ? "No products match your filters in this category."
              : "No products in this category yet."}
          </p>
        ) : (
          <ProductGrid products={products} vehicle={activeVehicle} />
        )}

        <p className="rounded-md border bg-muted/40 p-4 text-xs text-muted-foreground">
          Disclosure: 365 MotorSales earns a commission on qualifying purchases. See our{" "}
          <Link to="/affiliate-disclosure" className="underline">
            affiliate disclosure
          </Link>
          .
        </p>
      </div>

      <ShopMobileCtaBar
        vehicle={activeVehicle}
        onPickVehicle={(v) => {
          setGarageState(v);
          navigate({
            search: (prev: any) => ({
              ...prev,
              make: v.make,
              model: v.model,
              year: v.year,
              engine: v.engine ?? "",
            }),
          });
        }}
        onClearVehicle={() => {
          setGarageState(null);
          navigate({
            search: (prev: any) => ({ ...prev, make: "", model: "", year: undefined, engine: "" }),
          });
        }}
      />
    </SiteLayout>
  );
}

function BreadcrumbForCategory({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey: ["shop-breadcrumb", slug],
    queryFn: () => getShopBreadcrumb({ data: { slug } }),
  });
  const trail = data?.trail ?? [{ slug, name: slug }];
  return <ShopBreadcrumbs trail={trail} />;
}
