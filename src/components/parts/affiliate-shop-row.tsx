import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingCart, ExternalLink } from "lucide-react";
import { listAffiliateSuppliers, buildGoUrl, type AffiliateLinkPublic } from "@/lib/affiliate.functions";

interface Props {
  /** Free-text search query (e.g. "brake pads Honda Civic 2015"). */
  query: string;
  listingId?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  /** Optional smaller variant for listing pages. */
  compact?: boolean;
  /** Optional title override. */
  title?: string;
}

/**
 * Renders a row of tagged affiliate "Shop on …" cards. Hidden entirely when
 * no suppliers are active so non-monetized pages stay clean.
 */
export function AffiliateShopRow({
  query,
  listingId,
  make,
  model,
  year,
  compact = false,
  title = "Shop these parts",
}: Props) {
  const fetchSuppliers = useServerFn(listAffiliateSuppliers);
  const [suppliers, setSuppliers] = useState<AffiliateLinkPublic[] | null>(null);

  useEffect(() => {
    fetchSuppliers()
      .then((rows) => setSuppliers(rows))
      .catch(() => setSuppliers([]));
  }, [fetchSuppliers]);

  if (!suppliers || suppliers.length === 0) return null;

  return (
    <section
      className={`rounded-xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <h3 className={`font-semibold ${compact ? "text-sm" : "text-base"}`}>{title}</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Affiliate — we may earn a commission
        </span>
      </div>

      <div className={`grid gap-2 ${compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"}`}>
        {suppliers.map((s) => {
          const href = buildGoUrl({
            slug: s.supplier_slug,
            query,
            listingId,
            make,
            model,
            year,
          });
          return (
            <a
              key={s.supplier_slug}
              href={href}
              target="_blank"
              rel="nofollow sponsored noopener"
              className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs transition hover:border-primary hover:bg-primary/5"
            >
              <span className="flex min-w-0 items-center gap-2">
                {s.logo_url ? (
                  <img
                    src={s.logo_url}
                    alt=""
                    className="h-5 w-5 shrink-0 rounded-sm object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-primary/10 text-[10px] font-bold text-primary">
                    {s.label[0]}
                  </span>
                )}
                <span className="truncate font-medium">{s.label}</span>
              </span>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
            </a>
          );
        })}
      </div>
    </section>
  );
}
