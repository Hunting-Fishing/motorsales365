import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { listShopCategoryTree } from "@/lib/shop.functions";
import { Badge } from "@/components/ui/badge";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { ShopBreadcrumbs } from "@/components/shop/shop-breadcrumbs";

export const Route = createFileRoute("/shop/categories")({
  component: ShopCategoriesIndex,
  head: () => ({
    meta: [
      { title: "All shop categories — Detailing, Tools, Parts | 365 MotorSales" },
      { name: "description", content: "Browse every shop category — detailing, car washing, hand tools, power tools, lubricants, performance, off-road and more." },
      { property: "og:title", content: "Shop categories" },
      { property: "og:description", content: "Find the right products for your build, your daily, or your garage." },
    ],
    links: [{ rel: "canonical", href: "https://365motorsales.com/shop/categories" }],
  }),
});

function ShopCategoriesIndex() {
  const { data } = useQuery({ queryKey: ["shop-cat-tree"], queryFn: () => listShopCategoryTree() });
  const tree = data?.tree ?? [];

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <ShopBreadcrumbs trail={[{ slug: "categories", name: "All categories" }]} />

        <header className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">All shop categories</h1>
          <p className="text-muted-foreground max-w-2xl">Browse every section of the shop. Click a parent to see all products, or jump straight to a sub-category.</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tree.map((parent: any) => (
            <div key={parent.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <Link to="/shop/$category" params={{ category: parent.slug }} className="group">
                  <h2 className="text-lg font-semibold group-hover:text-primary">{parent.name}</h2>
                </Link>
                <Badge variant="secondary" className="text-[10px]">{parent.product_count} item{parent.product_count === 1 ? "" : "s"}</Badge>
              </div>
              {parent.hero_image_url && (
                <Link to="/shop/$category" params={{ category: parent.slug }} className="mt-3 block overflow-hidden rounded-lg">
                  <ImageWithSkeleton src={parent.hero_image_url} alt={parent.name} className="aspect-[3/1] w-full object-cover" />
                </Link>
              )}
              {parent.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{parent.description}</p>}
              {parent.children?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {parent.children.map((child: any) => (
                    <Link key={child.id} to="/shop/$category" params={{ category: child.slug }}
                      className="rounded-full border bg-background px-2.5 py-1 text-xs hover:border-primary hover:text-primary">
                      {child.name}
                      {child.product_count > 0 && <span className="ml-1 text-muted-foreground">· {child.product_count}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
