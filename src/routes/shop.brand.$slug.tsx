import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteLayout } from "@/components/site-layout";
import { listShopProducts, listShopCategories } from "@/lib/shop.functions";
import { ProductGrid } from "./shop.index";
import { ShopBreadcrumbs } from "@/components/shop/shop-breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { useGarage, formatVehicle } from "@/lib/garage";

const brandSearch = z.object({
  category: fallback(z.string(), "").default(""),
  sort: fallback(z.enum(["featured", "newest", "price_asc", "price_desc", "popular"]), "featured").default("featured"),
});

function slugToName(slug: string) {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const Route = createFileRoute("/shop/brand/$slug")({
  component: BrandPage,
  validateSearch: zodValidator(brandSearch),
  head: ({ params }) => {
    const name = slugToName(params.slug);
    return {
      meta: [
        { title: `${name} — Shop ${name} parts & accessories | 365 MotorSales` },
        { name: "description", content: `Browse all ${name} products curated by 365 MotorSales — detailing, parts, tools and accessories.` },
        { property: "og:title", content: `${name} on 365 MotorSales` },
      ],
      links: [{ rel: "canonical", href: `https://365motorsales.com/shop/brand/${params.slug}` }],
    };
  },
});

function BrandPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop/brand/$slug" });
  const [garage] = useGarage();
  const brandName = slugToName(slug);

  const { data: catData } = useQuery({ queryKey: ["shop-cats"], queryFn: () => listShopCategories() });
  const args = {
    brand: brandName,
    sort: search.sort,
    limit: 60,
    ...(search.category ? { categorySlug: search.category } : {}),
    ...(garage ? { make: garage.make, model: garage.model, year: garage.year, engine: garage.engine } : {}),
  };
  const { data } = useQuery({ queryKey: ["shop-brand", slug, search], queryFn: () => listShopProducts({ data: args }) });
  const products = data?.products ?? [];

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <ShopBreadcrumbs trail={[{ slug, name: brandName }]} />

        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl">{brandName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">All products from {brandName} on 365 MotorSales.</p>
          </div>
          {garage && <Badge variant="secondary">Filtered for: {formatVehicle(garage)}</Badge>}
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted-foreground">Category</label>
          <select
            value={search.category}
            onChange={(e) => navigate({ search: (p: any) => ({ ...p, category: e.target.value }) })}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">All</option>
            {catData?.categories.filter((c: any) => !c.parent_id).map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <label className="ml-3 text-xs text-muted-foreground">Sort</label>
          <select
            value={search.sort}
            onChange={(e) => navigate({ search: (p: any) => ({ ...p, sort: e.target.value as any }) })}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popular">Most popular</option>
          </select>
        </div>

        {products.length === 0
          ? <p className="text-muted-foreground">No {brandName} products found right now. <Link to="/shop" className="underline">Browse all shop</Link>.</p>
          : <ProductGrid products={products} vehicle={garage} />}

        <p className="rounded-md border bg-muted/40 p-4 text-xs text-muted-foreground">
          Disclosure: 365 MotorSales earns a commission on qualifying purchases. See our{" "}
          <Link to="/affiliate-disclosure" className="underline">affiliate disclosure</Link>.
        </p>
      </div>
    </SiteLayout>
  );
}
