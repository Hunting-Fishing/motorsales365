import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { getPartsForVehicle, trackPartClick } from "@/lib/parts.functions";
import { formatPHP } from "@/lib/format";

interface Props {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  listingId?: string;
  vehicleId?: string;
}

/**
 * Curated affiliate parts catalog matched to the listing's make/model.
 * Revenue: affiliate-link commissions. Click-through is tracked server-side.
 */
export function AffiliatePartsSection({ make, model, year, listingId, vehicleId }: Props) {
  const fetchParts = useServerFn(getPartsForVehicle);
  const trackClick = useServerFn(trackPartClick);
  const { data: parts, isLoading } = useQuery({
    queryKey: ["affiliate-parts", make ?? "any", model ?? "any", year ?? "any"],
    queryFn: () => fetchParts({ data: { make: make ?? undefined, model: model ?? undefined, year: year ?? undefined, limit: 6 } }),
    staleTime: 5 * 60_000,
  });

  if (!isLoading && (!parts || parts.length === 0)) return null;

  function onClick(partId: string) {
    // Fire-and-forget; do not block the navigation.
    trackClick({ data: { partId, listingId, vehicleId } }).catch(() => {});
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Parts & accessories for this car</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Curated picks from partner shops. Prices and stock vary by retailer.
      </p>

      {isLoading ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(parts ?? []).map((p: any) => (
            <a
              key={p.id}
              href={p.target_url}
              target="_blank"
              rel="nofollow sponsored noreferrer"
              onClick={() => onClick(p.id)}
              className="group flex flex-col rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary"
            >
              {p.image_url ? (
                <div className="mb-2 aspect-[4/3] w-full overflow-hidden rounded-md bg-muted">
                  <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="mb-2 flex aspect-[4/3] w-full items-center justify-center rounded-md bg-muted">
                  <ShoppingBag className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
              <p className="line-clamp-2 text-sm font-medium group-hover:text-primary">{p.title}</p>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  {p.price_php ? formatPHP(Number(p.price_php)) : "View price"}
                </span>
                <span className="inline-flex items-center gap-0.5 text-muted-foreground group-hover:text-primary">
                  Shop <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground">
        Some links are affiliate links — 365 MotorSales may earn a commission, at no extra cost to you.
      </p>
    </div>
  );
}
