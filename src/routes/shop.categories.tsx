import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { listShopCategoryTree } from "@/lib/shop.functions";
import { Badge } from "@/components/ui/badge";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { ShopBreadcrumbs } from "@/components/shop/shop-breadcrumbs";
import { ShopifyStoreBanner } from "@/components/shop/shopify-store-banner";

export const Route = createFileRoute("/shop/categories")({
  component: ShopCategoriesIndex,
  head: () => ({
    meta: [
      { title: "All shop categories — Detailing, Tools, Parts | 365 MotorSales" },
      { name: "description", content: "Browse every shop category grouped by department — performance parts, maintenance & fluids, repair & replacement, wheels, tools and more." },
      { property: "og:title", content: "Shop categories" },
      { property: "og:description", content: "Find the right products for your build, your daily, or your garage." },
    ],
    links: [{ rel: "canonical", href: "https://365motorsales.com/shop/categories" }],
  }),
});

function ShopCategoriesIndex() {
  const { data } = useQuery({ queryKey: ["shop-cat-tree"], queryFn: () => listShopCategoryTree() });
  const tree = data?.tree ?? [];
  const departments = data?.departments ?? [];

  // Group top-level categories under their department slug.
  const grouped = departments.map((d: any) => ({
    department: d,
    parents: tree.filter((p: any) => p.department_slug === d.slug),
  }));
  const ungrouped = tree.filter((p: any) => !p.department_slug);

  return (
    <SiteLayout>
      <div className="container mx-auto space-y-10 px-4 py-8">
        <ShopBreadcrumbs trail={[{ slug: "categories", name: "All categories" }]} />

        <header className="space-y-2">
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">All shop categories</h1>
          <p className="max-w-2xl text-muted-foreground">
            Browse every section of the shop, grouped by department. Click a department for the full lander, or jump straight to a category.
          </p>
        </header>

        {grouped.map(({ department, parents }) => (
          parents.length > 0 && (
            <section key={department.slug} className="space-y-4">
              <div className="flex items-end justify-between gap-3 border-b pb-2">
                <Link to="/shop/department/$slug" params={{ slug: department.slug }} className="group">
                  <h2 className="font-display text-xl tracking-tight group-hover:text-primary sm:text-2xl">{department.name}</h2>
                </Link>
                <Link to="/shop/department/$slug" params={{ slug: department.slug }} className="text-sm text-muted-foreground hover:text-primary">
                  View department →
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {parents.map((parent: any) => (
                  <div key={parent.id} className="rounded-xl border bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Link to="/shop/$category" params={{ category: parent.slug }} className="group">
                        <h3 className="text-base font-semibold group-hover:text-primary">{parent.name}</h3>
                      </Link>
                      <Badge variant="secondary" className="text-[10px]">{parent.product_count} item{parent.product_count === 1 ? "" : "s"}</Badge>
                    </div>
                    {parent.hero_image_url && (
                      <Link to="/shop/$category" params={{ category: parent.slug }} className="mt-3 block overflow-hidden rounded-lg">
                        <ImageWithSkeleton src={parent.hero_image_url} alt={parent.name} className="aspect-[3/1] w-full object-cover" />
                      </Link>
                    )}
                    {parent.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{parent.description}</p>}
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
            </section>
          )
        ))}

        {ungrouped.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl tracking-tight sm:text-2xl">Other</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ungrouped.map((parent: any) => (
                <Link key={parent.id} to="/shop/$category" params={{ category: parent.slug }}
                  className="rounded-xl border bg-card p-5 hover:border-primary">
                  <p className="font-semibold">{parent.name}</p>
                  {parent.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{parent.description}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
