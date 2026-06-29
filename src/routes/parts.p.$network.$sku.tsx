import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { getPartnerProduct, getRelatedProducts } from "@/lib/parts-pages.functions";

const SITE = "https://www.365motorsales.com";

const MERCHANT_LABEL: Record<string, string> = {
  "shopee-ph": "Shopee",
  "lazada-ph": "Lazada",
  "aliexpress-ph": "AliExpress",
};

function fmtPrice(p: number | null, c: string | null) {
  if (p == null) return null;
  const ccy = c || "PHP";
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: ccy,
      maximumFractionDigits: 0,
    }).format(p);
  } catch {
    return `${ccy} ${p.toFixed(0)}`;
  }
}

export const Route = createFileRoute("/parts/p/$network/$sku")({
  loader: async ({ params }) => {
    const product = await getPartnerProduct({
      data: { network: params.network, sku: params.sku },
    });
    if (!product) throw notFound();
    const related = await getRelatedProducts({
      data: { merchant_slug: product.merchant_slug, excludeSku: product.sku },
    });
    return { product, related };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.product;
    if (!p) return {};
    const url = `${SITE}/parts/p/${params.network}/${encodeURIComponent(params.sku)}`;
    const desc =
      (p.brand ? `${p.brand} · ` : "") +
      (p.title || "Auto part") +
      (p.price ? ` — ${fmtPrice(p.price, p.currency)}` : "");
    const offerCurrency = (p.currency || "PHP").toUpperCase();
    return {
      meta: [
        { title: `${p.title} — 365 Motor Sales` },
        { name: "description", content: desc.slice(0, 160) },
        { property: "og:title", content: p.title },
        { property: "og:description", content: desc.slice(0, 160) },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(p.image_url ? [{ property: "og:image", content: p.image_url }] : []),
        ...(p.image_url ? [{ name: "twitter:image", content: p.image_url }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.title,
            brand: p.brand ?? undefined,
            image: p.image_url ?? undefined,
            sku: p.sku,
            offers: p.price
              ? {
                  "@type": "Offer",
                  price: Number(p.price).toFixed(2),
                  priceCurrency: offerCurrency,
                  availability: "https://schema.org/InStock",
                  url,
                }
              : undefined,
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Product not found</h1>
      <p className="mt-2 text-muted-foreground">
        It may have been removed from the partner feed.
      </p>
      <Link to="/parts" className="mt-4 inline-block text-primary underline">
        Back to Parts
      </Link>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <button onClick={reset} className="mt-4 text-primary underline">
        Try again
      </button>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product: p, related } = Route.useLoaderData();
  const merchantLabel = MERCHANT_LABEL[p.merchant_slug] ?? p.merchant_slug;
  const goHref = `/api/public/go/${encodeURIComponent(p.merchant_slug)}?dl=${encodeURIComponent(
    p.deeplink,
  )}&sku=${encodeURIComponent(p.sku)}&t=${encodeURIComponent(p.title.slice(0, 200))}`;
  const price = fmtPrice(p.price, p.currency);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/parts" className="hover:text-foreground">
          Parts
        </Link>
        <span>/</span>
        <Link to="/parts/categories" className="hover:text-foreground">
          Categories
        </Link>
        <span>/</span>
        <span className="truncate text-foreground">{p.title}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-muted">
          {p.image_url ? (
            <img
              src={p.image_url}
              alt={p.title}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="grid aspect-square w-full place-items-center text-sm text-muted-foreground">
              No image
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Sold by {merchantLabel}
            </span>
            <h1 className="mt-2 text-2xl font-bold leading-tight">{p.title}</h1>
            {p.brand && (
              <p className="mt-1 text-sm text-muted-foreground">Brand: {p.brand}</p>
            )}
          </div>

          <div className="text-3xl font-bold text-primary">{price ?? "Price on merchant"}</div>

          <a
            href={goHref}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Buy on {merchantLabel} <ExternalLink className="h-4 w-4" />
          </a>

          <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                You'll complete checkout on {merchantLabel}. 365 Motor Sales earns a small
                commission at no extra cost to you — see our{" "}
                <Link to="/affiliate-disclosure" className="underline">
                  affiliate disclosure
                </Link>
                .
              </span>
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-border bg-background p-2">
              <dt className="text-muted-foreground">Network</dt>
              <dd className="font-mono">{p.network}</dd>
            </div>
            <div className="rounded border border-border bg-background p-2">
              <dt className="text-muted-foreground">SKU</dt>
              <dd className="truncate font-mono">{p.sku}</dd>
            </div>
            <div className="rounded border border-border bg-background p-2">
              <dt className="text-muted-foreground">Country</dt>
              <dd>{p.country}</dd>
            </div>
            {p.category_path && (
              <div className="rounded border border-border bg-background p-2">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="truncate">{p.category_path}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">More from {merchantLabel}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((r) => (
              <Link
                key={`${r.network}:${r.sku}`}
                to="/parts/p/$network/$sku"
                params={{ network: r.network, sku: r.sku }}
                className="group flex flex-col overflow-hidden rounded-lg border border-border bg-background transition hover:border-primary"
              >
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt={r.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2">
                  <p className="line-clamp-2 text-xs leading-snug">{r.title}</p>
                  <span className="mt-auto text-xs font-bold text-primary">
                    {fmtPrice(r.price, r.currency) ?? "—"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link
        to="/parts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Parts
      </Link>
    </div>
  );
}
