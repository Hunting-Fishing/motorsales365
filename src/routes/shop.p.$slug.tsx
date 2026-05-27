import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { SiteLayout } from "@/components/site-layout";
import { AdCarousel } from "@/components/ads/ad-carousel";
import { getShopProduct } from "@/lib/shop.functions";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { ShopFavoriteButton } from "@/components/shop/shop-favorite-button";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  const k = "shop_visitor_id";
  let v = localStorage.getItem(k);
  if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
  return v;
}

export const Route = createFileRoute("/shop/p/$slug")({
  component: ProductPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Shop | 365 MotorSales` },
      { name: "description", content: "Buy from trusted PH marketplaces. Curated by 365 MotorSales." },
    ],
  }),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["shop-product", slug],
    queryFn: () => getShopProduct({ data: { slug } }),
  });
  const visitor = useMemo(() => getVisitorId(), []);

  if (isLoading) return <SiteLayout><div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Loading…</div></SiteLayout>;
  if (!data?.product) {
    return <SiteLayout><div className="container mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-semibold">Product not found</h1><Link to="/shop" className="mt-4 inline-block text-primary underline">Back to shop</Link></div></SiteLayout>;
  }
  const p = data.product as any;
  const links = data.links as any[];
  const fitment = (data.fitment ?? []) as any[];

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/shop" className="hover:text-foreground">Shop</Link>
          {p.category && <>
            <span>/</span>
            <Link to="/shop/$category" params={{ category: p.category.slug }} className="hover:text-foreground">{p.category.name}</Link>
          </>}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            {p.image_url
              ? <ImageWithSkeleton src={p.image_url} alt={p.title} className="aspect-square w-full rounded-xl border object-cover" />
              : <div className="aspect-square w-full rounded-xl border bg-muted" />}
          </div>
          <div className="space-y-4">
            {p.brand && <Badge variant="secondary">{p.brand}</Badge>}
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">{p.title}</h1>
            {p.price_php && <p className="text-2xl font-bold">₱{Number(p.price_php).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">approx.</span></p>}
            <div className="pt-1">
              <ShopFavoriteButton productId={p.id} variant="label" />
            </div>
            {p.description && <p className="whitespace-pre-line text-muted-foreground">{p.description}</p>}

            <div className="space-y-2 pt-4">
              <p className="text-sm font-semibold">Where to buy</p>
              {links.length === 0 && <p className="text-sm text-muted-foreground">No active links right now — please check back soon.</p>}
              {links.map((l) => (
                <Button key={l.id} asChild size="lg" className="w-full justify-between" variant="outline">
                  <a
                    href={`/go/${p.id}?n=${l.network.slug}&v=${visitor}`}
                    target="_blank"
                    rel="sponsored noopener"
                  >
                    Buy on {l.network.name}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              ))}
            </div>

            <p className="pt-2 text-xs text-muted-foreground">
              We earn a commission on qualifying purchases. You pay the marketplace directly at no extra cost.
            </p>
          </div>
        </div>

        {(p.universal_fit || fitment.length > 0) && (
          <div className="mt-10 rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-lg font-semibold">Fitment</h2>
            {p.universal_fit ? (
              <p className="text-sm text-muted-foreground">✅ Universal fit — works with any vehicle.</p>
            ) : (
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                {fitment.map((f) => {
                  const yr = f.year_start || f.year_end
                    ? ` (${f.year_start ?? "…"}–${f.year_end ?? "present"})`
                    : "";
                  const eng = f.engine ? ` — ${f.engine}` : "";
                  const label = [f.make ?? "Any make", f.model ?? "Any model"].join(" ") + yr + eng;
                  return (
                    <li key={f.id} className="flex items-start gap-2">
                      <span>•</span>
                      <span>
                        <strong>{label}</strong>
                        {f.notes && <span className="block text-xs text-muted-foreground">{f.notes}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <div className="mt-12">
          <AdCarousel placement="shop_sidebar" />
        </div>
      </div>
    </SiteLayout>
  );
}
