import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Wrench, ShoppingBag } from "lucide-react";
import { getNeededPartsForListing } from "@/lib/parts-fulfillment.functions";
import { PartQuoteDialog, type QuoteItem } from "@/components/part-quote-dialog";
import { formatPHP } from "@/lib/format";

interface Props {
  listingId: string;
}

/**
 * Buyer-side card on the listing page. Renders when the seller flagged needed parts
 * (listing.attributes.needed_parts) or confirmed a tire size. Lets buyers request
 * a quote/reserve in-house parts — no checkout yet.
 */
export function NeededPartsRail({ listingId }: Props) {
  const fetch = useServerFn(getNeededPartsForListing);
  const { data } = useQuery({
    queryKey: ["needed-parts", listingId],
    queryFn: () => fetch({ data: { listingId } }),
    staleTime: 60_000,
  });

  const [openItems, setOpenItems] = useState<QuoteItem[] | null>(null);

  if (!data) return null;
  const needed = data.needed ?? [];
  const tireSize = data.tireSize;
  const suggested = data.suggested ?? [];
  if (needed.length === 0 && !tireSize) return null;

  function quoteOne(label: string, catalog_id?: string) {
    setOpenItems([{ kind: catalog_id ? "catalog" : "custom", catalog_id, label }]);
  }
  function quoteAll() {
    const items: QuoteItem[] = [];
    for (const n of needed) items.push({ kind: "custom", label: n.label });
    if (tireSize) items.push({ kind: "custom", label: `Tires (${tireSize})` });
    setOpenItems(items);
  }

  return (
    <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Parts needed for this car — buy from us</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        The seller listed these items as needed. Request a quote and we'll prepare the parts for
        pickup or delivery. No payment now.
      </p>

      <ul className="mt-3 divide-y divide-border/60 rounded-lg border border-border bg-background">
        {tireSize && (
          <li className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Tires — {tireSize}</p>
              <p className="text-xs text-muted-foreground">
                Factory/installed size. We'll quote a matching set.
              </p>
            </div>
            <button
              onClick={() => quoteOne(`Tires (${tireSize})`)}
              className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Request quote
            </button>
          </li>
        )}
        {needed.map((n: any) => (
          <li
            key={n.key}
            className="flex items-center justify-between gap-3 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{n.label}</p>
            </div>
            <button
              onClick={() => quoteOne(n.label)}
              className="shrink-0 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Request quote
            </button>
          </li>
        ))}
      </ul>

      {suggested.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Matching catalog items
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {suggested.slice(0, 6).map((p: any) => (
              <div
                key={p.id}
                className="flex flex-col rounded-md border border-border bg-background p-3"
              >
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-xs font-medium">{p.title}</p>
                    {p.base_price_php != null && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        from {formatPHP(Number(p.base_price_php))}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => quoteOne(p.title, p.id)}
                  className="mt-2 self-start text-xs font-medium text-primary hover:underline"
                >
                  Request quote
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={quoteAll}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Request quote for all flagged parts
        </button>
      </div>

      <PartQuoteDialog
        open={!!openItems}
        onClose={() => setOpenItems(null)}
        items={openItems ?? []}
        listingId={listingId}
      />
    </div>
  );
}
