import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingBag, ExternalLink, X } from "lucide-react";
import { searchPartnerProducts } from "@/lib/partner-feed.functions";

type Product = {
  network: string;
  merchant_slug: string;
  sku: string;
  title: string;
  brand: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  deeplink: string;
  country: string;
};

interface Props {
  query: string;
  country?: string;
  limit?: number;
  title?: string;
  make?: string | null;
  model?: string | null;
  year?: string | number | null;
  onClearFilters?: () => void;
}

const MERCHANT_LABEL: Record<string, string> = {
  "shopee-ph": "Shopee",
  "lazada-ph": "Lazada",
  "aliexpress-ph": "AliExpress",
};

function fmtPrice(p: number | null, c: string | null) {
  if (p == null) return null;
  const ccy = c || "PHP";
  try {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(p);
  } catch {
    return `${ccy} ${p.toFixed(0)}`;
  }
}

/**
 * Renders a responsive grid of real partner products (ingested via Involve Asia
 * datafeed). Clicks route through `/api/public/go/{merchant_slug}?dl=<deeplink>`
 * so all outbound traffic is logged + country-gated + Involve-Asia-tracked.
 */
export function PartnerProductsGrid({
  query,
  country,
  limit = 12,
  title = "Trending parts from our partners",
  make,
  model,
  year,
  onClearFilters,
}: Props) {
  const run = useServerFn(searchPartnerProducts);
  const [items, setItems] = useState<Product[] | null>(null);

  const activeFilters: { label: string; value: string }[] = [];
  if (make) activeFilters.push({ label: "Make", value: String(make) });
  if (model) activeFilters.push({ label: "Model", value: String(model) });
  if (year) activeFilters.push({ label: "Year", value: String(year) });
  const hasFilters = activeFilters.length > 0;

  useEffect(() => {
    let active = true;
    run({
      data: {
        q: query,
        country,
        limit,
        make: make || undefined,
        model: model || undefined,
        year: year || undefined,
      } as any,
    })
      .then((rows) => { if (active) setItems(rows as unknown as Product[]); })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, [run, query, country, limit, make, model, year]);

  // Hide entirely when no items AND no active filters (keeps page clean pre-sync).
  if (!items) return null;
  if (items.length === 0 && !hasFilters) return null;



  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Affiliate — we may earn a commission
        </span>
      </div>

      {hasFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Filtered by:</span>
          {activeFilters.map((f) => (
            <span
              key={f.label}
              className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary"
            >
              {f.value}
            </span>
          ))}
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-background/60 p-6 text-center text-xs text-muted-foreground">
          No partner matches for these filters yet — try removing one.
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">

        {items.map((p) => {
          const merchantLabel = MERCHANT_LABEL[p.merchant_slug] ?? p.merchant_slug;
          const dl = encodeURIComponent(p.deeplink);
          const q = encodeURIComponent(p.title.slice(0, 120));
          const sku = encodeURIComponent(p.sku);
          const titleParam = encodeURIComponent(p.title.slice(0, 200));
          const ctx = [
            make ? `mk=${encodeURIComponent(String(make))}` : "",
            model ? `md=${encodeURIComponent(String(model))}` : "",
            year ? `yr=${encodeURIComponent(String(year))}` : "",
          ].filter(Boolean).join("&");
          const href = `/api/public/go/${encodeURIComponent(p.merchant_slug)}?dl=${dl}&q=${q}&sku=${sku}&t=${titleParam}${ctx ? `&${ctx}` : ""}`;
          const price = fmtPrice(p.price, p.currency);

          return (
            <a
              key={`${p.merchant_slug}:${p.sku}`}
              href={href}
              target="_blank"
              rel="nofollow sponsored noopener"
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
                <span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-sm">
                  {merchantLabel}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-2.5">
                <p className="line-clamp-2 text-xs font-medium leading-snug">{p.title}</p>
                <div className="mt-auto flex items-center justify-between gap-1 pt-1">
                  <span className="text-sm font-bold text-primary">
                    {price ?? "—"}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                </div>
              </div>
            </a>
          );
        })}
      </div>
      )}
    </section>
  );
}

