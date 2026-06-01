import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteLayout } from "@/components/site-layout";
import { AdCarousel } from "@/components/ads/ad-carousel";
import { getShopDepartment, listShopProducts, listShopBrands } from "@/lib/shop.functions";
import { ProductGrid } from "./shop.index";
import { useGarage, formatVehicle } from "@/lib/garage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopFilterDrawer } from "@/components/shop/shop-filter-drawer";
import { ShopBreadcrumbs } from "@/components/shop/shop-breadcrumbs";
import { ShopifyStoreBanner } from "@/components/shop/shopify-store-banner";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { X } from "lucide-react";

const depSearch = z.object({
  make: fallback(z.string(), "").default(""),
  model: fallback(z.string(), "").default(""),
  year: fallback(z.number().optional(), undefined).default(undefined),
  engine: fallback(z.string(), "").default(""),
  brand: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/shop/department/$slug")({
  component: DepartmentPage,
  validateSearch: zodValidator(depSearch),
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Shop | 365 MotorSales` },
      { name: "description", content: `Shop ${params.slug.replace(/-/g, " ")} — curated products with affiliate links to top PH marketplaces.` },
    ],
  }),
});

function DepartmentPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop/department/$slug" });
  const [garage, setGarageState] = useGarage();
  const activeVehicle = search.make && search.model
    ? { category: "car" as const, make: search.make, model: search.model, year: search.year, engine: search.engine || undefined }
    : garage;

  const { data: depData } = useQuery({ queryKey: ["shop-dep", slug], queryFn: () => getShopDepartment({ data: { slug } }) });
  const { data: brandData } = useQuery({ queryKey: ["shop-brands"], queryFn: () => listShopBrands({ data: {} }) });
  const dep = depData?.department;
  const categories = depData?.categories ?? [];
  const crossCats = depData?.cross_categories ?? [];

  const filterArgs = {
    ...(activeVehicle ? { make: activeVehicle.make, model: activeVehicle.model, year: activeVehicle.year, engine: activeVehicle.engine } : {}),
    ...(search.brand ? { brand: search.brand } : {}),
    departmentSlug: slug,
  };
  const { data: prodData } = useQuery({
    queryKey: ["shop-dep-products", slug, filterArgs],
    queryFn: () => listShopProducts({ data: { ...filterArgs, limit: 48 } }),
  });
  const products = prodData?.products ?? [];

  const hasAnyFilter = !!(search.brand || activeVehicle);

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <ShopBreadcrumbs trail={[{ slug: `department/${slug}`, name: dep?.name ?? slug }]} />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-2">Department</Badge>
            <h1 className="font-display text-3xl sm:text-4xl tracking-tight">{dep?.name ?? slug}</h1>
            {dep?.description && <p className="mt-2 text-muted-foreground">{dep.description}</p>}
          </div>
          <ShopFilterDrawer
            categories={categories.map((c: any) => ({ slug: c.slug, name: c.name }))}
            brands={brandData?.brands ?? []}
            value={{ categorySlug: "", brand: search.brand, vehicle: activeVehicle }}
            onApply={(next) => {
              if (next.vehicle) setGarageState(next.vehicle); else setGarageState(null);
              if (next.categorySlug) {
                navigate({ to: "/shop/$category", params: { category: next.categorySlug }, search: {
                  brand: next.brand,
                  make: next.vehicle?.make ?? "",
                  model: next.vehicle?.model ?? "",
                  year: next.vehicle?.year,
                  engine: next.vehicle?.engine ?? "",
                } });
              } else {
                navigate({ search: () => ({
                  brand: next.brand,
                  make: next.vehicle?.make ?? "",
                  model: next.vehicle?.model ?? "",
                  year: next.vehicle?.year,
                  engine: next.vehicle?.engine ?? "",
                }) });
              }
            }}
          />
        </div>

        {hasAnyFilter && (
          <div className="flex flex-wrap items-center gap-1.5">
            {search.brand && <Badge variant="secondary" className="text-xs">{search.brand}</Badge>}
            {activeVehicle && <Badge variant="secondary" className="text-xs">{formatVehicle(activeVehicle)}</Badge>}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setGarageState(null);
                navigate({ search: () => ({ brand: "", make: "", model: "", year: undefined, engine: "" }) });
              }}
            >
              <X className="mr-1 h-3 w-3" /> Clear
            </Button>
          </div>
        )}

        <AdCarousel placement="shop_top" />

        {categories.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Categories</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((c: any) => (
                <Link key={c.id} to="/shop/$category" params={{ category: c.slug }}
                  className="group rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-md">
                  {c.hero_image_url && (
                    <ImageWithSkeleton src={c.hero_image_url} alt={c.name} className="mb-2 aspect-[3/2] w-full rounded-md object-cover" />
                  )}
                  <p className="font-semibold group-hover:text-primary">{c.name}</p>
                  {c.children?.length > 0 && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {c.children.slice(0, 4).map((ch: any) => ch.name).join(" · ")}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {crossCats.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Also in this department</h2>
            <div className="flex flex-wrap gap-2">
              {crossCats.map((c: any) => (
                <Link key={c.id} to="/shop/$category" params={{ category: c.slug }}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary">
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Products in this department</h2>
          {products.length === 0
            ? <p className="text-muted-foreground">No products match here yet — check back soon.</p>
            : <ProductGrid products={products} vehicle={activeVehicle} />}
        </section>

        <p className="rounded-md border bg-muted/40 p-4 text-xs text-muted-foreground">
          Disclosure: 365 MotorSales earns a commission on qualifying purchases. See our{" "}
          <Link to="/affiliate-disclosure" className="underline">affiliate disclosure</Link>.
        </p>
      </div>
    </SiteLayout>
  );
}
