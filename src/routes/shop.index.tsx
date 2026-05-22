import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { AdCarousel } from "@/components/ads/ad-carousel";
import { listShopCategories, listShopProducts } from "@/lib/shop.functions";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/shop")({
  component: ShopIndex,
  head: () => ({
    meta: [
      { title: "Shop — Car detailing, tools & parts | 365 MotorSales" },
      { name: "description", content: "Curated car detailing products, mechanic tools, parts and accessories from Shopee, Lazada and AliExpress." },
      { property: "og:title", content: "365 MotorSales Shop" },
      { property: "og:description", content: "Detailing, tools, parts and accessories — best prices from top PH marketplaces." },
    ],
    links: [{ rel: "canonical", href: "https://365motorsales.com/shop" }],
  }),
});

function ShopIndex() {
  const { data: catData } = useQuery({ queryKey: ["shop-cats"], queryFn: () => listShopCategories() });
  const { data: featData } = useQuery({ queryKey: ["shop-featured"], queryFn: () => listShopProducts({ data: { featured: true, limit: 12 } }) });
  const { data: latestData } = useQuery({ queryKey: ["shop-latest"], queryFn: () => listShopProducts({ data: { limit: 24 } }) });

  const cats = catData?.categories ?? [];
  const featured = featData?.products ?? [];
  const latest = latestData?.products ?? [];

  return (
    <SiteLayout>
      <section className="border-b bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <Badge className="mb-3">Shop</Badge>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">Tools, parts & detailing</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Curated picks from Shopee, Lazada and AliExpress. Buy direct from the seller — we earn a small commission so the site stays free for you.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 space-y-12">
        <AdCarousel placement="shop_top" />

        {cats.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold">Shop by category</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {cats.map((c) => (
                <Link key={c.id} to="/shop/$category" params={{ category: c.slug }}
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
            <ProductGrid products={featured} />
          </section>
        )}

        <section>
          <h2 className="mb-4 text-xl font-semibold">Latest products</h2>
          {latest.length === 0
            ? <p className="text-muted-foreground">No products yet — check back soon.</p>
            : <ProductGrid products={latest} />}
        </section>

        <p className="rounded-md border bg-muted/40 p-4 text-xs text-muted-foreground">
          Disclosure: 365 MotorSales earns a commission on qualifying purchases. Prices and availability are set by the seller.
        </p>
      </div>
    </SiteLayout>
  );
}

export function ProductGrid({ products }: { products: any[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <Link key={p.id} to="/shop/p/$slug" params={{ slug: p.slug }} className="group">
          <Card className="overflow-hidden transition hover:shadow-lg">
            {p.image_url ? (
              <ImageWithSkeleton src={p.image_url} alt={p.title} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
            ) : (
              <div className="aspect-square w-full bg-muted" />
            )}
            <CardContent className="p-3">
              <p className="line-clamp-2 text-sm font-medium group-hover:text-primary">{p.title}</p>
              {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
              {p.price_php && <p className="mt-1 text-sm font-bold">₱{Number(p.price_php).toLocaleString()}</p>}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
