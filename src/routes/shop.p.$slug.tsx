import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { SiteLayout } from "@/components/site-layout";
import { AdCarousel } from "@/components/ads/ad-carousel";
import { getShopProduct } from "@/lib/shop.functions";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingDown, Clock } from "lucide-react";
import { ShopFavoriteButton } from "@/components/shop/shop-favorite-button";
import { ShopifyStoreBanner } from "@/components/shop/shopify-store-banner";
import { PriceSparkline } from "@/components/shop/price-sparkline";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  const k = "shop_visitor_id";
  let v = localStorage.getItem(k);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(k, v);
  }
  return v;
}

export const Route = createFileRoute("/shop/p/$slug")({
  component: ProductPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Shop | 365 MotorSales` },
      {
        name: "description",
        content: "Buy from trusted PH marketplaces. Curated by 365 MotorSales.",
      },
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
  const p = data?.product as any | undefined;
  const links = useMemo(() => (data?.links ?? []) as any[], [data]);
  const fitment = (data?.fitment ?? []) as any[];
  const history = useMemo(() => (data?.history ?? []) as any[], [data]);

  // Cheapest current price across all retailers
  const cheapest = useMemo(() => {
    let best: { price: number; networkSlug: string; networkName: string } | null = null;
    for (const l of links) {
      const effective = l.sale_price_php ?? l.price_php;
      if (effective == null) continue;
      const v = Number(effective);
      if (!best || v < best.price)
        best = { price: v, networkSlug: l.network.slug, networkName: l.network.name };
    }
    return best;
  }, [links]);

  // 30-day low from history
  const thirtyDayLow = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const vals = history
      .filter((h) => new Date(h.captured_at).getTime() >= cutoff)
      .map((h) => Number(h.sale_price_php ?? h.price_php))
      .filter((v) => !Number.isNaN(v) && v > 0);
    return vals.length ? Math.min(...vals) : null;
  }, [history]);

  if (isLoading)
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
          Loading…
        </div>
      </SiteLayout>
    );
  if (!p) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">Product not found</h1>
          <Link to="/shop" className="mt-4 inline-block text-primary underline">
            Back to shop
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const listPrice = p.price_php != null ? Number(p.price_php) : null;
  const dealPrice = p.deal_price_php != null ? Number(p.deal_price_php) : null;
  const effectivePrice = dealPrice ?? cheapest?.price ?? listPrice;
  const showStrikethrough = dealPrice != null && listPrice != null && dealPrice < listPrice;
  const pctOff = showStrikethrough ? Math.round((1 - dealPrice! / listPrice!) * 100) : null;

  const lastCheckedAt = links.reduce<Date | null>((acc, l) => {
    if (!l.last_checked_at) return acc;
    const d = new Date(l.last_checked_at);
    return !acc || d > acc ? d : acc;
  }, null);
  const checkedAgo = lastCheckedAt ? formatAgo(lastCheckedAt) : null;

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/shop" className="hover:text-foreground">
            Shop
          </Link>
          {p.category && (
            <>
              <span>/</span>
              <Link
                to="/shop/$category"
                params={{ category: p.category.slug }}
                className="hover:text-foreground"
              >
                {p.category.name}
              </Link>
            </>
          )}
        </div>

        <ShopifyStoreBanner />

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            {p.image_url ? (
              <ImageWithSkeleton
                src={p.image_url}
                alt={p.title}
                className="aspect-square w-full rounded-xl border object-cover"
              />
            ) : (
              <div className="aspect-square w-full rounded-xl border bg-muted" />
            )}
          </div>
          <div className="space-y-4">
            {p.brand && <Badge variant="secondary">{p.brand}</Badge>}
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">{p.title}</h1>

            {effectivePrice != null && (
              <div className="space-y-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="text-3xl font-bold">₱{effectivePrice.toLocaleString()}</p>
                  {showStrikethrough && (
                    <>
                      <p className="text-lg text-muted-foreground line-through">
                        ₱{listPrice!.toLocaleString()}
                      </p>
                      <Badge className="bg-green-600 hover:bg-green-700">{pctOff}% OFF</Badge>
                    </>
                  )}
                </div>
                {thirtyDayLow != null && effectivePrice <= thirtyDayLow * 1.02 && (
                  <p className="flex items-center gap-1 text-xs font-medium text-green-700">
                    <TrendingDown className="h-3.5 w-3.5" /> Lowest price in 30 days
                  </p>
                )}
                {checkedAgo && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> Price checked {checkedAgo}
                  </p>
                )}
              </div>
            )}

            <div className="pt-1">
              <ShopFavoriteButton productId={p.id} variant="label" />
            </div>
            {p.description && (
              <p className="whitespace-pre-line text-muted-foreground">{p.description}</p>
            )}

            <div className="space-y-2 pt-4">
              <p className="text-sm font-semibold">Compare prices</p>
              {links.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No active links right now — please check back soon.
                </p>
              )}
              {links.map((l) => {
                const eff = l.sale_price_php ?? l.price_php;
                const isCheapest =
                  cheapest && l.network.slug === cheapest.networkSlug && eff != null;
                const hasSale =
                  l.sale_price_php != null &&
                  l.price_php != null &&
                  Number(l.sale_price_php) < Number(l.price_php);
                return (
                  <a
                    key={l.id}
                    href={`/go/${p.id}?n=${l.network.slug}&v=${visitor}`}
                    target="_blank"
                    rel="sponsored noopener"
                    className={`group flex items-center justify-between rounded-lg border p-3 transition hover:border-primary hover:bg-accent ${isCheapest ? "border-green-600/50 bg-green-50/50 dark:bg-green-950/20" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{l.network.name}</span>
                      {isCheapest && (
                        <Badge className="bg-green-600 text-[10px] hover:bg-green-700">
                          Best price
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {eff != null ? (
                        <div className="text-right">
                          <span className="font-bold">₱{Number(eff).toLocaleString()}</span>
                          {hasSale && (
                            <span className="ml-1 text-xs text-muted-foreground line-through">
                              ₱{Number(l.price_php).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Check price</span>
                      )}
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </a>
                );
              })}
            </div>

            {history.length >= 2 && (
              <div className="rounded-lg border bg-card p-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold">Price history (90 days)</span>
                  {thirtyDayLow != null && (
                    <span className="text-muted-foreground">
                      30-day low ₱{thirtyDayLow.toLocaleString()}
                    </span>
                  )}
                </div>
                <PriceSparkline history={history} />
              </div>
            )}

            <p className="pt-2 text-xs text-muted-foreground">
              We earn a commission on qualifying purchases. You pay the marketplace directly at no
              extra cost.
            </p>
          </div>
        </div>

        {(p.universal_fit || fitment.length > 0) && (
          <div className="mt-10 rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-lg font-semibold">Fitment</h2>
            {p.universal_fit ? (
              <p className="text-sm text-muted-foreground">
                ✅ Universal fit — works with any vehicle.
              </p>
            ) : (
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                {fitment.map((f) => {
                  const yr =
                    f.year_start || f.year_end
                      ? ` (${f.year_start ?? "…"}–${f.year_end ?? "present"})`
                      : "";
                  const eng = f.engine ? ` — ${f.engine}` : "";
                  const label = [f.make ?? "Any make", f.model ?? "Any model"].join(" ") + yr + eng;
                  return (
                    <li key={f.id} className="flex items-start gap-2">
                      <span>•</span>
                      <span>
                        <strong>{label}</strong>
                        {f.notes && (
                          <span className="block text-xs text-muted-foreground">{f.notes}</span>
                        )}
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

function formatAgo(d: Date): string {
  const ms = Date.now() - d.getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
