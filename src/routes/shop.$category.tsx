import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteLayout } from "@/components/site-layout";
import { AdCarousel } from "@/components/ads/ad-carousel";
import { listShopCategories, listShopProducts, listShopBrands } from "@/lib/shop.functions";
import { ProductGrid } from "./shop.index";
import { useGarage, formatVehicle } from "@/lib/garage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopFilterDrawer } from "@/components/shop/shop-filter-drawer";
import { X } from "lucide-react";

const catSearch = z.object({
  make: fallback(z.string(), "").default(""),
  model: fallback(z.string(), "").default(""),
  year: fallback(z.number().optional(), undefined).default(undefined),
  brand: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/shop/$category")({
  component: ShopCategory,
  validateSearch: zodValidator(catSearch),
  head: ({ params }) => ({
    meta: [
      { title: `${params.category} — Shop | 365 MotorSales` },
      { name: "description", content: `Browse ${params.category} products curated for Filipino car enthusiasts.` },
    ],
  }),
});

function ShopCategory() {
  const { category } = Route.useParams();
  const search = Route.useSearch();
  const [garage] = useGarage();
  const activeVehicle = search.make && search.model
    ? { category: "car" as const, make: search.make, model: search.model, year: search.year }
    : garage;

  const { data: catData } = useQuery({ queryKey: ["shop-cats"], queryFn: () => listShopCategories() });
  const cat = catData?.categories.find((c) => c.slug === category);

  const filterArgs = activeVehicle ? { make: activeVehicle.make, model: activeVehicle.model, year: activeVehicle.year } : {};
  const { data } = useQuery({
    queryKey: ["shop-cat", category, filterArgs],
    queryFn: () => listShopProducts({ data: { categorySlug: category, limit: 60, ...filterArgs } }),
  });
  const products = data?.products ?? [];

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/shop" className="hover:text-foreground">Shop</Link>
          <span>/</span>
          <span className="text-foreground">{cat?.name ?? category}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">{cat?.name ?? category}</h1>
          {activeVehicle && (
            <Badge variant="secondary">Fits: {formatVehicle(activeVehicle)}</Badge>
          )}
        </div>
        {cat?.description && <p className="text-muted-foreground">{cat.description}</p>}

        <AdCarousel placement="shop_top" />

        {products.length === 0
          ? <p className="text-muted-foreground">
              {activeVehicle ? `No products in this category fit your ${formatVehicle(activeVehicle)} yet.` : "No products in this category yet."}
            </p>
          : <ProductGrid products={products} vehicle={activeVehicle} />}

        <p className="rounded-md border bg-muted/40 p-4 text-xs text-muted-foreground">
          Disclosure: 365 MotorSales earns a commission on qualifying purchases.
        </p>
      </div>
    </SiteLayout>
  );
}
