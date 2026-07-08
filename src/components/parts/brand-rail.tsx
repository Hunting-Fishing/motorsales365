import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listFeaturedPartnerBrands } from "@/lib/parts-brands.functions";

type Brand = { name: string; count: number };

/**
 * Horizontal brand strip fed by distinct brands in ingested partner_products.
 * Silent-fails to hidden when no brands are known yet (pre-sync).
 */
export function BrandRail({ country = "PH" }: { country?: string }) {
  const run = useServerFn(listFeaturedPartnerBrands);
  const [brands, setBrands] = useState<Brand[] | null>(null);

  useEffect(() => {
    let alive = true;
    run({ data: { country, limit: 14 } as any })
      .then((rows) => alive && setBrands(rows as Brand[]))
      .catch(() => alive && setBrands([]));
    return () => {
      alive = false;
    };
  }, [run, country]);

  if (!brands || brands.length === 0) return null;

  return (
    <section aria-label="Featured brands" className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Brands
        </span>
        <div className="flex flex-1 items-center gap-4 overflow-x-auto scrollbar-none">
          {brands.map((b) => (
            <span
              key={b.name}
              className="whitespace-nowrap text-sm font-black tracking-tight text-foreground/70 transition hover:text-primary"
              title={`${b.count} listings`}
            >
              {b.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
