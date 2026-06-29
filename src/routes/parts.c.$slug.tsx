import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft, ExternalLink, ShoppingBag } from "lucide-react";
import { getCategoryProducts } from "@/lib/parts-pages.functions";
import { findCategory, PARTS_CATEGORIES } from "@/data/parts-categories";

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

export const Route = createFileRoute("/parts/c/$slug")({
  loader: async ({ params }) => {
    const cat = findCategory(params.slug);
    if (!cat) throw notFound();
    const products = await getCategoryProducts({ data: { slug: params.slug } });
    return { cat, products };
  },
  head: ({ params, loaderData }) => {
    const cat = loaderData?.cat ?? findCategory(params.slug);
    if (!cat) return {};
    const url = `${SITE}/parts/c/${cat.slug}`;
    return {
      meta: [
        { title: `${cat.title} — 365 Motor Sales` },
        { name: "description", content: cat.description },
        { property: "og:title", content: cat.title },
        { property: "og:description", content: cat.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: cat.title,
            description: cat.description,
            url,
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Category not found</h1>
      <Link to="/parts/categories" className="mt-4 inline-block text-primary underline">
        Back to all categories
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
  component: CategoryPage,
});

function CategoryPage() {
  const { cat, products } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/parts" className="hover:text-foreground">
          Parts
        </Link>
        <span>/</span>
        <Link to="/parts/categories" className="hover:text-foreground">
          Categories
        </Link>
        <span>/</span>
        <span className="text-foreground">{cat.short}</span>
      </nav>

      <header className="flex items-start gap-3">
        <span className="text-4xl" aria-hidden>
          {cat.emoji}
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{cat.title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{cat.description}</p>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Live partner inventory</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">
            Affiliate — we may earn a commission
          </span>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background/60 p-8 text-center">
            <p className="text-sm font-medium">No partner matches synced yet for this category.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Feeds refresh daily. Check our{" "}
              <Link to="/parts/search" className="text-primary underline">
                /parts/search
              </Link>{" "}
              tool or browse another category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <Link
                key={`${p.network}:${p.sku}`}
                to="/parts/p/$network/$sku"
                params={{ network: p.network, sku: p.sku }}
                className="group flex flex-col overflow-hidden rounded-lg border border-border bg-background transition hover:border-primary hover:shadow-md"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold shadow-sm">
                    {MERCHANT_LABEL[p.merchant_slug] ?? p.merchant_slug}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2.5">
                  <p className="line-clamp-2 text-xs font-medium leading-snug">{p.title}</p>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-primary">
                      {fmtPrice(p.price, p.currency) ?? "—"}
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Other categories</h2>
        <div className="flex flex-wrap gap-2">
          {PARTS_CATEGORIES.filter((c) => c.slug !== cat.slug).map((c) => (
            <Link
              key={c.slug}
              to="/parts/c/$slug"
              params={{ slug: c.slug }}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary"
            >
              {c.emoji} {c.short}
            </Link>
          ))}
        </div>
      </section>

      <Link
        to="/parts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Parts hub
      </Link>
    </div>
  );
}
